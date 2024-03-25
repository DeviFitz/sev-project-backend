const db = require("../models");
const FieldList = db.fieldList;

// Create and Save a new FieldList
exports.create = (req, res) => {
  // Validate request
  if (!req.body.name) {
    res.status(400).send({
      message: "Content cannot be empty!",
    });
    return;
  }

  // Create a FieldList
  const fieldList = {
    id: req.body.id,
    name: req.body.name,
  };

  // Save FieldList in the database
  FieldList.create(fieldList)
  .then((data) => {
    res.send(data);
  })
  .catch((err) => {
    res.status(500).send({
      message: err.message || "Some error occurred while creating the field list.",
    });
  });
};

// Retrieve all FieldLists from the database.
exports.findAll = (req, res) => {
  FieldList.findAll({
    ...req.paginator,
  })
  .then((data) => {
    res.send(data);
  })
  .catch((err) => {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving field lists.",
    });
  });
};

// Find a single FieldList with an id
exports.findOne = (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid field list id!",
  });

  FieldList.findByPk(id)
  .then((data) => {
    if (data) {
      res.send(data);
    } else {
      res.status(404).send({
        message: `Cannot find field list with id=${id}.`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Error retrieving field list with id=" + id,
    });
  });
};

// Update a FieldList by the id in the request
exports.update = (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid field list id!",
  });

  FieldList.update(req.body, { where: { id } })
  .then((num) => {
    if (num > 0) {
      res.send({
        message: "Field list was updated successfully.",
      });
    } else {
      res.send({
        message: `Cannot update field list with id=${id}. Maybe field list was not found or req.body is empty!`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Error updating field list with id=" + id,
    });
  });
};

// Delete a FieldList with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid field list id!",
  });

  FieldList.destroy({ where: { id } })
  .then((num) => {
    if (num > 0) {
      res.send({
        message: "Field list was deleted successfully!",
      });
    } else {
      res.send({
        message: `Cannot delete field list with id=${id}. Maybe field list was not found!`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Could not delete field list with id=" + id,
    });
  });
};
