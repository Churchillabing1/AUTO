"use strict";

// Rename the function to provide a more descriptive name
module.exports = function getCurrentUserID(defaultFuncs, api) {
  // Destructure the userID property from the context object
  const { userID } = api.context;

  // Return the userID
  return userID;
};

