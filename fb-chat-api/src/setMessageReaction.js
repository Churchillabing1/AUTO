"use strict";

import { postFormData } from "../utils";
import { parseAndCheckLogin } from "../facebook/utils";
import { Jar } from "request";
import { npmlog } from "npmlog";

interface ISetMessageReactionOptions {
  reaction: string;
  messageID: string;
  callback?: (err: Error | null, result?: any) => void;
  forceCustomReaction?: boolean;
}

interface IReactionMapping {
  [key: string]: string;
}

const reactionMapping: IReactionMapping = {
  ":heart_eyes:": "\uD83D\uDE0D",
  ":love:": "\uD83D\uDE0D",
  ":laughing:": "\uD83D\uDE06",
  ":haha:": "\uD83D\uDE06",
  ":open_mouth:": "\uD83D\uDE2E",
  ":wow:": "\uD83D\uDE2E",
  ":cry:": "\uD83D\uDE22",
  ":sad:": "\uD83D\uDE22",
  ":angry:": "\uD83D\uDE20",
  ":like:": "\uD83D\uDC4D",
  ":dislike:": "\uD83D\uDC4E",
  ":glowingheart:": "\uD83D\uDC97",
};

const validReactions = [
  "\uD83D\uDE0D", //:heart_eyes:
  "\uD83D\uDE06", //:laughing:
  "\uD83D\uDE2E", //:open_mouth:
  "\uD83D\uDE22", //:cry:
  "\uD83D\uDE20", //:angry:
  "\uD83D\uDC4D", //:thumbsup:
  "\uD83D\uDC4E", //:thumbsdown:
  "\u2764", //:heart:
  "\uD83D\uDC97", //:glowingheart:
  "",
];

module.exports = function (defaultFuncs, api, ctx) {
  return function setMessageReaction({
    reaction,
    messageID,
    callback,
    forceCustomReaction,
  }: ISetMessageReactionOptions) {
    const returnPromise = new Promise<void>((resolve, reject) => {
      if (!callback) {
        callback = (err: Error | null, result?: any) => {
          if (err) {
            return reject(err);
          }
          resolve();
        };
      }
    });

    const isValidReaction = (reaction: string) =>
      validReactions.includes(reaction) || reactionMapping[reaction];

    const normalizedReaction =
      reactionMapping[reaction] ||
      (isValidReaction(reaction) ? reaction : forceCustomReaction ? reaction : null);

    if (!normalizedReaction) {
      return callback({ error: "Reaction is not a valid emoji." });
    }

    const variables = {
      data: {
        client_mutation_id: ctx.clientMutationId++,
        actor_id: ctx.userID,
        action: normalizedReaction === "" ? "REMOVE_REACTION" : "ADD_REACTION",
        message_id: messageID,
        reaction: normalizedReaction,
      },
    };

    const qs = {
      doc_id: "1491398900900362",
      variables: JSON.stringify(variables),
      dpr: 1,
    };

    postFormData(
      "https://www.facebook.com/webgraphql/mutation/",
      ctx.jar,
      {},
      qs
    )
      .then((resData) => parseAndCheckLogin(ctx.jar, defaultFuncs, resData))
      .then((resData) => {
        if (!resData) {
          throw { error: "setReaction returned empty object." };
        }
        if (resData.error) {
          throw resData;
        }
        callback(null);
      })
      .catch((err) => {
        npmlog.error("setReaction", err);
        return callback(err);
      });

    return returnPromise;
  };
};
