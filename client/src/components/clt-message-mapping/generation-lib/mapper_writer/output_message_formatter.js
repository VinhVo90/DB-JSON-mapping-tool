const { MessageSpecElementType } = require('../message_spec/data_types');

/**
 * A class to express a print format of a segment, a segment group begin or a segment group end.
 */
class OutputMessageFormat {
  /**
   * Constructor.
   * @param {MessageSpecTreeItem} messageSpecTreeItem a message spec tree item of segment or segment group
   * @param {String} format segment format or segment group format for printing
   * @param {Number} dataElementCount 0 if messageSpecElementType is SEGMENT_GROUP
   */
  constructor(messageSpecTreeItem, format, dataElementCount = 0) {
    this._messageSpecTreeItem = messageSpecTreeItem;
    this._format = format;
    this._dataElementCount = dataElementCount;
  }

  get messageSpecElementType() {
    return this._messageSpecTreeItem.elementType;
  }

  get name() {
    return this._messageSpecTreeItem.name;
  }

  get index() {
    return this._messageSpecTreeItem.index;
  }

  get depth() {
    return this._messageSpecTreeItem.depth;
  }

  get isMandatory() {
    return this._messageSpecTreeItem.isMandatory;
  }

  get maxRepeat() {
    return this._messageSpecTreeItem.maxRepeat;
  }

  get format() {
    return this._format;
  }

  get dataElementCount() {
    return this._dataElementCount;
  }

  /**
   * Create a Segment instance.
   * @param {MessageSpecTreeItem} messageSpecTreeItem
   * @param {String} format
   * @param {Number} dataElementCount
   */
  static createSegment(messageSpecTreeItem, format, dataElementCount) {
    const printingFormat = this._convertToEscaped(format);
    return new OutputMessageFormat(messageSpecTreeItem, printingFormat, dataElementCount);
  }

  /**
   * Crate a SegmentGroup instance.
   * @param {MessageSpecTreeItem} messageSpecTreeItem
   * @param {String} format
   */
  static createSegmentGroup(messageSpecTreeItem, format) {
    const printingFormat = this._convertToEscaped(format);
    return new OutputMessageFormat(messageSpecTreeItem, printingFormat);
  }

  static _convertToEscaped(original) {
    return original.replace(/\n/, '\\n').replace(/\t/, '\\t');
  }

  toString() {
    const type = MessageSpecElementType.isSegment(this.messageSpecElementType) ? 'SGM' : 'GRP';
    const usage = `${this.isMandatory ? 'M' : 'C'}${this.maxRepeat}`;
    return `[${type}-${usage}] ${this.name} / depth: ${this.depth} / nMember: ${this.dataElementCount} / Format: ${this.format}`;
  }
}

/**
 * A helper class to extract OutputMessageFormats from MessageGroupFormat and MessageSpecItems.
 */
class OutputMessageFormatter {
  constructor(messageGroupFormat) {
    this._messageGroupFormat = messageGroupFormat;
  }

  /**
   * Return an array of OutputMessageFormat from messageSpecElementList.
   * @param {MessageSpecTreeItem[]} messageSpecElementList
   */
  print(messageSpecElementList, debug = false) {
    const groupStack = [];
    const formats = [];
    const segmentItems = [];
    let segment;
    let isFirstComponentDataElement = false;

    // for (const eachMessageSpecElement of messageSpecElementList) {
    messageSpecElementList.forEach((element) => {
      const { elementType } = element;

      if (
        debug
        && (
          MessageSpecElementType.isSegment(elementType)
        || MessageSpecElementType.isSegmentGroup(elementType)
        )
      ) {
        debug && console.log(`[${element.name}]`);
      }

      if (this._isSegmentCloseCondition(elementType, segmentItems)) {
        formats.push(this._createSegmentFormat(segment, segmentItems));
        debug && console.log(`  [ED][SGM] ${segment.name}`);
        segmentItems.length = 0;
      }

      if (
        MessageSpecElementType.isSegment(elementType)
        || MessageSpecElementType.isSegmentGroup(elementType)
      ) {
        const currentDepth = element.depth;
        while (this._isSegmentGroupCloseCondition(currentDepth, groupStack)) {
          const prevGroup = groupStack.pop();
          formats.push(this._createSegmentGroupEndFormat(prevGroup));
          debug && console.log(`  [ED][GRP] ${prevGroup.name}`);
        }
      }

      if (MessageSpecElementType.isSegmentGroup(elementType)) {
        formats.push(this._createSegmentGroupBeginFormat(element));
        groupStack.push(element);
        debug && console.log(`  [OP][GRP] ${element.name}`);
        return;
      }

      if (MessageSpecElementType.isSegment(elementType)) {
        segment = element;
        segmentItems.push(element.name);
        debug && console.log(`  [OP][SGM] ${element.name}`);
        return;
      }

      if (MessageSpecElementType.isSimpleDataElement(elementType)) {
        segmentItems.push(this._messageGroupFormat.dataElementSeparator);
        segmentItems.push(this._createDataElementFormat(element));
        return;
      }

      if (MessageSpecElementType.isCompositeDataElement(elementType)) {
        isFirstComponentDataElement = true;
        return;
      }

      if (MessageSpecElementType.isComponentDataElement(elementType)) {
        if (isFirstComponentDataElement) {
          segmentItems.push(this._messageGroupFormat.dataElementSeparator);
          isFirstComponentDataElement = false;
        } else {
          segmentItems.push(this._messageGroupFormat.componentDataElementSeparator);
        }

        segmentItems.push(this._createDataElementFormat(element));
      }
    });

    if (segmentItems.length > 0) {
      formats.push(this._createSegmentFormat(segment, segmentItems));
    }

    for (; groupStack.length > 0;) {
      const prevGroup = groupStack.pop();
      formats.push(this._createSegmentGroupEndFormat(prevGroup));
    }

    return formats;
  }

  _isSegmentCloseCondition(elementType, segmentItems) {
    if (MessageSpecElementType.isSimpleDataElement(elementType)) return false;
    if (MessageSpecElementType.isCompositeDataElement(elementType)) return false;
    if (MessageSpecElementType.isComponentDataElement(elementType)) return false;
    if (segmentItems.length === 0) return false;
    return true;
  }

  _createSegmentFormat(segment, segmentItems) {
    segmentItems.push(this._messageGroupFormat.segmentEnd(segment.name));
    const segmentFormat = segmentItems.join('');
    const segmentDecoratorRemoved = segmentItems.length - 2; // segment begin + segment end
    const dataElementCount = segmentDecoratorRemoved / 2; // every data element has a separator before it
    return OutputMessageFormat.createSegment(segment, segmentFormat, dataElementCount);
  }

  _createDataElementFormat(dataElement) {
    const { dataType, dataLength } = dataElement;
    return this._messageGroupFormat.dataForm(dataType, dataLength);
  }

  _isSegmentGroupCloseCondition(currentDepth, segmentGroupStack) {
    if (segmentGroupStack.length === 0) {
      return false;
    }

    const prevGroup = segmentGroupStack[segmentGroupStack.length - 1];
    return prevGroup.depth >= currentDepth;
  }

  _createSegmentGroupBeginFormat(segmentGroup) {
    const segmentGroupBeginFormat = this._messageGroupFormat.groupBegin(segmentGroup.name);
    return OutputMessageFormat.createSegmentGroup(segmentGroup, segmentGroupBeginFormat);
  }

  _createSegmentGroupEndFormat(segmentGroup) {
    const segmentGroupEndFormat = this._messageGroupFormat.groupEnd(segmentGroup.name);
    return OutputMessageFormat.createSegmentGroup(segmentGroup, segmentGroupEndFormat);
  }
}

module.exports = {
  OutputMessageFormat,
  OutputMessageFormatter,
};
