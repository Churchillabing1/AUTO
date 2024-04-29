"use strict";

const utils = require("../utils");
const log = require("npmlog");

const GRAPHQL_DOC_ID = "1768656253222505";

function formatMessage(threadID, data) {
  switch (data.__typename) {
    case "ThreadNameMessage":
      // ...
    case "ThreadImageMessage":
      // ...
    case "GenericAdminTextMessage":
      // ...
    case "UserMessage":
      // ...
    default:
      throw new Error(
        `Unknown message type: "${data.__typename}", if this happens to you let me know when it happens. Please open an issue at https://github.com/ntkhang03/fb-chat-api/issues.`
      );
  }
}

function parseDelta(threadID, delta) {
  if (delta.replied_to_message) {
    return Object.assign({}, formatMessage(threadID, delta), {
      messageReply: formatMessage(threadID, delta.replied_to_message.message),
    });
  } else {
    return formatMessage(threadID, delta);
  }
}

module.exports = function (defaultFuncs, api, ctx) {
  return function getMessage(threadID, messageID, callback) {
    if (!threadID || !messageID) {
      return callback({ error: "getMessage: need threadID and messageID" });
    }

    const form = {
      av: ctx.globalOptions.pageID,
      queries: JSON.stringify({
        o0: {
          doc_id: GRAPHQL_DOC_ID,
          query_params: {
            thread_and_message_id: {
              thread_id: threadID,
              message_id: messageID,
            },
          },
        },
      }),
    };

    defaultFuncs
      .post("https://www.facebook.com/api/graphqlbatch/", ctx.jar, form)
      .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
      .then((resData) => {
        if (resData.length > 0 && resData[resData.length - 1].error_results > 0) {
          throw resData[0].o0.errors;
        }

        if (
          resData.length > 0 &&
          resData[resData.length - 1].successful_results === 0
        ) {
          throw { error: "getMessage: there was no successful_results", res: resData };
        }

        const fetchData =
          resData.length > 0 && resData[resData.length - 1].data
            ? resData[resData.length - 1].data.message
            : null;

        if (fetchData) {
          callback(null, parseDelta(threadID, fetchData));
        } else {
          throw fetchData;
        }
      })
      .catch((err) => {
        log.error("getMessage", err);
        callback(err);
      });
  };
};

const colors = [
  // ...
];
