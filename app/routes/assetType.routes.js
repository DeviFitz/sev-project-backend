module.exports = (app) => {
    const assetType = require("../controllers/assetType.controller.js");
    const { authenticate } = require("../authorization/authorization.js");
    let router = require("express").Router();
  
    // Create a new AssetType
    router.post("/", [authenticate], assetType.create);
  
    // Retrieve all AssetTypes
    router.get("/", [authenticate], assetType.findAll);
  
    // Retrieve a single AssetType with id
    router.get("/:id", [authenticate], assetType.findOne);
  
    // Update an AssetType with id
    router.put("/:id", [authenticate], assetType.update);
  
    // Delete an AssetType with id
    router.delete("/:id", [authenticate], assetType.delete);
  
    app.use("/asset-t3/asset-types", router);
};