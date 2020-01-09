import * as d3 from 'd3';
import _ from 'lodash';
import InputMgmt from './input-mgmt/input-mgmt';
import OutputMgmt from './output-mgmt/output-mgmt';
import OperationsMgmt from './operations-mgmt/operations-mgmt';
import ConnectMgmt from './connect-mgmt/connect-mgmt';
import ObjectUtils from '../../common/utilities/object.util';
const ScannerWriterFactory = require('./generation-lib/scanner_writer/scanner_writer_factory');
const MessageSpecReader = require('./generation-lib/message_spec/message_spec_reader');
const MapperWriter = require('./generation-lib/mapper_writer/mapper_writer');
import History from '../../common/new-type-define/history';

import {
	comShowMessage,
	setMinBoundaryGraph,
	setAddressTabName,
	unsetAddressTabName,
	hideFileChooser,
	filterPropertyData,
	isPopupOpen,
  checkKeyMisMatch,
  checkLengthMisMatch,
  removeDuplicates
} from '../../common/utilities/common.util';

import { 
	VERTEX_ATTR_SIZE, BOUNDARY_ATTR_SIZE, CONNECT_TYPE, ACTION_TYPE, OBJECT_TYPE
} from '../../common/const/index';

import State from '../../common/new-type-define/state';
import HistoryElement from '../../common/new-type-define/historyElement';

const ID_TAB_INPUT_MESSAGE = 'addressInputMessage';
const ID_TAB_OUTPUT_MESSAGE = 'addressOutputMessage';
const ID_TAB_MESSAGE_MAPPING_DEFINITION = 'addressMessageMappingDefinition';

class CltMessageMapping {
	constructor(props) {
		this.selector = props.selector;
		this.selectorName = this.selector.selector.replace(/[\.\#]/,'');

		this.inputMessageContainerId = `inputMessageContainer_${this.selectorName}`;
		this.inputMessageSvgId = `inputMessageSvg_${this.selectorName}`;
		this.outputMessageContainerId = `outputMessageContainer_${this.selectorName}`;
		this.outputMessageSvgId = `outputMessageSvg_${this.selectorName}`;
		this.operationsContainerId = `operationsContainer_${this.selectorName}`;
		this.operationsSvgId = `operationsSvg_${this.selectorName}`;
		this.connectSvgId = `connectSvg_${this.selectorName}`;
		
		this.mandatoryDataElementConfig = props.mandatoryDataElementConfig;
		if (!this.mandatoryDataElementConfig) {
			this.mandatoryDataElementConfig = {
				mandatoryEvaluationFunc: (dataElement) => { return false },
				colorWarning: '#ff8100',
				colorAvailable: '#5aabff'
			}
		}
		
		this.initialize();
	}

	initialize() {

		this.objectUtils = new ObjectUtils();
		this.history = new History();
		this.initSvgHtml();
		this.storeConnect = {
			edge: [],
		}
		this.storeInputMessage = {
			vertex: [],
			boundary: [],
		}
		this.storeOperations = {
			vertex: [],
			boundary: [],
		}
		this.storeOutputMessage = {
			vertex: [],
			boundary: [],
		}

		this.connectMgmt = new ConnectMgmt({
			mainSelector: this.selector,
			svgId: this.connectSvgId,
			dataContainer: this.storeConnect,
			storeInputMessage: this.storeInputMessage,
			storeOperations: this.storeOperations,
			storeOutputMessage: this.storeOutputMessage,
			history: this.history

		});

		this.inputMgmt = new InputMgmt({
			mainSelector: this.selector,
			containerId: this.inputMessageContainerId,
			svgId: this.inputMessageSvgId,
			edgeMgmt: this.connectMgmt.edgeMgmt,
			dataContainer: this.storeInputMessage,
			history: this.history
		});

		this.outputMgmt = new OutputMgmt({
			mainSelector: this.selector,
			containerId: this.outputMessageContainerId,
			svgId: this.outputMessageSvgId,
			edgeMgmt: this.connectMgmt.edgeMgmt,
			dataContainer: this.storeOutputMessage,
			mandatoryDataElementConfig: this.mandatoryDataElementConfig,
			history: this.history
		});

		this.operationsMgmt = new OperationsMgmt({
			mainSelector: this.selector,
			containerId: this.operationsContainerId,
			svgId: this.operationsSvgId,
			edgeMgmt: this.connectMgmt.edgeMgmt,
			dataContainer: this.storeOperations,
			parent: this,
			history: this.history
		});

		this.initCustomFunctionD3();
		this.objectUtils.initListenerContainerScroll(this.inputMessageContainerId, this.connectMgmt.edgeMgmt, [this.storeInputMessage, this.storeOperations, this.storeOutputMessage]);
		this.objectUtils.initListenerContainerScroll(this.operationsContainerId, this.connectMgmt.edgeMgmt, [this.storeInputMessage, this.storeOperations, this.storeOutputMessage]);
		this.objectUtils.initListenerContainerScroll(this.outputMessageContainerId, this.connectMgmt.edgeMgmt, [this.storeInputMessage, this.storeOperations, this.storeOutputMessage]);
		this.initListenerOnWindowResize();
		this.initOnMouseUpBackground();

		// Prevent Ctrl+F on brownser
		window.addEventListener("keydown",function (e) {
			if (e.keyCode === 114 || (e.ctrlKey && e.keyCode === 70)) { 
					e.preventDefault();
			}
		});

		// capture mouse point for creating menu by Ctrl+F
		$(window).mousemove( (e) => {
			this.inputMgmt.setWindowMousePoint(e.pageX, e.pageY);
			this.operationsMgmt.setWindowMousePoint(e.pageX, e.pageY);
			this.outputMgmt.setWindowMousePoint(e.pageX, e.pageY);
		});

		this.initShortcutKeyEvent();
	}

	initSvgHtml() {
		const sHtml = 
    `<!-- Address bar (S) -->
		<div id="addressBar" class="filename-bar">
			<div id="${ID_TAB_MESSAGE_MAPPING_DEFINITION}" class="filename-tab tab-left" style="display: none"></div>
			<div id="${ID_TAB_INPUT_MESSAGE}" class="filename-tab tab-left" style="display: none"></div>
			<div id="${ID_TAB_OUTPUT_MESSAGE}" class="filename-tab tab-right" style="display: none"></div>
			
		</div>
		<!-- Address bar (E) -->

		<div id="${this.inputMessageContainerId}" class="left-svg container-svg" ref="${this.inputMessageSvgId}">
        <svg id="${this.inputMessageSvgId}" class="svg"></svg>
      </div>
      <div id="${this.operationsContainerId}" class="middle-svg container-svg" ref="${this.operationsSvgId}">
        <svg id="${this.operationsSvgId}" class="svg"></svg>
      </div>
      <div id="${this.outputMessageContainerId}" class="right-svg container-svg" ref="${this.outputMessageSvgId}">
        <svg id="${this.outputMessageSvgId}" class="svg"></svg>
      </div>
      <svg id="${this.connectSvgId}" class="connect-svg"></svg>`;

		this.selector.append(sHtml);
	}

	initShortcutKeyEvent() {
		$(window).keyup((e) => {
			if (isPopupOpen()) return;
			
      if ((e.keyCode == 90 || e.keyCode == 122)  && e.ctrlKey) {
				// Ctrl + Z
				this.history.undo();
      } else if ((e.keyCode == 89 || e.keyCode == 121)  && e.ctrlKey) {
				// Ctrl + Y
				this.history.redo();
      }
  	});
	}

	initCustomFunctionD3() {
		/**
     * Move DOM element to front of others
     */
		d3.selection.prototype.moveToFront = function () {
			return this.each(function () {
				this.parentNode.appendChild(this);
			});
		}

		/**
     * Move DOM element to back of others
     */
		d3.selection.prototype.moveToBack = function () {
			this.each(function () {
				this.parentNode.firstChild && this.parentNode.insertBefore(this, this.parentNode.firstChild);
			});
		}
	}

	initListenerOnWindowResize() {
		$(window).resize(() => {
			if(this.connectMgmt.edgeMgmt.isSelectingEdge()) {
				this.connectMgmt.edgeMgmt.cancleSelectedPath();
			}

			this.inputMgmt.setCenterAlignmentGarph();
			this.outputMgmt.setCenterAlignmentGarph();
      
			this.objectUtils.updatePathConnectOnWindowResize(this.connectMgmt.edgeMgmt, [this.storeInputMessage, this.storeOperations, this.storeOutputMessage]);
		})
	}

	initOnMouseUpBackground() {
		let selector = this.selector.prop('id');

		if (selector == '') {
			selector = `.${this.selector.prop('class')}`;
		}else{
			selector = `#${selector}`;
		}
    
		const tmpEdgeMgmt = this.connectMgmt.edgeMgmt;
		d3.select(selector).on('mouseup', function() {
			const mouse = d3.mouse(this)
			const elem = document.elementFromPoint(mouse[0], mouse[1])

			//disable selecting effect if edge is selecting
			if((!elem || !elem.tagName || elem.tagName != 'path') && tmpEdgeMgmt.isSelectingEdge()) {
				tmpEdgeMgmt.cancleSelectedPath();
			}
		});
	}

	LoadInputMessage(graphData, fileName) {
		const resMessage = this.validateGraphDataStructure(graphData);

		if(resMessage.type !== 'ok') {
			comShowMessage(resMessage.message);

			if(resMessage.type === 'error')
				return;
		}

		const isError = this.validatesSameGraph(graphData, 'I');
		if (isError) {
			comShowMessage('There was duplicate data with Output graph.\nYou should check it or choose another one!');
			return;
		}

		if (this.history) {
			this.history.clear();
		}

		//clear data
		this.connectMgmt.clearInputEdges();
		this.inputMgmt.clearAll();

		//Reload Vertex Define and draw graph
		const {vertexTypes} = graphData;
		this.inputMgmt.processDataVertexTypeDefine(vertexTypes);
		this.inputMgmt.drawObjectsOnInputGraph(graphData);
		this.inputMgmt.isShowReduced = false;
		this.inputMgmt.initMenuContext();
		setAddressTabName(ID_TAB_INPUT_MESSAGE, fileName);
		this.showFileNameOnApplicationTitleBar();

		setMinBoundaryGraph(this.storeInputMessage,this.inputMessageSvgId, this.inputMgmt.viewMode.value);
	}

	LoadOutputMessage(graphData, fileName) {
		const {vertexTypes} = graphData;

		const resMessage = this.validateGraphDataStructure(graphData);

		if (resMessage.type !== 'ok') {
			comShowMessage(resMessage.message);

			if (resMessage.type === 'error')
				return;
		}

		const isError = this.validatesSameGraph(graphData, 'O');
		if (isError) {
			comShowMessage('There was duplicate data with Iutput graph.\nYou should check it or choose another one!');
			return;
		}

		if (this.history) {
			this.history.clear();
		}

		//clear data
		this.connectMgmt.clearOutputEdges();
		this.outputMgmt.clearAll();

		//Reload Vertex Define and draw graph
		this.outputMgmt.processDataVertexTypeDefine(vertexTypes);
		this.outputMgmt.drawObjectsOnOutputGraph(graphData);
		this.outputMgmt.isShowReduced = false;
		this.outputMgmt.initMenuContext();
		setAddressTabName(ID_TAB_OUTPUT_MESSAGE, fileName);
		this.showFileNameOnApplicationTitleBar();
		
		// Validate for mandatory Data Element
		this.outputMgmt.validateConnectionByUsage();

		setMinBoundaryGraph(this.storeOutputMessage,this.outputMessageSvgId, this.outputMgmt.viewMode.value);
	}

	LoadMesseageMapping(messageMappingData, fileName) {
		const {inputMessage, outputMessage, operations, edges} = messageMappingData;

		//Validate Input data
		let resMessage = this.validateGraphDataStructure(inputMessage);

		if (resMessage.type !== 'ok') {
			comShowMessage(`Input Message: ${resMessage.message}`);

			if (resMessage.type === 'error')
				return;
		}

		//Validate Output data
		resMessage = this.validateGraphDataStructure(outputMessage);

		if (resMessage.type !== 'ok') {
			comShowMessage(`Output Message: ${resMessage.message}`);

			if (resMessage.type === 'error')
				return;
		}

		//Validate Operations data
		resMessage = this.validateGraphDataStructure(operations);

		if(resMessage.type !== 'ok') {
			comShowMessage(`Operations: ${resMessage.message}`);

			if(resMessage.type === 'error')
				return;
		}

		if (this.history) {
			this.history.clear();
		}

		//Clear all data
		this.inputMgmt.clearAll();
		this.operationsMgmt.clearAll();
		this.outputMgmt.clearAll();
		this.connectMgmt.clearAll();
		unsetAddressTabName(ID_TAB_INPUT_MESSAGE);
		unsetAddressTabName(ID_TAB_OUTPUT_MESSAGE);
		setAddressTabName(ID_TAB_MESSAGE_MAPPING_DEFINITION, fileName);
		this.showFileNameOnApplicationTitleBar();

		//Input Graph - Reload Vertex define and draw new graph
		let vertexTypes = inputMessage.vertexTypes;
		this.inputMgmt.processDataVertexTypeDefine(vertexTypes);
		this.inputMgmt.drawObjectsOnInputGraph(inputMessage);
		this.inputMgmt.initMenuContext();

		//Output Graph - Reload Vertex define and draw new graph
		vertexTypes = {};
		vertexTypes = outputMessage.vertexTypes;
		this.outputMgmt.processDataVertexTypeDefine(vertexTypes);
		this.outputMgmt.drawObjectsOnOutputGraph(outputMessage);
		this.outputMgmt.initMenuContext();
		this.outputMgmt.validateConnectionByUsage();

		//Operations Graph - Reload Vertex define and draw new graph.
		vertexTypes = {};
		vertexTypes = operations.vertexTypes;
		this.operationsMgmt.processDataVertexTypeDefine(vertexTypes);
		this.operationsMgmt.drawObjectsOnOperationsGraph(operations);
		this.operationsMgmt.initMenuContext();
    
		//Draw edges
		this.edgeVerifySvgId(edges);
		this.connectMgmt.drawEdgeOnConnectGraph(edges);

		setMinBoundaryGraph(this.storeInputMessage,this.inputMessageSvgId, this.inputMgmt.viewMode.value);
		setMinBoundaryGraph(this.storeOutputMessage,this.outputMessageSvgId, this.outputMgmt.viewMode.value);
		setMinBoundaryGraph(this.storeOperations,this.operationsSvgId, this.operationsMgmt.viewMode.value);

		//Solve in case of save and import from different window size
		this.objectUtils.updatePathConnectOnWindowResize(this.connectMgmt.edgeMgmt, [this.storeInputMessage, this.storeOperations, this.storeOutputMessage]);
	}

	save(fileName) {

		if (!fileName) {
			comShowMessage('Please input file name');
			return;
		}
		
		if (!this.outputMgmt.validateConnectionByUsage()) {
			if (!confirm('You missed mandatory things without any connection.\nContinue saving?'))
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
			downLink.attr('download', `${fileName}.mmd`);
			downLink.attr('href', fileUrl);
			downLink.css('display', 'none');
			$('body').append(downLink);
			downLink[0].click();
			downLink.remove();

			hideFileChooser();

		}).catch(err => {
			comShowMessage(err)
		})
	}

	LoadOperationsVertexDefinition(vertexDefinitionData) {
		if (this.operationsMgmt.LoadVertexDefinition(vertexDefinitionData)) {
			this.operationsMgmt.initMenuContext();
		}
	}

	/**
   * Validate Graph Data Structure
   * with embedded vertex type
   * Validate content
   */
	validateGraphDataStructure(data) {
		//Validate data exists
		if(data===undefined) {
			console.log('Data does not exist');
			return {
				type: 'error',
				message: 'Empty data.'
			}
		}

		// Validate struct data
		if (!data.vertex || !data.boundary || !data.position || !data.vertexTypes ||
      (Object.keys(data.vertexTypes).length === 0 && data.vertexTypes.constructor === Object)) {
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
			const type = vertex.vertexType
			// If vertex type not exit in embedded vertex type
			if (types.indexOf(type) < 0) {
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
				return {
					type: 'warning',
					message: 'Data\'s length is different'
				}
			}

			// Check mismatch key
			const flag = checkKeyMisMatch(keySource, keyTarget);

			if (flag) {
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
  
	/**
   * Check duplicate data when import Input or Output graph
   * @param dataContainer the data of current graph
   * @param type type current graph (Input: "I", Output: "O")
   */
	validatesSameGraph(dataContainer, type) {
		//Variable to store data of the other
		let tmpDataContainer = {};

		if(type == 'I') {
			tmpDataContainer = this.storeOutputMessage;
		}else{
			tmpDataContainer = this.storeInputMessage;
		}

		//Check duplicate Vertex ID between Input and Output
		if (tmpDataContainer.vertex.length > 0) {
			for (const vertext1 of dataContainer.vertex) {
				for (const vertext2 of tmpDataContainer.vertex) {
					if(vertext1.id === vertext2.id)
						return true;
				}
			}
		}

		//Check duplicate Boundary ID between Input and Output
		if(tmpDataContainer.boundary.length > 0) {
			for (const boudary1 of dataContainer.boundary) {
				for (const boudary2 of tmpDataContainer.boundary) {
					if(boudary1.id === boudary2.id)
						return true;
				}
			}
		}

		return false;
	}

	getContentGraphAsJson() {
		const dataContent = {inputMessage: {}, outputMessage: {}, operations: {}, edges: []};

		const inputMessage = {vertex: [], boundary: [],position: [], vertexTypes: {}};
		const outputMessage = {vertex: [], boundary: [],position: [], vertexTypes: {}};
		const operations = {vertex: [], boundary: [],position: [], vertexTypes: {}};

		if (this.isEmptyContainerData(this.storeInputMessage)) {
			return Promise.reject('There is no Input data. Please import!');
		} 
		if (this.isEmptyContainerData(this.storeOutputMessage)) {
			return Promise.reject('There is no Output data. Please import!');
		}

		// Process data to export
		// Need clone data cause case user export
		// later continue edit then lost parent scope
		// Purpose prevent reference data.

		//Input data
		const cloneInputData = {
			vertex: filterPropertyData(this.storeInputMessage.vertex, [], ['dataContainer']),
			boundary: filterPropertyData(this.storeInputMessage.boundary, [], ['dataContainer'])
		}

		cloneInputData.vertex.forEach(vertex => {
			const pos = new Object({
				'id': vertex.id,
				'x': vertex.x,
				'y': vertex.y
			});

			inputMessage.vertex.push(this.getSaveDataVertex(vertex));
			inputMessage.position.push(pos);
		});

		cloneInputData.boundary.forEach(boundary => {
			const pos = new Object({
				'id': boundary.id,
				'x': boundary.x,
				'y': boundary.y
			});

			inputMessage.boundary.push(this.getSaveDataBoundary(boundary));
			inputMessage.position.push(pos);
		})

		const cloneVertexInputDefine = _.cloneDeep(this.inputMgmt.vertexMgmt.vertexDefinition);

		let inputVertexDefine = {};
		if(cloneVertexInputDefine.vertexGroup) {
			inputVertexDefine = {
				'VERTEX_GROUP': this.getSaveVertexGroup(cloneVertexInputDefine.vertexGroup),
				'VERTEX': cloneVertexInputDefine.vertex
			}
		}
		inputMessage.vertexTypes = inputVertexDefine;

		//Output data
		const cloneOutputData = {
			vertex: filterPropertyData(this.storeOutputMessage.vertex, [], ['dataContainer']),
			boundary: filterPropertyData(this.storeOutputMessage.boundary, [], ['dataContainer'])
		}
		
		cloneOutputData.vertex.forEach(vertex => {
			const pos = new Object({
				'id': vertex.id,
				'x': vertex.x,
				'y': vertex.y
			});

			outputMessage.vertex.push(this.getSaveDataVertex(vertex));
			outputMessage.position.push(pos);
		});

		cloneOutputData.boundary.forEach(boundary => {
			const pos = new Object({
				'id': boundary.id,
				'x': boundary.x,
				'y': boundary.y
			});

			outputMessage.boundary.push(this.getSaveDataBoundary(boundary));
			outputMessage.position.push(pos);
		});

		const cloneVertexOutputDefine = _.cloneDeep(this.outputMgmt.vertexMgmt.vertexDefinition);

		let outputVertexDefine = {};
		if(cloneVertexOutputDefine.vertexGroup) {
			outputVertexDefine = {
				'VERTEX_GROUP': this.getSaveVertexGroup(cloneVertexOutputDefine.vertexGroup),
				'VERTEX': cloneVertexOutputDefine.vertex
			}
		}
		outputMessage.vertexTypes = outputVertexDefine;

		//Operations data
		const cloneOperationsData = {
			vertex: filterPropertyData(this.storeOperations.vertex, [], ['dataContainer']),
			boundary: filterPropertyData(this.storeOperations.boundary, [], ['dataContainer'])
		}

		cloneOperationsData.vertex.forEach(vertex => {
			const pos = new Object({
				'id': vertex.id,
				'x': vertex.x,
				'y': vertex.y
			});

			operations.vertex.push(this.getSaveDataVertex(vertex));
			operations.position.push(pos);
		});

		cloneOperationsData.boundary.forEach(boundary => {
			const pos = new Object({
				'id': boundary.id,
				'x': boundary.x,
				'y': boundary.y
			});

			operations.boundary.push(this.getSaveDataBoundary(boundary));
			operations.position.push(pos);
		});

		const cloneVertexOperationDefine = _.cloneDeep(this.operationsMgmt.vertexMgmt.vertexDefinition);
		let operationVertexDefine = {};
		if(cloneVertexOperationDefine.vertexGroup) {
			operationVertexDefine = {
				'VERTEX_GROUP': this.getSaveVertexGroup(cloneVertexOperationDefine.vertexGroup),
				'VERTEX': cloneVertexOperationDefine.vertex
			}
		}
		operations.vertexTypes = operationVertexDefine;

		//Edges    
		const edges = [];
		const cloneEdgesData = {
			edge: filterPropertyData(this.storeConnect.edge, [], ['dataContainer'])
		}

		cloneEdgesData.edge.forEach(edge => {
			edges.push(this.getSaveDataEdge(edge));
		});

		//Data content
		dataContent.inputMessage = inputMessage;
		dataContent.outputMessage = outputMessage;
		dataContent.operations = operations;
		dataContent.edges = edges;

		return Promise.resolve(dataContent);
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
				destNote: edge.destNote,

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

	operationsAutoAlignment() {
		// for history
		const oldPositionStore = {
			vertex: filterPropertyData(this.storeOperations.vertex, ['id', 'x', 'y']),
			boundary: filterPropertyData(this.storeOperations.boundary, ['id', 'x', 'y'])
		}

		// Calculate for arranging branch
		const arrRes = [];
		const operationsContainer = _.cloneDeep(this.storeOperations);
		
		// All edge start from input message
		let arrEdgeStartFromInput = [];
		arrEdgeStartFromInput = this.storeConnect.edge.filter(e => {
			return e.source.svgId == this.inputMessageSvgId && e.target.svgId == this.operationsSvgId;
		});
		
		// sort from top to bottom
		arrEdgeStartFromInput.sort(function(a, b) {
			return a.source.y - b.source.y;
		});

		// Find all object connect to input area
		arrEdgeStartFromInput.forEach(e => {
			let object = null;
			if (e.target.vertexId[0] == OBJECT_TYPE.VERTEX) {
				object = _.find(operationsContainer.vertex, el => {
					return el.id == e.target.vertexId;
				});
			} else {
				object = _.find(operationsContainer.boundary, el => {
					return el.id == e.target.vertexId;
				});
			}

			if (object) {
				if (object.parent) {
					let parent = _.find(operationsContainer.boundary, {'id': object.parent});
					parent = parent.findAncestorOfMemberInNestedBoundary();
					if (this.notIn(arrRes, parent.id)) {
						arrRes.push(parent);
					}
				} else {
					if (this.notIn(arrRes, object.id)) {
						arrRes.push(object);
					}
				}
			}
		});

		// Finding and pushing objects related to each object in current array
		for(let i = 0; i < arrRes.length; i++) {
			this.findNextObjects(arrRes[i], operationsContainer);
		}

		// Find all child branch for each branch
		const arrFinalResult = [];
		for(let i = 0; i < arrRes.length; i++) {
			const branch = [];
			arrFinalResult.push(branch);
			const childBranch = [];
			branch.push(childBranch);
			this.findChildBranch(arrRes[i], childBranch, branch, 1);
		}

		if (arrFinalResult.length === 0) return;

		this.removeUnexpectedResult(arrFinalResult);

		// link to real object
		for (let i = 0; i < arrFinalResult.length; i++) {
			const branch = arrFinalResult[i];
			for (let j = 0; j < branch.length; j++) {
				const childBranch = branch[j];
				for (let k = 0; k < childBranch.length; k++) {
					let level = childBranch[k][0].level;
					if (childBranch[k][0].type == OBJECT_TYPE.VERTEX) {
						childBranch[k][0] = _.find(this.storeOperations.vertex, {'id': childBranch[k][0].id});
					} else {
						childBranch[k][0] = _.find(this.storeOperations.boundary, {'id': childBranch[k][0].id});
					}
					childBranch[k][0].level = level;
				}
			}
		}

		// ============================ Calculate for arranging mapping constanst ================================================

		const arrMappingConstObj = [];
		// Find all object connect to output message
		this.storeConnect.edge.forEach(e => {
			if (e.target.svgId == this.outputMessageSvgId && e.source.svgId == this.operationsSvgId) {
				let object = null;
				if (e.source.vertexId[0] == OBJECT_TYPE.VERTEX) {
					object = _.find(operationsContainer.vertex, el => {
						return el.id == e.source.vertexId;
					});
				} else {
					object = _.find(operationsContainer.boundary, el => {
						return el.id == e.source.vertexId;
					});
				}

				if (object) {
					if (object.parent) {
						let parent = _.find(operationsContainer.boundary, {'id':object.parent});
						parent = parent.findAncestorOfMemberInNestedBoundary();
						if (this.notIn(arrMappingConstObj, parent.id)) {
							arrMappingConstObj.push(parent);
						}
					} else {

						if (this.notIn(arrMappingConstObj, object.id)) {
							arrMappingConstObj.push(object);
						}
					}
				} 
			}
		});

		// Remove all objects that have left connection
		this.storeConnect.edge.forEach(e => {
			_.remove(arrMappingConstObj, item => {				
				return this.isNodeConnectToObject(item, e.target);
			});
		});

		// link to real object
		for (let i = 0; i < arrMappingConstObj.length; i++) {
			if (arrMappingConstObj[i].type == OBJECT_TYPE.VERTEX) {
				arrMappingConstObj[i] = _.find(this.storeOperations.vertex, {'id': arrMappingConstObj[i].id});
			} else {
				arrMappingConstObj[i] = _.find(this.storeOperations.boundary, {'id': arrMappingConstObj[i].id});
			}
		}

		// Find all edges connect to arrMappingConstObj
		let listEdgeConnectToMappingConstObj = []
		this.storeConnect.edge.forEach((edge) => {
			arrMappingConstObj.forEach(item => {
				if (this.isNodeConnectToObject(item, edge.source)) {
					listEdgeConnectToMappingConstObj.push(edge);
				}
			});
		});

		// get the coordinate in output svg for target
		listEdgeConnectToMappingConstObj = filterPropertyData(listEdgeConnectToMappingConstObj, [], ['dataContainer']);
		listEdgeConnectToMappingConstObj.forEach((item) => {
			this.doCalculateCoordinateForNodeOfEdge(item.target, CONNECT_TYPE.INPUT, this.storeOutputMessage);
		})

		// sort by y coordinate from Top to Bottom then use them to arrange Mapping constant from Top to Bottom
		listEdgeConnectToMappingConstObj.sort(function(a, b) {
			return a.target.y - b.target.y;
		})
		
		// Move Constant object to family branch
		for (let i = 0; i < arrFinalResult.length; i++) {
			const branch = arrFinalResult[i];
			for (let j = 0; j < branch.length; j++) {
				const childBranch = branch[j];
				const obj = childBranch[childBranch.length-1][0];
				// Find any constant object that connect to the same output object with obj
				for (let k = 0; k < this.storeConnect.edge.length; k++) {
					// Find edge that connect obj to output object
					const edge = this.storeConnect.edge[k];
					if (edge.source.svgId == this.operationsSvgId && edge.target.svgId == this.outputMessageSvgId && this.isNodeConnectToObject(obj, edge.source)) {
						for (let m = 0; m < listEdgeConnectToMappingConstObj.length; m++) {
							// Find const edge that have the same target with above edge
							const constEdge = listEdgeConnectToMappingConstObj[m];
							if (constEdge.target.vertexId == edge.target.vertexId) {
								for ( let n = arrMappingConstObj.length - 1; n >= 0; n--) {
									if (this.isNodeConnectToObject(arrMappingConstObj[n], constEdge.source)) {
										const lastChildBranch = branch[branch.length - 1];
										lastChildBranch[lastChildBranch.length - 1].push(arrMappingConstObj.splice(n,1)[0]);
									}
								}
							}
						}
					}
				}
			}
		}

		// start arrange for branch
		let top = 5;
		for (let i = 0; i < arrFinalResult.length; i++) {
			if (i > 0) {
				top = this.maxHeight(arrFinalResult[i-1]) + 100;
			}

			// Arrange for each Branch
			this.arrangeBranch(arrFinalResult[i], top);
			
			// avoid edge draw draw through objects for each Branch
			this.avoidEdgeGoThrowObject(arrFinalResult[i]);
		}

		// start arrange Mapping Constant
		// Move all Mapping Constant object to a temp place then arrange them by new position
		arrMappingConstObj.forEach(item => {
			item.setPosition({x: 5, y: 5});
		});

		// arrange Mapping Constant
		const arrArrangedObj = [];
		const {maxLength, idxBranch, idxChildBranch} = this.maxLength(arrFinalResult);

		const colChild = arrFinalResult[idxBranch][idxChildBranch][maxLength-1];
		const maxLengthObj = colChild[0];
		const rect = $(`#${maxLengthObj.id}`).get(0).getBoundingClientRect();
		const maxLengthBranch = maxLengthObj.x + rect.width;

		listEdgeConnectToMappingConstObj.forEach((edge) => {
			// if haven't been arranged and is a Mapping Constant object
			const isArrangedObj = _.find(arrArrangedObj, obj => {
				return this.isNodeConnectToObject(obj, edge.source);
      });
      
			const isConstObj = _.find(arrMappingConstObj, obj => {
				return this.isNodeConnectToObject(obj, edge.source);
      });
      
			if (!isArrangedObj && isConstObj) {
				let obj = _.find(arrMappingConstObj, {'id': edge.source.vertexId});
				if (!obj) {
					obj = _.find([].concat(this.storeOperations.vertex).concat(this.storeOperations.boundary), {'id': edge.source.vertexId});
				}

				// If obj have parent then just arrange for parent then all childs will be effect
				if (obj && obj.parent) {
					obj = _.find(this.storeOperations.boundary, {'id': obj.parent});
					obj = obj.findAncestorOfMemberInNestedBoundary();
				}

				this.arrangeForMappingConstantObject(obj, arrArrangedObj, maxLengthBranch);
				
				arrArrangedObj.push(obj);
			}
		});

		// For history
		if (this.history) {
			const state = new State();
			const he = new HistoryElement();
			he.actionType = ACTION_TYPE.AUTO_ALIGNMENT;
			he.oldObject = oldPositionStore;
			he.dataObject = { 
				vertex: filterPropertyData(this.storeOperations.vertex, ['id', 'x', 'y']),
				boundary: filterPropertyData(this.storeOperations.boundary, ['id', 'x', 'y']),
			};
			he.realObject = this.operationsMgmt;
			state.add(he);
			this.history.add(state);
		}

		setMinBoundaryGraph(this.storeOperations, this.operationsSvgId, this.operationsMgmt.viewMode.value);
	}

	/**
	 * 
	 * @param {*} object 
	 * @param {*} edge 
	 * @param {*} maxLengthBranch 
	 */
	arrangeForMappingConstantObject(object, arrArrangedObj, maxLengthBranch) {
		const finalX = maxLengthBranch + 200;
		let finalY = 5;
		if (arrArrangedObj.length > 0) {
			const prevObj = arrArrangedObj[arrArrangedObj.length - 1];
			const rect = $(`#${prevObj.id}`).get(0).getBoundingClientRect();
			finalY = prevObj.y + rect.height + 5;
		}

		const rect = $(`#${object.id}`).get(0).getBoundingClientRect();
		let overridePosition;
		while ((overridePosition = this.haveOverride({id: object.id, x: finalX, y: finalY, width: rect.width, height: rect.height})) != -1) {
			finalY = overridePosition + 5;
		}

		object.setPosition({x: finalX, y: finalY});
	}

	/**
	 * 
	 * @param {*} branch 
	 * @param {*} idxChildBranch 
	 * @param {*} top 
	 * @param {*} arrArrangedObj 
	 * @param {*} isUpdate 
	 */
	setPositionForChildBranch(branch, idxChildBranch, top, arrArrangedObj) {
		const distance = 100;

		const curChildBranch = branch[idxChildBranch];

		for (let i = 0; i < curChildBranch.length; i++) {
			const colChild = curChildBranch[i];
			for (let j = 0; j < colChild.length; j++) {
				let obj = colChild[j];
				if (this.in(arrArrangedObj, obj.id)) continue;

				let x, y;
				if (j == 0) {
					// Normal case
					x = (obj.level - 1) * VERTEX_ATTR_SIZE.GROUP_WIDTH + obj.level * distance;
				} else {
					// Contant object will be locate under lastest item of lastest childBranch
					let aboveObj = curChildBranch[i][0];
					x = aboveObj.x;
				}
				
				// y
				if (idxChildBranch == 0 && j == 0) {
					y = top;
				} else {
					let tmpY = 0;
					if (j == 0) {
						const preChildBranch = branch[idxChildBranch - 1];
						const prevObj = curChildBranch[i-1][0];
						tmpY = this.maxHeightOfChildBranch(preChildBranch, i) + 20;

						if (tmpY < prevObj.y) tmpY = prevObj.y;
						
					} else {
						const aboveObj = colChild[j-1];
						const rect = $(`#${aboveObj.id}`).get(0).getBoundingClientRect();
						tmpY = aboveObj.y + rect.height + 5;
					}

					y = tmpY
				}

				obj.setPosition({x,y});
				arrArrangedObj.push(obj);
			}
		}
	}

	/**
	 * 
	 * @param {*} branch 
	 * @param {*} top 
	 */
	arrangeBranch(branch, top) {
		const arrArrangedObj = [];
		for (let i = 0; i < branch.length; i++) {
			this.setPositionForChildBranch(branch, i, top, arrArrangedObj);
		}
	}

	/**
	 * 
	 * @param {*} branch 
	 */
	avoidEdgeGoThrowObject(branch) {
		// All edges in Operations area
		let listEdge = [];
		this.storeConnect.edge.forEach(edge => {
			if (edge.source.svgId == this.operationsSvgId && edge.target.svgId == this.operationsSvgId) {
				listEdge.push(edge);
			}
		});

		listEdge = filterPropertyData(listEdge, [], ['dataContainer']);
		this.calculateCoordinateByOperationsAreaForEdge(listEdge);

		for (let i = 0; i < branch.length; i++) {
			const childBranch = branch[i];

			let bHaveUpdate = false;
			for (let j = 1; j < childBranch.length; j++) {
				const colChild = childBranch[j];
				const obj = colChild[0];
				let pointRes = null;

				// Find all edge that crossing objects
				listEdge.forEach((item) => {
					const point = this.getIntersectionObject(item, obj);
					// Choose the highest point
					if (point) {
						if (!pointRes || point.y > pointRes.y) {
							pointRes = point;
						}
					}
				})

				if (pointRes) {
					bHaveUpdate = true;

					const offset = pointRes.y - obj.y;
					obj.setPosition({x: obj.x, y: obj.y + offset + 50});
				}
			}

			if (bHaveUpdate) {
				const arrArrangedObj = [];
				for (let l = 0; l <=i; l++) {
					const childBranch = branch[l];
					for (let m = 0; m < childBranch.length; m++) {
						// Because constant objects are alway in last childBranch, so just case first object in each colChild of childBranch
						const colChild = childBranch[m];
						const obj = colChild[0];
						if (this.notIn(arrArrangedObj, obj.id)) {
							arrArrangedObj.push(obj);
						}
					}
				}
				
				for (let k = i + 1; k < branch.length; k++) {
					this.setPositionForChildBranch(branch, k, null, arrArrangedObj);
				}

				this.calculateCoordinateByOperationsAreaForEdge(listEdge);
			}
		}
	}

	/**
	 * get the intersection point between the edge and object then choose a point that has the highest y coordinate
	 * @param {*} edge 
	 * @param {*} object 
	 */
	getIntersectionObject(edge, object) {
		if (object.type == OBJECT_TYPE.BOUNDARY) {
			if (object.isParentOf(edge.target.vertexId) || object.isParentOf(edge.source.vertexId)) return null;
		}

		const inputRect = $(`#${this.inputMessageContainerId}`).get(0).getBoundingClientRect();
		inputRect.width = 0;

		// edge
		const eA = {x: edge.source.x, y: edge.source.y};
		const eB = {x: edge.target.x, y: edge.target.y};

		const objRect = $(`#${object.id}`).get(0).getBoundingClientRect();
		// left edge of object
		const leftA = {x: object.x + inputRect.width, y: object.y};
		const leftB = {x: object.x + inputRect.width, y: object.y + objRect.height};

		// right edge of object
		const rightA = {x: object.x + objRect.width + inputRect.width, y: object.y};
		const rightB = {x: object.x + objRect.width + inputRect.width, y: object.y + objRect.height};

		// top edge of object
		const topA = {x: object.x + inputRect.width, y: object.y};
		const topB = {x: object.x + inputRect.width + inputRect.width, y: object.y};

		// bottom edge of object
		const bottomA = {x: object.x + inputRect.width, y: object.y + objRect.height};
		const bottomB = {x: object.x + inputRect.width + inputRect.width, y: object.y + objRect.height};

		let pointRes = null;
		// Left edge
		let point = this.getIntersection({A: leftA, B: leftB}, {A: eA, B: eB});
		if (point && point.y > leftA.y && point.y < leftB.y && point.x > eA.x && point.x < eB.x) {
			if (!pointRes || point.y > pointRes.y) pointRes = point;
		}

		// Right edge
		point = this.getIntersection({A: rightA, B: rightB}, {A: eA, B: eB});
		if (point && point.y > leftA.y && point.y < leftB.y && point.x > eA.x && point.x < eB.x) {
			if (!pointRes || point.y > pointRes.y) pointRes = point;
		}

		// Top edge
		point = this.getIntersection({A: topA, B: topB}, {A: eA, B: eB});
		if (point && point.x > topA.x && point.x < topB.x && point.x > eA.x && point.x < eB.x) {
			if (!pointRes || point.y > pointRes.y) pointRes = point;
		}

		// Bottom edge
		point = this.getIntersection({A: bottomA, B: bottomB}, {A: eA, B: eB});
		if (point && point.x > bottomA.x && point.x < bottomB.x && point.x > eA.x && point.x < eB.x) {
			if (!pointRes || point.y > pointRes.y) pointRes = point;
		}

		return pointRes;
	}

	// Find all objects connect to this object from right side
	findNextObjects(object, operationsContainer) {
		// If this object was run findNextObjects before then do nothing
		if (object.child) return;
		
		const arrEdges = _.filter(this.storeConnect.edge, edge => {
			return edge.source.svgId == this.operationsSvgId && edge.target.svgId == this.operationsSvgId;
		})

		arrEdges.sort((a,b) => {
			return a.source.y - b.source.y;
		})

		object.child = [];
		arrEdges.forEach(e => {
			if (this.isNodeConnectToObject(object, e.source)) {
				let tmpObj = null;
				if (e.target.vertexId[0] == OBJECT_TYPE.VERTEX) {
					tmpObj = _.find(operationsContainer.vertex, {'id': e.target.vertexId});
				} else {
					tmpObj = _.find(operationsContainer.boundary, {'id': e.target.vertexId});
				}

				if (tmpObj) {
					if (tmpObj.parent) {
						tmpObj = _.find(operationsContainer.boundary, {'id':tmpObj.parent});
						tmpObj = tmpObj.findAncestorOfMemberInNestedBoundary();
					}

					if (this.notIn(object.child, tmpObj.id)) {
						object.child.push(tmpObj);
					}
				} 
			}
		})

		for(let i = 0; i < object.child.length; i++) {
			this.findNextObjects(object.child[i], operationsContainer);
		}
	}

	/**
	 * Return true if object exist in arr
	 * @param {*} arr 
	 * @param {*} object 
	 */
	in(arr, objectId) {
		for (let i = 0; i < arr.length; i++) {
			if (arr[i].id == objectId) return true;
		}

		return false;
	}

	/**
	 * Return true if object does not exist in arr
	 * @param {*} arr 
	 * @param {*} object 
	 */
	notIn(arr, objectId) {
		for (let i = 0; i < arr.length; i++) {
			if (arr[i].id == objectId) return false;
		}

		return true;
	}

	/**
	 * 
	 * @param {*} object 
	 * @param {*} childBranch 
	 * @param {*} branch 
	 */
	findChildBranch(object, childBranch, branch, level) {
		if (!object.level || object.level < level) {
			object.level = level;
		}

		childBranch.push([object]);

		if (object.child.length > 0) {
			for (let i = 0; i < object.child.length; i++) {
				let newChildBranch = _.clone(childBranch);
				branch.push(newChildBranch);
				this.findChildBranch(object.child[i], newChildBranch, branch, level + 1);
			}
		}
	}

	/**
	 * 
	 */
	maxLength(arrBranch) {
		if (arrBranch.length == 0) return 0;

		let max = 0;
		let idxBranch = -1;
		let idxChildBranch = -1;
		for (let i = 0; i < arrBranch.length; i++) {
			let branch = arrBranch[i];
			for (let j = 0; j < branch.length; j++) {
				let childBranch = branch[j];
				if (childBranch.length > max) {
					max = childBranch.length;
					idxBranch = i;
					idxChildBranch = j;
				} 
			}	
		}

		return {maxLength: max, idxBranch, idxChildBranch};
	}

	/**
	 * 
	 * @param {*} arrFinalResult 
	 */
	removeUnexpectedResult(arrFinalResult) {
		for (let i = 0; i < arrFinalResult.length; i++) {
			let branch = arrFinalResult[i];

			for (let j = 0; j < branch.length; j++) {
				for (let k = 0; k < branch.length; k++) {
					if (j != k && this.isContain(branch[k], branch[j])) {
						branch.splice(j,1);
						j--;
						break;
					}
				}	
			}
		}
	}

	/**
	 * 
	 * @param {*} arrLongestBranch 
	 */
	mergeFinalResult(arrLongestBranch) {
		const arrRes = [];
		for (let i = 0; i < arrLongestBranch.length; i++) {
			const Branch = arrLongestBranch[i];
			const tempBranch = Branch[0]; // Choose the first item in Branch for the base then merge other item into it
			const arrResTemp = []; // store the final result for each Branch
			arrRes.push(arrResTemp);

			// use first item for base data
			tempBranch.forEach((item, index) => {
				arrResTemp[index] = [];
				arrResTemp[index].push(item);
			})

			// if more than 1 item in Branch then merge them to the base
			if (Branch.length > 1) {
				for (let j = 1; j < Branch.length; j++) {
					Branch[j].forEach((item, index) => {
						if (index >= arrResTemp.length) {
							arrResTemp[index] = [];
							arrResTemp[index].push(item);
						} else {
							if (this.notIn(arrResTemp[index], item.id)) {
								arrResTemp[index].push(item);
							}
						}
					});
				}
			}
		}

		return arrRes;
	}

	/**
	 * 
	 * @param {*} arrEdge 
	 */
	calculateCoordinateByOperationsAreaForEdge(arrEdge) {
		arrEdge.forEach((item) => {
			// source
			this.doCalculateCoordinateForNodeOfEdge(item.source, CONNECT_TYPE.OUTPUT, this.storeOperations);

			// target
			this.doCalculateCoordinateForNodeOfEdge(item.target, CONNECT_TYPE.INPUT, this.storeOperations);
		})
	}

	/**
	 * 
	 * @param {*} node 
	 * @param {*} connectType 
	 * @param {*} dataContainer 
	 */
	doCalculateCoordinateForNodeOfEdge(node, connectType, dataContainer) {
		const {vertexId, prop} = node;
		let vertices = [];
		vertices = vertices.concat(dataContainer.vertex);
		vertices = vertices.concat(dataContainer.boundary);

		const object = _.find(vertices, {'id': vertexId});

		if (prop.indexOf('boundary_title') != -1) {
			node.y = object.y + BOUNDARY_ATTR_SIZE.HEADER_HEIGHT / 2;
			node.x = connectType === CONNECT_TYPE.OUTPUT ? object.x + object.width : object.x;

		} else if (prop.indexOf('title') != -1) {
			node.y = object.y + VERTEX_ATTR_SIZE.HEADER_HEIGHT / 2
			node.x = connectType === CONNECT_TYPE.OUTPUT ? object.x + VERTEX_ATTR_SIZE.GROUP_WIDTH : object.x

		} else {
			// Get index prop in object
			const index = this.objectUtils.findIndexPropInVertex(vertexId, prop);
			node.y = object.y + VERTEX_ATTR_SIZE.HEADER_HEIGHT + index * VERTEX_ATTR_SIZE.PROP_HEIGHT + VERTEX_ATTR_SIZE.PROP_HEIGHT / 2;
			node.x = connectType === CONNECT_TYPE.OUTPUT ? object.x + VERTEX_ATTR_SIZE.GROUP_WIDTH : object.x;
		}
	}

	/**
	 * 
	 * @param {*} branch 
	 */
	maxHeight(branch) {
		let maxHeight = 0;
		const lastChildBranch = branch[branch.length - 1];

		for (let i = 0; i < lastChildBranch.length; i++) {
			const colChild = lastChildBranch[i];
			const highestObj = colChild[colChild.length - 1];

			let rect = $(`#${highestObj.id}`).get(0).getBoundingClientRect();
			if (maxHeight < highestObj.y + rect.height) {
				maxHeight = highestObj.y + rect.height;
			}
		}

		return maxHeight;
	}

	/**
	 * 
	 * @param {*} childBranch 
	 * @param {*} index 
	 */
	maxHeightOfChildBranch(childBranch, index) {
		let maxHeight = 0;
		for (let i = index; i < childBranch.length; i++) {
			const colChild = childBranch[i];
			const highestObj = colChild[colChild.length - 1];

			const rect = $(`#${highestObj.id}`).get(0).getBoundingClientRect()
			if (maxHeight < highestObj.y + rect.height) {
				maxHeight = highestObj.y + rect.height;
			}
		}

		return maxHeight;
	}

	isNodeConnectToObject(object, node) {
		if (object.type == OBJECT_TYPE.VERTEX) {
			return object.id == node.vertexId;
		} else {
			if (object.id == node.vertexId) {
				return true;
			} else {
				for (let i = 0; i < object.member.length; i++) {
					let memObj = null;
					if (object.member[i].type == OBJECT_TYPE.VERTEX) {
						memObj = _.find(this.storeOperations.vertex, {'id': object.member[i].id});
					} else {
						memObj = _.find(this.storeOperations.boundary, {'id': object.member[i].id});
					}

					if (this.isNodeConnectToObject(memObj, node)) return true;
				}
			}
		}

		return false;
	}

	/**
	 * get intersection between two edges
	 * @param {*} edge1 
	 * @param {*} edge2 
	 */
	getIntersection(edge1, edge2) {
		/* 
			y = ax + b

			With: A(x1,y1), B(x2,y2)

			=> a = (y2 - y1) / (x2 - x1)
			=> b = (y1x2 - y2x1) / (x2 - x1)


			With:
			(d1): y = a1x + b1
			(d2): y = a2x + b2

			=> x = (a1 - a2) / (b2 - b1)
			=> y = (b1*a2 - a1*b2) / (a2 - a1)
		*/

		/* edge1 // edge2 then there is no intersection */
		if (   (edge1.B.x - edge1.A.x == 0 && edge2.B.x - edge2.A.x == 0)
				|| (edge1.B.y - edge1.A.y == 0 && edge2.B.y - edge2.A.y == 0) ) {
			return null;
		}
		
		if (edge1.B.x - edge1.A.x == 0) {
			/* edge1 // Oy */
			const resX = edge1.A.x;

			if (edge2.B.y - edge2.A.y == 0) {
				// edge2 // Ox
				return {x: resX, y: edge2.A.y};
			}

			const a2 = (edge2.B.y - edge2.A.y) / (edge2.B.x - edge2.A.x);
			const b2 = (edge2.A.y*edge2.B.x - edge2.B.y*edge2.A.x) / (edge2.B.x - edge2.A.x);

			const resY = a2*resX + b2;

			return {x: resX, y: resY};

		} else if (edge1.B.y - edge1.A.y == 0) {
			/* edge1 // Ox */
			const resY = edge1.A.y;

			if (edge2.B.x - edge2.A.x == 0) {
				// edge2 // Oy
				return {x: edge2.A.x, y: resY};
			}

			const a2 = (edge2.B.y - edge2.A.y) / (edge2.B.x - edge2.A.x);
			const b2 = (edge2.A.y*edge2.B.x - edge2.B.y*edge2.A.x) / (edge2.B.x - edge2.A.x);

			const resX = (resY - b2)/a2;

			return {x: resX, y: resY};

		} else if (edge2.B.x - edge2.A.x == 0) {
			/* edge2 // Oy */
			const resX = edge2.A.x;

			if (edge1.B.y - edge1.A.y == 0) {
				// edge1 // Ox
				return {x: resX, y: edge1.A.y};
			}

			const a1 = (edge1.B.y - edge1.A.y) / (edge1.B.x - edge1.A.x);
			const b1 = (edge1.A.y*edge1.B.x - edge1.B.y*edge1.A.x) / (edge1.B.x - edge1.A.x);

			const resY = a1*resX + b1;

			return {x: resX, y: resY};
			
		} else if (edge2.B.y - edge2.A.y == 0) {
			/* edge2 // Ox */
			const resY = edge2.A.y;

			if (edge1.B.x - edge1.A.x == 0) {
				return {x: edge1.A.x, y: resY};
			}

			const a1 = (edge1.B.y - edge1.A.y) / (edge1.B.x - edge1.A.x);
			const b1 = (edge1.A.y*edge1.B.x - edge1.B.y*edge1.A.x) / (edge1.B.x - edge1.A.x);

			const resX = (resY - b1)/a1;

			return {x: resX, y: resY};

		} else {
			const a1 = (edge1.B.y - edge1.A.y) / (edge1.B.x - edge1.A.x);
			const b1 = (edge1.A.y*edge1.B.x - edge1.B.y*edge1.A.x) / (edge1.B.x - edge1.A.x);

			const a2 = (edge2.B.y - edge2.A.y) / (edge2.B.x - edge2.A.x);
			const b2 = (edge2.A.y*edge2.B.x - edge2.B.y*edge2.A.x) / (edge2.B.x - edge2.A.x);

			const resX = (a1 - a2) / (b2 - b1);
			const resY = (b1*a2 - a1*b2) / (a2 - a1);

			return {x: resX, y: resY};
		}
	}

	/**
	 * 
	 * @param {*} objectId 
	 * @param {*} point 
	 */
	haveOverride(objectInfo) {
		for (let i = 0; i < this.storeOperations.boundary.length; i++) {
			const boundary = this.storeOperations.boundary[i];
			if (boundary.id != objectInfo.id && this.isOverride(objectInfo, boundary)) {
				return boundary.y + boundary.height;
			}
		}

		for (let i = 0; i < this.storeOperations.vertex.length; i++) {
			const vertex = this.storeOperations.vertex[i];
			const rect = $(`#${vertex.id}`).get(0).getBoundingClientRect();
			if (vertex.id != objectInfo.id && this.isOverride(objectInfo, {x: vertex.x, y: vertex.y, width: rect.width, height: rect.height})) {
				return vertex.y + rect.height;
			}
		}

		return -1;
	}

	isOverride(object1, object2) {
		if (
			(	// Top Left of object1 is in object2
				(object1.y >= object2.y && object1.x >= object2.x && object1.y <= object2.y + object2.height + 4 && object1.x <= object2.x + object2.width)
				// Top Right of object1 is in object2
				|| (object1.y >= object2.y && object1.y <= object2.y + object2.height + 4 && object1.x + object1.width >= object2.x && object1.x + object1.width <= object2.x + object2.width)
				// Bottom left of object1 is in object2
				|| (object1.y + object1.height >= object2.y && object1.y + object1.height <= object2.y + object2.height + 4 && object1.x >= object2.x && object1.x <= object2.x + object2.width)
				// Bottom Right of object1 is in object2
				|| (object1.y  + object1.height >= object2.y && object1.y + object1.height <= object2.y + object2.height + 4 && object1.x + object1.width >= object2.x && object1.x + object1.width <= object2.x + object2.width)
			)
			||
			( // Top Left of object2 is in object1
				(object2.y >= object1.y && object2.x >= object1.x && object2.y <= object1.y + object1.height + 4 && object2.x <= object1.x + object1.width)
				// Top Right of object2 is in object1
				|| (object2.y >= object1.y && object2.y <= object1.y + object1.height + 4 && object2.x + object2.width >= object1.x && object2.x + object2.width <= object1.x + object1.width)
				// Bottom left of object2 is in object1
				|| (object2.y + object2.height >= object1.y && object2.y + object2.height <= object1.y + object1.height + 4 && object2.x >= object1.x && object2.x <= object1.x + object1.width)
				// Bottom Right of object2 is in object1
				|| (object2.y  + object2.height >= object1.y && object2.y + object2.height <= object1.y + object1.height + 4 && object2.x + object2.width >= object1.x && object2.x + object2.width <= object1.x + object1.width)
			)
		) {
			return true;
		}

		return false;
	}

	/**
	 * Is arrObj1 contain arrObj2
	 * @param {*} arrObj1 
	 * @param {*} arrObj2 
	 */
	isContain(arrObj1, arrObj2) {
		if (arrObj1.length < arrObj2.length) return false;

		let cnt = 0;
		for (let i = 0; i < arrObj1.length; i++) {
			for (let j = 0; j < arrObj2.length; j++) {
				if (arrObj2[j][0].id == arrObj1[i][0].id) {
					cnt += 1;
				}
			}
		}

		return cnt == arrObj2.length;
	}

	/**
	 * Generate scanner code
	 * @param {*} messageGroupType 
	 */
	generateScannerCode(messageGroupType) {
		if (this.storeInputMessage.boundary.length === 0) {
			comShowMessage('There is no input message data');
			return;
		}

		const messageSpecTree = MessageSpecReader.read(this.storeInputMessage);

		let scannerWriter = null;
		switch(messageGroupType) {
			case 'FIXED_LENGTH_BY_LINE':
				scannerWriter = ScannerWriterFactory.createFixedLengthByLine();
				break;
			case 'FIXED_LENGTH_WITH_INDEXED_ITEM':
				scannerWriter = ScannerWriterFactory.createFixedLengthWithIndexedItem();
				break;
			case 'FIXED_LENGTH_WITH_NAMED_ITEM':
				scannerWriter = ScannerWriterFactory.createFixedLengthWithNamedItem();
				break;
			case 'DELIMITER_WITH_INDEXED_ITEM':
				scannerWriter = ScannerWriterFactory.createDelimiterWithIndexedItem();
				break;
			case 'DELIMITER_WITH_NAMED_ITEM':
				scannerWriter = ScannerWriterFactory.createDelimiterWithNamedItem();
				break;
			case 'DICTIONARY':
				scannerWriter = ScannerWriterFactory.createDictionary();
				break;
		}
		
		const result = scannerWriter.write(messageSpecTree.rootSegmentGroup);

		// Create download dialog
		if (!result) {
			comShowMessage('No content to export');
			return;
		}

		// stringify with tabs inserted at each level
		const blob = new Blob([result], {type: 'application/text', charset: 'utf-8'});

		const fileName = 'scanner';

		if (navigator.msSaveBlob) {
			navigator.msSaveBlob(blob, fileName);
			return;
		}

		const fileUrl = window.URL.createObjectURL(blob);
		const downLink = $('<a>');
		downLink.attr('download', `${fileName}.cpp`);
		downLink.attr('href', fileUrl);
		downLink.css('display', 'none');
		$('body').append(downLink);
		downLink[0].click();
		downLink.remove();
	}

	/**
	 * Generate Mapper Writer code
	 * @param {*} inputMessageGroupType 
	 * @param {*} outputMessageGroupType 
	 */
	generateMapperWriterCode(inputMessageGroupType, outputMessageGroupType) {
		if (this.storeInputMessage.vertex.length === 0 && this.storeInputMessage.boundary.length === 0) {
			comShowMessage('There is no input message data');
			return;
		}

		if (this.storeOutputMessage.vertex.length === 0 && this.storeOutputMessage.boundary.length === 0) {
			comShowMessage('There is no output message data');
			return;
		}

		if (this.storeOperations.vertex.length === 0 && this.storeOperations.boundary.length === 0) {
			comShowMessage('There is no operations data');
			return;
		}

		const mapperWriter = new MapperWriter(inputMessageGroupType, outputMessageGroupType);
		const result = mapperWriter.write(this.storeInputMessage, this.storeOutputMessage, this.storeOperations, this.storeConnect.edge);
		// console.log(result)
		
		// Create download dialog
		if (!result) {
			comShowMessage('No content to export');
			return;
		}

		const fileName = 'mapper';

		// stringify with tabs inserted at each level
		const blob = new Blob([result], {type: 'application/text', charset: 'utf-8'});

		if (navigator.msSaveBlob) {
			navigator.msSaveBlob(blob, fileName);
			return;
		}

		const fileUrl = window.URL.createObjectURL(blob);
		const downLink = $('<a>');
		downLink.attr('download', `${fileName}.cpp`);
		downLink.attr('href', fileUrl);
		downLink.css('display', 'none');
		$('body').append(downLink);
		downLink[0].click();
		downLink.remove();
	}

	showFileNameOnApplicationTitleBar() {
		const inputFileName = $(`#${ID_TAB_INPUT_MESSAGE}`).attr('title');
		const outputFileName = $(`#${ID_TAB_OUTPUT_MESSAGE}`).attr('title');
		const messageMappingFileName = $(`#${ID_TAB_MESSAGE_MAPPING_DEFINITION}`).attr('title');

		const applicationTitle = 'Message Mapping Editor';
		let fileNameList = '';
		if (messageMappingFileName !== undefined && messageMappingFileName !== '') {
			if (fileNameList !== '') {
				fileNameList += ` - ${messageMappingFileName}`;
			} else {
				fileNameList += `${messageMappingFileName}`;
			}
		}

		if (inputFileName !== undefined && inputFileName !== '') {
			if (fileNameList !== '') {
				fileNameList += ` - ${inputFileName}`;
			} else {
				fileNameList += `${inputFileName}`;
			}
		}

		if (outputFileName !== undefined && outputFileName !== '') {
			if (fileNameList !== '') {
				fileNameList += ` - ${outputFileName}`;
			} else {
				fileNameList += `${outputFileName}`;
			}
		}

		$('head title').text(`${applicationTitle} | ${fileNameList} |`);
	}
}
  
export default CltMessageMapping;
