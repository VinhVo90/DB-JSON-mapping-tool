const VariableNameFormatter = require('./variable_name_formatter');
const { MessageSpecElementType } = require('../message_spec/data_types');

/**
 * @class
 */
class OutputMessageWriter {
  constructor() {
    this._variableNameFormatter = new VariableNameFormatter('Output');
    this._lines = [];
  }

  /**
   * @param {OutputMessageFormat[]} outputMessageFormatList
   */
  write(outputMessageFormatList) {
    this._lines.length = 0;
    this._writeHeader();
    this._writeVariableLines(outputMessageFormatList);
    this._writeMessageStructureLines(outputMessageFormatList);
    this._writeFooter();
    return this._printLines();
  }

  _writeLine(line, defaultIndent = 1) {
    this._lines.push(`${this._indent(defaultIndent)}${line}`);
  }

  _writeHeader() {
    this._writeLine('');
    this._writeLine('// Begin output format printing');
  }

  _writeFooter() {
    this._writeLine('');
    this._writeLine('// End output format printing');
  }

  _printLines() {
    return this._lines.join('\n');
  }

  _writeVariableLines(outputMessageFormatList, segmentVarSize = 64, dataElementVarSize = 128) {
    this._writeLine('');
    this._writeLine('int nLine = 0;');
    this._setSegmentGroupVariables(outputMessageFormatList, segmentVarSize);
    // this._setSegmentVariables(segmentVarSize);
    this._setDataElementVariables(outputMessageFormatList, dataElementVarSize);
  }

  _setSegmentGroupVariables(outputMessageFormatList, bufferSize) {
    const segmentGroupSet = new Set();
    outputMessageFormatList.forEach((messageFormat) => {
      if (!MessageSpecElementType.isSegmentGroup(messageFormat.messageSpecElementType)) {
        return;
      }

      segmentGroupSet.add(messageFormat.name);
    });

    // this._writeLine('');
    // for (let i = 0; i < segmentGroupSet.size; i += 1) {
    //   this._writeLine(`char ${this._variableNameFormatter.segmentGroupIdVarName(i)}[${bufferSize}] = { 0 };`);
    // }

    this._writeLine('');
    for (let i = 0; i < segmentGroupSet.size; i += 1) {
      this._writeLine(`char ${this._variableNameFormatter.segmentGroupCounterVarName(i)}[${bufferSize}] = { 0 };`);
    }
  }

  _setSegmentVariables(bufferSize) {
    this._writeLine('');
    this._writeLine(`char ${this._variableNameFormatter.segmentIdVarName()}[${bufferSize}] = { 0 };`);
    this._writeLine(`char ${this._variableNameFormatter.segmentCounterVarName()}[${bufferSize}] = { 0 };`);
  }

  _setDataElementVariables(outputMessageFormatList, bufferSize) {
    let maxDataElementCount = 1;
    outputMessageFormatList.forEach((messageFormat) => {
      if (!MessageSpecElementType.isSegment(messageFormat.messageSpecElementType)) {
        return;
      }

      maxDataElementCount = Math.max(maxDataElementCount, messageFormat.dataElementCount);
    });

    this._writeLine('');
    for (let i = 0; i < maxDataElementCount; i += 1) {
      this._writeLine(`char ${this._variableNameFormatter.dataElementIdVarName(i)}[${bufferSize}] = { 0 };`);
    }
  }

  _indent(depth) {
    return '\t'.repeat(depth);
  }

  _writeMessageStructureLines(outputMessageFormatList) {
    const segmentGroupStack = [];
    outputMessageFormatList.forEach((messageFormat) => {
      const elementType = messageFormat.messageSpecElementType;
      if (MessageSpecElementType.isSegmentGroup(elementType)) {
        this._printSegmentGroup(messageFormat, segmentGroupStack);
        return;
      }

      if (segmentGroupStack.length === 0) {
        return;
      }

      const currentSegmentGroup = segmentGroupStack[segmentGroupStack.length - 1];
      this._printSegment(currentSegmentGroup, messageFormat);
    });
  }

  _printSegmentGroup(segmentGroup, segmentGroupStack) {
    const treeDepth = segmentGroup.depth;
    const statementIndent = this._indent(treeDepth);
    if (this._satisfiedSegmentGroupCloseCondition(segmentGroupStack, segmentGroup)) {
      segmentGroupStack.pop();
      if (segmentGroup.format) {
        this._writeLine('');
        this._writeLine(`${statementIndent}nLine += Write("${segmentGroup.format}");`);
      }

      if (treeDepth > 0) {
        const loopIndent = this._indent(treeDepth - 1);
        this._writeLine(`${loopIndent}}`);
      }
      return;
    }

    segmentGroupStack.push(segmentGroup);
    if (treeDepth > 0) {
      const loopIndent = this._indent(treeDepth - 1);
      const stackTopIndex = segmentGroupStack.length - 1;
      const prevSegmentGroup = segmentGroupStack[stackTopIndex - 1];
      const prevSegmentGroupId = this._variableNameFormatter
        .segmentGroupIdVarName(prevSegmentGroup.index);
      const segmentGroupCounterVarName = this._variableNameFormatter
        .segmentGroupCounterVarName(segmentGroup.index);
      const segmentGroupCounterName = this._variableNameFormatter
        .segmentGroupCounterName(segmentGroup.index);
      this._writeLine('');
      this._writeLine(`${loopIndent}sprintf(${segmentGroupCounterVarName}, "%s%s", ${prevSegmentGroupId}, "${segmentGroupCounterName}");`);
      this._writeLine(`${loopIndent}int ${segmentGroupCounterName} = getVarInt(${segmentGroupCounterVarName});`);

      const segmentGroupIndexName = this._variableNameFormatter.segmentGroupIndexVarName(segmentGroup.index);
      this._writeLine(`${loopIndent}for (int ${segmentGroupIndexName} = 0; ${segmentGroupIndexName} < ${segmentGroupCounterName}; ${segmentGroupIndexName}++) {`);

      const segmentGroupId = this._variableNameFormatter.segmentGroupIdVarName(segmentGroup.index);
      this._writeLine(`${statementIndent}sprintf(${segmentGroupId}, "%s%s[%d]", ${prevSegmentGroupId}, "${segmentGroup.name}", ${segmentGroupIndexName});`);
    }

    if (segmentGroup.format) {
      this._writeLine('');
      this._writeLine(`${statementIndent}nLine += Write("${segmentGroup.format}");`);
    }
  }

  _satisfiedSegmentGroupCloseCondition(segmentGroupStack, segmentGroup) {
    if (segmentGroupStack.length === 0) return false;
    const lastSegmentGroup = segmentGroupStack[segmentGroupStack.length - 1];
    if (lastSegmentGroup.name !== segmentGroup.name) return false;
    if (lastSegmentGroup.depth !== segmentGroup.depth) return false;
    return true;
  }

  _printSegment(segmentGroup, segment) {
    const segmentGroupId = this._variableNameFormatter.segmentGroupIdVarName(segmentGroup.index);
    const statementIndent = this._indent(segment.depth);
    const loopIndent = this._indent(segment.depth - 1);
    const segmentCounterVarName = this._variableNameFormatter.segmentCounterVarName();
    const segmentCounterName = this._variableNameFormatter.segmentCounterName(segment.name);
    this._writeLine('');
    this._writeLine(`${loopIndent}sprintf(${segmentCounterVarName}, "%s%s", ${segmentGroupId}, "${segmentCounterName}");`);
    this._writeLine(`${loopIndent}int ${segmentCounterName} = getVarInt(${segmentCounterVarName});`);

    const segmentIndexName = this._variableNameFormatter.segmentIndexVarName(segmentGroup.index, segment.name);
    this._writeLine(`${loopIndent}for (int ${segmentIndexName} = 0; ${segmentIndexName} < ${segmentCounterName}; ${segmentIndexName}++) {`);

    const segmentId = this._variableNameFormatter.segmentIdVarName();
    this._writeLine(`${statementIndent}sprintf(${segmentId}, "%s%s[%d]", ${segmentGroupId}, "${segment.name}", ${segmentIndexName});`);

    for (let i = 0; i < segment.dataElementCount; i += 1) {
      this._writeLine(`${statementIndent}sprintf(${this._variableNameFormatter.dataElementIdVarName(i)}, "%s_%d", ${segmentId}, ${i});`);
    }

    const readingDataElementsCode = this._readingDataElementsCode(segment);
    this._writeLine(`${statementIndent}nLine += Write("${segment.format}", \n${readingDataElementsCode}`);
    this._writeLine(`${statementIndent});`);
    this._writeLine(`${loopIndent}}`);
  }

  _readingDataElementsCode(segment) {
    const readingCodes = [];
    const dataElementIndent = this._indent(segment.depth + 2);
    for (let i = 0; i < segment.dataElementCount; i += 1) {
      readingCodes.push(`${dataElementIndent}getVar(${this._variableNameFormatter.dataElementIdVarName(i)})`);
    }
    return readingCodes.join(',\n');
  }
}

module.exports = OutputMessageWriter;
