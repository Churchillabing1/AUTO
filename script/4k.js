const axios = require('axios');
const tinyurl = require('tinyurl');

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
        const shortUrl = await tinyurl.shorten(imageUrl);

        api.sendMessage("ƪ⁠(⁠‾⁠.⁠‾⁠“⁠)⁠┐ | Please wait...", message.threadID);

        const response = await axios.get(`https://www.api.vyturex.com/upscale?imageUrl=${shortUrl}`);
        const resultUrl = response.data.resultUrl;

        api.sendMessage({ body: "<⁠(⁠￣⁠︶⁠￣⁠)⁠> | Image Enhanced.", attachment: await global.utils.getStreamFromURL(resultUrl) }, message.threadID);
    } catch (error) {
        api.sendMessage("┐⁠(⁠￣⁠ヘ⁠￣⁠)⁠┌ | Error: " + error.message, message.threadID);
        // Log error for debugging: console.error(error);
    }
};
