import SampleMessageViewer from './lib/sample_message_viewer';
import PopUtils from '../../common/utilities/popup.util';
import { comShowMessage, initDialogDragEvent, hideFileChooser } from '../../common/utilities/common.util';

class CltSampleMessageViewer {
  constructor(props) {
    this.specFile = '';
    this.sampleFile = '';
    this.messageGroupType = '';
    this.messageElement = null;
    this.main = new SampleMessageViewer();
    this.parent = props.parent;
    this.isNodeOpenedByFunction = false;
    this.errorLogContent = '';

    this.bindMainEvent();
    this.bindEventForPopup();
  }

  bindMainEvent() {
    $('#btnLoad').click(() => {
      this.loadData();
    });

    $('#btnShowInvalidSegment').click(() => {
      this.showInvalidSegmentOnTreeView();
    });

    $('#btnShowErrorLog').click(() => {
      this.showErrorLog();
    });

    $('#btnEditSample').click((event) => {
      this.editSampleClickEvent();
    });

    $('#btnViewFullText').click(() => {
      this.viewFullText();
    });

    $('#jstree').bind('loaded.jstree', (e, data) => {
      $('#jstree').jstree('close_all');
      this.showInvalidSegmentOnTreeView();
    });

    $('#jstree').on('open_node.jstree', (e, data) => {
      if (!this.isNodeOpenedByFunction) {
        const main = this;
        $(e.target).find('.jstree-leaf').each(function () {
          if (!main.validateSegment(this.id)) {
            main.showWarningColorToSegmentOnTreeView(this.id);
          }
        });
      }
    });

    $(window).resize(() => {
      this.calculateTableSize();
    });

    (function ($) {
      $.fn.hasVerticalScrollBar = function () {
        return this.get(0).scrollHeight > this.height();
      };
    }(jQuery));
  }

  bindEventForPopup() {
    $('#btnExport').click(() => {
      this.export();
    });

    $('#btnPopupClose').click(() => {
      const options = { popupId: 'popupFullText' };
      PopUtils.metClosePopup(options);
    });

    // Prevent refresh page after pressing enter on form control (Edit popup)
    $('form').submit(() => false);

    // Enable dragging for popup
    initDialogDragEvent('popupFullText');
  }

  loadSpecFile(data) {
    if (!this.isSpecData(data)) return false;

    this.specFile = data;

    return true;
  }

  loadSampleFile(data) {
    this.sampleFile = data;
  }

  loadData() {
    if (this.specFile === '' || this.sampleFile === '') return;

    if (!this.isSpecData(this.specFile)) {
      return;
    }

    const messageGroupType = $('#messageGroupType').val();

    this.main._jsTree = null;
    const result = this.main.makeTree(this.specFile, this.sampleFile, messageGroupType);
    // Load data failed
    if (result && result.length > 0 && !result[0].isValid()) {
      const regex = /(Symbol\()(.*)(\))/;
      const errorType = regex.exec(result[0].resultType.toString());
      $.notify({
        message: `[Failed] ${errorType[2]}!`,
      }, {
        type: 'danger',
      });
    }

    // Clear screen
    $('#btnShowInvalidSegment').hide();
    $('#btnShowErrorLog').hide();
    $('#btnEditSample').hide();
    $('#btnViewFullText').hide();
    $('#tableContent').hide();
    $('#tableContent').empty();
    $('#jstree').jstree('destroy');

    // Print error message if existed
    this.makeErrorLogContent(result);

    // reload tree view
    $('#jstree').jstree({
      core: {
        data: this.main._jsTree,
      },
    });

    this.treeNodeClickEvent();

    hideFileChooser();
  }

  viewFullText() {
    hideFileChooser();

    if (this.sampleFile === '') return;
    $('#popupContent')[0].innerHTML = '';

    $('#btnExport').show();

    const fullText = this.main.getAssembledMessage('\n');
    $('#popupContent')[0].innerHTML = fullText.join('');

    const options = {
      popupId: 'popupFullText',
      title: 'Message content',
      position: 'center',
      width: ((window.innerWidth / 3) * 2) < 500 ? 500 : ((window.innerWidth / 3) * 2),
    };

    PopUtils.metSetShowPopup(options);
  }

  showErrorLog() {
    hideFileChooser();

    $('#popupContent')[0].innerHTML = this.errorLogContent === '' ? 'There is no error.' : this.errorLogContent;

    $('#btnExport').hide();

    const options = {
      popupId: 'popupFullText',
      title: 'Error logs',
      position: 'center',
      width: 600,
    };

    PopUtils.metSetShowPopup(options);
  }

  treeNodeClickEvent() {
    $('#jstree').on('changed.jstree', (e, data) => {
      const id = (data.instance.get_node(data.selected).id);
      const nodeDetail = this.main.getDetail(id);

      if (nodeDetail.constructor.name === 'MessageSegment') {
        this.messageElement = nodeDetail;


        $('#btnShowInvalidSegment').show();
        $('#btnShowErrorLog').show();
        $('#btnEditSample').show();
        $('#btnViewFullText').show();

        $('#tableContent').show();
        $('#tableContent').empty();

        const $header = $('<thead>');
        const $row = $('<tr>');
        $row.append('<th class="col_header" >NAME</th>')
          .append('<th class="col_header" >TYPE</th>')
          .append('<th class="col_header" >USAGE</th>')
          .append('<th class="col_header" >FORMAT</th>')
          .append('<th class="col_header" >DESCRIPTION</th>')
          .append('<th class="col_header" >VALUE</th>');

        $header.append($row);
        $('#tableContent').append($header);

        this.printMessageElement();
      }
    });
  }

  editSampleClickEvent() {
    this.setMessageElement();
    const result = this.main.reMatch(this.main._messageStructure);
    this.makeErrorLogContent(result);
    this.showInvalidSegmentOnTreeView();
    this.hideAllInsideButton();

    if (result) {
      if (result.length > 0 && !result[0].isValid()) {
        const regex = /(Symbol\()(.*)(\))/;
        const errorType = regex.exec(result[0].resultType.toString());
        $.notify({
          message: `[Failed] ${errorType[2]}!`,
        }, {
          type: 'danger',
        });
      } else {
        $.notify({
          message: 'Applied!',
        }, {
          type: 'success',
        });
      }
    }
  }

  printMessageElement() {
    let seqTextBox = 0;
    const $body = $('<tbody>');
    this.messageElement.spec.dataElements.forEach((eachDataElement) => {
      let elementDataExist = false;
      this.messageElement._children.forEach((eachMessageDataElements) => {
        eachMessageDataElements.forEach((eachMessageDataElement) => {
          if (
            eachMessageDataElement.name === eachDataElement.name
						&& eachMessageDataElement.spec.id === eachDataElement.id
          ) {
            eachMessageDataElement.whiteSpace = eachMessageDataElement.value.length - eachMessageDataElement.value.trim().length;

            const inputId = `editValue${seqTextBox}`;

            const $row = $('<tr>');
            $row.append(`<td>${eachDataElement.name}</td>`)
              .append(`<td>${eachDataElement.type}</td>`)
              .append(`<td>${eachDataElement.mandatory}</td>`)
              .append(`<td>${eachDataElement.format}</td>`)
              .append(`<td>${eachDataElement.description}</td>`)
              .append(`<td ><div class="edit-value-group value-group">
                              <input type="text" class="form-control edit-value-input" id="${inputId}" value="${eachMessageDataElement.value.trim()}" formatvalue="${eachDataElement.format}">
                              <span class="input-group-btn">
                                <button class="btn btn-default btn-inside" title="Apply change">
                                  <i class="fa fa-check" aria-hidden="true"></i>
                                </button>
                              </span>
                            </div>
                      </td>`);

            $body.append($row);

            elementDataExist = true;
          }
          seqTextBox += 1;
        });
        seqTextBox += 1;
      });

      if (!elementDataExist) {
        const $row = $('<tr>')
          .append(`<td>${eachDataElement.name}</td>`)
          .append(`<td>${eachDataElement.type}</td>`)
          .append(`<td>${eachDataElement.mandatory}</td>`)
          .append(`<td>${eachDataElement.format}</td>`)
          .append(`<td>${eachDataElement.description}</td>`)
          .append('<td></td>');

        $body.append($row);
      }
      seqTextBox += 1;
    });

    $('#tableContent').append($body);

    const main = this;
    $('.edit-value-input').each(function () {
      // validate when loading segment info
      main.doValidateByFormat(this.id, this.value, $(this).attr('formatvalue'));
    });

    $('.edit-value-input').keyup(function (event) {
      if (main.isValueChanged(this.id)) {
        main.visibleInsideButton(this.id, true);
      } else {
        main.visibleInsideButton(this.id, false);
      }

      main.doValidateByFormat(this.id, this.value, $(this).attr('formatvalue'));
    });

    $('.btn-inside').click(function () {
      if (main.setSpecifyMessageElement($(this).closest('td').find('input')[0].id)) {
        main.visibleInsideButton($(this).closest('td').find('input')[0].id, false);
        main.showInvalidSegmentOnTreeView();
      }
    });

    this.calculateTableSize();

    this.setHeaderWidth();

    this.initTableScrollEvent();
  }

  setMessageElement(defaultValue = true) {
    let seqTextBox = 0;
    this.messageElement.spec.dataElements.forEach((eachDataElement) => {
      this.messageElement._children.forEach((eachMessageDataElements) => {
        eachMessageDataElements.forEach((eachMessageDataElement) => {
          if (eachMessageDataElement.name === eachDataElement.name && eachMessageDataElement.spec.id === eachDataElement.id) {
            const eachMessageDataElementSpecLength = Number(eachMessageDataElement.spec.format.match(/\d+/i));
            if ($('#messageGroupType').val() === 'FIXEDLENGTH') {
              eachMessageDataElement.whiteSpace = eachMessageDataElementSpecLength - $(`#editValue${seqTextBox}`).val().length;
            }
            if (eachMessageDataElement.whiteSpace < 0) {
              eachMessageDataElement.whiteSpace = 0;
            }
            eachMessageDataElement.value = $(`#editValue${seqTextBox}`).val() + ' '.repeat(Number(eachMessageDataElement.whiteSpace));
            eachMessageDataElement.matchResult = defaultValue;
          }
          seqTextBox += 1;
        });
        seqTextBox += 1;
      });
      seqTextBox += 1;
    });
  }

  setSpecifyMessageElement(inputValueId) {
    const segmentDetail = this.messageElement;
    let seqTextBox = 0;
    if (segmentDetail.constructor.name === 'MessageSegment') {
      for (let i = 0; i < segmentDetail.spec.dataElements.length; i += 1) {
        const eachStructDataElement = segmentDetail.spec.dataElements[i];

        for (let j = 0; j < segmentDetail._children.length; j += 1) {
          const sampleCompositeDataElement = segmentDetail._children[j];

          for (let k = 0; k < sampleCompositeDataElement.length; k += 1) {
            const eachSampleDataElement = sampleCompositeDataElement[k];

            if (eachSampleDataElement.name === eachStructDataElement.name && eachSampleDataElement.spec.id === eachStructDataElement.id && inputValueId === `editValue${seqTextBox}`) {
              const eachMessageDataElementSpecLength = Number(eachSampleDataElement.spec.format.match(/\d+/i));
              if ($('#messageGroupType').val() === 'FIXEDLENGTH') {
                eachSampleDataElement.whiteSpace = eachMessageDataElementSpecLength - $(`#editValue${seqTextBox}`).val().length;
              }
              if (eachSampleDataElement.whiteSpace < 0) {
                eachSampleDataElement.whiteSpace = 0;
              }
              eachSampleDataElement.value = $(`#editValue${seqTextBox}`).val() + ' '.repeat(Number(eachSampleDataElement.whiteSpace));
              eachSampleDataElement.matchResult = true;

              const result = this.main.reMatch(this.main._messageStructure);
              this.makeErrorLogContent(result);
              return true;
            }
            seqTextBox += 1;
          }
          seqTextBox += 1;
        }
        seqTextBox += 1;
      }
    }

    return false;
  }

  makeErrorLogContent(results) {
    if (!results || results.length === 0) {
      this.errorLogContent = '';
      return;
    }

    if (results) {
      $('#desc').html('');
      this.errorLogContent = '';
      results.forEach((result) => {
        this.errorLogContent += `ERROR MESSAGE: ${result._desc}\n`;
      });
    }
  }

  validateByFormat(string = '', format = 'AN999') {
    if (string === '') {
      return true;
    }

    if (!format) {
      return true;
    }

    const normalizedFormat = format.trim().toUpperCase();
    const regex = /([AN]{1,2})(\d+)/;
    const matched = normalizedFormat.match(regex);
    if (matched === null) {
      return true;
    }

    const [, dataFormat, length] = matched;
    if (string.length > parseInt(length, 10)) {
      return false;
    }

    if (dataFormat === 'A') {
      const regexAnyNumber = /\d+/;
      return !regexAnyNumber.test(string);
    }

    if (dataFormat === 'N') {
      const regexNumeric = /^(\+|-)?\d+[.,]?\d*$/;
      return regexNumeric.test(string);
    }

    return true;
  }

  doValidateByFormat(elementId, string, format) {
    const $el = $(`#${elementId}`);
    if (!this.validateByFormat(string, format)) {
      $el.css('background-color', '#fb2d2d');
      $el.css('color', 'white');
    } else {
      $el.css('background-color', '');
      $el.css('color', '');
    }
  }

  isSpecData(data) {
    // Validate data exists
    if (data === '') return false;

    try {
      data = JSON.parse(data);
    } catch (error) {
      comShowMessage(`[Spec data] ${error}`);
      return false;
    }

    // Validate struct data
    if (!data.vertex || !data.boundary || !data.position || !data.vertexTypes) {
      comShowMessage('Spec structure is corrupted. You should check it!');
      return false;
    }

    return true;
  }

  export() {
    const editedSampleText = $('#popupContent')[0].innerText;

    const blob = new Blob([editedSampleText], { type: 'application/text', charset: 'utf-8' });

    const fileName = 'sample';

    if (navigator.msSaveBlob) {
      navigator.msSaveBlob(blob, fileName);
      return;
    }

    const fileUrl = window.URL.createObjectURL(blob);
    const downLink = $('<a>');
    downLink.attr('download', `${fileName}.txt`);
    downLink.attr('href', fileUrl);
    downLink.css('display', 'none');
    $('body').append(downLink);
    downLink[0].click();
    downLink.remove();
  }

  validateSegment(segmentId) {
    const segmentDetail = this.main.getDetail(segmentId);
    if (segmentDetail.constructor.name === 'MessageSegment') {
      for (let i = 0; i < segmentDetail.spec.dataElements.length; i += 1) {
        const eachStructDataElement = segmentDetail.spec.dataElements[i];

        for (let j = 0; j < segmentDetail._children.length; j += 1) {
          const sampleCompositeDataElement = segmentDetail._children[j];

          for (let k = 0; k < sampleCompositeDataElement.length; k += 1) {
            const eachSampleDataElement = sampleCompositeDataElement[k];

            if (eachSampleDataElement.name === eachStructDataElement.name && eachSampleDataElement.spec.id === eachStructDataElement.id) {
              if (!this.validateByFormat(eachSampleDataElement.value.trim(), eachStructDataElement.format)) {
                return false;
              }
            }
          }
        }
      }
    }

    return true;
  }

  showSpecifyInvalidSegmentOnTreeView(segmentId) {
    if (this.main._jsTree !== undefined && this.main._jsTree !== null && this.main._messageElementMap !== undefined && this.main._messageElementMap !== null) {
      this.isNodeOpenedByFunction = true;

      // Reset invalid segment effect
      $('.jstree-leaf').each(function () {
        if (this.id === segmentId) {
          $(this).find('.invalid-segment').each(function () {
            $(this).removeClass('invalid-segment');
          });
        }
      });

      for (const [key, messageElement] of this.main._messageElementMap) {
        if (messageElement.constructor.name === 'MessageSegment') {
          if (messageElement.id === segmentId && !this.validateSegment(messageElement.id)) {
            this.expandNode(messageElement.id, messageElement.id);
            this.showWarningColorToSegmentOnTreeView(messageElement.id);
            break;
          }
        }
      }

      this.isNodeOpenedByFunction = false;
    }
  }

  showInvalidSegmentOnTreeView() {
    if (this.main._jsTree !== undefined && this.main._jsTree !== null && this.main._messageElementMap !== undefined && this.main._messageElementMap !== null) {
      this.isNodeOpenedByFunction = true;

      // Reset invalid segment effect
      $('.invalid-segment').each(function () {
        $(this).removeClass('invalid-segment');
      });

      for (const [key, messageElement] of this.main._messageElementMap) {
        if (messageElement.constructor.name === 'MessageSegment') {
          if (!this.validateSegment(messageElement.id)) {
            this.expandNode(messageElement.id, messageElement.id);
            this.showWarningColorToSegmentOnTreeView(messageElement.id);
          }
        }
      }

      this.isNodeOpenedByFunction = false;
    }
  }

  expandNode(nodeId, leafId) {
    const parent = _.find(this.main._jsTree, { id: nodeId }).parent;
    if (parent != '#') {
      this.expandNode(parent, leafId);
    }

    if (nodeId !== leafId) {
      const selectorId = nodeId
        .replace(/\#/g, '\\#')
        .replace(/\|/g, '\\|');
      $('#jstree').jstree('open_node', $(`#${selectorId}`));
    }
  }

  showWarningColorToSegmentOnTreeView(segmentId) {
    const selectorId = segmentId.replace(/\#/g, '\\#')
      .replace(/\|/g, '\\|');

    $($(`#${selectorId}`).find('a')[0]).addClass('invalid-segment');
  }

  calculateTableSize() {
    // Table size
    const $tableBody = $('#tableContent tbody');
    if ($('.content')[0].clientHeight - $tableBody[0].scrollHeight >= 100) {
      $tableBody.css('height', 'auto');
    } else {
      $tableBody.css('height', $('.content').height() - 100);
    }

    // position for Apply change button
    $('.bottom-fixed-area').css('top', $tableBody[0].getBoundingClientRect().bottom + 1);
  }

  isValueChanged(inputValueId) {
    const segmentDetail = this.messageElement;
    let seqTextBox = 0;
    if (segmentDetail.constructor.name === 'MessageSegment') {
      for (let i = 0; i < segmentDetail.spec.dataElements.length; i += 1) {
        const eachStructDataElement = segmentDetail.spec.dataElements[i];

        for (let j = 0; j < segmentDetail._children.length; j += 1) {
          const sampleCompositeDataElement = segmentDetail._children[j];

          for (let k = 0; k < sampleCompositeDataElement.length; k += 1) {
            const eachSampleDataElement = sampleCompositeDataElement[k];

            if (eachSampleDataElement.name === eachStructDataElement.name && eachSampleDataElement.spec.id === eachStructDataElement.id && inputValueId === `editValue${seqTextBox}`) {
              const eachMessageDataElementSpecLength = Number(eachSampleDataElement.spec.format.match(/\d+/i));
              let whiteSpace = eachMessageDataElementSpecLength - $(`#editValue${seqTextBox}`).val().length;
              if (whiteSpace < 0) {
                whiteSpace = 0;
              }

              if (eachSampleDataElement.value.trim() !== $(`#editValue${seqTextBox}`).val().trim()) {
                return true;
              }
            }
            seqTextBox += 1;
          }
          seqTextBox += 1;
        }
        seqTextBox += 1;
      }
    }

    return false;
  }

  visibleInsideButton(inputId, isShow = true) {
    const $input = $(`#${inputId}`);
    if (isShow) {
      $($input.closest('.edit-value-group')).removeClass('value-group');
      $($input.closest('.edit-value-group')).addClass('value-group-show-button');
    } else {
      $($input.closest('.edit-value-group')).removeClass('value-group-show-button');
      $($input.closest('.edit-value-group')).addClass('value-group');
    }
  }

  hideAllInsideButton() {
    $('.value-group-show-button').removeClass('value-group-show-button').addClass('value-group');
  }

  setHeaderWidth() {
    let columnCount = 0;
    $('table tbody tr').first().find('td').each(function () {
      columnCount += 1;

      $(`table thead th:nth-child(${columnCount})`).css('min-width', this.getBoundingClientRect().width);
    });
  }

  initTableScrollEvent() {
    $('tbody').scroll((event) => {
      if ($('tbody').hasVerticalScrollBar()) {
        $('thead').css('overflow-y', 'scroll');
      } else {
        $('thead').css('overflow-y', '');
      }

      $('thead').scrollLeft(event.target.scrollLeft);
    });
  }
}

export default CltSampleMessageViewer;
