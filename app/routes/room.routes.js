module.exports = (app) => {
    const room = require("../controllers/room.controller.js");
    const {
        authenticate,
        getPermissions,
        getCreatableCategories,
        getEditableCategories,
        getDeletableCategories,
        getPage,
    } = require("../authorization/authorization.js");
    const router = require("express").Router();
  
    // Create a new Room
    router.post("/", [authenticate, getPermissions, getCreatableCategories], room.create);
  
    // Retrieve all Rooms
    router.get("/", [authenticate, getPage], room.findAll);
  
    // Retrieve a single Room with id
    router.get("/:id", [authenticate], room.findOne);
  
    // Update a Room with id
    router.put("/:id", [authenticate, getPermissions, getEditableCategories], room.update);
  
    // Delete a Room with id
    router.delete("/:id", [authenticate, getPermissions, getDeletableCategories], room.delete);
  
    app.use("/asset-t3/rooms", router);
};