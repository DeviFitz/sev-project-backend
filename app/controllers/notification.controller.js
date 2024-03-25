const db = require("../models");
const Notification = db.notification;

// Create and Save a new Notification
exports.create = (req, res) => {
  // Validate request
  if (!req.body.message || !req.body.userId) {
    res.status(400).send({
      message: "Content cannot be empty!",
    });
    return;
  }

  // Create a Notification
  const notification = {
    id: req.body.id,
    message: req.body.message,
    userId: req.body.userId,
  };

  // Save Notification in the database
  Notification.create(notification)
  .then((data) => {
    res.send(data);
  })
  .catch((err) => {
    res.status(500).send({
      message: err.message || "Some error occurred while creating the notification.",
    });
  });
};

// Retrieve all Notifications from the database.
exports.findAll = (req, res) => {
  Notification.findAll({
    ...req.paginator,
  })
  .then((data) => {
    res.send(data);
  })
  .catch((err) => {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving notifications.",
    });
  });
};

// Find a single Notification with an id
exports.findOne = (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid notification id!",
  });

  Notification.findByPk(id)
  .then((data) => {
    if (data) {
      res.send(data);
    } else {
      res.status(404).send({
        message: `Cannot find notification with id=${id}.`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Error retrieving notification with id=" + id,
    });
  });
};

// Update a Notification by the id in the request
exports.update = (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid notification id!",
  });

  Notification.update(req.body, { where: { id } })
  .then((num) => {
    if (num > 0) {
      res.send({
        message: "Notification was updated successfully.",
      });
    } else {
      res.send({
        message: `Cannot update notification with id=${id}. Maybe notification was not found or req.body is empty!`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Error updating notification with id=" + id,
    });
  });
};

// Delete a Notification with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid notification id!",
  });

  Notification.destroy({ where: { id } })
  .then((num) => {
    if (num > 0) {
      res.send({
        message: "Notification was deleted successfully!",
      });
    } else {
      res.send({
        message: `Cannot delete notification with id=${id}. Maybe notification was not found!`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Could not delete notification with id=" + id,
    });
  });
};
