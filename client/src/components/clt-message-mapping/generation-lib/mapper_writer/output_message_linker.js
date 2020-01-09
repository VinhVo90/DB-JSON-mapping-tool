const {
  SegmentGroupIndexMap,
} = require('./message_structure_util');

class OutputMessageLinker {
  constructor(outputSegmentDataMap, outputSegmentGroupDataMap) {
    this._outputSegmentDataMap = outputSegmentDataMap;
    this._outputSegmentGroupDataMap = outputSegmentGroupDataMap;
    const { segmentGroupIndexMap } = SegmentGroupIndexMap.make(outputSegmentGroupDataMap);
    this._outputSegmentGroupIndexMap = segmentGroupIndexMap;
  }

  link(inputSegments, dataMappingRoutes, bizVariableSetter) {
    const arrangedDataMappingRoutes = this._arrangeByInputOutputMapping(dataMappingRoutes);
    const outputMessageElementsByInputSegmentMap = this._convertToOutputMessageElements(arrangedDataMappingRoutes, bizVariableSetter);
    outputMessageElementsByInputSegmentMap.forEach((outputMessageElements, inputSegmentId) => {
      const inputSegment = inputSegments.get(inputSegmentId);
      if (inputSegment === undefined) {
        return;
      }

      const targetOutputMessageSegmentGroups = this._findTopTierParentOfSegment(outputMessageElements);
      targetOutputMessageSegmentGroups.forEach((targetOutputSegmentGroup) => {
        inputSegment.addChild(targetOutputSegmentGroup);
      });
    });
  }

  _arrangeByInputOutputMapping(dataMappingRoutes) {
    const inputSegmentMappings = new Map();
    dataMappingRoutes.forEach((route) => {
      const outputSegmentMappings = inputSegmentMappings.get(route.srcDataId) || new Map();
      inputSegmentMappings.set(route.srcDataId, outputSegmentMappings);
      const dataElementMappings = outputSegmentMappings.get(route.dstDataId) || new Map();
      outputSegmentMappings.set(route.dstDataId, dataElementMappings);
      const dataElementMappingKey = this._makeDataElementMappingKey(route);
      const mappings = dataElementMappings.get(dataElementMappingKey) || [];
      dataElementMappings.set(dataElementMappingKey, mappings);
      mappings.push(route);
    });
    return inputSegmentMappings;
  }

  _makeDataElementMappingKey(route) {
    const { input, output } = route.dataElementMapping();
    return [input.index, output.index].join('-');
  }

  _convertToOutputMessageElements(arrangedDataMappingRoutes, bizVariableSetter) {
    const outputMessageElementsByInputSegmentMap = new Map();
    arrangedDataMappingRoutes.forEach((outputSegmentMappings, inputSegmentId) => {
      const outputSegmentGroupMap = new Map();
      outputSegmentMappings.forEach((dataElementMappings, outputSegmentId) => {
        const outputSegmentData = this._outputSegmentDataMap.get(outputSegmentId);
        const outputSegment = bizVariableSetter.createOutputSegment(outputSegmentData.name);
        dataElementMappings.forEach((routes) => {
          const { input, output, operations } = routes[0].dataElementMapping(); // same end to end mapping but with different operation chains
          outputSegment.addMapping(output.index, input);
          outputSegment.addOperationChain(output.index, operations);
          // console.log(input);
          // if (operations) {
          //   operations.forEach(e => console.log(e));
          // }
        });

        let child = outputSegment;
        let outputSegmentGroupId = outputSegmentData.parent;
        while (outputSegmentGroupId !== null) { // non-root
          let outputSegmentGroup = outputSegmentGroupMap.get(outputSegmentGroupId);
          if (outputSegmentGroup !== undefined) {
            outputSegmentGroup.addChild(child);
            return;
          }

          const { name, index } = this._outputSegmentGroupIndexMap.get(outputSegmentGroupId);
          outputSegmentGroup = bizVariableSetter.createOutputSegmentGroup(name, index);
          outputSegmentGroupMap.set(outputSegmentGroupId, outputSegmentGroup);
          outputSegmentGroup.addChild(child);
          child = outputSegmentGroup;
          const parentOutputSegmentGroup = this._outputSegmentGroupDataMap.get(outputSegmentGroupId);
          outputSegmentGroupId = parentOutputSegmentGroup.parent;
        }
      });
      outputMessageElementsByInputSegmentMap.set(inputSegmentId, outputSegmentGroupMap);
    });
    return outputMessageElementsByInputSegmentMap;
  }

  _findTopTierParentOfSegment(outputSegmentGroupMap) {
    let minDepth = Number.MAX_SAFE_INTEGER;
    const topTierSegmentGroups = [];
    outputSegmentGroupMap.forEach((outputSegmentGroup) => {
      if (!outputSegmentGroup.hasSegment()) {
        return;
      }

      let depth = -1;
      let parentSegmentGroup = outputSegmentGroup;
      do {
        parentSegmentGroup = parentSegmentGroup.parent;
        depth += 1;
      } while (parentSegmentGroup !== null && depth < 10);

      if (depth < minDepth) {
        minDepth = depth;
        topTierSegmentGroups.length = 0;
        topTierSegmentGroups.push(outputSegmentGroup);
        return;
      }

      if (depth === minDepth) {
        topTierSegmentGroups.push(outputSegmentGroup);
      }
    });
    return topTierSegmentGroups;
  }
}

module.exports = OutputMessageLinker;
