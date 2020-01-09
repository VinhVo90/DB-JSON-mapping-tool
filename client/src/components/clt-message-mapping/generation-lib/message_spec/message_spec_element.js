const {
  MessageSpecElementType,
  ElementaryDataType,
} = require('./data_types');

/**
 * @class
 * Implementation for a segment group.
 */
class SegmentGroup {
  constructor(name, isMandatory = false, maxRepeat = 1) {
    this._type = MessageSpecElementType.SEGMENT_GROUP;
    this._name = name;
    this._isMandatory = isMandatory;
    this._maxRepeat = maxRepeat;
    this._members = [];
  }

  addMember(member) {
    if (!member) {
      return this;
    }

    if (this._isValidMember(member.type)) {
      this._members.push(member);
    }

    return this;
  }

  _isValidMember(messageSpecElementType) {
    if (MessageSpecElementType.isSegment(messageSpecElementType)) return true;
    if (MessageSpecElementType.isSegmentGroup(messageSpecElementType)) return true;
    return false;
  }

  get type() {
    return this._type;
  }

  get name() {
    return this._name;
  }

  get isMandatory() {
    return this._isMandatory;
  }

  get maxRepeat() {
    return this._maxRepeat;
  }

  get members() {
    return this._members;
  }

  get totalMembers() {
    return this._members.length;
  }

  toString(indentLevel = 0, indentUnit = ' '.repeat(2)) {
    const lines = [];
    const indent = indentUnit.repeat(indentLevel);
    lines.push(`${indent}[GRP: ${this._name}]`);
    const innerIndentLevel = indentLevel + 1;
    this._members.forEach((member) => {
      lines.push(member.toString(innerIndentLevel));
    });
    return lines.join('\n');
  }
}

/**
 * @class
 * Implementation for a segment.
 */
class Segment {
  constructor(name, isMandatory = false, maxRepeat = 1) {
    this._type = MessageSpecElementType.SEGMENT;
    this._name = name;
    this._isMandatory = isMandatory;
    this._maxRepeat = maxRepeat;
    this._dataElements = [];
  }

  addDataElement(dataElement) {
    this._dataElements.push(dataElement);
    return this;
  }

  get type() {
    return this._type;
  }

  get name() {
    return this._name;
  }

  get isMandatory() {
    return this._isMandatory;
  }

  get maxRepeat() {
    return this._maxRepeat;
  }

  get dataElements() {
    return this._dataElements;
  }

  get hasNoDataElement() {
    return this._dataElements.length === 0;
  }

  toString(indentLevel = 0, indentUnit = ' '.repeat(2)) {
    const lines = [];
    const indent = indentUnit.repeat(indentLevel);
    lines.push(`${indent}[SGM: ${this._name}]`);
    const innerIndentLevel = indentLevel + 1;
    this._dataElements.forEach((element) => {
      lines.push(element.toString(innerIndentLevel));
    });
    return lines.join('\n');
  }
}

/**
 * @class
 * Implementation for a data element like a simple data element, a composite data element or a component data element.
 */
class DataElement {
  /**
   * Create a data element
   * @param {MessageSpecElementType} type one of { simple, composite, component }
   * @param {string} name data element name
   * @param {Symbol} dataType data type { NUMERIC, ALPHA, ALPHANUMERIC }
   * @param {number} dataLength data length
   * @param {boolean} isMandatory default: false
   * @param {number} maxRepeat default: 1
   */
  constructor(type, name, dataType, dataLength, isMandatory = false, maxRepeat = 1) {
    this._type = type;
    this._name = name;
    this._dataType = dataType;
    this._dataLength = dataLength;
    this._isMandatory = isMandatory;
    this._maxRepeat = parseInt(maxRepeat, 10);
  }

  /**
   * Create a simple data element
   * @param {string} name data element name
   * @param {Symbol} dataType data type { NUMERIC, ALPHA, ALPHANUMERIC }
   * @param {number} dataLength data length
   * @param {boolean} isMandatory default: false
   * @param {number} maxRepeat default: 1
   * @returns simple data element
   */
  static createSimple(name, dataType, dataLength, isMandatory = false, maxRepeat = 1) {
    return new DataElement(MessageSpecElementType.SIMPLE_DATA_ELEMENT,
      name, dataType, dataLength, isMandatory, maxRepeat);
  }

  /**
   * Create a composite data element
   * @param {string} name data element name
   * @param {Symbol} dataType data type { NUMERIC, ALPHA, ALPHANUMERIC }
   * @param {number} dataLength data length
   * @param {boolean} isMandatory default: false
   * @param {number} maxRepeat default: 1
   * @returns composite data element
   */
  static createComposite(name, dataType, dataLength, isMandatory = false, maxRepeat = 1) {
    return new DataElement(MessageSpecElementType.COMPOSITE_DATA_ELEMENT,
      name, dataType, dataLength, isMandatory, maxRepeat);
  }

  /**
   * Create a component data element
   * @param {string} name data element name
   * @param {Symbol} dataType data type { NUMERIC, ALPHA, ALPHANUMERIC }
   * @param {number} dataLength data length
   * @param {boolean} isMandatory default: false
   * @param {number} maxRepeat default: 1
   * @returns component data element
   */
  static createComponent(name, dataType, dataLength, isMandatory = false, maxRepeat = 1) {
    return new DataElement(MessageSpecElementType.COMPONENT_DATA_ELEMENT,
      name, dataType, dataLength, isMandatory, maxRepeat);
  }

  get type() {
    return this._type;
  }

  get name() {
    return this._name || '';
  }

  get dataType() {
    return this._dataType;
  }

  get dataLength() {
    return this._dataLength || 0;
  }

  get isMandatory() {
    return this._isMandatory;
  }

  get maxRepeat() {
    return this._maxRepeat;
  }

  isAlphaChars() {
    return ElementaryDataType.isAlphaChars(this._dataType);
  }

  isNumericChars() {
    return ElementaryDataType.isNumericChars(this._dataType);
  }

  isAlphaNumericChars() {
    return ElementaryDataType.isAlphaNumericChars(this._dataType);
  }

  toString(indentLevel = 0, indentUnit = ' '.repeat(2)) {
    const indent = indentUnit.repeat(indentLevel);
    const toDataTypeCode = (dataType) => {
      if (dataType === this.ALPHA_CHARS) return 'A';
      if (dataType === this.NUMERIC_CHARS) return 'N';
      if (dataType === this.ALPHANUMERIC_CHARS) return 'AN';
      return 'UNKNOWN';
    };
    return `${indent}[DE: ${this.name} | ${toDataTypeCode(this.dataType)}${this.dataLength} | ${this.type} | ${this.maxRepeat}]`;
  }
}

module.exports = {
  SegmentGroup,
  Segment,
  DataElement,
};
