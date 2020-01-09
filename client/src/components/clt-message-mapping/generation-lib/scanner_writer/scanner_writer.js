const {
  MessageGroupFormatType,
  MessageSpecElementType,
} = require('../message_spec/data_types');

class VariableName {
  static forLengthList(segmentName) {
    return `${segmentName}_item_lengths`;
  }

  static forNameList(segmentName) {
    return `${segmentName}_item_names`;
  }
}

class ScannerWriter {
  /**
   * @param {MessageGroupFormat} messageGroupFormat
   * @param {function} segmentScanFormatter
   */
  constructor(messageGroupFormat, segmentScanFormatter) {
    this._messageGroupFormat = messageGroupFormat;
    this._segmentScanFormatter = segmentScanFormatter;
    this._codeLines = [];
  }

  write(messageTree) {
    this._codeLines.length = 0;
    this._writeHeaderCode();
    this._writeScannerBody(messageTree);
    this._writeFooterCode();
    return this._codeLines.join('\n');
  }

  _writeLine(line, depth = 0, indentChar = '\t') {
    const indent = indentChar.repeat(depth);
    this._codeLines.push(`${indent}${line}`);
  }

  _writeHeaderCode() {
    this._writeLine('#include <stdio.h>', 0);
    this._writeLine('#include <string.h>', 0);
    this._writeLine('#include <stdlib.h>', 0);
    this._writeLine('#include "libscanner.h"', 0);
    this._writeLine('');
    this._writeLine('int main(int argc, char* argv) {', 0);
    this._writeLine('if (argc != 3) {', 1);
    this._writeLine('printf("Usage: scanner [FLAT_FILE_PATH] [BIZ_FILE_PATH]\\n");', 2);
    this._writeLine('return 0;', 2);
    this._writeLine('}', 1);
    this._writeLine('');
    this._writeLine('if (InitScanner(argv[1], argv[2]) != 0) {', 1);
    this._writeLine('return -1;', 2);
    this._writeLine('}', 1);
    this._writeLine('');
    this._writeLine('scanVal("", HEADER);', 1);
  }

  _writeFooterCode() {
    this._writeLine('');
    this._writeLine('DestroyScanner();', 1);
    this._writeLine('return 0;', 1);
    this._writeLine('}');
  }

  _scanningTag(lineSeparator, name) {
    let tag = `"${lineSeparator}${name}"`;
    tag = tag.replace(/\n/g, '\\n');
    tag = tag.replace(/\t/g, '\\t');
    return tag;
  }

  /**
   * If there is no format for segment group, just use the first child segment name as segment group tag.
   * BizFile should express it's segment group to set search space.
   * @param {SegmentGroup} segmentGroup
   */
  _readSegmentGroupNames(segmentGroup) {
    const segmentGroupTag = segmentGroup.name;
    let segmentGroupBegin = this._messageGroupFormat.groupBegin(segmentGroup.name);
    if (segmentGroupBegin === '' && segmentGroup.totalMembers > 0) { // No presentation case like EDIFACT
      const firstSegmentName = segmentGroup.members[0].name;
      const firstSegmentBegin = this._messageGroupFormat.segmentBegin(firstSegmentName);
      segmentGroupBegin = firstSegmentBegin;
      // segmentGroupTag = firstSegmentBegin;
    }
    return {
      segmentGroupTag,
      segmentGroupBegin,
    };
  }

  _writeScannerBody(currentGroup, parentGroupBound = '', groupDepth = 1) {
    const {
      segmentGroupBegin: currentGroupBegin,
      segmentGroupTag: currentGroupTag,
    } = this._readSegmentGroupNames(currentGroup);
    const lineSeparator = this._messageGroupFormat.segmentEnd();
    const currentGroupBeginCondition = this._scanningTag(lineSeparator, currentGroupBegin);
    const currentGroupEnd = this._messageGroupFormat.groupEnd(currentGroup.name);
    const currentGroupEndCondition = currentGroupEnd && `, ${this._scanningTag(lineSeparator, currentGroupEnd)}`;
    const parentGroupBoundCondition = parentGroupBound && `, ${this._scanningTag(lineSeparator, parentGroupBound)}`;
    if (groupDepth > 1) {
      this._writeLine('');
    }
    this._writeLine(`while (LoopConst(${currentGroupBeginCondition}${currentGroupEndCondition}${parentGroupBoundCondition})) {`, groupDepth);

    const memberDepth = groupDepth + 1;
    this._writeLine(`Write("${currentGroupTag}\\n");`, memberDepth);

    currentGroup.members.forEach((member) => {
      if (MessageSpecElementType.isSegmentGroup(member.type)) {
        const outterGroupBound = currentGroupEnd || currentGroupBegin;
        this._writeScannerBody(member, outterGroupBound, memberDepth);
        return;
      }

      this._writeScanSegment(member, memberDepth);
    });

    this._writeLine('}', groupDepth);
  }

  /**
   * It can process data substitution below.
   * - dataElementSeparator
   * - segmentName
   * - dataElementName
   * - nDataElement
   * - lengthListVar
   * - lengthList
   * - nameListVar
   * - nameList
   * @param {Segment} segment
   * @param {number} depth
   */
  _writeScanSegment(segment, depth) {
    const segmentScanFormatData = this._segmentScanFormatData(segment);
    if (MessageGroupFormatType.isDictionary(this._messageGroupFormat.type)) {
      segment.dataElements.forEach((dataElement) => {
        segmentScanFormatData.dataElementName = dataElement.name;
        const lines = this._segmentScanFormatter(segmentScanFormatData);
        lines.forEach(line => this._writeLine(line, depth));
      });
      return;
    }

    const lines = this._segmentScanFormatter(segmentScanFormatData);
    lines.forEach(line => this._writeLine(line, depth));
  }

  _segmentScanFormatData(segment) {
    const segmentScanFormatData = {
      dataElementSeparator: this._messageGroupFormat.dataElementSeparator,
      segmentName: segment.name,
      lengthListVar: VariableName.forLengthList(segment.name),
      lengthList: segment.dataElements.map(e => e.dataLength).join(', '),
      nameListVar: VariableName.forNameList(segment.name),
      nameList: segment.dataElements.map(e => `"${this._toNormalNameForm(e.name)}"`).join(', '),
      nDataElement: segment.dataElements.length,
      dataElementName: '',
    };
    return segmentScanFormatData;
  }

  _toNormalNameForm(name) {
    return name.trim().replace(/\s+/g, '_');
  }
}

module.exports = ScannerWriter;
