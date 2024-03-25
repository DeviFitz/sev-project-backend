const dbConfig = require("../config/db.config.js");
const Sequelize = require("sequelize");
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle,
  },
  logging: dbConfig.logging,
});
const db = {
  Sequelize,
  sequelize,
};

//#region AddTables
db.alert = require("./alert.model.js")(sequelize, Sequelize);
db.alertType = require("./alertType.model.js")(sequelize, Sequelize);
db.asset = require("./asset.model.js")(sequelize, Sequelize);
db.assetCategory = require("./assetCategory.model.js")(sequelize, Sequelize);
db.assetData = require("./assetData.model.js")(sequelize, Sequelize);
db.assetField = require("./assetField.model.js")(sequelize, Sequelize);
db.assetTemplate = require("./assetTemplate.model.js")(sequelize, Sequelize);
db.assetType = require("./assetType.model.js")(sequelize, Sequelize);
db.building = require("./building.model.js")(sequelize, Sequelize);
db.fieldList = require("./fieldList.model.js")(sequelize, Sequelize);
db.fieldListOption = require("./fieldListOption.model.js")(sequelize, Sequelize);
db.group = require("./group.model.js")(sequelize, Sequelize);
db.log = require("./log.model.js")(sequelize, Sequelize);
db.notification = require("./notification.model.js")(sequelize, Sequelize);
db.permission = require("./permission.model.js")(sequelize, Sequelize);
db.person = require("./person.model.js")(sequelize, Sequelize);
db.room = require("./room.model.js")(sequelize, Sequelize);
db.session = require("./session.model.js")(sequelize, Sequelize);
db.templateData = require("./templateData.model.js")(sequelize, Sequelize);
db.user = require("./user.model.js")(sequelize, Sequelize);
db.vendor = require("./vendor.model.js")(sequelize, Sequelize);
//#endregion

//#region ForeignKeys
// Foreign keys for Alert
db.alert.belongsTo(
  db.alertType,
  { 
    as: "type",
    foreignKey: {
      name: "typeId",
      allowNull: false,
    },
    onDelete: "CASCADE",
    hooks: true,
  }
);
db.alert.belongsTo(
  db.asset,
  { 
    as: "asset",
    foreignKey: {
      name: "assetId",
      allowNull: false,
    },
    onDelete: "CASCADE",
    hooks: true,
  }
);

// Foreign keys for Alert Type
// None!

// Foreign keys for Asset
db.asset.belongsTo(
  db.assetTemplate,
  { 
    as: "template",
    foreignKey: {
      name: "templateId",
      allowNull: true,
    },
    onDelete: "RESTRICT",
    hooks: true,
  }
);
db.asset.belongsTo(
  db.assetType,
  { 
    as: "type",
    foreignKey: {
      name: "typeId",
      allowNull: false,
    },
    onDelete: "RESTRICT",
    hooks: true,
  }
);
db.asset.belongsTo(
  db.person,
  { 
    as: "borrower",
    foreignKey: {
      name: "borrowerId",
      allowNull: true,
    },
    onDelete: "RESTRICT",
    hooks: true,
  }
);
db.asset.belongsTo(
  db.room,
  { 
    as: "location",
    foreignKey: {
      name: "locationId",
      allowNull: true,
    },
    onDelete: "RESTRICT",
    hooks: true,
  }
);
db.asset.hasMany(
  db.alert,
  { 
    as: "alerts",
    foreignKey: "assetId",
  }
);
db.asset.hasMany(
  db.assetData,
  {
    as: "data",
    foreignKey: { 
      name: "assetId",
      allowNull: false,
    },
    onDelete: "CASCADE",
    hooks: true,
  }
);
db.asset.hasMany(
  db.log,
  {
    as: "logs",
    foreignKey: {
      name: "assetId",
      allowNull: false,
    },
    onDelete: "CASCADE",
    hooks: true,
  }
)

// Foreign keys for Asset Category
db.assetCategory.hasMany(
  db.permission,
  {
    as: "permissions",
    foreignKey: {
      name: "categoryId",
      allowNull: true,
    },
    onDelete: "CASCADE",
    hooks: true,
  }
);

// Foreign keys for Asset Data
db.assetData.belongsTo(
  db.asset,
  { 
    as: "asset",
    foreignKey: "assetId",
  }
);
db.assetData.belongsTo(
  db.assetField,
  { 
    as: "field",
    foreignKey: {
      name: "fieldId",
      allowNull: false,
    },
    onDelete: "CASCADE",
    hooks: true,
  }
);

// Foreign keys for Asset Field
db.assetField.belongsTo(
  db.assetType,
  { 
    as: "assetType",
    foreignKey: {
      name: "assetTypeId",
      allowNull: false,
    },
    onDelete: "CASCADE",
    hooks: true,
  }
);
db.assetField.belongsTo(
  db.fieldList,
  { 
    as: "fieldList",
    foreignKey: {
      name: "fieldListId",
      allowNull: true,
    },
    onDelete: "RESTRICT",
    hooks: true,
  }
);
db.assetField.hasMany(
  db.assetData,
  { 
    as: "assetData",
    foreignKey: "fieldId",
  }
);
db.assetField.hasMany(
  db.templateData,
  { 
    as: "templateData",
    foreignKey: {
      name: "fieldId",
      allowNull: false,
    },
    onDelete: "CASCADE",
    hooks: true,
  }
);

// Foreign keys for Asset Template
db.assetTemplate.belongsTo(
  db.assetType,
  { 
    as: "assetType",
    foreignKey: {
      name: "assetTypeId",
      allowNull: false,
    },
    onDelete: "RESTRICT",
    hooks: true,
  }
);
db.assetTemplate.hasMany(
  db.templateData,
  { 
    as: "data",
    foreignKey: {
      name: "templateId",
      allowNull: false,
    },
    onDelete: "CASCADE",
    hooks: true,
  }
);

// Foreign keys for Asset Type
db.assetType.belongsTo(
  db.assetCategory,
  { 
    as: "category",
    foreignKey: {
      name: "categoryId",
      allowNull: false,
    },
    onDelete: "RESTRICT",
    hooks: true,
  }
);
db.assetType.belongsTo(
  db.assetField,
  { 
    as: "identifier",
    foreignKey: {
      name: "identifierId",
      allowNull: true,
    },
    onDelete: "CASCADE",
    hooks: true,
  }
);
db.assetType.hasMany(
  db.assetField,
  { 
    as: "fields",
    foreignKey: "assetTypeId",
  }
);

// Foreign keys for Building
db.building.belongsTo(
  db.asset,
  { 
    as: "asset",
    foreignKey: {
      name: "assetId",
      allowNull: false,
    },
    onDelete: "CASCADE",
    hooks: true,
  }
);
db.building.hasMany(
  db.room,
  { 
    as: "rooms",
    foreignKey: {
      name: "buildingId",
      allowNull: false,
    },
    onDelete: "RESTRICT",
    hooks: true,
  }
);

// Foreign keys for Field List
// None!

// Foreign keys for Field List Option
db.fieldListOption.belongsTo(
  db.fieldList,
  { 
    as: "list",
    foreignKey: {
      name: "listId",
      allowNull: false,
    },
    onDelete: "CASCADE",
    hooks: true,
  }
);

// Foreign keys for Group
db.group.belongsToMany(
  db.permission,
  { through: "groupPermission" }
);

// Foreign keys for Log
db.log.belongsTo(
  db.asset,
  { 
    as: "asset",
    foreignKey: "assetId",
  }
);
db.log.belongsTo(
  db.user,
  { 
    as: "author",
    foreignKey: {
      name: "authorId",
      allowNull: false,
    },
    onDelete: "RESTRICT",
    hooks: true,
  }
);
db.log.belongsTo(
  db.person,
  { 
    as: "person",
    foreignKey: {
      name: "personId",
      allowNull: true,
    },
    onDelete: "RESTRICT",
    hooks: true,
  }
);
db.log.belongsTo(
  db.vendor,
  { 
    as: "vendor",
    foreignKey: {
      name: "vendorId",
      allowNull: true,
    },
    onDelete: "RESTRICT",
    hooks: true,
  }
);

// Foreign keys for Notification
db.notification.belongsTo(
  db.user,
  { 
    as: "user",
    foreignKey: {
      name: "userId",
      allowNull: false,
    },
    onDelete: "CASCADE",
    hooks: true,
  }
);

// Foreign keys for Permission
db.permission.belongsTo(
  db.assetCategory,
  {
    as: "category",
    foreignKey: "categoryId",
  }
);

// Foreign keys for Person
db.person.hasMany(
  db.asset,
  {
    as: "borrowedAssets",
    foreignKey: "borrowerId",
  }
);
db.person.hasOne(
  db.user,
  { 
    as: "user",
    foreignKey: {
      name: "personId",
      allowNull: false,
    },
    onDelete: "CASCADE",
    hooks: true,
  }
);

// Foreign keys for Room
db.room.belongsTo(
  db.building,
  { 
    as: "building",
    foreignKey: "buildingId",
  }
);
db.room.hasMany(
  db.asset,
  {
    as: "assets",
    foreignKey: "locationId",
  }
);

// Foreign keys for Session
db.session.belongsTo(
  db.user,
  { 
    as: "user",
    foreignKey: {
      name: "userId",
      allowNull: false,
    },
    onDelete: "CASCADE",
    hooks: true,
  }
);

// Foreign keys for Template Data
db.templateData.belongsTo(
  db.assetTemplate,
  { 
    as: "template",
    foreignKey: "templateId",
  }
);
db.templateData.belongsTo(
  db.assetField,
  { 
    as: "field",
    foreignKey: "fieldId",
  }
);

// Foreign keys for User
db.user.belongsTo(
  db.group,
  { 
    as: "group",
    foreignKey: {
      name: "groupId",
      allowNull: true,
    },
    onDelete: "RESTRICT",
    hooks: true,
  }
);
db.user.belongsToMany(
  db.permission,
  { through: "userPermission" }
);
db.user.belongsTo(
  db.person,
  { 
    as: "person",
    foreignKey: "personId",
  }
);

// Foreign keys for Vendor
// None!
//#endregion

module.exports = db;
