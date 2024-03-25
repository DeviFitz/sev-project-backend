module.exports = (app) => {
    const alert = require("../controllers/alert.controller.js");
    const {
        authenticate,
        getPermissions,
        getEditableCategories,
        getViewableCategories,
        getDeletableCategories,
        getPage,
    } = require("../authorization/authorization.js");
    const router = require("express").Router();
  
    // Create a new Alert
    router.post("/", [authenticate, getPermissions, getEditableCategories], alert.create);
  
    // Retrieve all Alerts
    router.get("/", [authenticate, getPermissions, getViewableCategories, getPage], alert.findAll);
  
    // Retrieve a single Alert with id
    router.get("/:id", [authenticate, getPermissions, getViewableCategories], alert.findOne);
  
    // Update an Alert with id
    router.put("/:id", [authenticate, getPermissions, getEditableCategories], alert.update);
  
    // Delete an Alert with id
    router.delete("/:id", [authenticate, getPermissions, getDeletableCategories], alert.delete);
  
    app.use("/asset-t3/alerts", router);
};