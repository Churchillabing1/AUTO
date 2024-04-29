"use strict";

var utils = require("../utils");
var log = require("npmlog");
var bluebird = require("bluebird");

// Promisify the postFormData function
var postFormDataPromisified = bluebird.promisify(defaultFuncs.postFormData);

module.exports = function (defaultFuncs, api, ctx) {
  function handleUpload(image) {
    var uploads = [];

    var form = {
      profile_id: ctx.userID,
      photo_source: 57,
      av: ctx.userID,
      file: image
    };

    uploads.push(
      postFormDataPromisified(
        "https://www.facebook.com/profile/picture/upload/",
        ctx.jar,
        form,
        {}
      )
      .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
      .then(function (resData) {
        if (resData.error) {
          throw resData;
        }
        return resData;
      })
    );

    // resolve all promises
    return bluebird.all(uploads);
  }

  function changeAvatar(image, caption = "", timestamp = null) {
    return new bluebird(function (resolve, reject) {
      if (!utils.isReadableStream(image)) {
        return reject("Image is not a readable stream");
      }

      if (!ctx.jar || !defaultFuncs.postFormData) {
        return reject("Invalid context or defaultFuncs");
      }

      handleUpload(image)
        .then(function (payload) {
          var form = {
            av: ctx.userID,
            fb_api_req_friendly_name: "ProfileCometProfilePictureSetMutation",
            fb_api_caller_class: "RelayModern",
            doc_id: "5066134240065849",
            variables: JSON.stringify({
              input: {
                caption,
                existing_photo_id: payload[0].payload.fbid,
                expiration_time: timestamp,
                profile_id: ctx.userID,
                profile_pic_method: "EXISTING",
                profile_pic_source: "TIMELINE",
                scaled_crop_rect: {
                  height: 1,
                  width: 1,
                  x: 0,
                  y: 0
                },
                skip_cropping: true,
                actor_id: ctx.userID,
                client_mutation_id: Math.round(Math.random() * 19).toString()
              },
              isPage: false,
              isProfile: true,
              scale: 3
            })
          };

          return defaultFuncs
            .post("https://www.facebook.com/api/graphql/", ctx.jar, form)
            .then(utils.parseAndCheckLogin(ctx, defaultFuncs));
        })
        .then(function (resData) {
          if (resData.errors) {
            throw resData;
          }
          return resolve(resData[0].data.profile_picture_set);
        })
        .catch(function (err) {
          log.error("changeAvatar", err);
          return reject(err);
        });
    });
  }

  return changeAvatar;
};

