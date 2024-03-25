const db = require("../models");
const AssetField = db.assetField;

// Create and Save a new AssetField
exports.create = async (req, res) => {
  // Validate request
  if (!req.body.label || req.body.row === undefined || req.body.rowSpan === undefined || req.body.column === undefined || req.body.columnSpan === undefined || !req.body.assetTypeId) {
    return res.status(400).send({
      message: "Content cannot be empty!",
    });
  }

  // Create an AssetField
  const assetField = {
    id: req.body.id,
    label: req.body.label,
    row: req.body.row,
    rowSpan: req.body.rowSpan,
    column: req.body.column,
    columnSpan: req.body.columnSpan,
    required: req.body.required,
    templateField: req.body.templateField,
    type: req.body.type,
    assetTypeId: req.body.assetTypeId,
    fieldListId: req.body.fieldListId,
  };

  const type = await db.assetType.findByPk(assetField.assetTypeId, {
    as: "assetType",
    attributes: [],
    where: { categoryId: req.requestingUser.dataValues.editableCategories },
    required: true,
    include: {
      model: AssetField,
      as: "fields",
      attributes: ["row", "rowSpan", "column", "columnSpan"],
    }
  });
  
  if (!type) return res.status(400).send({
    message: "Error creating asset field! Maybe user is unauthorized.",
  });

  // Validate grid data
  if (!this.validateFields([assetField, ...(type.dataValues?.fields ?? [])])) return res.status(400).send({
    message: "Error creating asset field! Maybe grid data is invalid or label is duplicated.",
  });
  
  // Save AssetField in the database
  AssetField.create(assetField)
  .then((data) => {
    res.send(data);
  })
  .catch((err) => {
    res.status(500).send({
      message: err.message || "Some error occurred while creating the asset field.",
    });
  });
};

// Retrieve all AssetFields from the database.
exports.findAll = (req, res) => {
  AssetField.findAll({
    include: {
      model: db.assetType,
      as: "assetType",
      attributes: [],
      required: true,
      where: { categoryId: req.requestingUser.dataValues.viewableCategories },
    },
  })
  .then((data) => {
    res.send(data);
  })
  .catch((err) => {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving asset fields.",
    });
  });
};

// Find a single AssetField with an id
exports.findOne = (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid asset field id!",
  });

  AssetField.findByPk(id, {
    ...req.paginator,
    include: {
      model: db.assetType,
      as: "assetType",
      attributes: [],
      required: true,
      where: { categoryId: req.requestingUser.dataValues.viewableCategories },
    },
  })
  .then((data) => {
    if (data) {
      res.send(data);
    } else {
      res.status(404).send({
        message: `Cannot find asset field with id=${id}. Maybe user is unauthorized!`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Error retrieving asset field with id=" + id,
    });
  });
};

// Update an AssetField by the id in the request
exports.update = async (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid asset field id!",
  });

  const t = await db.sequelize.transaction();
  let error = false;

  try {
    const target = await AssetField.findByPk(id, {
      include: {
        model: db.assetType,
        as: "assetType",
        attributes: [],
        required: true,
        where: { categoryId: req.requestingUser.dataValues.editableCategories },
      },
      transaction: t,
    });

    if (!target) {
      res.status(404).send({
        message: "Error updating asset field! Maybe asset field was not found or user is unauthorized."
      });
      throw new Error();
    }

    const type = await db.assetType.findByPk(target.dataValues.assetTypeId, {
      attributes: ["identifierId"],
      include: {
        model: AssetField,
        as: "fields",
      },
      transaction: t,
    });

    // Correct a few attributes in case they don't line up
    if (type?.dataValues?.identifierId == id) req.body = {
      ...req.body,
      required: true,
      templateField: false,
    };

    // Make sure that the current asset field is in the list to be validated
    const fieldFamily = type?.dataValues?.fields?.map(field => field.get({ plain: true })) ?? [{ id, ...req.body }];
    let self = fieldFamily.findIndex(field => field.id == id);
    if (self >= 0) fieldFamily[self] = {
      ...fieldFamily[self],
      ...req.body,
    };

    if (!this.validateFields(fieldFamily)) {
      res.status(400).send({
        message: "Error updating asset field! Maybe asset field has a duplicated name or has invalid grid data."
      });
      throw new Error();
    }

    target.set(req.body);

    await target.save({ transaction: t })
    .then(data => {
      res.send({
        message: "Successfully updated asset field!",
      });
    })
    .catch(err => {
      error = true;
      res.status(500).send({
        message: "Error updating asset field with id=" + id,
      });
    })

    if (error) throw new Error();

    await t.commit();
  }
  catch {
    t.rollback();
  }
};

// Delete an AssetField with the specified id in the request
exports.delete = async (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid asset field id!",
  });

  const type = await AssetField.findByPk(id, {
    attributes: [],
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
    message: "Error deleting asset field! Maybe asset field was not found or user is unauthorized.",
  });

  AssetField.destroy({ where: { id } })
  .then((num) => {
    if (num > 0) {
      res.send({
        message: "Asset field was deleted successfully!",
      });
    } else {
      res.send({
        message: `Cannot delete asset field with id=${id}. Maybe asset field was not found!`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Could not delete asset field with id=" + id,
    });
  });
};

/**Validates fields to ensure that they do not overlap; have valid rows, rowspans, columns, and columnspans; and do not have any duplicate names
 * 
 * @param fields An array of fields to validate
 * 
 * @returns True if the fields are valid and do not overlap
*/
exports.validateFields = (fields) => {
  // All fields should fit in a grid which is at most 8 columns wide
  const grid = [];
  const newRow = [0, 0, 0, 0, 0, 0, 0, 0];
  const prevNames = new Set();

  // If any of the fields are already invalid, return early
  if (fields.some(field => (isNaN(parseInt(field.row)) || isNaN(parseInt(field.rowSpan)) || isNaN(parseInt(field.column)) || isNaN(parseInt(field.columnSpan)))
  || (field.row < 0 || field.rowSpan < 1 || field.column < 0 || field.columnSpan < 1 || field.column + field.columnSpan > newRow.length)))
  {
    return false;
  }

  // Validates to make sure that all fields do not collide with one another
  return fields.every(field => {
    if (prevNames.has(field.label)) return false;
    prevNames.add(field.label);

    // Create new rows as needed
    while (field.row >= grid.length) grid.push(newRow.map(num => num));

    for (let i = field.row; i < field.row + field.rowSpan; i++)
      for (let j = field.column; j < field.column + field.columnSpan; j++)
        if (++grid[i][j] > 1) return false;

    return true;
  });
};

/**Ensures that the minimum column and row of all of the fields are 0, essentially anchoring the grid to the upper left.
 * 
 * **Note: this function assumes that the fields have already been validated.** 
 * 
 * @param fields The fields to anchor
*/
exports.anchorFields = (fields) => {
  const minRow = fields?.reduce((prev, curr, i) => prev = curr.row < prev ? curr.row : prev, fields?.[0]?.row);
  const minCol = fields?.reduce((prev, curr, i) => prev = curr.column < prev ? curr.column : prev, fields?.[0]?.column);

  fields.forEach(field => {
    field.row -= minRow;
    field.column -= minCol;
  });
};