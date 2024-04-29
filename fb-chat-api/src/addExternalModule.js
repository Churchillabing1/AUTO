"use strict";

const utils = require("../utils");

module.exports = function (defaultFuncs, api, ctx) {
  return function addExternalModule(moduleObj) {
    if (utils.getType(moduleObj) !== "Object") {
      throw new Error(`moduleObj must be an object, not ${utils.getType(moduleObj)}!`);
    }

    for (const [apiName, func] of Object.entries(moduleObj)) {
      if (utils.getType(func) !== "Function") {
        throw new Error(`Item "${apiName}" in moduleObj must be a function, not ${utils.getType(func)}!`);
      }

      api[apiName] = func(defaultFuncs, api, ctx);
    }
  };
};
