const LoopType = require('./loop_type');
const VariableNameFormatter = require('./variable_name_formatter');
const FunctionMap = require('./function_map');

const inputVariableNameFormatter = new VariableNameFormatter('Input');
const outputVariableNameFormatter = new VariableNameFormatter('Output');

class InputSegmentGroup {
  constructor(name, groupIndex = 0) {
    this._name = name;
    this._groupIndex = groupIndex;
    this._type = LoopType.INPUT_SEGMENT_GROUP;
    this._children = [];
  }

  get name() {
    return this._name;
  }

  get type() {
    return this._type;
  }

  addChild(child) {
    if (LoopType.isInputSegmentGroup(child.type) || LoopType.isInputSegment(child.type)) {
      this._children.push(child);
    }
  }

  toString(depth = 0, indent = ' '.repeat(2)) {
    const currentIndent = indent.repeat(depth);
    const lines = [];
    lines.push(`${currentIndent}[GRP] ${this._name}`);
    this._children.forEach((child) => {
      lines.push(child.toString(depth + 1));
    });
    return lines.join('\n');
  }

  printCode(depth = 1, indent = '\t') {
    const currentIndent = indent.repeat(depth);
    const innerIndent = indent.repeat(depth + 1);
    const inputGroupIndexVarName = inputVariableNameFormatter.segmentGroupIndexVarName(this.name);
    const lines = [];
    lines.push('');
    lines.push(`${currentIndent}int ${inputGroupIndexVarName} = 0;`);
    lines.push(`${currentIndent}while (LoopVar("${this.name}")) {`);
    this._children.forEach((child) => {
      if (LoopType.isInputSegmentGroup(child.type)) {
        const line = child.printCode(depth + 1, indent);
        if (line === '') {
          return;
        }

        lines.push(line);
        return;
      }

      if (LoopType.isInputSegment(child.type)) {
        const line = child.printCode(inputGroupIndexVarName, depth, indent);
        if (line === '') {
          return;
        }

        lines.push(line);
      }
    });
    lines.push('');
    lines.push(`${innerIndent}${inputGroupIndexVarName} += 1;`);
    lines.push(`${currentIndent}}`);
    const outputGroupCounterVarName = outputVariableNameFormatter.segmentGroupCounterVarName();
    this._children.forEach((child) => {
      if (!LoopType.isInputSegment(child.type)) {
        return;
      }

      const inputSegment = child;
      inputSegment._children.forEach((outputSegmentGroup) => {
        const parentGroupIdVarName = outputSegmentGroup._parent === null ? '""' : outputVariableNameFormatter.segmentGroupIdVarName(outputSegmentGroup._parent.groupIndex);
        const selfGroupIndex = outputSegmentGroup.groupIndex;
        const selfGroupCounterName = outputVariableNameFormatter.segmentGroupCounterName(selfGroupIndex);
        lines.push(`${currentIndent}sprintf(${outputGroupCounterVarName}, "%s%s", ${parentGroupIdVarName}, "${selfGroupCounterName}");`);
        lines.push(`${currentIndent}setVarInt(${outputGroupCounterVarName}, ${inputGroupIndexVarName});`);
      });
    });
    return lines.join('\n');
  }
}

class InputSegment {
  constructor(name, segmentIndex = 0) {
    this._name = name;
    this._segmentIndex = segmentIndex;
    this._type = LoopType.INPUT_SEGMENT;
    this._children = [];
  }

  get name() {
    return this._name;
  }

  get type() {
    return this._type;
  }

  toString(depth = 0, indent = ' '.repeat(2)) {
    const currentIndent = indent.repeat(depth);
    return `${currentIndent}> [SGM] ${this._name}`;
  }

  addChild(child) {
    if (LoopType.isOutputSegmentGroup(child.type)) {
      child.setKeyLoop();
      this._children.push(child);
    }
  }

  printCode(groupIndexVarName, depth, indent) {
    const lines = [];
    this._children.forEach((e) => {
      lines.push(e.printCode(groupIndexVarName, this.name, depth + 1, indent));
    });
    return lines.join('\n');
  }
}

class OutputSegmentGroup {
  constructor(name, groupIndex) {
    this._name = name;
    this._type = LoopType.OUTPUT_SEGMENT_GROUP;
    this._children = [];
    this._groupIndex = groupIndex;
    this._isKeyLoop = false;
    this._parent = null;
  }

  get name() {
    return this._name;
  }

  get type() {
    return this._type;
  }

  get groupIndex() {
    return this._groupIndex;
  }

  get parent() {
    return this._parent;
  }

  setKeyLoop() {
    this._isKeyLoop = true;
  }

  setParent(parent) {
    this._parent = parent;
  }

  hasSegment() {
    return this._children.some(child => LoopType.isOutputSegment(child.type));
  }

  addChild(child) {
    if (LoopType.isOutputSegmentGroup(child.type)) {
      child.setParent(this);
      this._children.push(child);
    }

    if (LoopType.isOutputSegment(child.type)) {
      this._children.push(child);
    }
  }

  toString(depth = 0, indent = ' '.repeat(2)) {
    const currentIndent = indent.repeat(depth);
    const lines = [];
    lines.push(`${currentIndent}[GRP${this._groupIndex}] ${this._name}`);
    this._children.forEach((child) => {
      lines.push(child.toString(depth + 1));
    });
    return lines.join('\n');
  }

  printCode(inputGroupIndexVarName, targetInputSegmentName, depth, indent) {
    const currentIndent = indent.repeat(depth);
    const lines = [];
    const selfGroupIndex = this.groupIndex;
    const selfGroupIdVarName = outputVariableNameFormatter.segmentGroupIdVarName(selfGroupIndex);
    const parentGroupIdVarName = (this.parent === null) ? '""'
      : outputVariableNameFormatter.segmentGroupIdVarName(this.parent.groupIndex);

    let descTag = '[ROOT] GROUP';
    if (this.name !== '') {
      descTag = `[${this.name}] GROUP`;
      lines.push(`${currentIndent}// ${descTag} BEGIN`);
      const currentGroupIndex = (this._isKeyLoop) ? inputGroupIndexVarName : '0';
      lines.push(`${currentIndent}sprintf(${selfGroupIdVarName}, "%s%s[%d]", ${parentGroupIdVarName}, "${this.name}", ${currentGroupIndex});`);
    } else {
      lines.push(`${currentIndent}// ${descTag} BEGIN`);
    }

    lines.push(`${currentIndent}{`);
    this._children.forEach((e, i) => {
      if (i !== 0) {
        lines.push('');
      }

      if (LoopType.isOutputSegmentGroup(e.type)) {
        lines.push(e.printCode(inputGroupIndexVarName, targetInputSegmentName, depth + 1, indent));
        return;
      }

      if (LoopType.isOutputSegment(e.type)) {
        lines.push(e.printCode(selfGroupIdVarName, targetInputSegmentName, depth + 1, indent));
      }
    });
    lines.push(`${currentIndent}}`);
    lines.push(`${currentIndent}// ${descTag} END`);

    if (!this._isKeyLoop) {
      const outputGroupCounterVarName = outputVariableNameFormatter.segmentGroupCounterVarName();
      const selfGroupCounterName = outputVariableNameFormatter.segmentGroupCounterName(selfGroupIndex);
      lines.push(`${currentIndent}sprintf(${outputGroupCounterVarName}, "%s%s", ${parentGroupIdVarName}, "${selfGroupCounterName}");`);
      lines.push(`${currentIndent}setVarInt(${outputGroupCounterVarName}, 1);`);
    }
    return lines.join('\n');
  }
}

class OutputSegment {
  constructor(name, dataElementNameFormatter) {
    this._name = name;
    this._type = LoopType.OUTPUT_SEGMENT;
    this._inputsByOutput = {};
    this._operationChainsByOutput = {};
    this._dataElementNameFormatter = dataElementNameFormatter;
  }

  get name() {
    return this._name;
  }

  get type() {
    return this._type;
  }

  addMapping(outputIndex, input) {
    let inputs = this._inputsByOutput[outputIndex];
    if (inputs === undefined) {
      inputs = [];
      this._inputsByOutput[outputIndex] = inputs;
    }

    inputs.push(input);
  }

  addOperationChain(outputIndex, operationChain) {
    let operationChains = this._operationChainsByOutput[outputIndex];
    if (operationChains === undefined) {
      operationChains = [];
      this._operationChainsByOutput[outputIndex] = operationChains;
    }

    operationChains.push(operationChain);
  }

  toString(depth = 0, indent = ' '.repeat(2)) {
    const currentIndent = indent.repeat(depth);
    return `${currentIndent}> [SGM] ${this._name}`;
  }

  printCode(groupIdVarName, targetInputSegmentName, depth, indent) {
    const currentIndent = indent.repeat(depth);
    const lines = [];
    let maxRepeat = 0;
    lines.push(`${currentIndent}// [${this.name}] SEGMENT BEGIN`);

    const segmentIdVarName = outputVariableNameFormatter.segmentIdVarName();
    const tempVarName = outputVariableNameFormatter.dataElementIdVarName();
    Object.keys(this._inputsByOutput).sort().forEach((outputIndex) => {
      const inputDataElements = this._inputsByOutput[outputIndex];
      const operationChains = this._operationChainsByOutput[outputIndex];
      maxRepeat = Math.max(maxRepeat, inputDataElements.length);
      inputDataElements.forEach((e, i) => {
        lines.push(`${currentIndent}sprintf(${segmentIdVarName}, "%s%s[%d]", ${groupIdVarName}, "${this.name}", ${i});`);
        lines.push(`${currentIndent}sprintf(${tempVarName}, "%s_%d", ${segmentIdVarName}, ${outputIndex});`);
        const bizDataElementName = this._dataElementNameFormatter(targetInputSegmentName, e);
        const bizInput = `getBizValue("${bizDataElementName}")`;
        const processedBizInput = this._processOperation(bizInput, operationChains, i);
        lines.push(`${currentIndent}setVar(${tempVarName}, ${processedBizInput});`);
      });
      lines.push('');
    });
    const segmentCounterVarName = outputVariableNameFormatter.segmentCounterVarName();
    const segmentCounterName = outputVariableNameFormatter.segmentCounterName(this.name);
    lines.push(`${currentIndent}sprintf(${segmentCounterVarName}, "%s%s", ${groupIdVarName}, "${segmentCounterName}");`);
    lines.push(`${currentIndent}setVarInt(${segmentCounterVarName}, ${maxRepeat});`);
    lines.push(`${currentIndent}// [${this.name}] SEGMENT END`);
    return lines.join('\n');
  }

  _processOperation(bizInput, operationChains, operationChainIndex) {
    if (!operationChains) {
      return bizInput;
    }

    const operationChain = operationChains[operationChainIndex];
    if (!operationChain) {
      return bizInput;
    }

    let processed = bizInput;
    operationChain.forEach((operation) => {
      const matchedFunc = FunctionMap.from(operation);
      processed = matchedFunc(processed);
    });
    return processed;
  }
}

class FlatFileBizVariableSetter {
  constructor(dataElementNameFormatter = (segmentName, dataElement) => {
    const dataElementName = dataElement.name ? dataElement.name.trim().replace(/\s+/g, '_') : dataElement.index;
    return `${segmentName}_${dataElementName}`;
  }) {
    this._dataElementNameFormatter = dataElementNameFormatter;
  }

  createInputSegmentGroup(name, groupIndex) {
    return new InputSegmentGroup(name, groupIndex);
  }

  createInputSegment(name, segmentIndex) {
    return new InputSegment(name, segmentIndex);
  }

  createOutputSegmentGroup(name, groupIndex) {
    return new OutputSegmentGroup(name, groupIndex);
  }

  createOutputSegment(name) {
    return new OutputSegment(name, this._dataElementNameFormatter);
  }
}

module.exports = FlatFileBizVariableSetter;
