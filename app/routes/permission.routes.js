module.exports = (app) => {
    const permission = require("../controllers/permission.controller.js");
    const { authenticate } = require("../authorization/authorization.js");
    let router = require("express").Router();
  
    // Create a new Permission
    //router.post("/", [authenticate], permission.create);
  
    // Retrieve all Permissions
    router.get("/", [authenticate], permission.findAll);
  
    // Retrieve a single Permission with id
    router.get("/:id", [authenticate], permission.findOne);
  
    // Update a Permission with id
    router.put("/:id", [authenticate], permission.update);
  
    // Delete a Permission with id
    router.delete("/:id", [authenticate], permission.delete);
  
    app.use("/asset-t3/permissions", router);
};