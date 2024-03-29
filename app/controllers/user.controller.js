const db = require("../models");
const User = db.user;

// Create and Save a new User
exports.create = async (req, res) => {
  // Validate request
  if (!req.body.personId) {
    return res.status(400).send({
      message: "Content cannot be empty!",
    });
  }

  if (!!req.body?.groupId)
  {
    const priority = (await db.group.findByPk(req.body.groupId, { attributes: ['priority'] }))?.dataValues?.priority;

    // Must be "not greater equal" since if the requesting user's group priority is undefined, this will always return true
    if (!(priority >= req.requestingUser.dataValues.groupPriority)) return res.status(500).send({
      message: "Error! Users may not assign users to higher-priority groups."
    })
  }

  // Create a User
  const user = {
    id: req.body.id,
    groupExpiration: req.body.groupExpiration,
    groupId: req.body.groupId,
    personId: req.body.personId,
  };

  // Save User in the database
  User.create(user)
  .then((data) => {
    res.send(data.get({ plain: true }));
  })
  .catch((err) => {
    res.status(500).send({
      message: err.message || "Some error occurred while creating the User.",
    });
  });
};

// Retrieve all People from the database.
exports.findAll = (req, res) => {
  User.findAll()
  .then((data) => {
    res.send(data.map(user => user.get({ plain: true })));
  })
  .catch((err) => {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving people.",
    });
  });
};

// Find a single User with an id
exports.findOne = (req, res) => {
  const id = req.params.id;

  User.findByPk(id)
  .then((data) => {
    if (!!data) {
      res.send(data.get({ plain: true }));
    } else {
      res.status(404).send({
        message: `Cannot find User with id=${id}.`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Error retrieving User with id=" + id,
    });
  });
};

// Update a User by the id in the request
exports.update = async (req, res) => {
  const id = req.params.id;

  const target = await User.findByPk(id, {
    include: [{
      model: db.group,
      as: "group",
      attributes: ['priority'],
    }],
  });

  if (!target) return res.send({
    message: `Cannot update User with id=${id}. Maybe User was not found or req.body is empty!`,
  });

  const targetPrio = target.dataValues?.group?.dataValues?.priority;
  const reqPrio = req.requestingUser.dataValues.groupPriority;
  const subEdit = reqPrio != undefined && (targetPrio == undefined || (targetPrio != undefined && targetPrio > reqPrio));
  // const sameEdit = (reqPrio == targetPrio) || subEdit;

  if (!subEdit && (reqPrio != targetPrio)) return res.status(401).send({
    message: "Unauthorized! Cannot update user with higher priority.",
  });

  const editPerms = req.requestingUser.dataValues.editUserPerms;
  /*
  editPerms = {
    superBlock: bool,
    block: bool,
    superAssign: bool,
    assign: bool,
    superPermit: bool,
    permit: bool,
  }
  */
  const params = {
    blocked: req.body.blocked,
    groupExpiration: req.body.groupExpiration,
    groupId: req.body.groupId,
  };

  // Check to make sure that user can be edited based on their priority and the requestor's permissions
  if (params.blocked != undefined && params.blocked != null && params.blocked != target.dataValues.blocked)
  {
    if (editPerms.superBlock || (editPerms.block && subEdit))
      target.blocked = params.blocked;
    else if (editPerms.block) return res.status(401).send({
      message: "Unauthorized! User does not have permission to block or unblock users of equal priority.",
    });
    else return res.status(401).send({
      message: "Unauthorized! User does not have permission to block or unblock users.",
    });
  }

  if (params.groupExpiration != undefined && params.groupExpiration != target.dataValues.groupExpiration)
  {
    if (editPerms.superAssign || (editPerms.assign && subEdit))
      target.groupExpiration = params.groupExpiration;
    else if (editPerms.assign) return res.status(401).send({
      message: "Unauthorized! User does not have permission to assign users of equal priority to groups.",
    });
    else return res.status(401).send({
      message: "Unauthorized! User does not have permission to assign users to groups.",
    });
  }

  if (params.groupId != undefined && params.groupId != target.dataValues.groupId)
  {
    if (editPerms.superAssign || (editPerms.assign && subEdit))
    {
      const group = (await db.group.findByPk(target.groupId, { attributes: ['priority', 'expiration'] }))?.get({ plain: true });

      if (!!group && group.priority <= params.groupId)
      {
        target.groupId = params.groupId;
        if (params.groupExpiration != undefined) target.groupExpiration = group.expiration;
      }
      else return res.send({
        message: "User can only assign other users to lower- or equal-priority groups.",
      });
    }
    else if (editPerms.assign) return res.status(401).send({
      message: "Unauthorized! User does not have permission to assign users of equal priority to groups.",
    });
    else return res.status(401).send({
      message: "Unauthorized! User does not have permission to assign users to groups.",
    });
  }

  target.save()
  .then((data) => {
    res.send({
      message: "User was updated successfully.",
    });
  })
  .catch((err) => {
    res.status(500).send({
      message: "Error updating User with id=" + id,
    });
  });
};

// Delete a User with the specified id in the request
exports.delete = async (req, res) => {
  const id = req.params.id;
  
  const target = (await User.findByPk(id, {
    include: [{
      model: db.group,
      as: "group",
      attributes: ['priority'],
    }],
  }))?.get({ plain: true });
  
  if (!!target)
  {
    const priority = req.requestingUser.dataValues.groupPriority;
    const prioNull = priority == undefined || priority == null;
    const superRemove = req.requestingUser.dataValues.superRemove;
    const targetPrio = target.groupExpiration < new Date() ? target.group?.priority : undefined;
    const tpNull = targetPrio == undefined || targetPrio == null;
    const canRemove = (prioNull == tpNull
        && ((!prioNull && (priority > targetPrio
          || (priority >= targetPrio && superRemove)))
        || (prioNull && superRemove)))
      || !prioNull && tpNull;
    /*
    User w/ no group --> no deleting
    User w/ no group & super perms --> deleting user w/ no group
    */
    if (!canRemove) return res.send({
      message: `Cannot delete user with id=${id}. Requestor had insufficient permissions!`,
    });
  }

  User.destroy({
    where: { id }
  })
  .then((num) => {
    if (num > 0) {
      res.send({
        message: "User was deleted successfully!",
      });
    } else {
      res.send({
        message: `Cannot delete User with id=${id}. Maybe user was not found!`,
      });
    }
  })
  .catch((err) => {
    console.log(err)
    res.status(500).send({
      message: "Could not delete User with id=" + id,
    });
  });
};
