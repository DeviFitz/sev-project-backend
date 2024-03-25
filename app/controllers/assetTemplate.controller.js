const db = require("../models");
const AssetTemplate = db.assetTemplate;

// Create and Save a new AssetTemplate
exports.create = async (req, res) => {
  // Validate request
  if (!req.body.name || !req.body.assetTypeId) {
    res.status(400).send({
      message: "Content cannot be empty!",
    });
    return;
  }

  // Create an AssetTemplate
  const assetTemplate = {
    id: req.body.id,
    name: req.body.name,
    assetTypeId: req.body.assetTypeId,
  };

  const type = await db.assetType.findByPk(assetTemplate.assetTypeId, {
    as: "assetType",
    attributes: ["id"],
    where: { categoryId: req.requestingUser.dataValues.creatableCategories },
    required: true,
  });

  if (!type) return res.status(400).send({
    message: "Error creating asset template! Maybe user is unauthorized.",
  });

  // Save AssetTemplate in the database
  AssetTemplate.create(assetTemplate)
  .then((data) => {
    res.send(data);
  })
  .catch((err) => {
    res.status(500).send({
      message: err.message || "Some error occurred while creating the asset template.",
    });
  });
};

// Retrieve all AssetTemplates from the database.
exports.findAll = (req, res) => {
  AssetTemplate.findAll({
    ...req.paginator,
    include: {
      model: db.assetType,
      as: "assetType",
      attributes: ["name"],
      required: true,
      where: { categoryId: req.requestingUser.dataValues.viewableCategories },
    },
  })
  .then((data) => {
    res.send(data);
  })
  .catch((err) => {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving asset templates.",
    });
  });
};

// Find a single AssetTemplate with an id
exports.findOne = (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid asset template id!",
  });

  const full = req?.query?.full != undefined;

  const typeInclude = full ? {
    include: {
      model: db.assetField,
      as: "fields",
      attributes: ["id", "label"],
      required: false,
      where: { templateField: true },
      include: {
        model: db.templateData,
        as: "templateData",
        where: { templateId: id },
        limit: 1,
      },
    },
  } : {};

  AssetTemplate.findByPk(id, {
    ...req.paginator,
    include: [
      {
        model: db.assetType,
        as: "assetType",
        attributes: full ? ["name"] : [],
        required: true,
        where: { categoryId: req.requestingUser.dataValues.viewableCategories },
        ...typeInclude,
      },
    ]
  })
  .then((data) => {
    data = data?.get({ plain: true });
    if (data?.assetType?.fields?.length > 0) data.assetType.fields.forEach(field => field.templateData = field.templateData?.[0] ?? null);

    if (data) {
      res.send(data);
    } else {
      res.status(404).send({
        message: `Cannot find asset template with id=${id}. Maybe asset template was not found or user is unauthorized!`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Error retrieving asset template with id=" + id,
    });
  });
};

// Update an AssetTemplate by the id in the request
exports.update = async (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid asset template id!",
  });

  const t = await db.sequelize.transaction();
  let error = false;

  const setTemplateData = req.body?.assetType?.fields != undefined;
  const includes = setTemplateData ? {
    include: {
      model: db.assetField,
      as: "fields",
      attributes: ["id", "required"],
      required: false,
      where: { templateField: true },
      include: {
        model: db.templateData,
        as: "templateData",
        where: { templateId: id },
        limit: 1,
      },
    },
  } : {};

  // Disallow switching types so that we can't have weird template behavior
  if (req.body?.assetTypeId !== undefined) delete req.body.assetTypeId;

  try {
    const target = await AssetTemplate.findByPk(id, {
      include: {
        model: db.assetType,
        attributes: ["categoryId"],
        as: "assetType",
        required: true,
        ...includes,
      },
    });

    if (!target)
    {
      res.status(404).send({
        message: `Asset template not found!`,
      });
      throw new Error();
    }
    else if (!req.requestingUser.dataValues?.editableCategories?.includes(target.dataValues?.assetType?.categoryId))
    {
      res.status(401).send({
        message: "Access denied!",
      });
      throw new Error();
    }

    if (setTemplateData)
    {
      const simpleTarget = target.get({ plain: true }).assetType.fields;

      const removeData = [];
      const newData = req.body.assetType.fields.filter(field => {
        const templateData = field.templateData;
        if (isNaN(parseInt(field?.id))) return false;
        
        const correspondingField = simpleTarget.find(targetField => targetField.id == field.id);
        if (!correspondingField) return false;
        else if (!templateData) {
          const dataId = parseInt(correspondingField.templateData?.[0]?.id);
          if (!isNaN(dataId)) removeData.push(dataId);
          return false;
        }

        field.templateData = {
          ...(correspondingField.templateData?.[0] ?? {}),
          ...templateData,
          templateId: id,
          fieldId: correspondingField.id,
        };
        field.templateData.value = field.templateData.value.trim();

        const valid = field.templateData.value.length > 0;
        if (!valid && field.templateData.id != undefined) removeData.push(field.templateData.id);
        return valid;
      });

      // Create / Update all necessary fields
      await Promise.all(newData.map(field => db.templateData.upsert(field.templateData, {
          where: {
            templateId: id,
            fieldId: field.id,
          },
          transaction: t,
        })
        .catch(err => {
          error = true;
        })
      ));

      if (error) {
        res.status(500).send({
          message: "Error adding or updating template data!",
        });
        throw new Error();
      }
      
      if (removeData.length > 0) {
        // If at least one of the deleted data is required, check to see if any assets depend on it
        const requiredData = removeData.filter(dataId => target.dataValues.assetType.dataValues.fields
        .some(field => field.dataValues.required && field.dataValues.templateData?.[0]?.dataValues?.id == dataId));
        
        if (requiredData.length > 0)
        {
          const assets = await db.asset.findAll({
            attributes: ["id"],
            where: {
              templateId: id,
            },
            limit: 1,
          });
  
          if (!assets) {
            res.status(500).send({
              message: "Error checking if deleted template data has dependents!",
            });
            throw new Error();
          }
          
          if (assets.length > 0) {
            res.status(400).send({
              message: "Error deleting template data as at least one of the deleted data is required and at least one asset depends on it!",
            });
            throw new Error();
          }
        }

        await db.templateData.destroy({
          where: { id: removeData },
          transaction: t,
        })
        .catch(err => {
          error = true;
          console.log(err)
          res.status(500).send({
            message: "Error removing template data to asset template!",
          });
        });
    
        if (error) throw new Error();
      }
    }

    target.set(req.body);
    await target.save({ transaction: t })
    .catch(err => {
      error = true;
      res.status(500).send({
        message: "Error updating asset template with id=" + id,
      });
    });

    if (error) throw new Error();

    await t.commit()
    .catch(err => {
      error = true;
      res.status(500).send({
        message: "Error committing changes to asset template!",
      });
    });

    if (error) throw new Error();
    
    res.send({
      message: "Asset template was updated successfully.",
    });
  }
  catch {
    t.rollback();
  }
};

// Delete an AssetTemplate with the specified id in the request
exports.delete = async (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid asset template id!",
  });

  const type = await AssetTemplate.findByPk(id, {
    attributes: ["id"],
    include: {
      model: db.assetType,
      as: "assetType",
      attributes: [],
      where: { categoryId: req.requestingUser.dataValues.deletableCategories },
      required: true,
      raw: true,
    },
  });

  if (!type) return res.status(404).send({
    message: "Error deleting asset! Maybe asset template was not found or user is unauthorized.",
  });

  AssetTemplate.destroy({ where: { id } })
  .then((num) => {
    if (num > 0) {
      res.send({
        message: "Asset template was deleted successfully!",
      });
    } else {
      res.send({
        message: `Cannot delete asset template with id=${id}. Maybe asset template was not found!`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Could not delete asset template with id=" + id,
    });
  });
};
