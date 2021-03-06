import * as d3 from 'd3';
import _ from 'lodash';
import ObjectUtils from '../../common/utilities/object.util';
import VertexMgmt from '../common-objects/objects/vertex-mgmt';
import BoundaryMgmt from '../common-objects/objects/boundary-mgmt';
import EdgeMgmt from '../common-objects/objects/edge-mgmt';
import MainMenu from '../common-objects/menu-context/main-menu';
import History from '../../common/new-type-define/history';
import HistoryElement from '../../common/new-type-define/historyElement';
import State from '../../common/new-type-define/state';
import FindMenu from '../common-objects/menu-context/find-menu';

import {
	comShowMessage,
	setSizeGraph,
	setMinBoundaryGraph,
	hideFileChooser,
	filterPropertyData,
	isPopupOpen,
} from '../../common/utilities/common.util';

import { 
	DEFAULT_CONFIG_GRAPH, VIEW_MODE, CONNECT_SIDE, ACTION_TYPE, OBJECT_TYPE,
} from '../../common/const/index';

const ID_TAB_SEGMENT_SET = 'addressSegmentSet';
const ID_TAB_MESSAGE_SPEC = 'addressMessageSpec';
const FOCUSED_CLASS = 'focused-object';
const CONNECT_KEY = 'Connected';

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
			graphContainerId : this.graphContainerId,
			jsonContainerId : this.jsonContainerId,
			textAreaContainerId : this.textAreaContainerId,
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

		this.LoadVertexDefinition();
		this.initCustomFunctionD3();
		this.objectUtils.initListenerContainerScroll(this.graphContainerId, this.edgeMgmt, [this.dataContainer]);
		this.objectUtils.initListenerOnWindowResize(this.edgeMgmt, [this.dataContainer]);
		this.initOnMouseUpBackground();
		this.initShortcutKeyEvent();
		this.initResizeEvent();
    this.autoGenerate();
	}

	initSvgHtml() {
		const sHtml = 
		`<div id="${this.graphContainerId}" class="jsonGraphContainer" ref="${this.graphSvgId}">
        	<svg id="${this.graphSvgId}" class="svg"></svg>
	  	</div>
		<div id="${this.jsonContainerId}" class="jsonContainer">
			<textarea id="${this.textAreaContainerId}" class="jsonTextContainer" readonly></textarea>
		</div>
      <svg id="${this.connectSvgId}" class="connect-svg"></svg>`

		this.selector.append(sHtml)		
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
    
    new FindMenu({
			selector: `#${this.graphContainerId}`,
			dataContainer: this.dataContainer,
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
		this.drawObjects(graphData);
		this.isShowReduced = false;
		this.initMenuContext();
		
		this.validateConnectionByUsage();

		//Solve in case of save and import from different window size
		this.objectUtils.updatePathConnectOnWindowResize(this.edgeMgmt, [this.dataContainer]);

		//Solve in case of save and import from different scroll position
		this.objectUtils.onContainerSvgScroll(this.graphSvgId, this.edgeMgmt, [this.dataContainer]);

		setMinBoundaryGraph(this.dataContainer,this.graphSvgId, this.viewMode.value);

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

	LoadVertexDefinition() {
    if (this.vertexMgmt.LoadVertexDefinition(this.getDefaultVertexDefinition())) {
			this.initMenuContext();
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
		} else {
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

	generateDBJSONContent() {
		if (this.dataContainer.vertex.length == 0)
      		return '';
      
    	const vertex = _.sortBy(this.dataContainer.vertex, ['id']);

		const arrTable = [];
		const edge = this.dataContainer.edge;
		for (let i = 0; i < vertex.length; i++) {
			let table = '';
			const arrCol = [];
			const vertice = vertex[i];

			const {name, data} = vertice;
			for (const row of data) {
				const str = `\t${row['dbcol']}:${row['jsonfield']},`;
				arrCol.push(str);
			}
			table = `${name}: {\n${arrCol.join('\n')}\n},`;
			arrTable.push(table);
		}

		let arrLinks = [];

		for (let i = 0; i < vertex.length; i++) {
			const vertice = vertex[i];
			const {name, data} = vertice;
			const links = _.filter(edge, (item) => {
				return vertice.id == item.target.vertexId;
			});
			if (links.length > 0) {
				const result=_.groupBy(links, (item) => {
					return item.target.prop;
				})
				_.map(result, (arr, key) => {
					const targetKey = parseInt(key.split(CONNECT_KEY)[1]);
					const leftRelData = data[targetKey];
					const arrTableLinks = [];
					for (const edgeGroup of arr) {
						const {source} = edgeGroup;
						const sourceVertex = _.find(this.dataContainer.vertex, {'id': source.vertexId});
						const sourceData = sourceVertex['data'];
						const sourceTableName = sourceVertex['name'];
						const sourceKey = parseInt(source.prop.split(CONNECT_KEY)[1]);
						const rightRelData = sourceData[sourceKey];
						arrTableLinks.push(`${sourceTableName}.${rightRelData['dbcol']}`);
					}
					arrLinks.push(`\t${name}.${leftRelData['dbcol']}: [${arrTableLinks.join(', ')}]`);
				});
			}
		}

		const strLinks = arrLinks.length > 0 ? `\nlinks: [\n${arrLinks.join(", \n")}\n]` :  `\nlinks: []`;
		return `${arrTable.join("\n")}${strLinks}`;
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
  
  getDefaultVertexDefinition() {
    return {
      "VERTEX_GROUP": [
        {
          "groupType":"DBJSON",
          "option":[ 
          
          ],
          "dataElementFormat":{ 
            "dbcol":"",
            "jsonfield":""
          },
          "dataElementText":{ 
            "dbcol":"DB Col",
            "jsonfield":"JSON field"
            
          },
          "vertexPresentation":{ 
            "key":"dbcol",
            "value":"jsonfield",
            "keyTooltip":"dbcol",
            "valueTooltip":"jsonfield"
          }
        }
      ]
		};
  }

  autoGenerate() {
    const str = this.generateDBJSONContent();
    $(`#${this.textAreaContainerId}`).text(str);
    setTimeout(() => {
      this.autoGenerate();
    }, 2000);
  }
}
  
export default CltGraph;
