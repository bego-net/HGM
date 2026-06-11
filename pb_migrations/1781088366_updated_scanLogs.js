/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("scanlogs0000000")

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": true,
    "collectionId": "registrants0000",
    "help": "",
    "hidden": false,
    "id": "relation1794722373",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "registrantId",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "help": "",
    "hidden": false,
    "id": "select251721662",
    "maxSelect": 1,
    "name": "checkpoint",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "entry",
      "lunch"
    ]
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "help": "",
    "hidden": false,
    "id": "date3042050845",
    "max": "",
    "min": "",
    "name": "scannedAt",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text3771608163",
    "max": 0,
    "min": 0,
    "name": "scannedBy",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("scanlogs0000000")

  // remove field
  collection.fields.removeById("relation1794722373")

  // remove field
  collection.fields.removeById("select251721662")

  // remove field
  collection.fields.removeById("date3042050845")

  // remove field
  collection.fields.removeById("text3771608163")

  return app.save(collection)
})
