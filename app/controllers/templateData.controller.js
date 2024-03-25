const db = require("../models");
const TemplateData = db.templateData;

// Retrieve all TemplateDatas from the database.
exports.findAll = (req, res) => {
  TemplateData.findAll({
    ...req.paginator,
    include: {
      model: db.assetTemplate,
      as: "template",
      attributes: [],
      required: true,
      include: {
        model: db.assetType,
        as: "assetType",
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
      message: err.message || "Some error occurred while retrieving template data.",
    });
  });
};

// Find a single TemplateData with an id
exports.findOne = (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid template data id!",
  });

  TemplateData.findByPk(id, {
    include: {
      model: db.assetTemplate,
      as: "template",
      attributes: [],
      required: true,
      include: {
        model: db.assetType,
        as: "assetType",
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
        message: `Cannot find template data with id=${id}. Maybe user is unauthorized!`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Error retrieving template data with id=" + id,
    });
  });
};

// Update a TemplateData by the id in the request
exports.update = (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid template data id!",
  });

  if (req.body?.value !== undefined)
  {
    if (req.body.value !== null)
      req.body.value = req.body.value.trim();
    
    if ((req.body.value?.length ?? 0) < 1) return res.status(400).send({
      message: "Template data value cannot be updated to an empty value!",
    });
  }

  if (req.body?.templateId !== undefined) delete req.body.templateId;
  if (req.body?.fieldId !== undefined) delete req.body.fieldId;
  
  TemplateData.update(req.body, {
    where: { id },
    include: {
      model: db.assetTemplate,
      as: "template",
      attributes: [],
      required: true,
      include: {
        model: db.assetType,
        as: "assetType",
        attributes: [],
        required: true,
        where: { categoryId: req.requestingUser.dataValues.editableCategories },
      },
    },
  })
  .then((num) => {
    if (num > 0) {
      res.send({
        message: "Template data was updated successfully.",
      });
    } else {
      res.send({
        message: `Cannot update template data with id=${id}. Maybe template data was not found or req.body is empty!`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Error updating template data with id=" + id,
    });
  });
};
