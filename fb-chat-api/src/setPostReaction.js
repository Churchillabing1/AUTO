/**
 * @fix by NTKhang
 * update as Thursday, 10 February 2022
 * do not remove the author name to get more updates
 */

"use strict";

const utils = require("../utils");
const log = require("npmlog");

function formatData(resData) {
  return {
    viewer_feedback_reaction_info: resData.feedback_react.feedback.viewer_feedback_reaction_info,
    supported_reactions: resData.feedback_react.feedback.supported_reactions,
    top_reactions: resData.feedback_react.feedback.top_reactions.edges,
    reaction_count: resData.feedback_react.feedback.reaction_count
  };
}

const map = {
  unlike: 0,
  like: 1,
  heart: 2,
  love: 16,
  haha: 4,
  wow: 3,
  sad: 7,
  angry: 8
};

const reactionTypes = ['unlike', 'like', 'heart', 'love', 'haha', 'wow', 'sad', 'angry'];

function isValidReactionType(type) {
  return reactionTypes.includes(type);
}

function isValidPostId(id) {
  return typeof id === 'string' && id.length > 0;
}

module.exports = function(defaultFuncs, api, ctx) {
  if (typeof defaultFuncs !== 'object' || defaultFuncs === null) {
    throw new Error('setPostReaction: defaultFuncs must be an object');
  }

  if (typeof api !== 'object' || api === null) {
    throw new Error('setPostReaction: api must be an object');
  }

  if (typeof ctx !== 'object' || ctx === null) {
    throw new Error('setPostReaction: ctx must be an object');
  }

  if (typeof map !== 'object' || map === null) {
    throw new Error('setPostReaction: map must be an object');
  }

  return function setPostReaction(postID, type, callback) {
    if (typeof callback !== 'function') {
      throw new Error('setPostReaction: callback must be a function');
    }

    if (!isValidPostId(postID)) {
      throw new Error('setPostReaction: Invalid post ID');
    }

    if (!isValidReactionType(type)) {
      throw new Error('setPostReaction: Invalid reaction type');
    }

    let promise = new Promise((resolve, reject) => {
      var form = {
        av: ctx.userID,
        fb_api_caller_class: "RelayModern",
        fb_api_req_friendly_name: "CometUFIFeedbackReactMutation",
        doc_id: "4769042373179384",
        variables: JSON.stringify({
          input: {
            actor_id: ctx.userID,
            feedback_id: `feedback:${postID}`,
            feedback_reaction: map[type],
            feedback_source: "OBJECT",
            is_tracking_encrypted: true,
            tracking: [],
            session_id: "f7dd50dd-db6e-4598-8cd9-561d5002b423",
            client_mutation_id: Math.round(Math.random() * 19).toString()
          },
          useDefaultActor: false,
          scale: 3
        })
      };

      defaultFuncs
        .post("https://www.facebook.com/api/graphql/", ctx.jar, form)
        .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
        .then(resData => {
          if (resData.errors) {
            throw resData;
          }
          return callback(null, formatData(resData.data));
        })
        .catch(err => {
          log.error("setPostReaction", err);
          return callback(err);
        });
    });

    return promise;
  };
};
