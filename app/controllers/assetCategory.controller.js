const db = require("../models");
const AssetCategory = db.assetCategory;
const Permission = db.permission;

// Create and Save a new AssetCategory
exports.create = async (req, res) => {
  
  // Validate request
  if (!req.body.name) return res.status(400).send({
    message: "Content cannot be empty!",
  });

  // Create an AssetCategory
  const assetCategory = {
    id: req.body.id,
    name: req.body.name,
    description: req.body.description,
  };

  // Save AssetCategory in the database
  let error = false;
  let response = {};
  await AssetCategory.create(assetCategory)
  .then((data) => {
    response = data;
  })
  .catch((err) => {
    res.status(500).send({
      message: err.message || "Some error occurred while creating the asset category.",
    });
    error = true;
  });

  if (error) return;

  const categoryPermissions = this.getPermissions(response.dataValues.id, assetCategory.name);
  
  Permission.bulkCreate(categoryPermissions)
  .then(async (data) => {
    new Set(["Super User", ...(req.body.permittedGroups ?? [])])
    .forEach(async (groupName) => {
      const group = await db.group.findOne({ where: { name: groupName } })
      if (!!group) await group.addPermissions(data);
    });
    res.send(response.get({ plain: true }));
  })
  .catch(async (err) => {
    await AssetCategory.destroy({ where: {
      id: response.dataValues.id,
    }});
    res.status(500).send({
      message: err.message || "Some error occurred while creating the asset category's permissions.",
    });
  });
};

// Retrieve all AssetCategorys from the database.
exports.findAll = (req, res) => {
  const id = req.query.id;

  AssetCategory.findAll({ where: {} })
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving asset categories.",
      });
    });
};

// Find a single AssetCategory with an id
exports.findOne = (req, res) => {
  const id = req.params.id;

  AssetCategory.findByPk(id)
    .then((data) => {
      if (data) {
        res.send(data);
      } else {
        res.status(404).send({
          message: `Cannot find asset category with id=${id}.`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error retrieving asset category with id=" + id,
      });
    });
};

// Update an AssetCategory by the id in the request
exports.update = (req, res) => {
  const id = req.params.id;
  // NOTE: Update later to change permissions' names when the category's name is changed

  AssetCategory.update(req.body, {
    where: { id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Asset category was updated successfully.",
        });
      } else {
        res.send({
          message: `Cannot update asset category with id=${id}. Maybe asset category was not found or req.body is empty!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error updating asset category with id=" + id,
      });
    });
};

// Delete an AssetCategory with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;

  AssetCategory.destroy({
    where: { id },
  })
  .then((num) => {
    if (num == 1) {
      res.send({
        message: "AssetCategory was deleted successfully!",
      });
    } else {
      res.send({
        message: `Cannot delete asset category with id=${id}. Maybe asset category was not found!`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Could not delete asset category with id=" + id,
    });
  });
};

/**Generates permissions to match the category
 * 
 * @param categoryId The category's id
 * @param categoryName The category's name
*/
exports.getPermissions = (categoryId, categoryName) => [
  {
    name: `Create Under Category: "${categoryName}"`,
    description: `Gives permission to create permitted items under the "${categoryName}" asset category.`,
    categoryId,
  },
  {
    name: `Delete Under Category: "${categoryName}"`,
    description: `Gives permission to delete permitted items under the "${categoryName}" asset category.`,
    categoryId,
  },
  {
    name: `Edit Under Category: "${categoryName}"`,
    description: `Gives permission to edit permitted items under the "${categoryName}" asset category.`,
    categoryId,
  },
  {
    name: `View Under Category: "${categoryName}"`,
    description: `Gives permission to view permitted items under the "${categoryName}" asset category.`,
    categoryId,
  },
]