module.exports = (app) => {
    const assetTemplate = require("../controllers/assetTemplate.controller.js");
    const {
        authenticate,
        getPermissions,
        getCreatableCategories,
        getEditableCategories,
        getViewableCategories,
        getDeletableCategories,
        checkCreateTemplate,
        checkEditTemplate,
        checkDeleteTemplate,
        getPage,
    } = require("../authorization/authorization.js");
    const router = require("express").Router();
  
    // Create a new AssetTemplate
    router.post("/", [authenticate, getPermissions, checkCreateTemplate, getCreatableCategories], assetTemplate.create);
  
    // Retrieve all AssetTemplates
    router.get("/", [authenticate, getPermissions, getViewableCategories, getPage], assetTemplate.findAll);
  
    // Retrieve a single AssetTemplate with id
    router.get("/:id", [authenticate, getPermissions, getViewableCategories], assetTemplate.findOne);
  
    // Update an AssetTemplate with id
    router.put("/:id", [authenticate, getPermissions, checkEditTemplate, getEditableCategories], assetTemplate.update);
  
    // Delete an AssetTemplate with id
    router.delete("/:id", [authenticate, getPermissions, checkDeleteTemplate, getDeletableCategories], assetTemplate.delete);
  
    app.use("/asset-t3/asset-templates", router);
};