import MainMenu from '../../common-objects/menu-context/main-menu';
import VertexMgmt from '../../common-objects/objects/vertex-mgmt';
import BoundaryMgmt from '../../common-objects/objects/boundary-mgmt';
import ObjectUtils from '../../../common/utilities/object.util';
import FindMenu from '../../common-objects/menu-context/find-menu';
import HistoryElement from '../../../common/new-type-define/historyElement';

import {
	DEFAULT_CONFIG_GRAPH, VIEW_MODE, CONNECT_SIDE, ACTION_TYPE, OBJECT_TYPE
} from '../../../common/const/index';

import {
	setSizeGraph, setMinBoundaryGraph, filterPropertyData, isPopupOpen
} from '../../../common/utilities/common.util';

const FOCUSED_CLASS = 'focused-object';

class OperationsMgmt {
	constructor(props) {
		this.edgeMgmt = props.edgeMgmt;
		this.dataContainer = props.dataContainer;
		this.svgId = props.svgId;
		this.containerId = props.containerId;
		this.viewMode = {value: VIEW_MODE.OPERATIONS};
		this.parent = props.parent;
		this.mouseOnSvgX = -1;
		this.mouseOnSvgY = -1;
		this.mouseOnWindowX = -1;
		this.mouseOnWindowY = -1;
		this.history = props.history;

		this.focusedObjectId = "";

		this.initialize();
		this.initShortcutKeyEvent();
	}

	initialize() {

		this.objectUtils = new ObjectUtils();

		this.vertexMgmt = new VertexMgmt({
			mainParent: this,
			dataContainer : this.dataContainer,
			containerId : this.containerId,
			svgId : this.svgId,
			viewMode: this.viewMode,
			connectSide: CONNECT_SIDE.BOTH,
			edgeMgmt : this.edgeMgmt,
			history: this.history
		});

		this.boundaryMgmt = new BoundaryMgmt({
			mainParent: this,
			dataContainer: this.dataContainer,
			containerId: this.containerId,
			svgId: this.svgId,
			viewMode: this.viewMode,
			vertexMgmt: this.vertexMgmt,
			edgeMgmt: this.edgeMgmt,
			history: this.history
		});
	}

	initMenuContext() {
		new MainMenu({
			selector: `#${this.svgId}`,
			containerId: `#${this.containerId}`,
			parent: this,
			vertexDefinition: this.vertexMgmt.vertexDefinition,
			viewMode: this.viewMode,
			history: this.history
		});

		new FindMenu({
			selector: `#${this.containerId}`,
			dataContainer: this.dataContainer
		});
	}

	initShortcutKeyEvent() {
		// capture mouse point for creating menu by Ctrl+F
		$(`#${this.svgId}`).mousemove( (e) => {
			this.mouseX = e.pageX;
			this.mouseY = e.pageY;
		});

		$(window).keyup((e) => {
			if (isPopupOpen()) return;

      if ((e.keyCode == 70 || e.keyCode == 102)  && e.ctrlKey) {
				// Ctrl + F
				const $container = $(`#${this.containerId}`);
				const {left, top, right, bottom} = $container[0].getBoundingClientRect();
				if (this.mouseOnWindowX > left && this.mouseOnWindowX < right && this.mouseOnWindowY > top && this.mouseOnWindowY < bottom) {
					$(`#${this.containerId}`).contextMenu({x:this.mouseX, y: this.mouseY});
					$('.context-menu-root input').focus();
				}

      } else if ((e.keyCode == 67 || e.keyCode == 99)  && e.ctrlKey) {
				// Ctrl+C
				const $focusedObject = $(`#${this.svgId} .${FOCUSED_CLASS}`);

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
				const $focusedObject = $(`#${this.svgId} .${FOCUSED_CLASS}`);

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
			}
  	});
	}

	createVertex(opt) {
		this.vertexMgmt.create(opt);
	}

	createBoundary(opt) {
		this.boundaryMgmt.create(opt);
	}

	/**
   * Clear all element on graph
   * And reinit marker def
   */
	clearAll(state) {
		let oldDataContainer = {
			vertex: filterPropertyData(this.dataContainer.vertex, [], ['dataContainer']),
			boundary: filterPropertyData(this.dataContainer.boundary, [], ['dataContainer']),
		}

		this.vertexMgmt.clearAll();
		this.boundaryMgmt.clearAll();

		// Update warning color for Output Message
		this.parent.outputMgmt.validateConnectionByUsage();

		if (state) {
			const he = new HistoryElement();
			he.actionType = ACTION_TYPE.CLEAR_ALL_VERTEX_BOUNDARY;
			he.dataObject = oldDataContainer;
			he.realObject = this;
			state.add(he);
		}
		
		setSizeGraph({ height: DEFAULT_CONFIG_GRAPH.MIN_HEIGHT }, this.svgId);
	}

	drawObjectsOnOperationsGraph(data) {
		const { boundary: boundaries, vertex: vertices, position } = data;
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
			})

			e.x = x;
			e.y = y;
			this.vertexMgmt.create(e);
		})

		if (this.dataContainer.boundary && this.dataContainer.boundary.length > 0) {
			this.objectUtils.setAllChildrenToShow(this.dataContainer);
			if (this.dataContainer.boundary.length > 0)
      this.objectUtils.updateHeightBoundary(this.dataContainer);
		}
	}

	LoadVertexDefinition(vertexDefinitionData) {
		return this.vertexMgmt.LoadVertexDefinition(vertexDefinitionData);
	}

	processDataVertexTypeDefine(vertexDefinitionData) {
		this.vertexMgmt.processDataVertexTypeDefine(vertexDefinitionData);
	}

	operationsAutoAlignment() {
		this.parent.operationsAutoAlignment();
	}

	setWindowMousePoint(x, y) {
		this.mouseOnWindowX = x;
		this.mouseOnWindowY = y;
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

		setMinBoundaryGraph(this.dataContainer, this.svgId, this.viewMode.value);
	}

	resetPosition(dataContainer) {
		this.dataContainer.boundary.forEach(e => {
			const oldObject = _.find(dataContainer.boundary, {id: e.id});
			e.setPosition({x: oldObject.x, y: oldObject.y}, false);
		});

		this.dataContainer.vertex.forEach(e => {
			const oldObject = _.find(dataContainer.vertex, {id: e.id});
			e.setPosition({x: oldObject.x, y: oldObject.y}, false);
		});

		setMinBoundaryGraph(this.dataContainer, this.svgId, this.viewMode.value);
	}
}

export default OperationsMgmt
