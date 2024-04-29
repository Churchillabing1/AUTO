"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return function createPoll(title, threadID, options, callback) {
    if (!title) {
      return callback(new Error("Title is required"));
    }

    if (!threadID) {
      return callback(new Error("Thread ID is required"));
    }

    if (typeof options !== "object") {
      return callback(new Error("Options must be an object"));
    }

    const resolveFunc = () => {};
    const rejectFunc = () => {};
    const returnPromise = new Promise((resolve, reject) => {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (!callback) {
      if (utils.getType(options) === "Function") {
        callback = options;
        options = null;
      } else {
        callback = function (err) {
          if (err) {
            return rejectFunc(err);
          }
          resolveFunc();
        };
      }
    }

    if (!options) {
      options = {}; // Initial poll options are optional
    }

    const form = {
      target_id: threadID,
      question_text: title,
    };

    let ind = 0;
    for (const opt in options) {
      // eslint-disable-next-line no-prototype-builtins
      if (options.hasOwnProperty(opt)) {
        form[`option_text_array[${ind}]`] = opt;
        form[`option_is_selected_array[${ind}]`] = options[opt] ? "1" : "0";
        ind++;
      }
    }

    defaultFuncs
      .post(
        "https://www.facebook.com/messaging/group_polling/create_poll/?dpr=1",
        ctx.jar,
        form
      )
      .then(utils.parseAndCheckLogin.bind(null, ctx, defaultFuncs))
      .then((resData) => {
        if (resData.payload.status !== "success") {
          throw resData;
        }

        return callback();
      })
      .catch((err) => {
        log.error("createPoll", err);
        return callback(err);
      });

    return returnPromise;
  };
};
