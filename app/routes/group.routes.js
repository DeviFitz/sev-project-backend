module.exports = (app) => {
    const group = require("../controllers/group.controller.js");
    const {
        authenticate,
        getPermissions,
        checkCreateGroup,
        checkEditGroup,
        checkDeleteGroup,
        getPage,
    } = require("../authorization/authorization.js");
    const router = require("express").Router();
  
    // Create a new Group
    router.post("/", [authenticate, getPermissions, checkCreateGroup], group.create);
  
    // Retrieve all Groups
    router.get("/", [authenticate, getPage], group.findAll);
  
    // Retrieve a single Group with id
    router.get("/:id", [authenticate], group.findOne);
  
    // Update a Group with id
    router.put("/:id", [authenticate, getPermissions, checkEditGroup], group.update);
  
    // Delete a Group with id
    router.delete("/:id", [authenticate, getPermissions, checkDeleteGroup], group.delete);
  
    app.use("/asset-t3/groups", router);
};