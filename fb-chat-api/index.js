"use strict";

const utils = require("./utils");
const cheerio = require("cheerio");
const log = require("npmlog");

let checkVerified = null;

const defaultLogRecordSize = 100;
log.maxRecordSize = defaultLogRecordSize;

function setOptions(globalOptions, options) {
  const invalidOptions = Object.keys(options).filter(
    (option) =>
      [
        "online",
        "logLevel",
        "logRecordSize",
        "selfListen",
        "selfListenEvent",
        "listenEvents",
        "pageID",
        "updatePresence",
        "forceLogin",
        "userAgent",
        "autoMarkDelivery",
        "autoMarkRead",
        "listenTyping",
        "proxy",
        "autoReconnect",
        "emitReady",
      ].indexOf(option) === -1
  );

  if (invalidOptions.length > 0) {
    log.warn("setOptions", `Unrecognized options given to setOptions: ${invalidOptions}`);
  }

  Object.keys(options).forEach((key) => {
    switch (key) {
      case "online":
        globalOptions.online = Boolean(options.online);
        break;
      case "logLevel":
        log.level = options.logLevel;
        globalOptions.logLevel = options.logLevel;
        break;
      case "logRecordSize":
        log.maxRecordSize = options.logRecordSize;
        globalOptions.logRecordSize = options.logRecordSize;
        break;
      case "selfListen":
        globalOptions.selfListen = Boolean(options.selfListen);
        break;
      case "selfListenEvent":
        globalOptions.selfListenEvent = options.selfListenEvent;
        break;
      case "listenEvents":
        globalOptions.listenEvents = Boolean(options.listenEvents);
        break;
      case "pageID":
        globalOptions.pageID = options.pageID.toString();
        break;
      case "updatePresence":
        globalOptions.updatePresence = Boolean(options.updatePresence);
        break;
      case "forceLogin":
        globalOptions.forceLogin = Boolean(options.forceLogin);
        break;
      case "userAgent":
        globalOptions.userAgent = options.userAgent;
        break;
      case "autoMarkDelivery":
        globalOptions.autoMarkDelivery = Boolean(options.autoMarkDelivery);
        break;
      case "autoMarkRead":
        globalOptions.autoMarkRead = Boolean(options.autoMarkRead);
        break;
      case "listenTyping":
        globalOptions.listenTyping = Boolean(options.listenTyping);
        break;
      case "proxy":
        if (typeof options.proxy !== "string") {
          delete globalOptions.proxy;
          utils.setProxy();
        } else {
          globalOptions.proxy = options.proxy;
          utils.setProxy(globalOptions.proxy);
        }
        break;
      case "autoReconnect":
        globalOptions.autoReconnect = Boolean(options.autoReconnect);
        break;
      case "emitReady":
        globalOptions.emitReady = Boolean(options.emitReady);
        break;
      default:
        break;
    }
  });
}

// ... rest of the code

async function login(loginData, options, callback) {
  const validOptions = ["appState", "email", "password"];
  const invalidOptions = Object.keys(loginData).filter(
    (option) => validOptions.indexOf(option) === -1
  );

  if (invalidOptions.length > 0) {
    throw new Error(
      `Unrecognized options given to login: ${invalidOptions}`
    );
  }

  const globalOptions = {
    selfListen: false,
    selfListenEvent: false,
    listenEvents: false,
    listenTyping: false,
    updatePresence: false,
    forceLogin: false,
    autoMarkDelivery: true,
    autoMarkRead: false,
    autoReconnect: true,
    logRecordSize: defaultLogRecordSize,
    online: true,
    emitReady: false,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_2) AppleWebKit/600.3.18 (KHTML, like Gecko) Version/8.0.3 Safari/600.3.18",
  };

  setOptions(globalOptions, options);

  let prCallback = null;
  if (
    utils.getType(callback) !== "Function" &&
    utils.getType(callback) !== "AsyncFunction"
  ) {
    const [rejectFunc, resolveFunc] = [,];
    prCallback = async (error, api) => {
      if (error) {
        return rejectFunc(error);
      }
      return resolveFunc(api);
    };
    callback = prCallback;
  }

  try {
    await loginHelper(
      loginData.appState,
      loginData.email,
      loginData.password,
      globalOptions,
      callback,
      prCallback
    );
  } catch (error) {
    log.error("login", error.message || error);
    callback(error);
  }
}

module.exports = login;
