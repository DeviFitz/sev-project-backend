module.exports = (app) => {
    const group = require("../controllers/group.controller.js");
    const { authenticate } = require("../authorization/authorization.js");
    let router = require("express").Router();
  
    // Create a new Group
    router.post("/", [authenticate], group.create);
  
    // Retrieve all Groups
    router.get("/", [authenticate], group.findAll);
  
    // Retrieve a single Group with id
    router.get("/:id", [authenticate], group.findOne);
  
    // Update a Group with id
    router.put("/:id", [authenticate], group.update);
  
    // Delete a Group with id
    router.delete("/:id", [authenticate], group.delete);
  
    app.use("/asset-t3/groups", router);
};