import _ from 'lodash';
import { getCoorMouseClickRelativeToParent, checkModePermission } from '../../../common/utilities/common.util';
import State from '../../../common/new-type-define/state';

class MainMenu {
  constructor(props) {
    this.selector = props.selector;
    this.containerId = props.containerId;
    this.parent = props.parent;
    this.vertexDefinition = props.vertexDefinition;
    this.viewMode = props.viewMode;
    this.history = props.history;

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
            case 'createVertex':
              const params = {
                x: options.x,
                y: options.y,
                groupType: 'DBJSON',
                data: {},
              };
              this.parent.editPopup = false;
              this.parent.makePopupEditVertex(params);
              break;

            case 'clearAll':
              const state = new State();
              this.parent.edgeMgmt.clearAll(state);
              this.parent.clearAll(state);

              if (this.history) {
                this.history.add(state);
              }
              break;

            case 'showReduced':
              this.parent.mainParent.isShowReduced ? this.parent.mainParent.showFull() : this.parent.mainParent.showReduced();
              break;

            default:
              break;
          }
        },
        items: {
          createVertex: {
            name: 'Create New',
            icon: 'fa-window-maximize',
            disabled: !checkModePermission(this.viewMode.value, 'createVertex'),
          },
          sep1: '-',
          clearAll: {
            name: 'Clear All',
            icon: 'fa-times',
            disabled: !checkModePermission(this.viewMode.value, 'clearAll'),
          },
          sep2: '-',
          showReduced: {
            name: this.parent.mainParent.isShowReduced ? 'Show Full' : 'Show Reduced',
            icon: 'fa-link',
            disabled: !checkModePermission(this.viewMode.value, 'showReduced'),
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
    const options = {};
    // Build options
    if (this.vertexDefinition.vertex && Array.isArray(this.vertexDefinition.vertex)) {
      let vertices = this.vertexDefinition.vertex;
      // Sort array object
      vertices = _.orderBy(vertices, ['vertexType'], ['asc']);
      const len = vertices.length;
      for (let i = 0; i < len; i += 1) {
        const type = vertices[i].vertexType;
        options[`${type}`] = type;
      }
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

  onSelectVertex(self) {
    return function () {
      if (this.selectedIndex === -1) return;

      const params = {
        x: self.opt.x,
        y: self.opt.y,
        isMenu: self.opt.isMenu,
        vertexType: this.value,
      };

      self.parent.createVertex(params);
      $(`${self.selector}`).contextMenu('hide');
    };
  }
}

export default MainMenu;
