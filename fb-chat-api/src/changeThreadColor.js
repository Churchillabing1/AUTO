"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return function changeThreadColor(color, threadID, callback) {
    // Validate color input
    if (color !== null && !/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(color)) {
      return callback(new Error("Invalid color input. Please provide a valid hex color code."));
    }

    // Validate threadID input
    if (typeof threadID !== "string" || threadID.trim() === "") {
      return callback(new Error("Invalid threadID input. Please provide a valid threadID."));
    }

    const validatedColor = color !== null ? color.toLowerCase() : color; // API only accepts lowercase letters in hex string

    const form = {
      dpr: 1,
      queries: JSON.stringify({
        o0: {
          //This doc_id is valid as of January 31, 2020
          doc_id: "1727493033983591",
          query_params: {
            data: {
              actor_id: ctx.userID,
              client_mutation_id: "0",
              source: "SETTINGS",
              theme_id: validatedColor,
              thread_id: threadID
            }
          }
        }
      })
    };

    // Create a new promise
    const returnPromise = new Promise((resolve, reject) => {
      defaultFuncs
        .post("https://www.facebook.com/api/graphqlbatch/", ctx.jar, form)
        .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
        .then(resData => {
          if (resData[resData.length - 1].error_results > 0) {
            throw resData[0].o0.errors;
          }

          // Resolve the promise if no error
          resolve();
        })
        .catch(err => {
          log.error("changeThreadColor", err);
          // Reject the promise with the error
          reject(err);
        });
    });

    // If no callback is provided, use the promise
    if (!callback) {
      return returnPromise;
    }

    // Attach the callback to the promise
    returnPromise.then(() => {
      callback(null);
    }).catch(err => {
      callback(err);
    });
  };
};
