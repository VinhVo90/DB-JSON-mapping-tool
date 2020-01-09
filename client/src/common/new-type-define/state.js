import { OBJECT_TYPE, ACTION_TYPE } from '../const';

class State {
  constructor(props = {}) {
    this.parent = null;
    this.actionType = null;
    this.listOfHistoryElement = [];
    this.dataContainer = {
      vertex: [],
      boundary: [],
      edge: [],
    };
  }

  add(historyElement) {
    historyElement.parent = this;
    this.listOfHistoryElement.push(historyElement);
  }

  undo() {
    let lastEffectObjectIndex = -1;
    for (let i = 0; i < this.listOfHistoryElement.length; i += 1) {
      const object = this.listOfHistoryElement[i].realObject;

      if (object.type && (object.type === OBJECT_TYPE.VERTEX || object.type === OBJECT_TYPE.BOUNDARY)) {
        lastEffectObjectIndex = i;
        break;
      }
    }

    for (let i = this.listOfHistoryElement.length - 1; i >= 0; i--) {
      this.listOfHistoryElement[i].undo(i === lastEffectObjectIndex);
    }
  }

  redo() {
    let lastEffectObjectIndex = -1;
    for (let i = this.listOfHistoryElement.length - 1; i >= 0; i -= 1) {
      const object = this.listOfHistoryElement[i].realObject;

      if (object.type && (object.type === OBJECT_TYPE.VERTEX || object.type === OBJECT_TYPE.BOUNDARY)) {
        lastEffectObjectIndex = i;
        break;
      }
    }

    this.listOfHistoryElement.forEach((he, index) => {
      he.redo(index === lastEffectObjectIndex);
    });
  }

  updateRealObject(obj) {
    this.parent.updateRealObject(obj);
  }
}

export default State;
