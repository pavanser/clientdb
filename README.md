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
response = { 
  all_docs: ['docs_with_added_data'],
  added_doc: { /** doc which you have add */ },
  status: "success" 
}
```

```js
YOUR_DB_NAME_HERE.some_collection_name.bulkAdd('array_here');
```
Return:
```js

response = { 
  all_docs: ['docs_with_added_data'],
  status: 'success',
  added_docs: [ /** Your added docs */ ]
}
```
In case if you use `bulkAdd` and some of added data already exists at the store, will be added only uniq data, and you will get next response: 

```js
rsponse = {
  added_docs: ['only docs which have been added'],
  all_docs:  ['docs_with_updated_data'],
  status: 'added with warnings'
}
```

For updating use:

```js
    YOUR_DB_NAME_HERE.some_collection_name.update('object_here');
```

Response for update:

```js
response = {
  all_docs: [/** docs_with_updated_data */],
  updated_doc: {/** Updated doc */},
  old_doc: {/** Doc before update */},
  status: 'success'
}
```

For updating two or more docs use bulk update:

```js
    YOUR_DB_NAME_HERE.some_collection_name.bulkUpdate('array_here');
```

Response for bulk updating:

```js
response = {
  all_docs: [/** docs_with_updated_data */],
  updated_docs: [/** Updated docs */],
  old_docs: [/** Docs before update */],
  status: 'success'
}
```

In case if during updating some doc or docs will not be founded, they will be passed and you will get response:

```js
response = {
  all_docs: [/** docs_with_updated_data */],
  updated_docs: [/** Only updated docs */],
  old_docs: [/** Docs before update which was updated */],
  passed_data: [ /** Docs whic were not founded */ ],
  status: "Not existed docs were not updated"
}
```

Sometimes you need add some data and update existed data, but not remove else data. For this you can use:

```js
YOUR_DB_NAME_HERE.some_collection_name.upsert('object_here');
```
Return:
```js
response = {
  all_docs: this.docs,
  upserted_doc: { /** Added or updated doc */ },
  status: 'success'
 }
```

```js
YOUR_DB_NAME_HERE.some_collection_name.bulkUpsert('array_here');
```
Both methods will return:
```js

response = { 
  all_docs: ['docs_with_updated_data'],
  upserted_docs:  [ /** Added or updated docs */],
  status: 'success'
}
```

If you need just get all docs from collection, you can do it by next way:

```js
YOUR_DB_NAME_HERE.some_collection_name.docs;
```

But some times you need not only get all docs but sort or limit them. So you can use

```js
YOUR_DB_NAME_HERE.some_collection_name.getAll();
```
These methods are start of chain. But if you want to finish it use `exec()`. It return data.

Also you may want take some filtered data, you can use `where` method got this.
As argument you coud set an object or filter function which shoud return `true` or `false`.
```js
YOUR_DB_NAME_HERE.some_collection_name.where('filter options here, object with required fields or filter function');
```

In some cases you need to get first element of collection, for this you could use
```js
YOUR_DB_NAME_HERE.some_collection_name.getFirst();
```

In some cases you want to get one doc by id or by some fields:
```js
YOUR_DB_NAME_HERE.some_collection_name.getById(/** doc id */);
```

if you nedd fine some doc by specific params you can use 
```js
YOUR_DB_NAME_HERE.some_collection_name.getOne('filter options here, object with required fields or filter function');

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

Also subscription could get options `clustered_changes` and `clustered_all`, they are boolean
and `false` by default.

- `clustered_changes` - if `false` will just return array of updated items. If true then this items will be wrapped at
the cluster, which you can sort offset or limit; Then you will need to execute it by `exec()`;

- `clustered_all` - same as with `clustered_changes` but with all docs.

#### Collection chain's

Cluster instance have next methods.

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