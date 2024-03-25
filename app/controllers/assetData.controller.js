const db = require("../models");
const AssetData = db.assetData;

//#region Create and Save a new AssetData
// exports.create = async (req, res) => {
//   // Validate request
//   if (!req.body.assetId || !req.body.fieldId) {
//     res.status(400).send({
//       message: "Content cannot be empty!",
//     });
//     return;
//   }

//   // Create an AssetData
//   const assetData = {
//     id: req.body.id,
//     value: req.body.value,
//     assetId: req.body.assetId,
//     fieldId: req.body.fieldId,
//   };

//   const type = await db.asset.findByPk(assetData.assetId, {
//     attributes: [],
//     include: {
//       model: db.assetType,
//       as: "type",
//       attributes: [],
//       where: { categoryId: req.requestingUser.dataValues.editableCategories },
//       required: true,
//     }
//   });

//   if (!type) return res.status(404).send({
//     message: "Error creating asset data! Maybe user is unauthorized.",
//   });

//   // Save AssetData in the database
//   AssetData.create(assetData)
//   .then((data) => {
//     res.send(data);
//   })
//   .catch((err) => {
//     res.status(500).send({
//       message: err.message || "Some error occurred while creating the asset data.",
//     });
//   });
// };
//#endregion

// Retrieve all AssetData from the database.
exports.findAll = (req, res) => {
  AssetData.findAll({
    ...req.paginator,
    include: {
      model: db.asset,
      as: "asset",
      attributes: [],
      required: true,
      include: {
        model: db.assetType,
        as: "type",
        attributes: [],
        required: true,
        where: { categoryId: req.requestingUser.dataValues.viewableCategories },
      },
    },
  })
  .then((data) => {
    res.send(data);
  })
  .catch((err) => {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving asset data.",
    });
  });
};

// Find a single AssetData with an id
exports.findOne = (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid asset data id!",
  });

  AssetData.findByPk(id, {
    include: {
      model: db.asset,
      as: "asset",
      attributes: [],
      required: true,
      include: {
        model: db.assetType,
        as: "type",
        attributes: [],
        required: true,
        where: { categoryId: req.requestingUser.dataValues.viewableCategories },
      },
    },
  })
  .then((data) => {
    if (data) {
      res.send(data);
    } else {
      res.status(404).send({
        message: `Cannot find assetdata with id=${id}. Maybe user is unauthorized!`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Error retrieving assetdata with id=" + id,
    });
  });
};

// Update an AssetData by the id in the request
exports.update = async (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid asset data id!",
  });

  if (req.body?.value !== undefined)
  {
    if (req.body.value !== null)
      req.body.value = req.body.value.trim();
    
    if ((req.body.value?.length ?? 0) < 1) return res.status(400).send({
      message: "Asset data value cannot be updated to an empty value!",
    });
  }

  if (req.body?.assetId !== undefined) delete req.body.assetId;
  if (req.body?.fieldId !== undefined) delete req.body.fieldId;

  const t = await db.sequelize.transaction();
  let error = false;

  try {
    const target = await AssetData.findByPk(id, {
      where: { id },
      include: {
        model: db.asset,
        as: "asset",
        attributes: ["id"],
        required: true,
        include: {
          model: db.assetType,
          as: "type",
          attributes: ["id"],
          required: true,
          where: { categoryId: req.requestingUser.dataValues.editableCategories },
          include: {
            model: db.assetField,
            as: "identifier",
            attributes: ["id"],
            required: false,
            where: { id: db.Sequelize.col("assetData.fieldId") },
          },
        },
      },
    });

    if (!target)
    {
      res.status(404).send({
        message: "Error updating asset data! Maybe user is unauthorized or asset data was not found.",
      });
      throw new Error();
    }
    
    target.set(req.body)

    // If the data's type's identifier exists, check to make sure the asset data is unique across its sibling identifiers
    const identifierId = target.dataValues.asset.dataValues.type.dataValues?.identifier?.dataValues?.id;
    if (!isNaN(parseInt(identifierId)))
    {
      const family = (await db.assetField.findByPk(identifierId, {
        attributes: [],
        include: {
          model: AssetData,
          as: "assetData",
          attributes: ["id", "value"],
        },
      }))?.get({ plain: true });

      if (!family) {
        res.status(500).send({
          message: "Error retrieving identifier and data!",
        });
        throw new Error();
      }

      if (family.assetData.some(data => data.id != id && data.value == target.dataValues.value)) {
        res.status(400).send({
          message: "Error updating asset data! Asset data is an identifier but is not unique to its asset.",
        });
        throw new Error();
      }
    }

    await target.save({ transaction: t })
    .catch(err => {
      error = true;
      res.status(500).send({
        message: "Error updating asset data with id=" + id,
      });
    });

    if (error) throw new Error();

    res.send({
      message: "Asset data was updated successfully.",
    });

    await t.commit();
  }
  catch {
    t.rollback();
  }
};
