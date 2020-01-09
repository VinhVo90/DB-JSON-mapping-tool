class MessageElementType {
  static isVertex(type) {
    return type === 'V';
  }

  static isBoundary(type) {
    return type === 'B';
  }
}

class SegmentGroupUtil {
  constructor(name, memberIds) {
    this._name = name;
    this._memberIds = memberIds || [];
    this._index = 0;
  }

  getMemberIdInfo() {
    if (this._index >= this._memberIds.length) {
      return null;
    }

    const currentMemberIdInfo = this._memberIds[this._index];
    this._index += 1;
    return currentMemberIdInfo;
  }
}

class IdMap {
  static from(list) {
    const map = new Map();
    list.forEach((element) => {
      map.set(element.id, element);
    });
    return map;
  }
}

class SegmentGroupIndexMap {
  static make(segmentGroupMap) {
    const segmentGroupIndexMap = new Map();
    const root = this._findRoot(segmentGroupMap);
    if (root === undefined) {
      return segmentGroupIndexMap;
    }

    let segmentGroupIndex = 0;
    segmentGroupIndexMap.set(root.id, { name: root.name, index: segmentGroupIndex });
    segmentGroupIndex += 1;

    const segmentGroupStack = [];
    segmentGroupStack.push(new SegmentGroupUtil(root.name, root.member));

    while (segmentGroupStack.length > 0) {
      const currentGroup = segmentGroupStack[segmentGroupStack.length - 1];
      let currentMemberIdInfo = currentGroup.getMemberIdInfo();
      if (currentMemberIdInfo === null) {
        segmentGroupStack.pop();
        continue;
      }

      while (currentMemberIdInfo !== null) {
        if (MessageElementType.isBoundary(currentMemberIdInfo.type)) {
          const segmentGroupId = currentMemberIdInfo.id;
          const segmentGroupName = segmentGroupMap.get(segmentGroupId).name;
          segmentGroupIndexMap.set(segmentGroupId, { name: segmentGroupName, index: segmentGroupIndex });
          segmentGroupIndex += 1;

          const { name, member } = segmentGroupMap.get(segmentGroupId);
          segmentGroupStack.push(new SegmentGroupUtil(name, member));
          break;
        }

        if (MessageElementType.isVertex(currentMemberIdInfo.type)) {
          currentMemberIdInfo = currentGroup.getMemberIdInfo();
          if (currentMemberIdInfo === null) {
            segmentGroupStack.pop();
          }
          continue;
        }

        console.log(`unknown message element type: ${currentMemberIdInfo.type}`);
      }
    }
    return { root, segmentGroupIndexMap };
  }

  static _findRoot(segmentGroupMap) {
    return [...segmentGroupMap.values()].find(e => e.parent === null);
  }
}

module.exports = {
  MessageElementType,
  SegmentGroupIndexMap,
  IdMap,
};
