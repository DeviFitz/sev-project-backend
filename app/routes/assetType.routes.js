module.exports = (app) => {
    const assetType = require("../controllers/assetType.controller.js");
    const {
        authenticate,
        getPermissions,
        getCreatableCategories,
        getEditableCategories,
        getViewableCategories,
        getDeletableCategories,
        checkCreateAssetType,
        checkEditAssetType,
        checkDeleteAssetType,
        getPage,
    } = require("../authorization/authorization.js");
    const router = require("express").Router();
  
    // Create a new AssetType
    router.post("/", [authenticate, getPermissions, checkCreateAssetType, getCreatableCategories], assetType.create);
  
    // Retrieve all AssetTypes
    router.get("/", [authenticate, getPermissions, getViewableCategories, getPage], assetType.findAll);
  
    // Retrieve a single AssetType with id
    router.get("/:id", [authenticate, getPermissions, getViewableCategories], assetType.findOne);
  
    // Update an AssetType with id
    router.put("/:id", [authenticate, getPermissions, checkEditAssetType, getEditableCategories], assetType.update);
  
    // Delete an AssetType with id
    router.delete("/:id", [authenticate, getPermissions, checkDeleteAssetType, getDeletableCategories], assetType.delete);
  
    app.use("/asset-t3/asset-types", router);
};