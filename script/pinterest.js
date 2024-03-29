module.exports.config = {
    name: "pinte",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Joshua Sy",
    description: "Image search",
    usePrefix: false,
    commandCategory: "Search",
    usages: "[Text]",
    cooldowns: 0,
};

module.exports.run = async function({ api, event, args }) {
    const axios = require("axios");
    const fs = require("fs-extra");

    const keySearch = args.join(" ");
    if (!keySearch.includes("-")) return api.sendMessage('Please enter in the format, example: pic mia khalifa-10 (it depends on you how many images you want to appear in the result) credit by Shaon Ahmed', event.threadID, event.messageID);

    const [keySearchs, numberSearch] = keySearch.split("-");

    try {
        const res = await axios.get(`https://video-api-5i3d.onrender.com/pinterest?search=${encodeURIComponent(keySearchs)}`);
        const data = res.data.data.slice(0, parseInt(numberSearch) || 6);

        const imgData = await Promise.all(data.map(async (imageUrl, index) => {
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const imagePath = `./cache/${index + 1}.jpg`;
            fs.writeFileSync(imagePath, Buffer.from(response.data, 'utf-8'));
            return fs.createReadStream(imagePath);
        }));

        await api.sendMessage({
            attachment: imgData,
            body: `${numberSearch} Searching 🔎 results for you. Your keyword: ${keySearchs}`
        }, event.threadID, event.messageID);

        imgData.forEach(imagePath => fs.unlinkSync(imagePath));
    } catch (error) {
        console.error("Error:", error);
        return api.sendMessage("An error occurred while processing your request.", event.threadID, event.messageID);
    }
};
