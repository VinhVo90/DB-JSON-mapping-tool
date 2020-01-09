

const MessageElementType = require('./message/message_element_type');
/**
 * @class
 * Messagespec matches message and spec.
 */
class MockMessageSpec {
  /**
   * @param {String} delimiter
   * @param {Object} messageStructure
   * @param {Object} lastMatchedGroup
   */
  constructor(delimiter, messageStructure, lastMatchedGroup) {
    this._delimiter = delimiter;
    this._messageStructure = messageStructure;
    this._lastMatchedGroup = lastMatchedGroup;
    this._lastMatchedSegment = null;
    this._validationResult = [];
  }

  _lastSuccess() {
    return {
      group: this._lastMatchedGroup,
      segment: this._lastMatchedSegment,
    };
  }

  /**
   * match message and spec.
   * @returns {validationResult} - return Result object.
   */
  match(messageElement) {
    // todo: initialize
    if (MessageElementType.isSegmentGroup(messageElement.elementType)) {
      const children = messageElement.children;
      if (Array.isArray(children)) {
        this._validateArray(children);
      }
    }

    if (MessageElementType.isSegment(messageElement.elementType)) {
      const result = messageElement.validateUsage();
      if (!result.isValid()) {
        this._validationResult.push(result);
      }
      const children = messageElement.children;
      if (Array.isArray(children)) {
        this._validateArray(children);
      }
    }

    if (Array.isArray(messageElement)) {
      this._validateArray(messageElement);
    }

    if (MessageElementType.isDataElement(messageElement.elementType)) {
      const result = messageElement.validate();
      if (!result.isValid()) {
        this._validationResult.push(result);
      }
    }
  }

  _validateArray(elements) {
    for (const element of elements) {
      this.match(element);
    }
  }

  _print() {
    return this._root.print();
  }

  get messageStructure() {
    return this._messageStructure;
  }

  set messageStructure(messageStructure) {
    this._messageStructure = messageStructure;
  }

  get specGroupList() {
    return this._specGroupList;
  }

  set specGroupList(specGroupList) {
    this._specGroupList = specGroupList;
  }

  get lastMatchedGroup() {
    return this._lastMatchedGroup;
  }

  set lastMatchedGroup(lastMatchedGroup) {
    this._lastMatchedGroup = lastMatchedGroup;
  }
}

module.exports = MockMessageSpec;
