const db = require("../models");
const Alert = db.alert;

// Create and Save a new Alert
exports.create = async (req, res) => {
  // Validate request
  if (!req.body.date || !req.body.status || !req.body.typeId || !req.body.assetId)
  {
    return res.status(400).send({
      message: "Content cannot be empty!",
    });
  }

  // Create an Alert
  const alert = {
    id: req.body.id,
    date: req.body.date,
    description: req.body.description,
    status: req.body.status,
    typeId: req.body.typeId,
    assetId: req.body.assetId,
  };

  const type = await db.asset.findByPk(alert.assetId, {
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
    message: "Error creating alert! Maybe user is unauthorized.",
  });

  // Save Alert in the database
  Alert.create(alert)
  .then((data) => {
    res.send(data);
  })
  .catch((err) => {
    res.status(500).send({
      message: err.message || "Some error occurred while creating the alert.",
    });
  });
};

// Retrieve all Alerts from the database.
exports.findAll = (req, res) => {
  Alert.findAll({
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
      message: err.message || "Some error occurred while retrieving alerts.",
    });
  });
};

// Find a single Alert with an id
exports.findOne = (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid alert id!",
  });

  Alert.findByPk(id, {
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
    }
  })
  .then((data) => {
    if (data) {
      res.send(data);
    } else {
      res.status(404).send({
        message: `Cannot find alert with id=${id}. User may not be authorized!`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: `Error retrieving alert with id=${id}. User may not be authorized!`,
    });
  });
};

// Update an Alert by the id in the request
exports.update = async (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid alert id!",
  });
  
  Alert.update(req.body, {
    where: { id },
    include: {
      model: db.asset,
      as: "asset",
      attributes: [],
      include: {
        model: db.assetType,
        as: "type",
        attributes: [],
        where: { categoryId: req.requestingUser.dataValues.editableCategories },
        required: true,
      },
      required: true,
    },
  })
  .then((num) => {
    if (num > 0) {
      res.send({
        message: "Alert was updated successfully.",
      });
    } else {
      res.send({
        message: `Cannot update alert with id=${id}. Maybe alert was not found, req.body is empty, or user is unauthorized!`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: `Error updating alert with id=${id}.`,
    });
  });
};

// Delete an Alert with the specified id in the request
exports.delete = async (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid alert id!",
  });
  
  const target = await Alert.findByPk(id, {
    attributes: ["id"],
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

  if (!target) return res.status(404).send({
    message: "Error deleting alert! Maybe alert was not found or user is unauthorized.",
  });

  Alert.destroy({ where: { id } })
  .then((num) => {
    if (num > 0) {
      res.send({
        message: "Alert was deleted successfully!",
      });
    } else {
      res.send({
        message: `Cannot delete alert with id=${id}. Maybe alert was not found or user is unauthorized!`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Could not delete alert with id=" + id,
    });
  });
};
