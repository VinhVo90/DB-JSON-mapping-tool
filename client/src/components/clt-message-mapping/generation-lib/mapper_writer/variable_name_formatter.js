class VariableNameFormatter {
  constructor(prefix = '') {
    this._prefix = prefix;
  }

  dataElementIdVarName(name = '') {
    return `id${this._prefix}DataElement${name}`;
  }

  segmentGroupIndexVarName(name) {
    return `idx${this._prefix}Group${name}`;
  }

  /**
   * There can be a chance of the same group name of different group.
   * To avoid that risk, recommend to use index for variable name.
   * @param {string} name
   */
  segmentGroupIdVarName(name) {
    return `id${this._prefix}Group${name}`;
  }

  /**
   * There can be a chance of the same group name of different group.
   * To avoid that risk, recommend to use index for variable name.
   * @param {string} name
   */
  segmentGroupCounterVarName(name = '') {
    return `cnt${this._prefix}Group${name}`;
  }

  segmentGroupCounterName(name) {
    return `n${this._prefix}Group${name}`;
  }

  segmentIndexVarName(segmentGroupIndex, loopName) {
    return `idx${this._prefix}Segment${segmentGroupIndex}_${loopName}`;
  }

  segmentIdVarName() {
    return `id${this._prefix}Segment`;
  }

  segmentCounterVarName() {
    return `cnt${this._prefix}Segment`;
  }

  segmentCounterName(segmentName) {
    return `n${this._prefix}Segment${segmentName}`;
  }
}

module.exports = VariableNameFormatter;
