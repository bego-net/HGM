/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("scanlogs0000000")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.collectionId = \"admins000000000\"",
    "deleteRule": "@request.auth.collectionId = \"admins000000000\"",
    "listRule": "@request.auth.collectionId = \"admins000000000\"",
    "updateRule": "@request.auth.collectionId = \"admins000000000\"",
    "viewRule": "@request.auth.collectionId = \"admins000000000\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("scanlogs0000000")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.collectionName = \"admins\"",
    "deleteRule": "@request.auth.collectionName = \"admins\"",
    "listRule": "@request.auth.collectionName = \"admins\"",
    "updateRule": "@request.auth.collectionName = \"admins\"",
    "viewRule": "@request.auth.collectionName = \"admins\""
  }, collection)

  return app.save(collection)
})
