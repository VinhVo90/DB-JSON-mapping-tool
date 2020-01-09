const MessageSegment = require('./message/message_segment');
const MessageSegmentGroup = require('./message/message_segment_group');
const MessageDataElement = require('./message/message_data_element');
const MatchResult = require('./message/match_result');
const ResultType = require('./message/result_type');

/**
 * @class
 * parser sampleMessage to messageStructure
 */
class MessageParser {
  /**
   * @param {String} delimiter
   * @param {String} messageType
   * @param {Object} lastMatchedSegmentGroup
   * @param {Object} lastMatchedMessageSegmentGroup
   * @param {Object} currentSegmentGroupStack
   * @param {Object} lastMatchedSegment
   * @param {Object} lastMatchedMessageSegment
   * @param {Object} currentMatchedSegmentGroup
   * @param {Object} currentMatchedSegment
   */
  constructor(delimiter, messageType = '', lastMatchedSegmentGroup, lastMatchedMessageSegmentGroup = null, currentSegmentGroupStack = [], lastMatchedSegment = '', lastMatchedMessageSegment = '', currentMatchedSegmentGroup = '', currentMatchedSegment = '') {
    this._delimiter = delimiter;
    this._messageType = messageType;
    this._lastMatchedSegmentGroup = lastMatchedSegmentGroup;
    this._lastMatchedMessageSegmentGroup = lastMatchedMessageSegmentGroup;
    this._currentSegmentGroupStack = currentSegmentGroupStack;
    this._lastMatchedSegment = lastMatchedSegment;
    this._lastMatchedMessageSegment = lastMatchedMessageSegment;
    this._currentMatchedSegmentGroup = currentMatchedSegmentGroup;
    this._currentMatchedSegment = currentMatchedSegment;
  }

  /**
   * @param {String} message
   * @param {String} spec
   * parse message
   */
  parseMessage(message) {
    const newLineReducedMessage = this._reduceLineSeparator(message, this._delimiter._segmentTerminator);
    const rootMessageSegmentGroup = new MessageSegmentGroup();
    rootMessageSegmentGroup.name = this._lastMatchedSegmentGroup.name;
    rootMessageSegmentGroup.id = 'ROOT';
    rootMessageSegmentGroup.order = 1;
    rootMessageSegmentGroup.parent = rootMessageSegmentGroup;
    this._lastMatchedSegmentGroup.registerNewSegmentCounter();
    rootMessageSegmentGroup.spec = this._lastMatchedSegmentGroup;
    this._currentMatchedMessageSegmentGroup = rootMessageSegmentGroup;
    this._lastMatchedMessageSegmentGroup = rootMessageSegmentGroup;
    return this._parseSegmentGroup(newLineReducedMessage, rootMessageSegmentGroup);
  }

  _parseSegmentGroup(message, root) {
    const messageSampleSegments = this._splitByDelimiter(message, this._delimiter.segmentTerminator, this._delimiter.releaseCharacter).filter(val => val.length > 0);
    root.spec = this._lastMatchedSegmentGroup;
    for (let i = 0; i < messageSampleSegments.length; i += 1) {
      if (this._delimiter.groupCloseDelimiter && messageSampleSegments[i].startsWith(this._delimiter.groupCloseDelimiter)) {
        let [, segmentGroupName] = this._splitByDelimiter(messageSampleSegments[i], this._delimiter.groupCloseDelimiter, this._delimiter.releaseCharacter);
        let popGroupName = this._currentSegmentGroupStack.pop();
        popGroupName = popGroupName.replace(/\r/g, '');
        segmentGroupName = segmentGroupName.replace(/\r/g, '');
        if (popGroupName !== segmentGroupName) {
          return new MatchResult(ResultType.FAIL_FIND_TARGET_GROUP, `[GROUP] ${popGroupName} MATCH FAILED`);
        }
        continue;
      }

      if (this._delimiter.groupOpenDelimiter && messageSampleSegments[i].startsWith(this._delimiter.groupOpenDelimiter)) {
        const [, segmentGroupName] = this._splitByDelimiter(messageSampleSegments[i], this._delimiter.groupOpenDelimiter, this._delimiter.releaseCharacter);
        this._currentSegmentGroupStack.push(segmentGroupName);
        continue;
      }

      let matchResult = new MatchResult();
      const currentSegmentGroup = this._lastMatchedSegmentGroup;
      matchResult = this._matchStructureFromChildren(messageSampleSegments[i], currentSegmentGroup);
      if (!matchResult.isValid() && matchResult.resultType !== ResultType.FAIL_FIND_TARGET_GROUP) {
        return matchResult;
      }

      if (!matchResult.isValid()) {
        matchResult = this._matchStructureFromAncestors(messageSampleSegments[i], currentSegmentGroup, matchResult);
        if (!matchResult.isValid()) {
          return matchResult;
        }
      }

      // matched!
      this._currentMatchedSegmentGroup = matchResult.matchedSegment.parent;
      this._currentMatchedSegment = matchResult.matchedSegment;
      this._currentMatchedSegment.instanceIndex += 1;
      if (this._needNewGroup(i)) {
        const creationResult = this._createMessageSegmentGroup(matchResult, messageSampleSegments[i]);
        if (creationResult.resultType) {
          return creationResult;
        }
      } else {
        this._lastMatchedMessageSegmentGroup.children.push(this._parseSegment(messageSampleSegments[i], this._currentMatchedSegment.name, this._lastMatchedMessageSegmentGroup));
      }
      this._lastMatchedSegmentGroup = this._currentMatchedSegmentGroup;
      this._lastMatchedSegment = this._currentMatchedSegment;
    }

    return root;
  }

  _createMessageSegmentGroup(matchResult, eachMessageSampleSegment) {
    if (this._lastMatchedSegmentGroup.depth < this._currentMatchedSegmentGroup.depth) { // child case
      // console.log('--');
      // console.log(this._lastMatchedSegmentGroup.depth);
      // console.log(this._lastMatchedSegmentGroup.name);
      // console.log(this._currentMatchedSegmentGroup.depth);
      // console.log(this._currentMatchedSegmentGroup.name);
      const depthDiff = this._currentMatchedSegmentGroup.depth - this._lastMatchedSegmentGroup.depth;
      if (depthDiff !== 1) {
        return new MatchResult(ResultType.FAIL_FIND_TARGET_GROUP,
          `[${this._currentMatchedSegmentGroup.name} - ${this._currentMatchedSegmentGroup.depth}][${this._lastMatchedSegmentGroup.name} - ${this._lastMatchedSegmentGroup.depth}]DEPTH_DIFF_ERROR`);
      }

      const matchedSegmentGroup = this._currentMatchedSegment.parent;
      const newMessageSegmentGroup = new MessageSegmentGroup(matchedSegmentGroup.name);
      newMessageSegmentGroup.spec = matchedSegmentGroup;
      newMessageSegmentGroup.parent = this._lastMatchedMessageSegmentGroup;
      newMessageSegmentGroup.order = this._currentMatchedSegmentGroup.parent._instances[this._currentMatchedSegmentGroup.parent._instances.length - 1][this._currentMatchedSegmentGroup.name];
      newMessageSegmentGroup.id = `${newMessageSegmentGroup.parent.id}|${newMessageSegmentGroup.name}#${newMessageSegmentGroup.order}`;
      if (newMessageSegmentGroup.order > newMessageSegmentGroup.spec.maxRepeat) {
        return new MatchResult(ResultType.FAIL_VALIDATION_GROUP, `[GROUP][${newMessageSegmentGroup.spec.name}][${this._currentMatchedSegment.name}]MAX_REPEAT_VIOLATION`);
      }

      this._lastMatchedMessageSegmentGroup.children.push(newMessageSegmentGroup);
      newMessageSegmentGroup.children.push(this._parseSegment(eachMessageSampleSegment, this._currentMatchedSegment.name, newMessageSegmentGroup));
      this._lastMatchedMessageSegmentGroup = newMessageSegmentGroup;
      this._lastMatchedSegmentGroup = matchedSegmentGroup;
      return newMessageSegmentGroup;
    }

    if (this._lastMatchedSegmentGroup.depth === this._currentMatchedSegmentGroup.depth) { // sibling case
      // console.log('2');
      // console.log(this._currentMatchedSegmentGroup.name);
      const newMessageSegmentGroup = new MessageSegmentGroup(this._currentMatchedSegmentGroup.name);
      newMessageSegmentGroup.spec = this._currentMatchedSegmentGroup;
      newMessageSegmentGroup.parent = this._lastMatchedMessageSegmentGroup.parent;
      const currentSegmentGroupOrder = this._currentMatchedSegmentGroup.parent._instances[this._currentMatchedSegmentGroup.parent._instances.length - 1][this._currentMatchedSegmentGroup.name];
      newMessageSegmentGroup.order = currentSegmentGroupOrder;
      newMessageSegmentGroup.id = `${newMessageSegmentGroup.parent.id}|${newMessageSegmentGroup.name}#${newMessageSegmentGroup.order}`;
      if (currentSegmentGroupOrder > newMessageSegmentGroup.spec.maxRepeat) {
        return new MatchResult(ResultType.FAIL_VALIDATION_GROUP, `[GROUP][${newMessageSegmentGroup.spec.name}][${this._currentMatchedSegment.name}]MAX_REPEAT_VIOLATION`);
      }

      if (this._lastMatchedMessageSegmentGroup.parent) {
        this._lastMatchedMessageSegmentGroup.parent.children.push(newMessageSegmentGroup);
      } else {
        return new MatchResult(ResultType.FAIL_VALIDATION_GROUP, `[${this._lastMatchedMessageSegmentGroup}]LAST_MATCH_HAS_NO_PARENT`);
      }

      newMessageSegmentGroup.children.push(this._parseSegment(eachMessageSampleSegment, this._currentMatchedSegment.name, newMessageSegmentGroup));
      this._lastMatchedMessageSegmentGroup = newMessageSegmentGroup;
      return newMessageSegmentGroup;
    }

    if (this._lastMatchedSegmentGroup.depth > this._currentMatchedSegmentGroup.depth) { // ancestor, ancestor-sibling case
      // console.log('3');
      // console.log(this._currentMatchedSegmentGroup.name);
      const depthDiff = this._lastMatchedSegmentGroup.depth - this._currentMatchedSegmentGroup.depth;
      let messageSegmentGroupParent;
      if (depthDiff > 1) {
        messageSegmentGroupParent = this._lastMatchedMessageSegmentGroup;
        for (let i = 0; i < depthDiff; i += 1) {
          if (messageSegmentGroupParent.parent === undefined) {
            break;
          }
          messageSegmentGroupParent = messageSegmentGroupParent.parent;
        }
      } else if (this._lastMatchedMessageSegmentGroup.parent.parent) {
        messageSegmentGroupParent = this._lastMatchedMessageSegmentGroup.parent;
      } else {
        messageSegmentGroupParent = this._lastMatchedMessageSegmentGroup;
      }
      if (matchResult.matchedSegment.parent.name === messageSegmentGroupParent.parent.name) {
        messageSegmentGroupParent.parent.children.push(this._parseSegment(eachMessageSampleSegment, this._currentMatchedSegment.name, messageSegmentGroupParent.parent));

        this._lastMatchedMessageSegmentGroup = messageSegmentGroupParent.parent;
        this._lastMatchedSegmentGroup = matchResult.matchedSegment.parent;
        return messageSegmentGroupParent.parent;
      }

      const matchedSegmentGroup = matchResult.matchedSegment.parent;
      const newMessageSegmentGroup = new MessageSegmentGroup(matchedSegmentGroup.name);
      newMessageSegmentGroup.spec = matchedSegmentGroup;
      newMessageSegmentGroup.parent = messageSegmentGroupParent.parent;
      newMessageSegmentGroup.order = this._currentMatchedSegmentGroup._instances.length;
      newMessageSegmentGroup.id = `${newMessageSegmentGroup.parent.id}|${newMessageSegmentGroup.name}#${newMessageSegmentGroup.order}`;
      newMessageSegmentGroup.children.push(this._parseSegment(eachMessageSampleSegment, this._currentMatchedSegment.name, newMessageSegmentGroup));

      messageSegmentGroupParent.parent.children.push(newMessageSegmentGroup);
      this._lastMatchedMessageSegmentGroup = newMessageSegmentGroup;
      this._lastMatchedSegmentGroup = matchedSegmentGroup;
      return newMessageSegmentGroup;
    }

    return new MatchResult(ResultType.FAIL_FIND_TARGET_GROUP, `[${this._currentMatchedSegmentGroup.name}]INVALID GROUP`);
  }

  _parseSegment(messageSampleSegment, messageSampleSegmentName = '', parent) {
    const newMessageSegment = new MessageSegment(messageSampleSegmentName);
    newMessageSegment.parent = parent;
    this._setMessageSegmentOrder(newMessageSegment);
    newMessageSegment.id = `${newMessageSegment.parent.id}|${newMessageSegment.name}#${newMessageSegment.order}`;
    this._currentMatchedMessageSegment = newMessageSegment;
    const newMessageDataElements = [];
    if (this.messageType === 'DICTIONARY') {
      if (!this._delimiter.dataElementSeparator) {
        return new MatchResult(ResultType.FAIL_VALIDATION_SEGMENT, 'NO_DATA_ELEMENT_SEPARATOR');
      }

      let messageSampleDataElements = messageSampleSegment;
      if (this._delimiter.dataElementSeparator) {
        messageSampleDataElements = this._splitByDelimiter(messageSampleSegment, this._delimiter.dataElementSeparator, this._delimiter.releaseCharacter);
      }
      const messageDataElement = messageSampleDataElements.slice(1).join(this._delimiter.dataElementSeparator);
      newMessageDataElements.push(this._parseDataElement(messageDataElement, this._currentMatchedSegment._dataElements));
    } else if (this.messageType === 'FIXEDLENGTH') {
      let start = 0;
      this._currentMatchedSegment.dataElements.forEach((eachMessageDataElement, index) => {
        const lengthRegex = /\d+/;
        const specLength = parseInt(eachMessageDataElement.format.match(lengthRegex)[0], 10);
        const messageDataElement = messageSampleSegment.substr(start, specLength);
        newMessageDataElements.push(this._parseDataElement(messageDataElement, this._currentMatchedSegment._dataElements[index]));
        start += specLength;
      });
    } else {
      if (!this._delimiter.dataElementSeparator) {
        return new MatchResult(ResultType.FAIL_VALIDATION_SEGMENT, 'NO_DATA_ELEMENT_SEPARATOR');
      }

      let messageSampleDataElements = messageSampleSegment;
      if (this._delimiter.dataElementSeparator) {
        messageSampleDataElements = this._splitByDelimiter(messageSampleSegment, this._delimiter.dataElementSeparator, this._delimiter.releaseCharacter);
      }
      let j = 0;
      messageSampleDataElements.forEach((messageDataElement, i) => {
        if (i < 1) {
          return;
        }
        if (this._currentMatchedSegment._dataElements[j].type === 'COMPOSITE') {
          j += 1;
          let k = j;
          while (this._currentMatchedSegment._dataElements[k].type === 'COMPONENT') {
            k += 1;
            if (this._currentMatchedSegment._dataElements[k] === undefined || this._currentMatchedSegment._dataElements[k].type !== 'COMPONENT') {
              newMessageDataElements.push(this._parseDataElement(messageDataElement, this._currentMatchedSegment._dataElements.slice(j, k)));
              j = k;
              break;
            }
          }
          return;
        }
        newMessageDataElements.push(this._parseDataElement(messageDataElement, this._currentMatchedSegment._dataElements[j]));
        j += 1;
      });
    }

    newMessageSegment.children = newMessageDataElements;
    const segments = this._currentMatchedSegmentGroup.children;
    segments.forEach((segment) => {
      if (segment.name === newMessageSegment.name) {
        newMessageSegment.spec = segment;
      }
    });
    this._lastMatchedMessageSegment = newMessageSegment;
    return newMessageSegment;
  }

  _parseDataElement(messageDataElement, dataElements) {
    let dataSpecs = [messageDataElement];
    if (this._delimiter.componentDataSeparator) {
      dataSpecs = this._splitByDelimiter(messageDataElement, this._delimiter.componentDataSeparator, this._delimiter.releaseCharacter, true);
    }
    const messageDataElements = [];
    if (dataSpecs.length > 1) {
      dataSpecs.forEach((dataSpec, index) => {
        const id = `${this._currentMatchedMessageSegment.id}|${dataElements[index].name}`;
        messageDataElements.push(new MessageDataElement('MULTI', dataElements[index].name, dataSpec, dataElements[index], id));
        dataElements[index].value = dataSpec;
      });
      return messageDataElements;
    }

    if (Array.isArray(dataElements)) {
      const id = `${this._currentMatchedMessageSegment.id}|${dataElements[0].name}`;
      messageDataElements.push(new MessageDataElement('SINGLE', dataElements[0].name, dataSpecs[0], dataElements[0], id));
      dataElements[0].value = dataSpecs[0];
    } else {
      const id = `${this._currentMatchedMessageSegment.id}|${dataElements.name}`;
      messageDataElements.push(new MessageDataElement('SINGLE', dataElements.name, dataSpecs[0], dataElements, id));
      dataElements.value = dataSpecs[0];
    }
    return messageDataElements;
  }

  _reduceLineSeparator(message, segmentTerminator) {
    if (segmentTerminator === '\n') {
      const newLineRegex = new RegExp(/\r(\n)?/, 'g');
      return message.replace(newLineRegex, '\n');
    }

    const redundantNewLineRegex = new RegExp(`(?<=${segmentTerminator})(\n|\r(\n)?)+`, 'g');
    return message.replace(redundantNewLineRegex, '');
  }

  _createSegmentGroupSpec(segmentGroup) {
    const returnSegmentGroup = {
      name: segmentGroup.name,
      depth: segmentGroup.depth,
      maxRepeat: segmentGroup.maxRepeat,
      mandatory: segmentGroup.mandatory,
      description: segmentGroup.description,
      instanceIndex: segmentGroup.instanceIndex,
    };
    return returnSegmentGroup;
  }

  _createSegmentSpec(segment) {
    const returnSegment = {
      name: segment.name,
      description: segment.description,
      dataElements: segment.dataElements,
      mandatory: segment.mandatory,
      maxRepeat: segment.maxRepeat,

    };
    return returnSegment;
  }

  _splitMessageBySegmentDelimiter(message) {
    return message.split(this._delimiter.segmentTerminator).filter(val => val.length > 0);
  }

  _matchStructureFromChildren(eachMessageSampleSegment, currentSegmentGroup) {
    const matchResult = currentSegmentGroup.matchStructure(eachMessageSampleSegment, this._messageType, this._delimiter);
    if (matchResult.resultType !== ResultType.FAIL_FIND_TARGET_SEGMENT) {
      return matchResult;
    }

    return this._matchStructureFromAncestors(eachMessageSampleSegment, currentSegmentGroup, matchResult);
  }

  _matchStructureFromAncestors(eachMessageSampleSegment, currentSegmentGroup, matchResult) {
    while (matchResult.resultType === ResultType.FAIL_FIND_TARGET_SEGMENT) {
      currentSegmentGroup = currentSegmentGroup.parent;
      if (!currentSegmentGroup) {
        matchResult._resultType = ResultType.FAIL_FIND_TARGET_SEGMENT;
        matchResult._desc = 'PARENT IS NULL';
        return matchResult;
      }

      return this._matchStructureFromChildren(eachMessageSampleSegment, currentSegmentGroup);
    }
    return new MatchResult(ResultType.FAIL_FIND_TARGET_GROUP, `${this.currentMatchedSegmentGroup}MATCH FAILED`);
  }

  _matchGroupFromChildren(eachMessageSampleSegment, currentSegmentGroup) {
    const matchResult = currentSegmentGroup.matchGroup(eachMessageSampleSegment);
    if (matchResult.resultType !== ResultType.FAIL_FIND_TARGET_GROUP) {
      return matchResult;
    }

    return this._matchGroupFromAncestors(eachMessageSampleSegment, currentSegmentGroup, matchResult);
  }

  _matchGroupFromAncestors(eachMessageSampleSegment, currentSegmentGroup, matchResult) {
    while (matchResult.resultType === ResultType.FAIL_FIND_TARGET_GROUP) {
      currentSegmentGroup = currentSegmentGroup.parent;
      if (!currentSegmentGroup) {
        matchResult._resultType = ResultType.FAIL_FIND_TARGET_GROUP;
        matchResult._desc = 'PARENT IS NULL';
        return matchResult;
      }

      return this._matchGroupFromChildren(eachMessageSampleSegment, currentSegmentGroup);
    }

    return new MatchResult(ResultType.FAIL_FIND_TARGET_GROUP, `${this.currentMatchedSegmentGroup.name} MATCH FAILED`);
  }

  _setMessageSegmentGroupOrder(messageSegmentGroup) {
    messageSegmentGroup.order = messageSegmentGroup.spec._instances[messageSegmentGroup.spec._instances.length - 1];
  }

  _setMessageSegmentOrder(messageSegment) {
    if (
      this._lastMatchedMessageSegment.name === messageSegment.name
      && this._lastMatchedMessageSegment.parent.id === messageSegment.parent.id
    ) {
      messageSegment.order = this._lastMatchedMessageSegment.order + 1;
    } else {
      messageSegment.order = 1;
    }
  }

  _matchLastGroup(segmentGroupName) {
    this._currentMatchedSegmentGroup = this._lastMatchedSegmentGroup;
    const newMessageSegmentGroup = new MessageSegmentGroup();
    newMessageSegmentGroup.name = segmentGroupName;
    newMessageSegmentGroup.spec = this._lastMatchedSegmentGroup;
    newMessageSegmentGroup.order += 1;
    newMessageSegmentGroup.parent = this._lastMatchedMessaSegmentGroup.parent.parent;
    newMessageSegmentGroup.id = `${newMessageSegmentGroup.parent.id}|${newMessageSegmentGroup.name}#${newMessageSegmentGroup.order}`;
    this._lastMatchedMessageSegmentGroup.children.push(newMessageSegmentGroup);
    this._lastMatchedMessageSegmentGroup = newMessageSegmentGroup;
    this._currentSegmentGroupStack.push(this._lastMatchedMessageSegmentGroup.name);
  }

  _printMatchInfo() {
    console.log(this._currentMatchedSegment.name);
    console.log(this._currentMatchedSegmentGroup.name);
    console.log(this._lastMatchedSegmentGroup.name);
    console.log(this._currentMatchedSegment.maxRepeat);
  }

  _splitByDelimiter(string, delimiter, releaseChar, removeReleaseChar = false) {
    const tokens = [];
    const buffer = [];
    let processingRelease = false;
    for (let i = 0; i < string.length; i += 1) {
      const letter = string.charAt(i);
      if (processingRelease) {
        if (!removeReleaseChar) {
          buffer.push(releaseChar);
        }
        buffer.push(letter);
        processingRelease = false;
        continue;
      }
      if (letter === releaseChar) {
        processingRelease = true;
        continue;
      }

      if (letter === delimiter) {
        tokens.push(buffer.join(''));
        buffer.length = 0;
        continue;
      }

      buffer.push(letter);
    }
    tokens.push(buffer.join(''));
    return tokens;
  }

  _needNewGroup(eachSampleSegmentIndex) {
    const values = Object.values(this._currentMatchedSegmentGroup._instances[this._currentMatchedSegmentGroup._instances.length - 1]);
    let segmentAppearanceOneCounter = 0;
    let segmentAppearanceZeroCounter = 0;
    values.forEach((value) => {
      if (value === 1) {
        segmentAppearanceOneCounter += 1;
      }
      if (value === 0) {
        segmentAppearanceZeroCounter += 1;
      }
    });
    if (segmentAppearanceOneCounter === 1 && (eachSampleSegmentIndex === 0)) { // first segment case
      if (this._currentMatchedSegmentGroup.id !== this._lastMatchedSegmentGroup.id) {
        return true;
      }
      return false;
    }

    if (segmentAppearanceOneCounter === 1 && segmentAppearanceZeroCounter === values.length - 1) {
      return true;
    }

    if (this._lastMatchedSegmentGroup.depth > this._currentMatchedSegmentGroup.depth) {
      return true;
    }

    if (segmentAppearanceOneCounter === 0) {
      return false;
    }

    return false;
  }

  get messageType() {
    return this._messageType;
  }
}

module.exports = MessageParser;
