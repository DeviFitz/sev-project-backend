module.exports = (app) => {
    const alertType = require("../controllers/alertType.controller.js");
    const {
        authenticate,
        getPermissions,
        checkCreateAlertType,
        checkEditAlertType,
        checkDeleteAlertType,
        getPage,
    } = require("../authorization/authorization.js");
    const router = require("express").Router();
  
    // Create a new AlertType
    router.post("/", [authenticate, getPermissions, checkCreateAlertType], alertType.create);
  
    // Retrieve all AlertTypes
    router.get("/", [authenticate, getPage], alertType.findAll);
  
    // Retrieve a single AlertType with id
    router.get("/:id", [authenticate], alertType.findOne);
  
    // Update an AlertType with id
    router.put("/:id", [authenticate, getPermissions, checkEditAlertType], alertType.update);
  
    // Delete an AlertType with id
    router.delete("/:id", [authenticate, getPermissions, checkDeleteAlertType], alertType.delete);
  
    app.use("/asset-t3/alert-types", router);
};