const MessageGroupFormatFactory = require('../message_spec/message_group_format_factory');

const ScannerWriter = require('./scanner_writer');

class ScannerWriterFactory {
  static createFixedLengthByLine(config = {}) {
    const fixedLengthGroupFormat = MessageGroupFormatFactory.createFixedLength(config);
    const segmentScanFormatter = ({
      segmentName,
    }) => [
      `scanVal("", ${segmentName});`,
    ];
    return new ScannerWriter(fixedLengthGroupFormat, segmentScanFormatter);
  }

  static createFixedLengthWithIndexedItem(config = {}) {
    const fixedLengthGroupFormat = MessageGroupFormatFactory.createFixedLength(config);
    const segmentScanFormatter = ({
      lengthListVar,
      lengthList,
      segmentName,
      nDataElement,
    }) => [
      `const int ${lengthListVar}[] = {${lengthList}};`,
      `scanValLen("", ${segmentName}, ${lengthListVar}, ${nDataElement});`,
    ];
    return new ScannerWriter(fixedLengthGroupFormat, segmentScanFormatter);
  }

  static createFixedLengthWithNamedItem(config = {}) {
    const fixedLengthGroupFormat = MessageGroupFormatFactory.createFixedLength(config);
    const segmentScanFormatter = ({
      lengthListVar,
      lengthList,
      nameListVar,
      nameList,
      segmentName,
      nDataElement,
    }) => [
      `const int ${lengthListVar}[] = {${lengthList}};`,
      `const char* ${nameListVar}[] = {${nameList}};`,
      `scanValLenWithName("", ${segmentName}, ${lengthListVar}, ${nameListVar}, ${nDataElement});`,
    ];
    return new ScannerWriter(fixedLengthGroupFormat, segmentScanFormatter);
  }

  static createDelimiterWithIndexedItem(config = {}) {
    const delimiterGroupFormat = MessageGroupFormatFactory.createDelimiter(config);
    const segmentScanFormatter = ({
      dataElementSeparator,
      segmentName,
    }) => [
      `scanValDelim("", '${dataElementSeparator}', ${segmentName});`,
    ];
    return new ScannerWriter(delimiterGroupFormat, segmentScanFormatter);
  }

  static createDelimiterWithNamedItem(config = {}) {
    const delimiterGroupFormat = MessageGroupFormatFactory.createDelimiter(config);
    const segmentScanFormatter = ({
      nameListVar,
      nameList,
      dataElementSeparator,
      segmentName,
      nDataElement,
    }) => [
      `const char* ${nameListVar}[] = {${nameList}};`,
      `scanValDelimWithName("", '${dataElementSeparator}', ${segmentName}, ${nameListVar}, ${nDataElement});`,
    ];
    return new ScannerWriter(delimiterGroupFormat, segmentScanFormatter);
  }

  static createDictionary(config = {}) {
    const dictionaryGroupFormat = MessageGroupFormatFactory.createDictionary(config);
    const segmentScanFormatter = ({
      dataElementName,
    }) => [
      `scanVal("${dataElementName}:", ${dataElementName});`,
    ];
    return new ScannerWriter(dictionaryGroupFormat, segmentScanFormatter);
  }
}

module.exports = ScannerWriterFactory;
