"use strict";

const utils = require("../utils");
const log = require("npmlog");

function getExtension(original_extension, filename = "") {
  if (typeof original_extension !== "string") {
    return "";
  }

  if (original_extension) {
    return original_extension;
  } else {
    const extension = filename.split(".").pop();
    return extension === filename ? "" : extension;
  }
}

// ... formatAttachmentsGraphQLResponse, formatExtensibleAttachment, formatReactionsGraphQL, formatEventData implementations ...

async function formatMessagesGraphQLResponse(data) {
  const messageThread = data.o0.data.message_thread;
  const threadID =
    messageThread.thread_key.thread_fbid || messageThread.thread_key.other_user_id;

  const messages = messageThread.messages.nodes.map(async (d) => {
    switch (d.__typename) {
      // ... cases for different message types ...
    }
  });

  return Promise.all(messages);
}

async function getThreadHistoryGraphQL(threadID, amount, timestamp, callback) {
  if (typeof threadID !== "string") {
    throw new Error("Invalid threadID");
  }

  if (typeof amount !== "number" || amount % 1 !== 0 || amount < 1) {
    throw new Error("Invalid amount");
  }

  if (typeof timestamp !== "number") {
    throw new Error("Invalid timestamp");
  }

  const form = {
    av: ctx.globalOptions.pageID,
    queries: JSON.stringify({
      o0: {
        doc_id: "1498317363570230",
        query_params: {
          id: threadID,
          message_limit: amount,
          load_messages: 1,
          load_read_receipts: false,
          before: timestamp,
        },
      },
    }),
  };

  try {
    const res = await utils.post(
      "https://www.facebook.com/api/graphqlbatch/",
      ctx.jar,
      form
    );
    const resData = await utils.parseAndCheckLogin(ctx, utils)(res);

    if (resData.error) {
      throw resData;
    }

    if (resData[resData.length - 1].error_results !== 0) {
      throw new Error("There was an error_result.");
    }

    const messages = formatMessagesGraphQLResponse(resData[0]);
    return callback(null, messages);
  } catch (err) {
    log.error("getThreadHistoryGraphQL", err);
    return callback(err);
  }
}

module.exports = {
  getThreadHistoryGraphQL,
  formatAttachmentsGraphQLResponse,
  formatExtensibleAttachment,
  formatReactionsGraphQL,
  formatEventData,
};
