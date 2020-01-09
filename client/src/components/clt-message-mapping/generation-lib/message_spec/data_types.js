class MessageGroupFormatType {
  static get FIXED_LENGTH() {
    return Symbol.for('FIXED_LENGTH');
  }

  static get FIXED_LENGTH_BY_INDEX() {
    return Symbol.for('FIXED_LENGTH_BY_INDEX');
  }

  static get FIXED_LENGTH_BY_NAME() {
    return Symbol.for('FIXED_LENGTH_BY_NAME');
  }

  static get DELIMITER() {
    return Symbol.for('DELIMITER');
  }

  static get DELIMITER_BY_INDEX() {
    return Symbol.for('DELIMITER_BY_INDEX');
  }

  static get DELIMITER_BY_NAME() {
    return Symbol.for('DELIMITER_BY_NAME');
  }

  static get DICTIONARY() {
    return Symbol.for('DICTIONARY');
  }

  static get EDIFACT() {
    return Symbol.for('EDIFACT');
  }

  static isFixedLength(type) {
    return type === MessageGroupFormatType.FIXED_LENGTH;
  }

  static isFixedLengthByIndex(type) {
    return type === MessageGroupFormatType.FIXED_LENGTH_BY_INDEX;
  }

  static isFixedLengthByName(type) {
    return type === MessageGroupFormatType.FIXED_LENGTH_BY_NAME;
  }

  static isDelimiter(type) {
    return type === MessageGroupFormatType.DELIMITER;
  }

  static isDelimiterByIndex(type) {
    return type === MessageGroupFormatType.DELIMITER_BY_INDEX;
  }

  static isDelimiterByName(type) {
    return type === MessageGroupFormatType.DELIMITER_BY_NAME;
  }

  static isDictionary(type) {
    return type === MessageGroupFormatType.DICTIONARY;
  }

  static isEdifact(type) {
    return type === MessageGroupFormatType.EDIFACT;
  }
}

class MessageSpecElementType {
  static get SEGMENT_GROUP() {
    return Symbol.for('SEGMENT_GROUP');
  }

  static get SEGMENT() {
    return Symbol.for('SEGMENT');
  }

  static get SIMPLE_DATA_ELEMENT() {
    return Symbol.for('SIMPLE_DATA_ELEMENT');
  }

  static get COMPOSITE_DATA_ELEMENT() {
    return Symbol.for('COMPOSITE_DATA_ELEMENT');
  }

  static get COMPONENT_DATA_ELEMENT() {
    return Symbol.for('COMPONENT_DATA_ELEMENT');
  }

  static isSegmentGroup(type) {
    return type === this.SEGMENT_GROUP;
  }

  static isSegment(type) {
    return type === this.SEGMENT;
  }

  static isSimpleDataElement(type) {
    return type === this.SIMPLE_DATA_ELEMENT;
  }

  static isCompositeDataElement(type) {
    return type === this.COMPOSITE_DATA_ELEMENT;
  }

  static isComponentDataElement(type) {
    return type === this.COMPONENT_DATA_ELEMENT;
  }
}

class ElementaryDataType {
  static get NUMERIC_CHARS() {
    return Symbol.for('NUMERIC_CHARS');
  }

  static get ALPHA_CHARS() {
    return Symbol.for('ALPHA_CHARS');
  }

  static get ALPHANUMERIC_CHARS() {
    return Symbol.for('ALPHANUMERIC_CHARS');
  }

  static isNumericChars(type) {
    return type === this.NUMERIC_CHARS;
  }

  static isAlphaChars(type) {
    return type === this.ALPHA_CHARS;
  }

  static isAlphaNumericChars(type) {
    return type === this.ALPHANUMERIC_CHARS;
  }
}

module.exports = {
  MessageGroupFormatType,
  MessageSpecElementType,
  ElementaryDataType,
};
