const Branch = require('./branch');
const MessageElementType = require('./message/message_element_type');

/**
 * @class
 * A class that converter to messageStructre to Jstree.
 */
class JsTreeItemConverter {
  constructor() {
    this._rootId = '#';
    this._treeItems = [];
    this._messageElementMap = new Map();
  }

  /**
  *
  * @param {Object} messageStructure
  * convert messageStructure to Jstree.
  */
  convert(messageStructure) {
    if (
      MessageElementType.isNotSegmentGroup(messageStructure.elementType)
      && MessageElementType.isNotSegment(messageStructure.elementType)
      && MessageElementType.isNotDataElement(messageStructure.elementType)
    ) {
      return null;
    }

    this._treeItems.length = 0;
    this._messageElementMap.clear();
    const root = new Branch(messageStructure.id, this._rootId, `${messageStructure.name}[${messageStructure.order}/${messageStructure.spec.maxRepeat}]`);

    this._treeItems.push(root);
    this._messageElementMap.set(messageStructure.id, messageStructure);
    messageStructure.children.forEach((child) => {
      if (MessageElementType.isSegmentGroup(child.elementType)) {
        this._makeMessageSegmentGroupBranch(child, messageStructure.id);
        return;
      }

      if (MessageElementType.isSegment(child.elementType)) {
        this._makeMessageSegmentBranch(child, messageStructure.id);
        return;
      }

      this._makeMessageDataElementBranch(child, messageStructure.id);
    });

    const hasSameParentBranchMap = this._createHasSameParentBranchMap();
    const sameNameBranchMap = this._createSameNameBranchMap(hasSameParentBranchMap);
    this._createGroupBranch(sameNameBranchMap);

    return {
      treeItems: this._treeItems,
      itemMap: this._messageElementMap,
    };
  }

  _makeMessageSegmentGroupBranch(messageSegmentGroup, parentId) {
    if (!this._messageElementMap.get(messageSegmentGroup.id)) {
      const branchName = `${messageSegmentGroup.name}[${messageSegmentGroup.order}/${messageSegmentGroup.existingCount !== -1 ? messageSegmentGroup.existingCount : messageSegmentGroup.spec.maxRepeat}]`;
      const branch = new Branch(messageSegmentGroup.id, parentId, branchName);
      branch.type = 'SEGMENT_GROUP';
      this._treeItems.push(branch);
      this._messageElementMap.set(messageSegmentGroup.id, messageSegmentGroup);
    }

    const childrenElement = messageSegmentGroup.children;
    if (Array.isArray(childrenElement)) {
      childrenElement.forEach((element) => {
        if (MessageElementType.isSegmentGroup(element.elementType)) {
          this._makeMessageSegmentGroupBranch(element, messageSegmentGroup.id);
          return;
        }
        if (MessageElementType.isSegment(element.elementType)) {
          this._makeMessageSegmentBranch(element, messageSegmentGroup.id);
        }
      });
    }
  }

  _makeMessageSegmentBranch(messageSegment, parentId) {
    let branch;
    const messageSegmentId = `${messageSegment.id}`;
    if (!this._messageElementMap.get(messageSegmentId)) {
      const branchName = `${messageSegment.name}[${messageSegment.order}/${messageSegment.spec.maxRepeat}]`;
      branch = new Branch(messageSegmentId, parentId, branchName);
      branch.type = 'SEGMENT';
      if (branch.parent === '') {
        branch.parent = this._rootId;
      }
    }
    this._treeItems.push(branch);
    this._messageElementMap.set(messageSegmentId, messageSegment);
  }

  _makeMessageDataElementBranch(dataSpecs, parentId) {
    if (dataSpecs.length > 1) {
      dataSpecs.forEach((eachDataSpec, index) => {
        const id = `${parentId}-${index}`;
        const branch = new Branch(id, parentId, eachDataSpec.name);
        branch.type = 'DATA_ELEMENT';
        this._treeItems.push(branch);
        this._messageElementMap.set(id, dataSpecs[index]);
      });
      return;
    }

    const id = `${parentId}-${dataSpecs[0].spec.name}`;
    const branch = new Branch(id, parentId, dataSpecs[0].name);
    branch.type = 'DATA_ELEMENT';
    this._treeItems.push(branch);
    this._messageElementMap.set(id, [dataSpecs[0], dataSpecs[0].value]);
  }

  _createHasSameParentBranchMap() {
    const hasSameParentBranchMap = new Map();
    this._treeItems.forEach((branch) => {
      if (branch.parent === '#') { // root
        return;
      }

      if (branch.type !== 'SEGMENT_GROUP') { // segmentGroup
        return;
      }

      if (!hasSameParentBranchMap.has(branch.parent)) {
        const newSegmentGroupBranches = [];
        newSegmentGroupBranches.push(branch);
        hasSameParentBranchMap.set(branch.parent, newSegmentGroupBranches);
      } else {
        const ExistSegmentGroupBranches = hasSameParentBranchMap.get(branch.parent);
        ExistSegmentGroupBranches.push(branch);
        hasSameParentBranchMap.set(branch.parent, ExistSegmentGroupBranches);
      }
    });

    return hasSameParentBranchMap;
  }

  _createSameNameBranchMap(map) {
    const mapIter = map.entries();
    let keyValue = mapIter.next().value;
    const sameNameBranchMap = new Map();
    while (keyValue) {
      const branches = keyValue[1];
      branches.forEach((branch) => {
        const branchNameRegex = new RegExp(/\.*#\d+$/, 'g');
        const branchName = branch.id.replace(branchNameRegex, '');
        if (!sameNameBranchMap.get(branchName)) {
          const newBranches = [];
          newBranches.push(branch);

          sameNameBranchMap.set(branchName, newBranches);
        } else {
          const existBranches = sameNameBranchMap.get(branchName);
          existBranches.push(branch);

          sameNameBranchMap.set(branchName, existBranches);
        }
      });

      keyValue = mapIter.next().value;
    }

    return sameNameBranchMap;
  }

  _createGroupBranch(map) {
    const mapIter = map.entries();
    let keyValue = mapIter.next().value;
    while (keyValue) {
      const [groupId, branches] = keyValue;
      if (branches.length < 2) {
        keyValue = mapIter.next().value;
        continue;
      }

      const newBranch = new Branch(`G|${groupId}`, branches[0].parent, `${branches[0].text}`);
      const processedMap = this._pushBranchToTreeItems(newBranch);
      this._setGroupText(processedMap);
      branches.forEach((branch) => {
        branch.parent = newBranch.id;
      });
      keyValue = mapIter.next().value;
    }
  }

  _pushBranchToTreeItems(branch) {
    const processedMap = new Map();
    this._treeItems.forEach((item, index) => {
      if (item.type !== 'SEGMENT_GROUP') {
        return;
      }

      const groupPrefixRemovedId = branch.id.slice(2);
      const idRegex = new RegExp(/\.*#\d+$/, 'g');
      const lastGroupOrderRemovedId = item.id.replace(idRegex, '');
      if (groupPrefixRemovedId !== lastGroupOrderRemovedId) {
        return;
      }

      if (processedMap.get(lastGroupOrderRemovedId)) {
        let counter = processedMap.get(lastGroupOrderRemovedId).counter;
        counter += 1;
        processedMap.set(lastGroupOrderRemovedId, { branch, counter });
        return;
      }

      this._treeItems.splice(index, 0, branch);
      processedMap.set(lastGroupOrderRemovedId, { branch, counter: 0 });
    });

    return processedMap;
  }

  _setGroupText(processedMap) {
    const mapIter = processedMap.entries();
    let keyValue = mapIter.next().value;
    while (keyValue) {
      const [groupId, branchAndCounter] = keyValue;
      const counterRegex = new RegExp(/(\[)(\d+)(\/\d+\])/, 'g');
      branchAndCounter.branch.text = (branchAndCounter.branch.text).replace(counterRegex, `$1${branchAndCounter.counter}$3`);
      keyValue = mapIter.next().value;
    }
  }
}

module.exports = JsTreeItemConverter;
