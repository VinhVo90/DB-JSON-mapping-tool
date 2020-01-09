const { MessageSpecElementType } = require('./data_types');

class MessageSpecTreeItem {
  /**
   * constructor.
   * @param {MessageSpecElementType} elementType
   * @param {String} name
   * @param {Number} index segmentGroup sequence if segmentGroup else member index
   * @param {Number} depth tree depth from root(0)
   */
  constructor(elementType, name, index, depth) {
    this._elementType = elementType;
    this._name = name;
    this._index = index;
    this._depth = depth;
    this._isMandatory = false;
    this._maxRepeat = 1;
  }

  toString() {
    const indent = ' '.repeat(this._depth);
    const basicInfo = `${indent}${this._elementType.toString()} ${this._name} Lv.${this._depth}`;
    if (
      MessageSpecElementType.isSegmentGroup(this._elementType)
      || MessageSpecElementType.isSegment(this._elementType)
    ) {
      return basicInfo;
    }
    return `${basicInfo}: ${this._dataType}${this._dataLength}`;
  }

  get elementType() {
    return this._elementType;
  }

  get name() {
    return this._name;
  }

  get index() {
    return this._index;
  }

  get depth() {
    return this._depth;
  }

  get isMandatory() {
    return this._isMandatory;
  }

  get maxRepeat() {
    return this._maxRepeat;
  }

  get dataType() {
    return this._dataType;
  }

  get dataLength() {
    return this._dataLength;
  }

  /**
   * Create a segment group.
   * @param {String} name segment group name
   * @param {Number} index segmentGroup sequence
   * @param {Number} depth tree depth from root(0)
   */
  static createSegmentGroup(name, index, depth, isMandatory = false, maxRepeat = 1) {
    return new MessageSpecTreeItem(MessageSpecElementType.SEGMENT_GROUP, name, index, depth)
      .setUsage(isMandatory, maxRepeat);
  }

  /**
   * Create a segment.
   * @param {String} name segment name
   * @param {Number} index index as a child
   * @param {Number} depth tree depth from root(0)
   */
  static createSegment(name, index, depth, isMandatory = false, maxRepeat = 1) {
    return new MessageSpecTreeItem(MessageSpecElementType.SEGMENT, name, index, depth)
      .setUsage(isMandatory, maxRepeat);
  }

  /**
   * Create a composite data element.
   * @param {String} name composite data element name
   * @param {Number} index index as a child
   * @param {Number} depth tree depth from root(0)
   */
  static createCompositeDataElement(name, index, depth, isMandatory = false, maxRepeat = 1) {
    return new MessageSpecTreeItem(MessageSpecElementType.COMPOSITE_DATA_ELEMENT, name, index, depth)
      .setUsage(isMandatory, maxRepeat);
  }

  /**
   * Create a component data element.
   * @param {String} name component data element name
   * @param {Number} index index as a child
   * @param {Number} depth tree depth from root(0)
   * @param {String} dataType 'A': Char Only, 'N': Number, 'AN': All
   * @param {Number} dataLength data length
   */
  static createComponentDataElement(name, index, depth, dataType, dataLength, isMandatory = false, maxRepeat = 1) {
    return new MessageSpecTreeItem(MessageSpecElementType.COMPONENT_DATA_ELEMENT, name, index, depth)
      .setDataFormat(dataType, dataLength)
      .setUsage(isMandatory, maxRepeat);
  }

  /**
   * Create a simple data element.
   * @param {String} name simple data element name
   * @param {Number} index index as a child
   * @param {Number} depth tree depth from root(0)
   * @param {String} dataType 'A': Char Only, 'N': Number, 'AN': All
   * @param {Number} dataLength data length
   */
  static createSimpleDataElement(name, index, depth, dataType, dataLength, isMandatory = false, maxRepeat = 1) {
    return new MessageSpecTreeItem(MessageSpecElementType.SIMPLE_DATA_ELEMENT, name, index, depth)
      .setDataFormat(dataType, dataLength)
      .setUsage(isMandatory, maxRepeat);
  }

  setUsage(isMandatory, maxRepeat) {
    this._isMandatory = isMandatory;
    this._maxRepeat = maxRepeat;
    return this;
  }

  setDataFormat(dataType, dataLength) {
    this._dataType = dataType;
    this._dataLength = dataLength;
    return this;
  }
}

class MessageSpecTree {
  constructor(rootSegmentGroup) {
    this._rootSegmentGroup = rootSegmentGroup;
  }

  get rootSegmentGroup() {
    return this._rootSegmentGroup;
  }

  /**
   * Parse a message spec as a list of message spec items.
   * It's a handy form to express printing formats.
   */
  asItemList() {
    if (!this._rootSegmentGroup) {
      return [];
    }

    return this._parseAsItem(this._rootSegmentGroup);
  }

  _parseAsItem(messageSpecElement, segmentGroupList = [messageSpecElement], index = 0, depth = 0, itemList = []) {
    const elementType = messageSpecElement.type;
    const item = new MessageSpecTreeItem(elementType, messageSpecElement.name, index, depth);
    item.setUsage(messageSpecElement.isMandatory, messageSpecElement.maxRepeat);
    itemList.push(item);

    if (
      MessageSpecElementType.isSimpleDataElement(elementType)
      || MessageSpecElementType.isComponentDataElement(elementType)
    ) {
      item.setDataFormat(messageSpecElement.dataType, messageSpecElement.dataLength);
    }

    if (MessageSpecElementType.isSegmentGroup(elementType)) {
      messageSpecElement.members.forEach((member, memberIndex) => {
        let itemIndex = memberIndex;
        if (MessageSpecElementType.isSegmentGroup(member.type)) {
          itemIndex = segmentGroupList.length;
          segmentGroupList.push(member);
        }
        this._parseAsItem(member, segmentGroupList, itemIndex, depth + 1, itemList);
      });
    }

    if (MessageSpecElementType.isSegment(elementType)) {
      messageSpecElement.dataElements.forEach((dataElement, dataElementIndex) => {
        this._parseAsItem(dataElement, segmentGroupList, dataElementIndex, depth + 1, itemList);
      });
    }

    return itemList;
  }
}

module.exports = {
  MessageSpecTreeItem,
  MessageSpecTree,
};
