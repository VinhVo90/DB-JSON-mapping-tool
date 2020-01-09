const InputMessageStructure = require('./input_message_structure');
const DataMappingRoutesMaker = require('./data_mapping_routes_maker');
const OutputMessageLinker = require('./output_message_linker');
const { IdMap } = require('./message_structure_util');

class MappingDefinitionReader {
  static read(inputMessage, outputMessage, operations, edges, bizVariableSetter) {
    const { inputMessageRoot, inputSegments } = new InputMessageStructure().make(inputMessage, bizVariableSetter);
    const inputSegmentDataMap = IdMap.from(inputMessage.vertex);
    const outputSegmentDataMap = IdMap.from(outputMessage.vertex);
    const operationDataMap = IdMap.from([...operations.vertex, ...operations.boundary]);
    const mappingSegmentPairs = new DataMappingRoutesMaker(inputSegmentDataMap, outputSegmentDataMap, operationDataMap).make(edges);
    const outputSegmentGroupDataMap = IdMap.from(outputMessage.boundary);
    new OutputMessageLinker(outputSegmentDataMap, outputSegmentGroupDataMap).link(inputSegments, mappingSegmentPairs, bizVariableSetter);
    return inputMessageRoot;
  }
}

module.exports = MappingDefinitionReader;
