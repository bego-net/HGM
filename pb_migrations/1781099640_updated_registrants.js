/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("registrants0000")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("registrants0000")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.collectionId = \"admins000000000\"",
    "viewRule": "@request.auth.collectionId = \"admins000000000\""
  }, collection)

  return app.save(collection)
})
