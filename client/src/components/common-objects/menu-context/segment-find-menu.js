import _ from 'lodash';
import { filterPropertyData } from '../../../common/utilities/common.util';

class SegmentFindMenu {
  constructor(props) {
    this.selector = props.selector;
    this.dataContainer = props.dataContainer;

    this.initMainMenu();
  }

  initMainMenu() {
    $.contextMenu({
      selector: this.selector,
      autoHide: true,
      zIndex: 100,
      build: () => ({
        callback: (key, options) => {
          switch (key) {
            default:
              break;
          }
        },
        items: {
          findBox: {
            placeholder: 'Type to search',
            type: 'text',
            value: '',
            events: {
              keyup: this.searchVertexType(),
            },
          },

          sep1: '-',

          selectBox: {
            type: 'select',
            size: 10,
            options: this.createMenuOptions(),
            events: {
              dblclick: this.onSelectVertex(this),
            },
            events2: {
              enter: this.onSelectVertex(this),
            },
          },
        },
        events: {
          show: (opt) => {
          },
        },
      }),
    });
  }

  searchVertexType() {
    return function () {
      const filter = this.value.toUpperCase();
      const $select = $(this).closest('ul').find('select');
      const options = $select.find('option');

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
      const vertex = _.find(main.dataContainer.vertex, { vertexType: this.value });

      if (vertex) {
        vertex.showToUser();
      }
    };
  }

  createMenuOptions() {
    const options = {};

    const vertices = filterPropertyData(this.dataContainer.vertex, [], ['dataContainer']);
    vertices.sort((a, b) => (a.vertexType.toUpperCase()).localeCompare((b.vertexType.toUpperCase())));

    const len = vertices.length;
    for (let i = 0; i < len; i += 1) {
      const type = vertices[i].vertexType;
      options[`${type}`] = type;
    }

    return options;
  }
}

export default SegmentFindMenu;
