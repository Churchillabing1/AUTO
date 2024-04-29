"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return function changeBlockedStatus(userID, block, callback) {
    if (typeof userID !== "string") {
      return callback(new Error("userID must be a string"));
    }

    if (typeof block !== "boolean") {
      return callback(new Error("block must be a boolean"));
    }

    const resolveFunc = () => {};
    const rejectFunc = err => {};
    const returnPromise = new Promise((resolve, reject) => {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (!callback) {
      callback = (err, result) => {
        if (err) {
          return rejectFunc(err);
        }
        resolveFunc(result);
      };
    }

    defaultFuncs
      .post(
        `https://www.facebook.com/messaging/${block ? "" : "un"}block_messages/`,
        ctx.jar,
        {
          fbid: userID
        }
      )
      .then(utils.saveCookies.bind(null, ctx.jar))
      .then(utils.parseAndCheckLogin.bind(null, ctx, defaultFuncs))
      .then(function (resData) {
        if (resData.error) {
          throw new Error(`Facebook API returned an error: ${resData.error}`);
        }

        return callback(null, resData);
      })
      .catch(function (err) {
        log.error("changeBlockedStatus", err);
        return callback(err);
      });

    return returnPromise;
  };
};
