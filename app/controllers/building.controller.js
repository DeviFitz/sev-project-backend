const db = require("../models");
const { displayAssetIncludes } = require("./asset.controller");
const Building = db.building;

// Create and Save a new Building
exports.create = async (req, res) => {
  // Validate request
  if (!req.body.abbreviation || !req.body.assetId) {
    return res.status(400).send({
      message: "Content cannot be empty!",
    });
  }

  // Create a Building
  const building = {
    id: req.body.id,
    abbreviation: req.body.abbreviation,
    assetId: req.body.assetId,
  };

  const type = await db.asset.findByPk(building.assetId, {
    attributes: ["id"],
    include: {
      model: db.assetType,
      as: "type",
      attributes: [],
      where: { categoryId: req.requestingUser.dataValues.creatableCategories },
      required: true,
    }
  });

  if (!type) return res.status(400).send({
    message: "Error creating building! Maybe user is unauthorized.",
  });

  // Save Building in the database
  Building.create(building)
  .then((data) => {
    res.send(data);
  })
  .catch((err) => {
    res.status(500).send({
      message: err.message || "Some error occurred while creating the building.",
    });
  });
};

// Retrieve all Buildings from the database.
exports.findAll = (req, res) => {
  Building.findAll({
    ...req.paginator,
  })
  .then((data) => {
    res.send(data);
  })
  .catch((err) => {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving buildings.",
    });
  });
};

// Find a single Building with an id
exports.findOne = async (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid building id!",
  });

  const full = req.query?.full != undefined;
  const includes = [];
  if (full) {
    const userGroup = !((req.requestingUser.dataValues.groupExpiration ?? undefined) <= new Date()) ?
    await db.group.findByPk(req.requestingUser.dataValues.groupId)
    : undefined;
    req.requestingUser.dataValues.groupPriority = userGroup?.priority;
    
    // Get user's permissions
    const permissions = new Set([
      ...(await req.requestingUser.getPermissions()),
      ...((await userGroup?.getPermissions()) ?? [])
    ]);

    const viewableCats = [...permissions.values()]
    .filter(permission => !!permission.categoryId && permission.name.match(/View/i)?.length > 0)
    .map(permission => permission.categoryId);

    includes.push(...[
      {
        model: db.room,
        as: "rooms",
        include: {
          model: db.asset,
          as: "assets",
          attributes: ["id"],
          include: displayAssetIncludes(db.Sequelize.col("assets.id"), viewableCats),
        },
      },
      {
        model: db.asset,
        as: "asset",
        attributes: ["id"],
        include: displayAssetIncludes(null, viewableCats),
      },
    ]);
  }

  Building.findByPk(id, { include: includes })
  .then((data) => {
    if (data) {
      res.send(data);
    } else {
      res.status(404).send({
        message: `Cannot find building with id=${id}.`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Error retrieving building with id=" + id,
    });
  });
};

// Update a Building by the id in the request
exports.update = (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid building id!",
  });

  Building.update(req.body, {
    where: { id },
    include: {
      model: db.asset,
      as: "asset",
      attributes: [],
      required: true,
      include: {
        model: db.assetType,
        as: "type",
        attributes: [],
        required: true,
        where: { categoryId: req.requestingUser.dataValues.editableCategories },
      },
    },
  })
  .then((num) => {
    if (num > 0) {
      res.send({
        message: "Building was updated successfully.",
      });
    } else {
      res.send({
        message: `Cannot update building with id=${id}. Maybe building was not found, req.body is empty, or user is unauthorized!`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Error updating building with id=" + id,
    });
  });
};

// Delete a Building with the specified id in the request
exports.delete = async (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid building id!",
  });

  const building = await Building.findByPk(id, {
    attributes: ["id"],
    include: {
      model: db.asset,
      as: "asset",
      attributes: ["id"],
      required: true,
      include: {
        model: db.assetType,
        as: "type",
        attributes: [],
        where: { categoryId: req.requestingUser.dataValues.deletableCategories },
        required: true,
      },
    },
  });

  if (!building) return res.status(404).send({
    message: "Error deleting building! Maybe building was not found or user is unauthorized.",
  });

  building.dataValues.asset.destroy()
  .then((num) => {
    if (num > 0) {
      res.send({
        message: "Building was deleted successfully!",
      });
    } else {
      res.send({
        message: `Cannot delete building with id=${id}. Maybe building was not found!`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Could not delete building with id=" + id,
    });
  });
};
