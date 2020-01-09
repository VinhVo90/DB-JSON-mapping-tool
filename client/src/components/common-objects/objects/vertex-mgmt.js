import _ from 'lodash';
import ColorHash from 'color-hash';
import * as d3 from 'd3';
import Vertex from './vertex';
import PopUtils from '../../../common/utilities/popup.util';
import ObjectUtils from '../../../common/utilities/object.util';
import VertexMenu from '../menu-context/vertex-menu';
import HistoryElement from '../../../common/new-type-define/historyElement';
import State from '../../../common/new-type-define/state';

import {
	REPEAT_RANGE,
	VERTEX_FORMAT_TYPE,
	POPUP_CONFIG,
	VERTEX_GROUP_OPTION,
	CONNECT_SIDE,
	ACTION_TYPE,

} from '../../../common/const/index';

import {
	replaceSpecialCharacter,
	checkMinMaxValue,
	allowInputNumberOnly,
	autoScrollOnMousedrag,
	updateSizeGraph,
	setMinBoundaryGraph,
	checkModePermission,
	getKeyPrefix,
	htmlEncode,
	checkIsMatchRegexNumber,
	comShowMessage,
	segmentName,
	hideFileChooser,
  initDialogDragEvent,
} from '../../../common/utilities/common.util';

const HTML_VERTEX_INFO_ID = 'vertexInfo';
const HTML_VERTEX_PROPERTIES_ID = 'vertexProperties';
const HTML_GROUP_BTN_DYNAMIC_DATASET = 'groupBtnDynamicDataSet';
const ATTR_DEL_CHECK_ALL = 'delCheckAll';
const ATTR_DEL_CHECK = 'delCheck';
const FOCUSED_CLASS = 'focused-object';

class VertexMgmt {
	constructor(props) {
		this.mainParent = props.mainParent;
		this.dataContainer = props.dataContainer; // {[vertex array], [boundary array]} store all vertex and boundary for this SVG
		this.containerId = props.containerId;
		this.svgId = props.svgId;
		this.viewMode = props.viewMode;
		this.edgeMgmt = props.edgeMgmt;
		this.connectSide = props.connectSide || CONNECT_SIDE.BOTH;
		this.mandatoryDataElementConfig	= props.mandatoryDataElementConfig; // The configuration for Data element validation
		this.history = props.history;

		this.vertexDefinition = {
			vertexGroup: [],  // Group vertex
			vertex:[]         // List of vertex type
		}

		this.initialize();
	}

	initialize() {
		this.colorHash = new ColorHash({lightness: 0.7});
		this.colorHashConnection = new ColorHash({lightness: 0.8});
		this.objectUtils = new ObjectUtils();

		this.selectorClass = `_vertex_${this.svgId}`;
		this.currentId = null; //vertex is being edited

		new VertexMenu({
			selector: `.${this.selectorClass}`,
			vertexMgmt: this,
			dataContainer: this.dataContainer,
			viewMode: this.viewMode,
			history: this.history
		});

		this.initVertexPopupHtml();
		this.bindEventForPopupVertex();

		this.handleDragVertex = d3.drag()
			.on('start', this.startDrag(this))
			.on('drag', this.dragTo(this))
			.on('end', this.endDrag(this));
	}

	initVertexPopupHtml() {
		const repeatHtml = `
    <tr>
      <th>Max repeat</th>
      <td class="input-group full-width">
        <input type="number" class="form-control" id="vertexRepeat_${this.svgId}" name="vertexRepeat" min="0" max="9999">
        <label class="input-group-addon">
          <input type="checkbox" id="isVertexMandatory_${this.svgId}" name="isVertexMandatory">
        </label>
        <label class="input-group-addon" for="isVertexMandatory_${this.svgId}">Mandatory</label>
      </td>
    </tr>`;

		const sHtml = `
    <!-- Vertex Info Popup (S) -->
    <div id="${HTML_VERTEX_INFO_ID}_${this.svgId}" class="modal fade" role="dialog" tabindex="-1">
      <div class="modal-dialog">
        <div class="web-dialog modal-content">
          <div class="dialog-title">
            <span class="title">Vertex Info</span>
          </div>

          <div class="dialog-wrapper">
            <form action="#" method="post">
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
                        <input type="text" class="form-control" id="vertexName_${this.svgId}" name="vertexName" onfocus="this.select();">
                      </td>
                    </tr>
                    ${checkModePermission(this.viewMode.value, 'vertexRepeat') ? repeatHtml: ''}
                    <tr>
                      <th>Description</th>
                      <td class="full-width">
                        <textarea class="form-control" id="vertexDesc_${this.svgId}" name="vertexDesc" rows="4" onfocus="this.select();"></textarea>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
						</form>
						
						<div class="dialog-button-top" id="${HTML_GROUP_BTN_DYNAMIC_DATASET}_${this.svgId}">
							<div class="row" style="float:left;">
								<button id="vertexBtnDelete_${this.svgId}" class="btn-etc">Delete</button>
							</div>

              <div class="row text-right">
                <button id="vertexBtnAdd_${this.svgId}" class="btn-etc">Add</button>
							</div>
						</div>

            <form id="vertexForm_${this.svgId}" action="#" method="post">
              <div class="dialog-search form-inline">
                <table class="fixed-headers vertex-properties" id="${HTML_VERTEX_PROPERTIES_ID}_${this.svgId}" border="1"></table>
              </div>
						</form>
						
            <div class="dialog-button-top">
              <div class="row text-right">
                <button id="vertexBtnConfirm_${this.svgId}" class="btn-etc">Confirm</button>
                <button id="vertexBtnCancel_${this.svgId}" class="btn-etc">Cancel</button>
              </div>
						</div>
						
          </div>
        </div>
      </div>
    </div>
    <!-- Vertex Info Popup (E) -->`;

		$($(`#${this.svgId}`)[0].parentNode).append(sHtml);
	}

	bindEventForPopupVertex() {
		const main = this;
		if (checkModePermission(this.viewMode.value, 'vertexBtnConfirm')) {
			$(`#vertexBtnConfirm_${main.svgId}`).click(() => {
				this.confirmEditVertexInfo();
			});

			$(`#vertexBtnAdd_${main.svgId}`).click(() => {
				this.addDataElement();
			});

			$(`#vertexBtnDelete_${main.svgId}`).click(() => {
				this.removeDataElement();
			});
		}

		$(`#vertexBtnCancel_${main.svgId}`).click(() => {
			this.closePopVertexInfo();
		});

		// Validate input number
		if (checkModePermission(this.viewMode.value, 'vertexRepeat')) {
			$(`#vertexRepeat_${main.svgId}`).keydown(function (e) {
				allowInputNumberOnly(e);
			});

			$(`#isVertexMandatory_${main.svgId}`).change(function () {
				if (this.checked && $(`#vertexRepeat_${main.svgId}`).val() < 1) {
					$(`#vertexRepeat_${main.svgId}`).val(1);
				}
			});
  
			$(`#vertexRepeat_${main.svgId}`).focusout(function () {
				const rtnVal = checkMinMaxValue(this.value, $(`#isVertexMandatory_${main.svgId}`).prop('checked') == true ? 1 : REPEAT_RANGE.MIN, REPEAT_RANGE.MAX);
				this.value = rtnVal;
			});
		}

		// Prevent refresh page after pressing enter on form control (Edit popup)
		$('form').submit(function() { return false; });
		
		// Enable dragging for popup
    // this.initDialogDragEvent();
    initDialogDragEvent(`${HTML_VERTEX_INFO_ID}_${this.svgId}`);
	}

	create(sOptions, state) {
		const {vertexType, isMenu} = sOptions;

		if (!vertexType)
			return null;

		sOptions.isShowReduced = this.mainParent.isShowReduced;
		let newVertex = new Vertex({
			mainParent: this.mainParent,
			vertexMgmt: this
		});

		newVertex.create(sOptions, this.handleDragVertex, this.edgeMgmt.handleDragConnection);

		if (isMenu) {
			if (this.history) {
				state = new State();
				const he = new HistoryElement();
				he.actionType = ACTION_TYPE.CREATE;
				he.dataObject = newVertex.getObjectInfo();
				he.realObject = newVertex;
				state.add(he);
				this.history.add(state);
			}
		} else {
			if (state) {
				// create vertex by Boundary update info popup
				const he = new HistoryElement();
				he.actionType = ACTION_TYPE.CREATE;
				he.dataObject = newVertex.getObjectInfo();
				he.realObject = newVertex;
				state.add(he);
			}
		}

		return newVertex;
	}

	startDrag(main) {
		return function (d) {
			if (main.edgeMgmt.isSelectingEdge()){
				main.edgeMgmt.cancleSelectedPath();
			}

			// Resize boundary when vertex dragged
			if (!d.parent){
				main.objectUtils.reSizeBoundaryWhenObjectDragged(d);
			}

			main.edgeMgmt.emphasizePathConnectForVertex(this);

			d.startX = d.x;
			d.startY = d.y;
			
			d.moveToFront();
			
			d3.select(`.${FOCUSED_CLASS}`).classed(FOCUSED_CLASS, false);
			d3.select(`#${d.id}`).classed(FOCUSED_CLASS, true);
		}
	}

	dragTo(main) {
		return function (d) {
			updateSizeGraph(d);
			autoScrollOnMousedrag(d.svgId, d.containerId, main.viewMode.value);
      
			// Prevent drag object outside the window
			const {x, y} = main.objectUtils.setPositionObjectJustInSvg(d3.event, d);
			d.x = x;
			d.y = y;
			// Transform group
			d3.select(`#${d.id}`).attr('transform', 'translate(' + [d.x, d.y] + ')');
			main.edgeMgmt.updatePathConnectForVertex(d);
		}
	}

	endDrag(main) {
		return function (d) {
			// If really move
			if (d.startX !== d.x || d.startY !== d.y) {
				const state = new State()

				if (d.parent) {
					//If object not out boundary parent , object change postion in boundary parent, so change index object
					if (main.objectUtils.checkDragObjectOutsideBoundary(d, state)) {
						d.validateConnectionByUsage();
					} else {
						main.objectUtils.changeIndexInBoundaryForObject(d, state);
					}
				} else {
					if (main.objectUtils.checkDragObjectInsideBoundary(d, state)) {
						d.validateConnectionByUsage();
					}

					main.objectUtils.restoreSizeBoundary(d);
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
				
				setMinBoundaryGraph(main.dataContainer, main.svgId, main.viewMode.value);
			}
		}
	}

	/**
   * Make popup edit vertex info
   * @param vertexId
   */
	makePopupEditVertex(vertexId) {
		const {name, description, repeat, mandatory, data, id, groupType} = _.find(this.dataContainer.vertex, {'id': vertexId});
		// Get vertex group with group type
		const group = _.find(this.vertexDefinition.vertexGroup, {'groupType': groupType});

		this.currentId = id;
		// Append content to popup
		$(`#vertexName_${this.svgId}`).val(name);
		$(`#vertexDesc_${this.svgId}`).val(description);

		if (checkModePermission(this.viewMode.value, 'vertexRepeat')) {
			$(`#vertexRepeat_${this.svgId}`).val(repeat);
			$(`#isVertexMandatory_${this.svgId}`).prop('checked', mandatory);
		}

		// Generate properties vertex
		const columnTitle = Object.keys(group.dataElementFormat);
		const cols = columnTitle.length;
		const rows = data.length;
		const dataType = group.elementDataType;

		const $table = $(`#${HTML_VERTEX_PROPERTIES_ID}_${this.svgId}`).empty();
		const $contentHeader = $('<thead>');
		// Generate header table
		const $headerRow = $('<tr>');
		//let $colGroup = $('<colgroup>')
		let $popWidth = 0;
		
		//Append hidden column 'id'
		let $colId = $('<th>').text('id');
		$colId.attr('class', 'col_header');
		$colId.css('display', 'none');
		$colId.appendTo($headerRow);

		// Store column width for table data
		let arrColumnWidth = [];

		// init delcheck column if isDynamicDataSet
		const option = group.option;
		const isDynamicDataSet = option.indexOf(VERTEX_GROUP_OPTION.DYNAMIC_DATASET) > -1;
		// Set show hide group button dynamic data set
		if (!isDynamicDataSet) {
			$(`#${HTML_GROUP_BTN_DYNAMIC_DATASET}_${this.svgId}`).hide();
		}
		else {
			$(`#${HTML_GROUP_BTN_DYNAMIC_DATASET}_${this.svgId}`).show();
			// Prepend col group del check
			arrColumnWidth.push(POPUP_CONFIG.WIDTH_COL_DEL_CHECK);
			
			let $colHdr = this.initCellDelCheck({
				'className': 'col_header',
				'name': `${ATTR_DEL_CHECK_ALL}_${this.svgId}`,
				'checked': false,
				'colType': '<th>',
				'isCheckAll': true,
			});
			$colHdr.appendTo($headerRow);
			
		}

		for (let i = 0; i < cols; i++) {
			let $colHdr = $('<th>').text(this.capitalizeFirstLetter(columnTitle[i]));
			$colHdr.attr('class', 'col_header');
			$colHdr.appendTo($headerRow);

			// Init col in col group
			let prop = columnTitle[i];
			let type = dataType[prop];
			let value = group.dataElementFormat[prop];
			let width = this.findLongestContent({data, prop, type, value});
			$popWidth += width;
			arrColumnWidth.push(width);
		}

		//$colGroup.appendTo($table)
		$headerRow.appendTo($contentHeader);
		$contentHeader.appendTo($table);

		// Generate content table
		const $contentBody = $('<tbody>');
		for (let i = 0; i < rows; i++) {
			const dataRow = data[i];
			const $row = $('<tr>');

			// id
			const $colId = $('<td>');
			$colId.attr('name', 'id');
			$colId.text(i);
			$colId.hide();
			$colId.appendTo($row);

			// Checkbox
			if (isDynamicDataSet) {
				// Append del check to row
				const $col = this.initCellDelCheck({
					'className': 'checkbox_center',
					'name': `${ATTR_DEL_CHECK}_${this.svgId}` ,
					'checked': false,
					'colType': '<td>'
				});
				$col.appendTo($row);
			}

			//data
			for (let j = 0; j < cols; j++) {
				const prop = columnTitle[j];
				const type = dataType[prop];
				const val = dataRow[prop];
				let opt = [];

				const $col = $('<td>')
				// Get option if type is array
				if (type === VERTEX_FORMAT_TYPE.ARRAY) {
					opt = group.dataElementFormat[prop];
				} else if (type === VERTEX_FORMAT_TYPE.BOOLEAN) {
					$col.attr('class', 'checkbox_center');
				}

				const $control = this.generateControlByType({i, type, val, prop, opt, groupType});
				$control.appendTo($col);
				$col.appendTo($row);
			}
			
			$row.appendTo($contentBody);
		}

		$contentBody.appendTo($table);

		// Set column with for table data
		for(let i = 0; i < arrColumnWidth.length; i += 1) {
			if (i === arrColumnWidth.length - 1) {
				$(`#${HTML_VERTEX_PROPERTIES_ID}_${this.svgId} th:nth-child(${i+2}),td:nth-child(${i+2})`).css('width', '100%');
			} else {
				$(`#${HTML_VERTEX_PROPERTIES_ID}_${this.svgId} th:nth-child(${i+2}),td:nth-child(${i+2})`).css('min-width', arrColumnWidth[i]);
			}
		}

		hideFileChooser();

		const options = {
			popupId: `${HTML_VERTEX_INFO_ID}_${this.svgId}`,
			position: 'center',
			width: $popWidth + POPUP_CONFIG.PADDING_CHAR + (!isDynamicDataSet ? 0 : 45)
		}
		PopUtils.metSetShowPopup(options);

		if (!checkModePermission(this.viewMode.value, 'vertexBtnConfirm')) {
			if (isDynamicDataSet) {
				$(`#vertexBtnAdd_${this.svgId}`).hide();
				$(`#vertexBtnDelete_${this.svgId}`).hide();
			}
			$(`#vertexBtnConfirm_${this.svgId}`).hide();

		} else {
			if (isDynamicDataSet) {
				$(`#vertexBtnAdd_${this.svgId}`).show();
				$(`#vertexBtnDelete_${this.svgId}`).show();
			}
			$(`#vertexBtnConfirm_${this.svgId}`).show();
		}
		
		if (isDynamicDataSet) {
			$(`#${HTML_VERTEX_PROPERTIES_ID}_${this.svgId}`).find('tbody').sortable();
		}
	}

	/**
   * Generate control with options
   * @param options
   * @returns {*}
   */
	generateControlByType(options) {
		let $control = null;
		const {type, val, prop, opt, groupType} = options;
		const defaultVal = _.find(this.vertexDefinition.vertexGroup, {'groupType':groupType}).dataElementFormat[prop];
		
		switch (type) {
		case VERTEX_FORMAT_TYPE.BOOLEAN:
			$control = $('<input>');
			$control.attr('type', 'checkbox');
			$control.attr('name', `${prop}`);
			$control.prop('checked', typeof(val) == 'boolean' ? val : defaultVal);
			$control.attr('value', val);
			break;
		case VERTEX_FORMAT_TYPE.ARRAY:
      const firstOpt = opt[0];
			$control = $('<select>');
			$control.attr('name', `${prop}`);
			$control.attr('class', 'form-control');
			$.each(opt, (key, value) => {
				$control
					.append($('<option></option>')
						.attr('value', value || firstOpt)
						.prop('selected', value === (val || firstOpt))
						.text(value));
			})
			break;
		case VERTEX_FORMAT_TYPE.NUMBER:
			$control = $('<input>');
			$control.attr('type', 'text');
			$control.attr('name', `${prop}`);
			$control.attr('value', !isNaN(val) ? val : defaultVal);
			$control.attr('class', 'form-control');
			$control
				.on('keydown', function (e) {
					allowInputNumberOnly(e);
				})
				.on('focusout', function (e) {
					if (this.value && !checkIsMatchRegexNumber(this.value)) {
						comShowMessage('Input invalid');
						this.value = '';
					} else {
						if (isNaN(this.value)) {
							comShowMessage('Input invalid');
							this.value = '';
						}
					}
				});
			break
		default:
			$control = $('<input>');
			$control.attr('type', 'text');
			$control.attr('autocomplete', 'off');
			$control.attr('name', `${prop}`);
			$control.attr('value', val != undefined ? val : defaultVal);
			$control.attr('class', 'form-control');
		}

		return $control;
	}

	/**
   * Upper case first letter
   */
	capitalizeFirstLetter(string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	}

	findLongestContent(configs) {
		const {data, prop, type, value} = configs;
		const firstRow = data[0];
		let arr = [];

		// If type is boolean or first undefined or firstRow is empty
		if ((type === VERTEX_FORMAT_TYPE.BOOLEAN) || !firstRow)
			return this.getLongestSpecialCase(prop, value);
		// prop.toString().length * POPUP_CONFIG.WIDTH_CHAR + POPUP_CONFIG.PADDING_CHAR;

		//  If object firstRow hasn't it own the specified property
		if (!firstRow.hasOwnProperty(prop)) {
			return this.getLongestSpecialCase(prop, value);
		}

		// From an array of objects, extract value of a property as array
		if (type === VERTEX_FORMAT_TYPE.ARRAY) {
			arr = value;
		} else {
			arr = data.map(e => e[prop]);
		}
		const longest = this.getLongestContentFromArry(arr);
		if (longest.toString().length < prop.toString().length)
			return prop.toString().length * POPUP_CONFIG.WIDTH_CHAR + POPUP_CONFIG.PADDING_CHAR;

		return longest.toString().length * (type === VERTEX_FORMAT_TYPE.ARRAY ? POPUP_CONFIG.WIDTH_CHAR_UPPER : POPUP_CONFIG.WIDTH_CHAR) + POPUP_CONFIG.PADDING_CHAR;
	}

	getLongestSpecialCase(prop, value) {
		const lengthProp = prop.toString().length;
		let lengthDef = value.toString().length;
		let type = typeof(value);
		// Has type is array
		if (type === 'object' && Array.isArray(value)) {
			type = VERTEX_FORMAT_TYPE.ARRAY;
			lengthDef = this.getLongestContentFromArry(value).toString().length;
		}

		return (lengthProp > lengthDef ? lengthProp * POPUP_CONFIG.WIDTH_CHAR :
			lengthDef * (type === VERTEX_FORMAT_TYPE.ARRAY ? POPUP_CONFIG.WIDTH_CHAR_UPPER : POPUP_CONFIG.WIDTH_CHAR ))
      + POPUP_CONFIG.PADDING_CHAR;
	}

	getLongestContentFromArry(arr) {
		return arr.reduce((a, b) => {
			const firstTmp = a + '';
      const secondTmp = b + '';
      
			return firstTmp.length > secondTmp.length ? firstTmp : secondTmp;
		});
	}

	addDataElement() {
		if (!this.currentId)
			return;
    
		const {groupType} = _.find(this.dataContainer.vertex, {'id': this.currentId});
		const vertexGroup = _.find(this.vertexDefinition.vertexGroup, {'groupType': groupType});
		const columnTitle = Object.keys(vertexGroup.dataElementFormat);
		const cols = columnTitle.length;
		const dataType = vertexGroup.elementDataType;
		const $appendTo = $(`#${HTML_VERTEX_PROPERTIES_ID}_${this.svgId} > tbody`);

		const $row = $('<tr>');
		// id
		$('<td name="id">').hide().appendTo($row);

		const group = _.find(this.vertexDefinition.vertexGroup,{'groupType': groupType});
		const option = group.option;
		const isDynamicDataSet = option.indexOf(VERTEX_GROUP_OPTION.DYNAMIC_DATASET) > -1;
		if (isDynamicDataSet) {
			// Append del check to row
			const $col = this.initCellDelCheck({
				'className': 'checkbox_center',
				'name': `${ATTR_DEL_CHECK}_${this.svgId}`,
				'checked': false,
				'colType': '<td>'
			});
			$col.appendTo($row);
		}

		for (let j = 0; j < cols; j++) {
			const prop = columnTitle[j];
			const type = dataType[prop];
			// let val = dataRow[prop];
			let opt = [];

			const $col = $('<td>');
			// Get option if type is array
			if (type === VERTEX_FORMAT_TYPE.ARRAY) {
				opt = vertexGroup.dataElementFormat[prop];
			} else if (type === VERTEX_FORMAT_TYPE.BOOLEAN) {
				$col.attr('class', 'checkbox_center');
			}

			const $control = this.generateControlByType({'i': j, type, prop, opt, groupType});
			$control.appendTo($col);
			$col.appendTo($row);
		}

		$row.appendTo($appendTo);

		// Set column with for table data
		const main = this;
		let columnHeaderCount = 0;
		$(`#${HTML_VERTEX_PROPERTIES_ID}_${main.svgId} thead tr th`).each(function () {
			columnHeaderCount += 1;

			if ($(this).css('display') !== 'none') {
				$(`#${HTML_VERTEX_PROPERTIES_ID}_${main.svgId} td:nth-child(${columnHeaderCount})`).css('min-width', parseInt($(this).css('min-width').replace('px','')));
			}
		});

		$(`#${HTML_VERTEX_PROPERTIES_ID}_${this.svgId} td:nth-child(${columnHeaderCount})`).css('width', '100%');
	}

	removeDataElement() {
		$(`#${HTML_VERTEX_PROPERTIES_ID}_${this.svgId} > tbody`).find(`input[name=${ATTR_DEL_CHECK}_${this.svgId}]`).each(function () {
			if ($(this).is(':checked')) {
				$(this).parents('tr').remove();
			}
		});

		// Uncheck all
		$(`#${HTML_VERTEX_PROPERTIES_ID}_${this.svgId} #${ATTR_DEL_CHECK_ALL}_${this.svgId}`).prop('checked', false);
	}

	initCellDelCheck(options) {
		const {className, name, checked, colType, isCheckAll} = options;
    
		const $col = $(colType);
		$col.attr('class', className);
		const $chk = $('<input>');
		$chk.attr('type', 'checkbox');
		if (isCheckAll) {
			$chk.attr('id', name);
		}
		$chk.prop('checked', checked);

		const main = this;
		$chk.attr('name', name)
			.on('click', function () {
				if (isCheckAll)
					$(this).closest('table').find(`tbody :checkbox[name=${ATTR_DEL_CHECK}_${main.svgId}]`)
						.prop('checked', this.checked);
				else {
					$(`#${HTML_VERTEX_PROPERTIES_ID}_${main.svgId} #${ATTR_DEL_CHECK_ALL}_${main.svgId}`).prop('checked',
						($(this).closest('table').find(`tbody :checkbox[name=${ATTR_DEL_CHECK}_${main.svgId}]:checked`).length ==
              $(this).closest('table').find(`tbody :checkbox[name=${ATTR_DEL_CHECK}_${main.svgId}]`).length));
				}
      });
      
		$chk.appendTo($col);

		return $col;
	}

	/**
   * Close popup edit vertex info
   */
	closePopVertexInfo() {
		this.currentId = null;
		let options = {popupId: `${HTML_VERTEX_INFO_ID}_${this.svgId}`};
		PopUtils.metClosePopup(options);
	}

	/**
   * Get data vertex change
   */
	confirmEditVertexInfo() {
		// Get data on form
		const forms = {};
		forms.id = this.currentId;
		forms.name = $(`#vertexName_${this.svgId}`).val();
		forms.description = $(`#vertexDesc_${this.svgId}`).val();

		if (checkModePermission(this.viewMode.value, 'vertexRepeat')) {
			forms.repeat = $(`#vertexRepeat_${this.svgId}`).val();
			forms.mandatory = $(`#isVertexMandatory_${this.svgId}`).prop('checked');
		}

		const vertex = _.find(this.dataContainer.vertex, {'id': this.currentId});
		const oldVertex = vertex.getObjectInfo(); // for history
		const {groupType} = vertex;
    
		const dataType = _.find(this.vertexDefinition.vertexGroup, {'groupType': groupType}).elementDataType;
		const elements = [];
		// Get data element
		const arrPosition = [];
		$(`#${HTML_VERTEX_PROPERTIES_ID}_${this.svgId}`).find('tr').each(function (rowIndex) {
			// Skip for header row
			if (rowIndex > 0) {
				const row = {};

				//array of new position of connectors
				arrPosition.push($(this).find('td[name=\'id\']').text());

				$(this).find('td input:text, td input:checkbox, td select').each(function () {
					const prop = $(this).attr('name');
					const type = dataType[prop];
					if (prop != `${ATTR_DEL_CHECK}_${this.svgId}`) {
						row[prop] = type === VERTEX_FORMAT_TYPE.BOOLEAN ? ($(this).is(':checked') ? true : false) : this.value;
					}
				});
				elements.push(row);
			}
		});
		
		forms.data = elements;
		forms.groupType = groupType;

		// For histrory
		const state = new State();

		this.edgeMgmt.updateConnectorPositionRelatedToVertex(this.currentId, arrPosition, state);
		this.updateVertexInfo(forms);

		// Create history
		if (this.history) {
			const he = new HistoryElement();
			he.actionType = ACTION_TYPE.UPDATE_INFO;
			he.oldObject = oldVertex;
			he.dataObject = vertex.getObjectInfo();
			he.realObject = vertex;

			state.add(he);
			this.history.add(state);
		}

		this.closePopVertexInfo();
	}

	/**
   * Update vertex info
   * Update value properties
   * Update name, type, ...
   * Update present (DOM)
   */
	updateVertexInfo(forms, isEffectToParent = true) {
		const {id, name, description, repeat, mandatory, data, groupType} = forms;
		const vertex = _.find(this.dataContainer.vertex, {'id': id});
		vertex.name = name;
		vertex.description = description;
		vertex.repeat = repeat;
		vertex.mandatory = mandatory;
		vertex.data = data;

		const group = _.find(this.vertexDefinition.vertexGroup, {'groupType': groupType});
		const option = group.option;
		const isDynamicDataSet = option.indexOf(VERTEX_GROUP_OPTION.DYNAMIC_DATASET) > -1;
		if (isDynamicDataSet) {
			d3.select(`#${id}`).selectAll('*').remove();
			this.reRenderContentInsideVertex(vertex, isEffectToParent);
		} else {
			// Update properties
			const header = d3.select(`#${id}Name`);
			header.text(segmentName(vertex, this.viewMode.value)).attr('title', description);
			d3.select(header.node().parentNode).style('background-color', `${this.colorHash.hex(name)}`);
			let rows = data.length;
			let presentation = group.vertexPresentation;
			for (let i = 0; i < rows; i++) {
				const dataRow = data[i];

				//Key
				d3.select(`#${replaceSpecialCharacter(`${id}${presentation.key}${i}`)}`)
					.html(htmlEncode(getKeyPrefix(dataRow, this.vertexDefinition, groupType)) + dataRow[presentation.key])
					.attr('title', dataRow[presentation.keyTooltip]);

				//Value
				d3.select(`#${replaceSpecialCharacter(`${id}${presentation.value}${i}`)}`)
					.text(dataRow[presentation.value])
					.attr('title', dataRow[presentation.valueTooltip]);
			}

			//update color for "rect"
			d3.select(`#${id}`).selectAll('.drag_connect:not(.connect_header)').attr('fill', this.colorHashConnection.hex(name));
			d3.select(`#${id}`).selectAll('.drag_connect.connect_header').attr('fill', this.colorHash.hex(name));
		
			// Check mandatory for Data element
			vertex.validateConnectionByUsage();
		}
	}

	reRenderContentInsideVertex(vertex, isEffectToParent = true) {
		const {vertexType, parent} = vertex;

		if (!vertexType)
			return;

		vertex.generateContent(this.edgeMgmt.handleDragConnection);

		this.edgeMgmt.updatePathConnectForVertex(vertex);

		//Check and mark connector if has connection
		vertex.markedAllConnector();

		if (isEffectToParent && parent) {
			const parentObj = _.find(this.dataContainer.boundary, {'id': parent});
			const ancesstor = parentObj.findAncestorOfMemberInNestedBoundary();
			ancesstor.updateSize();
			ancesstor.reorderPositionMember();
		}
    
		setMinBoundaryGraph(this.dataContainer, this.svgId, this.viewMode.value);
	}

	setVisibleAllEdgeRelatedToObject(vertexId, status) {
		this.edgeMgmt.setVisibleAllEdgeRelatedToObject(vertexId, status);
	}

	updatePathConnectForVertex(vertex) {
		this.edgeMgmt.updatePathConnectForVertex(vertex);
	}

	clearAll() {
		d3.select(`#${this.svgId}`).selectAll(`.${this.selectorClass}`).remove();
		this.dataContainer.vertex = [];
	}

	LoadVertexDefinition(vertexDefinitionData) {
		//Validate data struct
		if (!this.validateVertexDefineStructure(vertexDefinitionData)) {
			comShowMessage('Format or data in Segment Set is corrupted. You should check it!');
			return false;
		}

		//Reload Vertex Define and init main menu
		this.processDataVertexTypeDefine(vertexDefinitionData);

		return true;
	}

	/**
   * Validate Vertex Define Structure
   */
	validateVertexDefineStructure(data) {

		//Validate data exists
		if(data===undefined) {
			return false;
		}

		if (!data.VERTEX_GROUP || !data.VERTEX) {
			return false;
		}

		if (Object.keys(data).length > 2) {
			return false;
		}

		return true;
	}

	processDataVertexTypeDefine(data) {
		this.resetVertexDefinition();

		const {VERTEX_GROUP, VERTEX} = data;
		this.vertexDefinition.vertexGroup = VERTEX_GROUP;
		this.vertexDefinition.vertex = VERTEX;
		this.getVertexFormatType(VERTEX_GROUP);
	}

	resetVertexDefinition() {
		this.vertexDefinition.vertexGroup = [];
		this.vertexDefinition.vertex = [];
	}

	getVertexFormatType(vertexGroup) {
		for (let i = 0; i < vertexGroup.length; i++) {
			const {dataElementFormat} = vertexGroup[i];
			const dataType = {};
			const header = Object.keys(dataElementFormat);
			const len = header.length;
			for (let i = 0; i < len; i++) {
				const key = header[i];
				const value = dataElementFormat[key];
				const type = typeof(value);

				dataType[key] = VERTEX_FORMAT_TYPE.STRING; // For string and other type
				if (type === 'boolean')
					dataType[key] = VERTEX_FORMAT_TYPE.BOOLEAN; // For boolean

				if (type === 'object' && Array.isArray(value))
					dataType[key] = VERTEX_FORMAT_TYPE.ARRAY; // For array

				if (type === 'number')
					dataType[key] = VERTEX_FORMAT_TYPE.NUMBER; // For number
			}

			this.vertexDefinition.vertexGroup[i].elementDataType = dataType;
		}
	}
	
	/**
	 * Enable dragging for popup
	 */
	initDialogDragEvent() {
		const main = this;
		$(`#${HTML_VERTEX_INFO_ID}_${main.svgId} .dialog-title`).css('cursor', 'move').on('mousedown', (e) => {
			let $drag = $(`#${HTML_VERTEX_INFO_ID}_${main.svgId} .modal-dialog`).addClass('draggable');
				
			let pos_y = $drag.offset().top - e.pageY,
				pos_x = $drag.offset().left - e.pageX,
				winH = window.innerHeight,
				winW = window.innerWidth,
				dlgW = $drag.get(0).getBoundingClientRect().width
				
			$(window).on('mousemove', function(e) {
				let x = e.pageX + pos_x
				let y = e.pageY + pos_y

				if (x < 10) x = 10
				else if (x + dlgW > winW - 10) x = winW - dlgW - 10

				if (y < 10) y = 10
				else if (y > winH - 10) y = winH - 10

				$(`#${HTML_VERTEX_INFO_ID}_${main.svgId} .draggable`).offset({
					top: y,
					left: x
				})
			})
			e.preventDefault() // disable selection
		})

		$(window).on('mouseup', function(e) {
			$(`#${HTML_VERTEX_INFO_ID}_${main.svgId} .draggable`).removeClass('draggable')
		})
	}
}

export default VertexMgmt
