module.exports = (app) => {
    const log = require("../controllers/log.controller.js");
    const {
        authenticate,
        getPermissions,
        getEditableCategories,
        getViewableCategories,
        getDeletableCategories,
        getPage,
    } = require("../authorization/authorization.js");
    const router = require("express").Router();
  
    // Create a new Log
    router.post("/", [authenticate, getPermissions, getEditableCategories], log.create);
  
    // Retrieve all Logs
    router.get("/", [authenticate, getPermissions, getViewableCategories, getPage], log.findAll);
  
    // Retrieve a single Log with id
    router.get("/:id", [authenticate, getPermissions, getViewableCategories], log.findOne);
  
    // Update a Log with id
    router.put("/:id", [authenticate, getPermissions, getEditableCategories], log.update);
  
    // Delete a Log with id
    router.delete("/:id", [authenticate, getPermissions, getDeletableCategories], log.delete);
  
    app.use("/asset-t3/logs", router);
};