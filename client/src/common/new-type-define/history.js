class History {
  constructor(maxSize) {
    this.store = [];
    this.currentIndex = -1;
    this.maxSize = maxSize || 100;
  }

  add(state) {
    if (!state || state.listOfHistoryElement.length === 0) return;

    if (this.currentIndex < this.store.length - 1) {
      this.store.splice(this.currentIndex + 1, (this.store.length - 1) - (this.currentIndex));
    }
    state.parent = this;
    this.store.push(state);

    if (this.store.length > this.maxSize) {
      this.store.shift();
    } else {
      this.currentIndex++;
    }
  }

  updateRealObject(realObject) {
    this.store.forEach((state) => {
      state.listOfHistoryElement.forEach((he) => {
        if (he.realObject && he.realObject.id === realObject.id) {
          he.realObject = realObject;
        }
      });
    });
  }

  undo() {
    if (this.store.length < 1) return;
    if (this.currentIndex < 0) return;
    if (this.currentIndex == this.store.length) this.currentIndex--;

    const state = this.store[this.currentIndex];
    state.undo();

    this.currentIndex--;
  }

  redo() {
    if (this.store.length < 1) return;
    if (this.currentIndex + 1 == this.store.length) return;

    this.currentIndex++;

    const state = this.store[this.currentIndex];
    state.redo();
  }

  clear() {
    this.store = [];
    this.currentIndex = -1;
  }
}

export default History;
