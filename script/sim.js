const axios = require('axios');

module.exports.config = {
    name: 'sim',
    version: '1.0.0',
    role: 0,
    description: "Engage in conversation with an AI bot",
    usage: "sim [prompt]",
    credits: 'Developer',
    cooldown: 3,
};

module.exports.run = async function({ api, event, args }) {
    const input = args.join(" ");

    if (!input) {
        api.sendMessage("Please provide a text prompt. Usage: sim [text]", event.threadID, event.messageID);
        return;
    }

    try {
        const content = encodeURIComponent(input);
        const response = await axios.get(`https://simsimi.fun/api/v2/?mode=talk&lang=ph&message=${content}&filter=false`);
        const responseData = response.data;

        if (responseData.error) {
            api.sendMessage("An error occurred. Please try again later.", event.threadID, event.messageID);
        } else {
            api.sendMessage(responseData.success, event.threadID, event.messageID);
        }
    } catch (error) {
        if (error.response) {
            api.sendMessage("An error occurred while fetching the data. Please check your internet connection and try again.", event.threadID, event.messageID);
        } else if (error.request) {
            api.sendMessage("No response received from the server. Please check your internet connection and try again.", event.threadID, event.messageID);
        } else {
            api.sendMessage("An error occurred while making the request. Please check your internet connection and try again.", event.threadID, event.messageID);
        }
    }
};
