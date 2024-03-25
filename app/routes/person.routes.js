module.exports = (app) => {
    const person = require("../controllers/person.controller.js");
    const { authenticate, getPage } = require("../authorization/authorization.js");
    const router = require("express").Router();
  
    // Create a new Person
    //router.post("/", [authenticate], person.create);
  
    // Retrieve all Persons
    router.get("/", [authenticate, getPage], person.findAll);
  
    // Retrieve a single Person with id
    router.get("/:id", [authenticate], person.findOne);
  
    // Update a Person with id
    //router.put("/:id", [authenticate], person.update);
  
    // Delete a Person with id
    //router.delete("/:id", [authenticate], person.delete);
  
    app.use("/asset-t3/people", router);
};