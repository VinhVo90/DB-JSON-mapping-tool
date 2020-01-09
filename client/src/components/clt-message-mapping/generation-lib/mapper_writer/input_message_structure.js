const {
  MessageElementType,
  SegmentGroupIndexMap,
  IdMap,
} = require('./message_structure_util');

class InputMessageStructure {
  make(inputMessageSpec, bizVariableSetter) {
    const segmentGroupMap = IdMap.from(inputMessageSpec.boundary);
    const { root, segmentGroupIndexMap } = SegmentGroupIndexMap.make(segmentGroupMap);
    const inputSegmentGroups = this._makeInputSegmentGroupMap(segmentGroupIndexMap, bizVariableSetter);
    const segmentMap = IdMap.from(inputMessageSpec.vertex);
    const inputSegments = this._makeInputSegments(segmentMap, segmentGroupMap, bizVariableSetter);
    segmentGroupMap.forEach((segmentGroup) => {
      const inputSegmentGroup = inputSegmentGroups.get(segmentGroup.id);
      segmentGroup.member.forEach((member) => {
        if (MessageElementType.isBoundary(member.type)) {
          const memberSegmentGroup = inputSegmentGroups.get(member.id);
          inputSegmentGroup.addChild(memberSegmentGroup);
          return;
        }

        if (MessageElementType.isVertex(member.type)) {
          const memberSegment = inputSegments.get(member.id);
          inputSegmentGroup.addChild(memberSegment);
          return;
        }

        console.log(`unknown message element type: ${member.type}`);
      });
    });
    // const inputMessageElements = new Map([...inputSegmentGroups, ...inputSegments]);
    const inputMessageRoot = inputSegmentGroups.get(root.id);
    return { inputMessageRoot, inputSegments };
  }

  _makeInputSegmentGroupMap(segmentGroupIndexMap, bizVariableSetter) {
    const inputSegmentGroupMap = new Map();
    segmentGroupIndexMap.forEach((info, id) => {
      const inputSegmentGroup = bizVariableSetter.createInputSegmentGroup(info.name, info.index);
      inputSegmentGroupMap.set(id, inputSegmentGroup);
    });
    return inputSegmentGroupMap;
  }

  _makeInputSegments(segmentMap, segmentGroupMap, bizVariableSetter) {
    const inputSegments = new Map();
    segmentMap.forEach((segment) => {
      const segmentGroup = segmentGroupMap.get(segment.parent);
      const segmentIndex = segmentGroup.member.findIndex(e => e.id === segment.id);
      const inputSegment = bizVariableSetter.createInputSegment(segment.vertexType, segmentIndex);
      inputSegments.set(segment.id, inputSegment);
    });
    return inputSegments;
  }
}

module.exports = InputMessageStructure;
