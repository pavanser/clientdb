"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _chunk2 = _interopRequireDefault(require("lodash/chunk"));

var _pick2 = _interopRequireDefault(require("lodash/pick"));

var _orderBy = _interopRequireDefault(require("lodash/orderBy"));

var _cloneDeep = _interopRequireDefault(require("lodash/cloneDeep"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classPrivateFieldGet(receiver, privateMap) { var descriptor = privateMap.get(receiver); if (!descriptor) { throw new TypeError("attempted to get private field on non-instance"); } if (descriptor.get) { return descriptor.get.call(receiver); } return descriptor.value; }

function _classPrivateFieldSet(receiver, privateMap, value) { var descriptor = privateMap.get(receiver); if (!descriptor) { throw new TypeError("attempted to set private field on non-instance"); } if (descriptor.set) { descriptor.set.call(receiver, value); } else { if (!descriptor.writable) { throw new TypeError("attempted to set read only private field"); } descriptor.value = value; } return value; }

class Cluster {
  constructor(data) {
    _all_data.set(this, {
      writable: true,
      value: void 0
    });

    _classPrivateFieldSet(this, _all_data, (0, _cloneDeep.default)(data));

    this.pages = [];
    this.current_page = 0;
    this.data = (0, _cloneDeep.default)(data);
  }
  /**
   * Sort elements by one field or array of fields, and show by required direction
   * Note: directions also could be set as array of directions
   * */


  sort(fields, directions) {
    this.data = (0, _orderBy.default)(_classPrivateFieldGet(this, _all_data), fields, directions);
    return this;
  }
  /**
   * Hide first {offset} elements
   * */


  offset(offset) {
    this.data = _classPrivateFieldGet(this, _all_data).slice(offset);
    return this;
  }
  /**
   * Change active page
   * */


  page(page) {
    this.current_page = page;
    this.data = this.pages.length ? this.pages[this.current_page] : this.data;
    var fields = ['data', 'exec', 'current_page', 'pages'];

    if (!this.pages.length) {
      fields.push('sort', 'offset', 'limit');
    }

    return this;
  }
  /**
   * Set limit docs on the page and returns new array of pages
   * */


  limit(elements_on_page) {
    this.pages = (0, _chunk2.default)(_classPrivateFieldGet(this, _all_data), elements_on_page);
    this.data = this.pages[this.current_page];
    return this;
  }
  /**
   * Current data ill be returned
   * */


  exec() {
    return this.data;
  }

}

var _all_data = new WeakMap();

var _default = Cluster;
exports.default = _default;