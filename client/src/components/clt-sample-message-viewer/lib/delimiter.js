

/**
 * @class
 * Class has delimiter Information.
 */
class Delimiter {
  /**
   *
   * @param {String} segmentTerminator
   * @param {String} dataElementSeparator
   * @param {String} componentDataSeparator
   * @param {String} releaseCharacter
   * @param {String} groupOpenDelimiter
   * @param {String} groupCloseDelimiter
   */
  constructor(segmentTerminator, dataElementSeparator = '', componentDataSeparator = '', releaseCharacter = '', groupOpenDelimiter = '', groupCloseDelimiter = '') {
    this._segmentTerminator = segmentTerminator;
    this._dataElementSeparator = dataElementSeparator;
    this._componentDataSeparator = componentDataSeparator;
    this._releaseCharacter = releaseCharacter;
    this._groupOpenDelimiter = groupOpenDelimiter;
    this._groupCloseDelimiter = groupCloseDelimiter;
  }

  get segmentTerminator() {
    return this._segmentTerminator;
  }

  get dataElementSeparator() {
    return this._dataElementSeparator;
  }

  get componentDataSeparator() {
    return this._componentDataSeparator;
  }

  get releaseCharacter() {
    return this._releaseCharacter;
  }

  get groupOpenDelimiter() {
    return this._groupOpenDelimiter;
  }

  get groupCloseDelimiter() {
    return this._groupCloseDelimiter;
  }

  static createDelimiter(segmentTerminator, dataElementSeparator, componentDataSeparator) {
    return new Delimiter(segmentTerminator, dataElementSeparator, componentDataSeparator);
  }

  static createOpusFlatFile() {
    return new Delimiter('\n', ':', '', '', '{', '}');
  }

  static createEdifact() {
    return new Delimiter('\'', '+', ':', '?');
  }

  static createFixedLength(segmentTerminator = '\n') {
    return new Delimiter(segmentTerminator);
  }
}

module.exports = Delimiter;
