const fs = require('fs');
const axios = require('axios');

module.exports.config = {
    name: "resend",
    version: "1.0.0",
};

const msgData = {};

module.exports.handleEvent = async function ({ api, event }) {
    if (event.type == 'message') {
        msgData[event.messageID] = {
            body: event.body,
            attachments: event.attachments
        }
    }

    if (event.type == "message_unsend" && msgData.hasOwnProperty(event.messageID)) {
        const userInfo = await api.getUserInfo(event.senderID);
        const senderName = userInfo.name;

        if (msgData[event.messageID].attachments.length === 0) {
            api.sendMessage(`${senderName} unsent this message: ${msgData[event.messageID].body}`, event.threadID);
        } else {
            const attachment = getAttachment(msgData[event.messageID].attachments[0]);
            if (attachment) {
                api.sendMessage({ body: `${senderName} unsent this ${attachment.type}: ${msgData[event.messageID].body}`, attachment: attachment.stream }, event.threadID, () => {
                    if (attachment.deleteFile) {
                        fs.unlinkSync(attachment.filePath);
                    }
                });
            }
        }
    }
};

function getAttachment(attachment) {
    switch (attachment.type) {
        case 'photo':
            const photo = [];
            const photoFiles = [];
            for (const item of attachment.attachments) {
                axios.get(item.url, { responseType: "arraybuffer" })
                    .then(response => {
                        const filePath = `./script/cache/${item.filename}.jpg`;
                        fs.writeFileSync(filePath, Buffer.from(response.data));
                        photo.push(fs.createReadStream(filePath));
                        photoFiles.push(filePath);
                    })
                    .catch(error => {
                        console.error(`Error downloading photo: ${error}`);
                    });
            }

            if (photo.length > 0) {
                return { type: 'photo', stream: photo, deleteFile: true, filePath: photoFiles };
            }
            break;

        case 'audio':
            axios.get(attachment.url, { responseType: "arraybuffer" })
                .then(response => {
                    const filePath = `./script/cache/audio.mp3`;
                    fs.writeFileSync(filePath, Buffer.from(response.data));
                })
                .catch(error => {
                    console.error(`Error downloading audio: ${error}`);
                });

            return { type: 'audio', stream: fs.createReadStream('./script/cache/audio.mp3'), deleteFile: true, filePath: './script/cache/audio.mp3' };

        case 'animated_image':
            axios.get(attachment.previewUrl, { responseType: "arraybuffer" })
                .then(response => {
                    const filePath = `./script/cache/animated_image.gif`;
                    fs.writeFileSync(filePath, Buffer.from(response.data));
                })
                .catch(error => {
                    console.error(`Error downloading animated image: ${error}`);
                });

            return { type: 'animated_image', stream: fs.createReadStream('./script/cache/animated_image.gif'), deleteFile: true, filePath: './script/cache/animated_image.gif' };

        default:
            return null;
    }
}
