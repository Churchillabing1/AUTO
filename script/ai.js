const axios = require('axios');

module.exports.config = {
    name: "ai",
    version: 1.0,
    credits: "Otin",
    description: "AI",
    hasPrefix: false,
    usages: "{pn} [prompt]",
    aliases: ["ai"],
    cooldown: 0,
};

module.exports.run = async function ({ api, event, args }) {
    try {
        const prompt = args.join(" ");
        if (!prompt) {
            await api.sendMessage("🤖 CHURCHILL 𝗔𝗜\n\n𝙷𝚎𝚢 𝙸'𝚖 𝚢𝚘𝚞𝚛 𝚟𝚒𝚛𝚝𝚞𝚊𝚕 𝚊𝚜𝚜𝚒𝚜𝚝𝚊𝚗𝚝, 𝚊𝚜𝚔 𝚖𝚎 𝚊 𝚚𝚞𝚎𝚜𝚝𝚒𝚘𝚗.", event.threadID);
            return;
        }

        api.setMessageReaction("🔎", event.messageID, (err) => {}, true);
        const response = await axios.get(`https://sandipbaruwal.onrender.com/gpt?prompt=${encodeURIComponent(prompt)}`);
        api.setMessageReaction("✅", event.messageID, (err) => {}, true);
        const answer = response.data.answer;

        await api.sendMessage('🤖 C͟H͟U͟R͟C͟H͟I͟L͟L͟ A͟I͟' + answer, event.threadID);
        
        // Credits and developer link
        const creditsMessage = "The bot was created by Churchill\nDev link: https://www.facebook.com/profile.php?id=100087212564100";
        await api.sendMessage(creditsMessage, event.threadID);
    } catch (error) {
        console.error("⚠️ | Error Please Contact the Developer for an Error\n\n-fblink: https://www.facebook.com/jaymar.dev.00", error.message);
        api.setMessageReaction("⚠️", event.messageID, (err) => {}, true);
    }
};
