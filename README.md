### CLIENT DB

#### Instalation

This package gives you possibility to create your own client database and work with it.
All what yHERE.createCollection('some_collection_name');

```
 npm i @pavanser/clientdb 
 // or
 yarn add @pavanser/clientdb
```

#### Collections:

You need add data to the collection so:

```js
YOUR_DB_NAME_HERE.some_collection_name.add('object_here');
```
Return:
```js
{ docs: ['docs_with_added_data'] }
```

```js
YOUR_DB_NAME_HERE.some_collection_name.bulkAdd('array_here');
```
Return:
```js

{ 
  docs: ['docs_with_added_data'],
  status: 'success'
}
```
In case if you use `bulkAdd` and some of added data already exists at the store, will be added only uniq data, and you will get next response: 

```js
{
  added: ['added_data'],
  docs:  ['docs_with_updated_data'],
  status: 'added with warnings',
  warning: 'Some data was not added because it is already in collection'
}
```


For updating use:

```js
    YOUR_DB_NAME_HERE.some_collection_name.update('object_here');
    YOUR_DB_NAME_HERE.some_collection_name.bulkUpdate('array_here');
```

Response for update:

```js
{
  docs: [/** docs_with_updated_data */],
  updated: {/** Updated field */},
  old: {/** Field before update */},
}
```

Sometimes you need add some data and update existed data, but not remove else data. For this you can use:

```js
YOUR_DB_NAME_HERE.some_collection_name.upsert('object_here');
```
Return:
```js
{
  docs: this.docs,
  upserted: /** Added or updated data */
 }
```

```js
YOUR_DB_NAME_HERE.some_collection_name.bulkUpsert('array_here');
```
Both methods will return:
```js

{ 
  docs: ['docs_with_updated_data'],
  upserted:  /** Added or updated data */
}
```

Data from collections could be get by 2 methods.

```js
YOUR_DB_NAME_HERE.some_collection_name.getAll().exec();
YOUR_DB_NAME_HERE.some_collection_name.where({ 'filter options here' });
```
These methods are start of chain. But if you want to finish it use `exec()`. It will return Promise with data.

```js
YOUR_DB_NAME_HERE.some_collection_name.getAll().exec().then( data => { /** ... */ } );
YOUR_DB_NAME_HERE.some_collection_name.where({ /** filter options here */ }).exec().then( data => { /** ... */ } );
```

In some cases you need to get first element of collection, for this you could use
```js
YOUR_DB_NAME_HERE.some_collection_name.getFirst();
```

In some cases you want to get one doc by id or by some fields:
```js
YOUR_DB_NAME_HERE.some_collection_name.getById(/** doc id */);
YOUR_DB_NAME_HERE.some_collection_name.getOne({ title: 'foo', desc: 'bar' });
```
These methods will return you first matches at your collection.

#### Subscriptions
You can subscribe on changes at the collection by fields. If some field will be changed,
listeners who listen this filed update will be triggered. for one listener could be set 
unlimited list of fields.

```js
YOUR_DB_NAME_HERE
.some_collection_name
.subscribe({
  next:({ all_docs: [], updated: [] }) => { /** doc id */ },
  keys: ['title', 'desc'],
  options: {}
});
```

When you subscribe, it will be triggered and return you arrays with docs.

Also subscription could get options `clustered_updated` and `clustered_all`, they are boolean
and `false` by default.

- `clustered_updated` - if `false` will just return array of updated items. If true then this items will be wrapped at
the cluster, which you can sort offset or limit; Then you will need to execute it by `exec()`;

- `clustered_all` - same as with `clustered_updated` but with all docs.

#### Collection chain's

Between `getAll` and `exec` could be used chain methods:

- sort - this method is sorting data by fields at the array. At the second argument ( this is optional ) you could describe direction of sorting `desc` or `asc` for fields one by one;
- limit - this method will return only number of arguments according with a didgit at the arguments.
- offset - this is helper for `limit` method and it takes in argument from where limit should count elements. It should be executed before `limit`.

```js
YOUR_DB_NAME_HERE
  .some_collection_name
  .getAll()
  .sort('name') // Will be sorted by name field
   .limit(9) // Will be take 9 items from 0
  .then( data => { /** ... */ } );

YOUR_DB_NAME_HERE
  .some_collection_name
  .where({ /** filter options here */ })
  .offset(9) // start index for limit is 8
  .sort('name') // Will be sorted by name field
  .limit(9) // Will be take 9 items from 8th
  .exec()
  .then( data => { /** ... */ } );
```