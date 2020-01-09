import { ACTION_TYPE, OBJECT_TYPE, CONNECT_TYPE } from '../const';
import ObjectUtils from '../utilities/object.util';
import { setMinBoundaryGraph } from '../utilities/common.util';

class HistoryElement {
  constructor(props = {}) {
    this.parent = null;
    this.actionType = null;
    this.oldObject = null; // before updating
    this.dataObject = null; // after updating
    this.realObject = null; // used for any action that need to effect to real object data

    this.objectUtils = new ObjectUtils();
  }

  undo(isLastObject) {
    let obj = null;
    switch (this.actionType) {
      case ACTION_TYPE.CREATE:
        if (this.realObject.type === OBJECT_TYPE.VERTEX || this.realObject.type === OBJECT_TYPE.BOUNDARY) {
          const parent = this.realObject.getParentObject();

          this.realObject.remove(false);

          if (isLastObject) {
            if (parent) {
              // in case of moving out of boundary
              parent.refresh();
            } else {
              // in case of moving into boundary
              this.realObject.refresh();
            }
          }
        } else {
          this.realObject.remove(false);
        }
        break;


      case ACTION_TYPE.UPDATE_INFO:
        if (this.realObject.type === OBJECT_TYPE.VERTEX) {
          this.realObject.vertexMgmt.updateVertexInfo(this.oldObject, false);
        } else if (this.realObject.type === OBJECT_TYPE.BOUNDARY) {
          this.realObject.updateInfo(this.oldObject);
        } else if (this.realObject.type === OBJECT_TYPE.EDGE) {
          this.realObject.updateInfo(this.oldObject);
        }

        if (isLastObject) {
          this.refreshObject();
        }
        break;


      case ACTION_TYPE.DELETE:
        if (this.realObject.type === OBJECT_TYPE.VERTEX) {
          const parent = this.realObject.getParentObject();

          obj = this.realObject.vertexMgmt.create(this.dataObject);
          this.parent.updateRealObject(obj);

          if (isLastObject && parent) {
            parent.refresh();
          }
        } else if (this.realObject.type === OBJECT_TYPE.BOUNDARY) {
          obj = this.realObject.boundaryMgmt.create(this.dataObject);
          obj.restoreParentForChild();
          this.parent.updateRealObject(obj);

          if (isLastObject) {
            obj.refresh();
          }
        } else if (this.realObject.type === OBJECT_TYPE.EDGE) {
          obj = this.realObject.edgeMgmt.create(this.dataObject);
          this.parent.updateRealObject(obj);
          obj.updatePathConnect();
          obj.setStatusEdgeOnCurrentView();
        }
        break;


      case ACTION_TYPE.MOVE:
        if (this.realObject.type == OBJECT_TYPE.VERTEX || this.realObject.type == OBJECT_TYPE.BOUNDARY) {
          this.realObject.setPosition({ x: this.dataObject.startX, y: this.dataObject.startY });
        }
        break;


      case ACTION_TYPE.CONNECTOR_CHANGE:
        this.realObject.edgeMgmt.cancleSelectedPath();

        // If changed source connection => changed on output connector
        if (this.oldObject.source.prop !== this.dataObject.source.prop) {
          const vertexId = this.oldObject.source.vertexId;
          const propId = this.oldObject.source.prop;
          this.realObject.updateConnector(vertexId, CONNECT_TYPE.OUTPUT, propId);
        }

        // If changed source connection => changed on input connector
        if (this.oldObject.target.prop !== this.dataObject.target.prop) {
          const vertexId = this.oldObject.target.vertexId;
          const propId = this.oldObject.target.prop;
          this.realObject.updateConnector(vertexId, CONNECT_TYPE.INPUT, propId);
        }
        break;


      case ACTION_TYPE.MEMBER_CHANGE:
        this.realObject.member = _.cloneDeep(this.oldObject.member);

        if (isLastObject) {
          this.realObject.refresh();
        }
        break;


      case ACTION_TYPE.PARENT_CHANGE:
        const parent = this.realObject.getParentObject();

        this.realObject.parent = this.oldObject.parent;

        this.realObject.setPosition({ x: this.dataObject.startX, y: this.dataObject.startY });

        this.realObject.validateConnectionByUsage();

        if (isLastObject) {
          if (parent) {
            // in case of moving out of boundary
            parent.refresh();
          } else {
            // in case of moving into boundary
            this.realObject.refresh();
          }
        }
        break;


      case ACTION_TYPE.MEMBER_INDEX_CHANGE:
        const parentObj = this.realObject.getParentObject();
        const fromIndex = this.dataObject.childIndex;
        const toIndex = this.oldObject.childIndex;
        parentObj.changeIndexMemberToBoundary(fromIndex, toIndex);
        break;

      case ACTION_TYPE.CLEAR_ALL_EDGE:
        this.realObject.restore(this.dataObject);
        break;


      case ACTION_TYPE.CLEAR_ALL_VERTEX_BOUNDARY:
        this.realObject.restore(this.dataObject);
        break;

      case ACTION_TYPE.AUTO_ALIGNMENT:
        this.realObject.resetPosition(this.oldObject);
        break;

      case ACTION_TYPE.VISIBLE_MEMBER:
        this.oldObject.member.forEach((item) => {
          const visibleMember = _.find(this.dataObject.member, e => item.id === e.id && item.show !== e.show);

          if (visibleMember) {
            this.realObject.selectMemberVisible(visibleMember, !visibleMember.show, false, null, false);
          }
        });

        if (isLastObject) {
          this.realObject.refresh();
        }
        break;


      case ACTION_TYPE.SHOW_FULL:
        this.realObject.showReduced();

        if (isLastObject) {
          if (this.realObject.dataContainer.boundary.length > 0) {
            this.objectUtils.updateHeightBoundary(this.realObject.dataContainer);
          }

          setMinBoundaryGraph(this.realObject.dataContainer, this.realObject.svgId, this.realObject.viewMode.value);
        }
        break;


      case ACTION_TYPE.SHOW_REDUCED:
        this.realObject.showFull();

        if (isLastObject) {
          if (this.realObject.dataContainer.boundary.length > 0) {
            this.objectUtils.updateHeightBoundary(this.realObject.dataContainer);
          }

          setMinBoundaryGraph(this.realObject.dataContainer, this.realObject.svgId, this.realObject.viewMode.value);
        }
        break;


      case ACTION_TYPE.UPDATE_SHOW_FULL_STATUS:
        this.realObject.isShowReduced = true;
        break;


      case ACTION_TYPE.UPDATE_SHOW_REDUCED_STATUS:
        this.realObject.isShowReduced = false;
        break;
    }
  }

  redo(isLastObject) {
    let obj = null;
    switch (this.actionType) {
      case ACTION_TYPE.CREATE:
        if (this.realObject.type === OBJECT_TYPE.VERTEX) {
          obj = this.realObject.vertexMgmt.create(this.dataObject);
          this.parent.updateRealObject(obj);
        } else if (this.dataObject.type === OBJECT_TYPE.BOUNDARY) {
          obj = this.realObject.boundaryMgmt.create(this.dataObject);
          this.parent.updateRealObject(obj);
        } else if (this.realObject.type === OBJECT_TYPE.EDGE) {
          const edge = this.realObject.edgeMgmt.create(this.dataObject);
          this.parent.updateRealObject(edge);
          edge.updatePathConnect();
          edge.setStatusEdgeOnCurrentView();
        }

        if (isLastObject) {
          this.refreshObject();
        }
        break;


      case ACTION_TYPE.UPDATE_INFO:
        if (this.realObject.type === OBJECT_TYPE.VERTEX) {
          this.realObject.vertexMgmt.updateVertexInfo(this.dataObject, false);
        } else if (this.realObject.type === OBJECT_TYPE.BOUNDARY) {
          this.realObject.updateInfo(this.dataObject);
        } else if (this.realObject.type === OBJECT_TYPE.EDGE) {
          this.realObject.updateInfo(this.dataObject);
        }

        if (isLastObject) {
          this.refreshObject();
        }
        break;


      case ACTION_TYPE.DELETE:
        if (this.realObject.type === OBJECT_TYPE.VERTEX || this.realObject.type === OBJECT_TYPE.BOUNDARY) {
          const parent = this.realObject.getParentObject();

          this.realObject.remove(false);

          if (isLastObject) {
            if (parent) {
              // in case of moving out of boundary
              parent.refresh();
            } else {
              // in case of moving into boundary
              this.realObject.refresh();
            }
          }
        } else {
          this.realObject.remove(false);
        }
        break;


      case ACTION_TYPE.MOVE:
        if (this.realObject.type == OBJECT_TYPE.VERTEX || this.realObject.type == OBJECT_TYPE.BOUNDARY) {
          this.realObject.setPosition({ x: this.dataObject.x, y: this.dataObject.y });
        }
        break;


      case ACTION_TYPE.CONNECTOR_CHANGE:
        this.realObject.edgeMgmt.cancleSelectedPath();

        // If changed source connection => changed on output connector
        if (this.oldObject.source.prop !== this.dataObject.source.prop) {
          const vertexId = this.dataObject.source.vertexId;
          const propId = this.dataObject.source.prop;
          this.realObject.updateConnector(vertexId, CONNECT_TYPE.OUTPUT, propId);
        }

        // If changed target connection => changed on input connector
        if (this.oldObject.target.prop !== this.dataObject.target.prop) {
          const vertexId = this.dataObject.target.vertexId;
          const propId = this.dataObject.target.prop;
          this.realObject.updateConnector(vertexId, CONNECT_TYPE.INPUT, propId);
        }
        break;


      case ACTION_TYPE.MEMBER_CHANGE:
        this.realObject.member = _.cloneDeep(this.dataObject.member);

        if (isLastObject) {
          this.realObject.refresh();
        }
        break;


      case ACTION_TYPE.PARENT_CHANGE:
        const parent = this.realObject.getParentObject();

        this.realObject.parent = this.dataObject.parent;

        this.realObject.setPosition({ x: this.dataObject.x, y: this.dataObject.y });

        this.realObject.validateConnectionByUsage();

        if (isLastObject) {
          if (parent) {
            // in case of moving out of boundary
            parent.refresh();
          } else {
            // in case of moving into boundary
            this.realObject.refresh();
          }
        }
        break;


      case ACTION_TYPE.MEMBER_INDEX_CHANGE:
        const parentObj = this.realObject.getParentObject();
        const fromIndex = this.oldObject.childIndex;
        const toIndex = this.dataObject.childIndex;
        parentObj.changeIndexMemberToBoundary(fromIndex, toIndex);
        break;


      case ACTION_TYPE.CLEAR_ALL_EDGE:
        this.realObject.clearAll();
        break;


      case ACTION_TYPE.CLEAR_ALL_VERTEX_BOUNDARY:
        this.realObject.clearAll();
        break;


      case ACTION_TYPE.AUTO_ALIGNMENT:
        this.realObject.resetPosition(this.dataObject);
        break;


      case ACTION_TYPE.VISIBLE_MEMBER:
        this.oldObject.member.forEach((item) => {
          const visibleMember = _.find(this.dataObject.member, e => item.id === e.id && item.show !== e.show);

          if (visibleMember) {
            this.realObject.selectMemberVisible(visibleMember, visibleMember.show, false, null, false);
          }
        });

        if (isLastObject) {
          this.realObject.refresh();
        }
        break;


      case ACTION_TYPE.SHOW_FULL:
        this.realObject.showFull();

        if (isLastObject) {
          if (this.realObject.dataContainer.boundary.length > 0) {
            this.objectUtils.updateHeightBoundary(this.realObject.dataContainer);
          }

          setMinBoundaryGraph(this.realObject.dataContainer, this.realObject.svgId, this.realObject.viewMode.value);
        }
        break;


      case ACTION_TYPE.SHOW_REDUCED:
        this.realObject.showReduced();

        if (isLastObject) {
          if (this.realObject.dataContainer.boundary.length > 0) {
            this.objectUtils.updateHeightBoundary(this.realObject.dataContainer);
          }

          setMinBoundaryGraph(this.realObject.dataContainer, this.realObject.svgId, this.realObject.viewMode.value);
        }
        break;


      case ACTION_TYPE.UPDATE_SHOW_FULL_STATUS:
        this.realObject.isShowReduced = false;
        break;


      case ACTION_TYPE.UPDATE_SHOW_REDUCED_STATUS:
        this.realObject.isShowReduced = true;
        break;
    }
  }

  refreshObject() {
    if (this.realObject.type === OBJECT_TYPE.VERTEX || this.realObject.type === OBJECT_TYPE.BOUNDARY) {
      this.realObject.refresh();
    }
  }
}

export default HistoryElement;
