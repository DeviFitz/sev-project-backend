module.exports = (app) => {
    const fieldList = require("../controllers/fieldList.controller.js");
    const {
        authenticate,
        getPermissions,
        checkCreateFieldList,
        checkEditFieldList,
        checkDeleteFieldList,
        getPage,
    } = require("../authorization/authorization.js");
    const router = require("express").Router();
  
    // Create a new FieldList
    router.post("/", [authenticate, getPermissions, checkCreateFieldList], fieldList.create);
  
    // Retrieve all FieldLists
    router.get("/", [authenticate, getPermissions, getPage], fieldList.findAll);
  
    // Retrieve a single FieldList with id
    router.get("/:id", [authenticate, getPermissions], fieldList.findOne);
  
    // Update a FieldList with id
    router.put("/:id", [authenticate, getPermissions, checkEditFieldList], fieldList.update);
  
    // Delete a FieldList with id
    router.delete("/:id", [authenticate, getPermissions, checkDeleteFieldList], fieldList.delete);
  
    app.use("/asset-t3/field-lists", router);
};