module.exports = (app) => {
    const assetData = require("../controllers/assetData.controller.js");
    const {
        authenticate,
        getPermissions,
        getEditableCategories,
        getViewableCategories,
        getPage,
    } = require("../authorization/authorization.js");
    const router = require("express").Router();
  
    // Create a new AssetData
    //router.post("/", [authenticate, getPermissions, getEditableCategories], assetData.create);
  
    // Retrieve all AssetData
    router.get("/", [authenticate, getPermissions, getViewableCategories, getPage], assetData.findAll);
  
    // Retrieve a single AssetData with id
    router.get("/:id", [authenticate, getPermissions, getViewableCategories], assetData.findOne);
  
    // Update an AssetData with id
    router.put("/:id", [authenticate, getPermissions, getEditableCategories], assetData.update);
  
    // Delete an AssetData with id
    //router.delete("/:id", [authenticate, getPermissions], assetData.delete);
  
    app.use("/asset-t3/asset-data", router);
};