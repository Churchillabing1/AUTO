"use strict";

const util = require("util");

module.exports = function() {
  return function getEmojiUrl(char, size, pixelRatio) {
    // Resolves Facebook Messenger emoji image asset URL for an emoji character.
    // Supported sizes are 32, 64, and 128.
    // Supported pixel ratios are '1.0' and '1.5' (possibly more; haven't tested)

    // Validate input parameters
    if (typeof char !== "string" || char.length !== 1) {
      throw new Error("Invalid emoji character");
    }
    const supportedSizes = [32, 64, 128];
    if (supportedSizes.indexOf(size) === -1) {
      throw new Error("Invalid size");
    }
    const supportedPixelRatios = ["1.0", "1.5"];
    if (supportedPixelRatios.indexOf(pixelRatio) === -1) {
      throw new Error("Invalid pixel ratio");
    }

    const baseUrl = "https://static.xx.fbcdn.net/images/emoji.php/v8/z%s/%s";
    pixelRatio = pixelRatio || "1.0";

    // Generate the `ending` string
    let ending = util.format(
      "%s/%s/%s.png",
      pixelRatio,
      size,
      char.codePointAt(0).toString(16)
    );

    // Improved hashing function to handle invalid characters in the `ending` string
    let hash = 317426846;
    for (let i = 0; i < ending.length; i++) {
      hash = (hash << 5) - hash + ending.charCodeAt(i);
    }
    hash = (hash & 255).toString(16);

    // Return the final URL
    return util.format(baseUrl, hash, ending);
  };
};
