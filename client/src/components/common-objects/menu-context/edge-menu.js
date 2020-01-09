import _ from 'lodash';

import State from '../../../common/new-type-define/state';
import HistoryElement from '../../../common/new-type-define/historyElement';
import { ACTION_TYPE } from '../../../common/const';

class EdgeMenu {
  constructor(props) {
    this.dataContainer = props.dataContainer; // a reference to dataContain of Edge
    this.selector = props.selector;
    this.edgeMgmt = props.edgeMgmt;
    this.history = props.history;
    this.initEdgeMenu();
    this.selectedEdge = null;

    this.oldEdge = null;
    this.isRemoved = false;
  }

  initEdgeMenu() {
    // Context menu for Edge
    $.contextMenu({
      selector: this.selector,
      delay: 300,
      zIndex: 100,
      build: () => ({
        callback: (key, options) => {
          switch (key) {
            case 'removeEdge':
              this.isRemoved = true;

              const state = new State();
              this.selectedEdge.remove(state);
              if (this.history) {
                this.history.add(state);
              }
              break;

            default:
              break;
          }
        },
        items: {
          originNote: {
            type: 'text',
            value: '',
            placeholder: 'Origin note',
            events: {
              keyup: this.onNoteChanged(this, 'originNote'),
            },
          },
          middleNote: {
            type: 'text',
            value: '',
            placeholder: 'Middle note',
            events: {
              keyup: this.onNoteChanged(this, 'middleNote'),
            },
          },
          destNote: {
            type: 'text',
            value: '',
            placeholder: 'Destination note',
            events: {
              keyup: this.onNoteChanged(this, 'destNote'),
            },
          },
          lineType: {
            type: 'select',
            options: { S: 'Solid', D: 'Dash' },
            events: {
              change: this.onLineTypeChanged(this),
            },
          },
          useMarker: {
            type: 'select',
            options: { Y: 'Arrow', N: 'None' },
            events: {
              change: this.onUseMarkerChanged(this),
            },
          },
          removeEdge: {
            name: 'Delete',
            icon: 'fa-times',
          },
        },
        events: {
          show: (opt) => {
            this.oldEdge = null;
            this.isRemoved = false;
            // Get edge notes
            const edgeId = opt.$trigger.attr('ref');
            this.selectedEdge = _.find(this.dataContainer.edge, { id: edgeId });
            this.oldEdge = this.selectedEdge.getObjectInfo();
            this.edgeMgmt.handlerOnClickEdge(this.selectedEdge);
            $.contextMenu.setInputValues(opt, this.selectedEdge);
          },
          hide: (opt) => {
            if (!this.isRemoved && this.history) {
              const state = new State();
              const he = new HistoryElement();
              he.actionType = ACTION_TYPE.UPDATE_INFO;
              he.oldObject = this.oldEdge;
              he.dataObject = this.selectedEdge.getObjectInfo();
              he.realObject = this.selectedEdge;

              state.add(he);
              this.history.add(state);
            }
          },
        },
      }),
    });
  }

  onNoteChanged(main, targetNote) {
    return function () {
      main.selectedEdge.setNote(this.value, targetNote);
    };
  }

  onLineTypeChanged(main) {
    return function () {
      main.selectedEdge.setLineType(this.value);
    };
  }

  onUseMarkerChanged(main) {
    return function () {
      main.selectedEdge.setUseMarker(this.value);
    };
  }
}

export default EdgeMenu;
