import * as d3 from 'd3';
import ColorHash from 'color-hash';
import _ from "lodash";
import ObjectUtils from '../../../common/utilities/object.util';

import {
  BOUNDARY_ATTR_SIZE,
  VERTEX_ATTR_SIZE,
  CONNECT_TYPE,
  CONNECT_SIDE,
	OBJECT_TYPE,
	ACTION_TYPE,
} from '../../../common/const/index';

import {
  generateObjectId,
  setMinBoundaryGraph,
  arrayMove,
  checkModePermission,
	segmentName,
} from '../../../common/utilities/common.util';
import HistoryElement from '../../../common/new-type-define/historyElement';
import State from '../../../common/new-type-define/state';

const CONNECT_KEY = 'Connected';
const FOCUSED_CLASS = 'focused-object';

class Boundary {
  constructor(props) {
    this.mainParent = props.mainParent;
    this.dataContainer = props.boundaryMgmt.dataContainer;
    this.containerId = props.boundaryMgmt.containerId;
    this.svgId = props.boundaryMgmt.svgId;
    this.selectorClass = props.boundaryMgmt.selectorClass || "defaul_boundary_class";
    this.visibleItemSelectorClass = props.boundaryMgmt.visibleItemSelectorClass || "default_visible_item_menu_class";
		this.viewMode = props.boundaryMgmt.viewMode;
		this.history = props.boundaryMgmt.history;
    this.boundaryMgmt = props.boundaryMgmt;

    this.id;
    this.x;
    this.y;
    this.name;
    this.description;
    this.member;
    this.width;
    this.height;
    this.parent;
    this.mandatory;
    this.repeat = "1";
    this.type = OBJECT_TYPE.BOUNDARY;
    this.show = true;
		this.isShowReduced = false;
		this.childIndex = -1; // index in the member list of its parent

    this.startX = -1;
    this.startY = -1;
    this.startWidth = -1;
    this.startHeight = -1;

    this.initialize();
  }

  initialize() {
    this.objectUtils = new ObjectUtils();
    this.colorHash = new ColorHash({ lightness: 0.2 });
    this.colorHashConnection = new ColorHash({lightness: 0.8});

    this.configsDefault = {
      width: BOUNDARY_ATTR_SIZE.BOUND_WIDTH,
      height: BOUNDARY_ATTR_SIZE.BOUND_HEIGHT
    };
  }

  /**
   * * Create boundary with options
   * @param {*} options 
   * @param {*} callbackDragBoundary 
   * @param {*} callbackDragConnection 
   */
  create(options = {}, callbackDragBoundary = () => { },  callbackDragConnection = ()=>{}) {
    let { id, x, y, name, description, member, width, height, parent, mandatory, repeat, isMenu, show} = options;
    
    this.id = id || generateObjectId(OBJECT_TYPE.BOUNDARY);
    this.x = x || 0;
    this.y = y || 0;
    this.name = name || "Boundary";
    this.description = description || "Boundary Description";
    this.member = member || [];
    this.width = width || BOUNDARY_ATTR_SIZE.BOUND_WIDTH;
    this.height = height || BOUNDARY_ATTR_SIZE.BOUND_HEIGHT;
    this.parent = parent || null;
    this.mandatory = mandatory || false;
    if (repeat) {
      // convert to sting type
      repeat = repeat + '';
      this.repeat = repeat === '' ? '1' : repeat;
    }
    this.type = OBJECT_TYPE.BOUNDARY;

    if (show !== null && show !== undefined) {
      this.show = show;
    }

    if (!this.dataContainer.boundary) this.dataContainer.boundary = [];
    this.dataContainer.boundary.push(this);

    let group = d3.select(`#${this.svgId}`).selectAll(`.${this.selectorClass}`)
      .data(this.dataContainer.boundary)
      .enter()
      .append("g")
      .attr("transform", `translate(${this.x}, ${this.y})`)
      .attr("id", this.id)
      .attr("class", `${this.selectorClass}`)
      .style("cursor", "move");
    
    if (checkModePermission(this.viewMode.value, "isEnableDragBoundary")) {
      group.call(callbackDragBoundary);
    }else{
      $(`#${this.id}`).click( () => {
        d3.select(`.${FOCUSED_CLASS}`).classed(FOCUSED_CLASS, false);
        d3.select(`#${this.id}`).classed(FOCUSED_CLASS, true);
        
        this.boundaryMgmt.edgeMgmt.emphasizePathConnectForBoundary(this);        
      });
    }

    group.append("foreignObject")
      .attr("id", `${this.id}Content`)
      .attr("width", this.width)
      .attr("height", this.height)
      .style("border", "solid 1px")
      .style("border-color", this.colorHash.hex(this.name))
      .style("font-size", "13px")
      .style("background", "none")
      .style("pointer-events", "none")
      .append("xhtml:div")
      .attr("class", "boundary_content")
      .html(`
          <div class="boundary_header" style="pointer-events: all">
            <p id="${this.id}Header" class="header_name header_boundary" style="width: 100%;
             height: ${BOUNDARY_ATTR_SIZE.HEADER_HEIGHT}px;
             background-color: ${this.colorHash.hex(this.name)}" 
             title="${this.description}">${segmentName(this, this.viewMode.value)}</p>
          </div>
    `);

    const connectSide = this.boundaryMgmt.vertexMgmt.connectSide;
    if (checkModePermission(this.viewMode.value, "isEnableItemVisibleMenu")) {

      const offset = (connectSide === CONNECT_SIDE.NONE || connectSide === CONNECT_SIDE.LEFT) ? 0 : 7;
      group.append("text")
        .attr("id", `${this.id}Text`)
        .attr("x", this.width - 20 - offset)
        .attr("y", BOUNDARY_ATTR_SIZE.HEADER_HEIGHT - 14)
        .style("stroke", "#ffffff")
        .style("pointer-events", "all")
        .text("+");

      group.append("rect")
        .attr("x", this.width - 25 - offset)
        .attr("y", 9)
        .attr("class", `boundary_right ${this.visibleItemSelectorClass}`)
        .attr("id", `${this.id}Button`)
        .attr("data", this.id)
        .style("pointer-events", "all")
        .attr("fill", "none")
        .append("title")
        .text("Right click to select visible member");
    }

    // Rect connect title INPUT
    if (connectSide === CONNECT_SIDE.BOTH || connectSide === CONNECT_SIDE.LEFT) {
      group.append("rect")
      .attr("class", `drag_connect connect_header drag_connect_${this.svgId}`)
      .attr("type", CONNECT_TYPE.INPUT)
      .attr("prop", `${this.id}${CONNECT_KEY}boundary_title`)
      .attr("pointer-events", "all")
      .attr("width", 12)
      .attr("height", BOUNDARY_ATTR_SIZE.HEADER_HEIGHT - 1)
      .attr("x", 1)
      .attr("y", 1)
      .attr("fill", this.colorHash.hex(this.name))
      .style("cursor", "default")
      .call(callbackDragConnection);
    }

    // Rect connect title OUTPUT
    if (connectSide === CONNECT_SIDE.BOTH || connectSide === CONNECT_SIDE.RIGHT) {
      group.append("rect")
        .attr("class", `drag_connect connect_header drag_connect_${this.svgId}`)
        .attr("prop", `${this.id}${CONNECT_KEY}boundary_title`)
        .attr("pointer-events", "all")
        .attr("type", CONNECT_TYPE.OUTPUT)
        .attr("width", 12)
        .attr("height", BOUNDARY_ATTR_SIZE.HEADER_HEIGHT - 1)
        .attr("x", this.width - (VERTEX_ATTR_SIZE.PROP_HEIGHT / 2))
        .attr("y", 1)
        .attr("fill", this.colorHash.hex(this.name))
        .style("cursor", "default")
        .call(callbackDragConnection);
    }

    if (!this.show) {
      this.visible(false);
    }

    if(isMenu) {
      setMinBoundaryGraph(this.dataContainer, this.svgId, this.viewMode.value);
    }

    return this;
  }

  /**
   * Resize (height, width) of parent boundary
   * When add or remove elements
   */
  updateSize() {
    let orderObject = 0;
    let hBeforeElements = 42;
    let wBoundary = BOUNDARY_ATTR_SIZE.BOUND_WIDTH;
    let marginTop = 3;

    this.member.forEach(mem => {
      if (mem.show) {
        if (mem.type === OBJECT_TYPE.BOUNDARY) {
          let boundaryObj = _.find(this.dataContainer.boundary, {"id": mem.id});
          boundaryObj.updateSize();
        }

        const { width, height } = this.objectUtils.getBBoxObject(`#${mem.id}`);
        orderObject++;
        hBeforeElements += height;
        if (width >= wBoundary)
          wBoundary = width + 10;
      }
    });

    const hBoundary = hBeforeElements + marginTop * orderObject + 2;

    this.setHeight(hBoundary);
    this.setWidth(wBoundary);
  }

  /**
   * Set height boundary
   * @param height
   */
  setHeight(height) {

    const hasShowedMember = _.find(this.member, {"show": true});
    // Set height for boundary
    if (height < BOUNDARY_ATTR_SIZE.BOUND_HEIGHT && (this.member.length === 0 || !hasShowedMember))
      height = BOUNDARY_ATTR_SIZE.BOUND_HEIGHT;

    $(`#${this.id}Content`).attr('height', height);

    // Update data    
    this.height = height;
  }

  /**
   * Set height boundary
   * @param width
   */
  setWidth(width) {
    // Set width for boundary
    if (width < BOUNDARY_ATTR_SIZE.BOUND_WIDTH)
      width = BOUNDARY_ATTR_SIZE.BOUND_WIDTH;

    const connectSide = this.boundaryMgmt.vertexMgmt.connectSide;

    const offset = (connectSide === CONNECT_SIDE.NONE || connectSide === CONNECT_SIDE.LEFT) ? 0 : 7;

    $(`#${this.id}Content`).attr('width', width);
    $(`#${this.id}Button`).attr('x', width - 25 - offset);
    $(`#${this.id}Text`).attr('x', width - 20 - offset);
    $(`[prop='${this.id}${CONNECT_KEY}boundary_title'][type='O']`).attr('x', width - (VERTEX_ATTR_SIZE.PROP_HEIGHT / 2));

    // Update data
    this.width = width;
  }

  /**
   * Reorder and Calculator position for child element
   * @param boudaryId
   * @param position
   */
  reorderPositionMember(pos) {
    let orderObject = 0;
    let hBeforeElements = 42;
    const marginTop = 3;

    // Get child of boundary
    if (!pos) {
      pos = { x: this.x, y: this.y };
    }

    this.member.forEach(mem => {
      if (mem.show) {
        const { height } = this.objectUtils.getBBoxObject(`#${mem.id}`);

        // Vertex position center of boundary
        let position = { x: pos.x + 5, y: pos.y + hBeforeElements + marginTop * orderObject };
        let memObj = {};
        if (mem.type === OBJECT_TYPE.VERTEX) {
          memObj = _.find(this.dataContainer.vertex, { "id": mem.id });
        } else {
          memObj = _.find(this.dataContainer.boundary, { "id": mem.id });
        }
        memObj.setPosition(position);

        orderObject++;
        hBeforeElements += height;
      }
    });
  }

  /**
   * Set position for vertex
   * Called in function dragBoundary (Object boundary)
   * @param vertexId
   * @param position
   */
  setPosition(position, isEffectToMember = true) {
    this.x = position.x;
    this.y = position.y;

    d3.select(`#${this.id}`).attr("transform", "translate(" + [this.x, this.y] + ")");
    this.boundaryMgmt.edgeMgmt.updatePathConnectForVertex(this);

    if (isEffectToMember) {
      this.reorderPositionMember(position);
    }
  }

  findAncestorOfMemberInNestedBoundary() { 
    if (!this.parent) 
      return this; 
 
    let parentObj = _.find(this.dataContainer.boundary, {"id": this.parent}); 
 
    return parentObj.findAncestorOfMemberInNestedBoundary(); 
  } 

  /**
 * Add memebr to boundary
 * @param member
 * @param isEffectToParent if Copy All, just clone from the origin Boundary, no need to calculate the position of parent
 * Member format
 * {id: '', type: [V, B], show: true}
 */
  addMemberToBoundary(member, isEffectToParent = true, state) {
    const oldObject = this.getObjectInfo();

    this.member.push(member);

    if (state) {
      const he = new HistoryElement();
      he.actionType = ACTION_TYPE.MEMBER_CHANGE;
      he.oldObject = oldObject;
      he.dataObject = this.getObjectInfo();
      he.realObject = this;
      state.add(he);
    }

    if (isEffectToParent) {
      this.updateSize();
      this.reorderPositionMember();
      setMinBoundaryGraph(this.dataContainer, this.svgId, this.viewMode.value);
    }
  }

  /**
   * Clone all child boundary, above child of child boundary
   * boundaryCloneId, cloneMembers
   */
  cloneChildElements(cMembers = [], state) {
    for (let i = 0; i < cMembers.length; i++) {
      const member = cMembers[i];
      const objectId = member.id;
      if (member.type === OBJECT_TYPE.VERTEX) {
        const cVertex = _.find(this.dataContainer.vertex, {"id": objectId}).getObjectInfo();
        const cVertexId = generateObjectId(OBJECT_TYPE.VERTEX);
        cVertex.id = cVertexId;
        cVertex.parent = this.id;
        cVertex.x = cVertex.x + 5;
        cVertex.y = cVertex.y + 5;
        cVertex.show = true;
        const child = {id: cVertexId, type: OBJECT_TYPE.VERTEX, show: true};
        this.boundaryMgmt.vertexMgmt.create(cVertex, state);
        this.addMemberToBoundary(child, false, state);
      } else {
        const cBoundary = _.find(this.dataContainer.boundary, {"id": objectId}).getObjectInfo();
        const members = cBoundary.member.slice();
        const cBoundaryId = generateObjectId(OBJECT_TYPE.BOUNDARY);
        cBoundary.id = cBoundaryId;
        cBoundary.parent = this.id;
        cBoundary.member = [];
        cBoundary.x = cBoundary.x + 5;
        cBoundary.y = cBoundary.y + 5;
        cBoundary.show = true;
        const child = {id: cBoundaryId, type: OBJECT_TYPE.BOUNDARY, show: true};
        this.boundaryMgmt.create(cBoundary, state);
        this.addMemberToBoundary(child, false, state);

        const boundaryObj = _.find(this.dataContainer.boundary, { "id": cBoundaryId });
        if (members.length > 0)
          boundaryObj.cloneChildElements(members, state);
      }
    }
  }

  /**
   * Copy boundary and all elements of it
   * Above vertex of boundary (Event child of boundary)
   */
  copyAll() {
    const state = new State();

    const cBoundaryId = generateObjectId(OBJECT_TYPE.BOUNDARY);
    const cBoundary = this.getObjectInfo();
    const cMembers = cBoundary.member.slice();

    cBoundary.member = [];
    cBoundary.id = cBoundaryId;
    cBoundary.x = cBoundary.x + 5;
    cBoundary.y = cBoundary.y + 5;
    cBoundary.parent = null;
    const boudaryObj = this.boundaryMgmt.create(cBoundary, state);
    boudaryObj.cloneChildElements(cMembers, state);

    // for Show redeuced case
    boudaryObj.updateSize();
    boudaryObj.reorderPositionMember();

    if (this.history) {
      this.history.add(state);
    }
  }

  /**
   * Delete boundary and all elements of it
   * Above vertex or boundary (Event child of boundary)
   */
  deleteAll(state) {
    if (!state) {
      state = new State();
    }

    this.doDeleteAll(state);

    if (this.history) {
      this.history.add(state);
    }

    if (this.parent) {
      this.refresh();
    }

    setMinBoundaryGraph(this.dataContainer, this.svgId, this.viewMode.value);
  }

  doDeleteAll(state) {
    // Remove child of boundary
    this.removeChildElementsBoundary(state);

     // Case that delete child boundary nested in boundary
     if(this.parent) {
      const parentObj = this.getParentObject();
      parentObj.removeMemberFromBoundary(this, false, state);
    }

    //remove all edge connect to this boundary
    this.boundaryMgmt.edgeMgmt.removeAllEdgeConnectToVertex(this, state);

    // Remove from DOM
    d3.select(`#${this.id}`).remove();

    // Remove from data container
    _.remove(this.dataContainer.boundary, (e) => {
      return e.id === this.id;
    });

    if (state) {
      const he = new HistoryElement();
      he.actionType = ACTION_TYPE.DELETE;
      he.dataObject = this.getObjectInfo();
      he.realObject = this;
      state.add(he);
    }
  }

  /**
   * Remove boundary element by id
   */
  remove(isMenu = true) {
    let state = null;
    if (isMenu) {
      state = new State();
    }

    this.selectAllMemberVisible(true, false, null, isMenu);

    if (this.parent) {
      const parentObj = _.find(this.dataContainer.boundary,{"id": this.parent});
      parentObj.removeMemberFromBoundary(this, false, state);
    }

    //remove all edge connect to this boundary
    this.boundaryMgmt.edgeMgmt.removeAllEdgeConnectToVertex(this, state);

    // Remove from DOM
    d3.select(`#${this.id}`).remove();

    // Remove from data container
    _.remove(this.dataContainer.boundary, (e) => {
      return e.id === this.id;
    });

    // Reset child parent
    this.resetParentForChild();

    if (isMenu && this.history) {
      const he = new HistoryElement();
      he.actionType = ACTION_TYPE.DELETE;
      he.dataObject = this.getObjectInfo();
      he.realObject = this;
      state.add(he);
      this.history.add(state);
    }

    if (isMenu) {
      this.refresh();
      setMinBoundaryGraph(this.dataContainer, this.svgId, this.viewMode.value);
    }
  }

  /**
   * Remove child boundary
   */
  removeChildElementsBoundary(state) {
    // Get child of boundary
    const  member = _.cloneDeep(this.member);
    member.forEach(mem => {
      if (mem.type === OBJECT_TYPE.VERTEX) {
        //need to put deleteVertex function
        const memObj = _.find(this.dataContainer.vertex, {"id": mem.id})
        this.removeMemberFromBoundary(memObj, false, state);
        memObj.delete(state);
      } else {
        // Remove all child boundary
        const memObj = _.find(this.dataContainer.boundary, {"id": mem.id})
        memObj.doDeleteAll(state);
      }
    });
  }

  /**
   * Selecte member show or hidden
   * @param child
   * @param status
   * @param isEffectToParent
   */
  selectMemberVisible(child, status, isEffectToParent = true, state = null, allowHistory = true) {
    const oldObject = this.getObjectInfo();

    const { id: idChild, type } = child;

    const memberObject = _.find([].concat(this.dataContainer.vertex).concat(this.dataContainer.boundary), {id: idChild});

    if (memberObject) {
      memberObject.visible(status);
    }

    // Update status member boundary
    this.setBoundaryMemberStatus(idChild, status);

    // Set show|hide for edge related
    // Need to work on edge
    this.boundaryMgmt.edgeMgmt.setVisibleAllEdgeRelatedToObject(idChild, status);

    if (type === OBJECT_TYPE.BOUNDARY) {
      // TO-DO: Need improve this code
      const childObj = _.find(this.dataContainer.boundary, {"id": child.id});
      childObj.setObjectShowHide(status);
    }

    if (isEffectToParent) {
      this.refresh();
  
      setMinBoundaryGraph(this.dataContainer, this.svgId, this.viewMode.value);
    }

    if (state) {
      const he = new HistoryElement();
      he.actionType = ACTION_TYPE.VISIBLE_MEMBER;
      he.oldObject = oldObject;
      he.dataObject = this.getObjectInfo();
      he.realObject = this;
      state.add(he);
    } else if (allowHistory && this.history) {
      const state = new State();
      const he = new HistoryElement();
      he.actionType = ACTION_TYPE.VISIBLE_MEMBER;
      he.oldObject = oldObject;
      he.dataObject = this.getObjectInfo();
      he.realObject = this;
      state.add(he);
      this.history.add(state);
    }
  }

	/**
	 * 
	 * @param {*} status 
	 * @param {*} isEffectToParent 
	 */
  selectAllMemberVisible(status, isEffectToParent = true, state = null, allowHistory = true) {
    const oldObject = this.getObjectInfo();

    this.member.forEach(e => {
      this.selectMemberVisible(e, status, false, null, false);
    });

    if (isEffectToParent) {
      this.refresh();
      setMinBoundaryGraph(this.dataContainer, this.svgId, this.viewMode.value);
    }

    if (state) {
      const he = new HistoryElement();
      he.actionType = ACTION_TYPE.VISIBLE_MEMBER;
      he.oldObject = oldObject;
      he.dataObject = this.getObjectInfo();
      he.realObject = this;
      state.add(he);
    } else if (allowHistory && this.history) {
      const state = new State();
      const he = new HistoryElement();
      he.actionType = ACTION_TYPE.VISIBLE_MEMBER;
      he.oldObject = oldObject;
      he.dataObject = this.getObjectInfo();
      he.realObject = this;
      state.add(he);
      this.history.add(state);
    }
  }

  /**
   * Update status for child boundary
   * child match with childId
   * @param childId
   * @param status
   */
  setBoundaryMemberStatus(childId, status) {
    const select = _.find(this.member, (e) => {
      return e.id === childId;
    });

    if (select) {
      select.show = status;

      if (select.type === OBJECT_TYPE.VERTEX) {
        _.find(this.dataContainer.vertex, {id: select.id}).show = status;
      } else if (select.type === OBJECT_TYPE.BOUNDARY) {
        _.find(this.dataContainer.boundary, {id: select.id}).show = status;
      }
    }
  }

  /**
   * When unslect/select a boundary (in nested boundary) then set it hidden/show
   * and set all child hidden/show
   * and resize boundary
   * @param status
   */
  setObjectShowHide(status) {
    // Loop child
    this.member.forEach(member => {
      this.setBoundaryMemberStatus(member.id, status);

      const memberObject = _.find([].concat(this.dataContainer.vertex).concat(this.dataContainer.boundary), {id: member.id});
      if (memberObject) {
        memberObject.visible(status);
      }

      this.boundaryMgmt.edgeMgmt.setVisibleAllEdgeRelatedToObject(member.id, status);

      if (member.type === OBJECT_TYPE.BOUNDARY) {
        let memberObj = _.find(this.dataContainer.boundary, {"id": member.id});
        memberObj.setObjectShowHide(status);
      }
    });
  }

  /**
   * Reset parent for child boundary when it deleted
   */
  // Get child of boundary
    resetParentForChild() {
    this.member.forEach(mem => {
      const id = mem.id;
      if (mem.type === OBJECT_TYPE.VERTEX) {
        const info = _.find(this.dataContainer.vertex, {"id": id});
        info.parent = null;
      } else {
        const info = _.find(this.dataContainer.boundary, {"id": id});
        info.parent = null;
      }
    });
  }

  restoreParentForChild() {
    // Get child of boundary
    this.member.forEach(mem => {
      const id = mem.id;
      if (mem.type === OBJECT_TYPE.VERTEX) {
        const info = _.find(this.dataContainer.vertex, {"id": id});
        info.parent = this.id;
      } else {
        const info = _.find(this.dataContainer.boundary, {"id": id});
        info.parent = this.id;
      }
    });
  }

  moveMember(offsetX, offsetY) {
    this.member.forEach(member => {
      if (member.show) {
        let memberobj = null;
        if (member.type === OBJECT_TYPE.VERTEX) {
          memberobj = _.find(this.dataContainer.vertex, {"id": member.id});
        } else {
          memberobj = _.find(this.dataContainer.boundary, {"id": member.id});
        }

        memberobj.move(offsetX, offsetY);
      }
    });
  }

  /**
   * Move boundary with specified offset
   * @param {*} offsetX
   * @param {*} offsetY
   */
  move( offsetX, offsetY) {
    this.x = this.x + offsetX;
    this.y = this.y + offsetY;

    d3.select(`#${this.id}`).attr("transform", "translate(" + [this.x, this.y] + ")");

    this.boundaryMgmt.edgeMgmt.updatePathConnectForVertex(this);

    this.moveMember(offsetX, offsetY);
  }

  changeIndexMemberToBoundary(indexOld, indexNew) {
    arrayMove(this.member, indexOld, indexNew);
    this.reorderPositionMember();
  }

  /**
   * Add member to boundary by index
   * @param child
   * @param index
   */
  addMemberToBoundaryWithIndex(child, index, state) {
		// For history
		const oldObject = this.getObjectInfo();

		this.member.splice(index, 0, {id: child.id, type: child.type, show: child.show});
    
    if (state) {
      const he = new HistoryElement();
      he.actionType = ACTION_TYPE.MEMBER_CHANGE;
      he.oldObject = oldObject;
      he.dataObject = this.getObjectInfo();
      he.realObject = this;
      state.add(he);
    }

		this.refresh();
		
    setMinBoundaryGraph(this.dataContainer, this.svgId, this.viewMode.value);
  }

  removeMemberFromBoundary(obj, isEffectToParent = true, state = null) {
		const oldBoundary = this.getObjectInfo();

    _.remove(this.member, (e) => {
      return e.id === obj.id;
		});
    
    if (state) {
      const he = new HistoryElement();
      he.actionType = ACTION_TYPE.MEMBER_CHANGE;
      he.oldObject = oldBoundary;
      he.dataObject = this.getObjectInfo();
      he.realObject = this;
      state.add(he);
    }

    // Resize ancestor of parent
    if (isEffectToParent) {
			this.refresh();
    }
  }

	/**
	 * Move this boundary and all it's child when selelecting on it
	 */
  moveToFront() {
    d3.select(`#${this.id}`).moveToFront();

    if (this.dataContainer.boundary.length > 1) {
      const curIndex = _.findIndex(this.dataContainer.boundary, {"id": this.id});

      arrayMove(this.dataContainer.boundary, curIndex, this.dataContainer.boundary.length - 1);
    }
    
    let memObj = null;
    this.member.forEach(e => {
      if (e.type === OBJECT_TYPE.VERTEX) {
        memObj = _.find(this.dataContainer.vertex, {"id": e.id});
      }else{
        memObj = _.find(this.dataContainer.boundary, {"id": e.id});
      }
      
      if (memObj)
        memObj.moveToFront();
    });
	}
	
	/**
	 * Checking if this boundary is the parent of object with objectId
	 * @param {*} objectId 
	 */
	isParentOf(objectId) {
		for (let i = 0; i < this.member.length; i++) {
			const mem = this.member[i];
			if (mem.id === objectId) {
				return true;
			} else if (mem.type === OBJECT_TYPE.BOUNDARY) {
				const memObj = _.find(this.dataContainer.boundary, {"id": mem.id});
				if (memObj.isParentOf(objectId)) {
					return true;
				}
			}
		}

		return false;
	}

	getParentObject() {
		if (!this.parent) return null;
		
		return _.find(this.dataContainer.boundary, {'id': this.parent});
	}

	/**
	 * 
	 */
	validateConnectionByUsage() {
		let bFlag = true;

		for (let i = 0; i < this.member.length; i++) {
			const mem = this.member[i];
			if (!this.doValidateConnectionByUsage(mem) && bFlag)  bFlag = false;
		}

		return bFlag;
	}

	/**
	 * 
	 * @param {*} mem
	 */
	doValidateConnectionByUsage(mem) {
		let bFlag = true;
		
		if (mem.type === OBJECT_TYPE.VERTEX) {
			const vertex = _.find(this.dataContainer.vertex, {"id": mem.id})
			if (vertex) {
				if (!vertex.validateConnectionByUsage() && bFlag) {
					bFlag = false;
				}
			}
		} else {
			const boundary = _.find(this.dataContainer.boundary, {"id": mem.id})
			boundary.member.forEach(item => {
				if (!this.doValidateConnectionByUsage(item) && bFlag) {
					bFlag = false;
				}
			})
		}

		return bFlag;
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
    const $vtxTitle = $(`#${this.id}`).find('.header_boundary');
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

  updateInfo(info, state) {
    const {name, mandatory, repeat, description, member} = info;

    const oldObject = this.getObjectInfo();

    if (name) this.name = name;
    if (mandatory !== undefined) this.mandatory = mandatory;
    if (repeat) this.repeat = repeat;
    if (description) this.description = description;
    if (member) this.member = _.cloneDeep(member);
    
    const $header = d3.select(`#${this.id}Header`);
    $header.text(segmentName(this, this.viewMode.value)).attr('title', this.description);
    $header.style('background-color', `${this.colorHash.hex(this.name)}`);

    d3.select(`#${this.id}Content`).style('border-color', `${this.colorHash.hex(this.name)}`);

    d3.selectAll(`[prop='${this.id}${CONNECT_KEY}boundary_title']`).attr('fill', this.colorHash.hex(this.name));

    // Create history
		if (state) {
			const he = new HistoryElement();
			he.actionType = ACTION_TYPE.UPDATE_INFO;
			he.oldObject = oldObject;
			he.dataObject = this.getObjectInfo();
			he.realObject = this;
			state.add(he);
		}
  }

  refresh() {
		const ancestor = this.findAncestorOfMemberInNestedBoundary();
		if (!ancestor) return;

		ancestor.updateSize();
		ancestor.reorderPositionMember();
		ancestor.boundaryMgmt.edgeMgmt.updatePathConnectForVertex(ancestor);
	}

	getObjectInfo() {
		return {
			containerId: this.containerId,
			svgId: this.svgId,
			selectorClass: this.selectorClass,
			visibleItemSelectorClass: this.visibleItemSelectorClass,
			viewMode: this.viewMode,
			id: this.id,
			x: this.x,
			y: this.y,
			name: this.name,
			description: this.description,
			member: _.cloneDeep(this.member),
			width: this.width,
			height: this.height,
			parent: this.parent,
			mandatory: this.mandatory,
			repeat: this.repeat,
			type: this.type,
			show: this.show,
			isShowReduced: this.isShowReduced,
			childIndex: this.childIndex,
			startX: this.startX,
			startY: this.startY,
			startWidth: this.startWidth,
			startHeight: this.startHeight,
		}
  }
  
  setStatusForAllMembers(status) {
    this.member.forEach(mem => {
      mem.show = status;

      if (member.type === OBJECT_TYPE.VERTEX) {
        _.find(this.dataContainer.vertex, {id: member.id}).show = status;
      } else if (member.type === OBJECT_TYPE.BOUNDARY) {
        _.find(this.dataContainer.boundary, {id: member.id}).show = status;
      }
    })
  }

  visible(status) {
    d3.select(`#${this.id}`).classed('hidden-object', !status);
    this.show = status;
  }
}

export default Boundary
