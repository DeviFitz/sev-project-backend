const db = require("../models");
const AlertType = db.alertType;

// Create and Save a new AlertType
exports.create = (req, res) => {
  // Validate request
  if (!req.body.name) {
    res.status(400).send({
      message: "Content cannot be empty!",
    });
    return;
  }

  // Create an AlertType
  const alertType = {
    id: req.body.id,
    name: req.body.name,
  };

  // Save AlertType in the database
  AlertType.create(alertType)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while creating the alert type.",
      });
    });
};

// Retrieve all AlertTypes from the database.
exports.findAll = (req, res) => {
  const id = req.query.id;

  AlertType.findAll({ where: {} })
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving alert types.",
      });
    });
};

// Find a single AlertType with an id
exports.findOne = (req, res) => {
  const id = req.params.id;

  AlertType.findByPk(id)
    .then((data) => {
      if (data) {
        res.send(data);
      } else {
        res.status(404).send({
          message: `Cannot find alert type with id=${id}.`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error retrieving alert type with id=" + id,
      });
    });
};

// Update an AlertType by the id in the request
exports.update = (req, res) => {
  const id = req.params.id;

  AlertType.update(req.body, {
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Alert type was updated successfully.",
        });
      } else {
        res.send({
          message: `Cannot update alert type with id=${id}. Maybe alert type was not found or req.body is empty!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error updating alert type with id=" + id,
      });
    });
};

// Delete an AlertType with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;

  AlertType.destroy({
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Alert type was deleted successfully!",
        });
      } else {
        res.send({
          message: `Cannot delete alert type with id=${id}. Maybe alert type was not found!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Could not delete alert type with id=" + id,
      });
    });
};

// Delete all AlertTypes from the database.
exports.deleteAll = (req, res) => {
  AlertType.destroy({
    where: {},
    truncate: false,
  })
    .then((nums) => {
      res.send({ message: `${nums} alert types were deleted successfully!` });
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while removing all alert types.",
      });
    });
};
