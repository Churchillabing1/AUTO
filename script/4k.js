const fetch = require('node-fetch');
const shorten = require('url-shortener');

module.exports.config = {
    name: "4k",
    aliases: ["4k", "remini"],
    version: "1.0",
    author: "JARiF",
    countDown: 15,
    role: 0,
    longDescription: "Upscale your image.",
    category: "image",
    guide: {
        en: "{pn} reply to an image"
    }
};

module.exports.onStart = async function ({ message, args, event, api }) {
    const getImageUrl = () => {
        if (event.type === "message_reply") {
            const replyAttachment = event.messageReply.attachments[0];
            if (["photo", "sticker"].includes(replyAttachment?.type)) {
                return replyAttachment.url;
            } else {
                throw new Error("┐⁠(⁠￣⁠ヘ⁠￣⁠)⁠┌ | Must reply to an image.");
            }
        } else if (args[0]?.match(/(https?:\/\/.*\.(?:png|jpg|jpeg))/g) || null) {
            return args[0];
        } else {
            throw new Error("(⁠┌⁠・⁠。⁠・⁠)⁠┌ | Reply to an image.");
        }
    };

    try {
        const imageUrl = await getImageUrl();

        api.sendMessage("ƪ⁠(⁠‾⁠.⁠‾⁠“⁠)⁠┐ | Please wait...", message.threadID);

        shorten(imageUrl, async function (shortUrl) {
            const response = await fetch(`https://www.api.vyturex.com/upscale?imageUrl=${encodeURIComponent(shortUrl)}`);
            const resultData = await response.json();
            const resultUrl = resultData.resultUrl;

            api.sendMessage({ body: "<⁠(⁠￣⁠︶⁠￣⁠)⁠> | Image Enhanced.", attachment: await global.utils.getStreamFromURL(resultUrl) }, message.threadID);
        });
    } catch (error) {
        api.sendMessage("┐⁠(⁠￣⁠ヘ⁠￣⁠)⁠┌ | Error: " + error.message, message.threadID);
        // Log error for debugging: console.error(error);
    }
};
