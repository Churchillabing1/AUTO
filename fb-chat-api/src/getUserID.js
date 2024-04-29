"use strict";

var utils = require("../utils");
var log = require("npmlog");

function formatData(data) {
  return {
    userID: utils.formatID(data.uid.toString()),
    photoUrl: data.photo,
    indexRank: data.index_rank,
    name: data.text,
    isVerified: data.is_verified,
    profileUrl: data.path,
    category: data.category,
    score: data.score,
    type: data.type
  };
}

module.exports = function(defaultFuncs, api, ctx) {
  if (!ctx || !ctx.userID) {
    throw new Error("Context object or userID is missing");
  }

  return function getUserID(name, callback) {
    if (typeof name !== "string") {
      throw new Error("name parameter must be a string");
    }

    var form = {
      value: name.toLowerCase(),
      viewer: ctx.userID,
      rsp: "search",
      context: "search",
      path: "/home.php",
      request_id: utils.getGUID()
    };

    return defaultFuncs
      .get("https://www.facebook.com/ajax/typeahead/search.php", ctx.jar, form)
      .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
      .then(function(resData) {
        if (resData.error) {
          throw resData;
        }

        var data = resData.payload.entries;

        if (data.length === 0) {
          return callback(new Error("No user found with the given name"));
        }

        return callback(null, formatData(data[0]));
      })
      .catch(function(err) {
        log.error("getUserID", err);
        return callback(err);
      });
  };
};
