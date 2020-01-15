import _ from 'lodash';
import * as d3 from 'd3';
import HistoryElement from '../../../common/new-type-define/historyElement';
import State from '../../../common/new-type-define/state';
import ObjectUtils from '../../../common/utilities/object.util';

import {
  LINE_TYPE, OBJECT_TYPE, ACTION_TYPE, NOTE_TYPE, CONNECT_TYPE,
} from '../../../common/const/index';
import { generateObjectId, createPath } from '../../../common/utilities/common.util';


class Edge {
  constructor(props) {
    this.dataContainer = props.edgeMgmt.dataContainer;
    this.svgId = props.edgeMgmt.svgId;
    this.selectorClass = props.edgeMgmt.selectorClass;
    this.arrowId = props.edgeMgmt.arrowId;
    this.viewMode = props.edgeMgmt.viewMode;
    this.history = props.edgeMgmt.history;
    this.edgeMgmt = props.edgeMgmt;

    this.groupEdgePathId = props.edgeMgmt.groupEdgePathId;
    this.edgePathId = props.edgeMgmt.edgePathId;
    this.groupEdgePointId = props.edgeMgmt.groupEdgePointId;
    this.pointStartId = props.edgeMgmt.pointStartId;
    this.pointEndId = props.edgeMgmt.pointEndId;
    this.dummyPathId = props.edgeMgmt.dummyPathId;

    this.id;
    this.source;
    this.target;
    this.lineType = LINE_TYPE.SOLID;// "S" or "D" (Solid/Dash)
    this.useMarker = 'Y'; // "Y" | "N"
    this.originNote = '';
    this.middleNote = '';
    this.destNote = '';
    this.type = OBJECT_TYPE.EDGE;
    this.show = true;

    this.initialize();
  }

  initialize() {
    this.objectUtils = new ObjectUtils();

    this.limitTop = 0;
    this.limitBottom = $(window).height();
    this.limitLeft = 0;
    this.limitRight = $(window).width();
  }

  /**
   *
   * @param svgSelector => type: object, require: true, purpose: the place where the DOM append to
   * @param pathStr => type: string, require: true, purpose: use to draw edge from to
   * @param note => type: object, require: false, default: empty object, purpose: content start, middel, end note
   * @param id => tpe: string, require: true, identify for edge
   * @param callbackOnClick => type: function, require: false, default: anonymous function, purpose: call back drag connection
   * @param callbackOnKeyDown => type: function, require: false, default: anonymous function, purpose: call back drag connection
   * @param callbackOnFocusOut => type: function, require: false, default: anonymous function, purpose: call back drag connection
   * @param containerClass => type: string, require: false, purpose: the class used as selector for menu context on edge
   */
  create(sOptions) {
    const {
      id, source, target, style, note,
    } = sOptions;

    this.id = id || generateObjectId('E');
    this.source = _.cloneDeep(source);
    this.target = _.cloneDeep(target);

    if (sOptions.show !== null && sOptions.show !== undefined) {
      this.show = sOptions.show;
    }

    if (style) {
      this.lineType = style.line || this.lineType;
      this.useMarker = style.arrow || this.useMarker;
    } else {
      // For Undo/Redo
      this.lineType = sOptions.lineType || this.lineType;
      this.useMarker = sOptions.useMarker || this.useMarker;
    }

    if (note) {
      this.originNote = note.originNote || this.originNote;
      this.middleNote = note.middleNote || this.middleNote;
      this.destNote = note.destNote || this.destNote;
    } else {
      // For Undo/Redo
      this.originNote = sOptions.originNote || this.originNote;
      this.middleNote = sOptions.middleNote || this.middleNote;
      this.destNote = sOptions.destNote || this.destNote;
    }

    if (!this.dataContainer.edge) this.dataContainer.edge = [];
    this.dataContainer.edge.push(this);

    const pathStr = createPath(this.source, this.target);

    // Edge group
    const group = d3.select(`#${this.svgId}`).append('g')
      .attr('transform', 'translate(0.5, 0.5)')
      .attr('class', `edge ${this.selectorClass}`)
      .attr('ref', this.id)
      .style('visibility', 'visible')
      .style('cursor', 'crosshair')
      .on('click', () => {
        this.edgeMgmt.handlerOnClickEdge(this);
      })
      .on('focus', () => {
        group.on('keydown', () => {
          // callbackOnKeyDown(this.id, d3.event);
          if (event.keyCode === 46 || event.keyCode === 8) {
            const state = new State();
            this.remove(state);

            if (this.history) {
              this.history.add(state);
            }
          }
        });
      });

    d3.select(`#${this.svgId}`).select('defs').append('marker')
      .attr('id', `arrow${this.id}`)
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 10)
      .attr('refY', 5)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M 0 0 L 10 5 L 0 10 z')
      .attr('fill', 'black');

    // hidden line, it has larger width for selecting easily
    group.append('path')
      .attr('d', pathStr)
      .attr('id', this.id)
      .attr('focusable', true)
      .attr('stroke', 'white')
      .attr('stroke-miterlimit', 10)
      .attr('fill', 'none')
      .attr('pointer-events', 'stroke')
      .attr('visibility', 'hidden')
      .attr('stroke-width', 9)
      .attr('marker-end', `url(#arrow${this.id})`);

    group.append('path')
      .attr('d', pathStr)
      .attr('id', this.id)
      .attr('focusable', true)
      .attr('stroke', 'black')
      .attr('stroke-miterlimit', 10)
      .attr('fill', 'none')
      .attr('focusable', true)
      .attr('marker-end', this.useMarker === 'Y' ? `url(#arrow${this.id})` : '')
      .attr('stroke-dasharray', this.lineType === LINE_TYPE.SOLID ? '0 0' : '3 3'); // Make arrow at end path

    const origin = group.append('text')
      .style('font-size', '12px')
      .attr('x', 5) // Move the text from the start angle of the arc
      .attr('dy', -5); // Move the text down
    const middle = group.append('text')
      .style('font-size', '12px')
      .attr('dy', -5); // Move the text down
    const dest = group.append('text')
      .style('font-size', '12px')
      .attr('x', -5) // Move the text from the start angle of the arc
      .attr('dy', -5); // Move the text down

    origin.append('textPath')
      .style('text-anchor', 'start')
      .attr('fill', '#000000')
      .attr('id', `originNote${this.id}`)
      .attr('xlink:href', `#${this.id}`)
      .attr('startOffset', '0%')
      .text(this.originNote);

    middle.append('textPath')
      .style('text-anchor', 'middle')
      .attr('fill', '#000000')
      .attr('id', `middleNote${this.id}`)
      .attr('xlink:href', `#${this.id}`)
      .attr('startOffset', '50%')
      .text(this.middleNote);

    dest.append('textPath')
      .style('text-anchor', 'end')
      .attr('fill', '#000000')
      .attr('id', `destNote${this.id}`)
      .attr('xlink:href', `#${this.id}`)
      .attr('startOffset', '100%')
      .text(this.destNote);

    // Marked connector as connected
    if (this.source.prop.indexOf('title') === -1) {
      d3.select(`[prop="${this.source.prop}"][type="O"]`).classed('marked_connector', true);
    }
    if (this.target.prop.indexOf('title') === -1) {
      d3.select(`[prop="${this.target.prop}"][type="I"]`).classed('marked_connector', true);
    }

    // check if target connection object is Vertex then call validateConnectionByUsage()
    let vertices = [];
    this.edgeMgmt.vertexContainer.forEach((arrVertex) => {
      vertices = vertices.concat(arrVertex.vertex);
      vertices = vertices.concat(arrVertex.boundary);
    });

    const obj = _.find(vertices, { id: this.target.vertexId });

    if (obj.type == OBJECT_TYPE.VERTEX) {
      obj.validateConnectionByUsage();
    }

    if (!this.show) {
      this.visible(false);
    }

    return this;
  }

  /**
   * Remove edge by id
   * @param edgeId
   */
  remove(state) {
    // Remove from DOM
    const selected = d3.select(`#${this.id}`);
    if (selected) {
      selected.node().parentNode.remove();
      // Mutates array edge
      const edge = _.remove(this.dataContainer.edge, e => e.id === this.id);

      if (state) {
        const he = new HistoryElement();
        he.actionType = ACTION_TYPE.DELETE;
        he.dataObject = edge[0].getObjectInfo();
        he.realObject = edge[0];
        state.add(he);
      }
    }

    d3.select(`#arrow${this.id}`).remove();

    if (this.edgeMgmt.isSelectingEdge()) { this.edgeMgmt.cancleSelectedPath(); }

    // Unmarked connector
    // For source connection
    if (this.source.prop.indexOf('title') === -1) {
      let isSrcExist = false;
      this.dataContainer.edge.forEach((e) => {
        if (e.source.prop === this.source.prop) {
          isSrcExist = true;
        }
      });

      if (!isSrcExist) {
        let vertices = [];
        this.edgeMgmt.vertexContainer.forEach((e) => {
          vertices = vertices.concat(e.vertex);
        });

        const propNode = $(`rect[prop=${this.source.prop}][type='O']`)[0];
        // In case of updated vertex and poperties lost => propNode will not exist
        if (propNode) {
          d3.select(`rect[prop=${this.source.prop}][type='O']`).classed('marked_connector', false);
        }
      }
    }

    // For target connection
    if (this.target.prop.indexOf('title') === -1) {
      let isTagExist = false;
      this.dataContainer.edge.forEach((e) => {
        if (e.target.prop === this.target.prop) {
          isTagExist = true;
        }
      });

      if (!isTagExist) {
        let vertices = [];
        this.edgeMgmt.vertexContainer.forEach((e) => {
          vertices = vertices.concat(e.vertex);
        });

        const propNode = $(`rect[prop=${this.target.prop}][type='I']`)[0];
        // In case of updated vertex and poperties lost => propNode will not exist
        if (propNode) {
          d3.select(`rect[prop=${this.target.prop}][type='I']`).classed('marked_connector', false);

          // mandatory Data elelment checking for target vertex (case of output message of message mapping GUI)
          const vertexId = $(propNode.parentNode).attr('id');
          const vertex = _.find(vertices, { id: vertexId });
          vertex.validateConnectionByUsage();
        }
      }
    }
  }

  /**
   * Update attribute d of path (connect)
   * @param options: object
   */
  updatePathConnect(sOptions) {
    if (sOptions) {
      _.merge(this, sOptions);
    } else {
      let vertices = [];
      this.edgeMgmt.vertexContainer.forEach((dataContainer) => {
        vertices = vertices.concat(dataContainer.vertex);
        vertices = vertices.concat(dataContainer.boundary);
      });

      // for source
      let tmpObject = _.find(vertices, { id: this.source.vertexId });
      let newPosition = this.objectUtils.getCoordPropRelativeToParent(tmpObject, this.source.prop, CONNECT_TYPE.OUTPUT);
      this.source.x = newPosition.x;
      this.source.y = newPosition.y;

      // for target
      tmpObject = _.find(vertices, { id: this.target.vertexId });
      newPosition = this.objectUtils.getCoordPropRelativeToParent(tmpObject, this.target.prop, CONNECT_TYPE.INPUT);
      this.target.x = newPosition.x;
      this.target.y = newPosition.y;
    }

    const { source, target } = this;
    const pathStr = createPath(source, target);
    // Get DOM and update attribute
    d3.selectAll(`#${this.id}`).attr('d', pathStr);
  }

  updateMarkedConnector(sOptions = {}) {
    if (Object.keys(sOptions)[0] === 'source') {
      // Unmarked old connector
      if (this.source.prop.indexOf('title') === -1) {
        const isExist = _.find(this.dataContainer.edge, e => e.id !== this.id && e.source.vertexId === this.source.vertexId && e.source.prop === this.source.prop);

        // If there is no any connection to this connector then unmark it
        if (!isExist) {
          d3.select(`[prop="${this.source.prop}"][type="O"]`).classed('marked_connector', false);
        }
      }

      // Marked new connector
      if (sOptions.source.prop.indexOf('title') === -1) {
        d3.select(`[prop="${sOptions.source.prop}"][type="O"]`).classed('marked_connector', true);
      }
    } else {
      // Unmarked old connector
      if (this.target.prop.indexOf('title') === -1) {
        const isExist = _.find(this.dataContainer.edge, e => e.id !== this.id && e.target.vertexId === this.target.vertexId && e.target.prop === this.target.prop);

        // If there is no any connection to this connector then unmark it
        if (!isExist) {
          d3.select(`[prop="${this.target.prop}"][type="I"]`).classed('marked_connector', false);
        }
      }

      // Marked new connector
      if (sOptions.target.prop.indexOf('title') === -1) {
        d3.select(`[prop="${sOptions.target.prop}"][type="I"]`).classed('marked_connector', true);
      }
    }
  }

  setStatusEdgeOnCurrentView() {
    const { id, source: { x: xSrc, y: ySrc, svgId: svgSrc }, target: { x: xDes, y: yDes, svgId: svgDes } } = this;

    const srcContainerRect = $(`#${svgSrc}`)[0].parentNode.getBoundingClientRect();
    const desContainerRect = $(`#${svgDes}`)[0].parentNode.getBoundingClientRect();

    let srcOffsetRight = 0; // thickness of vertical scrollbar
    let srcOffsetBottom = 0; // thickness of horizontal scrollbar
    let desOffsetRight = 0; // thickness of vertical scrollbar
    let desOffsetBottom = 0; // thickness of horizontal scrollbar

    if ($(`#${svgSrc}`)[0].parentNode.scrollHeight > $($(`#${svgSrc}`)[0].parentNode).height()) srcOffsetRight = 10;
    if ($(`#${svgSrc}`)[0].parentNode.scrollWidth > $($(`#${svgSrc}`)[0].parentNode).width()) srcOffsetBottom = 10;
    if ($(`#${svgDes}`)[0].parentNode.scrollHeight > $($(`#${svgDes}`)[0].parentNode).height()) desOffsetRight = 10;
    if ($(`#${svgDes}`)[0].parentNode.scrollWidth > $($(`#${svgDes}`)[0].parentNode).width()) desOffsetBottom = 10;

    const node = d3.select(`#${id}`);
    if (xSrc < srcContainerRect.left || xSrc > srcContainerRect.right - srcOffsetRight
        || ySrc  < srcContainerRect.top || ySrc > srcContainerRect.bottom - srcOffsetBottom
				|| xDes < desContainerRect.left || xDes > desContainerRect.right - desOffsetRight
        || yDes < desContainerRect.top || yDes > desContainerRect.bottom - desOffsetBottom
    ) {
      if (node.node()) {
        d3.select(node.node().parentNode).classed('hide-edge-on-parent-scroll', true);
      }
    } else if (node.node()) {
      d3.select(node.node().parentNode).classed('hide-edge-on-parent-scroll', false);
    }
  }

  /**
   * Set text note on edge
   * @param value changed value
   * @param targetNote originNote | middleNote | destNote
   */
  setNote(value, targetNote) {
    this[targetNote] = value;

    // Update note on view
    d3.select(`#${targetNote}${this.id}`)
      .text(value);
  }

  /**
   * Set style path connect solid, dash
   * @param type
   */
  setLineType(type) {
    this.lineType = type;
    const path = d3.selectAll(`#${this.id}`).filter((d, i) => i === 1);
    path.style('stroke-dasharray', type === LINE_TYPE.SOLID ? '0 0' : '3 3');
  }

  /**
   * Set use arrow marker
   * @param flag
   */
  setUseMarker(flag) {
    this.useMarker = flag;
    d3.selectAll(`#${this.id}`).attr('marker-end', flag === 'Y' ? `url(#arrow${this.id})` : '');
  }

  /**
   * emphasize edge for selected Object (Vertex, Boundary)
   */
  emphasize() {
    const path = d3.selectAll(`#${this.id}`).filter((d, i) => i === 1);

    path.classed('emphasizePath', true);
    d3.select(`#arrow${this.id}`).select('path').classed('emphasizeArrow', true);
  }

  updateInfo(info) {
    this.setNote(info.originNote, NOTE_TYPE.ORIGIN);
    this.setNote(info.middleNote, NOTE_TYPE.MID);
    this.setNote(info.destNote, NOTE_TYPE.DEST);

    this.setLineType(info.lineType);

    this.setUseMarker(info.useMarker);
  }

  updateConnector(dropVertexId, pointType, propId) {
    let vertices = [];
    this.edgeMgmt.vertexContainer.forEach((arrVertex) => {
      vertices = vertices.concat(arrVertex.vertex);
      vertices = vertices.concat(arrVertex.boundary);
    });

    // Vertex that draged to
    const targetObj = _.find(vertices, { id: dropVertexId });
    const { svgId } = targetObj;

    // Calculate new coordinate of ended point on CONNECT SVG for redraw edge
    const newPoint = this.objectUtils.getCoordPropRelativeToParent(targetObj, propId, pointType);
    newPoint.vertexId = dropVertexId;
    newPoint.prop = propId;
    newPoint.svgId = svgId;

    if (pointType === 'O') {
      this.updateMarkedConnector({ source: newPoint });
      this.updatePathConnect({ source: newPoint });
    } else {
      // get old object before updating
      const oldObj = _.find(vertices, { id: this.target.vertexId });

      this.updateMarkedConnector({ target: newPoint });
      this.updatePathConnect({ target: newPoint });

      // check mandatory data element for target vertex only (Output message of Message Mapping GUI)

      if (oldObj.type == OBJECT_TYPE.VERTEX) {
        oldObj.validateConnectionByUsage();
      }

      // If move target connection to another vertex then checking for new vertex
      if (targetObj.id != oldObj.id && targetObj.type == OBJECT_TYPE.VERTEX) {
        targetObj.validateConnectionByUsage();
      }
    }
  }

  getObjectInfo() {
    return {
      id: this.id,
      source: _.cloneDeep(this.source),
      target: _.cloneDeep(this.target),
      lineType: this.lineType,
      useMarker: this.useMarker,
      originNote: this.originNote,
      middleNote: this.middleNote,
      destNote: this.destNote,
      type: this.type,
      show: this.show,
    };
  }

  visible(status) {
    const node = d3.select(`#${this.id}`);
    if (node.node()) { d3.select(node.node().parentNode).classed('hide-edge-on-menu-items', !status); }

    this.show = status;
  }
}

export default Edge;
