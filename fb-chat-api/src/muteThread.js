"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  // muteSecond: -1=permanent mute, 0=unmute, 60=one minute, 3600=one hour, etc.
  return function muteThread(threadID, muteSeconds, callback) {
    if (typeof muteSeconds !== "number" || muteSeconds < -1) {
      throw new Error("`muteSeconds` must be a number equal to or greater than -1");
    }

    const form = {
      thread_fbid: threadID,
      mute_settings: muteSeconds,
    };

    const promise = defaultFuncs
      .post("https://www.facebook.com/ajax/mercury/change_mute_thread.php", ctx.jar, form)
      .then(utils.saveCookies.bind(null, ctx.jar))
      .then(utils.parseAndCheckLogin.bind(null, ctx, defaultFuncs))
      .then((resData) => {
        if (resData.error) {
          throw resData;
        }

        if (callback) {
          return callback();
        }
      })
      .catch((err) => {
        if (callback) {
          return callback(err);
        }

        log.error("muteThread", err);
        throw err;
      });

    if (!callback) {
      return promise;
    }
  };
};
