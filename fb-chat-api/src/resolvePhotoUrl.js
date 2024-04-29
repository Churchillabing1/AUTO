"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function(defaultFuncs, api, ctx) {
  return function resolvePhotoUrl(photoID, callback) {
    if (typeof photoID !== "string") {
      return callback(new Error("Invalid photoID"));
    }

    let resolveFunc = function() {};
    let rejectFunc = function() {};

    if (!callback) {
      callback = function (err, photoUrl) {
        if (err) {
          return rejectFunc(err);
        }
        resolveFunc(photoUrl);
      };
    }

    defaultFuncs
      .get("https://www.facebook.com/mercury/attachments/photo", ctx.jar, {
        photo_id: photoID
      })
      .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
      .then(resData => {
        if (resData.error) {
          throw resData;
        }

        const photoUrl = resData.jsmods.require[0][3][0];

        return callback(null, photoUrl);
      })
      .catch(err => {
        if (callback) {
          log.error("resolvePhotoUrl", err);
          callback(err);
        } else {
          throw err;
        }
      });
  };
};
