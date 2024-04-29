"use strict";

var utils = require("../utils");
var log = require("npmlog");

module.exports = function(defaultFuncs, api, ctx) {
  return async function getThreadPictures(threadID, offset, limit, callback) {
    if (!callback) {
      callback = function (err, friendList) {
        if (err) {
          return rejectFunc(err);
        }
        resolveFunc(friendList);
      };
    }

    const form = {
      thread_id: threadID,
      offset: offset,
      limit: limit
    };

    try {
      const resData = await defaultFuncs
        .post(
          "https://www.facebook.com/ajax/messaging/attachments/sharedphotos.php",
          ctx.jar,
          form
        )
        .then(utils.parseAndCheckLogin(ctx, defaultFuncs));

      if (resData.error) {
        throw resData;
      }

      const imagePromises = resData.payload.imagesData.map(async function(image) {
        const form = {
          thread_id: threadID,
          image_id: image.fbid
        };

        const resData = await defaultFuncs
          .post(
            "https://www.facebook.com/ajax/messaging/attachments/sharedphotos.php",
            ctx.jar,
            form
          )
          .then(utils.parseAndCheckLogin(ctx, defaultFuncs));

        if (resData.error) {
          throw resData;
        }

        // the response is pretty messy
        const queryThreadID =
          resData.jsmods.require[0][3][1].query_metadata.query_path[0]
            .message_thread;
        const imageData =
          resData.jsmods.require[0][3][1].query_results[queryThreadID]
            .message_images.edges[0].node.image2;
        return imageData;
      });

      const resData = await Promise.all(imagePromises);
      callback(null, resData);
    } catch (err) {
      log.error("Error in getThreadPictures", err);
      callback(err);
    }
  };
};
