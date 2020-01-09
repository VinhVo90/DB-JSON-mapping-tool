class MappingData {
  constructor(srcVertexId, srcDataIndex, dstVertexId, dstDataIndex) {
    this._srcData = { vertexId: srcVertexId, dataIndex: srcDataIndex };
    this._dstData = { vertexId: dstVertexId, dataIndex: dstDataIndex };
    this._operations = [];
  }

  static createFrom(connection) {
    return new MappingData(connection.srcData.vertexId, connection.srcData.dataIndex,
      connection.dstData.vertexId, connection.dstData.dataIndex);
  }

  get srcDataId() {
    return this._srcData.vertexId;
  }

  get srcDataIndex() {
    return this._srcData.dataIndex;
  }

  get srcDataName() {
    return this._srcData.dataName;
  }

  get dstDataId() {
    return this._dstData.vertexId;
  }

  get dstDataIndex() {
    return this._dstData.dataIndex;
  }

  get dstDataName() {
    return this._dstData.dataName;
  }

  get operations() {
    return this._operations;
  }

  setSrcDataName(name) {
    this._srcData.dataName = name || '';
    return this;
  }

  setDstDataName(name) {
    this._dstData.dataName = name || '';
    return this;
  }

  dataElementMapping() {
    return {
      input: {
        index: this._srcData.dataIndex,
        name: this._srcData.dataName || this._srcData.dataIndex,
      },
      output: {
        index: this._dstData.dataIndex,
        name: this._dstData.dataName || this._dstData.dataIndex,
      },
      operations: this._operations,
    };
  }

  updateSource({ vertexId, dataIndex, dataName = '' }) {
    this._srcData.vertexId = vertexId;
    this._srcData.dataIndex = dataIndex;
    this._srcData.dataName = dataName;
  }

  addOperation({ vertexId, name, parameters }) {
    this._operations.push({ vertexId, name, parameters });
  }

  clone() {
    const args = [
      this.srdDataId,
      this.srcDataIndex,
      this.dstDataId,
      this.srcDataIndex,
    ];
    const cloned = new MappingData(...args);
    cloned.setSrcDataName(this.srcDataName);
    cloned.setDstDataName(this.dstDataName);
    this._operations.forEach(operation => cloned.addOperation(operation));
    return cloned;
  }

  toString() {
    const lines = [];
    lines.push(`${this._srcData.vertexId}:${this._srcData.dataIndex}(${this._srcData.dataName}) -> ${this._dstData.vertexId}:${this._dstData.dataIndex}(${this._dstData.dataName})`);
    this._operations.forEach(op => lines.push(`\t[OP] ${op.vertexId}:${op.name}\n(${op.parameters})`));
    return lines.join('\n');
  }
}

class DataMappingRoutesMaker {
  constructor(inputSegmentMap, outputSegmentMap, operationMap, debug = false) {
    this._inputSegmentMap = inputSegmentMap;
    this._outputSegmentMap = outputSegmentMap;
    this._operationMap = operationMap;
    this._allInstanceMap = new Map([...inputSegmentMap, ...outputSegmentMap, ...operationMap]);
    this._debug = debug;
  }

  _isConnectedToInputSegment(mappingData) {
    return this._inputSegmentMap.has(mappingData.srcDataId);
  }

  _isConnectedToOperation(mappingData) {
    return this._operationMap.has(mappingData.srcDataId);
  }

  _isConnectedToOutputSegment(connection) {
    return this._outputSegmentMap.has(connection.dstData.vertexId);
  }

  make(edges) {
    const terminalEdges = [];
    const operationEdges = [];
    edges.forEach((edge) => {
      const connection = this._makeConnectionInfo(edge);
      if (this._isConnectedToOutputSegment(connection)) {
        const mappingData = MappingData.createFrom(connection);
        this._setDataNames(mappingData);
        terminalEdges.push(mappingData);
      } else {
        operationEdges.push(connection);
      }
    });

    const endToEndEdges = [];
    const constantToEndEdges = [];
    while (terminalEdges.length > 0) {
      const mappingData = terminalEdges.shift();
      this._collectOperations(terminalEdges, mappingData, operationEdges, endToEndEdges);

      if (this._isConnectedToInputSegment(mappingData)) {
        endToEndEdges.push(mappingData);
        this._debug && console.log(`Added EndToEndEdge: ${mappingData.toString()}`);
        continue;
      }

      if (this._debug && !this._isConnectedToOperation(mappingData)) {
        console.log(`Unknown mapping: ${mappingData.srcDataId}`);
      }

      constantToEndEdges.push(mappingData);
    }
    return endToEndEdges;
  }

  _setDataNames(mappingData) {
    const srcDataName = this._readDataName(mappingData._srcData);
    mappingData.setSrcDataName(srcDataName);
    const dstDataName = this._readDataName(mappingData._dstData);
    mappingData.setDstDataName(dstDataName);
  }

  _readDataName(targetData) {
    const data = this._allInstanceMap.get(targetData.vertexId);
    if (!data) {
      return '';
    }

    const elements = data.data || data.member;
    if (!elements) {
      return '';
    }

    const index = parseInt(targetData.dataIndex, 10);
    if (Number.isNaN(index)) {
      return data.name || '';
    }

    const targetElement = elements[index];
    if (!targetElement) {
      return '';
    }

    return targetElement.name || '';
  }

  _makeConnectionInfo(edge) {
    const SEPARATOR = 'Connected';
    return {
      srcData: {
        vertexId: edge.source.vertexId,
        dataIndex: edge.source.prop.split(SEPARATOR)[1],
      },
      dstData: {
        vertexId: edge.target.vertexId,
        dataIndex: edge.target.prop.split(SEPARATOR)[1],
      },
    };
  }

  _collectOperations(terminalEdges, mappingData, operationEdges, endToEndEdges) {
    let i = 0;
    const MAX_LOOP = 1e6;
    for (
      let operation = this._findOperation(mappingData.srcDataId);
      i < MAX_LOOP && operation !== undefined;
      operation = this._findOperation(mappingData.srcDataId)
    ) {
      i += 1;

      // mappingData.addSourceAsOperation();
      mappingData.addOperation({
        vertexId: operation.id,
        name: operation.name,
        parameters: this._makeParameters(operation.data),
      });
      const prevOperationEdges = this._collectIncomingEdges(operationEdges, operation.id);
      this._debug && console.log(`[${operation.name}] > ${prevOperationEdges.length}`);

      if (prevOperationEdges.length === 0) {
        // constant or variable case
        if (operation.parent === null) {
          endToEndEdges.push(mappingData);
          this._debug && console.log('\tFound constant or variable');
          break;
        }

        // conditional clause case
        const conditionBoundary = this._findOperation(operation.parent);
        const newSource = {
          vertexId: conditionBoundary.id,
          dataIndex: this._findMemberIndex(conditionBoundary, mappingData.srcDataId),
          dataName: conditionBoundary.name,
        };
        mappingData.updateSource(newSource);
        this._debug && console.log('\tFound conditional clause');
        continue;
      }

      // single edge case
      if (prevOperationEdges.length === 1) {
        const prevEdge = prevOperationEdges[0];
        prevEdge.srcData.dataName = this._readDataName(prevEdge.srcData);
        mappingData.updateSource(prevEdge.srcData);
        this._debug && console.log('\tFound 1 edge');
        continue;
      }

      // multi edge case
      const newMappingData = this._splitRoutes(prevOperationEdges, mappingData);
      terminalEdges.unshift(...newMappingData);
      this._debug && console.log(`\tFound ${prevOperationEdges.length} edges`);
      break;
    }
  }

  _makeParameters(dataList) {
    const parameters = {};
    if (!dataList) {
      return parameters;
    }

    dataList.forEach((e) => {
      parameters[e.name] = e;
    });
    return parameters;
  }

  _findOperation(operationId) {
    return this._operationMap.get(operationId);
  }

  _collectIncomingEdges(edges, targetId) {
    return edges.filter(edge => edge.dstData.vertexId === targetId);
  }

  _splitRoutes(operationEdges, mappingData) {
    const splits = [];
    operationEdges.forEach((operationEdge) => {
      operationEdge.srcData.dataName = this._readDataName(operationEdge.srcData);
      const clonedMappingEdge = mappingData.clone();
      clonedMappingEdge.updateSource(operationEdge.srcData);
      splits.push(clonedMappingEdge);
    });
    return splits;
  }

  _findMemberIndex(boundary, targetId) {
    return boundary.member.findIndex(e => e.id === targetId);
  }
}

module.exports = DataMappingRoutesMaker;
