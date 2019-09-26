import Cluster from './cluster';

import _intersectionWith from 'lodash/intersectionWith';
import _filter from 'lodash/filter';
import _isEqual from 'lodash/isEqual';
import _find from 'lodash/find';
import _cloneDeep from 'lodash/cloneDeep';
import _remove from 'lodash/remove';
import _differenceBy from 'lodash/differenceBy';

class Collection {
  #listeners;
  #emitListener;
  #triggerListeners;

  constructor(options){
    this.name = options.name;
    this.docs = [];
    this.schema = options.schema;

    this.#listeners = {};

    this.#emitListener = (updated_data, {next, options}, action) => {
      const all_docs = options && options.clustered_all ? new Cluster(this.docs) : this.docs;
      const changes = options && options.clustered_updated ? new Cluster(updated_data) : updated_data;

      next({ all_docs, changes, action })
    };

    this.#triggerListeners = (updated_data, action, keys) => {
      const listenerKeys = keys || Object.keys(this.#listeners);

      listenerKeys.forEach(key => {
        if (!this.#listeners[key]) return;

        this.#listeners[key].forEach((config) => { this.#emitListener(updated_data, config, action) })
      });
    }
  }

  add(data){
    const intersected = _intersectionWith(this.docs, [data], _isEqual);

    if (intersected.length) {
      throw new Error('Current object already present in this collection');
    }

    this.docs = [...this.docs, data];
    this.#triggerListeners(data, 'added');

    return { all_docs: this.docs, status: "success", added: data };
  }

  bulkAdd(data) {
    const intersected = _intersectionWith(this.docs, data, _isEqual);
    const uniq_data = _differenceBy(data, intersected, 'id');

    this.docs = [...this.docs, ...uniq_data];
    this.#triggerListeners(uniq_data, 'bulk added');

    return {
      all_docs: this.docs,
      added: uniq_data,
      status: uniq_data.length !== data.length ? 'added with warnings' : 'success'
    };
  }

  getAll() {
    return new Cluster(this.docs);
  }

  getOne(options) {
    return _find(this.docs, options)
  }

  getFirst() {
    return this.docs[0]
  }

  getById(id) {
    return _find(this.docs, { id })
  }

  where(options) {
    const docs = _filter(this.docs, options);

    return new Cluster(docs, options);
  }

  update(query, data) {
    const field = _find(this.docs, query);

    if (!field) {
      throw new Error('Current object is not in this collection');
    }

    const docs =_filter( this.docs, doc => doc.id !== field.id);
    const updatedField = { ...field, ...data};

    this.docs = [...docs, updatedField];
    this.#triggerListeners(data, Object.keys(data));

    return {
      docs: this.docs,
      updated: updatedField,
      old: field
    };
  }

  bulkUpdate(data) {
    this.docs  = this.docs.map(doc => ({...doc, data}));
    this.#triggerListeners(data);

    return {
      docs: this.docs,
      status: 'success'
    };
  }

  upsert(item) {
    const docs = _filter(this.docs, doc => doc.id !== item.id);

    this.docs = [...docs, item];
    this.#triggerListeners(item);

    return {
      docs: this.docs,
      upserted: item
    };
  }

  bulkUpsert(items) {
    const itemIds = items.map(item => item.id);
    const docs = _filter(this.docs,doc => !itemIds.includes(doc.id));

    this.docs = [...docs, ...items];
    this.#triggerListeners(items);

    return {
      docs: this.docs,
      upserted: items
    };
  }

  delete(...ids) {
    if (!ids.length) {
      throw new Error('This method required at least 1 id as argument.')
    }

    const docs = _cloneDeep(this.docs);
    const removed = _remove(docs, doc => ids.includes(doc.id));
    const removedIds = removed.map(doc => doc.id);
    const notFoundIds = _filter(ids, id => !removedIds.includes(id)).join(', ');

    this.docs = docs;

    removed.length && this.#triggerListeners(removed, 'deleted');

    return {
      status: removed.length === ids.length ? 'success' : `Not found doc with id${notFoundIds.length > 1 ? 's' : ''} ${notFoundIds}`,
      removed,
      all_docs: docs
    }
  }

  subscribe( { next, keys, options }) {
    if (!next || !keys) {
      const msg = `Subscribe method is wait for object with required "next" and "keys" properties`;
      throw new Error(msg)
    }

    if (!(next instanceof Function)) {
      const msg = `Next should be a function`;
      throw new Error(msg)
    }

    if (!(keys instanceof Array)) {
      const msg = `Keys should be an array`;
      throw new Error(msg)
    }

    const config = { next, options };

    keys.forEach(key => {
      this.#listeners[key] = this.#listeners[key] || new Set([]);
      this.#listeners[key].add(config);
    });

    this.#emitListener(this.docs, config, 'initialized');

    return () => {
      keys.forEach(key => {
        this.#listeners[key].delete(config)
      })
    }
  }
}

export default Collection;
