module.exports = (app) => {
    const fieldListOption = require("../controllers/fieldListOption.controller.js");
    const {
        authenticate,
        getPermissions,
        checkEditFieldList,
        checkDeleteFieldList,
        getPage,
    } = require("../authorization/authorization.js");
    const router = require("express").Router();
  
    // Create a new FieldListOption
    router.post("/", [authenticate, getPermissions, checkEditFieldList], fieldListOption.create);
  
    // Retrieve all FieldListOptions
    router.get("/", [authenticate, getPage], fieldListOption.findAll);
  
    // Retrieve a single FieldListOption with id
    router.get("/:id", [authenticate], fieldListOption.findOne);
  
    // Update a FieldListOption with id
    router.put("/:id", [authenticate, getPermissions, checkEditFieldList], fieldListOption.update);
  
    // Delete a FieldListOption with id
    router.delete("/:id", [authenticate, getPermissions, checkDeleteFieldList], fieldListOption.delete);
  
    app.use("/asset-t3/field-list-options", router);
};