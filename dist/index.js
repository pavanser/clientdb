import Collection from './collection';

class ClientDB {
  constructor() {
    _db.set(this, {
      writable: true,
      value: void 0
    });
  }

  createCollection(name) {
    this[name] = new Collection({
      name
    });
    return this[name];
  }

  deleteCollection(name) {
    delete this[name];
  }

}

var _db = new WeakMap();

export const Werkin = new ClientDB();