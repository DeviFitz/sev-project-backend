module.exports = (app) => {
    const vendor = require("../controllers/vendor.controller.js");
    const {
        authenticate,
        getPermissions,
        checkCreateVendor,
        checkEditVendor,
        checkDeleteVendor,
        getPage,
    } = require("../authorization/authorization.js");
    const router = require("express").Router();
  
    // Create a new Vendor
    router.post("/", [authenticate, getPermissions, checkCreateVendor], vendor.create);
  
    // Retrieve all Vendors
    router.get("/", [authenticate, getPage], vendor.findAll);
  
    // Retrieve a single Vendor with id
    router.get("/:id", [authenticate], vendor.findOne);
  
    // Update a Vendor with id
    router.put("/:id", [authenticate, getPermissions, checkEditVendor], vendor.update);
  
    // Delete a Vendor with id
    router.delete("/:id", [authenticate, getPermissions, checkDeleteVendor], vendor.delete);
  
    app.use("/asset-t3/vendors", router);
};