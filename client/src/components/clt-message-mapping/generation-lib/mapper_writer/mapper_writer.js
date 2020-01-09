const { MessageGroupFormatType } = require('../message_spec/data_types');
const MessageGroupFormatFactory = require('../message_spec/message_group_format_factory');
const MessageSpecReader = require('../message_spec/message_spec_reader');

const MappingDefinitionReader = require('./mapping_definition_reader');
const BizVariableSetterFactory = require('./biz_variable_setter_factory');
const { OutputMessageFormatter } = require('./output_message_formatter');
const OutputMessageWriter = require('./output_message_writer');
const VariableNameFormatter = require('./variable_name_formatter');

class MessageGroupFormatCode {
  static from(name) {
    if (name === 'FIXED_LENGTH') return MessageGroupFormatType.FIXED_LENGTH;
    if (name === 'FIXED_LENGTH_BY_INDEX') return MessageGroupFormatType.FIXED_LENGTH_BY_INDEX;
    if (name === 'FIXED_LENGTH_BY_NAME') return MessageGroupFormatType.FIXED_LENGTH_BY_NAME;
    if (name === 'DELIMITER') return MessageGroupFormatType.DELIMITER;
    if (name === 'DELIMITER_BY_INDEX') return MessageGroupFormatType.DELIMITER_BY_INDEX;
    if (name === 'DELIMITER_BY_NAME') return MessageGroupFormatType.DELIMITER_BY_NAME;
    if (name === 'DICTIONARY') return MessageGroupFormatType.DICTIONARY;
    if (name === 'EDIFACT') return MessageGroupFormatType.EDIFACT;
    return null;
  }
}

class MapperWriter {
  constructor(inputMessageGroupFormatName, outputMessageGroupFormatName) {
    const inputMessageGroupFormatType = MessageGroupFormatCode.from(inputMessageGroupFormatName);
    if (inputMessageGroupFormatName === null) {
      console.error(`Unknown input message group format: ${inputMessageGroupFormatName}`);
      return;
    }

    this._bizVariableSetter = BizVariableSetterFactory.create(inputMessageGroupFormatType);
    const outputMessageGroupFormatType = MessageGroupFormatCode.from(outputMessageGroupFormatName);
    if (inputMessageGroupFormatName === null) {
      console.error(`Unknown output message group format: ${inputMessageGroupFormatName}`);
      return;
    }

    const outputMessageGroupFormat = MessageGroupFormatFactory.create(outputMessageGroupFormatType);
    this._outputMessageFormatter = new OutputMessageFormatter(outputMessageGroupFormat);
    this._outputVariableNameFormatter = new VariableNameFormatter('Output');
    this._codeLines = [];
  }

  write(inputMessageSpec, outputMessageSpec, operationSpec, dataMapping) {
    this._codeLines.length = 0;
    this._writeHeaderCode();
    this._writeOutputSegmentGroupVariables(outputMessageSpec);
    this._writeOutputSegmentVariables();
    this._writeBizVariableSetting(inputMessageSpec, outputMessageSpec, operationSpec, dataMapping);
    this._writeOutputMessageStructure(outputMessageSpec);
    this._writeFooterCode();
    return this._codeLines.join('\n');
  }

  _writeLine(codeLine, indentLevel = 0, indentChar = '\t') {
    const indent = indentChar.repeat(indentLevel);
    this._codeLines.push(`${indent}${codeLine}`);
  }

  _writeHeaderCode() {
    this._writeLine('#include <stdio.h>', 0);
    this._writeLine('#include <stdlib.h>', 0);
    this._writeLine('#include <string.h>', 0);
    this._writeLine('#include "libmapper.h"', 0);
    this._writeLine('');
    this._writeLine('int main(int argc, char* argv[]) {', 0);
    this._writeLine('if (3 != argc) {', 1);
    this._writeLine('printf("Usage: mapper [BIZ_DATA_FILE] [OUTPUT_FILE]\\n");', 2);
    this._writeLine('return -1;', 2);
    this._writeLine('}', 1);
    this._writeLine('');
    this._writeLine('if (0 != InitMapper(argv[1], argv[2])) {', 1);
    this._writeLine('return -1;', 2);
    this._writeLine('}', 1);
  }

  _writeOutputSegmentGroupVariables(outputMessageSpec, bufferSize = 128) {
    const segmentGroupCount = outputMessageSpec.boundary.length;
    this._writeLine('');
    for (let i = 0; i < segmentGroupCount; i += 1) {
      this._writeLine(`char ${this._outputVariableNameFormatter.segmentGroupIdVarName(i)}[${bufferSize}] = { 0 };`, 1);
    }
    this._writeLine('');
    this._writeLine(`char ${this._outputVariableNameFormatter.segmentGroupCounterVarName()}[${bufferSize}] = { 0 };`, 1);
    // for (let i = 0; i < segmentGroupCount; i += 1) {
    //   this._writeLine(`char ${this._outputVariableNameFormatter.segmentGroupCounterVarName(i)}[${bufferSize}] = { 0 };`, 1);
    // }
  }

  _writeOutputSegmentVariables(bufferSize = 128) {
    this._writeLine('');
    this._writeLine(`char ${this._outputVariableNameFormatter.segmentIdVarName()}[${bufferSize}] = { 0 };`, 1);
    this._writeLine(`char ${this._outputVariableNameFormatter.segmentCounterVarName()}[${bufferSize}] = { 0 };`, 1);
  }

  _writeBizVariableSetting(inputMessageSpec, outputMessageSpec, operationSpec, dataMapping) {
    const mappingTreeRoot = MappingDefinitionReader.read(inputMessageSpec, outputMessageSpec, operationSpec, dataMapping, this._bizVariableSetter);
    this._writeLine(mappingTreeRoot.printCode());
  }

  _writeOutputMessageStructure(outputMessageSpec) {
    const outputMessageTree = MessageSpecReader.read(outputMessageSpec);
    const outputMessageTreeItemList = outputMessageTree.asItemList();
    const outputMessageFormats = this._outputMessageFormatter.print(outputMessageTreeItemList);
    const outputMessageStructureCode = new OutputMessageWriter().write(outputMessageFormats);
    this._writeLine(outputMessageStructureCode);
  }

  _writeFooterCode() {
    this._writeLine('');
    this._writeLine('DestroyMapper();', 1);
    this._writeLine('return 0;', 1);
    this._writeLine('}');
  }
}

module.exports = MapperWriter;
