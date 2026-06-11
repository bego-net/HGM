/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("admins000000000")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.collectionId = \"admins000000000\"",
    "viewRule": "@request.auth.collectionId = \"admins000000000\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("admins000000000")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.collectionName = \"admins\"",
    "viewRule": "@request.auth.collectionName = \"admins\""
  }, collection)

  return app.save(collection)
})
