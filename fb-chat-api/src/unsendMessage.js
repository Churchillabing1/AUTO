"use strict";

var utils = require("../utils");
var log = require("npmlog");

module.exports = function(defaultFuncs, api, ctx) {
  return function unsendMessage(messageID, callback) {
    var promise = new Promise(function (resolve, reject) {
      if (!callback) {
        callback = function (err, friendList) {
          if (err) {
            return reject(err);
          }
          resolve(friendList);
        };
      }
    });

    var form = {
      message_id: messageID
    };

    defaultFuncs
      .post(
        "https://www.facebook.com/messaging/unsend_message/",
        ctx.jar,
        form
      )
      .then(function(response) {
        return utils.parseAndCheckLogin(ctx, defaultFuncs)(response);
      })
      .then(function(resData) {
        if (resData.error) {
          throw resData;
        }

        return callback();
      })
      .catch(function(err) {
        if (err.response) {
          // Handle HTTP errors
          err = err.response.body;
        }

        log.error("unsendMessage", err);
        return callback(err);
      })
      .finally(function() {
        // Make sure the returned promise is always resolved or rejected
        callback = null;
      });

    return promise;
  };
};
