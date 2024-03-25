const db = require("../models");
const Session = db.session;
const User = db.user;

/**Creates and appends an object for pagination if needed*/
const getPage = async (req, res, next) => {
  const page = parseInt(req.query.page);
  const limit = parseInt(req.query.limit);
  req.paginator =  !!page && !!limit && page > 0 && limit > 0 ?
  {
    offset: (page - 1) * limit,
    limit,
  } : {};
  next();
};

/**Determines whether the user has a valid session and is not blocked*/
const authenticate = async (req, res, next) => {
  const authHeader = req.get("authorization");

  // Make sure auth header is not null
  if (!authHeader) return res.status(401).send({
    message: "Unauthorized! No Auth Header.",
  });

  // Make sure that the auth header is the one we want to recognize
  if (authHeader.startsWith("Bearer ")) {
    let session = {};
    let attempts = 10;
    do {
      session = (await Session.findOne({
        where: { token: authHeader.slice(7) },
        include: [
          {
            model: User,
            as: "user",
          },
        ],
      }))?.dataValues;

      // Erase the token in the database if either the token has expired or if the user has been blocked
      if (session?.expirationDate <= Date.now() || !!session?.user?.dataValues?.blocked) {
        await Session.update({ token: null }, { where: { token: session.token } })
        .catch((err) => {
          console.log("Error deleting token from database!");
        });

        // If the user has been blocked
        if (!!session?.user?.dataValues?.blocked) return res.status(401).send({
          message: "Unauthorized! User is blocked.",
        });
      }
    } while (session?.expirationDate <= Date.now() && --attempts > 0);

    if (session?.expirationDate > Date.now()) {
      req.requestingUser = session.user;
      next();
      return;
    }
    
    return res.status(401).send({
      message: "Unauthorized! Expired Token; Log out and log in again.",
    });
  }
  else
  {
    return res.status(401).send({
      message: "Unauthorized! Invalid authorization header."
    })
  }
};

/**Gets the user's permissions (and group priority, if applicable) and attaches them to req.requestingUser*/
const getPermissions = async (req, res, next) => {
  const userGroup = !((req.requestingUser.dataValues.groupExpiration ?? undefined) <= new Date()) ?
  await db.group.findByPk(req.requestingUser.dataValues.groupId)
  : undefined;
  req.requestingUser.dataValues.groupPriority = userGroup?.priority;
  
  // Get user's permissions
  const permissions = new Set([
    ...(await req.requestingUser.getPermissions()),
    ...((await userGroup?.getPermissions()) ?? [])
  ]);

  // If user does not have any permissions, exit early (commented for testing other things)
  if (permissions.size <= 0) return res.status(401).send({
    message: "Unauthorized! User does not have any permissions.",
  });

  req.requestingUser.dataValues.permissions = [...permissions.values()];
  next();
};

//#region Under Categories\
/**Gets the ids of categories that the user has permission to view under*/
const getViewableCategories = async (req, res, next) => {
  req.requestingUser.dataValues.viewableCategories = [...new Set(req.requestingUser.dataValues.permissions
  .filter(permission => !!permission.categoryId && permission.name.match(/View/i)?.length > 0)
  .map(permission => permission.categoryId))];

  if (req.requestingUser.dataValues.viewableCategories.length > 0) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to view data under any categories.",
  });
};

/**Gets the ids of categories that the user has permission to edit under*/
const getEditableCategories = async (req, res, next) => {
  req.requestingUser.dataValues.editableCategories = [...new Set(req.requestingUser.dataValues.permissions
  .filter(permission => !!permission.categoryId && permission.name.match(/Edit/i)?.length > 0)
  .map(permission => permission.categoryId))];

  if (req.requestingUser.dataValues.editableCategories.length > 0) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to edit data under any categories.",
  });
};

/**Gets the ids of categories that the user has permission to create under*/
const getCreatableCategories = async (req, res, next) => {
  req.requestingUser.dataValues.creatableCategories = [...new Set(req.requestingUser.dataValues.permissions
  .filter(permission => !!permission.categoryId && permission.name.match(/Create/i)?.length > 0)
  .map(permission => permission.categoryId))];

  if (req.requestingUser.dataValues.creatableCategories.length > 0) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to create data under any categories.",
  });
};

/**Gets the ids of categories that the user has permission to delete under*/
const getDeletableCategories = async (req, res, next) => {
  req.requestingUser.dataValues.deletableCategories = [...new Set(req.requestingUser.dataValues.permissions
  .filter(permission => !!permission.categoryId && permission.name.match(/Delete/i)?.length > 0)
  .map(permission => permission.categoryId))];

  if (req.requestingUser.dataValues.deletableCategories.length > 0) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to delete data under any categories.",
  });
};
//#endregion

/**A basic enum to let the user know their options*/
const PermTypes = {
  CREATE: 0,
  EDIT: 1,
  DELETE: 2,
  VIEW: 3,
};

/**Helper function to see if the name of a permission matches a regex
 * 
 * @param req The req object which contains the user and their permissions
 * @param name The regex-like string representing the name of the terget of the permissions
 * @param permType The type of permission to check for
*/
const checkHasPermission = (req, name, permType) => {
  const permissions = req?.requestingUser?.dataValues?.permissions;

  let type = "Create";
  if (Number.isInteger(permType))
  {
    switch(permType) {
      case PermTypes.EDIT:
        type = "Edit";
        break;
      case PermTypes.DELETE:
        type = "Delete";
        break;
      case PermTypes.VIEW:
        type = "View";
        break;
    };
  }
  else type = permType.trim().replace(/\s+/, "\\s*");

  name = name.trim().replace(/\s+/, "\\s*");
  const regex = new RegExp(`(${type}[\\s\\S]*${name})|(${name}[\\s\\S]*${type})`, "i");
  return !!permissions?.find(permission => permission?.name?.match(regex)?.length > 0);
};

//#region Alert Type Permissions
/**Denies the user if they don't have permission to create alert types*/
const checkCreateAlertType = async (req, res, next) => {
  if (checkHasPermission(req, "Alert Type", PermTypes.CREATE)) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to create alert types.",
  });
};

/**Denies the user if they don't have permission to edit alert types*/
const checkEditAlertType = async (req, res, next) => {
  if (checkHasPermission(req, "Alert Type", PermTypes.EDIT)) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to edit alert types.",
  });
};

/**Denies the user if they don't have permission to delete alert types*/
const checkDeleteAlertType = async (req, res, next) => {
  if (checkHasPermission(req, "Alert Type", PermTypes.DELETE)) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to delete alert types.",
  });
};
//#endregion

//#region Category Permissions
/**Denies the user if they don't have permission to create asset categories*/
const checkCreateCategory = async (req, res, next) => {
  if (checkHasPermission(req, "Category", PermTypes.CREATE)) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to create asset categories.",
  });
};

/**Denies the user if they don't have permission to edit asset categories*/
const checkEditCategory = async (req, res, next) => {
  if (checkHasPermission(req, "Category", PermTypes.EDIT)) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to edit asset categories.",
  });
};

/**Denies the user if they don't have permission to delete asset categories*/
const checkDeleteCategory = async (req, res, next) => {
  if (checkHasPermission(req, "Category", PermTypes.DELETE)) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to delete asset categories.",
  });
};
//#endregion

//#region Asset Type Permissions
/**Denies the user if they don't have permission to create asset types*/
const checkCreateAssetType = async (req, res, next) => {
  if (checkHasPermission(req, "Asset Type", PermTypes.CREATE)) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to create asset types.",
  });
};

/**Denies the user if they don't have permission to edit asset types*/
const checkEditAssetType = async (req, res, next) => {
  if (checkHasPermission(req, "Asset Type", PermTypes.EDIT)) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to edit asset types.",
  });
};

/**Denies the user if they don't have permission to delete asset types*/
const checkDeleteAssetType = async (req, res, next) => {
  if (checkHasPermission(req, "Asset Type", PermTypes.DELETE)) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to delete asset types.",
  });
};
//#endregion

//#region Asset Template Permissions
/**Denies the user if they don't have permission to create asset templates*/
const checkCreateTemplate = async (req, res, next) => {
  if (checkHasPermission(req, "Asset Profile", PermTypes.CREATE)) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to create asset templates.",
  });
};

/**Denies the user if they don't have permission to edit asset templates*/
const checkEditTemplate = async (req, res, next) => {
  if (checkHasPermission(req, "Asset Profile", PermTypes.EDIT)) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to edit asset templates.",
  });
};

/**Denies the user if they don't have permission to delete asset templates*/
const checkDeleteTemplate = async (req, res, next) => {
  if (checkHasPermission(req, "Asset Profile", PermTypes.DELETE)) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to delete asset templates.",
  });
};
//#endregion

//#region Field List Permissions
/**Denies the user if they don't have permission to create field lists*/
const checkCreateFieldList = async (req, res, next) => {
  if (checkHasPermission(req, "Field List", PermTypes.CREATE)) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to create field lists.",
  });
};

/**Denies the user if they don't have permission to edit field lists*/
const checkEditFieldList = async (req, res, next) => {
  if (checkHasPermission(req, "Field List", PermTypes.EDIT)) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to edit field lists.",
  });
};

/**Denies the user if they don't have permission to delete field lists*/
const checkDeleteFieldList = async (req, res, next) => {
  if (checkHasPermission(req, "Field List", PermTypes.DELETE)) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to delete field lists.",
  });
};
//#endregion

//#region Group Permissions
/**Denies the user if they don't have permission to create groups*/
const checkCreateGroup = async (req, res, next) => {
  if (checkHasPermission(req, "Group", PermTypes.CREATE)) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to create groups.",
  });
};

/**Denies the user if they don't have permission to edit groups*/
const checkEditGroup = async (req, res, next) => {
  if (checkHasPermission(req, "Group", PermTypes.EDIT)) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to edit groups.",
  });
};

/**Denies the user if they don't have permission to delete groups*/
const checkDeleteGroup = async (req, res, next) => {
  if (checkHasPermission(req, "Group", PermTypes.DELETE)) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to delete groups.",
  });
};
//#endregion

//#region Vendor Permissions
/**Denies the user if they don't have permission to create vendors*/
const checkCreateVendor = async (req, res, next) => {
  if (checkHasPermission(req, "Vendor", PermTypes.CREATE)) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to create vendors.",
  });
};

/**Denies the user if they don't have permission to edit vendors*/
const checkEditVendor = async (req, res, next) => {
  if (checkHasPermission(req, "Vendor", PermTypes.EDIT)) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to edit vendors.",
  });
};

/**Denies the user if they don't have permission to delete vendors*/
const checkDeleteVendor = async (req, res, next) => {
  if (checkHasPermission(req, "Vendor", PermTypes.DELETE)) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to delete vendors.",
  });
};
//#endregion

//#region User Permissions
/**Denies the user if they don't have permission to create users out of people*/
const checkCreateUser = async (req, res, next) => {
  if (checkHasPermission(req, "User", PermTypes.CREATE)) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to create users.",
  });
};

/**Denies the user if they don't have permission to view users*/
const checkViewUser = async (req, res, next) => {
  if (checkHasPermission(req, "User", PermTypes.VIEW)) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to view users.",
  });
};

/**Denies the user if they don't have any permissions to edit users, otherwise determines what they can do*/
const getEditUserPerms = async (req, res, next) => {
  const editPerms = {
    superBlock: checkHasPermission(req, "User", "Super Block"),
    superAssign: checkHasPermission(req, "Group", "Super Assign"),
    superPermit: checkHasPermission(req, "User Permission", "Super Change"),
  };
  editPerms.block = editPerms.superBlock || checkHasPermission(req, "User", "Block");
  editPerms.assign = editPerms.superAssign || checkHasPermission(req, "Group", "Assign");
  editPerms.permit = editPerms.superPermit || checkHasPermission(req, "User Permission", "Change");

  req.requestingUser.dataValues.editUserPerms = editPerms;

  if (Object.values(editPerms).reduce((prev, curr) => prev ||= curr, false)) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to edit users.",
  });
};

/**Denies the user if they don't have permission to remove users, otherwise determines if they have normal or super permission*/
const checkRemoveUser = async (req, res, next) => {
  req.requestingUser.dataValues.superRemove = checkHasPermission(req, "User", "Super Remove");

  if (req.requestingUser.dataValues.superRemove || checkHasPermission(req, "User", "Remove")) next();
  else res.status(401).send({
    message: "Unauthorized! User does not have permission to remove users.",
  });
};
//#endregion

// Load up object to export
module.exports = {
  authenticate,
  getPermissions,
  getViewableCategories,
  getEditableCategories,
  getCreatableCategories,
  getDeletableCategories,
  checkCreateAlertType,
  checkEditAlertType,
  checkDeleteAlertType,
  checkCreateCategory,
  checkEditCategory,
  checkDeleteCategory,
  checkCreateAssetType,
  checkEditAssetType,
  checkDeleteAssetType,
  checkCreateTemplate,
  checkEditTemplate,
  checkDeleteTemplate,
  checkCreateFieldList,
  checkEditFieldList,
  checkDeleteFieldList,
  checkCreateGroup,
  checkEditGroup,
  checkDeleteGroup,
  checkCreateVendor,
  checkEditVendor,
  checkDeleteVendor,
  checkCreateUser,
  checkViewUser,
  getEditUserPerms,
  checkRemoveUser,
  getPage,
  checkHasPermission,
  PermTypes,
};
