"use strict";

const utils = require("../utils");
const log = require("npmlog");
const util = require("util");

module.exports = function (defaultFuncs, api, ctx) {
  async function getUserInfo(threadID) {
    return new Promise((resolve, reject) => {
      api.getUserInfo(threadID, (err, userRes) => {
        if (err) {
          return reject(err);
        }
        resolve(userRes);
      });
    });
  }

  async function formatThread(threadData, userData) {
    return {
      name: userData.name || threadData.name,
      image_src: userData.thumbSrc || threadData.image_src,
    };
  }

  async function getThreadInfo(threadID, callback) {
    try {
      const userRes = await getUserInfo(threadID);
      const key = Object.keys(userRes).length > 0 ? "user_ids" : "thread_fbids";
      const form = {
        client: "mercury",
        "threads[${key}][0]": threadID,
      };

      if (ctx.globalOptions.pageId) {
        form.request_user_id = ctx.globalOptions.pageId;
      }

      const resData = await util.promisify(defaultFuncs.post)(
        "https://www.facebook.com/ajax/mercury/thread_info.php",
        ctx.jar,
        form
      );

      await util.promisify(utils.parseAndCheckLogin(ctx, defaultFuncs))(resData);

      if (resData.error) {
        throw resData;
      } else if (!resData.payload) {
        throw {
          error: "Could not retrieve thread Info.",
        };
      }

      const threadData = resData.payload.threads[0];

      if (threadData == null) {
        throw {
          error: "ThreadData is null",
        };
      }

      const formattedThread = await formatThread(threadData, userRes[threadID]);

      callback(null, formattedThread);
    } catch (err) {
      log.error("getThreadInfo", err);
      return callback(err);
    }
  }

  return getThreadInfo;
};
