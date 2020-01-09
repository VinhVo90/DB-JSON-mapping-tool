import _ from 'lodash';
import { getCoorMouseClickRelativeToParent, checkModePermission, filterPropertyData } from '../../../common/utilities/common.util';

class MainMenuSegment {
  constructor(props) {
    this.selector = props.selector;
    this.containerId = props.containerId;
    this.parent = props.parent;
    this.viewMode = props.viewMode;
    this.vertexDefinition = props.vertexDefinition;

    this.initMainMenu();
  }

  initMainMenu() {
    // Main menu config
    $.contextMenu({
      selector: this.selector,
      autoHide: true,
      zIndex: 100,
      build: () => ({
        callback: (key, options) => {
          switch (key) {
            case 'createNew':
              const params = {
                x: options.x,
                y: options.y,
                groupType: this.vertexDefinition.vertexGroup[0].groupType,
                data: {},
              };
              this.parent.segmentMgmt.makePopupEditVertex(params);
              break;

            case 'showReduced':
              this.parent.isShowReduced ? this.parent.showFull() : this.parent.showReduced();
              break;

            case 'sort':
              this.parent.sortByName();
              break;

            default:
              break;
          }
        },
        items: {
          createNew: this.makeCreateNewOption(),
          sep1: '-',
          find: {
            name: 'Find...',
            type: 'sub',
            icon: 'fa-search',
            items: checkModePermission(this.viewMode.value, 'find') ? this.loadItems() : {},
            disabled: !checkModePermission(this.viewMode.value, 'find'),
          },
          sep2: '-',
          showReduced: {
            name: this.parent.isShowReduced ? 'Show Full' : 'Show Reduced',
            icon: 'fa-link',
            disabled: !checkModePermission(this.viewMode.value, 'showReduced'),
          },
          sep3: '-',
          sort: {
            name: 'Sort',
            icon: 'fa-sort',
          },
        },
        events: {
          show: (opt) => {
            if (!event) { return; }

            const { x, y } = getCoorMouseClickRelativeToParent(event, this.containerId);
            opt.x = x;
            opt.y = y;
            opt.isMenu = true;
            this.opt = opt;
          },
        },
      }),
    });
  }

  /**
   * Generate verties from array vertexTypes
   */
  loadItems() {
    const subItems = {};
    subItems.isHtmlItem = {
      placeholder: 'Type to search',
      type: 'text',
      value: '',
      events: {
        keyup: this.searchVertexType(),
      },
    };
    subItems.sep4 = '-';
    // Build options
    const options = {};

    // Sort array object
    const vertices = filterPropertyData(this.parent.dataContainer.vertex, [], ['dataContainer']);

    vertices.sort((a, b) => (a.vertexType.toUpperCase()).localeCompare((b.vertexType.toUpperCase())));

    const len = vertices.length;
    for (let i = 0; i < len; i += 1) {
      const type = vertices[i].vertexType;
      options[`${type}`] = type;
    }

    subItems.select = {
      type: 'select',
      size: 10,
      options,
      events: {
        dblclick: this.onSelectVertex(this),
      },
      events2: {
        enter: this.onSelectVertex(this),
      },
    };

    const dfd = jQuery.Deferred();
    setTimeout(() => {
      dfd.resolve(subItems);
    }, 10);
    return dfd.promise();
  }

  searchVertexType() {
    return function () {
      const filter = this.value.toUpperCase();
      const $select = $(this).closest('ul').find('select');
      const options = $select.find('option');

      // Remove first li cause it is input search
      const length = options.length;
      for (let i = 0; i < length; i += 1) {
        const element = options[i];
        const value = $(element).val();
        if (value.toUpperCase().indexOf(filter) > -1) {
          $(element).css('display', '');
        } else {
          $(element).css('display', 'none');
        }
      }

      $select[0].selectedIndex = -1;
      $select[0].value = '';
    };
  }

  onSelectVertex(main) {
    return function () {
      const vertex = _.find(main.parent.dataContainer.vertex, { vertexType: this.value });

      if (vertex) {
        vertex.showToUser();
      }
    };
  }

  /**
   * Submenu for Create New option
   */
  loadGroupTypeItems() {
    const subItems = {};
    subItems.isHtmlItem = {
      placeholder: 'Type to search',
      type: 'text',
      value: '',
      events: {
        keyup: this.searchVertexType(),
      },
    };
    subItems.sep4 = '-';
    // Build options
    const options = {};

    // Sort array object
    const vertexGroup = _.cloneDeep(this.vertexDefinition.vertexGroup);

    vertexGroup.sort((a, b) => (a.groupType.toUpperCase()).localeCompare((b.groupType.toUpperCase())));

    const len = vertexGroup.length;
    for (let i = 0; i < len; i += 1) {
      const groupType = vertexGroup[i].groupType;
      options[`${groupType}`] = groupType;
    }

    subItems.select = {
      type: 'select',
      size: 10,
      options,
      events: {
        dblclick: this.onSelectGroupType(this),
      },
      events2: {
        enter: this.onSelectGroupType(this),
      },
    };

    const dfd = jQuery.Deferred();
    setTimeout(() => {
      dfd.resolve(subItems);
    }, 10);
    return dfd.promise();
  }

  onSelectGroupType(main) {
    return function () {
      const params = {
        x: main.opt.x,
        y: main.opt.y,
        groupType: this.value,
        data: {},
      };
      main.parent.segmentMgmt.makePopupEditVertex(params);
      $(`${main.selector}`).contextMenu('hide');
    };
  }

  makeCreateNewOption() {
    if (this.vertexDefinition.vertexGroup.length > 1) {
      return {
        name: 'Create New',
        type: 'sub',
        icon: 'fa-window-maximize',
        items: this.loadGroupTypeItems(),
        disabled: !checkModePermission(this.viewMode.value, 'createNew'),
      };
    }
    return {
      name: 'Create New',
      icon: 'fa-window-maximize',
      disabled: !checkModePermission(this.viewMode.value, 'createNew'),
    };
  }
}

export default MainMenuSegment;
