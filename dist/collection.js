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

var _isObjectLike2 = _interopRequireDefault(require("lodash/isObjectLike"));

var _isArray2 = _interopRequireDefault(require("lodash/isArray"));

var _uniq2 = _interopRequireDefault(require("lodash/uniq"));

var _remove2 = _interopRequireDefault(require("lodash/remove"));

var _differenceBy2 = _interopRequireDefault(require("lodash/differenceBy"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classPrivateFieldGet(receiver, privateMap) { var descriptor = privateMap.get(receiver); if (!descriptor) { throw new TypeError("attempted to get private field on non-instance"); } if (descriptor.get) { return descriptor.get.call(receiver); } return descriptor.value; }

function _classPrivateFieldSet(receiver, privateMap, value) { var descriptor = privateMap.get(receiver); if (!descriptor) { throw new TypeError("attempted to set private field on non-instance"); } if (descriptor.set) { descriptor.set.call(receiver, value); } else { if (!descriptor.writable) { throw new TypeError("attempted to set read only private field"); } descriptor.value = value; } return value; }

var isArray = docs => {
  if (!(0, _isArray2.default)(docs)) {
    throw new Error('Expected array as an argument');
  }
};

var isObject = doc => {
  if (!(0, _isObjectLike2.default)(doc) || (0, _isArray2.default)(doc)) {
    throw new Error('Expected plain object as an argument');
  }
};

var isWithId = doc => {
  if (!doc.id) {
    throw new Error('Doc should have "id"');
  }
};

var isWithIds = docs => {
  var withoutIds = (0, _filter2.default)(docs, doc => !doc.id);

  if (withoutIds.length) {
    var message = "All docs should have \"id\". Please, check next docs: ".concat(JSON.stringify(withoutIds));
    throw new Error(message);
  }
};

class Collection {
  constructor(options) {
    _defineProperty(this, "_listeners", void 0);

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
    this._listeners = {};

    _classPrivateFieldSet(this, _emitListener, (changes, _ref, action) => {
      var {
        next,
        options
      } = _ref;
      var all_docs = options && options.clustered_all ? new _cluster.default(this.docs) : this.docs;
      var changes_entity = options && options.clustered_changes ? new _cluster.default(changes) : changes;
      next({
        all_docs,
        changes: changes_entity,
        action
      });
    });

    _classPrivateFieldSet(this, _triggerListeners, (changes, action, keys) => {
      var listenerKeys = keys || Object.keys(this._listeners);
      listenerKeys.forEach(key => {
        if (key === 'id') return;
        if (!this._listeners[key]) return;

        this._listeners[key].forEach(config => {
          _classPrivateFieldGet(this, _emitListener).call(this, changes, config, action);
        });
      });
    });
  }

  add(doc) {
    isObject(doc);
    isWithId(doc);
    var intersected = (0, _intersectionWith2.default)(this.docs, [doc], _isEqual2.default);

    if (intersected.length) {
      throw new Error('Current object already present in this collection');
    }

    this.docs = [...this.docs, doc];

    _classPrivateFieldGet(this, _triggerListeners).call(this, [doc], 'added');

    return {
      all_docs: this.docs,
      status: "success",
      added_doc: doc
    };
  }

  bulkAdd(docs) {
    isArray(docs);
    isWithIds(docs);
    var intersected = (0, _intersectionWith2.default)(this.docs, docs, _isEqual2.default);
    var uniq_docs = (0, _differenceBy2.default)(docs, intersected, 'id');
    var keys = [];
    uniq_docs.forEach(doc => keys.push(...Object.keys(doc)));
    this.docs = [...this.docs, ...uniq_docs];

    _classPrivateFieldGet(this, _triggerListeners).call(this, uniq_docs, 'bulk added', (0, _uniq2.default)(keys));

    return {
      all_docs: this.docs,
      added_docs: uniq_docs,
      status: uniq_docs.length !== docs.length ? 'added with warnings' : 'success'
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

  where(filter) {
    var docs = (0, _filter2.default)(this.docs, filter);
    return new _cluster.default(docs, filter);
  }

  update(updated_fields) {
    isObject(updated_fields);
    isWithId(updated_fields);
    var doc = (0, _find2.default)(this.docs, doc => doc.id === updated_fields.id);

    if (!doc) {
      throw new Error('Current object is not in this collection');
    }

    var docs = (0, _filter2.default)(this.docs, d => d.id !== doc.id);

    var updated_doc = _objectSpread({}, doc, {}, updated_fields);

    this.docs = [...docs, updated_doc];

    _classPrivateFieldGet(this, _triggerListeners).call(this, [updated_doc], 'updated', Object.keys(updated_fields));

    return {
      all_docs: this.docs,
      updated_doc,
      old_doc: doc,
      status: 'success'
    };
  }

  bulkUpdate(docs) {
    isArray(docs);
    isWithIds(docs);
    var itemIds = docs.map(item => item.id);
    var keys = [];
    var docs_for_update = (0, _remove2.default)(this.docs, doc => itemIds.includes(doc.id));
    var incomingDocs = (0, _cloneDeep2.default)(docs);
    var updated_docs = docs_for_update.map(doc => {
      var update = (0, _remove2.default)(incomingDocs, d => d.id === doc.id);
      keys.push(...Object.keys(update[0]));
      return _objectSpread({}, doc, {}, update[0]);
    });
    this.docs = [...this.docs, ...updated_docs];

    _classPrivateFieldGet(this, _triggerListeners).call(this, updated_docs, 'bulk updated', (0, _uniq2.default)(keys));

    if (docs_for_update.length !== itemIds.length) {
      return {
        all_docs: this.docs,
        updated_docs: updated_docs,
        old_docs: docs_for_update,
        passed_data: incomingDocs,
        status: 'Not existed docs were not updated'
      };
    }

    return {
      all_docs: this.docs,
      updated_docs: updated_docs,
      old_docs: docs_for_update,
      status: 'success'
    };
  }

  upsert(doc) {
    isObject(doc);
    isWithId(doc);
    var initialItem = (0, _find2.default)(this.docs, d => d.id === doc.id);
    var docs = (0, _filter2.default)(this.docs, d => d.id !== doc.id);
    this.docs = [...docs, _objectSpread({}, initialItem, {}, doc)];

    _classPrivateFieldGet(this, _triggerListeners).call(this, [_objectSpread({}, initialItem, {}, doc)], 'added or updated', Object.keys(doc));

    return {
      all_docs: this.docs,
      upserted_doc: _objectSpread({}, initialItem, {}, doc),
      status: 'success'
    };
  }

  bulkUpsert(docs) {
    isArray(docs);
    isWithIds(docs);
    var itemIds = docs.map(item => item.id);
    var keys = [];
    docs.forEach(item => {
      keys.push(...Object.keys(item));
    });
    var unchanged_docs = (0, _filter2.default)(this.docs, doc => !itemIds.includes(doc.id));
    this.docs = [...unchanged_docs, ...docs];

    _classPrivateFieldGet(this, _triggerListeners).call(this, docs, 'added or updated', (0, _uniq2.default)(keys));

    return {
      all_docs: this.docs,
      upserted_docs: docs,
      status: 'success'
    };
  }

  delete() {
    for (var _len = arguments.length, ids = new Array(_len), _key = 0; _key < _len; _key++) {
      ids[_key] = arguments[_key];
    }

    if (!ids.length) {
      throw new Error('This method required at least 1 id as argument.');
    }

    var removed = (0, _remove2.default)(this.docs, doc => ids.includes(doc.id));
    var removedIds = removed.map(doc => doc.id);
    var notFoundIds = (0, _filter2.default)(ids, id => !removedIds.includes(id)).join(', ');
    removed.length && _classPrivateFieldGet(this, _triggerListeners).call(this, removed, 'deleted', Object.keys(removed[0]));
    return {
      status: removed.length === ids.length ? 'success' : "Not found doc with id".concat(notFoundIds.length > 1 ? 's' : '', " ").concat(notFoundIds),
      removed,
      all_docs: this.docs
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
      this._listeners[key] = this._listeners[key] || new Set([]);

      this._listeners[key].add(config);
    });

    _classPrivateFieldGet(this, _emitListener).call(this, this.docs, config, 'initialized');

    return () => {
      keys.forEach(key => {
        this._listeners[key].delete(config);
      });
    };
  }

}

var _emitListener = new WeakMap();

var _triggerListeners = new WeakMap();

var _default = Collection;
exports.default = _default;