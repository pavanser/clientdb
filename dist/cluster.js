"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _orderBy = _interopRequireDefault(require("lodash/orderBy"));

var _cloneDeep = _interopRequireDefault(require("lodash/cloneDeep"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Cluster {
  constructor(data) {
    this.data = (0, _cloneDeep.default)(data);
    this.start_index = 0;
  }

  sort(fields, directions) {
    this.data = (0, _orderBy.default)(this.data, fields, directions);
    return this;
  }

  offset(offset) {
    this.start_index = offset - 1;
    return this;
  }

  limit(count_elements) {
    this.data = this.data.slice(this.start_index, count_elements);
    return this;
  }

  exec() {
    return this.data;
  }

}

var _default = Cluster;
exports.default = _default;