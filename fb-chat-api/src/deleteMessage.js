"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function(defaultFuncs, api, ctx) {
  return async function deleteMessage(messageOrMessages, callback) {
    if (!callback) {
      callback = function(err) {
        if (err) {
          return reject(err);
        }
        resolve();
      };
    }

    const form = {
      client: "mercury"
    };

    const messages = Array.isArray(messageOrMessages)
      ? messageOrMessages
      : [messageOrMessages];

    for (let i = 0; i < messages.length; i++) {
      form[`message_ids[${i}]`] = messages[i];
    }

    try {
      const res = await defaultFuncs.post(
        "https://www.facebook.com/ajax/mercury/delete_messages.php",
        ctx.jar,
        form
      );

      const resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(res);

      if (resData.error) {
        throw resData;
      }

      return callback();
    } catch (err) {
      log.error("deleteMessage", err);
      return callback(err);
    }
  };
};
