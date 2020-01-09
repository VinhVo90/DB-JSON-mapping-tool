const { MessageSpecTree } = require('./message_spec_tree');
const CodeUtil = require('./code_util');
const {
  SegmentGroup,
  Segment,
  DataElement,
} = require('./message_spec_element');

class MessageSpecReader {
  static read(messageSpec) {
    const messageSpecElementMap = this._makeMessageSpecElementMap(messageSpec);
    const treeRoot = this._makeMessageTree(messageSpec, messageSpecElementMap);
    return new MessageSpecTree(treeRoot);
  }

  static _makeMessageTree(messageSpec, itemMap) {
    let treeRoot;
    messageSpec.boundary.forEach((boundary) => {
      const segmentGroup = itemMap.get(boundary.id);
      if (this._isRoot(boundary)) {
        treeRoot = segmentGroup;
      }
      boundary.member.forEach((boundaryMember) => {
        const segmentGroupMember = itemMap.get(boundaryMember.id);
        segmentGroup.addMember(segmentGroupMember);
      });
    });
    return treeRoot;
  }

  static _isRoot(boundary) {
    return boundary.parent === null;
  }

  static _makeMessageSpecElementMap(messageSpec) {
    const itemMap = new Map();
    if (!messageSpec) {
      return itemMap;
    }

    messageSpec.vertex.forEach((vertex) => {
      const segment = this._createSegment(vertex);
      vertex.data.forEach((dataElement) => {
        const memberDataElement = this._createDataElement(dataElement);
        segment.addDataElement(memberDataElement);
      });
      itemMap.set(vertex.id, segment);
    });

    messageSpec.boundary.forEach((boundary) => {
      const segmentGroup = this._createSegmentGroup(boundary);
      itemMap.set(boundary.id, segmentGroup);
    });

    return itemMap;
  }

  static _createSegment(vertex) {
    const { name, mandatory, repeat } = vertex;
    const isMandatory = CodeUtil.checkBoolean(mandatory);
    const maxRepeat = (repeat === undefined) ? 9999 : parseInt(repeat, 10);
    return new Segment(name, isMandatory, maxRepeat);
  }

  static _createDataElement(dataElement) {
    const type = CodeUtil.toMessageSpecElementType(dataElement.type);
    const { name, format, usage } = dataElement;
    const { dataType, dataLength } = CodeUtil.parseDataFormat(format);
    const isMandatory = CodeUtil.checkMandatory(usage);
    return new DataElement(type, name, dataType, dataLength, isMandatory);
  }

  static _createSegmentGroup(boundary) {
    const { name, mandatory, repeat } = boundary;
    const isMandatory = CodeUtil.checkBoolean(mandatory);
    const maxRepeat = (repeat === undefined) ? 9999 : parseInt(repeat, 10);
    return new SegmentGroup(name, isMandatory, maxRepeat);
  }
}

module.exports = MessageSpecReader;
