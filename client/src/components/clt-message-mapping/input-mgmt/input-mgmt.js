import MainMenu from '../../common-objects/menu-context/main-menu';
import VertexMgmt from '../../common-objects/objects/vertex-mgmt';
import BoundaryMgmt from '../../common-objects/objects/boundary-mgmt';
import ObjectUtils from '../../../common/utilities/object.util';
import FindMenu from '../../common-objects/menu-context/find-menu';
import State from '../../../common/new-type-define/state';
import { setSizeGraph, isPopupOpen } from '../../../common/utilities/common.util';
import HistoryElement from '../../../common/new-type-define/historyElement';

import {
	CONNECT_SIDE,
	DEFAULT_CONFIG_GRAPH,
	VIEW_MODE,
	ACTION_TYPE,
} from '../../../common/const/index';

class InputMgmt {
	constructor(props) {
		this.edgeMgmt = props.edgeMgmt;
		this.dataContainer = props.dataContainer;
		this.containerId = props.containerId;
		this.svgId = props.svgId;
		this.isShowReduced = false;
		this.viewMode = {value: VIEW_MODE.INPUT_MESSAGE};
		this.history = props.history;

		this.mouseX = -1;
		this.mouseY = -1;

		this.initialize();
	}

	initialize() {

		this.objectUtils = new ObjectUtils();

		this.defaultOptionsVertex = {
			connectSide: CONNECT_SIDE.RIGHT,
		};

		this.vertexMgmt = new VertexMgmt({
			mainParent: this,
			dataContainer : this.dataContainer,
			containerId : this.containerId,
			svgId : this.svgId,
			viewMode: this.viewMode,
			connectSide: CONNECT_SIDE.RIGHT,
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

		this.initShortcutKeyEvent();
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

		// Create menu by Ctrl+F
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
      }
  	});
	}

	drawObjectsOnInputGraph(data) {
		this.isShowReduced = false;
    
		const { boundary: boundaries, vertex: vertices, position } = data;
		// Draw boundary
		boundaries.forEach(e => {
			const { x, y } = position.find(pos => {
				return pos.id === e.id;
			});

			e.x = x
			e.y = y
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

		this.setCenterAlignmentGarph();
	}

	clearAll() {
		this.vertexMgmt.clearAll();
		this.boundaryMgmt.clearAll();

		setSizeGraph({ height: DEFAULT_CONFIG_GRAPH.MIN_HEIGHT }, this.svgId);
	}

	showReduced() {
		const state = new State();

		this.isShowReduced = true;
		this.objectUtils.showReduced(this.dataContainer, this.svgId, this.viewMode.value, state);

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
		this.objectUtils.showFull(this.dataContainer, this.svgId, this.viewMode.value, state);

		if (this.history) {
			const he = new HistoryElement();
			he.actionType = ACTION_TYPE.UPDATE_SHOW_FULL_STATUS;
			he.realObject = this;
			state.add(he);
			this.history.add(state);
		}
	}

	/**
   * set position graph by center align
   */
	setCenterAlignmentGarph() {
		const parentBoundary = _.find(this.dataContainer.boundary, {'parent': null});

		const rightScrollWidth = 10;
		const marginTop = 10;
		const marginLeft = 5;
		const marginRight = 5;

		let newX = marginLeft;
		const newY = marginTop;

		if (parentBoundary) {
			$('.left-svg').css('width', parentBoundary.width + rightScrollWidth + marginLeft + marginRight);
			$('.middle-svg').css('left', parentBoundary.width + rightScrollWidth + marginLeft + marginRight);

			const inputRec = $('.left-svg')[0].getBoundingClientRect();
			const outputRec = $('.right-svg')[0].getBoundingClientRect();
			$('.middle-svg').css('width', `calc(100% - ${inputRec.width + outputRec.width}px)`);

			const containerRect = $(`#${parentBoundary.svgId}`)[0].parentNode.getBoundingClientRect();

			if ( containerRect.width - rightScrollWidth - marginLeft - marginRight >= parentBoundary.width ) {
				newX = newX + ((containerRect.width - rightScrollWidth  - marginLeft - marginRight - parentBoundary.width) / 2);
			}

			const offsetX = newX - parentBoundary.x;
      const offsetY = newY - parentBoundary.y;
			if (offsetX != 0 || offsetY != 0) {
				parentBoundary.move(offsetX, offsetY);
			}
		}
	}

	processDataVertexTypeDefine(vertexDefinitionData) {
		this.vertexMgmt.processDataVertexTypeDefine(vertexDefinitionData);
	}

	setWindowMousePoint(x, y) {
		this.mouseOnWindowX = x;
		this.mouseOnWindowY = y;
	}
}

export default InputMgmt
