import intersectionWith from 'lodash/intersectionWith';
import filter from 'lodash/filter';
import isEqual from 'lodash/isEqual';
import find from 'lodash/find';
import remove from 'lodash/remove';
import cloneDeep from 'lodash/cloneDeep';
import uniqWith from 'lodash/uniqWith';
import Cluster from './cluster';

class Collection {
  #listeners;
  #emitListener;
  #triggerListeners;

  constructor(options){
    this.name = options.name;
    this.docs = [];
    this.schema = options.schema;

    this.#listeners = {};

    this.#emitListener = (updated_data, {next, options}) => {
      const all_docs = options && options.clustered_all ? new Cluster(this.docs) : this.docs;
      const updated = options && options.clustered_updated ? new Cluster(updated_data) : updated_data;

      next({ all_docs, updated })
    };

    this.#triggerListeners = (updated_data, keys) => {
      const listenerKeys = keys || Object.keys(this.#listeners);

      listenerKeys.forEach(key => {
        if (!this.#listeners[key]) return;

        this.#listeners[key].forEach((config) => { this.#emitListener(updated_data, config) })
      });
    }
  }

  add(data){
    const intersected = intersectionWith(this.docs, [data], isEqual);

    if (intersected.length) {
      throw new Error('Current object already present in this collection');
    }

    this.docs = [...this.docs, data];
    this.#triggerListeners(data);

    return { docs: this.docs };
  }

  bulkAdd(data) {
    const intersected = intersectionWith(this.docs, [data], isEqual);

    data = uniqWith([...intersected, ...data]);

    this.docs = [...this.docs, ...data];
    this.#triggerListeners(data);

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
    return find(cloneDeep(this.docs), options)
  }

  getFirst() {
    return this.docs[1]
  }

  getById(id) {
    return find(this.docs, { id })
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
    const docs = this.docs.filter(doc => doc.id !== item.id);

    this.docs = [...docs, item];
    this.#triggerListeners(item);

    return {
      docs: this.docs,
      upserted: item
    };
  }

  bulkUpsert(items) {
    const itemIds = items.map(item => item.id);
    const docs = this.docs.filter(doc => !itemIds.includes(doc.id));

    this.docs = [...docs, ...items];
    this.#triggerListeners(items);

    return {
      docs: this.docs,
      upserted: items
    };
  }

  delete(id) {
    const removed = remove(this.docs, doc => doc.id === id);
    this.#triggerListeners(data);

    return {
      status: !!removed ? 'success' : `Not found doc with id ${id}`,
      removed,
      docs: this.docs
    }
  }

  subscribe({ next, keys, options }) {
    if (!next) {
      throw new Error(`Callback is required for subscription function. Please add 'next' function property to subscription configuration.`)
    }

    const config = { next, options };

    keys.forEach(key => {
      this.#listeners[key] = this.#listeners[key] || new Set([]);
      this.#listeners[key].add(config);
    });

    this.#emitListener(this.docs, config);

    return () => {
      keys.forEach(key => {
        this.#listeners[key].delete(config)
      })
    }
  }
}

export default Collection;
