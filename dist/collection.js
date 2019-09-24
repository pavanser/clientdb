function _classPrivateFieldGet(receiver, privateMap) { var descriptor = privateMap.get(receiver); if (!descriptor) { throw new TypeError("attempted to get private field on non-instance"); } if (descriptor.get) { return descriptor.get.call(receiver); } return descriptor.value; }

function _classPrivateFieldSet(receiver, privateMap, value) { var descriptor = privateMap.get(receiver); if (!descriptor) { throw new TypeError("attempted to set private field on non-instance"); } if (descriptor.set) { descriptor.set.call(receiver, value); } else { if (!descriptor.writable) { throw new TypeError("attempted to set read only private field"); } descriptor.value = value; } return value; }

import intersectionWith from 'lodash/intersectionWith';
import filter from 'lodash/filter';
import isEqual from 'lodash/isEqual';
import find from 'lodash/find';
import remove from 'lodash/remove';
import cloneDeep from 'lodash/cloneDeep';
import uniqWith from 'lodash/uniqWith';
import Cluster from './cluster';

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

    _classPrivateFieldSet(this, _emitListener, (updated_data, {
      next,
      options
    }) => {
      const all_docs = options && options.clustered_all ? new Cluster(this.docs) : this.docs;
      const updated = options && options.clustered_updated ? new Cluster(updated_data) : updated_data;
      next({
        all_docs,
        updated
      });
    });

    _classPrivateFieldSet(this, _triggerListeners, (updated_data, keys) => {
      const listenerKeys = keys || Object.keys(_classPrivateFieldGet(this, _listeners));
      listenerKeys.forEach(key => {
        if (!_classPrivateFieldGet(this, _listeners)[key]) return;

        _classPrivateFieldGet(this, _listeners)[key].forEach(config => {
          _classPrivateFieldGet(this, _emitListener).call(this, updated_data, config);
        });
      });
    });
  }

  add(data) {
    const intersected = intersectionWith(this.docs, [data], isEqual);

    if (intersected.length) {
      throw new Error('Current object already present in this collection');
    }

    this.docs = [...this.docs, data];

    _classPrivateFieldGet(this, _triggerListeners).call(this, data);

    return {
      docs: this.docs
    };
  }

  bulkAdd(data) {
    const intersected = intersectionWith(this.docs, [data], isEqual);
    data = uniqWith([...intersected, ...data]);
    this.docs = [...this.docs, ...data];

    _classPrivateFieldGet(this, _triggerListeners).call(this, data);

    if (intersected.length) {
      return {
        docs: this.docs,
        status: 'added with warnings',
        warning: 'Some data was not added because it is already in collection'
      };
    }

    return {
      docs: this.docs,
      status: 'success'
    };
  }

  getAll() {
    return new Cluster(this.docs);
  }

  getOne(options) {
    return find(cloneDeep(this.docs), options);
  }

  getFirst() {
    return this.docs[1];
  }

  getById(id) {
    return find(this.docs, {
      id
    });
  }

  where(options) {
    const docs = filter(this.docs, options);
    return new Cluster(docs, options);
  }

  update(query, data) {
    const field = find(this.docs, query);

    if (!field) {
      throw new Error('Current object is not in this collection');
    }

    const docs = this.docs.filter(doc => doc.id !== field.id);
    const updatedField = { ...field,
      ...data
    };
    this.docs = [...docs, updatedField];

    _classPrivateFieldGet(this, _triggerListeners).call(this, data, Object.keys(data));

    return {
      docs: this.docs,
      updated: updatedField,
      old: field
    };
  }

  bulkUpdate(data) {
    this.docs = this.docs.map(doc => ({ ...doc,
      data
    }));

    _classPrivateFieldGet(this, _triggerListeners).call(this, data);

    return {
      docs: this.docs,
      status: 'success'
    };
  }

  upsert(item) {
    const docs = this.docs.filter(doc => doc.id !== item.id);
    this.docs = [...docs, item];

    _classPrivateFieldGet(this, _triggerListeners).call(this, item);

    return {
      docs: this.docs,
      upserted: item
    };
  }

  bulkUpsert(items) {
    const itemIds = items.map(item => item.id);
    const docs = this.docs.filter(doc => !itemIds.includes(doc.id));
    this.docs = [...docs, ...items];

    _classPrivateFieldGet(this, _triggerListeners).call(this, items);

    return {
      docs: this.docs,
      upserted: items
    };
  }

  delete(id) {
    const removed = remove(this.docs, doc => doc.id === id);

    _classPrivateFieldGet(this, _triggerListeners).call(this, this.docs);

    return {
      status: !!removed ? 'success' : `Not found doc with id ${id}`,
      removed,
      docs: this.docs
    };
  }

  subscribe({
    next,
    keys,
    options
  }) {
    if (!next) {
      throw new Error(`Callback is required for subscription function. Please add 'next' function property to subscription configuration.`);
    }

    const config = {
      next,
      options
    };
    keys.forEach(key => {
      _classPrivateFieldGet(this, _listeners)[key] = _classPrivateFieldGet(this, _listeners)[key] || new Set([]);

      _classPrivateFieldGet(this, _listeners)[key].add(config);
    });

    _classPrivateFieldGet(this, _emitListener).call(this, this.docs, config);

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

export default Collection;