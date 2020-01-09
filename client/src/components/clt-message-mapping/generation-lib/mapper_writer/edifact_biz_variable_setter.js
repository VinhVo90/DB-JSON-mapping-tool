const LoopType = require('./loop_type');
const VariableNameFormatter = require('./variable_name_formatter');
const FunctionMap = require('./function_map');

const inputVariableNameFormatter = new VariableNameFormatter('Input');
const outputVariableNameFormatter = new VariableNameFormatter('Output');

class InputSegmentGroup {
  constructor(name, groupIndex) {
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
    if (LoopType.isInputSegmentGroup(child.type)) {
      this._children.push(child);
      return;
    }

    if (LoopType.isInputSegment(child.type)) {
      this._children.push(child);
      child.setGroupIndex(this._groupIndex);
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

  printCode(depth = 1, indent = '\t') {
    if (this._children.length === 0) {
      return '';
    }

    const currentIndent = indent.repeat(depth);
    const innerIndent = indent.repeat(depth + 1);
    const inputGroupIndexVarName = inputVariableNameFormatter.segmentGroupIndexVarName(this.name);
    const segmentGroupName = this._children[0].tagName;

    const lines = [];
    lines.push('');
    lines.push(`${currentIndent}int ${inputGroupIndexVarName} = 0;`);
    lines.push(`${currentIndent}while (LoopGroup("${segmentGroupName}")) {`);
    this._children.forEach((child) => {
      if (LoopType.isInputSegmentGroup(child.type)) {
        lines.push(child.printCode(depth + 1, indent));
        return;
      }

      if (LoopType.isInputSegment(child.type)) {
        lines.push(child.printCode(inputGroupIndexVarName, depth + 1, indent));
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
  constructor(name, segmentIndex) {
    this._name = name;
    this._segmentIndex = this.zeroPad(segmentIndex);
    this._type = LoopType.INPUT_SEGMENT;
    this._groupIndex = undefined;
    this._children = [];
  }

  get name() {
    return this._name;
  }

  get type() {
    return this._type;
  }

  get tagName() {
    return `${this.name}${this._groupIndex}${this._segmentIndex}`;
  }

  get structuralIndex() {
    return `${this._groupIndex}${this._segmentIndex}`;
  }

  zeroPad(number, length = 2) {
    return String(number).padStart(length, '0');
  }

  setGroupIndex(groupIndex) {
    this._groupIndex = this.zeroPad(groupIndex);
  }

  addChild(child) {
    if (LoopType.isOutputSegmentGroup(child.type)) {
      child.setKeyLoop();
      this._children.push(child);
    }
  }

  toString(depth = 0, indent = ' '.repeat(2)) {
    const currentIndent = indent.repeat(depth);
    return `${currentIndent}> [SGM${this._segmentIndex}] ${this._name}`;
  }

  printCode(groupIndexVarName, depth, indent) {
    const currentIndent = indent.repeat(depth);
    const innerIndent = indent.repeat(depth + 1);
    const segmentIndexVarName = inputVariableNameFormatter.segmentIndexVarName(this.name, this.structuralIndex);

    const lines = [];
    lines.push('');
    lines.push(`${currentIndent}int ${segmentIndexVarName} = 0;`);
    lines.push(`${currentIndent}while (LoopSegment("${this.tagName}")) {`);

    this._children.forEach((outputSegmentGroup) => {
      lines.push(outputSegmentGroup.printCode(groupIndexVarName, segmentIndexVarName, this.tagName, depth + 1, indent));
    });

    lines.push('');
    lines.push(`${innerIndent}${segmentIndexVarName} += 1;`);
    lines.push(`${currentIndent}}`);

    const outputSegmentCounterVarName = outputVariableNameFormatter.segmentCounterVarName();
    this._children.forEach((outputSegmentGroup) => {
      const selfGroupIndex = outputSegmentGroup.groupIndex;
      const selfGroupIdVarName = outputVariableNameFormatter.segmentGroupIdVarName(selfGroupIndex);
      outputSegmentGroup._children.forEach((child) => {
        if (LoopType.isOutputSegmentGroup(child.type)) {
          return;
        }

        const outputSegment = child;
        const selfSegmentCounterName = outputVariableNameFormatter.segmentCounterName(outputSegment.name);
        lines.push(`${currentIndent}sprintf(${outputSegmentCounterVarName}, "%s%s", ${selfGroupIdVarName}, "${selfSegmentCounterName}");`);
        lines.push(`${currentIndent}setVarInt(${outputSegmentCounterVarName}, ${segmentIndexVarName});`);
      });
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

  hasSegment() {
    return this._children.some(child => LoopType.isOutputSegment(child.type));
  }

  /**
   * Set a output segment group connected to input segment.
   * It has the same repetition as input segment.
   */
  setKeyLoop() {
    this._isKeyLoop = true;
  }

  setParent(parent) {
    this._parent = parent;
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

  printCode(inputGroupIndexVarName, inputSegmentIndexVarName, targetInputSegmentName, depth, indent) {
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
      const currentIndex = (this._isKeyLoop) ? inputGroupIndexVarName : 0;
      lines.push(`${currentIndent}sprintf(${selfGroupIdVarName}, "%s%s[%d]", ${parentGroupIdVarName}, "${this.name}", ${currentIndex});`);
    } else {
      lines.push(`${currentIndent}// ${descTag} BEGIN`);
    }

    lines.push(`${currentIndent}{`);
    this._children.forEach((child, i) => {
      if (i !== 0) {
        lines.push('');
      }

      if (LoopType.isOutputSegmentGroup(child.type)) {
        lines.push(child.printCode(inputGroupIndexVarName, inputSegmentIndexVarName, targetInputSegmentName, depth + 1, indent));
        return;
      }

      if (LoopType.isOutputSegment(child.type)) {
        lines.push(child.printCode(selfGroupIdVarName, inputSegmentIndexVarName, targetInputSegmentName, depth + 1, indent));
        if (!this._isKeyLoop) {
          const outputSegmentCounterVarName = outputVariableNameFormatter.segmentCounterVarName();
          const selfSegmentCounterName = outputVariableNameFormatter.segmentCounterName(child.name);
          const innerIndent = indent.repeat(depth + 1);
          lines.push(`${innerIndent}sprintf(${outputSegmentCounterVarName}, "%s%s", ${selfGroupIdVarName}, "${selfSegmentCounterName}");`);
          lines.push(`${innerIndent}setVarInt(${outputSegmentCounterVarName}, ${inputSegmentIndexVarName});`);
        }
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
  constructor(name, dataElementNameFormat) {
    this._name = name;
    this._type = LoopType.OUTPUT_SEGMENT;
    this._inputsByOutput = {};
    this._operationChainsByOutput = {};
    this._dataElementNameFormat = dataElementNameFormat;
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

  printCode(groupIdVarName, segmentIndexVarName, targetInputSegmentName, depth, indent) {
    const currentIndent = indent.repeat(depth);
    const lines = [];
    lines.push(`${currentIndent}// [${this.name}] SEGMENT BEGIN`);

    const segmentIdVarName = outputVariableNameFormatter.segmentIdVarName();
    lines.push(`${currentIndent}sprintf(${segmentIdVarName}, "%s%s[%d]", ${groupIdVarName}, "${this.name}", ${segmentIndexVarName});`);
    lines.push('');

    const dataElementIdVarName = outputVariableNameFormatter.dataElementIdVarName();
    Object.keys(this._inputsByOutput).sort().forEach((outputIndex, i) => {
      if (i !== 0) {
        lines.push('');
      }

      lines.push(`${currentIndent}sprintf(${dataElementIdVarName}, "%s_%d", ${segmentIdVarName}, ${outputIndex});`);
      const inputDataElements = this._inputsByOutput[outputIndex];
      const operationChains = this._operationChainsByOutput[outputIndex];
      inputDataElements.forEach((inputDataElement, j) => {
        // lines.push(`${currentIndent}sprintf(${segmentIdVarName}, "%s%s[%d]", ${groupIdVarName}, "${this.name}", ${segmentIndexVarName});`);
        // lines.push(`${currentIndent}sprintf(${tempVarName}, "%s_%d", ${segmentIdVarName}, ${outputIndex});`);
        const bizDataElementName = this._dataElementNameFormat(targetInputSegmentName, inputDataElement);
        const bizInput = `getBizValue("${bizDataElementName}")`;
        const processedBizInput = this._processOperation(bizInput, operationChains, j);
        lines.push(`${currentIndent}setVar(${dataElementIdVarName}, ${processedBizInput});`);
      });
    });
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

class EdifactBizVariableSetter {
  constructor(dataElementNameFormatter = (segmentName, dataElement) => `${segmentName}${String(dataElement.index).padStart(2, '0')}`) {
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

module.exports = EdifactBizVariableSetter;
