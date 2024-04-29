"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function(defaultFuncs, api, ctx) {
  return async function createNewGroup(participantIDs, groupTitle, callback) {
    if (utils.getType(groupTitle) === "Function") {
      callback = groupTitle;
      groupTitle = null;
    }

    if (!Array.isArray(participantIDs) || participantIDs.length < 2) {
      throw new Error(
        "createNewGroup: participantIDs should be an array with at least 2 IDs."
      );
    }

    participantIDs.push(ctx.userID);

    const form = {
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "MessengerGroupCreateMutation",
      av: ctx.userID,
      doc_id: "577041672419534",
      variables: JSON.stringify({
        input: {
          entry_point: "jewel_new_group",
          actor_id: ctx.userID,
          participants: participantIDs.map(id => ({ fbid: id })),
          client_mutation_id:
            Math.round(Math.random() * 1024).toString(),
          thread_settings: {
            name: groupTitle,
            joinable_mode: "PRIVATE",
            thread_image_fbid: null
          }
        }
      })
    };

    try {
      const res = await defaultFuncs.post(
        "https://www.facebook.com/api/graphql/",
        ctx.jar,
        form
      );
      const resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(res);

      if (resData.errors) {
        throw resData;
      }

      return callback(null, resData.data.messenger_group_thread_create.thread.thread_key.thread_fbid);
    } catch (err) {
      log.error("createNewGroup", err);
      return callback(err);
    }
  };
};
