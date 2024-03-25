const { authenticate } = require("../authorization/authorization.js");

module.exports = (app) => {
  const auth = require("../controllers/auth.controller.js");
  const router = require("express").Router();

  // Login
  router.post("/login", auth.login);

  // Authorization
  router.post("/authorize", [authenticate], (req, res) => res.send({ message: "Session is still valid!" }));

  // Logout
  router.post("/logout", auth.logout);

  app.use("/asset-t3", router);
};
