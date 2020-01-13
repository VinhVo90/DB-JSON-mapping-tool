import _ from 'lodash';
import { checkModePermission } from '../../../common/utilities/common.util';

class VertexMenu {
  constructor(props) {
    this.selector = props.selector;
    this.vertexMgmt = props.vertexMgmt;
    this.dataContainer = props.dataContainer;
    this.viewMode = props.viewMode;
    this.initVertexMenu();
  }

  initVertexMenu() {
    $.contextMenu({
      selector: this.selector,
      zIndex: 100,
      build: () => ({
        callback: (key, options) => {
          const vertexId = options.$trigger.attr('id');
          const vertexObj = _.find(this.dataContainer.vertex, { id: vertexId });
          switch (key) {
            case 'editVertex':
              this.vertexMgmt.editPopup = true;
              this.vertexMgmt.makePopupEditVertex(vertexId);
              break;

            case 'copyVertex':
              vertexObj.copy();
              break;

            case 'removeVertex':
              vertexObj.remove();
              break;

            default:
              break;
          }
        },
        items: {
          editVertex: {
            name: 'Edit Vertex Info',
            icon: 'fa-pencil-square-o',
            disabled: !checkModePermission(this.viewMode.value, 'editVertex'),
          },
          copyVertex: {
            name: 'Copy',
            icon: 'fa-files-o',
            disabled: !checkModePermission(this.viewMode.value, 'copyVertex'),
          },
          removeVertex: {
            name: 'Delete',
            icon: 'fa-times',
            disabled: !checkModePermission(this.viewMode.value, 'removeVertex'),
          },
        },
      }),
    });
  }
}

export default VertexMenu;
