const db = require("../models");
const FieldListOption = db.fieldListOption;

// Create and Save a new FieldListOption
exports.create = (req, res) => {
  // Validate request
  if (!req.body.value || !req.body.listId) {
    res.status(400).send({
      message: "Content cannot be empty!",
    });
    return;
  }

  // Create an FieldListOption
  const fieldListOption = {
    id: req.body.id,
    value: req.body.value,
    listId: req.body.listId,
  };

  // Save FieldListOption in the database
  FieldListOption.create(fieldListOption)
  .then((data) => {
    res.send(data);
  })
  .catch((err) => {
    res.status(500).send({
      message: err.message || "Some error occurred while creating the field list option.",
    });
  });
};

// Retrieve all FieldListOptions from the database.
exports.findAll = (req, res) => {
  FieldListOption.findAll({
    ...req.paginator,
  })
  .then((data) => {
    res.send(data);
  })
  .catch((err) => {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving field list options.",
    });
  });
};

// Find a single FieldListOption with an id
exports.findOne = (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid field list option id!",
  });

  FieldListOption.findByPk(id)
  .then((data) => {
    if (data) {
      res.send(data);
    } else {
      res.status(404).send({
        message: `Cannot find field list option with id=${id}.`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Error retrieving field list option with id=" + id,
    });
  });
};

// Update a FieldListOption by the id in the request
exports.update = (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid field list option id!",
  });

  FieldListOption.update(req.body, { where: { id } })
  .then((num) => {
    if (num > 0) {
      res.send({
        message: "Field list option was updated successfully.",
      });
    } else {
      res.send({
        message: `Cannot update field list option with id=${id}. Maybe field list option was not found or req.body is empty!`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Error updating field list option with id=" + id,
    });
  });
};

// Delete a FieldListOption with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid field list option id!",
  });

  FieldListOption.destroy({ where: { id } })
  .then((num) => {
    if (num > 0) {
      res.send({
        message: "Field list option was deleted successfully!",
      });
    } else {
      res.send({
        message: `Cannot delete field list option with id=${id}. Maybe field list option was not found!`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Could not delete field list option with id=" + id,
    });
  });
};
