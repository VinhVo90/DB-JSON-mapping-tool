const MessageParser = require('./message_parser');
const Delimiter = require('./delimiter');
const SpecParser = require('./spec_parser');
const SpecTree = require('./spec_tree');
const JsTreeItemConverter = require('./jstree_item_converter');
const MessageAssembler = require('./message_assembler');
const MessageSpec = require('./message_spec');

/**
 * @class
 * A class that deliver data to front end
 */
class SampleMessageViewer {
  /**
   * @param {Object} jsTree
   * @param {Map} messageElementMap
   * @param {Object} messageStructure
   * @param {Object} specGroupList
   */
  contructor(jsTree, messageElementMap, messageStructure, specGroupList = []) {
    this._jsTree = jsTree;
    this._messageElementMap = messageElementMap;
    this._messageStructure = messageStructure;
    this._specGroupList = specGroupList;
    this._messageGroupType = '';
    this._delimiter = '';
    this._messageParser;
  }

  /**
   * @param {File} specFile
   * @param {File} sampleFile
   * make Jstree
   */
  makeTree(specFile, sampleFile, messageGroupType) {
    const specParser = new SpecParser(specFile);
    const parsedSpec = specParser.parse();
    const specTree = new SpecTree();
    this._specGroupList = specTree.makeGroupList(parsedSpec.segment, parsedSpec.group);

    let delimiter = '';
    if (messageGroupType === 'EDIFACT') {
      delimiter = Delimiter.createEdifact();
      this._messageParser = new MessageParser(delimiter, messageGroupType, this._specGroupList[0]);
    } else if (messageGroupType === 'FIXEDLENGTH') {
      delimiter = Delimiter.createFixedLength();
      this._messageParser = new MessageParser(delimiter, messageGroupType, this._specGroupList[0]);
    } else if (messageGroupType === 'DICTIONARY') {
      delimiter = Delimiter.createOpusFlatFile();
      this._messageParser = new MessageParser(delimiter, messageGroupType, this._specGroupList[0]);
    } else if (messageGroupType === 'DELIMITER') {
      delimiter = Delimiter.createDelimiter('\n', '|', '^');
      this._messageParser = new MessageParser(delimiter, messageGroupType, this._specGroupList[0]);
    }
    this._delimiter = delimiter;
    this._messageGroupType = messageGroupType;

    const parseResult = this._messageParser.parseMessage(sampleFile);
    if (parseResult.constructor.name === 'ValidationResult') {
      return parseResult;
    }

    if (parseResult.constructor.name === 'MatchResult') {
      const finalResult = [parseResult];
      return finalResult;
    }

    this._messageStructure = parseResult;
    const messageSpec = new MessageSpec(delimiter, this._messageStructure, this._specGroupList[0]);
    messageSpec.match(this._messageStructure);
    const validationResult = messageSpec._validationResult;
    this._setTreeData();
    if (validationResult) {
      return validationResult;
    }

    return false;
  }

  /**
   * @param {String} id
   * get dataElement data to present
   */
  getDetail(id) {
    return this._messageElementMap.get(id);
  }

  _setTreeData() {
    const converted = new JsTreeItemConverter().convert(this._messageStructure);
    this._jsTree = converted.treeItems;
    this._messageElementMap = converted.itemMap;
  }

  /**
   * @param {String} lineSeparator
   * assemble messageStructure to full text
   */
  getAssembledMessage(lineSeparator) {
    const messageAssembler = new MessageAssembler(this._messageGroupType);
    if (this._delimiter._segmentTerminator === '\n') {
      lineSeparator = '';
    }

    return messageAssembler.assemble(this._messageStructure, this._delimiter, lineSeparator);
  }

  /**
   * rematch the revised messagaStructure
   */
  reMatch() {
    const messageSpec = new MessageSpec(this._delimiter, this._messageStructure, this._specGroupList[0]);
    messageSpec.match(this._messageStructure);
    if (messageSpec._validationResult) {
      return messageSpec._validationResult;
    }
    return true;
  }
}
module.exports = SampleMessageViewer;
