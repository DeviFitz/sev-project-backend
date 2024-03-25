const db = require("../models");
const Log = db.log;

// Create and Save a new Log
exports.create = async (req, res) => {
  // Validate request
  if (!req.body.date || !req.body.assetId || !req.body.authorId) {
    return res.status(400).send({
      message: "Content cannot be empty!",
    });
  }

  // Create an Log
  const log = {
    id: req.body.id,
    date: req.body.date,
    description: req.body.description,
    type: req.body.type,
    condition: req.body.condition,
    circulationStatus: req.body.circulationStatus,
    maintenanceType: req.body.maintenanceType,
    assetId: req.body.assetId,
    authorId: req.body.authorId,
    personId: req.body.personId,
    vendorId: req.body.vendorId,
  };

  const type = await db.asset.findByPk(log.assetId, {
    attributes: ["id"],
    include: {
      model: db.assetType,
      as: "type",
      attributes: [],
      where: { categoryId: req.requestingUser.dataValues.editableCategories },
      required: true,
    },
  });

  if (!type) return res.status(400).send({
    message: "Error creating log! Maybe user is unauthorized.",
  });

  // Save Log in the database
  Log.create(log)
  .then((data) => {
    res.send(data);
  })
  .catch((err) => {
    res.status(500).send({
      message: err.message || "Some error occurred while creating the log.",
    });
  });
};

// Retrieve all Logs from the database.
exports.findAll = (req, res) => {
  Log.findAll({
    ...req.paginator,
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
        where: { categoryId: req.requestingUser.dataValues.viewableCategories },
      },
    },
  })
  .then((data) => {
    res.send(data);
  })
  .catch((err) => {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving logs.",
    });
  });
};

// Find a single Log with an id
exports.findOne = (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid log id!",
  });

  Log.findByPk(id, {
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
        where: { categoryId: req.requestingUser.dataValues.viewableCategories },
      },
    },
  })
  .then((data) => {
    if (data) {
      res.send(data);
    } else {
      res.status(404).send({
        message: `Cannot find log with id=${id}. Maybe user is unauthorized!`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Error retrieving log with id=" + id,
    });
  });
};

// Update a Log by the id in the request
exports.update = (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid log id!",
  });

  Log.update(req.body, {
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
        message: "Log was updated successfully.",
      });
    } else {
      res.send({
        message: `Cannot update log with id=${id}. Maybe log was not found, req.body is empty, or user is unauthorized!`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Error updating log with id=" + id,
    });
  });
};

// Delete a Log with the specified id in the request
exports.delete = async (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid log id!",
  });

  const type = await Log.findByPk(id, {
    attributes: [],
    include: {
      model: db.asset,
      as: "asset",
      attributes: [],
      raw: true,
      required: true,
      include: {
        model: db.assetType,
        as: "type",
        attributes: [],
        where: { categoryId: req.requestingUser.dataValues.deletableCategories },
        required: true,
        raw: true,
      },
    },
  });

  if (!type) return res.status(404).send({
    message: "Error deleting log! Maybe log was not found or user is unauthorized.",
  });

  Log.destroy({ where: { id } })
  .then((num) => {
    if (num > 0) {
      res.send({
        message: "Log was deleted successfully!",
      });
    } else {
      res.send({
        message: `Cannot delete log with id=${id}. Maybe log was not found or user is unauthorized!`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Could not delete log with id=" + id,
    });
  });
};
