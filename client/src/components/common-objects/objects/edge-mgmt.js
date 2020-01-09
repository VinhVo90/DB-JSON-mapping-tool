import * as d3 from 'd3';
import _ from 'lodash';
import Edge from './edge';
import ObjectUtils from '../../../common/utilities/object.util';
import EdgeMenu from '../menu-context/edge-menu';
import State from '../../../common/new-type-define/state';
import HistoryElement from '../../../common/new-type-define/historyElement';

import {
  CONNECT_TYPE, ACTION_TYPE, OBJECT_TYPE,
} from '../../../common/const/index';

import {
  createPath, filterPropertyData,
} from '../../../common/utilities/common.util';

const CONNECT_KEY = 'Connected';
const FOCUSED_CLASS = 'focused-object';

class EdgeMgmt {
  constructor(props) {
    this.dataContainer = props.dataContainer;
    this.svgId = props.svgId;
    this.vertexContainer = props.vertexContainer;
    this.history = props.history;

    this.initialize();
  }

  initialize() {
    this.objectUtils = new ObjectUtils();
    this.svgSelector = d3.select(`#${this.svgId}`);

    this.selectorClass = `_edge_${this.svgId}`;
    this.arrowId = `arrow_${this.svgId}`;
    this.groupEdgePathId = `groupEdgePath_${this.svgId}`;
    this.edgePathId = `edgePath_${this.svgId}`;
    this.groupEdgePointId = `groupEdgePoint_${this.svgId}`;
    this.pointStartId = `pointStart_${this.svgId}`;
    this.pointEndId = `pointEnd_${this.svgId}`;
    this.dummyPathId = `dummyPath_${this.svgId}`;

    this.isCreatingEdge = false;
    this.tmpSource = null;
    this.selectingEdge = null;


    this.dragPointConnector = d3.drag()
      .on('start', this.dragPointStarted(this))
      .on('drag', this.draggedPoint(this))
      .on('end', this.dragPointEnded(this));

    this.handleDragConnection = d3.drag()
      .on('start', this.startConnect(this))
      .on('drag', this.drawConnect(this))
      .on('end', this.endConnect(this));

    this.svgSelector = d3.select(`#${this.svgId}`);

    this.initMarkerArrow();
    this.initPathConnect();
    this.initEdgePath();

    new EdgeMenu({
      selector: `.${this.selectorClass}`,
      dataContainer: this.dataContainer,
      edgeMgmt: this,
      history: this.history,
    });
  }

  /**
   * Init Marker Arrow use for edge
   */
  initMarkerArrow() {
    this.svgSelector.append('svg:defs').append('svg:marker')
      .attr('id', this.arrowId)
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 10)
      .attr('refY', 5)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M 0 0 L 10 5 L 0 10 z')
      .style('stroke', 'black');
  }

  /**
   * Init path connect used to create path
   */
  initPathConnect() {
    this.svgSelector.append('svg:g').append('svg:path')
      .attr('id', `${this.dummyPathId}`)
      .attr('class', 'dummy-edge solid')
      .attr('fill', 'none')
      .attr('marker-end', `url(#${this.arrowId})`);
  }

  /**
   * Init path use for simulate change source or target connect
   */
  initEdgePath() {
    const group = this.svgSelector.append('g')
      .attr('transform', 'translate(0.5, 0.5)')
      .attr('id', this.groupEdgePathId);
    group.append('path')
      .attr('id', this.edgePathId)
      .attr('class', 'dummy-path dash')
      .attr('fill', 'none')
      .attr('stroke', '#2795EE');
    const groupPoint = this.svgSelector.append('g')
      .attr('transform', 'translate(0.5, 0.5)')
      .attr('id', this.groupEdgePointId);
    groupPoint.append('circle')
      .attr('id', this.pointStartId)
      .attr('class', `dragPoint dragPoint_${this.svgId}`)
      .attr('type', CONNECT_TYPE.OUTPUT)
      .attr('fill', '#2795EE')
      .attr('pointer-events', 'all')
      .attr('r', 4)
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .attr('stroke', '#2795EE');

    groupPoint.append('circle')
      .attr('id', this.pointEndId)
      .attr('class', `dragPoint dragPoint_${this.svgId}`)
      .attr('type', CONNECT_TYPE.INPUT)
      .attr('fill', '#2795EE')
      .attr('pointer-events', 'all')
      .attr('r', 4)
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .attr('stroke', '#2795EE');

    d3.selectAll(`.dragPoint_${this.svgId}`).call(this.dragPointConnector);
    d3.select(`#${this.groupEdgePointId}`).style('display', 'none');
  }

  /**
   *
   * @param options
   * source: object, required {x: 1, y: 2, vertexId: 'V***', prop: 'spd'}
   * target: object, required {x: 1, y: 2, vertexId: 'V***', prop: 'spd'}
   * note: object, option {originNote: 'src', middleNote: 'to', destNote: 'des'}
   * style: object, option {line: 'solid', arrow: 'Y'} | line: solid, dash; arrow: Y, N
   * id: string, option E*********
   * Ex
   */
  create(sOptions) {
    const newEdge = new Edge({
      edgeMgmt: this,
    });

    return newEdge.create(sOptions);
  }

  dragPointStarted(main) {
    return function () {
    };
  }

  /**
   * Drag connect belong to mouse position
   * @param self
   * @returns {Function}
   */
  draggedPoint(main) {
    return function () {
      let pathStr = null;
      const x = d3.mouse(main.svgSelector.node())[0];
      const y = d3.mouse(main.svgSelector.node())[1];
      const type = d3.select(this).attr('type');
      if (type === 'O') {
        const px = Number(d3.select(`#${main.pointEndId}`).attr('cx'));
        const py = Number(d3.select(`#${main.pointEndId}`).attr('cy'));
        pathStr = createPath({ x, y }, { x: px, y: py });
      } else {
        const px = Number(d3.select(`#${main.pointStartId}`).attr('cx'));
        const py = Number(d3.select(`#${main.pointStartId}`).attr('cy'));
        pathStr = createPath({ x: px, y: py }, { x, y });
      }

      d3.select(`#${main.edgePathId}`).attr('d', pathStr);
      d3.select(`#${main.groupEdgePathId}`).style('display', 'block');
    };
  }

  /**
   * End creation connect if destination is connect point
   * @param self
   * @returns {Function}
   */
  dragPointEnded(main) {
    return function () {
      // Editing edge
      const edgeId = d3.select(`#${main.edgePathId}`).attr('ref');
      const edgeObj = _.find(main.dataContainer.edge, { id: edgeId });

      if (d3.event.sourceEvent.target.tagName == 'rect') {
        // Data use for processing
        const pointType = d3.select(this).attr('type');
        const dropVertexId = d3.select(d3.event.sourceEvent.target.parentNode).attr('id');
        const prop = d3.select(d3.event.sourceEvent.target).attr('prop');

        // Prevent drag on same vertex
        if ((pointType === 'O' && edgeObj.target.vertexId == dropVertexId)
            || (pointType === 'I' && edgeObj.source.vertexId == dropVertexId))
        {
          main.handlerOnClickEdge(main.selectingEdge);
          return;
        }
        
        const oldEdgeObj = {
          source: _.cloneDeep(main.selectingEdge.source),
          target: _.cloneDeep(main.selectingEdge.target),
        };

        let vertices = [];
        main.vertexContainer.forEach((arrVertex) => {
          vertices = vertices.concat(arrVertex.vertex);
          vertices = vertices.concat(arrVertex.boundary);
        });

        // Vertex that draged to
        const targetObj = _.find(vertices, { id: dropVertexId });
        const { svgId } = targetObj;

        // Calculate new coordinate of ended point on CONNECT SVG for redraw edge
        const newPoint = main.objectUtils.getCoordPropRelativeToParent(targetObj, prop, pointType);
        newPoint.vertexId = dropVertexId;
        newPoint.prop = prop;
        newPoint.svgId = svgId;

        if (pointType === 'O') {
          edgeObj.updateMarkedConnector({ source: newPoint });
          edgeObj.updatePathConnect({ source: newPoint });
        } else {
          // get old object before updating
          const oldObj = _.find(vertices, { id: edgeObj.target.vertexId });

          edgeObj.updateMarkedConnector({ target: newPoint });
          edgeObj.updatePathConnect({ target: newPoint });

          // check mandatory data element for target vertex only (Output message of Message Mapping GUI)

          if (oldObj.type == OBJECT_TYPE.VERTEX) {
            oldObj.validateConnectionByUsage();
          }

          // If move target connection to another vertex then checking for new vertex
          if (targetObj.id != oldObj.id && targetObj.type == OBJECT_TYPE.VERTEX) {
            targetObj.validateConnectionByUsage();
          }
        }

        // Create history
        if (main.history) {
          const state = new State();
          const he = new HistoryElement();
          he.actionType = ACTION_TYPE.CONNECTOR_CHANGE;
          he.oldObject = oldEdgeObj;
          he.dataObject = {
            source: _.cloneDeep(main.selectingEdge.source),
            target: _.cloneDeep(main.selectingEdge.target),
          };
          he.realObject = main.selectingEdge;

          state.add(he);
          main.history.add(state);
        }
      }

      main.handlerOnClickEdge(main.selectingEdge);
    }
  }

  startConnect(main) {
    return function () {
      if (main.isSelectingEdge()) { main.cancleSelectedPath(); }

      main.isCreatingEdge = true;
      const prop = d3.select(d3.event.sourceEvent.target).attr('prop');
      const vertexId = d3.select(d3.event.sourceEvent.target.parentNode).attr('id');

      let obj;
      if (prop.indexOf('boundary_title') != -1) {
        let boudaries = [];
        main.vertexContainer.forEach((arrBoundary) => {
          boudaries = boudaries.concat(arrBoundary.boundary);
        });

        obj = _.find(boudaries, { id: vertexId });

      } else {
        let vertices = [];
        main.vertexContainer.forEach((arrVertex) => {
          vertices = vertices.concat(arrVertex.vertex);
        });

        obj = _.find(vertices, { id: vertexId });
      }

      const src = main.objectUtils.getCoordPropRelativeToParent(obj, prop, CONNECT_TYPE.OUTPUT);
      src.vertexId = vertexId;
      src.prop = prop;
      src.svgId = obj.svgId;
      main.tmpSource = src;
    };
  }

  drawConnect(main) {
    return function () {
      if (main.isCreatingEdge) {
        const { x: x1, y: y1 } = main.tmpSource;
        const x2 = d3.mouse(d3.select(`#${main.svgId}`).node())[0];
        const y2 = d3.mouse(d3.select(`#${main.svgId}`).node())[1];
        const pathStr = createPath({ x: x1, y: y1 }, { x: x2, y: y2 });
        d3.select(`#${main.dummyPathId}`).attr('d', pathStr);
        d3.select(`#${main.dummyPathId}`).style('display', 'block');
      }
    };
  }

  endConnect(main) {
    return function () {
      main.isCreatingEdge = false;
      if (d3.event.sourceEvent.target.tagName == 'rect'
          && this != d3.event.sourceEvent.target
					&& d3.select(d3.event.sourceEvent.target.parentNode).attr('id') != main.tmpSource.vertexId
      ) {
        const vertextId = d3.select(d3.event.sourceEvent.target.parentNode).attr('id');
        const prop = d3.select(d3.event.sourceEvent.target).attr('prop');

        let vertices = [];
        main.vertexContainer.forEach((arrVertex) => {
          vertices = vertices.concat(arrVertex.vertex);
          vertices = vertices.concat(arrVertex.boundary);
        });

        const obj = _.find(vertices, { id: vertextId });
        const des = main.objectUtils.getCoordPropRelativeToParent(obj, prop, CONNECT_TYPE.INPUT);
        des.vertexId = vertextId;
        des.prop = prop;
        des.svgId = obj.svgId;
        const options = { source: main.tmpSource, target: des };

        const edgeObj = main.create(options);

        if (main.history) {
          const state = new State();
          const he = new HistoryElement();
          he.actionType = ACTION_TYPE.CREATE;
          he.dataObject = edgeObj.getObjectInfo();
          he.realObject = edgeObj;
          state.add(he);
          main.history.add(state);
        }
      }

      d3.select(`#${main.dummyPathId}`).attr('d', null);
      d3.select(`#${main.dummyPathId}`).style('display', 'none');
      main.tmpSource = null;
    }
  }

  /**
  * Find and update position connect to vertex when in move
  * @param vertex
  * @param dataContainer edge container
  */
  updatePathConnectForVertex(vertex) {
    const { id } = vertex;

    // Find edge start from this vertex
    const arrSrcPaths = _.filter(this.dataContainer.edge, e => e.source.vertexId === id);
    // Find edge end at this vertex
    const arrDesPaths = _.filter(this.dataContainer.edge, e => e.target.vertexId === id);

    arrSrcPaths.forEach((src) => {
      const prop = src.source.prop;
      const newPos = this.objectUtils.getCoordPropRelativeToParent(vertex, prop, CONNECT_TYPE.OUTPUT);
      src.source.x = newPos.x;
      src.source.y = newPos.y;
      const options = { source: src.source };
      src.updatePathConnect(options);
      src.setStatusEdgeOnCurrentView();
    });

    arrDesPaths.forEach((des) => {
      const prop = des.target.prop;
      const newPos = this.objectUtils.getCoordPropRelativeToParent(vertex, prop, CONNECT_TYPE.INPUT);
      des.target.x = newPos.x;
      des.target.y = newPos.y;
      const options = { target: des.target };
      des.updatePathConnect(options);
      des.setStatusEdgeOnCurrentView();
    });
  }

  /**
   *
   * @param {*} vertex
   */
  emphasizePathConnectForVertex(vertex, isEffectFromParent = false) {
    const { id } = vertex;

    if (!isEffectFromParent) {
      d3.selectAll('.emphasizePath').classed('emphasizePath', false);
      d3.selectAll('.emphasizeArrow').classed('emphasizeArrow', false);
    }

    // Find edge start from this vertex
    const arrSrcPaths = _.filter(this.dataContainer.edge, e => e.source.vertexId === id);
    // Find edge end at this vertex
    const arrDesPaths = _.filter(this.dataContainer.edge, e => e.target.vertexId === id);

    arrSrcPaths.forEach((src) => {
      src.emphasize();
    });

    arrDesPaths.forEach((des) => {
      des.emphasize();
    });
  }

  /**
   *
   * @param {*} boundary
   */
  emphasizePathConnectForBoundary(boundary, isEffectFromParent = false) {
    const { id } = boundary;

    if (!isEffectFromParent) {
      d3.selectAll('.emphasizePath').classed('emphasizePath', false);
      d3.selectAll('.emphasizeArrow').classed('emphasizeArrow', false);
    }

    // Find edge start from this vertex
    const arrSrcPaths = _.filter(this.dataContainer.edge, e => e.source.vertexId === id);
    // Find edge end at this vertex
    const arrDesPaths = _.filter(this.dataContainer.edge, e => e.target.vertexId === id);

    arrSrcPaths.forEach((src) => {
      src.emphasize();
    });

    arrDesPaths.forEach((des) => {
      des.emphasize();
    });

    boundary.member.forEach((e) => {
      if (e.type === OBJECT_TYPE.VERTEX) {
        let vertices = [];
        this.vertexContainer.forEach((e) => {
          vertices = vertices.concat(e.vertex);
        });

        const childVertex = _.find(vertices, { id: e.id });
        this.emphasizePathConnectForVertex(childVertex, true);
      } else {
        let boudaries = [];
        this.vertexContainer.forEach((e) => {
          boudaries = boudaries.concat(e.boundary);
        });
        const childBoundary = _.find(boudaries, { id: e.id });
        this.emphasizePathConnectForBoundary(childBoundary, true);
      }
    });
  }

  /**
   *
   * @param {*} vertex
   */
  cancelAllEmphasizePathConnect() {
    d3.selectAll('.emphasizePath').classed('emphasizePath', false);
    d3.selectAll('.emphasizeArrow').classed('emphasizeArrow', false);
  }

  clearAll(state) {
    const oldDataContainer = {
      edge: filterPropertyData(this.dataContainer.edge, [], ['dataContainer'])
    }

    this.dataContainer.edge = [];
    d3.select(`#${this.svgId}`).selectAll(`.${this.selectorClass}`).remove();
    d3.select(`#${this.svgId}`).select('defs').selectAll(`marker:not(#${this.arrowId})`).remove();
    d3.selectAll('.marked_connector').classed('marked_connector', false);

    if (state) {
      const he = new HistoryElement();
			he.actionType = ACTION_TYPE.CLEAR_ALL_EDGE;
			he.dataObject = oldDataContainer;
			he.realObject = this;
			state.add(he);
    }
  }

  /**
   * Remove edge connect to this vertexs
   * @param vertex vertex list
   */
  removeAllEdgeConnectToVertex(vertex, state) {
    this.findEdgeRelateToVertex(vertex.id).forEach((edge) => {
      edge.remove(state);
    });
  }

  /**
   * Remove edge connect to these vertexs
   * @param vertex vertex list
   */
  removeAllEdgeConnectToTheseVertex(lstVertex) {
    lstVertex.forEach((e) => {
      this.findEdgeRelateToVertex(e.id).forEach((edge) => {
        edge.remove();
      });
    });
  }

  /**
   * Find all path (edge, connect) start or end at this vertex
   * @param vertexId
   * @returns {Array}
   */
  findEdgeRelateToVertex(vertexId) {
    if (!vertexId) { return []; }

    return _.filter(this.dataContainer.edge, e => e.target.vertexId === vertexId || e.source.vertexId === vertexId,
    );
  }

  checkExitEdgeConnectToVertex(vertexId) {
		const numEdges = this.findEdgeRelateToVertex(vertexId);
    if (numEdges.length)
			{return true;}
    return false;
  }

  /**
   * Remove edge that lost prop connect on vertex edit
   * @param vertex
   */
  removeEdgeLostPropOnVertex(vertex) {
    // Find edge start from this vertex
    const arrSrcPaths = _.filter(this.dataContainer.edge, e => e.source.vertexId === vertex.id);

    // Find edge end at this vertex
    const arrDesPaths = _.filter(this.dataContainer.edge, e => e.target.vertexId === vertex.id);

    arrSrcPaths.forEach((src) => {
      const { source: { prop, vertexId } } = src;

      if (prop.indexOf('title') == -1 && this.objectUtils.findIndexPropInVertex(vertexId, prop) === null) { src.remove() }
    });

    arrDesPaths.forEach((des) => {
      const { target: { prop, vertexId } } = des;

      if (prop.indexOf('title') == -1 && this.objectUtils.findIndexPropInVertex(vertexId, prop) === null) { des.remove();}
    });
  }

  setVisibleAllEdgeRelatedToObject(vertexId, flag) {
    // Edges connect to this vertexId
    const edgesConnectTo = _.filter(this.dataContainer.edge, e => e.target.vertexId === vertexId);

    // Edges connect from this vertexId
    const edgesConnectFrom = _.filter(this.dataContainer.edge, e => e.source.vertexId === vertexId);

    // All vertex and boundary
    let vertices = [];
    this.vertexContainer.forEach((arrVertex) => {
    vertices = vertices.concat(arrVertex.vertex);
    vertices = vertices.concat(arrVertex.boundary);
    });

    // list of object that connect to this vertexId
    let listOfObject = [];
    edgesConnectTo.forEach((e) => {
      if (flag) {
        let sourceObject = _.find(listOfObject, {id: e.source.vertexId});
        if (!sourceObject) {
          sourceObject = _.find(vertices, {id: e.source.vertexId});
          listOfObject.push(sourceObject);
        }

        // just show an edge when both source object and target object are showed
        if (sourceObject.show) {
          e.visible(flag);  
        }

      } else {
        e.visible(flag);
      }
    });

    listOfObject = [];
    edgesConnectFrom.forEach((e) => {
      if (flag) {
        let targetObject = _.find(listOfObject, {id: e.target.vertexId});
        if (!targetObject) {
          targetObject = _.find(vertices, {id: e.target.vertexId});
          listOfObject.push(targetObject);
        }

        // just show an edge when both source object and target object are showed
        if (targetObject.show) {
          e.visible(flag);  
        }

      } else {
        e.visible(flag);
      }
    });
  }

  isSelectingEdge() {
    return this.selectingEdge != null;
  }

  /**
   * Handler on click a path connection
   * @param edgeId
   * @param source
   * @param target
   */
  handlerOnClickEdge(edge) {
    // unfocus to object if existed focused object
    d3.select(`.${FOCUSED_CLASS}`).classed(FOCUSED_CLASS, false);
    this.cancelAllEmphasizePathConnect();

    this.selectingEdge = edge;

    const selected = d3.select(`#${edge.id}`);
    const currentPath = selected.attr('d');
    d3.select(`#${this.groupEdgePointId}`)
      .style('display', 'block')
      .moveToFront();
    d3.select(`#${this.groupEdgePathId}`)
      .style('display', 'block')
      .moveToFront();
    d3.select(`#${this.edgePathId}`)
      .attr('d', currentPath)
      .attr('ref', edge.id);

    d3.select(`#${this.pointStartId}`)
      .attr('cx', edge.source.x)
      .attr('cy', edge.source.y);
    d3.select(`#${this.pointEndId}`)
      .attr('cx', edge.target.x)
      .attr('cy', edge.target.y);
  }

  cancleSelectedPath() {
    this.selectingEdge = null;

    this.hideEdgeGroupPoint();
    this.hideEdgeGroupPath();

  }

  hideEdgeGroupPoint() {
    d3.select(`#${this.groupEdgePointId}`).style('display', 'none');
    d3.select(`#${this.groupEdgePointId}`).moveToBack();
  }

  hideEdgeGroupPath() {
    d3.select(`#${this.groupEdgePathId}`).style('display', 'none');
    d3.select(`#${this.groupEdgePathId}`).moveToBack();
  }

  /**
	 * Update connector position after reordering data elements
	 * @param {*} vertexId
	 * @param {*} arrPosition array connectors were changed position
	 */
  updateConnectorPositionRelatedToVertex(vertexId, arrPosition, state) {
    // Find edge start from this vertex
    const arrSrcPaths = _.filter(this.dataContainer.edge, e => e.source.vertexId === vertexId && e.source.prop.indexOf('title') == -1);

    // Find edge end at this vertex
    const arrDesPaths = _.filter(this.dataContainer.edge, e => e.target.vertexId === vertexId && e.target.prop.indexOf('title') == -1);

    arrSrcPaths.forEach((edge) => {
      const oldIndex = edge.source.prop.replace(`${vertexId}${CONNECT_KEY}`, '');
      const newIndex = arrPosition.indexOf(oldIndex);

      if (newIndex == -1) {
        edge.remove(state);
      } else if (newIndex != parseInt(oldIndex)) {
        const oldEdgeObj = edge.getObjectInfo();

        edge.source.prop = `${vertexId}${CONNECT_KEY}${newIndex}`;

        if (state) {
          const he = new HistoryElement();
          he.actionType = ACTION_TYPE.CONNECTOR_CHANGE;
          he.oldObject = oldEdgeObj;
          he.dataObject = {
            source: _.cloneDeep(edge.source),
            target: _.cloneDeep(edge.target),
          };
          he.realObject = edge;
          state.add(he);
        }
      }
    });

    arrDesPaths.forEach((edge) => {
      const oldIndex = edge.target.prop.replace(`${vertexId}${CONNECT_KEY}`, '');
      const newIndex = arrPosition.indexOf(oldIndex);

      if (newIndex == -1) {
        edge.remove(state);
      } else if (newIndex != parseInt(oldIndex)) {
        const oldEdgeObj = edge.getObjectInfo();

        edge.target.prop = `${vertexId}${CONNECT_KEY}${newIndex}`;

        if (state) {
          const he = new HistoryElement();
          he.actionType = ACTION_TYPE.CONNECTOR_CHANGE;
          he.oldObject = oldEdgeObj;
          he.dataObject = {
            source: _.cloneDeep(edge.source),
            target: _.cloneDeep(edge.target),
          };
          he.realObject = edge;
          state.add(he);
        }
      }
    });
  }

  restore(dataContainer) {
    dataContainer.edge.forEach((e) => {
      this.create(e);
    });

    this.objectUtils.updatePathConnectOnWindowResize(this, this.vertexContainer);
  }
}

export default EdgeMgmt;
