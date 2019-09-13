import Collection from './collection';

class ClientDB {
  #db;

  createCollection(name) {
    this[name] = new Collection({ name });

    return this[name];
  }

  deleteCollection(name) {
    delete this[name];
  }
}

export default ClientDB;



