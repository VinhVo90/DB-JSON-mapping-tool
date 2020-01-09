import * as d3 from 'd3';
import _ from 'lodash';
import {
	PADDING_POSITION_SVG,
	VERTEX_ATTR_SIZE,
	CONNECT_TYPE,
	BOUNDARY_ATTR_SIZE,
	ACTION_TYPE,
	OBJECT_TYPE
} from '../const/index';
import { setMinBoundaryGraph, checkModePermission } from './common.util';
import HistoryElement from '../new-type-define/historyElement';

class ObjectUtils {
	/**
   * Return position object limit in SVG container
   * @param event d3
   * @param svg
   * @param objectId
   * @returns {{x: number, y: number}}
   */
	setPositionObjectJustInSvg(event, object) {
		// Limit left
		let x = event.x < PADDING_POSITION_SVG.MIN_OFFSET_X ? PADDING_POSITION_SVG.MIN_OFFSET_X : event.x;
		const y = event.y < PADDING_POSITION_SVG.MIN_OFFSET_Y ? PADDING_POSITION_SVG.MIN_OFFSET_Y : event.y;
    
		// limit right
		if (!checkModePermission(object.viewMode.value, 'horizontalScroll')) {
			let limitWidth = $(`${object.svgId}`).width();
			let {width} = this.getBBoxObject(object.id);
			if (x + width > limitWidth)
				x = limitWidth - width;
		}

		return {x, y};
	}

	/**
   * Get bbox object match with selector
   * @param selector
   * @returns {*}
   */
	getBBoxObject(selector) {
		const node = d3.select(`${selector}`);
		if (node)
      return node.node().getBBox();
      
		return null;
	}

	/**
   * Get coordinate prop relative to parent
   * The order is important
   * @param info => require, type: object, purpose: current coordinate of vertex
   * @param prop => require, type: string, purpose: prop need to calculate coordinate.
   * @param type => option, type: string, purpose: determined start or end connect
   * @param svg => require, type: string, purpose: determined the area that object did draw on it.
   * @returns {{x: *, y: number}}
   */
	getCoordPropRelativeToParent(info, prop, type) {
		if (!type)
			type = CONNECT_TYPE.OUTPUT;
		const {x, y, id, svgId: svg} = info;
		const axisX = x;
		let axisY = y;
		// Area draw element svg
		const containerSvg = $(`#${svg}`);
		// Parent id container the object SVG
		const parent = $(`#${svg}`).parent().attr('id');
		const parentSvg = $(`#${parent}`);

		if (!prop)
			return {
				x: axisX + containerSvg.offset().left + VERTEX_ATTR_SIZE.GROUP_WIDTH / 2,
				y: axisY - parentSvg.scrollTop()
			}

		if (prop.indexOf('boundary_title') != -1) {
			axisY = axisY + BOUNDARY_ATTR_SIZE.HEADER_HEIGHT / 2;

			return {
				x: type === CONNECT_TYPE.OUTPUT ? axisX + info.width + containerSvg.offset().left : axisX + containerSvg.offset().left,
				y: axisY - parentSvg.scrollTop()
			}
		} else if (prop.indexOf('title') != -1) {
			axisY = axisY + VERTEX_ATTR_SIZE.HEADER_HEIGHT / 2;

			return {
				x: type === CONNECT_TYPE.OUTPUT ? axisX + VERTEX_ATTR_SIZE.GROUP_WIDTH + containerSvg.offset().left : axisX + containerSvg.offset().left,
				y: axisY - parentSvg.scrollTop()
			}
		} else{
			// Get index prop in object
			const index = this.findIndexPropInVertex(id, prop);
			// Calculate coordinate of prop
			// Get coordinate
      axisY = axisY + VERTEX_ATTR_SIZE.HEADER_HEIGHT + index * VERTEX_ATTR_SIZE.PROP_HEIGHT + VERTEX_ATTR_SIZE.PROP_HEIGHT / 2;
      
			return {
				x: type === CONNECT_TYPE.OUTPUT ? axisX + VERTEX_ATTR_SIZE.GROUP_WIDTH + containerSvg.offset().left : axisX + containerSvg.offset().left,
				y: axisY - parentSvg.scrollTop()
			}
		}
	}

	/**
   * Find index of prop in vertex properties
   * @param vertexId
   * @param prop
   * @returns {number}
   */
	findIndexPropInVertex(vertexId, prop) {
		// Find index prop in object
		const arrayProp = d3.select(`#${vertexId}`).selectAll('.property:not(.hide)');
		const tmpArry = arrayProp._groups[0];
		const length = tmpArry.length;
		for (let i = 0; i < length; i++) {
			const e = tmpArry[i];
			if (d3.select(e).attr('prop') === prop) {
				return i;
			}
    }
    
		return null;
	}

  
	/**
   * When a vertex|boundary move
   * Resize if any boundary with size smaller than vertex|boundary size
   */
	reSizeBoundaryWhenObjectDragged(obj) {
		// Get box object
		const { width } = this.getBBoxObject(`#${obj.id}`);

		obj.dataContainer.boundary.forEach(boundary => {
			if (boundary.id != obj.id && !boundary.parent) {
				const boundaryBox = this.getBBoxObject(`#${boundary.id}`);

				if (width >= boundaryBox.width) {
					//2018.07.03 - Vinh Vo - save this height for restoring to origin size if the object not drag in/out this boundary
					boundary.startWidth = boundary.width;
					boundary.setWidth(width + 15);
					boundary.boundaryMgmt.edgeMgmt.updatePathConnectForVertex(boundary);
				}
			}
		})
	}

	/**
   * Check drag outside boundary
   */
	checkDragObjectOutsideBoundary(obj, state) {
		// Get box object
		const {id, parent} = obj;
		const {height, width} = this.getBBoxObject(`#${id}`);
		const xSrc = obj.x;
		const ySrc = obj.y;
		const wBSrc = xSrc + width;
		const hBSrc = ySrc + height;

		// Parent
		const {x, y} = _.find(obj.dataContainer.boundary,{'id':parent});
		const pBox = this.getBBoxObject(`#${parent}`);
		const xParent = x + pBox.width;
		const yParent = y + pBox.height;

		// Check drag outside a boundary
		if ((( wBSrc < x) || ( xParent < xSrc )) || ((hBSrc < y ) || ( yParent < ySrc ))) {
			const oldObject = obj.getObjectInfo();
			let parentObj = _.find(obj.dataContainer.boundary,{'id': parent});
			parentObj.removeMemberFromBoundary(obj, true, state);
			obj.parent = null;
			obj.childIndex = -1;

			if (state) {
				let he = new HistoryElement();
				he.actionType = ACTION_TYPE.PARENT_CHANGE;
				he.oldObject = oldObject;
				he.dataObject = obj.getObjectInfo();
				he.realObject = obj;
				state.add(he);
				
				return true;
			}
		}

		return false;
	}

	// Check drag inside boundary
	checkDragObjectInsideBoundary(obj, state) {
		let bIsInside = false;
		// Get box object
		const { width } = this.getBBoxObject(`#${obj.id}`);
		const xSrc = obj.x;
		const ySrc = obj.y;
		const wBSrc = xSrc + width;

		// Define method reverse
		const reverse = (input) => {
			let ret = new Array;
			for (let i = input.length - 1; i >= 0; i--) {
				ret.push(input[i]);
      }
      
			return ret;
		}

		// Cause: When multi boundary overlap that drags an object inside
		// then it will be added to => regulation add to the highest boundary
		const reverseBoundary = reverse(obj.dataContainer.boundary)
		reverseBoundary.forEach((item) => {
			if (!item.parent && item.id != obj.id && !obj.parent) {
				// Calculate box for boundary
				const xTar = item.x;
				const yTar = item.y;
				const bBoxTar = this.getBBoxObject(`#${item.id}`);
				const wBTar = xTar + bBoxTar.width;
				const hBTar = yTar + bBoxTar.height;

				if ((xSrc >= xTar) && (ySrc >= yTar) && (wBSrc <= wBTar) && (ySrc <= hBTar)) {
					const oldObject = obj.getObjectInfo();

					const index = this.getIndexFromPositionForObject(item, obj);
					item.addMemberToBoundaryWithIndex(obj, index, state);
					obj.parent = item.id;
					obj.childIndex = index;

					bIsInside = true;

					if (state) {
						let he = new HistoryElement();
						he.actionType = ACTION_TYPE.PARENT_CHANGE;
						he.oldObject = oldObject;
						he.dataObject = obj.getObjectInfo();
						he.realObject = obj;
						state.add(he);
					}
				}
			}
		})

		return bIsInside;
	}

	/**
   * @param obj Object drag
   * Function using change index of object in boundary parent when drag in boundary
   */
	changeIndexInBoundaryForObject(obj, state) {
		let oldObject = obj.getObjectInfo();

		const {parent} = obj;
		let parentObj = _.find(obj.dataContainer.boundary, {'id': parent});
		const indexOld = this.getIndexBy(parentObj.member, 'id', obj.id);
		const indexNew = this.getIndexFromPositionForObject(parentObj, obj);
		parentObj.changeIndexMemberToBoundary(indexOld, indexNew);
		obj.parent = parent;
		obj.childIndex = indexNew;
		oldObject.childIndex = indexOld;

		if(indexOld !== indexNew && state) {
			let he = new HistoryElement();
			he.actionType = ACTION_TYPE.MEMBER_INDEX_CHANGE;
			he.oldObject = oldObject;
			he.dataObject = obj.getObjectInfo();
			he.realObject = obj;
			state.add(he);
		}
	}

	/**
   * Get index of object from drop position
   * @param parentObj boundary tagert drop
   * @param obj Object drap
   * Function using get index for insert to boundary
   */
	getIndexFromPositionForObject(parentObj, obj) {
		const ySrc = obj.y;
		let index = 0;

		const memberAvailable = _.filter(parentObj.member, (e) => {
			return e.show === true;
		});

		for (const mem of memberAvailable) {
			let memObj = null;
			if(mem.type === OBJECT_TYPE.VERTEX) {
				memObj = _.find(parentObj.dataContainer.vertex,{'id': mem.id});
			}else{
				memObj = _.find(parentObj.dataContainer.boundary,{'id': mem.id});
			}

			const {y} = memObj;

			if (y > ySrc) {
				break;
			}

			if (mem.id === obj.id) continue;
			index += 1;
		}

		return index;
	}

	/**
   * Restore back the old size, dragingObject do not drag in/out these boundaries
   * @param {*} dragingObject
   */
	restoreSizeBoundary(dragingObject) {
		dragingObject.dataContainer.boundary.forEach(boundary => {
			//do not restore for parent, it was resize by checkDragObjectOutsideBoundary() or checkDragObjectInsideBoundary()
			if (boundary.id != dragingObject.id && (boundary.id != dragingObject.parent)) {
				if (boundary.startHeight != -1) {
					boundary.setHeight(boundary.startHeight);
				}

				if(boundary.startWidth != -1) {
					boundary.setWidth(boundary.startWidth);
					boundary.boundaryMgmt.edgeMgmt.updatePathConnectForVertex(boundary);
				}
			}

			boundary.startHeight = -1;
			boundary.startWidth = -1;
		})
	}

	/**
   * @param arr Array object
   * @param name key compare
   * @param value value compare
   * @return i (index of object match condition)
   */
	getIndexBy(arr, name, value) {
		for (let i = 0; i < arr.length; i++) {
			if (arr[i][name] == value) {
				return i;
			}
		}
		return -1
	}

	/** 
   * @param dataContainer from import 
   * Set all children of this boundary to show
   */
	setAllChildrenToShow(dataContainer) {
		// Set all children of this boundary to show
		const arrBoundary = dataContainer.boundary
		arrBoundary.forEach(boundary => {
			const members = boundary.member
			members.forEach(member => {
				member.show = true;

				if (member.type === OBJECT_TYPE.VERTEX) {
					_.find(dataContainer.vertex, {id: member.id}).show = true;
				} else if (member.type === OBJECT_TYPE.BOUNDARY) {
					_.find(dataContainer.boundary, {id: member.id}).show = true;
				}
			})
		})
	}

	/**
   * Handle show/hide edge while scroll
   * @param {*} containerId Id of container div
   * @param {*} edgeMgmt 
   * @param {*} arrDataContainer each SVG area has a dataContainer, this array store all dataContainer of those SVG. Purpur
   */
	initListenerContainerScroll(containerId, edgeMgmt, arrDataContainer) {
		$(`#${containerId}`).on('scroll', (e) => {
			const svgId = $(e.target).attr('ref');
			this.onContainerSvgScroll(svgId, edgeMgmt, arrDataContainer);
		})
	}

	onContainerSvgScroll(pSvgId, edgeMgmt, arrDataContainer) {

		if (edgeMgmt.isSelectingEdge()) {
			edgeMgmt.cancleSelectedPath();
		}

		let vertices = [];
		for (var i = 0; i < arrDataContainer.length; i++) {
			vertices = vertices.concat(arrDataContainer[i].vertex);
			vertices = vertices.concat(arrDataContainer[i].boundary);
		}
    
		// Find edge start from this SVG
		const srcEdges = _.filter(edgeMgmt.dataContainer.edge, (e) => {
			return e.source.svgId === pSvgId;
		});
    
		// Find edge end at this SVG
		const desEdges = _.filter(edgeMgmt.dataContainer.edge, (e) => {
			return e.target.svgId === pSvgId;
		});

		srcEdges.forEach(e => {
			const {source: {vertexId: id, prop}} = e;
			const obj = _.find(vertices, {'id': id});
			const {x: propX, y: propY} = this.getCoordPropRelativeToParent(obj, prop, CONNECT_TYPE.OUTPUT);
			e.source.x = propX;
			e.source.y = propY;
			const options = {source: e.source};
			e.updatePathConnect(options);
			e.setStatusEdgeOnCurrentView();
		})

		desEdges.forEach(e => {
			const {target: {vertexId: id, prop}} = e;
			const obj = _.find(vertices, {'id': id});
			const {x: propX, y: propY} = this.getCoordPropRelativeToParent(obj, prop, CONNECT_TYPE.INPUT);
			e.target.x = propX;
			e.target.y = propY;
			const options = {target: e.target};
			e.updatePathConnect(options);
			e.setStatusEdgeOnCurrentView();
		})
	}

	initListenerOnWindowResize(edgeMgmt, arrDataContainer) {
		$(window).resize(() => {
			if(edgeMgmt.isSelectingEdge()) {
				edgeMgmt.cancleSelectedPath();
			}

			this.updatePathConnectOnWindowResize(edgeMgmt, arrDataContainer);
		})
	}

	updatePathConnectOnWindowResize(edgeMgmt, arrDataContainer) {
		const edges = edgeMgmt.dataContainer.edge;
		let vertices = []
		for (var i = 0; i < arrDataContainer.length; i++) {
			vertices = vertices.concat(arrDataContainer[i].vertex);
			vertices = vertices.concat(arrDataContainer[i].boundary);
		}

		edges.forEach(e => {
			const {source: {vertexId: idSrc, prop: propSrc}, target: {vertexId: idDes, prop: propDes}} = e;
			const srcObj = _.find(vertices, {'id': idSrc});
			const {x: newSX, y: newSY} = this.getCoordPropRelativeToParent(srcObj, propSrc, CONNECT_TYPE.OUTPUT);
			e.source.x = newSX;
			e.source.y = newSY;

			const desObj = _.find(vertices, {'id': idDes});
			const {x: newDX, y: newDY} = this.getCoordPropRelativeToParent(desObj, propDes, CONNECT_TYPE.INPUT);
			e.target.x = newDX;
			e.target.y = newDY;

			const options = {source: e.source, target: e.target};
			e.updatePathConnect(options);
			e.setStatusEdgeOnCurrentView();
		})
	}

	/**
   * Show boundary, vertex reduced as policy
   * Show graph elements connected by edges only
   * Boundary: show vertices which have any edges only and boundaries
   * Vertex: The vertices in group SHOW_FULL_ALWAYS not effected by show reduced
   * The remain vertex then show header and connected properties only
   */
	showReduced(dataContainer, svgId, viewMode, state) {
		dataContainer.vertex.forEach(vertex => {
			vertex.showReduced(state);
		});

    if (dataContainer.boundary.length > 0)
      this.updateHeightBoundary(dataContainer);
    
		setMinBoundaryGraph(dataContainer, svgId, viewMode);
	}

	/**
   * Show full graph
   */
	showFull(dataContainer, svgId, viewMode, state) {
		dataContainer.vertex.forEach(vertex => {
			vertex.showFull(state);
		});

		if (dataContainer.boundary.length > 0)
      this.updateHeightBoundary(dataContainer);

		setMinBoundaryGraph(dataContainer, svgId, viewMode);
	}

	/**
   * Calculate height vertex base on properties connectted
   * @param id
   * @param isShowFull used in case vertex just have header.
   * @returns {number}
   */
	resetSizeVertex(dataContainer, isShowFull = false) {
		const vertices = dataContainer.vertex;
		vertices.forEach(vertex => {
			let exitConnect = false;
			const vertexId = vertex.id;
			// Get all prop that not hide
			const arrProp = d3.select(`#${vertexId}`).selectAll('.property:not(.hide)');
			const tmpArry = arrProp._groups[0];
			// When not any edge connect to properties of vertex,
			// Check exit edge connect to vertex
			if (tmpArry.length < 1)
				exitConnect = vertex.vertexMgmt.edgeMgmt.checkExitEdgeConnectToVertex(vertexId);

			const element = $(`#${vertexId} .vertex_content`);
			element.parent()
				.attr('height', tmpArry.length ?
					VERTEX_ATTR_SIZE.HEADER_HEIGHT + VERTEX_ATTR_SIZE.PROP_HEIGHT * tmpArry.length : isShowFull ?
						VERTEX_ATTR_SIZE.HEADER_HEIGHT : exitConnect ? VERTEX_ATTR_SIZE.HEADER_HEIGHT : VERTEX_ATTR_SIZE.HEADER_HEIGHT);
		});
	}

	/**
   * Update position of "rect" connect on vertex
   * @param arrProp
   * @param vertex
   */
	updatePositionRectConnect(arrProp, vertex) {
		for (var i = 0; i < arrProp.length; i++) {
			const prop = arrProp[i];
			if (prop != null) {
				//get new index of this property in vertex after hiding all properties have no edge connected for updatting new position of "rect"
				const newIndexOfPropInVertex = this.findIndexPropInVertex(vertex.id, prop);
				const newY = VERTEX_ATTR_SIZE.HEADER_HEIGHT + VERTEX_ATTR_SIZE.PROP_HEIGHT * newIndexOfPropInVertex + 1;

				//update position of "rect"
				d3.select(`#${vertex.id}`).selectAll(`:not(.property)[prop=${prop}]`).attr('y', newY);
			}
		}
	}

  /**
   * update size for all root boundary
   */
  updateHeightBoundary(dataContainer) {
    const boundaries = _.filter(dataContainer.boundary, (g) => {
      return g.parent === null && g.member.length > 0;
    });

    boundaries.forEach(boundary => {
      boundary.updateSize();
      boundary.reorderPositionMember();
    });
  }
}

export default ObjectUtils;
