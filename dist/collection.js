"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _cluster = _interopRequireDefault(require("./cluster"));

var _intersectionWith2 = _interopRequireDefault(require("lodash/intersectionWith"));

var _filter2 = _interopRequireDefault(require("lodash/filter"));

var _isEqual2 = _interopRequireDefault(require("lodash/isEqual"));

var _find2 = _interopRequireDefault(require("lodash/find"));

var _cloneDeep2 = _interopRequireDefault(require("lodash/cloneDeep"));

var _remove2 = _interopRequireDefault(require("lodash/remove"));

var _differenceBy2 = _interopRequireDefault(require("lodash/differenceBy"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classPrivateFieldGet(receiver, privateMap) { var descriptor = privateMap.get(receiver); if (!descriptor) { throw new TypeError("attempted to get private field on non-instance"); } if (descriptor.get) { return descriptor.get.call(receiver); } return descriptor.value; }

function _classPrivateFieldSet(receiver, privateMap, value) { var descriptor = privateMap.get(receiver); if (!descriptor) { throw new TypeError("attempted to set private field on non-instance"); } if (descriptor.set) { descriptor.set.call(receiver, value); } else { if (!descriptor.writable) { throw new TypeError("attempted to set read only private field"); } descriptor.value = value; } return value; }

class Collection {
  constructor(options) {
    _listeners.set(this, {
      writable: true,
      value: void 0
    });

    _emitListener.set(this, {
      writable: true,
      value: void 0
    });

    _triggerListeners.set(this, {
      writable: true,
      value: void 0
    });

    this.name = options.name;
    this.docs = [];
    this.schema = options.schema;

    _classPrivateFieldSet(this, _listeners, {});

    _classPrivateFieldSet(this, _emitListener, (updated_data, _ref, action) => {
      var {
        next,
        options
      } = _ref;
      var all_docs = options && options.clustered_all ? new _cluster.default(this.docs) : this.docs;
      var changes = options && options.clustered_updated ? new _cluster.default(updated_data) : updated_data;
      next({
        all_docs,
        changes,
        action
      });
    });

    _classPrivateFieldSet(this, _triggerListeners, (updated_data, action, keys) => {
      var listenerKeys = keys || Object.keys(_classPrivateFieldGet(this, _listeners));
      listenerKeys.forEach(key => {
        if (!_classPrivateFieldGet(this, _listeners)[key]) return;

        _classPrivateFieldGet(this, _listeners)[key].forEach(config => {
          _classPrivateFieldGet(this, _emitListener).call(this, updated_data, config, action);
        });
      });
    });
  }

  add(data) {
    var intersected = (0, _intersectionWith2.default)(this.docs, [data], _isEqual2.default);

    if (intersected.length) {
      throw new Error('Current object already present in this collection');
    }

    this.docs = [...this.docs, data];

    _classPrivateFieldGet(this, _triggerListeners).call(this, data, 'added');

    return {
      all_docs: this.docs,
      status: "success",
      added: data
    };
  }

  bulkAdd(data) {
    var intersected = (0, _intersectionWith2.default)(this.docs, data, _isEqual2.default);
    var uniq_data = (0, _differenceBy2.default)(data, intersected, 'id');
    this.docs = [...this.docs, ...uniq_data];

    _classPrivateFieldGet(this, _triggerListeners).call(this, uniq_data, 'bulk added');

    return {
      all_docs: this.docs,
      added: uniq_data,
      status: uniq_data.length !== data.length ? 'added with warnings' : 'success'
    };
  }

  getAll() {
    return new _cluster.default(this.docs);
  }

  getOne(options) {
    return (0, _find2.default)(this.docs, options);
  }

  getFirst() {
    return this.docs[0];
  }

  getById(id) {
    return (0, _find2.default)(this.docs, {
      id
    });
  }

  where(options) {
    var docs = (0, _filter2.default)(this.docs, options);
    return new _cluster.default(docs, options);
  }

  update(query, data) {
    var field = (0, _find2.default)(this.docs, query);

    if (!field) {
      throw new Error('Current object is not in this collection');
    }

    var docs = (0, _filter2.default)(this.docs, doc => doc.id !== field.id);

    var updatedField = _objectSpread({}, field, {}, data);

    this.docs = [...docs, updatedField];

    _classPrivateFieldGet(this, _triggerListeners).call(this, data, Object.keys(data));

    return {
      docs: this.docs,
      updated: updatedField,
      old: field
    };
  }

  bulkUpdate(data) {
    this.docs = this.docs.map(doc => _objectSpread({}, doc, {
      data
    }));

    _classPrivateFieldGet(this, _triggerListeners).call(this, data);

    return {
      docs: this.docs,
      status: 'success'
    };
  }

  upsert(item) {
    var docs = (0, _filter2.default)(this.docs, doc => doc.id !== item.id);
    this.docs = [...docs, item];

    _classPrivateFieldGet(this, _triggerListeners).call(this, item);

    return {
      docs: this.docs,
      upserted: item
    };
  }

  bulkUpsert(items) {
    var itemIds = items.map(item => item.id);
    var docs = (0, _filter2.default)(this.docs, doc => !itemIds.includes(doc.id));
    this.docs = [...docs, ...items];

    _classPrivateFieldGet(this, _triggerListeners).call(this, items);

    return {
      docs: this.docs,
      upserted: items
    };
  }

  delete() {
    for (var _len = arguments.length, ids = new Array(_len), _key = 0; _key < _len; _key++) {
      ids[_key] = arguments[_key];
    }

    if (!ids.length) {
      throw new Error('This method required at least 1 id as argument.');
    }

    var docs = (0, _cloneDeep2.default)(this.docs);
    var removed = (0, _remove2.default)(docs, doc => ids.includes(doc.id));
    var removedIds = removed.map(doc => doc.id);
    var notFoundIds = (0, _filter2.default)(ids, id => !removedIds.includes(id)).join(', ');
    this.docs = docs;
    removed.length && _classPrivateFieldGet(this, _triggerListeners).call(this, removed, 'deleted');
    return {
      status: removed.length === ids.length ? 'success' : "Not found doc with id".concat(notFoundIds.length > 1 ? 's' : '', " ").concat(notFoundIds),
      removed,
      all_docs: docs
    };
  }

  subscribe(_ref2) {
    var {
      next,
      keys,
      options
    } = _ref2;

    if (!next || !keys) {
      var msg = "Subscribe method is wait for object with required \"next\" and \"keys\" properties";
      throw new Error(msg);
    }

    if (!(next instanceof Function)) {
      var _msg = "Next should be a function";
      throw new Error(_msg);
    }

    if (!(keys instanceof Array)) {
      var _msg2 = "Keys should be an array";
      throw new Error(_msg2);
    }

    var config = {
      next,
      options
    };
    keys.forEach(key => {
      _classPrivateFieldGet(this, _listeners)[key] = _classPrivateFieldGet(this, _listeners)[key] || new Set([]);

      _classPrivateFieldGet(this, _listeners)[key].add(config);
    });

    _classPrivateFieldGet(this, _emitListener).call(this, this.docs, config, 'initialized');

    return () => {
      keys.forEach(key => {
        _classPrivateFieldGet(this, _listeners)[key].delete(config);
      });
    };
  }

}

var _listeners = new WeakMap();

var _emitListener = new WeakMap();

var _triggerListeners = new WeakMap();

var _default = Collection;
exports.default = _default;