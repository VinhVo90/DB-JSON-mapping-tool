import * as d3 from 'd3';
import _ from 'lodash';
import ObjectUtils from '../../common/utilities/object.util';
import PopUtils from '../../common/utilities/popup.util';
import VertexMgmt from '../common-objects/objects/vertex-mgmt';
import BoundaryMgmt from '../common-objects/objects/boundary-mgmt';
import EdgeMgmt from '../common-objects/objects/edge-mgmt';
import MainMenu from '../common-objects/menu-context/main-menu';
import History from '../../common/new-type-define/history';
import HistoryElement from '../../common/new-type-define/historyElement';
import State from '../../common/new-type-define/state';

import {
	comShowMessage,
	checkIsMatchRegexNumber,
	setSizeGraph,
	setMinBoundaryGraph,
	setAddressTabName,
	hideFileChooser,
	filterPropertyData,
	isPopupOpen,
  checkKeyMisMatch,
  checkLengthMisMatch,
  removeDuplicates,
  initDialogDragEvent
} from '../../common/utilities/common.util';

import { 
	VERTEX_FORMAT_TYPE, POPUP_CONFIG,DEFAULT_CONFIG_GRAPH, VIEW_MODE, CONNECT_SIDE, ACTION_TYPE, OBJECT_TYPE,
} from '../../common/const/index';

const ID_TAB_SEGMENT_SET = 'addressSegmentSet';
const ID_TAB_MESSAGE_SPEC = 'addressMessageSpec';
const HTML_VERTEX_INFO_ID = 'vertexInfo';
const HTML_VERTEX_PROPERTIES_ID = 'vertexProperties';
const HTML_GROUP_BTN_DYNAMIC_DATASET = 'groupBtnDynamicDataSet';
const ATTR_DEL_CHECK_ALL = 'delCheckAll';
const ATTR_DEL_CHECK = 'delCheck';
const FOCUSED_CLASS = 'focused-object';

class CltGraph {
	constructor(props) {
		this.selector = props.selector;
		this.viewMode = {value: props.viewMode || VIEW_MODE.EDIT};
		this.history = new History();
		
		this.mandatoryDataElementConfig = props.mandatoryDataElementConfig // The configuration for Data element validation
		if (!this.mandatoryDataElementConfig) {
			this.mandatoryDataElementConfig = { 
				mandatoryEvaluationFunc: (dataElement) => { return false },
				colorWarning: '#ff8100',
				colorAvailable: '#5aabff'
			};
		}

		this.selectorName = this.selector.selector.replace(/[\.\#]/,'');

		this.graphContainerId = `graphContainer_${this.selectorName}`;
		this.graphSvgId = `graphSvg_${this.selectorName}`;
		this.connectSvgId = `connectSvg_${this.selectorName}`;

		this.jsonContainerId = 'json_container'
		this.textAreaContainerId = 'text_area_json_container'

		this.isShowReduced = false;

		this.mouseX = -1;
		this.mouseY = -1;

		this.initialize();
	}

	initialize() {

		this.objectUtils = new ObjectUtils();

		this.initSvgHtml();

		this.dataContainer = {
			vertex: [],
			boundary: [],
			edge: []
		};

		this.edgeMgmt = new EdgeMgmt({
			dataContainer: this.dataContainer,
			svgId: this.connectSvgId,
			vertexContainer: [
				this.dataContainer
			],
			history: this.history
		});

		this.vertexMgmt = new VertexMgmt({
			mainParent: this,
			dataContainer : this.dataContainer,
			containerId : this.graphContainerId,
			svgId : this.graphSvgId,
			viewMode: this.viewMode,
			connectSide: CONNECT_SIDE.BOTH,
			edgeMgmt : this.edgeMgmt,
			mandatoryDataElementConfig: this.mandatoryDataElementConfig,
			history: this.history
		});

		this.boundaryMgmt = new BoundaryMgmt({
			mainParent: this,
			dataContainer: this.dataContainer,
			containerId: this.graphContainerId,
			svgId: this.graphSvgId,
			viewMode: this.viewMode,
			vertexMgmt: this.vertexMgmt,
			edgeMgmt: this.edgeMgmt,
			history: this.history
		});


		this.initCustomFunctionD3();
		this.objectUtils.initListenerContainerScroll(this.graphContainerId, this.edgeMgmt, [this.dataContainer]);
		this.objectUtils.initListenerOnWindowResize(this.edgeMgmt, [this.dataContainer]);
		this.initOnMouseUpBackground();
		this.initShortcutKeyEvent();
		this.initVertexPopupHtml();
		this.bindEventForPopupVertex();
		this.initMenuContext();
		this.initVertexDefinition();
	}

	initVertexDefinition() {
		this.vertexGroup = { 
			"groupType":"DBJSON",
			"option":[ 
			
			],
			"dataElementFormat":{ 
				"dbcol":"",
				"dbcoldescription":"",
				"jsonfield":"",
				"jsonfielddescription":""
			},
			"dataElementText":{ 
				"dbcol":"DB Col",
				"dbcoldescription":"DB Col Description",
				"jsonfield":"JSON field",
				"jsonfielddescription":"JSON field description"
				
			},
			"vertexPresentation":{ 
				"key":"dbcol",
				"value":"jsonfield",
				"keyTooltip":"dbcoldescription",
				"valueTooltip":"jsonfielddescription",
				"keyPrefix":{ 
				"type":{ 
					"COMPONENT":"  "
				},
				"usage":{ 
					"C":"[C] ",
					"M":"[M] "
				}
				}
			},
			"elementDataType":{ 
				"dbcol":4,
				"dbcoldescription":4,
				"jsonfield":4,
				"jsonfielddescription":4
			}
			};
		
		this.vertexMgmt.vertexDefinition.vertexGroup.push(this.vertexGroup);
	}

	initSvgHtml() {
		const sHtml = 
		`<div id="${this.graphContainerId}" class="jsonGraphContainer" ref="${this.graphSvgId}">
        	<svg id="${this.graphSvgId}" class="svg"></svg>
	  	</div>
		<div id="${this.jsonContainerId}" class="jsonContainer">
			<textarea id="${this.textAreaContainerId}" class="jsonTextContainer"></textarea>
		</div>
      <svg id="${this.connectSvgId}" class="connect-svg"></svg>`

		this.selector.append(sHtml)
		this.initResizeEvent()
	}

	initVertexPopupHtml() {
		$(`#${HTML_VERTEX_INFO_ID}_${this.graphSvgId}`).remove();
		const sHtml = `
    <!-- Vertex Info Popup (S) -->
    <div id="${HTML_VERTEX_INFO_ID}_${this.graphSvgId}" class="modal fade" role="dialog" tabindex="-1">
      <div class="modal-dialog">
        <div class="web-dialog modal-content">
          <div class="dialog-title">
            <span class="title">DB JSON Info</span>
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
                        <input type="text" class="form-control" id="vertexName_${this.graphSvgId}" name="vertexName" onfocus="this.select();">
                      </td>
                    </tr>
                    <tr>
                      <th>Description</th>
                      <td class="full-width">
                        <textarea class="form-control" id="vertexDesc_${this.graphSvgId}" name="vertexDesc" rows="4" onfocus="this.select();"></textarea>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </form>
						<div class="dialog-button-top" id="${HTML_GROUP_BTN_DYNAMIC_DATASET}_${this.graphSvgId}">
							<div class="row" style="float:left;">
								<button id="vertexBtnDelete_${this.graphSvgId}" class="btn-etc">Delete</button>
							</div>
              <div class="row text-right">
                <button id="vertexBtnAdd_${this.graphSvgId}" class="btn-etc">Add</button>
              </div>
            </div>
            <form id="vertexForm_${this.graphSvgId}" action="#" method="post">
              <div class="dialog-search form-inline">
                <table class="fixed-headers vertex-properties" id="${HTML_VERTEX_PROPERTIES_ID}_${this.graphSvgId}" border="1"></table>
              </div>
            </form>
            <div class="dialog-button-top">
              <div class="row text-right">
                <button id="vertexBtnConfirm_${this.graphSvgId}" class="btn-etc">Confirm</button>
                <button id="vertexBtnCancel_${this.graphSvgId}" class="btn-etc">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Vertex Info Popup (E) -->`

		$($(`#${this.graphSvgId}`)[0].parentNode).append(sHtml)
	}

		/**
   * Make popup edit vertex info
   * @param vertex
   */
  makePopupEditVertex(vertex) {
	this.currentVertex = vertex;
	// Use in function updateVertexInfo()
	const {name, description, data, groupType} = vertex;

	// Get vertex group with group type

	this.vertexGroup = this.vertexMgmt.vertexDefinition.vertexGroup[0];
	this.currentVertex.groupType = groupType;

	// Append content to popup
	$(`#${HTML_VERTEX_INFO_ID}_${this.graphSvgId} #vertexName_${this.graphSvgId}`).val(name);
	$(`#${HTML_VERTEX_INFO_ID}_${this.graphSvgId} #vertexDesc_${this.graphSvgId}`).val(description);

	// Generate properties vertex
	const columnTitle = Object.keys(this.vertexGroup.dataElementFormat);
	const columnText = this.vertexGroup.dataElementText;
	const cols = columnTitle.length;
	const rows = data.length;
	const dataType = this.vertexGroup.elementDataType;

	// Store column width for table data
	const arrColumnWidth = [];

	const $table = $(`#${HTML_VERTEX_INFO_ID}_${this.graphSvgId} #${HTML_VERTEX_PROPERTIES_ID}_${this.graphSvgId}`).empty();
	const $contentHeader = $('<thead>');
	// Generate header table
	const $headerRow = $('<tr>');
	let $popWidth = 0;
	for (let i = 0; i < cols; i++) {
		const $colHdr = $('<th>').text(this.capitalizeFirstLetter(columnText[columnTitle[i]]));
		$colHdr.attr('class', 'col_header');
		$colHdr.appendTo($headerRow);

		// Init col in col group
		const prop = columnTitle[i];
		const type = dataType[prop];
		const value = this.vertexGroup.dataElementFormat[prop];
		const width = this.findLongestContent({data, prop, type, value});
		$popWidth += width;
		arrColumnWidth.push(width);
	}

	// Prepend col group del check
	arrColumnWidth.splice(0, 0, POPUP_CONFIG.WIDTH_COL_DEL_CHECK);

	const $colHdr = this.initCellDelCheck({
		'className': 'col_header',
		'name': `${ATTR_DEL_CHECK_ALL}_${this.graphSvgId}`,
		'checked': false,
		'colType': '<th>',
		'isCheckAll': true,
	});

		$colHdr.prependTo($headerRow);

		$headerRow.appendTo($contentHeader);
		$contentHeader.appendTo($table);

		// Generate content table
		const $contentBody = $('<tbody>');
		for (let i = 0; i < rows; i++) {
			const dataRow = data[i];
			const $row = $('<tr>');
			for (let j = 0; j < cols; j++) {
				const prop = columnTitle[j];
				const type = dataType[prop];
				const val = dataRow[prop];
				let opt = [];

				const $col = $('<td>');
				// Get option if type is array
				if (type === VERTEX_FORMAT_TYPE.ARRAY) {
					opt = this.vertexGroup.dataElementFormat[prop];
				} else if (type === VERTEX_FORMAT_TYPE.BOOLEAN) {
					$col.attr('class', 'checkbox_center');
				}

				const $control = this.generateControlByType({i, type, val, prop, opt, groupType});
				$control.appendTo($col);
				$col.appendTo($row);
			}

			// Append del check to row
			const $col = this.initCellDelCheck({
				'className': 'checkbox_center',
				'name': `${ATTR_DEL_CHECK}_${this.graphSvgId}` ,
				'checked': false,
				'colType': '<td>'
			});
	
			$col.prependTo($row);

			$row.appendTo($contentBody);
		}

		$contentBody.appendTo($table);

		// Set column with for table data
		for(let i = 0; i < arrColumnWidth.length; i += 1) {
			if (i === arrColumnWidth.length - 1) {
				$(`.fixed-headers th:nth-child(${i+1}),td:nth-child(${i+1})`).css('width', '100%');
			} else {
				$(`.fixed-headers th:nth-child(${i+1}),td:nth-child(${i+1})`).css('min-width', arrColumnWidth[i]);
			}
		}

		hideFileChooser();

		const options = {
			popupId: `${HTML_VERTEX_INFO_ID}_${this.graphSvgId}`,
			position: 'center',
			width: $popWidth + POPUP_CONFIG.PADDING_CHAR + 45
		}

		PopUtils.metSetShowPopup(options);
		
		$(`#${HTML_VERTEX_PROPERTIES_ID}_${this.graphSvgId}`).find('tbody').sortable();
	}

	bindEventForPopupVertex() {
		const main = this;
    
		$(`#${HTML_VERTEX_INFO_ID}_${this.graphSvgId} #vertexBtnConfirm_${main.graphSvgId}`).click(() => {
			this.confirmEditVertexInfo();
		});

		$(`#${HTML_VERTEX_INFO_ID}_${this.graphSvgId} #vertexBtnAdd_${main.graphSvgId}`).click(() => {
			this.addDataElement();
		});

		$(`#${HTML_VERTEX_INFO_ID}_${this.graphSvgId} #vertexBtnDelete_${main.graphSvgId}`).click(() => {
			this.removeDataElement();
		});

		$(`#${HTML_VERTEX_INFO_ID}_${this.graphSvgId} #vertexBtnCancel_${main.graphSvgId}`).click(() => {
			this.closePopVertexInfo();
			this.currentVertex = null;
		});

		// Prevent refresh page after pressing enter on form control (Edit popup)
		$('form').submit(function() { return false; });
		
    // this.initDialogDragEvent();
    initDialogDragEvent(`${HTML_VERTEX_INFO_ID}_${this.graphSvgId}`);
	}

	addDataElement() {
		const groupType = this.currentVertex.groupType;
		const columnTitle = Object.keys(this.vertexGroup.dataElementFormat);
		const cols = columnTitle.length;
		const dataType = this.vertexGroup.elementDataType;
		const $appendTo = $(`#${HTML_VERTEX_PROPERTIES_ID}_${this.graphSvgId} > tbody`);

		const $row = $('<tr>');
		for (let j = 0; j < cols; j++) {
			const prop = columnTitle[j];
			const type = dataType[prop];
			// let val = dataRow[prop];
			let opt = []

			const $col = $('<td>');
			// Get option if type is array
			if (type === VERTEX_FORMAT_TYPE.ARRAY) {
				opt = this.vertexGroup.dataElementFormat[prop];
			} else if (type === VERTEX_FORMAT_TYPE.BOOLEAN) {
				$col.attr('class', 'checkbox_center');
			}

			const $control = this.generateControlByType({'i': j, type, prop, opt, groupType});
			$control.appendTo($col);
			$col.appendTo($row);
		}

		// Append del check to row
		const $col = this.initCellDelCheck({
			'className': 'checkbox_center',
			'name': `${ATTR_DEL_CHECK}_${this.graphSvgId}`,
			'checked': false,
			'colType': '<td>'
    });
    
		$col.prependTo($row)

		$row.appendTo($appendTo);

		// Set column with for table data
		let columnHeaderCount = 0;
		$(`.fixed-headers thead tr th`).each(function () {
			columnHeaderCount += 1;

			if ($(this).css('display') !== 'none') {
				$(`.fixed-headers td:nth-child(${columnHeaderCount})`).css('min-width', parseInt($(this).css('min-width').replace('px','')));
			}
		});

		$(`.fixed-headers td:nth-child(${columnHeaderCount})`).css('width', '100%');
	}

	removeDataElement() {
		$(`#${HTML_VERTEX_PROPERTIES_ID}_${this.graphSvgId} > tbody`).find(`input[name=${ATTR_DEL_CHECK}_${this.graphSvgId}]`).each(function () {
			if ($(this).is(':checked')) {
				$(this).parents('tr').remove();
			}
		})

		// Uncheck all
		$(`#${ATTR_DEL_CHECK_ALL}_${this.graphSvgId}`).prop('checked', false);
	}

	/**
   * Close popup edit vertex info
   */
	closePopVertexInfo() {
		const options = {popupId: `${HTML_VERTEX_INFO_ID}_${this.graphSvgId}`};
		PopUtils.metClosePopup(options);
	}

	/**
   * Get data vertex change
   */
	confirmEditVertexInfo() {
		if ($(`#${HTML_VERTEX_INFO_ID}_${this.graphSvgId} #vertexName_${this.graphSvgId}`).val() === '') {
			comShowMessage('Please enter Name.');
			$(`#vertexName_${this.graphSvgId}`).focus();
			return;
		}
		
		if (!this.validateDataElementTable()) return;

		let oldObject = null;
		if (this.currentVertex.id) {
			oldObject = this.currentVertex.getObjectInfo();
		}

		// Get data on form
		this.currentVertex.name = this.currentVertex.vertexType = $(`#${HTML_VERTEX_INFO_ID}_${this.graphSvgId} #vertexName_${this.graphSvgId}`).val();
		this.currentVertex.description = $(`#${HTML_VERTEX_INFO_ID}_${this.graphSvgId} #vertexDesc_${this.graphSvgId}`).val();
		const groupType = this.currentVertex.groupType;
		const dataType = this.vertexGroup.elementDataType;

		const elements = [];
		// Get data element
		$(`#${HTML_VERTEX_INFO_ID}_${this.graphSvgId} #${HTML_VERTEX_PROPERTIES_ID}_${this.graphSvgId}`).find('tr').each(function () {
			const row = {};
			$(this).find('td input:text, td input:checkbox, td select').each(function () {
				const prop = $(this).attr('name');
				const type = dataType[prop];
				if (prop != `${ATTR_DEL_CHECK}_${this.graphSvgId}`);
					row[prop] = type === VERTEX_FORMAT_TYPE.BOOLEAN ? ($(this).is(':checked') ? true : false) : this.value;
			})
			elements.push(row);
		})

		// Remove first row (header table)
		elements.shift();

		this.currentVertex.data = elements;
		this.currentVertex.groupType = groupType;

		// update
		if (this.currentVertex.id) {
			this.updateVertexInfo(this.currentVertex);

			if (this.history) {
				const state = new State();
				const he = new HistoryElement();
				he.actionType = ACTION_TYPE.UPDATE_INFO;
				he.oldObject = oldObject;
				he.dataObject = this.currentVertex.getObjectInfo();
				he.realObject = this.currentVertex;
				state.add(he);
				this.history.add(state);
			}

		} else {
			//Create New
			this.currentVertex.isCreateNewSegment = true;
			this.currentVertex.isShowReduced = this.isShowReduced;
			this.createVertex(this.currentVertex);
		}

		this.closePopVertexInfo();
	}

	validateDataElementTable() {
		const $tr = $(`#${HTML_VERTEX_PROPERTIES_ID}_${this.svgId}`).find('tr');

		const rowCount = $tr.length;

		if (rowCount <= 1) return true;

		for(let i = 1; i < rowCount; i++) {
			const $name = $($tr[i]).find('td input:text[name=\'name\']');
			if ($name.val() == '') {
				comShowMessage('Enter name.');
				$name.focus();
				return false;
			}
		}
		
		return true;
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
					$(`#${ATTR_DEL_CHECK_ALL}_${main.svgId}`).prop('checked',
						($(this).closest('table').find(`tbody :checkbox[name=${ATTR_DEL_CHECK}_${main.svgId}]:checked`).length ==
              $(this).closest('table').find(`tbody :checkbox[name=${ATTR_DEL_CHECK}_${main.svgId}]`).length));
				}
			})
		$chk.appendTo($col);

		return $col;
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
		})
	}

		/**
   * Generate control with options
   * @param options
   * @returns {*}
   */
  	generateControlByType(options) {
		let $control = null;
		const { type, val, prop, opt } = options;
		const defaultVal = this.vertexGroup.dataElementFormat[prop];
		
		switch (type) {
		case VERTEX_FORMAT_TYPE.BOOLEAN:
			$control = $('<input>');
			$control.attr('type', 'checkbox');
			$control.attr('name', `${prop}`);
			$control.prop('checked', typeof(val) == 'boolean' ? val : defaultVal);
			$control.attr('value', val);
			break
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
			break
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

	initResizeEvent() {
		const graphContainer = $(`#${this.graphContainerId}`);
		const jsonContainer = $(`#${this.jsonContainerId}`);
		graphContainer.resizable( {"minWidth" : 300, maxWidth : $('body').width() - 300, handles : 'e'} );

		const resizeBar = graphContainer.find('.ui-resizable-e');
		resizeBar.css('left', `${graphContainer.width()}px`);

		graphContainer.resize(function(){
			jsonContainer.css('left', `${graphContainer.width()}px`);
			jsonContainer.css('width', `calc(100% - ${graphContainer.width()}px)`);
			resizeBar.css('left', `${graphContainer.width()}px`);
		});

		$( window ).resize(function() {
			const left = parseInt(resizeBar.css('left').replace('px', ''));
			const maxWidth = $('body').width() - 300;
			if (left < 300) {
				resizeBar.css('left', `${left}px`);
				graphContainer.css('width', `${left}px`);
				jsonContainer.css('width', `calc(100% - ${graphContainer.width()}px)`);
			} else if (left > maxWidth) {
				resizeBar.css('left', `${maxWidth}px`);
				graphContainer.css('width', `${maxWidth}px`);
				jsonContainer.css('width', `calc(100% - ${graphContainer.width()}px)`);
			}
			graphContainer.resizable( "option", "maxWidth", maxWidth );
		});
	}

	initCustomFunctionD3() {
		/**
     * Move DOM element to front of others
     */
		d3.selection.prototype.moveToFront = function () {
			return this.each(function () {
				this.parentNode.appendChild(this);
			})
		}

		/**
     * Move DOM element to back of others
     */
		d3.selection.prototype.moveToBack = function () {
			this.each(function () {
				this.parentNode.firstChild && this.parentNode.insertBefore(this, this.parentNode.firstChild);
			})
		}
	}

	initMenuContext() {
		new MainMenu({
			selector: `#${this.graphSvgId}`,
			containerId: `#${this.graphContainerId}`,
			parent: this,
			vertexDefinition: this.vertexMgmt.vertexDefinition,
			viewMode: this.viewMode,
			history: this.history
		});
	}

	initShortcutKeyEvent() {
		// Prevent Ctrl+F on brownser
		window.addEventListener("keydown",function (e) {
			if (e.keyCode === 114 || (e.ctrlKey && e.keyCode === 70)) {
					e.preventDefault();
			}
		});

		// capture mouse point for creating menu by Ctrl+F
		$(`#${this.graphSvgId}`).mousemove( (e) => {
			this.mouseX = e.pageX;
			this.mouseY = e.pageY;
		});

		// Create menu by Ctrl+F
		$(window).keyup((e) => {
			if (isPopupOpen()) return;

      if ((e.keyCode == 70 || e.keyCode == 102)  && e.ctrlKey) {
				// Ctrl + F
				$(`#${this.graphContainerId}`).contextMenu({x:this.mouseX, y: this.mouseY});
				$('.context-menu-root input').focus();
				
      } else if ((e.keyCode == 67 || e.keyCode == 99)  && e.ctrlKey) {
				// Ctrl+C
				const $focusedObject = $(`#${this.graphSvgId} .${FOCUSED_CLASS}`);

				if ($focusedObject.length > 0) {
					const id = $focusedObject[0].id;

					let object = null;
					if (id.substr(0,1) === OBJECT_TYPE.VERTEX) {
						object = _.find(this.dataContainer.vertex, {"id": id});
						object.copy();
					} else {
						object = _.find(this.dataContainer.boundary, {"id": id});
						object.copyAll();
					}
				}
			} else if (e.keyCode == 46) {
				// Delete key
				const $focusedObject = $(`#${this.graphSvgId} .${FOCUSED_CLASS}`);

				if ($focusedObject.length > 0) {
					const id = $focusedObject[0].id;

					let object = null;
					if (id.substr(0,1) === OBJECT_TYPE.VERTEX) {
						object = _.find(this.dataContainer.vertex, {"id": id});
						object.remove();
					} else {
						object = _.find(this.dataContainer.boundary, {"id": id});
						object.deleteAll();
					}
				}
			} else if ((e.keyCode == 90 || e.keyCode == 122)  && e.ctrlKey) {
				// Ctrl + Z
				this.history.undo();
			} else if ((e.keyCode == 89 || e.keyCode == 121)  && e.ctrlKey) {
				// Ctrl + Y
				this.history.redo();
			}
		});
		
		
	}

	createVertex(opt) {
		this.vertexMgmt.create(opt);
	}

	createBoundary(opt) {
		this.boundaryMgmt.create(opt)
	}

	/**
   * Clear all element on graph
   * And reinit marker def
   */
	clearAll(state) {
		const oldDataContainer = {
			vertex: filterPropertyData(this.dataContainer.vertex, [], ['dataContainer']),
			boundary: filterPropertyData(this.dataContainer.boundary, [], ['dataContainer'])
		}

		this.vertexMgmt.clearAll();
		this.boundaryMgmt.clearAll();

		if (state) {
			let he = new HistoryElement();
			he.actionType = ACTION_TYPE.CLEAR_ALL_VERTEX_BOUNDARY;
			he.dataObject = oldDataContainer;
			he.realObject = this;
			state.add(he);
		}

		setSizeGraph({ width: DEFAULT_CONFIG_GRAPH.MIN_WIDTH, height: DEFAULT_CONFIG_GRAPH.MIN_HEIGHT }, this.graphSvgId);
	}

	showReduced() {
		const state = new State();

		this.isShowReduced = true;
		this.objectUtils.showReduced(this.dataContainer, this.graphSvgId, this.viewMode.value, state);

		if (this.history) {
			const he = new HistoryElement();
			he.actionType = ACTION_TYPE.UPDATE_SHOW_REDUCED_STATUS;
			he.realObject = this;
			state.add(he);
			this.history.add(state);
		}
	}

	showFull() {
		const state = new State();
		
		this.isShowReduced = false;
		this.objectUtils.showFull(this.dataContainer, this.graphSvgId, this.viewMode.value, state);

		if (this.history) {
			const he = new HistoryElement();
			he.actionType = ACTION_TYPE.UPDATE_SHOW_FULL_STATUS;
			he.realObject = this;
			state.add(he);
			this.history.add(state);
		}
	}

	drawObjects(data) {
    const { boundary: boundaries, vertex: vertices, position, edge } = data;
    
		// Draw boundary
		boundaries.forEach(e => {
			const { x, y } = position.find(pos => {
				return pos.id === e.id;
			});

			e.x = x;
			e.y = y;
			this.boundaryMgmt.create(e);
		})
		// Draw vertex
		vertices.forEach(e => {
			const { x, y } = position.find(pos => {
				return pos.id === e.id;
			});

			e.x = x;
			e.y = y;
			this.vertexMgmt.create(e);
		})

		edge.forEach(e =>{ 
			this.edgeMgmt.create(e);
		})
    
		if (this.dataContainer.boundary && this.dataContainer.boundary.length > 0) {
			this.objectUtils.setAllChildrenToShow(this.dataContainer);
			if (this.dataContainer.boundary.length > 0)
        this.objectUtils.updateHeightBoundary(this.dataContainer);
		}
	}

	loadGraphData(graphData, fileName) {
		const resMessage = this.validateGraphDataStructure(graphData);

		if(resMessage.type !== 'ok') {
			comShowMessage(resMessage.message);

			if(resMessage.type === 'error'){
				return;
			}
		}

		if (this.history) {
			this.history.clear();
		}

		//clear data
		this.clearAll();
		this.edgeMgmt.clearAll();

		//Reload Vertex Define and draw graph
		const {vertexTypes} = graphData;
		this.vertexMgmt.processDataVertexTypeDefine(vertexTypes);
		this.drawObjects(graphData);
		this.isShowReduced = false;
		this.initMenuContext();
		
		this.validateConnectionByUsage();

		//Solve in case of save and import from different window size
		this.objectUtils.updatePathConnectOnWindowResize(this.edgeMgmt, [this.dataContainer]);

		//Solve in case of save and import from different scroll position
		this.objectUtils.onContainerSvgScroll(this.graphSvgId, this.edgeMgmt, [this.dataContainer]);

		setMinBoundaryGraph(this.dataContainer,this.graphSvgId, this.viewMode.value);

		setAddressTabName(ID_TAB_MESSAGE_SPEC, fileName);
		this.showFileNameOnApplicationTitleBar();

		hideFileChooser();
	}

	save(fileName) {
		if (!fileName) {
			comShowMessage('Please input file name');
			return;
		}

		this.getContentGraphAsJson().then(content => {
			if (!content) {
				comShowMessage('No content to export');
				return;
			}
			// stringify with tabs inserted at each level
			const graph = JSON.stringify(content, null, '\t');
			const blob = new Blob([graph], {type: 'application/json', charset: 'utf-8'});

			if (navigator.msSaveBlob) {
				navigator.msSaveBlob(blob, fileName);
				return;
			}

			const fileUrl = window.URL.createObjectURL(blob);
			const downLink = $('<a>');
			downLink.attr('download', `${fileName}.gds`);
			downLink.attr('href', fileUrl);
			downLink.css('display', 'none');
			$('body').append(downLink);
			downLink[0].click();
			downLink.remove();

			hideFileChooser();
			
		}).catch(err => {
			comShowMessage(err);
		})
	}

	LoadVertexDefinition(vertexDefinitionData, fileName) {
		if (this.vertexMgmt.LoadVertexDefinition(vertexDefinitionData)) {
			this.initMenuContext();

			setAddressTabName(ID_TAB_SEGMENT_SET, fileName);
			this.showFileNameOnApplicationTitleBar();

			hideFileChooser();
		}
	}

	/**
   * Validate Graph Data Structure
   * with embedded vertex type
   * Validate content
   */
	validateGraphDataStructure(data) {
		//Validate data exists
		if(data===undefined)
		{
			console.log('Data does not exist');
			return {
				type: 'error',
				message: 'Empty data.'
			}
		}

		// Validate struct data
    if (!data.vertex || !data.boundary || !data.position || !data.vertexTypes 
      || (Object.keys(data.vertexTypes).length === 0 && data.vertexTypes.constructor === Object)) {
			return {
				type: 'error',
				message: 'Message Spec is corrupted. You should check it!'
			}
		}

		// Validate embedded vertex type with vertices
		const dataTypes = data.vertexTypes['VERTEX'];
		const vertices = removeDuplicates(data.vertex, 'vertexType');
		const types = this.getListVertexType(dataTypes);
		for (const vertex of vertices) {
			const type = vertex.vertexType;
			// If vertex type not exit in embedded vertex type
			if (types.indexOf(type) < 0) {
				console.log('Vertex type not exits in embedded vertex type');
				return {
					type: 'warning',
					message: 'Vertex type not exits in embedded vertex type'
				}
			}

			// Validate data key between embedded vertex and vetex in graph.
			const dataSource = vertex.data;
			const dataTarget = _.find(dataTypes, {'vertexType': type});
			const keySource = Object.keys(dataSource[0] || {});
			const keyTarget = Object.keys(dataTarget.data[0] || {});

			// Check length key
			if (checkLengthMisMatch(keySource, keyTarget)) {
				console.log('Data\'s length is different');
				return {
					type: 'warning',
					message: 'Data\'s length is different'
				}
			}

			// Check mismatch key
			const flag = checkKeyMisMatch(keySource, keyTarget);

			if (flag) {
				console.log('Key vertex at source not exit in target');
				return {
					type: 'warning',
					message: 'Key vertex at source not exit in target'
				}
			}
		}

		return {
			type: 'ok',
			message: ''
		}
	}

	/**
   * get list vertex type of graph
   * @param array data
   * @returns {*}
   */
	getListVertexType(data) {
		const types = [];
		const len = data.length;
		for (let i = 0; i < len; i += 1) {
			const type = data[i];
			types.push(type.vertexType);
		}

		return types;
	}

	getContentGraphAsJson() {
		const dataContent = {vertex: [], boundary: [],position: [], edge:[], vertexTypes: {}};

		if (this.isEmptyContainerData(this.dataContainer)) {
			return Promise.reject('There is no Input data. Please import!');
		} 

		// Process data to export
		// Need clone data cause case user export
		// later continue edit then lost parent scope
		// Purpose prevent reference data.

		//Vertex and Boundary data
		const cloneData = {
			vertex: filterPropertyData(this.dataContainer.vertex, [], ['dataContainer']),
			boundary: filterPropertyData(this.dataContainer.boundary, [], ['dataContainer']),
			edge: filterPropertyData(this.dataContainer.edge, [], ['dataContainer']),
		}
		cloneData.vertex.forEach(vertex => {
			const pos = new Object({
				'id': vertex.id,
				'x': vertex.x,
				'y': vertex.y
			});

			dataContent.vertex.push(this.getSaveDataVertex(vertex));
			dataContent.position.push(pos);
		})

		cloneData.boundary.forEach(boundary => {
			const pos = new Object({
				'id': boundary.id,
				'x': boundary.x,
				'y': boundary.y
			});

			dataContent.boundary.push(this.getSaveDataBoundary(boundary));
			dataContent.position.push(pos);
		})

		const cloneVertexDefine = _.cloneDeep(this.vertexMgmt.vertexDefinition);
		let vertexDefine = {};
		if(cloneVertexDefine.vertexGroup) {
			vertexDefine = {
				'VERTEX_GROUP': this.getSaveVertexGroup(cloneVertexDefine.vertexGroup),
				'VERTEX': cloneVertexDefine.vertex
			}
		}
		dataContent.vertexTypes = vertexDefine;

		//Edges    
		cloneData.edge.forEach(edge => {
			dataContent.edge.push(this.getSaveDataEdge(edge));
		})

		return Promise.resolve(dataContent);
	}

	/**
   * Filter properties that need to save
   * @param {*} vertexGroup 
   */
	getSaveVertexGroup(vertexGroup) {
		const resObj = [];

		vertexGroup.forEach(group => {
			const tmpGroup = {};

			tmpGroup.groupType = group.groupType;
			tmpGroup.option = group.option;
			tmpGroup.dataElementFormat = group.dataElementFormat;
			tmpGroup.vertexPresentation = group.vertexPresentation;

			resObj.push(tmpGroup);
		})
    
		return resObj;
	}

	/**
   * Filter properties that need to save
   * @param {*} boundary 
   */
	getSaveDataBoundary(boundary) {
		return {
			name: boundary.name,
			description: boundary.description,
			member: boundary.member,
			id: boundary.id,
			width: boundary.width,
			height: boundary.height,
			parent: boundary.parent,
			mandatory: boundary.mandatory,
			repeat: boundary.repeat
		}
	}

	/**
   * Filter properties that need to save
   * @param {*} vertex 
   */
	getSaveDataVertex(vertex) {
		return {
			vertexType: vertex.vertexType,
			name: vertex.name,
			description: vertex.description,
			data: vertex.data,
			id: vertex.id,
			groupType: vertex.groupType,
			parent: vertex.parent,
			mandatory: vertex.mandatory,
			repeat: vertex.repeat
		}
	}

	/**
   * Filter properties that need to save
   * @param {*} edge 
   */
	getSaveDataEdge(edge) {
		return {
			id: edge.id,
			source: edge.source,
			target: edge.target,
			note: {
				originNote: edge.originNote,
				middleNote: edge.middleNote,
				destNote: edge.destNote
			},
			style:{
				line: edge.lineType,
				arrow: edge.useMarker
			}
		}
	}

	isEmptyContainerData(containerData) {
		return (containerData.vertex.length == 0 && containerData.boundary.length == 0);
	}

	/**
   * If loading from another svgId, then correct by curent svgId
   */
	edgeVerifySvgId(edges) {
		if (edges.length > 0) {
			const oldSvgId = edges[0].source.svgId;
			const index = edges[0].source.svgId.indexOf('_');
			const oldSelectorName = oldSvgId.substring(index + 1, oldSvgId.length);

			if (oldSelectorName != this.selectorName) {
				edges.forEach(e => {
					e.source.svgId = e.source.svgId.replace(oldSelectorName, this.selectorName);
					e.target.svgId = e.target.svgId.replace(oldSelectorName, this.selectorName);
				});
			}
		}
	}

	setViewMode(viewMode = VIEW_MODE.EDIT) {
		this.viewMode.value = viewMode;
	}

	initOnMouseUpBackground() {
		let selector = this.selector.prop('id');

		if (selector == '') {
			selector = `.${this.selector.prop('class')}`;
		}else{
			selector = `#${selector}`;
		}
    
		const tmpEdgeMgmt = this.edgeMgmt
		d3.select(selector).on('mouseup', function() {
			const mouse = d3.mouse(this);
			const elem = document.elementFromPoint(mouse[0], mouse[1]);

			//disable selecting effect if edge is selecting
			if((!elem || !elem.tagName || elem.tagName != 'path') && tmpEdgeMgmt.isSelectingEdge()) {
				tmpEdgeMgmt.cancleSelectedPath();
			}
		})
	}
	
	/**
	 * 
	 */
	validateConnectionByUsage() {
		const lstRootBoundary = [];
		this.dataContainer.boundary.forEach(b => {
			if (!b.parent) lstRootBoundary.push(b);
		});

		const lstNoneParentVertex = [];
		this.dataContainer.vertex.forEach(v => {
			if (!v.parent) lstNoneParentVertex.push(v);
		})

		lstRootBoundary.forEach(b => {
			b.validateConnectionByUsage();
		})

		lstNoneParentVertex.forEach(item => {
			item.validateConnectionByUsage();
		})
	}

	showFileNameOnApplicationTitleBar() {
		const segmentSetFileName = $(`#${ID_TAB_SEGMENT_SET}`).attr('title');
		const messageSpecFileName = $(`#${ID_TAB_MESSAGE_SPEC}`).attr('title');

		const applicationTitle = 'Message Spec Editor';
		let fileNameList = '';
		if (segmentSetFileName !== undefined && segmentSetFileName !== '') {
			if (fileNameList !== '') {
				fileNameList += ` - ${segmentSetFileName}`;
			} else {
				fileNameList += `${segmentSetFileName}`;
			}
		}

		if (messageSpecFileName !== undefined && messageSpecFileName !== '') {
			if (fileNameList !== '') {
				fileNameList += ` - ${messageSpecFileName}`;
			} else {
				fileNameList += `${messageSpecFileName}`;
			}
		}

		$('head title').text(`${applicationTitle} | ${fileNameList} |`);
	}

	restore(dataContainer) {
		const { boundary: boundaries, vertex: vertices} = dataContainer;
		// Draw boundary
		boundaries.forEach(e => {
			this.boundaryMgmt.create(e);
		})
		// Draw vertex
		vertices.forEach(e => {
			this.vertexMgmt.create(e);
		})

		setMinBoundaryGraph(this.dataContainer, this.graphSvgId, this.viewMode.value);
	}
}
  
export default CltGraph;
