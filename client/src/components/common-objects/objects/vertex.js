import ColorHash from 'color-hash';
import _ from 'lodash';
import * as d3 from 'd3';
import HistoryElement from '../../../common/new-type-define/historyElement';
import State from '../../../common/new-type-define/state';
import ObjectUtils from '../../../common/utilities/object.util';

import {
  VERTEX_ATTR_SIZE,
  CONNECT_SIDE,
  CONNECT_TYPE,
  DATA_ELEMENT_TYPE,
  VERTEX_GROUP_TYPE,
  ACTION_TYPE,
	OBJECT_TYPE
} from '../../../common/const/index';

import {
  generateObjectId,
  setMinBoundaryGraph,
  checkModePermission,
  arrayMove,
  getKeyPrefix,
  htmlEncode,
  segmentName,
} from '../../../common/utilities/common.util';

const CONNECT_KEY = 'Connected';
const FOCUSED_CLASS = 'focused-object';

class Vertex {
  constructor(props) {
    this.mainParent = props.mainParent;
    this.dataContainer = props.vertexMgmt.dataContainer;
    this.containerId = props.vertexMgmt.containerId;
    this.svgId = props.vertexMgmt.svgId;
    this.selectorClass = props.vertexMgmt.selectorClass || 'defaul_vertex_class';
    this.vertexDefinition = props.vertexMgmt.vertexDefinition;
    this.viewMode = props.vertexMgmt.viewMode;
    this.connectSide = props.vertexMgmt.connectSide;
    this.mandatoryDataElementConfig	= props.vertexMgmt.mandatoryDataElementConfig; // The configuration for Data element validation
    this.vertexMgmt = props.vertexMgmt;
    this.history = props.vertexMgmt.history;


    this.id = null;
    this.x = 0; // type: number, require: true, purpose: coordinate x
    this.y = 0; // type: number, require: true, purpose: coordinate y
    this.groupType = ''; // Current is OPERATION or SEGMENT
    this.vertexType = ''; // The details of group type
    this.name = ''; // type: string, require: false, purpose: vertex name
    this.description = ''; // type: string, require: false, purpose: content title when hover to vertex
    this.data = []; // type: array, require: false, default: empty array, purpose: define the content of vertex
    this.parent = null;
    this.mandatory = false;
    this.repeat = '1';
    this.type = OBJECT_TYPE.VERTEX;
    this.show = true;
    this.startX = -1; // use for history
		this.startY = -1; // use for history
    this.childIndex = -1;
    this.isShowReduced = false;

    this.initialize();
  }

  initialize() {
    this.colorHash = new ColorHash({ lightness: 0.7 });
    this.colorHashConnection = new ColorHash({ lightness: 0.8 });
    this.objectUtils = new ObjectUtils();
  }

  /**
   * @param sOptions
   * @param callbackDragVertex => type: function, require: false, default: anonymous function, purpose: call back drag vertex
   * @param callbackDragConnection => type: function, require: false, default: anonymous function, purpose: call back drag connection
   */
  create(sOptions = {}, callbackDragVertex = () => {}, callbackDragConnection = () => {}) {
    const {
      id, x, y, vertexType, name, parent, mandatory, isMenu, isMemberManagement, show, isShowReduced
    } = sOptions;
    let {
      groupType, data, description, repeat,
    } = sOptions;

    this.id = id || generateObjectId(OBJECT_TYPE.VERTEX);
    this.x = x || 0;
    this.y = y || 0;
    this.groupType = groupType;
    this.vertexType = vertexType;
    this.name = name || vertexType;
    this.description = description || 'Description';
    this.data = data || [];
    this.parent = parent || null;
    this.mandatory = mandatory || false;
    if (repeat) {
      // convert to string type
      repeat += '';
      this.repeat = repeat === '' ? '1' : repeat;
    }

    if (show !== null && show !== undefined) {
      this.show = show;
    }

    if (!this.dataContainer.vertex) this.dataContainer.vertex = [];
    this.dataContainer.vertex.push(this);

    const group = d3.select(`#${this.svgId}`).selectAll(`.${this.selectorClass}`)
      .data(this.dataContainer.vertex)
      .enter()
      .append('g')
      .attr('transform', `translate(${this.x}, ${this.y})`)
      .attr('id', this.id)
      .attr('class', `${this.selectorClass}`);

    // If isEnableDragVertex => emphasizePathConnectForVertex will be call at StartDrag
    // else => have to bind emphasizePathConnectForVertex for click event
    if (checkModePermission(this.viewMode.value, 'isEnableDragVertex')) {
      group.call(callbackDragVertex);
    } else {
      $(`#${this.id}`).click(() => {
        d3.select(`.${FOCUSED_CLASS}`).classed(FOCUSED_CLASS, false);
        d3.select(`#${this.id}`).classed(FOCUSED_CLASS, true);

        this.vertexMgmt.edgeMgmt.emphasizePathConnectForVertex(this);
      });
    }

    this.generateContent(callbackDragConnection);

    if (isShowReduced) {
      this.showReduced();
    }

    if (!this.show) {
      this.visible(false);
    }

    if (isMenu) { 
      setMinBoundaryGraph(this.dataContainer, this.svgId, this.viewMode.value); 
    }

    // Check mandatory for data element
    this.validateConnectionByUsage();

    return this;
  }

  generateContent(callbackDragConnection = () => {}) {
    let htmlContent = '';
    const presentation = _.find(this.vertexDefinition.vertexGroup, { groupType: this.groupType }).vertexPresentation;
    const countData = this.data.length;
    const hasLeftConnector = (this.connectSide === CONNECT_SIDE.LEFT || this.connectSide === CONNECT_SIDE.BOTH) ? ' has_left_connect' : '';
    const hasRightConnector = (this.connectSide === CONNECT_SIDE.RIGHT || this.connectSide === CONNECT_SIDE.BOTH) ? ' has_right_connect' : '';
    for (let i = 0; i < countData; i += 1) {
      const item = this.data[i];
      if (item.repeat) {
        item.repeat += '';
      }

      htmlContent += `
        <div class="property" prop="${this.id}${CONNECT_KEY}${i}" style="height: ${VERTEX_ATTR_SIZE.PROP_HEIGHT}px">
          <label class="key${hasLeftConnector}" id="${this.id}${presentation.key}${i}" title="${item[presentation.keyTooltip] || 'No data to show'}">${htmlEncode(getKeyPrefix(item, this.vertexDefinition, this.groupType))}${item[presentation.key] || ''}</label>
          <label class="data${hasRightConnector}" id="${this.id}${presentation.value}${i}" title="${item[presentation.valueTooltip] || 'No data to show'}">${item[presentation.value] || ''}</label>
        </div>`;
    }

    const vertexHeight = VERTEX_ATTR_SIZE.HEADER_HEIGHT + VERTEX_ATTR_SIZE.PROP_HEIGHT * countData + 1;

    const group = d3.select(`#${this.id}`);
    group.append('foreignObject')
      .attr('width', VERTEX_ATTR_SIZE.GROUP_WIDTH)
      .attr('height', vertexHeight)
      .append('xhtml:div')
      .attr('class', 'vertex_content')
      .html(`
			<div class="content_header_name" style="height: ${VERTEX_ATTR_SIZE.HEADER_HEIGHT}px;
									background-color: ${this.colorHash.hex(this.name)};
									cursor: move; pointer-events: all">
				<p class="header_name" id="${this.id}Name" title="${this.description}">${this.name}</p>
			</div>
					
        <div class="vertex_data">
          ${htmlContent}
        </div>
      `);

    for (let i = 0; i < countData; i += 1) {
      // Input
      if (this.connectSide === CONNECT_SIDE.BOTH || this.connectSide === CONNECT_SIDE.LEFT) {
        group.append('rect')
          .attr('class', `drag_connect drag_connect_${this.svgId}`)
          .attr('type', CONNECT_TYPE.INPUT)
          .attr('prop', `${this.id}${CONNECT_KEY}${i}`)
          .attr('pointer-events', 'all')
          .attr('width', 12)
          .attr('height', 25)
          .attr('x', 1)
          .attr('y', VERTEX_ATTR_SIZE.HEADER_HEIGHT + VERTEX_ATTR_SIZE.PROP_HEIGHT * i + 1)
          .attr('fill', this.colorHashConnection.hex(this.name))
          .call(callbackDragConnection);
      }

      // Output
      if (this.connectSide === CONNECT_SIDE.BOTH || this.connectSide === CONNECT_SIDE.RIGHT) {
        group.append('rect')
          .attr('class', `drag_connect drag_connect_${this.svgId}`)
          .attr('type', CONNECT_TYPE.OUTPUT)
          .attr('prop', `${this.id}${CONNECT_KEY}${i}`)
          .attr('pointer-events', 'all')
          .attr('width', 12)
          .attr('height', 25)
          .attr('x', VERTEX_ATTR_SIZE.GROUP_WIDTH - (VERTEX_ATTR_SIZE.PROP_HEIGHT / 2))
          .attr('y', VERTEX_ATTR_SIZE.HEADER_HEIGHT + VERTEX_ATTR_SIZE.PROP_HEIGHT * i + 1)
          .attr('fill', this.colorHashConnection.hex(this.name))
          .call(callbackDragConnection);
      }
    }
  }

  /**
   * Set position for vertex
   * Called in function dragBoundary (Object boundary)
   * @param position
   */
  setPosition(position) {
    const { x, y } = position;
    this.x = x;
    this.y = y;
    this.updatePathConnect();

    d3.select(`#${this.id}`).attr('transform', `translate(${[x, y]})`);
  }

  /**
   * Copy vertex selected
   */
  copy() {
    let {
      x, y, name, description, vertexType, data, repeat, mandatory, groupType,
    } = this.getObjectInfo();

    x += VERTEX_ATTR_SIZE.SPACE_COPY;
    y += VERTEX_ATTR_SIZE.SPACE_COPY;

    const vertex = this.vertexMgmt.create({
      x, y, name, description, vertexType, data, repeat, mandatory, groupType
    });

    if (this.history) {
      const state = new State();
      const he = new HistoryElement();
      he.actionType = ACTION_TYPE.CREATE;
      he.dataObject = vertex.getObjectInfo();
      he.realObject = vertex;
      state.add(he);
      this.history.add(state);
    }

    return vertex;
  }

  /**
   * Remove vertex
   */
  remove(isMenu = true, state) {
    // Remove all edge relate to vertex
    this.vertexMgmt.edgeMgmt.removeAllEdgeConnectToVertex(this, state);

    if (this.parent) {
      const parentObj = _.find(this.dataContainer.boundary, { id: this.parent });
      parentObj.removeMemberFromBoundary(this, isMenu, state);
    }

    // Remove from DOM
    d3.select(`#${this.id}`).remove();

    // Remove from data container
    const vertexInfo = _.remove(this.dataContainer.vertex, e => e.id === this.id);

    if (this.history) {
      if (isMenu) {
        // remove vertex by menu context
        state = new State();
        const he = new HistoryElement();
        he.actionType = ACTION_TYPE.DELETE;
        he.dataObject = this.getObjectInfo();
        he.realObject = this;
        state.add(he);
        this.history.add(state);

        setMinBoundaryGraph(this.dataContainer, this.svgId, this.viewMode.value);

      } else if (state) {
        // remove vertex by Boundary update info popup
        const he = new HistoryElement();
        he.actionType = ACTION_TYPE.DELETE;
        he.dataObject = this.getObjectInfo();
        he.realObject = this;
        state.add(he);
      }
    }

    return vertexInfo[0];
  }

  /**
   * The function called from boundary via mainMgmt
   * In case that delete all boundary parent of vertex
   * Different between this func and remove func is, in this case we don't care the parent, because it was deleted
   */
  delete(state) {
    // Remove all edge relate to vertex
    this.vertexMgmt.edgeMgmt.removeAllEdgeConnectToVertex(this, state);

    // Remove from DOM
    d3.select(`#${this.id}`).remove();
    // Remove from data container
    const vertex = _.remove(this.dataContainer.vertex, e => e.id === this.id)[0];

    if (state) {
      const he = new HistoryElement();
      he.actionType = ACTION_TYPE.DELETE;
      he.dataObject = vertex.getObjectInfo();
      he.realObject = vertex;
      state.add(he);
    }
  }

  /**
   * Move to new position with parent offset(called when moving the boundary that contain this vertex)
   * @param {*} offsetX
   * @param {*} offsetY
   */
  move(offsetX, offsetY) {
    this.x = this.x + offsetX;
    this.y = this.y + offsetY;
    d3.select(`#${this.id}`).attr('transform', `translate(${[this.x, this.y]})`);

    this.updatePathConnect();
  }

  updatePathConnect() {
    this.vertexMgmt.updatePathConnectForVertex(this);
  }

  moveToFront() {
    d3.select(`#${this.id}`).moveToFront();

    if (this.dataContainer.vertex.length > 1) {
      const curIndex = _.findIndex(this.dataContainer.vertex, { id: this.id });

      arrayMove(this.dataContainer.vertex, curIndex, this.dataContainer.vertex.length - 1);
    }
  }

  /**
   *
   * @param {*} prop
   * @param {*} type
   */
  markedConnectorByProp(prop, type) {
    d3.select(`[prop="${prop}"][type=${type}]`).classed('marked_connector', true);
  }

  /**
   * Checked connected and marked connector for vertex
   */
  markedAllConnector() {
    let lstMarkedInput = [];
    let lstMarkedOutput = [];

    lstMarkedOutput = this.vertexMgmt.edgeMgmt.dataContainer.edge.filter(e => e.source.prop.indexOf('title') === -1 && e.source.vertexId === this.id);

    lstMarkedInput = this.vertexMgmt.edgeMgmt.dataContainer.edge.filter(e => e.target.prop.indexOf('title') === -1 && e.target.vertexId === this.id);

    lstMarkedInput.forEach((e) => {
      d3.select(`[prop="${e.target.prop}"][type="I"]`).classed('marked_connector', true);
    });

    lstMarkedOutput.forEach((e) => {
      d3.select(`[prop="${e.source.prop}"][type="O"]`).classed('marked_connector', true);
    });
  }

  /**
   * Calculate for scroll left and scroll top to show this vertex to user (Find feature of SegmentSetEditor)
   */
  showToUser() {
    const $container = $(`#${this.containerId}`);
    const $vertex = $(`#${this.id}`);

    const { width: cntrW, height: cntrH } = $container.get(0).getBoundingClientRect();
    const cntrLeft = $container.scrollLeft();
    const cntrTop = $container.scrollTop();
    const { width: vtxW, height: vtxH } = $vertex.get(0).getBoundingClientRect();

    // Horizontal
    if (this.x < cntrLeft) {
      $container.scrollLeft(this.x - 5);
    } else if (this.x + vtxW > cntrLeft + cntrW) {
      $container.scrollLeft(this.x - (cntrW - vtxW) + 15);
    }

    // Vertical
    if (this.y < cntrTop) {
      $container.scrollTop(this.y - 5);
    } else if (this.y + vtxH > cntrTop + cntrH) {
      if (vtxH > cntrH - 15) {
        $container.scrollTop(this.y - 5);
      } else {
        $container.scrollTop(this.y - (cntrH - vtxH) + 15);
      }
    }

    // Show this vertex on the Top
    this.moveToFront();

    // Highlight the title background-color
    const $vtxTitle = $(`#${this.id}`).find('.content_header_name');
    const $headerConnectors = $(`#${this.id}`).find('.connect_header');
    const colorByName = this.colorHash.hex(this.name);
    for (let i = 0; i < 3; i += 1) {
      setTimeout(() => {
        $vtxTitle.css('background-color', 'white');
        for (let i = 0; i < $headerConnectors.length; i += 1) {
          $($headerConnectors[i]).attr('fill', 'white');
        }
      }, i * 400);
      setTimeout(() => {
        $vtxTitle.css('background-color', `${colorByName}`);
        for (let i = 0; i < $headerConnectors.length; i += 1) {
          $($headerConnectors[i]).attr('fill', `${colorByName}`);
        }
      }, 200 + i * 400);
    }
  }

  /**
	 * Checking and filling warning color for mandatory Data element that have no connection
	 */
  validateConnectionByUsage() {
    if (!checkModePermission(this.viewMode.value, 'mandatoryCheck')) return true;

    if (this.groupType === VERTEX_GROUP_TYPE.OPERATION) return true;

    let bFlag = true;
    const { mandatoryEvaluationFunc, colorWarning, colorAvailable } = this.mandatoryDataElementConfig;

    const dataElement = _.cloneDeep(this.data);
    this.getConnectionStatus(dataElement);

    // Checking if any parent is conditional
    let parentId = this.parent;
    let parentObj = null;
    let bHasConditionalParent = false;
    while (parentId) {
      parentObj = _.find(this.dataContainer.boundary, { id: parentId });
      if (!parentObj.mandatory) {
        bHasConditionalParent = true;
        break;
      }

      parentId = parentObj.parent;
    }

    let bHasAllMandatoryParent = !bHasConditionalParent; // For reading source code easily

    if (this.parent) {
      bHasAllMandatoryParent &= this.mandatory;
    } else {
      bHasAllMandatoryParent = this.mandatory;
    }

    for (let i = 0; i < dataElement.length; i += 1) {
      if (dataElement[i].type === DATA_ELEMENT_TYPE.COMPOSITE) continue;

      if (mandatoryEvaluationFunc(dataElement[i])) {
        if (dataElement[i].hasConnection) {
          $(`#${this.id} .property[prop='${this.id}${CONNECT_KEY}${i}']`).css('background-color', colorAvailable);
        } else {
          let isMandatoryComposite = false;
          if (dataElement[i].type === DATA_ELEMENT_TYPE.COMPONENT) {
            const parentComposite = this.findComposite(i);
            isMandatoryComposite = mandatoryEvaluationFunc(parentComposite);
            bHasAllMandatoryParent &= isMandatoryComposite;
          }

          if (bHasAllMandatoryParent) {
            // GRP[M] - SGM[M] - DE[M]
            if (bFlag) bFlag = false;
            $(`#${this.id} .property[prop='${this.id}${CONNECT_KEY}${i}']`).css('background-color', colorWarning);
          } else if (this.hasAnyConnectionToOtherDataElement(dataElement, i, isMandatoryComposite)) {
            // GRP[M] - SGM[C] - DE[M]
            // GRP[C] - SGM[M] - DE[M]
            // GRP[C] - SGM[C] - DE[M]
            if (bFlag) bFlag = false;
            $(`#${this.id} .property[prop='${this.id}${CONNECT_KEY}${i}']`).css('background-color', colorWarning);
          } else {
            $(`#${this.id} .property[prop='${this.id}${CONNECT_KEY}${i}']`).css('background-color', colorAvailable);
          }
        }
      }
    }

    return bFlag;
  }

  /**
	 * Checking if any connection to each data element
	 * @param {*} dataElement
	 */
  getConnectionStatus(dataElement) {
    for (let i = 0; i < this.vertexMgmt.edgeMgmt.dataContainer.edge.length; i += 1) {
      const edge = this.vertexMgmt.edgeMgmt.dataContainer.edge[i];
      for (let indexOfDataElement = 0; indexOfDataElement < dataElement.length; indexOfDataElement += 1) {
        if (parseInt(edge.target.prop.replace(`${this.id}${CONNECT_KEY}`, '')) === indexOfDataElement) {
          dataElement[indexOfDataElement].hasConnection = true;
        }
      }
    }
  }

  /**
	 *
	 * @param {*} dataElement
	 * @param {*} idxCurDataElement
	 * @param {*} isMandatoryComposite if idxCurDataElement is a COMPONENT then this param will be use
	 */
  hasAnyConnectionToOtherDataElement(dataElement, idxCurDataElement, isMandatoryComposite) {
    // In case of SIMPLE => checking connection for all others
    if (dataElement[idxCurDataElement].type === DATA_ELEMENT_TYPE.SIMPLE) {
      for (let i = 0; i < dataElement.length; i += 1) {
        if (i !== idxCurDataElement && dataElement[i].type !== DATA_ELEMENT_TYPE.COMPOSITE && dataElement[i].hasConnection) return true;
      }
    } else if (dataElement[idxCurDataElement].type === DATA_ELEMENT_TYPE.COMPONENT) {
      // In case of COMPONENT and its COMPOSITE is mandatory => same with SIMPLE
      if (isMandatoryComposite) {
        for (let i = 0; i < dataElement.length; i += 1) {
          if (i !== idxCurDataElement && dataElement[i].type !== DATA_ELEMENT_TYPE.COMPOSITE && dataElement[i].hasConnection) return true;
        }
      } else {
        // In case of COMPONENT and its COMPOSITE is CONDITIONAL => checking connection for others COMPONENT in the same COMPOSITE
        let firstComponentIndex = idxCurDataElement;
        let lastComponentIndex = idxCurDataElement;

        while (firstComponentIndex - 1 >= 0 && dataElement[firstComponentIndex - 1].type === DATA_ELEMENT_TYPE.COMPONENT) {
          firstComponentIndex -= 1;
          if (dataElement[firstComponentIndex].hasConnection) return true;
        }

        while (lastComponentIndex + 1 < dataElement.length && dataElement[lastComponentIndex + 1].type === DATA_ELEMENT_TYPE.COMPONENT) {
          lastComponentIndex += 1;
          if (dataElement[lastComponentIndex].hasConnection) return true;
        }
      }
    }

    return false;
  }

  /**
	 * Find Composite of Component at Component position
	 * @param {*} componentIndex
	 */
  findComposite(componentIndex) {
    for (let i = componentIndex - 1; i >= 0; i -= 1) {
      if (this.data[i].type === DATA_ELEMENT_TYPE.COMPOSITE) return this.data[i];
    }
  }

  updateInfo(info, state) {
    const {
      name, description, repeat, mandatory,
    } = info;

    const oldVertex = this.getObjectInfo();

    if (name) this.name = name;
    if (mandatory !== undefined) this.mandatory = mandatory;
    if (repeat) this.repeat = repeat;
    if (description) this.description = description;

    // Update properties
    const $header = d3.select(`#${this.id}Name`);
    $header.text(segmentName(this, this.viewMode.value)).attr('title', this.description);
    d3.select($header.node().parentNode).style('background-color', `${this.colorHash.hex(this.name)}`);

    // update color for "rect"
    d3.select(`#${this.id}`).selectAll('.drag_connect:not(.connect_header)').attr('fill', this.colorHashConnection.hex(this.name));
    d3.select(`#${this.id}`).selectAll('.drag_connect.connect_header').attr('fill', this.colorHash.hex(this.name));

    // Create history
		if (state) {
			const he = new HistoryElement();
			he.actionType = ACTION_TYPE.UPDATE_INFO;
			he.oldObject = oldVertex;
			he.dataObject = this.getObjectInfo();
			he.realObject = this;
			state.add(he);
		}
  }

  findComposite(componentIndex) {
		for (let i = componentIndex - 1; i >= 0; i--) {
			if (this.data[i].type === DATA_ELEMENT_TYPE.COMPOSITE) return this.data[i]
		}
	}

	findAncestorOfMemberInNestedBoundary() { 
    if (!this.parent) 
      return this; 
 
    const parentObj = _.find(this.dataContainer.boundary, {"id": this.parent}); 
 
    return parentObj.findAncestorOfMemberInNestedBoundary(); 
  }

	refresh() {
		const ancestor = this.findAncestorOfMemberInNestedBoundary();
		if (!ancestor || ancestor.type !== OBJECT_TYPE.BOUNDARY) return;
		
		ancestor.updateSize();
		ancestor.reorderPositionMember();
		ancestor.boundaryMgmt.edgeMgmt.updatePathConnectForVertex(ancestor);
	}

	getObjectInfo() {
		return {
			containerId: this.containerId,
			svgId: this.svgId,
			selectorClass: this.selectorClass,
			vertexDefinition: this.vertexDefinition,
			viewMode: this.viewMode,
			connectSide: this.connectSide,
			mandatoryDataElementConfig: this.mandatoryDataElementConfig,
			vertexMgmt: this.vertexMgmt,
			history: this.history,
			id: this.id,
			x: this.x,
			y: this.y,
			groupType: this.groupType,
			vertexType: this.vertexType,
			name: this.name,
			description: this.description,
			data: _.cloneDeep( this.data),
			parent: this.parent,
			mandatory: this.mandatory,
			repeat: this.repeat,
			type: this.type,
			show: this.show,
			startX: this.startX,
			startY: this.startY,
      childIndex: this.childIndex,
      isShowReduced: this.isShowReduced
		}
  }
  
  getParentObject() {
		if (!this.parent) return null;
		
		return _.find(this.dataContainer.boundary, {'id': this.parent});
  }
  
  visible(status) {
    d3.select(`#${this.id}`).classed('hidden-object', !status);
    this.show = status;
  }

  showReduced(state) {
    if (this.isShowReduced) return;

    const arrShowFullAlwayGroup = [];
		this.vertexDefinition.vertexGroup.forEach(vertexGroup => {
			if (vertexGroup.option.indexOf('SHOW_FULL_ALWAYS') != -1) {
				arrShowFullAlwayGroup.push(vertexGroup.groupType);
			}
    });
    
    if (arrShowFullAlwayGroup.indexOf(this.groupType) !== -1) return;

    // hide all connector
    d3.select(`#${this.id}`).selectAll('.drag_connect:not(.connect_header)').classed('hide', true);

    // hide all property
    d3.select(`#${this.id}`).selectAll('.property').classed('hide', true);

    // Get all prop that have the connection then show them
    const lstProp = [];
    this.vertexMgmt.edgeMgmt.dataContainer.edge.forEach((edge) => {
      if (edge.source.vertexId === this.id) {
        lstProp.push({
          vert: edge.source.vertexId,
          prop: edge.source.prop
        });
      } else if (edge.target.vertexId === this.id) {
        lstProp.push({
          vert: edge.target.vertexId,
          prop: edge.target.prop
        });
      }
    });
    
    // filter for property only
    const arrPropOfVertex = [];
    lstProp.forEach((propItem) => {
      if (arrPropOfVertex.indexOf(propItem.prop) === -1 && propItem.prop.indexOf('title') === -1) {
        arrPropOfVertex.push(propItem.prop);
      }
    });

    // show all properties and connectors that have the connection
    arrPropOfVertex.forEach((prop) => {
      // property
      d3.select(`#${this.id}`).selectAll('[prop=\'' + prop + '\']').classed('hide', false);

      // connector
      d3.select(`#${this.id}`).selectAll('.drag_connect[prop=\'' + prop + '\']').classed('reduced', true);
    });

    this.updatePathConnect();

    // Update posittion for connector
    this.objectUtils.updatePositionRectConnect(arrPropOfVertex, this);
    
    this.resetSize(false);

    this.isShowReduced = true;

    if (state) {
      const he = new HistoryElement();
      he.actionType = ACTION_TYPE.SHOW_REDUCED;
      he.realObject = this;
      state.add(he);
    }
  }

  showFull(state) {
    if (!this.isShowReduced) return;

    const arrShowFullAlwayGroup = [];
		this.vertexDefinition.vertexGroup.forEach(vertexGroup => {
			if (vertexGroup.option.indexOf('SHOW_FULL_ALWAYS') != -1) {
				arrShowFullAlwayGroup.push(vertexGroup.groupType);
			}
    });
    
    if (arrShowFullAlwayGroup.indexOf(this.groupType) !== -1) return;

    // show all connector
    d3.select(`#${this.id}`).selectAll('.drag_connect:not(.connect_header)').classed('hide', false);

    // show all property
    d3.select(`#${this.id}`).selectAll('.property').classed('hide', false);

    const arrPropOfVertex = []; //list of properties that have edge connected
    let bFlag = false; // If this vertex has edge connected then this flag will be active

    d3.select(`#${this.id}`).selectAll('.reduced')._groups[0].forEach(e => {
      arrPropOfVertex.push($(e).attr('prop'));
      bFlag = true;
    })

    if(bFlag) {
      d3.select(`#${this.id}`).selectAll('.reduced').classed('reduced', false);

      this.updatePathConnect();

      /* Update posittion of "rect" */
      this.objectUtils.updatePositionRectConnect(arrPropOfVertex, this);
    }

    this.resetSize(true);

    this.isShowReduced = false;

    if (state) {
      const he = new HistoryElement();
      he.actionType = ACTION_TYPE.SHOW_FULL;
      he.realObject = this;
      state.add(he);
    }
  }

  resetSize(isShowFull = false) {
    let exitConnect = false;
    const vertexId = this.id;

    // Get all prop that not hide
    let arrProp = d3.select(`#${vertexId}`).selectAll('.property:not(.hide)');
    let tmpArry = arrProp._groups[0];

    // When not any edge connect to properties of vertex,
    // Check exit edge connect to vertex
    if (tmpArry.length < 1)
      exitConnect = this.vertexMgmt.edgeMgmt.checkExitEdgeConnectToVertex(vertexId);

    let element = $(`#${vertexId} .vertex_content`);
    element.parent()
      .attr('height', (tmpArry.length ?
        VERTEX_ATTR_SIZE.HEADER_HEIGHT + VERTEX_ATTR_SIZE.PROP_HEIGHT * tmpArry.length : isShowFull ?
          VERTEX_ATTR_SIZE.HEADER_HEIGHT : exitConnect ? VERTEX_ATTR_SIZE.HEADER_HEIGHT : VERTEX_ATTR_SIZE.HEADER_HEIGHT) + 1);
	}
}

export default Vertex;
