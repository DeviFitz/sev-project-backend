module.exports = (app) => {
  const user = require("../controllers/user.controller.js");
  const {
    authenticate,
    getPermissions,
    checkCreateUser,
    checkViewUser,
    getEditUserPerms,
    checkRemoveUser,
    getPage,
  } = require("../authorization/authorization.js");
  const router = require("express").Router();

  // Create a new User
  router.post("/", [authenticate, getPermissions, checkCreateUser], user.create);

  // Retrieve all People
  router.get("/", [authenticate, getPermissions, checkViewUser, getPage], user.findAll);

  // Retrieve a single User with id
  router.get("/:id", [authenticate, getPermissions, checkViewUser], user.findOne);

  // Update a User with id
  router.put("/:id", [authenticate, getPermissions, getEditUserPerms], user.update);

  // Delete a User with id
  router.delete("/:id", [authenticate, getPermissions, checkRemoveUser], user.delete);

  app.use("/asset-t3/users", router);
};
