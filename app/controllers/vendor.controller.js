const db = require("../models");
const Vendor = db.vendor;

// Create and Save a new Vendor
exports.create = (req, res) => {
  // Validate request
  if (!req.body.name) {
    res.status(400).send({
      message: "Content cannot be empty!",
    });
    return;
  }

  // Create a Vendor
  const vendor = {
    id: req.body.id,
    name: req.body.name,
    email: req.body.email,
    phoneNo: req.body.phoneNo,
  };

  // Save Vendor in the database
  Vendor.create(vendor)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while creating the vendor.",
      });
    });
};

// Retrieve all Vendors from the database.
exports.findAll = (req, res) => {
  const id = req.query.id;

  Vendor.findAll({ where: {} })
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving vendors.",
      });
    });
};

// Find a single Vendor with an id
exports.findOne = (req, res) => {
  const id = req.params.id;

  Vendor.findByPk(id)
    .then((data) => {
      if (data) {
        res.send(data);
      } else {
        res.status(404).send({
          message: `Cannot find vendor with id=${id}.`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error retrieving vendor with id=" + id,
      });
    });
};

// Update a Vendor by the id in the request
exports.update = (req, res) => {
  const id = req.params.id;

  Vendor.update(req.body, {
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Vendor was updated successfully.",
        });
      } else {
        res.send({
          message: `Cannot update vendor with id=${id}. Maybe vendor was not found or req.body is empty!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error updating vendor with id=" + id,
      });
    });
};

// Delete a Vendor with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;

  Vendor.destroy({
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Vendor was deleted successfully!",
        });
      } else {
        res.send({
          message: `Cannot delete vendor with id=${id}. Maybe vendor was not found!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Could not delete vendor with id=" + id,
      });
    });
};

// Delete all Vendors from the database.
exports.deleteAll = (req, res) => {
  Vendor.destroy({
    where: {},
    truncate: false,
  })
    .then((nums) => {
      res.send({ message: `${nums} vendors were deleted successfully!` });
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while removing all vendors.",
      });
    });
};
