import Collection from './collection';

class ClientDB {
  createCollection(name) {
    if (!name) {
      const msg = 'Name is required for collection. Please set name of collection as argument.';

      throw new Error(msg)
    }

    this[name] = new Collection({ name });

    return this[name];
  }

  deleteCollection(name) {
    delete this[name];
  }
}

export default ClientDB;



