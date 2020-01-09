class FunctionMap {
  static from(operation) {
    if (!operation) {
      return this._byPass;
    }

    if (operation.name === 'substr') return this._substr(operation);
    if (operation.name === 'pad') return this._pad(operation);
    if (operation.name === 'upcase') return this._upcase(operation);
    if (operation.name === 'downcase') return this._downcase(operation);
    if (operation.name === 'trim') return this._trim(operation);
    if (operation.name === 'replace') return this._replace(operation);
    if (operation.name === 'in?') return this._existIn(operation);
    return this._byPass;
  }

  static _substr(operation) {
    return (input) => {
      const fromIndex = this._readParameter(operation, 'fromIndex');
      const toIndex = this._readParameter(operation, 'toIndex');
      return `x_substr(${input}, ${fromIndex}, ${toIndex})`;
    };
  }

  static _pad(operation) {
    return (input) => {
      const length = this._readParameter(operation, 'length');
      const padding = this._readParameter(operation, 'char');
      return `x_pad(${input}, ${length}, '${padding}')`;
    };
  }

  static _upcase() {
    return input => `x_upcase(${input})`;
  }

  static _downcase() {
    return input => `x_downcase(${input})`;
  }

  static _trim() {
    return input => `x_trim(${input})`;
  }

  static _replace(operation) {
    return (input) => {
      const fromString = this._readParameter(operation, 'fromString');
      const toString = this._readParameter(operation, 'toString');
      return `replace_str(${input}, "${fromString}", "${toString}")`;
    };
  }

  static _existIn(operation) {
    return (input) => {
      const list = this._readParameter(operation, 'item#1');
      if (list.length === 0) {
        return input;
      }

      const itemSet = `"${list.split(/,\s*/).join('", "')}"`;
      return `exist_in(${input}, ${itemSet.length}, ${itemSet})`;
    };
  }

  static _readParameter(operation, name) {
    const target = operation.parameters[name];
    if (!target) {
      return '';
    }

    return target.value || '';
  }

  static _byPass(input) {
    return input;
  }
}

module.exports = FunctionMap;
