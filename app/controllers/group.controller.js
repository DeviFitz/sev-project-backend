const db = require("../models");
const { normalizePermissions, denormalizePermissions } = require("./permission.controller");
const Group = db.group;

// Create and Save a new Group
exports.create = (req, res) => {
  // Validate request
  if (!req.body.name) {
    return res.status(400).send({
      message: "Content cannot be empty!",
    });
  }
  else if (!!req.body.priority && req.body.priority <= 0)
  {
    return res.status(400).send({
      message: "Cannot create a group of priority 0 or less as it is reserved for super users.",
    });
  };

  // Create an Group
  const group = {
    id: req.body.id,
    name: req.body.name,
    priority: req.body.priority,
  };

  // Save Group in the database
  Group.create(group)
  .then((data) => {
    res.send(data);
  })
  .catch((err) => {
    res.status(500).send({
      message: err.message || "Some error occurred while creating the group.",
    });
  });
};

// Retrieve all Groups from the database.
exports.findAll = (req, res) => {
  Group.findAll({
    ...req.paginator,
  })
  .then((data) => {
    res.send(data);
  })
  .catch((err) => {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving groups.",
    });
  });
};

// Find a single Group with an id
exports.findOne = (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid group id!",
  });

  const queries = req.query;
  const includes = queries?.full != undefined ?
  [
    {
      model: db.permission,
      attributes: ["name", "categoryId"],
      through: {
        model: db.groupPermission,
        attributes: [],
      },
    },
  ] : [];

  Group.findByPk(id, {
    include: includes,
  })
  .then((data) => {
    if (data) {
      denormalizePermissions(normalizePermissions(data.get({ plain: true })))
      res.send(normalizePermissions(data.get({ plain: true })));
    } else {
      res.status(404).send({
        message: `Cannot find group with id=${id}.`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Error retrieving group with id=" + id,
    });
  });
};

// Update a Group by the id in the request
exports.update = async (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid group id!",
  });

  const t = await db.sequelize.transaction();
  
  try
  {
    let changed = false;
    let error = false;
    const target = await Group.findByPk(id, { transaction: t });
    if (target?.dataValues?.name?.trim() == "Super User") {
      res.status(400).send({
        message: "Error: cannot alter Super User group!",
      });
      throw new Error();
    }

    target.save({...(req.body ?? {}), transaction: t })
    .then((num) => {
      changed = num > 0;
    })
    .catch(err => {
      error = true;
      res.status(500).send({
        message: "Error updating group with id=" + id,
      });
    });
    
    if (error) throw new Error();
    
    if (!!req.body?.permissions)
    {
      const ids = (await denormalizePermissions({ permissions: req.body.permissions }))?.permissions;
      if (!!ids) await target.setPermissions(ids, { transaction: t })
      .then(data => {
        changed ||= data?.length > 0;
      })
      .catch(err => {
        error = true;
        res.status(500).send({
          message: `Error setting group permissions for group with id=${id}!`,
        })
      })
    
      if (error) throw new Error();
    }
    
    if (changed)
    {
      await t.commit();
      return res.send({
        message: "Group was updated successfully.",
      });
    }
    
    res.send({
      message: `Cannot update group with id=${id}. Maybe group was not found or req.body is empty!`,
    });
    throw new Error();
  }
  catch
  {
    await t.rollback();
  }
};

// Delete a Group with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid group id!",
  });

  Group.destroy({ where: { id } })
  .then((num) => {
    if (num > 0) {
      res.send({
        message: "Group was deleted successfully!",
      });
    } else {
      res.send({
        message: `Cannot delete group with id=${id}. Maybe group was not found!`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Could not delete group with id=" + id,
    });
  });
};
