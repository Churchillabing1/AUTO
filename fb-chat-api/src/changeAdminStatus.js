"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return function changeAdminStatus(threadID, adminIDs, adminStatus, callback) {
    if (typeof threadID !== "string") {
      throw new Error("changeAdminStatus: threadID must be a string");
    }

    if (typeof adminStatus !== "boolean") {
      throw new Error("changeAdminStatus: adminStatus must be a boolean");
    }

    if (typeof callback !== "function") {
      throw new Error("changeAdminStatus: callback is not a function");
    }

    adminIDs = Array.isArray(adminIDs) ? adminIDs : [adminIDs];

    let form = {
      "thread_fbid": threadID,
      add: adminStatus,
    };

    form.admin_ids = adminIDs.map((id, index) => `admin_ids[${index}]`).map(key => form[key] = id);

    const returnPromise = new Promise((resolve, reject) => {
      callback = utils.getCallbackWrapper(callback, reject);

      defaultFuncs
        .post("https://www.facebook.com/messaging/save_admins/?dpr=1", ctx.jar, form)
        .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
        .then(resData => {
          if (resData.error) {
            switch (resData.error) {
              case 1976004:
                throw new Error("Cannot alter admin status: you are not an admin.", { resData });
              case 1357031:
                throw new Error("Cannot alter admin status: this thread is not a group chat.", { resData });
              default:
                throw new Error("Cannot alter admin status: unknown error.", { resData });
            }
          }

          resolve(resData);
        })
        .catch(err => {
          log.error("changeAdminStatus", err);
          callback(err);
        });
    });

    return returnPromise;
  };
};

function getCallbackWrapper(callback, reject) {
  return (err, result) => {
    if (err) {
      return reject(err);
    }

    callback(null, result);
  };
}
