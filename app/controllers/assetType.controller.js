const db = require("../models");
const { validateFields, anchorFields } = require("./assetField.controller");
const AssetType = db.assetType;

// Create and Save a new AssetType
exports.create = (req, res) => {
  // Validate request
  if (!req.body.name || !req.body.categoryId) {
    return res.status(400).send({
      message: "Content cannot be empty!",
    });
  }

  // Create an AssetType
  const assetType = {
    id: req.body.id,
    name: req.body.name,
    circulatable: req.body.circulatable,
    categoryId: req.body.categoryId,
  };

  if (!req.requestingUser.dataValues.creatableCategories.includes(assetType.categoryId)) return res.status(400).send({
    message: "Error creating asset type! Maybe user is unauthorized.",
  });

  // Save AssetType in the database
  AssetType.create(assetType)
  .then((data) => {
    res.send(data);
  })
  .catch((err) => {
    res.status(500).send({
      message: err.message || "Some error occurred while creating the asset type.",
    });
  });
};

// Retrieve all AssetTypes from the database.
exports.findAll = (req, res) => {
  AssetType.findAll({
    ...req.paginator,
    where: { categoryId: req.requestingUser.dataValues.viewableCategories },
  })
  .then((data) => {
    res.send(data);
  })
  .catch((err) => {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving asset types.",
    });
  });
};

// Find a single AssetType with an id
exports.findOne = (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid asset type id!",
  });

  const includes = req?.query?.full != undefined ? {
    include: {
      model: db.assetField,
      as: "fields",
      attributes: {
        exclude: ["assetTypeId", "fieldListId"],
      },
      include: {
        model: db.fieldList,
        as: "fieldList",
        attributes: ["id", "name"],
      },
    },
  } : {};

  AssetType.findByPk(id, {
    where: { categoryId: req.requestingUser.dataValues.viewableCategories },
    ...includes,
  })
  .then((data) => {
    if (data) {
      res.send(data);
    } else {
      res.status(404).send({
        message: `Cannot find asset type with id=${id}. Maybe user is unauthorized!`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Error retrieving asset type with id=" + id,
    });
  });
};

// Update an AssetType by the id in the request
exports.update = async (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid asset type id!",
  });

  const t = await db.sequelize.transaction();
  const setFields = Array.isArray(req.body?.fields);
  const includes = setFields || (req.body?.identifierId !== undefined) ? {
    include: {
      model: db.assetField,
      as: "fields",
    },
  } : {};

  let error = false;

  try {
    const assetType = await AssetType.findByPk(id, {
      ...includes,
    });

    if (!assetType) {
      res.status(404).send({
        message: "Asset type not found!",
      });
      throw new Error();
    }
    else if (!req.requestingUser.dataValues.editableCategories?.includes(assetType?.dataValues?.categoryId))
    {
      res.status(401).send({
        message: "Access denied!",
      });
      throw new Error();
    }

    // Ensure that if identifier field is changed to a new one, its attributes are adjusted properly and its template data are deleted
    if (assetType.dataValues.identifierId != req.body?.identifierId && !isNaN(parseInt(req.body?.identifierId)))
    {
      const newIdentifier = assetType.dataValues.fields.find(field => field.dataValues.id == req.body.identifierId);
      if (!newIdentifier) {
        res.status(400).send({
          message: `Error updating identifier for asset type with id=${id}! Identifier does not belong to asset type!`,
        });
        throw new Error();
      }

      await db.templateData.destroy({
        where: {
          fieldId: req.body.identifierId,
        },
        transaction: t,
      })
      .catch(err => {
        error = true;
        res.status(500).send({
          message: `Error updating identifier for asset type with id=${id}! Maybe new identifier has dependent template data.`,
        });
      });
      
      if (error) throw new Error();

      // make sure all assets under the type have asset data for the field
      const assets = await db.asset.findAll({
        attributes: ["id"],
        where: { typeId: id },
        transaction: t,
        include: {
          model: db.assetData,
          as: "data",
          attributes: ["value"],
          where: { fieldId: req.body.identifierId },
          limit: 1,
        },
      });

      if (!assets) {
        res.status(500).send({
          message: "Error finding assets with typeId=" + id,
        });
        throw new Error();
      }

      const values = new Set();
      for (let i = 0; i < assets.length; i++)
      {
        const currData = assets[i].dataValues.data?.[0] ?? null;
        if (!currData?.value || values.has(currData.value)) {
          res.status(400).send({
            message: "Error updating asset type identifier! Not all assets have filled out the identifier with unique values.",
          });
          throw new Error();
        }
        values.add(currData.value);
      }

      newIdentifier.set({ required: true, templateField: false });
      await newIdentifier.save({ transaction: t })
      .catch(err => {
        error = true;
        res.status(500).send({
          message: `Error updating identifier for asset type with id=${id}.`,
        });
      });

      if (error) throw new Error();
    }

    if (setFields)
    {
      // So that the user doesn't technically have to send the whole field back to update them
      const existingFields = assetType?.get({ plain: true })?.fields;

      // Validates to make sure that all fields do not collide with one another
      const fields = req.body.fields.map(field => {
        const result = {
          ...(existingFields?.find(existing => existing.id == field.id || existing.label == field.label) ?? {}),
          ...field,
          assetTypeId: id,
        };

        if (result.id == (req.body?.identifierId ?? assetType.dataValues.identifierId)) {
          result.required = true;
          result.templateField = false;
        }

        return result;
      });
      const deleteFields = existingFields?.filter(field => !fields.find(updated => updated.id == field.id))?.map(field => field.id) ?? [];

      if (!validateFields(fields) || fields.some(field => !field.label || field.assetTypeId != id)) {
        res.status(400).send({
          message: "Error: asset field data is invalid!"
        });
        throw new Error();
      }

      anchorFields(fields);
      // Automatically creates the fields and connects them to the asset type
      await Promise.all(fields.map(async (field) => db.assetField.upsert(field, {
          where: { id: field.id },
          transaction: t,
          returning: true,
        })
        .catch(err => {
          error = true;
        })
      ));
        
      if (error) {
        res.status(500).send({
          message: "Error updating asset fields!",
        });
        throw new Error();
      }

      if (deleteFields.length > 0)
      {
        await db.assetField.destroy({ where: { id: deleteFields }, transaction: t })
        .catch(err => {
          error = true;
          res.status(500).send({
            message: "Error removing asset fields!",
          });
        });
      }
    }

    if (error) throw new Error();

    assetType.set(req.body);
    await assetType.save({ transaction: t })
    .catch(err => {
      error = true;
      res.status(500).send({
        message: "Error updating asset type with id=" + id,
      });
    });

    if (error) throw new Error();
    
    res.send({
      message: "Asset type was updated successfully.",
    });

    await t.commit();
  }
  catch {
    t.rollback();
  }
};

// Delete an AssetType with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid asset type id!",
  });

  AssetType.destroy({
    where: {
      id,
      categoryId: req.requestingUser.dataValues.deletableCategories,
    },
  })
  .then((num) => {
    if (num > 0) {
      res.send({
        message: "Asset type was deleted successfully!",
      });
    } else {
      res.send({
        message: `Cannot delete asset type with id=${id}. Maybe asset type was not found or user is unauthorized!`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Could not delete asset type with id=" + id,
    });
  });
};
