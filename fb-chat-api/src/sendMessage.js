"use strict";

const utils = require("../utils");
const log = require("npmlog");
const bluebird = require("bluebird");

const allowedProperties = {
  attachment: true,
  url: true,
  sticker: true,
  emoji: true,
  emojiSize: true,
  body: true,
  mentions: true,
  location: true,
};

module.exports = function (defaultFuncs, api, ctx) {
  function uploadAttachments(attachments) {
    const uploadPromises = [];

    // Create an array of promises
    for (let i = 0; i < attachments.length; i++) {
      if (!utils.isReadableStream(attachments[i])) {
        throw {
          error:
            "Attachment should be a readable stream and not " +
            utils.getType(attachments[i]) +
            "."
        };
      }

      const form = {
        upload_1024: attachments[i],
        voice_clip: "true",
      };

      uploadPromises.push(
        defaultFuncs
          .postFormData(
            "https://upload.facebook.com/ajax/mercury/upload.php",
            ctx.jar,
            form,
            {}
          )
          .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
          .then((resData) => {
            if (resData.error) {
              throw resData;
            }

            // We have to return the data unformatted unless we want to change it
            // back in sendMessage.
            return resData.payload.metadata[0];
          })
      );
    }

    // Resolve all promises
    return bluebird.all(uploadPromises);
  }

  function getUrlMetadata(url) {
    const form = {
      image_height: 960,
      image_width: 960,
      uri: url,
    };

    return defaultFuncs
      .post(
        "https://www.facebook.com/message_share_attachment/fromURI/",
        ctx.jar,
        form
      )
      .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
      .then((resData) => {
        if (resData.error) {
          throw resData;
        }

        if (!resData.payload) {
          throw { error: "Invalid url" };
        }

        return resData.payload.share_data.share_params;
      });
  }

  function sendContent(form, threadID, isSingleUser, messageAndOTID, callback) {
    // There are three cases here:
    // 1. threadID is of type array, where we're starting a new group chat with users
    //    specified in the array.
    // 2. User is sending a message to a specific user.
    // 3. No additional form params and the message goes to an existing group chat.
    if (Array.isArray(threadID)) {
      for (let i = 0; i < threadID.length; i++) {
        form[`specific_to_list[${i}]`] = `fbid:${threadID[i]}`;
      }
      form[`specific_to_list[${threadID.length}]`] = `fbid:${ctx.userID}`;
      form["client_thread_id"] = `root:${messageAndOTID}`;
      log.info("sendMessage", `Sending message to multiple users: ${threadID}`);
    } else {
      // This means that threadID is the id of a user, and the chat
      // is a single person chat
      if (isSingleUser) {
        form[`specific_to_list[0]`] = `fbid:${threadID}`;
        form[`specific_to_list[1]`] = `fbid:${ctx.userID}`;
        form["other_user_fbid"] = threadID;
      } else {
        form["thread_fbid"] = threadID;
      }
    }

    if (ctx.globalOptions.pageID) {
      form["author"] = `fbid:${ctx.globalOptions.pageID}`;
      form[`specific_to_list[1]`] = `fbid:${ctx.globalOptions.pageID}`;
      form["creator_info[creatorID]"] = ctx.userID;
      form["creator_info[creatorType]"] = "direct_admin";
      form["creator_info[labelType]"] = "sent_message";
      form["creator_info[pageID]"] = ctx.globalOptions.pageID;
      form["request_user_id"] = ctx.globalOptions.pageID;
      form["creator_info[profileURI]"] =
        `https://www.facebook.com/profile.php?id=${ctx.userID}`;
    }

    return defaultFuncs
      .post("https://www.facebook.com/messaging/send/", ctx.jar, form)
      .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
      .then((resData) => {
        if (!resData) {
          throw { error: "Send message failed." };
        }

        if (resData.error) {
          if (resData.error === 1545012) {
            log.warn(
              "sendMessage",
              "Got error 1545012. This might mean that you're not part of the conversation " +
                threadID
            );
          }
          throw resData;
        }

        const messageInfo = resData.payload.actions.reduce((p, v) => {
          return {
            threadID: v.thread_fbid,
            messageID: v.message_id,
            timestamp: v.timestamp,
          } || p;
        }, null);

        return messageInfo;
      });
  }

  function sendMessage(form, threadID, messageAndOTID, callback, isGroup) {
    return new Promise((resolve, reject) => {
      if (
        !callback &&
        (typeof threadID === "function" ||
          typeof threadID === "asyncFunction")
      ) {
        return reject({ error: "Pass a threadID as a second argument." });
      }

      if (
        !replyToMessage &&
        typeof callback === "string"
      ) {
        replyToMessage = callback;
        callback = function () { };
      }

      const messageAndOTID = utils.generateOfflineThreadingID();

      const form = {
        client: "mercury",
        action_type: "ma-type:user-generated-message",
        author: `fbid:${ctx.userID}`,
        timestamp: Date.now(),
        timestamp_absolute: "Today",
        timestamp_relative: utils.generateTimestampRelative(),
        timestamp_time_passed: "0",
        is_unread: false,
        is_cleared: false,
        is_forward: false,
        is_filtered_content: false,
        is_filtered_content_bh: false,
        is_filtered_content_account: false,
        is_filtered_content_quasar: false,
        is_filtered_content_invalid_app: false,
        is_spoof_warning: false,
        source: "source:chat:web",
        "source_tags[0]": "source:chat",
        body: msg.body ? msg.body.toString() : "",
        html_body: false,
        ui_push_phase: "V3",
        status: "0",
        offline_threading_id: messageAndOTID,
        message_id: messageAndOTID,
        threading_id: utils.generateThreadingID(ctx.clientID),
        "ephemeral_ttl_mode:": "0",
        manual_retry_cnt: "0",
        has_attachment: !!(msg.attachment || msg.url || msg.sticker),
        signatureID: utils.getSignatureID(),
        replied_to_message_id: replyToMessage
      };

      // Handle properties
      handleLocation(msg, form)
        .then(() => handleSticker(msg, form))
        .then(() => handleAttachment(msg, form))
        .then(() => handleUrl(msg, form))
        .then(() => handleEmoji(msg, form))
        .then(() => handleMention(msg, form))
        .then(() => sendContent(form, threadID, messageAndOTID, callback, isGroup))
        .then(resolve)
        .catch(reject);
    });
  }

  function handleLocation(msg, form) {
    if (msg.location) {
      if (msg.location.latitude == null || msg.location.longitude == null) {
        return Promise.reject({ error: "location property needs both latitude and longitude" });
      }

      form["location_attachment[coordinates][latitude]"] = msg.location.latitude;
      form["location_attachment[coordinates][longitude]"] = msg.location.longitude;
      form["location_attachment[is_current_location]"] = !!msg.location.current;
    }

    return Promise.resolve();
  }

  function handleSticker(msg, form) {
    if (msg.sticker) {
      form["sticker_id"] = msg.sticker;
    }

    return Promise.resolve();
  }

  function handleAttachment(msg) {
    if (msg.attachment) {
      return uploadAttachments(msg.attachment)
        .then((files) => {
          form["image_ids"] = files.map((file) => file.image_id);
          form["gif_ids"] = files.map((file) => file.gif_id);
          form["file_ids"] = files.map((file) => file.file_id);
          form["video_ids"] = files.map((file) => file.video_id);
          form["audio_ids"] = files.map((file) => file.audio_id);
        });
    }

    return Promise.resolve();
  }

  function handleUrl(msg, form) {
    if (msg.url) {
      form["shareable_attachment[share_type]"] = "100";

      return getUrlMetadata(msg.url)
        .then((params) => {
          form["shareable_attachment[share_params]"] = params;
        });
    }

    return Promise.resolve();
  }

  function handleEmoji(msg, form) {
    if (msg.emojiSize != null && msg.emoji == null) {
      return Promise.reject({ error: "emoji property is empty" });
    }
    if (msg.emoji) {
      if (msg.emojiSize == null) {
        msg.emojiSize = "medium";
      }
      if (
        msg.emojiSize != "small" &&
        msg.emojiSize != "medium" &&
        msg.emojiSize != "large"
      ) {
        return Promise.reject({ error: "emojiSize property is invalid" });
      }
      if (form["body"] != null && form["body"] != "") {
        return Promise.reject({ error: "body is not empty" });
      }
      form["body"] = msg.emoji;
      form["tags[0]"] = `hot_emoji_size:${msg.emojiSize}`;
    }

    return Promise.resolve();
  }

  function handleMention(msg, form) {
    if (msg.mentions) {
      const promises = [];

      for (let i = 0; i < msg.mentions.length; i++) {
        const mention = msg.mentions[i];

        const tag = mention.tag;
        if (typeof tag !== "string") {
          return Promise.reject({ error: "Mention tags must be strings." });
        }

        const offset = msg.body.indexOf(tag, mention.fromIndex || 0);

        if (offset < 0) {
          log.warn(
            "handleMention",
            `Mention for "${tag}" not found in message string.`
          );
        }

        if (mention.id == null) {
          log.warn("handleMention", "Mention id should be non-null.");
        }

        const id = mention.id || 0;
        form[`profile_xmd[${i}][offset]`] = offset;
        form[`profile_xmd[${i}][length]`] = tag.length;
        form[`profile_xmd[${i}][id]`] = id;
        form[`profile_xmd[${i}][type]`] = "p";
      }

      return Promise.all(promises);
    }

    return Promise.resolve();
  }

  return sendMessage;
};
