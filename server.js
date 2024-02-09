require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

const db = require("./app/models");

const startup = db.sequelize.sync();

const corsOptions = {
  origin: "http://localhost:8081",
};

app.use(cors(corsOptions));
app.options("*", cors());

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

//#region Get necessary routes
require("./app/routes/alert.routes")(app);
require("./app/routes/alertType.routes")(app);
require("./app/routes/asset.routes")(app);
require("./app/routes/assetCategory.routes")(app);
require("./app/routes/assetData.routes")(app);
require("./app/routes/assetField.routes")(app);
require("./app/routes/assetTemplate.routes")(app);
require("./app/routes/assetType.routes")(app);
require("./app/routes/auth.routes.js")(app);
require("./app/routes/building.routes")(app);
require("./app/routes/fieldList.routes")(app);
require("./app/routes/fieldListOption.routes")(app);
require("./app/routes/group.routes")(app);
require("./app/routes/log.routes")(app);
require("./app/routes/notification.routes")(app);
require("./app/routes/permission.routes")(app);
require("./app/routes/person.routes")(app);
require("./app/routes/room.routes")(app);
require("./app/routes/templateData.routes")(app);
require("./app/routes/user.routes")(app);
require("./app/routes/vendor.routes")(app);
//#endregion

// set port, listen for requests
const PORT = process.env.PORT || 3033;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
  });
}

/**Creates the defaults for the database*/
const determineDefaults = async () => {
  // Wait until database has been synced
  await startup;
  console.log("Database synced!")

  // Create default permissions
  const defaultPermissions = [
    {
      name: "Assign Group",
      description: "Gives permission to assign users in lower priorities to groups.",
    },
    {
      name: "Block User",
      description: "Gives permission to block or unblock users.",
    },
    {
      name: "Change User Permissions",
      description: "Gives permission to change the specific permissions of users in lower-priority groups.",
    },
    {
      name: "Create Asset Profile",
      description: "Gives permission to create asset templates (AKA \"profiles\").",
    },
    {
      name: "Create Asset Type",
      description: "Gives permission to create asset types.",
    },
    {
      name: "Create Category",
      description: "Gives permission to create asset categories.",
    },
    {
      name: "Create Group",
      description: "Gives permission to create groups of a lower or equal priority.",
    },
    {
      name: "Create Location",
      description: "Gives permission to create locations (such as buildings and rooms).",
    },
    {
      name: "Create User",
      description: "Gives permission to create users out of people.",
    },
    {
      name: "Create Vendor",
      description: "Gives permission to create vendors.",
    },
    {
      name: "Delete Asset Profile",
      description: "Gives permission to delete asset templates (AKA \"profiles\").",
    },
    {
      name: "Delete Asset Type",
      description: "Gives permission to delete asset types.",
    },
    {
      name: "Delete Category",
      description: "Gives permission to delete asset categories.",
    },
    {
      name: "Delete Group",
      description: "Gives permission to delete groups of a lower or equal priority.",
    },
    {
      name: "Delete Location",
      description: "Gives permission to delete locations (such as buildings and rooms).",
    },
    {
      name: "Delete Vendor",
      description: "Gives permission to delete vendors.",
    },
    {
      name: "Edit Asset Profile",
      description: "Gives permission to edit asset templates (AKA \"profiles\").",
    },
    {
      name: "Edit Asset Type",
      description: "Gives permission to edit asset types.",
    },
    {
      name: "Edit Category",
      description: "Gives permission to edit asset categories.",
    },
    {
      name: "Edit Group",
      description: "Gives permission to edit groups of a lower or equal priority.",
    },
    {
      name: "Edit Location",
      description: "Gives permission to edit locations (such as buildings and rooms).",
    },
    {
      name: "Edit Vendor",
      description: "Gives permission to edit vendors.",
    },
    {
      name: "Remove User",
      description: "Gives permission to remove a user status from people in lower-priority groups."
    },
    {
      name: "Super Assign Group",
      description: "Gives permission to assign users in equal or lower priorities to groups.",
    },
    {
      name: "Super Change User Permissions",
      description: "Gives permission to change the specific permissions of users in equal- or lower-priority groups.",
    },
    {
      name: "Super Remove User",
      description: "Gives permission to remove a user status from people in equal- or lower-priority groups."
    },
    {
      name: "View User",
      description: "Gives permission to view a user's permissions and other user-specific data."
    },
  ];

  // Make sure the default permissions exist
  const permissions = await Promise.all(defaultPermissions.map(async (def) => (await db.permission.findOrCreate({
    where: {
      name: def.name
    },
    defaults: def,
  }))?.[0]));
  
  // Create default super user group & assign permissions
  const superUser = (await db.group.findOrCreate({
    where: { name: "Super User" },
    defaults: { priority: 0 },
  }))?.[0];

  // Add all permissions to super user
  await superUser.addPermissions(permissions);
  
  console.log("Defaults uploaded!");
};
determineDefaults();

module.exports = app;
