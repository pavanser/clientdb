import intersectionWith from 'lodash/intersectionWith';
import filter from 'lodash/filter';
import isEqual from 'lodash/isEqual';
import find from 'lodash/find';
import uniqWith from 'lodash/uniqWith';
import Cluster from './cluster';

class Collection {
  #listeners;

  constructor(options){
    this.name = options.name;
    this.docs = [];
    this.schema = options.schema;

    this.#listeners = []
  }

  add(data){
    const intersected = intersectionWith(this.docs, [data], isEqual);

    if (intersected.length) {
      throw new Error('Current object already present in this collection');
    }

    this.docs = [...this.docs, data];
    this.#listeners.forEach(listener => {
      listener(this.docs);
    });

    return { docs: this.docs };
  }

  bulkAdd(data) {
    const intersected = intersectionWith(this.docs, [data], isEqual);

    data = uniqWith([...intersected, ...data]);

    this.docs = [...this.docs, ...data];

    if (intersected.length) {
      return {
        docs: this.docs,
        status: 'added with warnings',
        warning: 'Some data was not added because it is already in collection'
      };
    }

    this.#listeners.forEach(listener => {
      listener(this.docs);
    });

    return {
      docs: this.docs,
      status: 'success'
    };
  }

  getAll() {
    return new Cluster(this.docs);
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

    const uniqData = uniqWith([...this.docs, field]);
    const updatedField = { ...field, ...data};

    this.docs = [...uniqData, updatedField];

    this.#listeners.forEach(listener => {
      listener(this.docs);
    });

    return { docs: this.docs };
  }

  bulkUpdate(data) {
    this.docs  = this.docs.map(doc => ({...doc, data}));

    this.#listeners.forEach(listener => {
      listener(this.docs);
    });

    return {
      docs: this.docs,
      status: 'success'
    };
  }

  upsert(data) {
    const unique_data = uniqWith([...this.docs, data], isEqual);

    this.docs = [...unique_data, data];

    this.#listeners.forEach(listener => {
      listener(this.docs);
    });

    return { docs: this.docs };
  }

  bulkUpsert(data) {
    const unique_data = uniqWith([...this.docs, ...data], isEqual);

    this.docs = [...unique_data, data];

    this.#listeners.forEach(listener => {
      listener(this.docs);
    });

    return { docs: this.docs };
  }

  subscribe(cb) {
    this.#listeners.push(cb);

    return () => { this.#listeners.delete(cb) }
  }
}

export default Collection;
