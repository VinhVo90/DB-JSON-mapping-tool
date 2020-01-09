const {
  MessageSpecElementType,
  ElementaryDataType,
} = require('./data_types');

class CodeUtil {
  static toMessageSpecElementType(typeCode) {
    const normalizedTypeCode = (typeCode && typeCode.toUpperCase()) || '';
    if (normalizedTypeCode === 'SIMPLE') return MessageSpecElementType.SIMPLE_DATA_ELEMENT;
    if (normalizedTypeCode === 'COMPOSITE') return MessageSpecElementType.COMPOSITE_DATA_ELEMENT;
    if (normalizedTypeCode === 'COMPONENT') return MessageSpecElementType.COMPONENT_DATA_ELEMENT;
    return MessageSpecElementType.SIMPLE_DATA_ELEMENT;
  }

  static checkMandatory(code) {
    if (code === undefined) return false;
    return code.trim().toUpperCase() === 'M';
  }

  static checkBoolean(code) {
    const dataType = typeof code;
    if (dataType === 'string') return code.toLowerCase() === 'true';
    if (dataType === 'boolean') return code;
    return false;
  }

  static parseDataFormat(format) {
    const REGEX_DATA_TYPE_LENGTH_FORMAT = /([a-zA-Z]+)([0-9]+)/;
    const matched = REGEX_DATA_TYPE_LENGTH_FORMAT.exec(format);
    if (matched === null) {
      return {
        dataType: ElementaryDataType.ALPHANUMERIC_CHARS,
        dataLength: 0,
      };
    }

    const [, typeCode, dataLength] = matched;
    return {
      dataType: this._fromElemantaryDataTypeCode(typeCode),
      dataLength: parseInt(dataLength, 10),
    };
  }

  static _fromElemantaryDataTypeCode(typeCode) {
    const normalizedCode = (typeCode && typeCode.toUpperCase()) || '';
    if (normalizedCode === 'A') return ElementaryDataType.ALPHA_CHARS;
    if (normalizedCode === 'N') return ElementaryDataType.NUMERIC_CHARS;
    if (normalizedCode === 'AN') return ElementaryDataType.ALPHANUMERIC_CHARS;
    return null;
  }
}

module.exports = CodeUtil;
