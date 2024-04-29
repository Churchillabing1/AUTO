"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return function addUserToGroup(userID, threadID, callback) {
    if (
      !callback &&
      (utils.getType(threadID) === "Function" ||
        utils.getType(threadID) === "AsyncFunction")
    ) {
      throw { error: "please pass a callback as a third argument." };
    }

    if (!callback) {
      throw { error: "please pass a callback as a third argument." };
    }

    if (utils.getType(threadID) !== "Number" && utils.getType(threadID) !== "String") {
      throw {
        error:
          "ThreadID should be of type Number or String and not " +
          utils.getType(threadID) +
          "."
      };
    }

    if (!Array.isArray(userID)) {
      userID = [userID];
    }

    for (const id of userID) {
      if (utils.getType(id) !== "Number" && utils.getType(id) !== "String") {
        throw {
          error:
            "Elements of userID should be of type Number or String and not " +
            utils.getType(id) +
            "."
        };
      }
    }

    if (!ctx.jar) {
      throw { error: "ctx.jar is not defined." };
    }

    const messageAndOTID = utils.generateOfflineThreadingID();
    const form = {
      client: "mercury",
      action_type: "ma-type:log-message",
      author: "fbid:" + ctx.userID,
      thread_id: "",
      timestamp: Date.now(),
      timestamp_absolute: "Today",
      timestamp_relative: utils.generateTimestampRelative(),
      timestamp_time_passed: "0",
      is_unread: false,
      is_cleared: false,
      is_forward: false,
      is_filtered_content: false,
      is_filtered_content_bh: false,
      is_filtered_content_account: false,
      is_spoof_warning: false,
      source: "source:chat:web",
      "source_tags[0]": "source:chat",
      log_message_type: "log:subscribe",
      status: "0",
      offline_threading_id: messageAndOTID,
      message_id: messageAndOTID,
      threading_id: utils.generateThreadingID(ctx.clientID),
      manual_retry_cnt: "0",
      thread_fbid: threadID,
      "log_message_data[added_participants]": userID.map((id) => "fbid:" + id),
    };

    defaultFuncs
      .post("https://www.facebook.com/messaging/send/", ctx.jar, form)
      .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
      .then((resData) => {
        if (!resData || resData.error) {
          throw resData || { error: "Add to group failed." };
        }

        return callback();
      })
      .catch((err) => {
        log.error("addUserToGroup", err);
        return callback(err);
      });
  };
};
