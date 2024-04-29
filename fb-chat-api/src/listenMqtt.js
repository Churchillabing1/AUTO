/* eslint-disable no-redeclare */
"use strict";
const utils = require("../utils");
const log = require("npmlog");
const mqtt = require("mqtt");
const websocket = require("websocket-stream");
const HttpsProxyAgent = require("https-proxy-agent");
const EventEmitter = require("events");

const identity = function () { };

const topics = [
  "/legacy_web",
  "/webrtc",
  "/rtc_multi",
  "/onevc",
  "/br_sr", //Notification
  "/sr_res",
  "/t_ms",
  "/thread_typing",
  "/orca_typing_notifications",
  "/notify_disconnect",
  "/orca_presence",
  "/legacy_web_mtouch"
  // "/inbox",
  // "/mercury",
  // "/messaging_events",
  // "/orca_message_notifications",
  // "/pp",
  // "/webrtc_response",
];

async function listenMqtt(defaultFuncs, api, ctx, globalCallback) {
  //Don't really know what this does but I think it's for the active state?
  //TODO: Move to ctx when implemented
  const chatOn = ctx.globalOptions.online;
  const foreground = false;

  const sessionID = Math.floor(Math.random() * 9007199254740991) + 1;
  const username = {
    u: ctx.i_userID || ctx.userID,
    s: sessionID,
    chat_on: chatOn,
    fg: foreground,
    d: utils.getGUID(),
    ct: "websocket",
    //App id from facebook
    aid: "219994525426954",
    mqtt_sid: "",
    cp: 3,
    ecp: 10,
    st: [],
    pm: [],
    dc: "",
    no_auto_fg: true,
    gas: null,
    pack: [],
    a: ctx.globalOptions.userAgent,
    aids: null
  };
  const cookies = ctx.jar.getCookies("https://www.facebook.com").join("; ");

  let host;
  if (ctx.mqttEndpoint) {
    host = `${ctx.mqttEndpoint}&sid=${sessionID}`;
  } else if (ctx.region) {
    host = `wss://edge-chat.facebook.com/chat?region=${ctx.region.toLocaleLowerCase()}&sid=${sessionID}`;
  } else {
    host = `wss://edge-chat.facebook.com/chat?sid=${sessionID}`;
  }

  const options = {
    clientId: "mqttwsclient",
    protocolId: "MQIsdp",
    protocolVersion: 3,
    username: JSON.stringify(username),
    clean: true,
    wsOptions: {
      headers: {
        Cookie: cookies,
        Origin: "https://www.facebook.com",
        "User-Agent": ctx.globalOptions.userAgent,
        Referer: "https://www.facebook.com/",
        Host: new URL(host).hostname //'edge-chat.facebook.com'
      },
      origin: "https://www.facebook.com",
      protocolVersion: 13
    },
    keepalive: 10,
    reschedulePings: false
  };

  if (typeof ctx.globalOptions.proxy != "undefined") {
    const agent = new HttpsProxyAgent(ctx.globalOptions.proxy);
    options.wsOptions.agent = agent;
  }

  ctx.mqttClient = mqtt.connect(host, options);

  const mqttClient = ctx.mqttClient;

  mqttClient.on("error", function (err) {
    log.error("listenMqtt", err);
    mqttClient.end();
    if (ctx.globalOptions.autoReconnect) {
      listenMqtt(defaultFuncs, api, ctx, globalCallback);
    } else {
      utils.checkLiveCookie(ctx, defaultFuncs)
        .then(res => {
          globalCallback({
            type: "stop_listen",
            error: "Connection refused: Server unavailable"
          }, null);
        })
        .catch(err => {
          globalCallback({
            type: "account_inactive",
            error: "Maybe your account is blocked by facebook, please login and check at https://facebook.com"
          }, null);
        });
    }
  });

  mqttClient.on("close", function () {

  });

  mqttClient.on("connect", async function () {
    for (const topicsub of topics) {
      mqttClient.subscribe(topicsub);
    }

    let topic;
    const queue = {
      sync_api_version: 10,
      max_deltas_able_to_process: 1000,
      delta_batch_size: 500,
      encoding: "JSON",
      entity_fbid: ctx.i_userID || ctx.userID
    };

    if (ctx.syncToken) {
      topic = "/messenger_sync_get_diffs";
      queue.last_seq_id = ctx.lastSeqId;
      queue.sync_token = ctx.syncToken;
    } else {
      topic = "/messenger_sync_create_queue";
      queue.initial_titan_sequence_id = ctx.lastSeqId;
      queue.device_params = null;
    }

    try {
      await mqttClient.publish(topic, JSON.stringify(queue), { qos: 1, retain: false });
    } catch (err) {
      log.error("publish", err);
      mqttClient.end();
      if (ctx.globalOptions.autoReconnect) {
        listenMqtt(defaultFuncs, api, ctx, globalCallback);
      } else {
        utils.checkLiveCookie(ctx, defaultFuncs)
          .then(res => {
            globalCallback({
              type: "stop_listen",
              error: "Connection refused: Server unavailable"
            }, null);
          })
          .catch(err => {
            globalCallback({
              type: "account_inactive",
              error: "Maybe your account is blocked by facebook, please login and check at https://facebook.com"
            }, null);
          });
      }
      return;
    }

    // set status online
    // fix by NTKhang
    mqttClient.publish("/foreground_state", JSON.stringify({ foreground: chatOn }), { qos: 1 });
    mqttClient.publish("/set_client_settings", JSON.stringify({ make_user_available_when_in_foreground: true }), { qos: 1 });

    const rTimeout = setTimeout(function () {
      mqttClient.end();
      listenMqtt(defaultFuncs, api, ctx, globalCallback);
    }, 5000);

    ctx.tmsWait = function () {
      clearTimeout(rTimeout);
      ctx.globalOptions.emitReady ? globalCallback({
        type: "ready",
        error: null
      }) : "";
      delete ctx.tmsWait;
    };

  });

  mqttClient.on("message", async function (topic, message) {
    let jsonMessage;
    try {
      jsonMessage = JSON.parse(message.toString());
    } catch (e) {
      jsonMessage = {};
    }

    if (jsonMessage.type === "jewel_requests_add") {
      globalCallback(null, {
        type: "friend_request_received",
        actorFbId: jsonMessage.from.toString(),
        timestamp: Date.now().toString()
      });
    } else if (jsonMessage.type === "jewel_requests_remove_old") {
      globalCallback(null, {
        type: "friend_request_cancel",
        actorFbId: jsonMessage.from.toString(),
        timestamp: Date.now().toString()
      });
    } else if (topic === "/t_ms") {
      if (ctx.tmsWait && typeof ctx.tmsWait == "function") {
        ctx.tmsWait();
      }

      if (jsonMessage.firstDeltaSeqId && jsonMessage.syncToken) {
        ctx.lastSeqId = jsonMessage.firstDeltaSeqId;
        ctx.syncToken = jsonMessage.syncToken;
      }

      if (jsonMessage.lastIssuedSeqId) {
        ctx.lastSeqId = parseInt(jsonMessage.lastIssuedSeqId);
      }

      for (const delta of jsonMessage.deltas) {
        await parseDelta(defaultFuncs, api, ctx, globalCallback, { "delta": delta });
      }
    } else if (topic === "/thread_typing" || topic === "/orca_typing_notifications") {
      const typ = {
        type: "typ",
        isTyping: !!jsonMessage.state,
        from: jsonMessage.sender_fbid.toString(),
        threadID: utils.formatID((jsonMessage.thread || jsonMessage.sender_fbid).toString())
      };
      globalCallback(null, typ);
    } else if (topic === "/orca_presence") {
      if (!ctx.globalOptions.updatePresence) {
        for (const data of jsonMessage.list) {
          const userID = data["u"];

          const presence = {
            type: "presence",
            userID: userID.toString(),
            //Convert to ms
            timestamp: data["l"] * 1000,
            statuses: data["p"]
          };
          globalCallback(null, presence);
        }
      }
    }

  });

}

async function parseDelta(defaultFuncs, api, ctx, globalCallback, v) {
  if (v.delta.class == "NewMessage") {
    //Not tested for pages
    if (ctx.globalOptions.pageID &&
      ctx.globalOptions.pageID != v.queue
    )
      return;

    async function resolveAttachmentUrl(i) {
      if (i == (v.delta.attachments || []).length) {
        let fmtMsg;
        try {
          fmtMsg = utils.formatDeltaMessage(v);
        } catch (err) {
          return globalCallback({
            error: "Problem parsing message object. Please open an issue at https://github.com/ntkhang03/fb-chat-api/issues.",
            detail: err,
            res: v,
            type: "parse_error"
          });
        }
        if (fmtMsg) {
          if (ctx.globalOptions.autoMarkDelivery) {
            await markDelivery(ctx, api, fmtMsg.threadID, fmtMsg.messageID);
          }
        }
        return !ctx.globalOptions.selfListen &&
          (fmtMsg.senderID === ctx.i_userID || fmtMsg.senderID === ctx.userID) ?
          undefined :
          globalCallback(null, fmtMsg);
      } else {
        if (v.delta.attachments[i].mercury.attach_type == "photo") {
          const url = await api.resolvePhotoUrl(
            v.delta.attachments[i].fbid
          );
          v.delta.attachments[
            i
          ].mercury.metadata.url = url;
        }
        return resolveAttachmentUrl(i + 1);
      }
    }

    return resolveAttachmentUrl(0);
  }

  if (v.delta.class == "ClientPayload") {
    const clientPayload = utils.decodeClientPayload(
      v.delta.payload
    );

    if (clientPayload && clientPayload.deltas) {
      for (const delta of clientPayload.deltas) {
        if (delta.deltaMessageReaction && !!ctx.globalOptions.listenEvents) {
          globalCallback(null, {
            type: "message_reaction",
            threadID: (delta.deltaMessageReaction.threadKey
              .threadFbId ?
              delta.deltaMessageReaction.threadKey.threadFbId : delta.deltaMessageReaction.threadKey
                .otherUserFbId).toString(),
            messageID: delta.deltaMessageReaction.messageId,
            reaction: delta.deltaMessageReaction.reaction,
            senderID: delta.deltaMessageReaction.senderId == 0 ? delta.deltaMessageReaction.userId.toString() : delta.deltaMessageReaction.senderId.toString(),
            userID: (delta.deltaMessageReaction.userId || delta.deltaMessageReaction.senderId).toString()
          });
        } else if (delta.deltaRecallMessageData && !!ctx.globalOptions.listenEvents) {
          globalCallback(null, {
            type: "message_unsend",
            threadID: (delta.deltaRecallMessageData.threadKey.threadFbId ?
              delta.deltaRecallMessageData.threadKey.threadFbId : delta.deltaRecallMessageData.threadKey
                .otherUserFbId).toString(),
            messageID: delta.deltaRecallMessageData.messageID,
            senderID: delta.deltaRecallMessageData.senderID.toString(),
            deletionTimestamp: delta.deltaRecallMessageData.deletionTimestamp,
            timestamp: delta.deltaRecallMessageData.timestamp
          });
        } else if (delta.deltaRemoveMessage && !!ctx.globalOptions.listenEvents) {
          globalCallback(null, {
            type: "message_self_delete",
            threadID: (delta.deltaRemoveMessage.threadKey.threadFbId ?
              delta.deltaRemoveMessage.threadKey.threadFbId : delta.deltaRemoveMessage.threadKey
                .otherUserFbId).toString(),
            messageID: delta.deltaRemoveMessage.messageIds.length == 1 ? delta.deltaRemoveMessage.messageIds[0] : delta.deltaRemoveMessage.messageIds,
            senderID: api.getCurrentUserID(),
            deletionTimestamp: delta.deltaRemoveMessage.deletionTimestamp,
            timestamp: delta.deltaRemoveMessage.timestamp
          });
        }
      }
    }
  }

  if (v.delta.class !== "NewMessage" &&
    !ctx.globalOptions.listenEvents
  )
    return;

  switch (v.delta.class) {
    case "ReadReceipt":
      var fmtMsg;
      try {
        fmtMsg = utils.formatDeltaReadReceipt(v.delta);
      }
      catch (err) {
        return globalCallback({
          error: "Problem parsing message object. Please open an issue at https://github.com/ntkhang03/fb-chat-api/issues.",
          detail: err,
          res: v.delta,
          type: "parse_error"
        });
      }
      return globalCallback(null, fmtMsg);
    case "AdminTextMessage":
      switch (v.delta.type) {
        case "change_thread_theme":
        case "change_thread_nickname":
        case "change_thread_icon":
        case "change_thread_admins":
        case "group_poll":
        case "joinable_group_link_mode_change":
        case "magic_words":
        case "change_thread_approval_mode":
        case "messenger_call_log":
        case "participant_joined_group_call":
          var fmtMsg;
          try {
            fmtMsg = utils.formatDeltaEvent(v.delta);
          }
          catch (err) {
            return globalCallback({
              error: "Problem parsing message object. Please open an issue at https://github.com/ntkhang03/fb-chat-api/issues.",
              detail: err,
              res: v.delta,
              type: "parse_error"
            });
          }
          return globalCallback(null, fmtMsg);
        default:
          return;
      }
    //For group images
    case "ForcedFetch":
      if (!v.delta.threadKey) return;
      const mid = v.delta.messageId;
      const tid = v.delta.threadKey.threadFbId;
      if (mid && tid) {
        const form = {
          "av": ctx.globalOptions.pageID,
          "queries": JSON.stringify({
            "o0": {
              //This doc_id is valid as of March 25, 2020
              "doc_id": "2848441488556444",
              "query_params": {
                "thread_and_message_id": {
                  "thread_id": tid.toString(),
                  "message_id": mid
                }
              }
            }
          })
        };

        try {
          const resData = await defaultFuncs
            .post("https://www.facebook.com/api/graphqlbatch/", ctx.jar, form);
          await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

          if (resData[resData.length - 1].error_results > 0) {
            throw resData[0].o0.errors;
          }

          if (resData[resData.length - 1].successful_results === 0) {
            throw { error: "forcedFetch: there was no successful_results", res: resData };
          }

          const fetchData = resData[0].o0.data.message;

          const mobj = {};
          for (const n in fetchData.message.ranges) {
            mobj[fetchData.message.ranges[n].entity.id] = (fetchData.message.text || "").substr(fetchData.message.ranges[n].offset, fetchData.message.ranges[n].length);
          }

          globalCallback(null, {
            type: "event",
            threadID: utils.formatID(tid.toString()),
            messageID: fetchData.message_id,
            logMessageType: "log:thread-image",
            logMessageData: {
              attachmentID: fetchData.image_with_metadata && fetchData.image_with_metadata.legacy_attachment_id,
              width: fetchData.image_with_metadata && fetchData.image_with_metadata.original_dimensions.x,
              height: fetchData.image_with_metadata && fetchData.image_with_metadata.original_dimensions.y,
              url: fetchData.image_with_metadata && fetchData.image_with_metadata.preview.uri
            },
            logMessageBody: fetchData.snippet,
            timestamp: fetchData.timestamp_precise,
            author: fetchData.message_sender.id
          });
        } catch (err) {
          log.error("forcedFetch", err);
        }
      }
      break;
    case "ThreadName":
    case "ParticipantsAddedToGroupThread":
    case "ParticipantLeftGroupThread":
    case "ApprovalQueue":
      var formattedEvent;
      try {
        formattedEvent = utils.formatDeltaEvent(v.delta);
      } catch (err) {
        return globalCallback({
          error: "Problem parsing message object. Please open an issue at https://github.com/ntkhang03/fb-chat-api/issues.",
          detail: err,
          res: v.delta,
          type: "parse_error"
        });
      }
      return (!ctx.globalOptions.selfListenEvent && (formattedEvent.author.toString() === ctx.i_userID || formattedEvent.author.toString() === ctx.userID)) || !ctx.loggedIn ?
        undefined :
        globalCallback(null, formattedEvent);
  }
}

async function markDelivery(ctx, api, threadID, messageID) {
  if (threadID && messageID) {
    try {
      await api.markAsDelivered(threadID, messageID);
    } catch (err) {
      log.error("markAsDelivered", err);
    }

    if (ctx.globalOptions.autoMarkRead) {
      try {
        await api.markAsRead(threadID);
      } catch (err) {
        log.error("markAsDelivered", err);
      }
    }
  }
}

async function getSeqId(defaultFuncs, api, ctx, globalCallback) {
  try {
    const resData = await utils.get('https://www.facebook.com/', ctx.jar, null, ctx.globalOptions, { noRef: true });
    await utils.saveCookies(ctx.jar)(resData);

    const html = resData.body;
    const oldFBMQTTMatch = html.match(/irisSeqID:"(.+?)",appID:219994525426954,endpoint:"(.+?)"/);
    let mqttEndpoint = null;
    let region = null;
    let irisSeqID = null;
    let noMqttData = null;

    if (oldFBMQTTMatch) {
      irisSeqID = oldFBMQTTMatch[1];
      mqttEndpoint = oldFBMQTTMatch[2];
      region = new URL(mqttEndpoint).searchParams.get("region").toUpperCase();
      log.info("login", `Got this account's message region: ${region}`);
    } else {
      const newFBMQTTMatch = html.match(/{"app_id":"219994525426954","endpoint":"(.+?)","iris_seq_id":"(.+?)"}/);
      if (newFBMQTTMatch) {
        irisSeqID = newFBMQTTMatch[2];
        mqttEndpoint = newFBMQTTMatch[1].replace(/\\\//g, "/");
        region = new URL(mqttEndpoint).searchParams.get("region").toUpperCase();
        log.info("login", `Got this account's message region: ${region}`);
      } else {
        const legacyFBMQTTMatch = html.match(/(\["MqttWebConfig",\[\],{fbid:")(.+?)(",appID:219994525426954,endpoint:")(.+?)(",pollingEndpoint:")(.+?)(3790])/);
        if (legacyFBMQTTMatch) {
          mqttEndpoint = legacyFBMQTTMatch[4];
          region = new URL(mqttEndpoint).searchParams.get("region").toUpperCase();
          log.warn("login", `Cannot get sequence ID with new RegExp. Fallback to old RegExp (without seqID)...`);
          log.info("login", `Got this account's message region: ${region}`);
          log.info("login", `[Unused] Polling endpoint: ${legacyFBMQTTMatch[6]}`);
        } else {
          log.warn("login", "Cannot get MQTT region & sequence ID.");
          noMqttData = html;
        }
      }
    }

    ctx.lastSeqId = irisSeqID;
    ctx.mqttEndpoint = mqttEndpoint;
    ctx.region = region;
    if (noMqttData) {
      api["htmlData"] = noMqttData;
    }

    listenMqtt(defaultFuncs, api, ctx, globalCallback);
  } catch (err) {
    log.error("getSeqId", err);
  }
}

module.exports = function (defaultFuncs, api, ctx) {
  let globalCallback = identity;

  return function (callback) {
    class MessageEmitter extends EventEmitter {
      stopListening(callback) {

        callback = callback || (() => { });
        globalCallback = identity;
        if (ctx.mqttClient) {
          ctx.mqttClient.unsubscribe("/webrtc");
          ctx.mqttClient.unsubscribe("/rtc_multi");
          ctx.mqttClient.unsubscribe("/onevc");
          ctx.mqttClient.publish("/browser_close", "{}");
          ctx.mqttClient.end(false, function (...data) {
            callback(data);
            ctx.mqttClient = undefined;
          });
        }
      }

      async stopListeningAsync() {
        return new Promise((resolve) => {
          this.stopListening(resolve);
        });
      }
    }

    const msgEmitter = new MessageEmitter();
    globalCallback = (callback || function (error, message) {
      if (error) {
        return msgEmitter.emit("error", error);
      }
      msgEmitter.emit("message", message);
    });

    // Reset some stuff
    if (!ctx.firstListen)
      ctx.lastSeqId = null;
    ctx.syncToken = undefined;
    ctx.t_mqttCalled = false;

    if (!ctx.firstListen || !ctx.lastSeqId) {
      await getSeqId(defaultFuncs, api, ctx, globalCallback);
    } else {
      listenMqtt(defaultFuncs, api, ctx, globalCallback);
    }

    api.stopListening = msgEmitter.stopListening;
    api.stopListeningAsync = msgEmitter.stopListeningAsync;
    return msgEmitter;
  };
};
