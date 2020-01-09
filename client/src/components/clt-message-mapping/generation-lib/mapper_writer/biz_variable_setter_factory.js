const FlatFileBizVariableSetter = require('./flatfile_biz_variable_setter');
const EdifactBizVariableSetter = require('./edifact_biz_variable_setter');
const { MessageGroupFormatType } = require('../message_spec/data_types');

/**
 * A factory class for BizVariableSetter
 */
class BizVariableSetterFactory {
  static create(messageGroupFormatType) {
    if (messageGroupFormatType === MessageGroupFormatType.FIXED_LENGTH) return this.createIndexedItem();
    if (messageGroupFormatType === MessageGroupFormatType.FIXED_LENGTH_BY_INDEX) return this.createIndexedItem();
    if (messageGroupFormatType === MessageGroupFormatType.FIXED_LENGTH_BY_NAME) return this.createNamedItem();
    if (messageGroupFormatType === MessageGroupFormatType.DELIMITER) return this.createIndexedItem();
    if (messageGroupFormatType === MessageGroupFormatType.DELIMITER_BY_INDEX) return this.createIndexedItem();
    if (messageGroupFormatType === MessageGroupFormatType.DELIMITER_BY_NAME) return this.createNamedItem();
    if (messageGroupFormatType === MessageGroupFormatType.DICTIONARY) return this.createDictionary();
    if (messageGroupFormatType === MessageGroupFormatType.EDIFACT) return this.createEdifact();
    return null;
  }

  /**
   * @return {FlatFileBizVariableSetter} a FlatFileBizVariableSetter
   *    for indexed item type messages
   */
  static createIndexedItem() {
    const funcMakeDataElementTag = (segmentName, dataElement) => {
      const paddedIndex = String(dataElement.index).padStart(2, '0');
      return `${segmentName}_${paddedIndex}`;
    };
    return new FlatFileBizVariableSetter(funcMakeDataElementTag);
  }

  /**
   * @return {FlatFileBizVariableSetter} a FlatFileBizVariableSetter
   *    for named item type messages
   */
  static createNamedItem() {
    const funcMakeDataElementTag = (segmentName, dataElement) => {
      const normalizedName = this._toNormalNameForm(dataElement.name);
      return `${segmentName}_${normalizedName}`;
    };
    return new FlatFileBizVariableSetter(funcMakeDataElementTag);
  }

  /**
   * @return {FlatFileBizVariableSetter} a FlatFileBizVariableSetter
   *    for dictionary type messages
   */
  static createDictionary() {
    const funcMakeDataElementTag = (segmentName, dataElement) => {
      const normalizedName = this._toNormalNameForm(dataElement.name);
      return `${normalizedName}`;
    };
    return new FlatFileBizVariableSetter(funcMakeDataElementTag);
  }

  /**
   * @return {EdifactBizVariableSetter} a EdifactBizVariableSetter
   */
  static createEdifact() {
    const funcMakeDataElementTag = (segmentName, dataElement) => {
      const paddedIndex = String(dataElement.index).padStart(2, '0');
      return `${segmentName}${paddedIndex}`;
    };
    return new EdifactBizVariableSetter(funcMakeDataElementTag);
  }

  static _toNormalNameForm(name) {
    if (typeof name !== 'string') {
      return name;
    }

    return name.trim().replace(/\s+/g, '_');
  }
}

module.exports = BizVariableSetterFactory;
