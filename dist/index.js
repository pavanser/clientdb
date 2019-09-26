"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _collection = _interopRequireDefault(require("./collection"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class ClientDB {
  createCollection(name) {
    if (!name) {
      var msg = 'Name is required for collection. Please set name of collection as argument.';
      throw new Error(msg);
    }

    this[name] = new _collection.default({
      name
    });
    return this[name];
  }

  deleteCollection(name) {
    delete this[name];
  }

}

var _default = ClientDB;
exports.default = _default;