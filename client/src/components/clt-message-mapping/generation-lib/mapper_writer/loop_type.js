class LoopType {
  static get INPUT_SEGMENT_GROUP() {
    return Symbol.for('INPUT_SEGMENT_GROUP');
  }

  static get INPUT_SEGMENT() {
    return Symbol.for('INPUT_SEGMENT');
  }

  static get OUTPUT_SEGMENT_GROUP() {
    return Symbol.for('OUTPUT_SEGMENT_GROUP');
  }

  static get OUTPUT_SEGMENT() {
    return Symbol.for('OUTPUT_SEGMENT');
  }

  static isInputSegmentGroup(type) {
    return type === this.INPUT_SEGMENT_GROUP;
  }

  static isInputSegment(type) {
    return type === this.INPUT_SEGMENT;
  }

  static isOutputSegmentGroup(type) {
    return type === this.OUTPUT_SEGMENT_GROUP;
  }

  static isOutputSegment(type) {
    return type === this.OUTPUT_SEGMENT;
  }
}

module.exports = LoopType;
