const db = require("../models");
const Permission = db.permission;

// Retrieve all Permissions from the database.
exports.findAll = (req, res) => {
  const denorm = req.query?.denormalized != undefined;
  let { offset, limit } = req.paginator;
  if (!denorm) req.paginator = {};

  Permission.findAll({
    ...req.paginator,
  })
  .then(async (data) => {
    const temp = data.map(permission => permission.get({ plain: true }));
    let result = temp
    
    if (!denorm)
    {
      result = normalize(temp, false);
      if (offset != undefined) result = result?.slice(offset, offset + limit);
    }

    res.send(result);
  })
  .catch((err) => {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving permissions.",
    });
  });
};

// Find a single Permission with an id
exports.findOne = (req, res) => {
  const id = req.params.id;
  if (isNaN(parseInt(id))) return res.status(400).send({
    message: "Invalid permission id!",
  });

  Permission.findByPk(id)
  .then((data) => {
    if (!!data) {
      res.send(data.get({ plain: true }));
    } else {
      res.status(404).send({
        message: `Cannot find permission with id=${id}.`,
      });
    }
  })
  .catch((err) => {
    res.status(500).send({
      message: "Error retrieving permission with id=" + id,
    });
  });
};

const permissionTiers = {
  none: 0,
  view: 1, 
  edit: 2,
  create: 3,
  delete: 4,
};

/**Finds and normalizes the permissions of the input object for the frontend
 * 
 * @param obj The object to find and normalize permissions for
*/
exports.normalizePermissions = (obj) => {
  if (!obj || ((typeof obj) != "object")) return obj;

  if (obj?.permissions?.constructor === Array) obj.permissions = normalize(obj.permissions);
  
  Object.keys(obj).forEach(key => this.normalizePermissions(obj[key]));

  return obj;
};

/**A helper function for normalizing a list of permissions as opposed to an object
 * 
 * @param permissions The list of permissions to normalize
 * @param sort Whether to sort the list of normalized permissions after normalizing
 * 
 * @returns A list of normalized permissions
*/
const normalize = (permissions, sort = true) => {
  const normalizedPerms = [];
  permissions.forEach(permission => {
    if (!permission?.categoryId) return normalizedPerms.push({
      name: permission.name,
      clearance: "full",
      report: false,
    });

    const normalizedName = `${permission.name.match(/"[\s\S]*"/i)}`.replaceAll("\"", "");
    const permissionGroup = normalizedPerms.find(perm => perm.name == normalizedName);
    
    const report = permission.name.match(/report/i)?.length > 0;
    const clearance = report ? "none"
    : permission.name.match(/view/i)?.length > 0 ? "view"
    : permission.name.match(/edit/i)?.length > 0 ? "edit"
    : permission.name.match(/create/i)?.length > 0 ? "create"
    : permission.name.match(/delete/i)?.length > 0 ? "delete"
    : "none";
    
    if (!permissionGroup) return normalizedPerms.push({
      name: normalizedName,
      clearance,
      report,
    });

    if (permissionTiers[permissionGroup.clearance] < permissionTiers[clearance]) permissionGroup.clearance = clearance;
    if (report) permissionGroup.report = true;
  });
  return sort ? normalizedPerms.sort((a, b) => a.name > b.name ? 1 : a.name < b.name ? -1 : 0) : normalizedPerms;
};

/**Finds and denormalizes the permissions of the input object for the backend
 * 
 * @param obj The object to find and denormalize permissions for
*/
exports.denormalizePermissions = async (obj, allPermissions = null) => {
  if (allPermissions == null) allPermissions = (await Permission.findAll({
    attributes: ["id", "name", "categoryId"],
  }))?.map(perm => perm?.get({ plain: true }));
  if (!allPermissions) throw { name: "PermissionRetrieveError", message: "Failed to retrieve all permissions" };

  if (!obj || ((typeof obj) != "object")) return obj;

  if (obj?.permissions?.constructor === Array) obj.permissions = denormalize(obj.permissions, allPermissions);
  
  Object.keys(obj).forEach(key => this.denormalizePermissions(obj[key], allPermissions));

  return obj;
};

/**A helper function for denormalizing a list of permissions as opposed to an object
 * 
 * @param permissionList The list of permissions to denormalize
 * @param allPermissions The list of all permissions to compare with
 * 
 * @returns A sorted array containing the IDs of all permissions recognized from the normalized permission list
*/
const denormalize = (permissionList, allPermissions) => {
  const denormalizedPerms = [];

  permissionList.forEach(permission => {
    let search = allPermissions.find(perm => perm.name.toLowerCase() === permission.name.toLowerCase());
    if (!!search) return denormalizedPerms.push(search);
    
    search = allPermissions.filter(perm => perm.name.toLowerCase().includes(permission.name.toLowerCase()) && !!perm.categoryId);
    if (!!search)
    {
      const expandedClearance = Object.entries(permissionTiers)
      .filter(entry => entry[1] <= permissionTiers[permission.clearance] && entry[1] > 0)
      .map(entry => entry[0]);
      const canReport = !!permission?.report;

      expandedClearance.forEach(clearance => {
        const existingPerm = search.find(perm => perm.name.toLowerCase().includes(clearance));
        if (!!existingPerm) denormalizedPerms.push(existingPerm);
      });
      if (canReport) denormalizedPerms.push(search.find(perm => perm.name.toLowerCase().includes("report")));
    }
  });

  return denormalizedPerms.map(perm => perm.id).sort((a, b) => a - b);
};