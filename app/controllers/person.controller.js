const db = require("../models");
const Person = db.person;
const { checkHasPermission, PermTypes } = require("../authorization/authorization");
const { normalizePermissions } = require("./permission.controller");
const { displayAssetIncludes } = require("./asset.controller");

// Create and Save a new Person
// exports.create = (req, res) => {
//   // Validate request
//   if (!req.body.fName || !req.body.lName || !req.body.email) {
//     return res.status(400).send({
//       message: "Content cannot be empty!",
//     });
//   }

//   // Create a Person
//   const person = {
//     id: req.body.id,
//     fName: req.body.fName,
//     lName: req.body.lName,
//     email: req.body.email,
//   };

//   // Save Person in the database
//   Person.create(person)
//   .then((data) => {
//     res.send(data);
//   })
//   .catch((err) => {
//     res.status(500).send({
//       message: err.message || "Some error occurred while creating the person.",
//     });
//   });
// };

// Retrieve all People from the database.
exports.findAll = (req, res) => {
  Person.findAll({
    ...req.paginator,
  })
  .then((data) => {
    res.send(data);
  })
  .catch((err) => {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving people.",
    });
  });
};

// Find a single Person with an id
exports.findOne = async (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid person id!",
  });

  const includes = [];
  if (req?.query?.full != undefined)
  {
    const userGroup = !((req.requestingUser.dataValues.groupExpiration ?? undefined) <= new Date()) ?
    await db.group.findByPk(req.requestingUser.dataValues.groupId)
    : undefined;
    req.requestingUser.dataValues.groupPriority = userGroup?.priority;
    
    // Get user's permissions
    const permissions = new Set([
      ...(await req.requestingUser.getPermissions()),
      ...((await userGroup?.getPermissions()) ?? [])
    ]);

    req.requestingUser.dataValues.permissions = [...permissions.values()]
    const viewableCats = req.requestingUser.dataValues.permissions
    .filter(permission => !!permission.categoryId && permission.name.match(/View/i)?.length > 0)
    .map(permission => permission.categoryId);

    if (checkHasPermission(req, "User", PermTypes.VIEW))
    {
      includes.push(...[
        {
          model: db.user,
          as: "user",
          attributes: ["groupExpiration", "blocked"],
          include: [
            {
              model: db.group,
              as: "group",
              attributes: ["id", "name"],
              include: {
                model: db.permission,
                attributes: ["name", "categoryId"],
                through: {
                  model: db.groupPermission,
                  attributes: [],
                },
              }
            },
            {
              model: db.permission,
              attributes: ["name", "categoryId"],
              through: {
                model: db.userPermission,
                attributes: [],
              },
            },
          ],
        },
      ]);
    }

    includes.push({
      model: db.asset,
      as: "borrowedAssets",
      attributes: ["id"],
      required: false,
      include: displayAssetIncludes(db.Sequelize.col("borrowedAssets.id"), viewableCats),
    });
  }

  Person.findByPk(id, { include: includes })
  .then(async (data) => {
    if (data) {
      res.send(normalizePermissions(data.get({ plain: true })));
    } else {
      res.status(404).send({
        message: `Cannot find person with id=${id}.`,
      });
    }
  })
  .catch((err) => {
    console.log(err)
    res.status(500).send({
      message: "Error retrieving person with id=" + id,
    });
  });
};

// Update a Person by the id in the request
// exports.update = (req, res) => {
//   const id = req.params.id;

//   Person.update(req.body, {
//     where: { id: id },
//   })
//   .then((num) => {
//     if (num == 1) {
//       res.send({
//         message: "Person was updated successfully.",
//       });
//     } else {
//       res.send({
//         message: `Cannot update person with id=${id}. Maybe person was not found or req.body is empty!`,
//       });
//     }
//   })
//   .catch((err) => {
//     res.status(500).send({
//       message: "Error updating person with id=" + id,
//     });
//   });
// };

// Delete a Person with the specified id in the request
// exports.delete = (req, res) => {
//   const id = req.params.id;

//   Person.destroy({
//     where: { id },
//   })
//   .then((num) => {
//     if (num == 1) {
//       res.send({
//         message: "Person was deleted successfully!",
//       });
//     } else {
//       res.send({
//         message: `Cannot delete person with id=${id}. Maybe person was not found!`,
//       });
//     }
//   })
//   .catch((err) => {
//     res.status(500).send({
//       message: "Could not delete person with id=" + id,
//     });
//   });
// };
