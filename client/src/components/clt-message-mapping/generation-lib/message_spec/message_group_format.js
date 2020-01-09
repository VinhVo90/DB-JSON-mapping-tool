class MessageGroupFormat {
  /**
   * @param {MessageGroupFormatType} type
   */
  constructor(type) {
    this._type = type;
  }

  static newBuilder(type) {
    return new MessageGroupFormat(type);
  }

  setGroupBeginFormatter(groupBeginFormatter) {
    this._groupBeginFormatter = groupBeginFormatter;
    return this;
  }

  setGroupEndFormatter(groupEndFormatter) {
    this._groupEndFormatter = groupEndFormatter;
    return this;
  }

  setSegmentBeginFormatter(segmentBeginFormatter) {
    this._segmentBeginFormatter = segmentBeginFormatter;
    return this;
  }

  setSegmentEndFormatter(segmentEndFormatter) {
    this._segmentEndFormatter = segmentEndFormatter;
    return this;
  }

  /**
   * Set a data formatter to express each data form in the mapper.
   * @param {function} formatter a function with parameter (type, length)
   */
  setDataFormatter(formatter) {
    this._dataFormatter = formatter;
    return this;
  }

  setDataElementSeparator(separator) {
    this._dataElementSeparator = separator;
    return this;
  }

  setComponentDataElementSeparator(separator) {
    this._conponentDataElementSeparator = separator;
    return this;
  }

  build() {
    return Object.freeze(this);
  }

  groupBegin(name) {
    return this._groupBeginFormatter ? this._groupBeginFormatter(name) : '';
  }

  groupEnd(name = '') {
    return this._groupEndFormatter ? this._groupEndFormatter(name) : '';
  }

  segmentBegin(name) {
    return this._segmentBeginFormatter ? this._segmentBeginFormatter(name) : '';
  }

  segmentEnd(name = '') {
    return this._segmentEndFormatter ? this._segmentEndFormatter(name) : '';
  }

  dataForm(type = '', length = '') {
    return this._dataFormatter ? this._dataFormatter(type, length) : '%s';
  }

  get dataElementSeparator() {
    return this._dataElementSeparator || '';
  }

  get componentDataElementSeparator() {
    return this._conponentDataElementSeparator || '';
  }

  get type() {
    return this._type;
  }
}

module.exports = MessageGroupFormat;
