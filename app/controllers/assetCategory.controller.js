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

  const t = await db.sequelize.transaction();

  try {
    // Save AssetCategory in the database
    let error = false;
    let response = {};
    await AssetCategory.create(assetCategory, { transaction: t })
    .then((data) => {
      response = data;
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while creating the asset category.",
      });
      error = true;
    });

    if (error) throw new Error();

    const categoryPermissions = this.getPermissions(response.dataValues.id, assetCategory.name);
    
    await Permission.bulkCreate(categoryPermissions, { transaction: t })
    .then(async (data) => {
      const groupNames = [...new Set(["Super User", ...(req.body.permittedGroups ?? [])]).values()];
      const groups = await db.group.findAll({ where: { name: groupNames }});
      await Promise.all(groups.map(group => group.addPermissions(data, { transaction: t })))
      .catch(err => {
        error = true;
      });

      if (!error) res.send(response.get({ plain: true }));
    })
    .catch(err => {
      error = true;
    });

    if (error)
    {
      res.status(500).send({
        message: err.message || "Some error occurred while creating the asset category's permissions.",
      });
      throw new Error();
    }

    await t.commit();
  }
  catch {
    await t.rollback();
  }
};

// Retrieve all AssetCategories from the database.
exports.findAll = (req, res) => {
  AssetCategory.findAll({
    ...req.paginator,
  })
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
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid asset category id!",
  });

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
exports.update = async (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid asset category id!",
  });

  const t = await db.sequelize.transaction();
  let error = false;

  try {
    const target = await AssetCategory.findByPk(id, {
      include: {
        model: Permission,
        as: "permissions",
        attributes: ["id", "name", "description"],
      },
    });

    if (!target) {
      res.status(404).send({
        message: `Error updating asset category with id=${id}! Maybe category was not found or user is unauthorized.`,
      });
      throw new Error();
    }

    const changeName = (req.body?.name ?? target.dataValues.name) !== target.dataValues.name;

    // Update permissions if the category's name has been changed
    if (changeName)
    {
      await Promise.all(target.dataValues.permissions?.map(permission => {
        permission.name = permission.name.replace(/"(\W|\w)*"/, `\"${req.body.name}\"`);
        permission.description = permission.description.replace(/"(\W|\w)*"/, `\"${req.body.name}\"`);
        return permission.save({ transaction: t })
        .catch(err => error = true);
      }));
  
      if (error) {
        res.status(500).send({
          message: "Error updating asset category's permissions!",
        });
        throw new Error();
      }
    }

    target.set(req.body);
    await target.save({ transaction: t })
    .catch(err => {
      error = true;
      res.status(500).send({
        message: "Error saving changes to asset category!",
      });
    });

    if (error) throw new Error();
    
    await t.commit()
    .catch(err => {
      error = true;
      res.status(500).send({
        message: "Error committing changes!",
      });
    });
    
    if (error) throw new Error();
    
    res.send({
      message: "Asset category was updated successfully.",
    });
  }
  catch {
    t.rollback();
  }
};

// Delete an AssetCategory with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;

  AssetCategory.destroy({
    where: { id },
  })
  .then((num) => {
    if (num >= 0) {
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
  {
    name: `Report For Category: "${categoryName}"`,
    description: `Gives permission to generate reports including "${categoryName}" and its dependents.`,
    categoryId,
  },
];