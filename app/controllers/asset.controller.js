const db = require("../models");
const Asset = db.asset;

// Create and Save a new Asset
exports.create = async (req, res) => {
  // Validate request
  if (!req.body.acquisitionDate || isNaN(parseInt(req.body.acquisitionPrice)) || !req.body.condition || !req.body.typeId) {
    return res.status(400).send({
      message: "Content cannot be empty!",
    });
  }

  // Create an Asset
  const asset = {
    id: req.body.id,
    acquisitionDate: req.body.acquisitionDate,
    acquisitionPrice: req.body.acquisitionPrice,
    dueDate: req.body.dueDate,
    condition: req.body.condition,
    templateId: req.body.templateId,
    typeId: req.body.typeId,
    borrowerId: req.body.borrowerId,
    locationId: req.body.locationId,
  };

  const type = await db.assetType.findByPk(asset.typeId, {
    attributes: ["id", "identifierId"],
    where: { categoryId: req.requestingUser.dataValues.creatableCategories },
    required: true,
    include: [
      {
        model: db.assetField,
        as: "fields",
        attributes: ["id", "required"],
      }
    ],
  });

  if (!type) return res.status(400).send({
    message: "Error creating asset! Maybe user is unauthorized.",
  });

  const t = await db.sequelize.transaction();
  let error = false;

  try {
    let result = {};
    await Asset.create(asset, { transaction: t })
    .then((data) => {
      result = data.get({ plain: true });
    })
    .catch((err) => {
      error = true;
      res.status(500).send({
        message: err.message || "Some error occurred while creating the asset.",
      });
    });
    
    if (error) throw new Error();

    const data = req.body.type?.fields?.filter(field => {
      if (!type.dataValues.fields?.find(typeField => typeField.dataValues.id == field.id)) return false;

      field.assetData = {
        ...(field.assetData ?? {}),
        assetId: result.id,
        fieldId: field.id,
      };
      field.assetData.value = field.assetData.value?.trim();

      return field.assetData.value?.length > 0;
    })?.map(field => field.assetData) ?? [];
    
    // If template can be found, exclude any asset data with matching field ids
    if (!isNaN(parseInt(asset.templateId))) {
      const template = (await db.assetTemplate.findByPk(asset.templateId, {
        attributes: ["id"],
        include: {
          model: db.templateData,
          as: "data",
          attributes: ["fieldId"],
        },  
      }))?.get({ plain: true });  

      if (!template) {
        res.status(404).send({
          message: "Error creating asset: invalid asset template id.",
        });  
        throw new Error();
      }

      // Overwrite all asset data that a template data already handles
      template.data.forEach(templateData => {
        const match = data.findIndex(assetData => assetData.fieldId == templateData.fieldId);
        if (match >= 0) data[match] = {
          ...data[match],
          ...templateData,
        };
      });
    }

    // Check required fields
    type.dataValues.fields.forEach(field => {
      error ||= field.dataValues.required && !data.find(assetData => assetData.fieldId == field.dataValues.id);
    });
    
    if (error) {
      res.status(400).send({
        message: "Error creating asset data! Not all required fields have been filled out.",
      });
      throw new Error();
    }

    // Check identifier
    if (!isNaN(parseInt(type.dataValues.identifierId))) {
      const identifier = await db.assetField.findByPk(type.dataValues.identifierId, {
        attributes: [],
        include: {
          model: db.assetData,
          as: "assetData",
          attributes: ["value"],
        },
      });

      if (!identifier) {
        res.status(400).send({
          message: "Error: invalid asset field id for identifier!",
        });
        throw new Error();
      }

      const identifierData = data.find(assetData => assetData.fieldId == type.dataValues.identifierId);
      if (identifier.dataValues.assetData?.some(assetData => assetData.value == identifierData.value)) {
        res.status(400).send({
          message: "Error: asset identifier is not unique!",
        });
        throw new Error();
      }
    }

    await db.assetData.bulkCreate(data, { transaction: t })
    .catch(err => {
      error = true;
      res.status(500).send({
        message: "Error creating asset data!",
      });
    });

    if (error) throw new Error();

    await Asset.findByPk(result.id, {
      transaction: t,
      include: {
        model: db.assetType,
        as: "type",
        attributes: ["name", "identifierId"],
        include: [
          {
            model: db.assetField,
            as: "fields",
            attributes: ["id", "label", "required"],
            include: {
              model: db.assetData,
              as: "assetData",
              where: {
                assetId: result.id,
              },
              limit: 1,
            },
          },
          {
            model: db.assetCategory,
            as: "category",
            attributes: ["name"],
          },
        ],
      },
    })
    .then(data => {
      result = data;
      result.dataValues.type.dataValues.fields.forEach(field => field.dataValues.assetData = field.dataValues.assetData?.[0] ?? null);
    })
    .catch(err => {
      console.log(err)
      error = true;
      res.send(500).send({
        message: "Error retrieving and serving new asset!",
      });
    });

    if (error) throw new Error();

    res.send(result);

    await t.commit();
  }
  catch {
    await t.rollback();
  }
};

// Retrieve all Assets from the database.
exports.findAll = (req, res) => {
  const raw = req.query?.raw != undefined;
  const typeIncludes = !raw ? this.displayAssetIncludes(null, req.requestingUser.dataValues.viewableCategories)[0].include : [];
  const assetIncludes = !raw ? [
    ...this.displayAssetIncludes(null, null).slice(1),
  ] : [];

  Asset.findAll({
    ...req.paginator,
    attributes: raw ? { exclude: [] } : ["id"],
    include: [
      {
        model: db.assetType,
        as: "type",
        attributes: raw ? [] : ["name"],
        required: true,
        where: { categoryId: req.requestingUser.dataValues.viewableCategories },
        include: typeIncludes,
      },
      ...assetIncludes
    ]
  })
  .then(async (data) => {
    if (!raw) {
      data.forEach(asset => {
        if (!!asset.dataValues.type.dataValues.identifier?.dataValues?.assetData)
          asset.dataValues.type.dataValues.identifier.dataValues.assetData = asset.dataValues.type.dataValues.identifier.dataValues.assetData?.[0] ?? null;
      })
    }

    res.send(data);
  })
  .catch((err) => {
    console.log(err)
    res.status(500).send({
      message: "Some error occurred while retrieving assets.",
    });
  });
};

// Find a single Asset with an id
exports.findOne = async (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid asset id!",
  });

  const full = req.query?.full != undefined;

  const typeIncludes = full ? [
    this.fullAssetIncludes(id, req.requestingUser.dataValues.viewableCategories, db.Sequelize.col("asset.templateId"))[0].include,
  ] : [];
  const assetIncludes = full ? this.fullAssetIncludes(id, null, null).slice(1) : [];

  let error = false;
  const asset = await Asset.findByPk(id, {
    attributes: {
      exclude: full ? ["templateId", "typeId", "borrowerId", "locationId"] : [],
    },
    include: [
      {
        model: db.assetType,
        as: "type",
        attributes: full ? ["id", "name", "identifierId"] : [],
        required: true,
        where: { categoryId: req.requestingUser.dataValues.viewableCategories },
        include: typeIncludes,
      },
      ...assetIncludes,
    ],
  })
  .catch((err) => {
    error = true;
    res.status(500).send({
      message: "Error retrieving asset with id=" + id,
    });
  });

  if (error) return;

  if (!asset) return res.status(404).send({
    message: `Cannot find asset with id=${id}. Maybe asset was not found or user is unauthorized!`,
  });

  const overwrittenData = [];
  asset.dataValues?.type?.dataValues?.fields
  ?.forEach(field => {
    field.dataValues.templateData = field.dataValues.templateData?.[0] ?? null;
    field.dataValues.assetData = field.dataValues.assetData?.[0] ?? null;
    if (field.dataValues.templateData !== null && field.dataValues.assetData !== null) {
      field.dataValues.assetData = null;
      overwrittenData.push(field.dataValues.id);
    }
  });

  const missingData = asset.dataValues?.type?.dataValues?.fields
  ?.filter(field => field.dataValues.required && !field.dataValues.assetData && !field.dataValues.templateData)
  ?.map(field => {
    return {
      assetId: id,
      fieldId: field.dataValues.id,
    };
  }) ?? [];

  if (full && (missingData.length > 0 || overwrittenData.length > 0)) {
    const t = await db.sequelize.transaction();

    try {
      // If any asset data is required and incomplete, create placeholder data
      if (missingData.length > 0)
      {
        const newData = await db.assetData.bulkCreate(missingData, { transaction: t });
        
        if (!newData) {
          res.status(500).send({
            message: "Error auto-filling required fields!",
          });
          throw new Error();
        }
        
        newData.forEach(data => {
          const owningField = asset.dataValues.type.dataValues.fields.find(field => field.dataValues.id == data.dataValues.fieldId);
          if (!owningField) return error = true;
          delete data.dataValues.id;
          delete data.dataValues.fieldId;
          delete data.dataValues.assetId;
          owningField.dataValues.assetData = data;
        });
  
        if (error) {
          res.status(500).send({
            message: "Error auto-filling required fields!",
          });
          throw new Error();
        }
      }

      // If any asset data is overwritten by a template, delete it
      if (overwrittenData.length > 0)
      {
        await db.assetData.destroy({
          transaction: t,
          where: {
            assetId: id,
            fieldId: overwrittenData,
          },
        })
        .catch(err => {
          error = true;
          res.status(500).send({
            message: "Error deleting overwritten asset data!",
          });
        });

        if (error) throw new Error();
      }

      await t.commit();
    }
    catch {
      return t.rollback();
    }
  }

  res.send(asset);
};

// Update an Asset by the id in the request
exports.update = async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).send({
    message: "Invalid asset id!",
  });

  if (req.body?.typeId !== undefined) delete req.body.typeId;

  const setData = req.body?.type?.fields !== undefined;
  const typeIncludes = setData || req.body?.templateId !== undefined ? [
    {
      model: db.assetField,
      as: "fields",
      attributes: ["id", "label", "required"],
      include: [
        {
          model: db.assetData,
          as: "assetData",
          required: false,
          where: { assetId: id },
        },
        {
          model: db.templateData,
          as: "templateData",
          required: false,
          where: { templateId: db.Sequelize.col("asset.templateId") },
        },
      ],
    },
  ] : [];

  const t = await db.sequelize.transaction();
  let error = false;

  try {
    const target = await Asset.findByPk(id, {
      where: { id },
      transaction: t,
      include: {
        model: db.assetType,
        as: "type",
        attributes: ["id", ...(req.body?.templateId !== undefined ? ["identifierId"] : [])],
        required: true,
        where: { categoryId: req.requestingUser.dataValues.editableCategories },
        include: typeIncludes,
      },
    });

    if (!target) {
      res.status(404).send({
        message: "Asset not found!",
      });
      throw new Error();
    }

    const changedTemplate = req.body?.templateId && target.dataValues.templateId != req.body.templateId;
    if (setData || changedTemplate) {
      // Match req.body.fields to target.dataValues.fields
      const simplifiedTarget = target.get({ plain: true });
      // This is to ensure that there are no duplicate entries
      const completedFieldIds = new Set();
      const filledFields = req.body?.type?.fields?.filter(field => {
        const fieldId = parseInt(field.id);
        if (!field.assetData?.value || isNaN(fieldId) || completedFieldIds.has(fieldId)) return false;

        // The field must match an existing one for the asset type
        const correspondingField = simplifiedTarget.type.fields.find(targetField => field.id == targetField.id);
        if (!correspondingField) return false;
        
        field.assetData = {
          ...(correspondingField.assetData?.[0] ?? {}),
          ...(field.assetData?.[0] ?? field.assetData ?? {}),
          fieldId: field.id,
          assetId: id,
        };
        field.assetData.value = field.assetData.value.trim();

        // Make sure the field is not empty
        const valid = field.assetData.value.length > 0;
        if (valid) completedFieldIds.add(fieldId);
        return valid;
      }) ?? [];
      const requiredFields = simplifiedTarget.type.fields.filter(field => field.required);

      // Determine what fields should be deleted
      const deletingFieldIds = simplifiedTarget.type.fields
      .filter(field => !!field?.assetData && !filledFields.find(filledField => filledField.id == field.id))
      .map(field => field.id);
      
      if (req.body?.templateId !== undefined && isNaN(parseInt(req.body.templateId))) {
        res.status(400).send({
          message: "Error updating asset template! Invalid template id.",
        });
        throw new Error();
      }
      // If changing the template, ensure that any required fields are filled out at the same time
      const templateFields = [];
      const template = await db.assetTemplate.findByPk(req.body?.templateId ?? simplifiedTarget.templateId, {
        attributes: ["assetTypeId"],
        include: {
          model: db.templateData,
          as: "data",
        },
      })
      .catch(err => {
        error = true;
        res.status(500).send({
          message: "Error retrieving asset template!",
        });
      });
      
      if (error) throw new Error();
      
      if (!!template) {
        // Make sure that the template belongs to the asset type
        if (template.dataValues.assetTypeId != simplifiedTarget.type.id)
        {
          res.status(400).send({
            message: "Error updating asset template! Asset template does not have the same asset type.",
          });
          throw new Error();
        }

        template.dataValues.data.forEach(data => {
          const matchFilled = filledFields.findIndex(field => field.id == data.fieldId);
          if (matchFilled < 0) return;
          
          const removing = filledFields.splice(matchFilled, 1);
          if (removing.assetData.id != undefined) deletingFieldIds.push(removing);
        })
      }

      // Ensure that all required fields have been completed
      const fieldSum = [...filledFields, ...templateFields];
      const requiredCompleted = requiredFields.every(reqField => !!fieldSum.find(field => field.id == reqField.id));
      if (!requiredCompleted) {
        const message = changedTemplate
        ? (req.body.templateId === null
        ? "Error updating asset! Cannot remove template without completing required fields."
        : "Error updating asset! The asset and new template do not complete all required fields.")
        : "Error updating asset! Not all required fields are complete.";

        res.status(400).send({ message });
        throw new Error();
      }
      
      // Ensure that the identifier field is unique to the asset
      const identifierField = filledFields.find(field => field.id == simplifiedTarget.type.identifierId);
      if (!!identifierField) {
        const match = await Asset.findAll({
          where: {
            id: {
              [db.Sequelize.Op.ne]: id,
            },
          },
          include: {
            model: db.assetData,
            as: "data",
            required: true,
            where: {
              fieldId: identifierField.id,
              value: identifierField.assetData.value,
            },
          },
          limit: 1,
        });

        if (!match) {
          res.status(500).send({
            message: "Error validating asset identifier!",
          });
          throw new Error();
        }

        if (match.length > 0) {
          res.status(400).send({
            message: "Error updating asset! Asset identifier is not unique.",
          });
          throw new Error();
        }
      }

      // Update the asset's data
      await Promise.all(filledFields.map(field => db.assetData.upsert(field.assetData, {
          transaction: t,
          where: { id: field.assetData.id },
          returning: true,
        })
        .catch(err => error = true)
      ));

      if (error) {
        res.status(500).send({
          message: "Error updating asset data!",
        });
        throw new Error();
      }
      
      // Remove any existing asset data being set to empty
      if (deletingFieldIds.length > 0)
      {
        await db.assetData.destroy({
          transaction: t,
          where: {
            id: deletingFieldIds,
          },
        })
        .catch(err => {
          error = true;
          res.status(500).send({
            message: "Error deleting empty asset data!",
          });
        });

        if (error) throw new Error();
      }
    }

    target.set(req.body);
    await target.save({ transaction: t })
    .catch((err) => {
      error = true;
      res.status(500).send({
        message: "Error updating asset with id=" + id,
      });
    });
    
    if (error) throw new Error();
    
    await t.commit();
    
    res.send({
      message: "Asset was updated successfully.",
    });
  }
  catch {
    t.rollback();
  }
};

// Delete an Asset with the specified id in the request
exports.delete = async (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid asset id!",
  });

  const type = await Asset.findByPk(id, {
    attributes: [],
    include: {
      model: db.assetType,
      as: "type",
      attributes: [],
      where: { categoryId: req.requestingUser.dataValues.deletableCategories },
      required: true,
      raw: true,
    },
  });

  if (!type) return res.status(404).send({
    message: "Error deleting asset! Maybe asset was not found or user is unauthorized.",
  });

  Asset.destroy({ where: { id } })
  .then((num) => {
    if (num > 0) {
      res.send({
        message: "Asset was deleted successfully!",
      });
    } else {
      res.send({
        message: `Cannot delete asset with id=${id}. Maybe asset was not found or user is unauthorized!`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Could not delete asset with id=" + id,
    });
  });
};

exports.fullAssetIncludes = (assetId, viewableCategories, templateId) => [
  {
    model: db.assetType,
    as: "type",
    attributes: ["id", "name", "identifierId"],
    required: true,
    where: { categoryId: viewableCategories ?? [] },
    include: {
      model: db.assetField,
      as: "fields",
      attributes: {
        exclude: ["createdAt", "updatedAt"],
      },
      include: [
        {
          model: db.assetData,
          as: "assetData",
          attributes: {
            exclude: ["assetId", "fieldId", "id"],
          },
          required: false,
          where: {
            assetId: assetId ?? [],
          },
          limit: 1,
        },
        {
          model: db.templateData,
          as: "templateData",
          attributes: {
            exclude: ["templateId", "fieldId", "id"],
          },
          required: false,
          where: {
            templateId: templateId ?? [],
          },
        },
      ],
    },
  },
  {
    model: db.assetTemplate,
    as: "template",
    attributes: ["id", "name"],
  },
  {
    model: db.person,
    as: "borrower",
    attributes: ["id", "fName", "lName", "email"],
  },
  {
    model: db.room,
    as: "location",
    attributes: ["id", "name"],
    include: {
      model: db.building,
      as: "building",
      attribtues: ["id", "name"],
    },
  },
  {
    model: db.log,
    as: "logs",
    attributes: {
      exclude: ["assetId", "authorId", "personId", "vendorId"],
    },
    include: [
      {
        model: db.user,
        as: "author",
        attributes: ["id"],
        include: {
          model: db.person,
          as: "person",
          attributes: ["id", "fName", "lName", "email"],
        }
      },
      {
        model: db.person,
        as: "person",
        attributes: ["id", "fName", "lName", "email"],
      },
      {
        model: db.vendor,
        as: "vendor",
        attributes: ["id", "name"],
      },
    ],
  },
  {
    model: db.alert,
    as: "alerts",
    attributes: {
      exclude: ["assetId", "typeId"],
    },
    include: {
      model: db.alertType,
      as: "type",
      attributes: ["id", "name"],
    },
  },
];

exports.displayAssetIncludes = (assetId, viewableCategories) => [
  {
    model: db.assetType,
    as: "type",
    attributes: ["id", "name"],
    required: true,
    where: { categoryId: viewableCategories ?? [] },
    include: [
      {
        model: db.assetCategory,
        as: "category",
        attributes: ["name"],
      },
      {
        model: db.assetField,
        as: "identifier",
        attributes: ["label"],
        required: false,
        include: {
          model: db.assetData,
          as: "assetData",
          attributes: ["value"],
          required: false,
          where: {
            assetId: assetId ?? db.Sequelize.col("asset.id"),
            //db.Sequelize.where(db.Sequelize.col("type->identifier->assetData.assetId"), db.Sequelize.col("asset.id")),
          }
        },
      },
    ],
  },
  {
    model: db.room,
    as: "location",
    attributes: ["name"],
    include: {
      model: db.building,
      as: "building",
      attributes: ["abbreviation"],
    },
  },
  {
    model: db.alert,
    as: "alerts",
  },
];