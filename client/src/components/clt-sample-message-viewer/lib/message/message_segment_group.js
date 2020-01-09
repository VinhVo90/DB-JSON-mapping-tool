

const MessageElementType = require('./message_element_type');

/**
 * @class
 * A class that represents MessageSegmentGroup in the Message.
 * (MessageSegmentGroup -> MessageSegment -> MessageDataElement)
 */
class MessageSegmentGroup {
  /**
   * @param {String} name
   * @param {Obeject} parent
   * @param {Obeject} children
   * @param {Number} order
   * @param {Obeject} matchResult
   * @param {Obeject} spec
   * @param {String} id
   * @param {Object} elementType
   */
  constructor(name = '', children = [], parent, order = 0, matchResult = true, spec = null, id = null, existingCount = -1) {
    this.name = name;
    this.children = children;
    this.parent = parent;
    this.order = order;
    this.matchResult = matchResult;
    this.spec = spec;
    this.id = id;
    this.existingCount = existingCount;
    this.elementType = MessageElementType.SegmentGroup;
  }

  /*
    clear MessageSegmentGroup children
   */
  resetMessageSegmentGroup() {
    this.children.length = 0;
  }

  /**
   * print message Segments group
   */
  toString(depth = 0, indentChar = ' '.repeat(2)) {
    const indent = indentChar.repeat(depth);
    const lines = [];
    lines.push(`${indent}[GRP: ${this._name}]`);
    this._children.forEach((child) => {
      lines.push(`${child.toString(depth + 1)}`);
    });
    return lines.join('\n');
  }
}
module.exports = MessageSegmentGroup;
