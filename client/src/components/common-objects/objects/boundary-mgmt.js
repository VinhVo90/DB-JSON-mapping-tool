import * as d3 from 'd3';
import _ from 'lodash';
import ColorHash from 'color-hash';
import Boundary from './boundary';
import PopUtils from '../../../common/utilities/popup.util';
import ObjectUtils from '../../../common/utilities/object.util';
import BoundaryMenu from '../menu-context/boundary-menu';
import BoundaryMenuItems from '../menu-context/boundary-menu-items';
import State from '../../../common/new-type-define/state';
import HistoryElement from '../../../common/new-type-define/historyElement';

import {
  checkMinMaxValue,
  allowInputNumberOnly,
  autoScrollOnMousedrag,
  updateSizeGraph,
  setMinBoundaryGraph,
  checkModePermission,
  hideFileChooser,
  checkIsMatchRegexNumber,
  comShowMessage,
  initDialogDragEvent,
} from '../../../common/utilities/common.util';

import {
  REPEAT_RANGE, BOUNDARY_ATTR_SIZE, VERTEX_FORMAT_TYPE, ACTION_TYPE, OBJECT_TYPE,
} from '../../../common/const/index';

const FOCUSED_CLASS = 'focused-object';

const ATTR_ID = 'id';
const ATTR_DEL_CHECK_ALL = 'delCheckAll';
const ATTR_DEL_CHECK = 'delCheck';
const ATTR_VERTEX_TYPE = 'vertexType';
const ATTR_NAME = 'name';
const ATTR_TYPE = 'type';
const ATTR_MANDATORY = 'mandatory';
const ATTR_REPEAT = 'repeat';

class BoundaryMgmt {
  constructor(props) {
    this.mainParent = props.mainParent;
    this.dataContainer = props.dataContainer;
    this.containerId = props.containerId;
    this.svgId = props.svgId;
    this.viewMode = props.viewMode;
    this.vertexMgmt = props.vertexMgmt;
    this.edgeMgmt = props.edgeMgmt;
    this.history = props.history;

    this.initialize();
  }

  initialize() {
    this.colorHash = new ColorHash({ lightness: 0.2 });
    this.objectUtils = new ObjectUtils();

    this.dummyBoxId = `dummyBox_${this.svgId}`;
    this.selectorClass = `_boundary_${this.svgId}`;
    this.visibleItemSelectorClass = `_menu_item_boundary_${this.svgId}`;

    this.editingBoundary = null;

    this.initBBoxGroup();

    new BoundaryMenu({
      selector: `.${this.selectorClass}`,
      boundaryMgmt: this,
      dataContainer: this.dataContainer,
      viewMode: this.viewMode,
    });

    this.initBoudaryPopupHtml();
    this.bindEventForPopupBoundary();

    // Boundary Menu Items
    if (checkModePermission(this.viewMode.value, 'isEnableItemVisibleMenu')) {
      new BoundaryMenuItems({
        selector: `.${this.visibleItemSelectorClass}`,
        dataContainer: this.dataContainer,
      });
    }

    this.callbackDragBoundary = d3.drag()
      .on('start', this.startDrag(this))
      .on('drag', this.dragTo(this))
      .on('end', this.endDrag(this));
  }

  initBoudaryPopupHtml() {
    const repeatHtml = `
    <tr>
      <th>Max repeat</th>
      <td class="input-group full-width">
        <input type="number" class="form-control" id="maxBoundaryRepeat_${this.svgId}" name="maxBoundaryRepeat" min="0" max="9999">
        <label class="input-group-addon">
          <input type="checkbox" id="isBoundaryMandatory_${this.svgId}" name="isBoundaryMandatory">
        </label>
        <label class="input-group-addon" for="isBoundaryMandatory_${this.svgId}">Mandatory</label>
      </td>
    </tr>`;

    const editMemberHtml = `
    <div class="dialog-button-top">
      <div class="row" style="float:left;">
        <button id="boundaryBtnDelete_${this.svgId}" class="btn-etc">Delete</button>
      </div>

      <div class="row text-right">
        <button id="boundaryBtnAddBoundary_${this.svgId}" class="btn-etc">Add Boundary</button>
        <button id="boundaryBtnAddVertex_${this.svgId}" class="btn-etc">Add Vertex</button>
      </div>
    </div>`;

    const sHtml = `<!-- Boundary Info Popup (S)-->
    <div id="boundaryInfo_${this.svgId}" class="modal fade" role="dialog" tabindex="-1">
      <div class="modal-dialog">
        <div class="web-dialog modal-content">
          <div class="dialog-title">
            <span class="title">Boundary Info</span>
          </div>
          <div class="dialog-wrapper">
            <form id="boundaryForm_${this.svgId}" action="#" method="post">
              <div class="dialog-search form-inline">
                <table>
                  <colgroup>
                    <col width="80"/>
                    <col width="*"/>
                  </colgroup>
                  <tbody>
                    <tr>
                      <th>Name</th>
                      <td>
                        <input type="text" class="form-control" id="boundaryName_${this.svgId}" name="boundaryName" onfocus="this.select();">
                      </td>
                    </tr>
                    ${checkModePermission(this.viewMode.value, 'maxBoundaryRepeat') ? repeatHtml : ''}
                    <tr>
                      <th>Description</th>
                      <td class="full-width">
                        <textarea class="form-control" id="boundaryDesc_${this.svgId}" name="boundaryDesc" rows="4" onfocus="this.select();"></textarea>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </form>

            ${checkModePermission(this.viewMode.value, 'boundaryBtnConfirm') ? editMemberHtml : ''}
							
            <form id="boundaryForm_${this.svgId}" action="#" method="post">
              <div class="dialog-search form-inline">
                <table class="fixed-headers vertex-properties" id="boundaryMember_${this.svgId}" border="1">
                </table>
              </div>
						</form>
           
            <div class="dialog-button-top">
              <div class="row text-right">
                <button id="boundaryBtnConfirm_${this.svgId}" class="btn-etc">Confirm</button>
                <button id="boundaryBtnCancel_${this.svgId}" class="btn-etc">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Boundary Info Popup (E)-->`;

    $($(`#${this.svgId}`)[0].parentNode).append(sHtml);
  }

  /**
   * Bind event and init data for controls on popup
   */
  bindEventForPopupBoundary() {
    const main = this;

    if (checkModePermission(this.viewMode.value, 'boundaryBtnConfirm')) {
      $(`#boundaryBtnDelete_${main.svgId}`).click(() => {
        this.removeMemberHtml();
      });
    }

    if (checkModePermission(this.viewMode.value, 'boundaryBtnConfirm')) {
      $(`#boundaryBtnAddVertex_${main.svgId}`).click(() => {
        this.addMember(OBJECT_TYPE.VERTEX);
      });
    }

    if (checkModePermission(this.viewMode.value, 'boundaryBtnConfirm')) {
      $(`#boundaryBtnAddBoundary_${main.svgId}`).click(() => {
        this.addMember(OBJECT_TYPE.BOUNDARY);
      });
    }

    if (checkModePermission(this.viewMode.value, 'boundaryBtnConfirm')) {
      $(`#boundaryBtnConfirm_${main.svgId}`).click(() => {
        this.confirmEditBoundaryInfo();
      });
    }

    $(`#boundaryBtnCancel_${main.svgId}`).click(() => {
      this.closePopBoundaryInfo();
    });

    // Validate input number
    if (checkModePermission(this.viewMode.value, 'maxBoundaryRepeat')) {
      $(`#maxBoundaryRepeat_${main.svgId}`).keydown((e) => {
        allowInputNumberOnly(e);
      });

      $(`#maxBoundaryRepeat_${main.svgId}`).focusout(function () {
        const rtnVal = checkMinMaxValue(this.value, $(`#isBoundaryMandatory_${main.svgId}`).prop('checked') === true ? 1 : REPEAT_RANGE.MIN, REPEAT_RANGE.MAX);
        this.value = rtnVal;
      });

      $(`#isBoundaryMandatory_${main.svgId}`).change(function () {
        if (this.checked && $(`#maxBoundaryRepeat_${main.svgId}`).val() < 1) {
          $(`#maxBoundaryRepeat_${main.svgId}`).val(1);
        }
      });
    }

    // Prevent refresh page after pressing enter on form control (Edit popup)
    $('form').submit(() => false);

    // Enable dragging for popup
    // this.initDialogDragEvent();
    initDialogDragEvent(`boundaryInfo_${this.svgId}`);
  }

  create(sOptions, state) {
    const newBoundary = new Boundary({
      mainParent: this.mainParent,
      boundaryMgmt: this,
    });

    newBoundary.create(sOptions, this.callbackDragBoundary, this.edgeMgmt.handleDragConnection);

    if (state) {
      // create boundary by Boundary update info popup
      const he = new HistoryElement();
      he.actionType = ACTION_TYPE.CREATE;
      he.dataObject = newBoundary.getObjectInfo();
      he.realObject = newBoundary;
      state.add(he);
    } else {
      // create boundary by menu context
      if (sOptions.isMenu && this.history) {
        state = new State();
        const he = new HistoryElement();
        he.actionType = ACTION_TYPE.CREATE;
        he.dataObject = newBoundary.getObjectInfo();
        he.realObject = newBoundary;
        state.add(he);
        this.history.add(state);
      }
    }

    if (sOptions.isMenu) {
      this.makeEditBoundaryInfo(newBoundary.id);
    }

    return newBoundary;
  }

  startDrag(main) {
    return function (d) {
      if (main.vertexMgmt.edgeMgmt.isSelectingEdge()) { main.vertexMgmt.edgeMgmt.cancleSelectedPath(); }

      main.edgeMgmt.emphasizePathConnectForBoundary(d);

      if (!d.parent) { main.objectUtils.reSizeBoundaryWhenObjectDragged(d); }

      d.moveToFront();

      // Storing start position to calculate the offset for moving members to new position
      d.ctrlSrcX = d.x;
      d.ctrlSrcY = d.y;

      d3.select(`.${FOCUSED_CLASS}`).classed(FOCUSED_CLASS, false);
      d3.select(`#${d.id}`).classed(FOCUSED_CLASS, true);
      d.startX = d.x;
      d.startY = d.y;
    };
  }

  dragTo(main) {
    return function (d) {
      updateSizeGraph(d);
      autoScrollOnMousedrag(d.svgId, d.containerId, main.viewMode.value);

      const { x, y } = main.objectUtils.setPositionObjectJustInSvg(d3.event, d);
      // d.x = x;
      // d.y = y;

      const { width, height } = main.objectUtils.getBBoxObject(`#${d.id}`);
      const data = {
        x, y, width, height,
      };
      main.updateAttrBBoxGroup(data);
    };
  }

  endDrag(main) {
    return function (d) {
      const { x, y } = main.objectUtils.setPositionObjectJustInSvg(d3.event, d);
      d.x = x;
      d.y = y;

      const offsetX = d.x - d.startX;
      const offsetY = d.y - d.startY;

      // If realy move
      if (offsetX != 0 || offsetY != 0) {
        const state = new State();

        // Transform group
        d3.select(this).attr('transform', `translate(${[d.x, d.y]})`);
        main.edgeMgmt.updatePathConnectForVertex(d);

        if (d.parent) {
          // If object not out boundary parent , object change postion in boundary parent, so change index object
          if (main.objectUtils.checkDragObjectOutsideBoundary(d, state)) {
            // Update position of child element
            if (d.member.length > 0) { d.moveMember(offsetX, offsetY); }

            d.validateConnectionByUsage();
          } else {
            main.objectUtils.changeIndexInBoundaryForObject(d, state);
          }
        } else if (!main.objectUtils.checkDragObjectInsideBoundary(d, state)) {
          // Update position of child element
          if (d.member.length > 0) { d.moveMember(offsetX, offsetY); }
        } else {
          d.validateConnectionByUsage();
        }

        if (main.history) {
          // none parent and there is no moving in/out boundary => moving itself
          if (!d.parent && state.listOfHistoryElement.length === 0) {
            const he = new HistoryElement();
            he.actionType = ACTION_TYPE.MOVE;
            he.dataObject = d.getObjectInfo();
            he.realObject = d;

            state.add(he);
          }

          main.history.add(state);
        }
      }

      main.hiddenBBoxGroup();
      main.objectUtils.restoreSizeBoundary(d);
      setMinBoundaryGraph(main.dataContainer, main.svgId, main.viewMode.value);
    };
  }

  /**
   * The box simulate new position of vertex or boundary dragged.
   */
  initBBoxGroup() {
    if ($(`#${this.dummyBoxId}`).length > 0) return;

    d3.select(`#${this.svgId}`).append('svg:g')
      .attr('transform', 'translate(0.5, 0.5)')
      .append('svg:rect')
      .attr('id', `${this.dummyBoxId}`)
      .attr('width', BOUNDARY_ATTR_SIZE.BOUND_WIDTH)
      .attr('height', BOUNDARY_ATTR_SIZE.BOUND_HEIGHT)
      .attr('class', 'dummy-edge stroke-dasharray')
      .attr('fill', 'none');
  }

  /**
   * When dragging a vertex or boundary then update attribute for bbox
   * Update coordinate
   * Update size
   */
  updateAttrBBoxGroup(data) {
    const {
      x, y, width, height,
    } = data;
    d3.select(`#${this.dummyBoxId}`).attr('x', x);
    d3.select(`#${this.dummyBoxId}`).attr('y', y);
    d3.select(`#${this.dummyBoxId}`).attr('width', width);
    d3.select(`#${this.dummyBoxId}`).attr('height', height);
    d3.select(`#${this.dummyBoxId}`).style('display', 'block');
    d3.select(d3.select(`#${this.dummyBoxId}`).node().parentNode).moveToFront();
  }

  hiddenBBoxGroup() {
    d3.select(`#${this.dummyBoxId}`).style('display', 'none');
  }

  /**
   * Make controls to edit boundary info
   * @param boundaryId
   */
  makeEditBoundaryInfo(boundaryId) {
    const boundary = _.find(this.dataContainer.boundary, { id: boundaryId });
    this.editingBoundary = boundary;
    // Append content to popup
    $(`#boundaryName_${this.svgId}`).val(boundary.name);
    $(`#boundaryDesc_${this.svgId}`).val(boundary.description);

    if (checkModePermission(this.viewMode.value, 'maxBoundaryRepeat')) {
      $(`#maxBoundaryRepeat_${this.svgId}`).val(boundary.repeat);
      $(`#isBoundaryMandatory_${this.svgId}`).prop('checked', boundary.mandatory);
    }

    this.generateTable();

    const options = {
      popupId: `boundaryInfo_${this.svgId}`,
      position: 'center',
      width: checkModePermission(this.viewMode.value, 'maxBoundaryRepeat') ? 650 : 450,
    };
    PopUtils.metSetShowPopup(options);

    hideFileChooser();

    if (!checkModePermission(this.viewMode.value, 'boundaryBtnConfirm')) {
      $(`#boundaryBtnConfirm_${this.svgId}`).hide();
    } else {
      $(`#boundaryBtnConfirm_${this.svgId}`).show();
    }

    $(`#boundaryMember_${this.svgId}`).find('tbody').sortable();
  }

  /**
   * Update data boundary change
   */
  confirmEditBoundaryInfo() {
    // For history
    const state = new State();

    const oldObject = this.editingBoundary.getObjectInfo();

    const info = {};
    info.name = $(`#boundaryName_${this.svgId}`).val();
    if (checkModePermission(this.viewMode.value, 'maxBoundaryRepeat')) {
      info.repeat = $(`#maxBoundaryRepeat_${this.svgId}`).val();
      info.mandatory = $(`#isBoundaryMandatory_${this.svgId}`).prop('checked');
    }
    info.description = $(`#boundaryDesc_${this.svgId}`).val();

    this.editingBoundary.updateInfo(info);

    this.updateChildren(state);

    // Check mandatary for member
    this.editingBoundary.validateConnectionByUsage();

    this.editingBoundary.selectAllMemberVisible(true, false, state);

    // Create history
    if (this.history) {
      // Create history
      const he = new HistoryElement();
      he.actionType = ACTION_TYPE.UPDATE_INFO;
      he.oldObject = oldObject;
      he.dataObject = this.editingBoundary.getObjectInfo();
      he.realObject = this.editingBoundary;
      state.add(he);
      this.history.add(state);
    }

    this.editingBoundary.refresh();

    setMinBoundaryGraph(this.dataContainer, this.svgId, this.viewMode.value);

    this.closePopBoundaryInfo();
  }

  /**
   * Close popup edit boundary info
   */
  closePopBoundaryInfo() {
    this.editingBoundary = null;
    const options = { popupId: `boundaryInfo_${this.svgId}` };
    PopUtils.metClosePopup(options);
  }

  clearAll() {
    d3.select(`#${this.svgId}`).selectAll(`.${this.selectorClass}`).remove();
    this.dataContainer.boundary = [];
  }

  /**
	 * Enable dragging for popup
	 */
  initDialogDragEvent() {
    const main = this;
    $(`#boundaryInfo_${main.svgId} .dialog-title`).css('cursor', 'move').on('mousedown', (e) => {
      const $drag = $(`#boundaryInfo_${main.svgId} .modal-dialog`).addClass('draggable');
      const posY = $drag.offset().top - e.pageY;
      const posX = $drag.offset().left - e.pageX;
      const winH = window.innerHeight;
      const winW = window.innerWidth;
      const dlgW = $drag.get(0).getBoundingClientRect().width;

      $(window).on('mousemove', (mousemoveEvent) => {
        let x = mousemoveEvent.pageX + posX;
        let y = mousemoveEvent.pageY + posY;

        if (x < 10) x = 10;
        else if (x + dlgW > winW - 10) x = winW - dlgW - 10;

        if (y < 10) y = 10;
        else if (y > winH - 10) y = winH - 10;

        $(`#boundaryInfo_${main.svgId} .draggable`).offset({
          top: y,
          left: x,
        });
      });
      e.preventDefault(); // disable selection
    });

    $(window).on('mouseup', (e) => {
      $(`#boundaryInfo_${main.svgId} .draggable`).removeClass('draggable');
    });
  }

  initCellDelCheck(options) {
    const {
      className, name, checked, colType, isCheckAll,
    } = options;

    const $col = $(colType);
    $col.attr('class', className);
    const $chk = $('<input>');
    $chk.attr('type', 'checkbox');
    if (isCheckAll) {
      $chk.attr('id', name);
    }
    $chk.prop('checked', checked);

    $chk.attr('name', name)
      .on('click', function () {
        if (isCheckAll) {
          $(this).closest('table').find(`tbody :checkbox[name=${ATTR_DEL_CHECK}]`)
            .prop('checked', this.checked);
        } else {
          $(this).closest('table').find(`#${ATTR_DEL_CHECK_ALL}`).prop('checked',
            ($(this).closest('table').find(`tbody :checkbox[name=${ATTR_DEL_CHECK}]:checked`).length
              === $(this).closest('table').find(`tbody :checkbox[name=${ATTR_DEL_CHECK}]`).length));
        }
      });
    $chk.appendTo($col);

    return $col;
  }

  /**
   * Generate control with options
   * @param options
   * @returns {*}
   */
  generateControlByType(options) {
    let $control = null;

    const {
      controlType, controlName, dataOptions, val,
    } = options;
    switch (controlType) {
      case VERTEX_FORMAT_TYPE.LABEL:
        $control = $('<label>');
        $control.attr('name', `${controlName}`);
        $control.attr('value', val);
        $control.text(val);
        break;

      case VERTEX_FORMAT_TYPE.BOOLEAN:
        $control = $('<input>');
        $control.attr('type', 'checkbox');
        $control.attr('name', `${controlName}`);
        $control.prop('checked', typeof (val) === 'boolean' ? val : false);
        $control.attr('value', val);
        break;

      case VERTEX_FORMAT_TYPE.ARRAY:
        const firstOpt = dataOptions[0];
        $control = $('<select>');
        $control.attr('name', `${controlName}`);
        $control.attr('class', 'form-control');
        $.each(dataOptions, (key, value) => {
          $control
            .append($('<option></option>')
              .attr('value', value || firstOpt)
              .prop('selected', value === (val || firstOpt))
              .text(value));
        });
        $control.change(function () {
          $(this).closest('tr').find('[name="name"]').val($(this).val());
        });
        break;

      case VERTEX_FORMAT_TYPE.NUMBER:
        $control = $('<input>');
        $control.attr('type', 'text');
        $control.attr('name', `${controlName}`);
        $control.attr('value', !isNaN(val) ? val : '1');
        $control.attr('class', 'form-control');
        $control
          .on('keydown', (e) => {
            allowInputNumberOnly(e);
          })
          .on('focusout', function (e) {
            if (this.value && !checkIsMatchRegexNumber(this.value)) {
              comShowMessage('Input invalid');
              this.value = '';
            } else if (isNaN(this.value)) {
              comShowMessage('Input invalid');
              this.value = '';
            }
          });
        break;

      default:
        $control = $('<input>');
        $control.attr('type', 'text');
        $control.attr('autocomplete', 'off');
        $control.attr('name', `${controlName}`);
        $control.attr('value', val != undefined ? val : '');
        $control.attr('class', 'form-control');
    }

    return $control;
  }

  generateTable() {
    const $table = $(`#boundaryMember_${this.svgId}`).empty();

    // Init table header
    const $thead = $('<thead>');
    const $headerRow = $('<tr>');

    // id
    let $colHdr = $('<th>').text('id');
    $colHdr.attr('class', 'col_header');
    $colHdr.attr('name', ATTR_ID);
    $colHdr.css('display', 'none');
    $colHdr.appendTo($headerRow);

    // Del check all
    $colHdr = this.initCellDelCheck({
      className: 'col_header',
      name: `${ATTR_DEL_CHECK_ALL}`,
      checked: false,
      colType: '<th>',
      isCheckAll: true,
    });
    $colHdr.appendTo($headerRow);

    // vertex type
    $colHdr = $('<th>').text('Vertex Type');
    $colHdr.attr('class', 'col_header');
    $colHdr.attr('name', 'vertexType');
    $colHdr.appendTo($headerRow);

    // name
    $colHdr = $('<th>').text('Name');
    $colHdr.attr('class', 'col_header');
    $colHdr.attr('name', 'name');
    $colHdr.appendTo($headerRow);

    // type
    $colHdr = $('<th>').text('Type');
    $colHdr.attr('class', 'col_header');
    $colHdr.attr('name', 'type');
    $colHdr.appendTo($headerRow);


    if (checkModePermission(this.viewMode.value, 'maxBoundaryRepeat')) {
      // mandatory
      $colHdr = $('<th>').text('Mandatory');
      $colHdr.attr('class', 'col_header');
      $colHdr.attr('name', 'mandatory');
      $colHdr.appendTo($headerRow);

      // repeat
      $colHdr = $('<th>').text('Repeat\n(max or min, max)');
      $colHdr.attr('class', 'col_header');
      $colHdr.attr('name', 'repeat');
      $colHdr.css('white-space', 'pre-line');
      $colHdr.appendTo($headerRow);
    }

    $headerRow.appendTo($thead);
    $thead.appendTo($table);

    // Init table body
    const $tbody = $('<tbody>');

    const listOfVertexType = [];
    this.vertexMgmt.vertexDefinition.vertex.forEach((vertex) => {
      listOfVertexType.push(vertex.vertexType);
    });

    let $bodyRow = null;
    let $bodyCol = null;
    for (let i = 0; i < this.editingBoundary.member.length; i += 1) {
      const member = this.editingBoundary.member[i];
      const object = _.find([].concat(this.dataContainer.vertex).concat(this.dataContainer.boundary), { id: member.id });
      let options = {};
      let $control = null;

      $bodyRow = $('<tr>');

      // id
      $bodyCol = $('<td>');
      $bodyCol.attr('name', 'id');
      $bodyCol.text(`${member.id}`);
      $bodyCol.hide();
      $bodyCol.appendTo($bodyRow);

      // del-check
      $bodyCol = this.initCellDelCheck({
        className: 'checkbox_center',
        name: `${ATTR_DEL_CHECK}`,
        checked: false,
        colType: '<td>',
      });
      $bodyCol.appendTo($bodyRow);

      // vertex type
      $bodyCol = $('<td>');
      options = {};
      options.controlType = VERTEX_FORMAT_TYPE.STRING;
      options.controlName = 'vertexType';
      if (object.type === OBJECT_TYPE.VERTEX) {
        options.val = object.vertexType;
      } else {
        options.val = '';
      }

      $control = this.generateControlByType(options);
      $control.prop('disabled', true);
      $control.appendTo($bodyCol);
      $bodyCol.appendTo($bodyRow);

      // name
      $bodyCol = $('<td>');
      options = {};
      options.controlType = VERTEX_FORMAT_TYPE.STRING;
      options.controlName = 'name';
      options.val = object.name;
      $control = this.generateControlByType(options);
      $control.appendTo($bodyCol);
      $bodyCol.appendTo($bodyRow);

      // type
      $bodyCol = $('<td>');
      $bodyCol.attr('name', 'type');
      $bodyCol.text(member.type);
      $bodyCol.css('text-align', 'center');
      $bodyCol.css('color', '#555');
      $bodyCol.appendTo($bodyRow);

      if (checkModePermission(this.viewMode.value, 'maxBoundaryRepeat')) {
        // mandatory
        $bodyCol = this.initCellDelCheck({
          className: 'checkbox_center',
          name: 'mandatory',
          checked: object.mandatory,
          colType: '<td>',
        });
        $bodyCol.appendTo($bodyRow);

        // repeat
        $bodyCol = $('<td>');
        options = {};
        options.controlType = VERTEX_FORMAT_TYPE.NUMBER;
        options.controlName = 'repeat';
        options.val = object.repeat;
        $control = this.generateControlByType(options);
        $control.appendTo($bodyCol);
        $bodyCol.appendTo($bodyRow);
      }

      $bodyRow.appendTo($tbody);
    }

    $tbody.appendTo($table);

    // Set column with for table data
    if (checkModePermission(this.viewMode.value, 'maxBoundaryRepeat')) {
      $(`#boundaryMember_${this.svgId} th:nth-child(1),td:nth-child(1)`).css('min-width', '45px'); // id
      $(`#boundaryMember_${this.svgId} th:nth-child(2),td:nth-child(2)`).css('min-width', '45px'); // del check
      $(`#boundaryMember_${this.svgId} th:nth-child(3),td:nth-child(3)`).css('min-width', '100px'); // vertexType
      $(`#boundaryMember_${this.svgId} th:nth-child(4),td:nth-child(4)`).css('min-width', '150px'); // name
      $(`#boundaryMember_${this.svgId} th:nth-child(5),td:nth-child(5)`).css('min-width', '60px'); // type
      $(`#boundaryMember_${this.svgId} th:nth-child(6),td:nth-child(6)`).css('min-width', '100px'); // mandatory
      $(`#boundaryMember_${this.svgId} th:nth-child(7),td:nth-child(7)`).css('width', '100%'); // repeat
    } else {
      $(`#boundaryMember_${this.svgId} th:nth-child(1),td:nth-child(1)`).css('min-width', '45px'); // id
      $(`#boundaryMember_${this.svgId} th:nth-child(2),td:nth-child(2)`).css('min-width', '45px'); // del check
      $(`#boundaryMember_${this.svgId} th:nth-child(3),td:nth-child(3)`).css('min-width', '100px'); // vertexType
      $(`#boundaryMember_${this.svgId} th:nth-child(4),td:nth-child(4)`).css('min-width', '150px'); // name
      $(`#boundaryMember_${this.svgId} th:nth-child(5),td:nth-child(5)`).css('width', '100%'); // type
    }
  }

  removeMemberHtml() {
    $(`#boundaryMember_${this.svgId} > tbody`).find(`input[name=${ATTR_DEL_CHECK}]`).each(function () {
      if ($(this).is(':checked')) {
        $(this).parents('tr').remove();
      }
    });

    // Uncheck all
    $(`#boundaryMember_${this.svgId} #${ATTR_DEL_CHECK_ALL}_${this.svgId}`).prop('checked', false);
  }

  addMember(memberType) {
    if (!this.editingBoundary) return;

    const $tbody = $(`#boundaryMember_${this.svgId} > tbody`);

    const listOfVertexType = [];
    this.vertexMgmt.vertexDefinition.vertex.forEach((vertex) => {
      listOfVertexType.push(vertex.vertexType);
    });

    let $bodyRow = null;
    let $bodyCol = null;
    let options = {};
    let $control = null;

    $bodyRow = $('<tr>');

    // id
    $bodyCol = $('<td>');
    $bodyCol.attr('name', 'id');
    $bodyCol.text('');
    $bodyCol.hide();
    $bodyCol.appendTo($bodyRow);

    // del-check
    $bodyCol = this.initCellDelCheck({
      className: 'checkbox_center',
      name: `${ATTR_DEL_CHECK}`,
      checked: false,
      colType: '<td>',
    });
    $bodyCol.appendTo($bodyRow);

    // vertex type
    if (memberType === OBJECT_TYPE.VERTEX) {
      $bodyCol = $('<td>');
      options.controlType = VERTEX_FORMAT_TYPE.ARRAY;
      options.controlName = 'vertexType';
      options.dataOptions = listOfVertexType;
      options.val = '';
      $control = this.generateControlByType(options);
      $control.appendTo($bodyCol);
      $bodyCol.appendTo($bodyRow);
    } else {
      $bodyCol = $('<td>');
      options = {};
      options.controlType = VERTEX_FORMAT_TYPE.STRING;
      options.controlName = 'vertexType';
      options.val = '';
      $control = this.generateControlByType(options);
      $control.prop('disabled', true);
      $control.appendTo($bodyCol);
      $bodyCol.appendTo($bodyRow);
    }

    // name
    $bodyCol = $('<td>');
    options = {};
    options.controlType = VERTEX_FORMAT_TYPE.STRING;
    options.controlName = 'name';
    if (memberType === OBJECT_TYPE.VERTEX) {
      options.val = listOfVertexType[0];
    } else {
      options.val = 'Boundary';
    }

    $control = this.generateControlByType(options);
    $control.appendTo($bodyCol);
    $bodyCol.appendTo($bodyRow);

    // type
    $bodyCol = $('<td>');
    $bodyCol.attr('name', 'type');
    $bodyCol.text(memberType);
    $bodyCol.css('text-align', 'center');
    $bodyCol.css('color', '#555');
    $bodyCol.appendTo($bodyRow);

    if (checkModePermission(this.viewMode.value, 'maxBoundaryRepeat')) {
      // mandatory
      $bodyCol = this.initCellDelCheck({
        className: 'checkbox_center',
        name: 'mandatory',
        checked: false,
        colType: '<td>',
      });
      $bodyCol.appendTo($bodyRow);

      // repeat
      $bodyCol = $('<td>');
      options = {};
      options.controlType = VERTEX_FORMAT_TYPE.NUMBER;
      options.controlName = 'repeat';
      options.val = '1';
      $control = this.generateControlByType(options);
      $control.appendTo($bodyCol);
      $bodyCol.appendTo($bodyRow);
    }

    $bodyRow.appendTo($tbody);

    // Set column with for table data
    const main = this;
    let columnHeaderCount = 0;
    $(`#boundaryMember_${main.svgId} thead tr th`).each(function () {
      columnHeaderCount += 1;

      // if ($(this).css('display') !== 'none') {
      $(`#boundaryMember_${main.svgId} td:nth-child(${columnHeaderCount})`).css('min-width', parseInt($(this).css('min-width').replace('px', '')));
      // }
    });

    $(`#boundaryMember_${this.svgId} td:nth-child(${columnHeaderCount})`).css('width', '100%');
  }

  updateChildren(state) {
    const main = this;
    const dataTable = [];

    $(`#boundaryMember_${this.svgId} tbody tr`).each(function () {
      const dataRow = {};
      dataRow.id = $(this).find(`[name=${ATTR_ID}]`).text();
      dataRow.vertexType = $(this).find(`[name="${ATTR_VERTEX_TYPE}"]`).val();
      dataRow.name = $(this).find(`[name="${ATTR_NAME}"]`).val();
      dataRow.type = $(this).find(`[name="${ATTR_TYPE}"]`).text();
      if (checkModePermission(main.viewMode.value, 'maxBoundaryRepeat')) {
        dataRow.mandatory = $(this).find(`[name="${ATTR_MANDATORY}"]`)[0].checked;
        dataRow.repeat = $(this).find(`[name="${ATTR_REPEAT}"]`).val();
      }

      dataTable.push(dataRow);
    });

    // for members were deleted
    const members = this.editingBoundary.member;
    for (let i = members.length - 1; i >= 0; i -= 1) {
      const mem = members[i];
      if (!_.find(dataTable, { id: mem.id })) {
        if (mem.type === OBJECT_TYPE.VERTEX) {
          const vertex = _.find(main.dataContainer.vertex, { id: mem.id });
          vertex.remove(false, state);
        } else {
          const boundary = _.find(main.dataContainer.boundary, { id: mem.id });
          boundary.doDeleteAll(state);
        }
      }
    }

    const oldMember = _.clone(this.editingBoundary.member);
    this.editingBoundary.member = [];
    // for members were updated or added new
    dataTable.forEach((item, index) => {
      let object = {};

      if (item.id !== '') {
        if (item.type === OBJECT_TYPE.VERTEX) {
          object = _.find(main.dataContainer.vertex, { id: item.id });
        } else {
          object = _.find(main.dataContainer.boundary, { id: item.id });
        }
        object.updateInfo(item, state);
        this.editingBoundary.member.push({ id: item.id, show: _.find(oldMember, { id: item.id }).show, type: item.type });
      } else {
        let returnObject = {};
        if (item.type === OBJECT_TYPE.VERTEX) {
          returnObject = main.vertexMgmt.create({
            isMemberManagement: true,
            parent: main.editingBoundary.id,
            name: item.name,
            vertexType: item.vertexType,
            mandatory: item.mandatory,
            repeat: item.repeat,
          }, state);
          this.editingBoundary.member.push({ id: returnObject.id, show: true, type: returnObject.type });
        } else {
          returnObject = main.create({
            isMemberManagement: true,
            parent: main.editingBoundary.id,
            name: item.name,
            mandatory: item.mandatory,
            repeat: item.repeat,
          }, state);
          this.editingBoundary.member.push({ id: returnObject.id, show: true, type: returnObject.type });
        }

        item.id = returnObject.id;
      }
    });
  }

  setHeaderWidth() {
    let columnCount = 0;
    $(`#boundaryMember_${this.svgId} tbody tr`).first().find('td').each(function () {
      columnCount += 1;

      $(`table thead th:nth-child(${columnCount})`).css('min-width', this.getBoundingClientRect().width);
    });
  }
}

export default BoundaryMgmt;
