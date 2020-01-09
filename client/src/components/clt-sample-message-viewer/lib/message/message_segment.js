

const MessageElementType = require('./message_element_type');
const ResultType = require('./result_type');
const ValidationResult = require('./validation_result');
/**
 * @class
 * A class that represents MessageSegment in the Message.
 * (MessageSegmentGroup -> MessageSegment -> MessageDataElement)
 */
class MessageSegment {
  /**
  *
  * @param {String} name
  * @param {Object} children
  * @param {Object} matchResult
  * @param {Object} spec
  * @param {String} id
  * @param {Number} order
  * @param {Object} parent
  * @param {Object} elementType
  */
  constructor(name, children = [], matchResult = true, spec = null, id = null, order = 0, parent = '') {
    this._name = name;
    this._children = children;
    this._matchResult = matchResult;
    this._spec = spec;
    this._id = id;
    this._order = order;
    this._parent = parent;
    this._elementType = MessageElementType.Segment;
  }

  validateUsage() {
    let isCompositeMandatory;
    let isLastComponentMandatoryHasValue;
    let lastElement = '';

    for (const dataElement of this.spec.dataElements) {
      isLastComponentMandatoryHasValue = undefined;
      // COMPOSITE
      if (dataElement.type === 'COMPOSITE') {
        if (lastElement === 'COMPOSITE') {
          return new ValidationResult(ResultType.FAIL_FIND_TARGET_DATA_ELEMENT, 'CONTINUOUS COMPOSITE DATA');
        }

        if (dataElement.mandatory === true) {
          isCompositeMandatory = true;
        } else {
          isCompositeMandatory = false;
        }
        lastElement = 'COMPOSITE';
        continue;
      }
      // COMPONENT
      if (dataElement.type === 'COMPONENT') {
        if (lastElement === 'SIMPLE') {
          return new ValidationResult(ResultType.FAIL_FIND_TARGET_DATA_ELEMENT, `[${dataElement.name}]COMPONENT DATA AFTER SIMPLE DATA`);
        }

        lastElement = 'COMPONENT';
        if (isCompositeMandatory) { // COMPOSITE ==> M
          if (dataElement.mandatory === true && dataElement.value === '') {
            return new ValidationResult(ResultType.FAIL_VALIDATION_DATA_ELEMENT, `[USAGE] ${dataElement.parent.name}-${dataElement.name}: ${dataElement.mandatory} | ${dataElement.value}`);
          }

          continue;
        }

        // COMPOSITE ==> C
        if (isLastComponentMandatoryHasValue === undefined) {
          if (dataElement.mandatory === true) {
            if (dataElement.value === '') {
              isLastComponentMandatoryHasValue = false;
            } else {
              isLastComponentMandatoryHasValue = true;
            }
          }
          continue;
        }

        if (isLastComponentMandatoryHasValue === true) {
          if (dataElement.mandatory === true && dataElement.value === '') {
            return new ValidationResult(ResultType.FAIL_VALIDATION_DATA_ELEMENT, `[USAGE] ${dataElement.parent.name}-${dataElement.name}: ${dataElement.mandatory} | ${dataElement.value}`);
          }
          continue;
        }

        if (dataElement.mandatory === true && dataElement.value !== '') {
          return new ValidationResult(ResultType.FAIL_VALIDATION_DATA_ELEMENT, `[USAGE] ${dataElement.parent.name}-${dataElement.name}: ${dataElement.mandatory} | ${dataElement.value}`);
        }
      }
      if (dataElement.type === 'SIMPLE') {
        if (lastElement === 'COMPOSITE') {
          return new ValidationResult(ResultType.FAIL_FIND_TARGET_DATA_ELEMENT, 'SIMPLE DATA AFTER COMPSITE DATA');
        }
        if (dataElement.mandatory === true && dataElement.value === '') {
          const desc = `[USAGE] ${dataElement.parent.name}-${dataElement.name}: ${dataElement.mandatory} | ${this.value}`;
          this._matchResult = new ValidationResult(ResultType.FAIL_VALIDATION_DATA_ELEMENT, desc);
          return this._matchResult;
        }
        lastElement = 'SIMPLE';
      }
    }
    return new ValidationResult(ResultType.SUCCESS, '');
  }

  get MessageElementType() {
    return this._messageElementType;
  }

  set MessageElementType(messageElementType) {
    this._messageElementType = messageElementType;
  }

  get name() {
    return this._name;
  }

  set name(name) {
    this._name = name;
  }

  get children() {
    return this._children;
  }

  set children(children) {
    this._children = children;
  }

  get matchResult() {
    return this._matchResult;
  }

  set matchResult(matchResult) {
    this._matchResult = matchResult;
  }

  get spec() {
    return this._spec;
  }

  set spec(spec) {
    this._spec = spec;
  }

  get id() {
    return this._id;
  }

  set id(id) {
    this._id = id;
  }

  get order() {
    return this._order;
  }

  set order(order) {
    this._order = order;
  }

  get parent() {
    return this._parent;
  }

  set parent(parent) {
    this._parent = parent;
  }

  get elementType() {
    return this._elementType;
  }

  /**
   * print messageSegments
   */
  toString(depth = 0, indentChar = ' '.repeat(2)) {
    const indent = indentChar.repeat(depth);
    const lines = [];
    lines.push(`${indent}[SGM: ${this._name}][${this._order}] (ID: ${this._id} / SPEC: ${this._spec ? this._spec.toString() : 'NONE'})`);
    this._children.forEach((dataElements) => {
      dataElements.forEach((dataElement) => {
        lines.push(dataElement.toString(depth + 1));
      });
    });
    return lines.join('\n');
  }
}

module.exports = MessageSegment;
