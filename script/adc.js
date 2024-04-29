const axios = require('axios');
const fs = require('fs');
const request = require('request');
const cheerio = require('cheerio');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { promisify } = require('util');
const unlinkFile = promisify(fs.unlink);

module.exports.config = {
  name: 'adc',
  version: '1.0.1',
  hasPermssion: 0,
  credits: 'D-Jukie',
  description: 'Apply code from various sources',
  usePrefix: true,
  commandCategory: 'Admin',
  usages: '[reply or text]',
  cooldowns: 0,
  dependencies: {
    'pastebin-api': '',
    'cheerio': '',
    'uuid': '',
  },
};

module.exports.run = async function ({ api, event, args }) {
  const { senderID, threadID, messageID, messageReply, type } = event;
  const { PasteClient } = require('pastebin-api');
  const client = new PasteClient('aeGtA7rxefvTnR3AKmYwG-jxMo598whT');

  const name = args[0] || 'noname';
  const fileName = `${name}.js`;
  const filePath = path.join(__dirname, fileName);

  if (type === 'message_reply') {
    const urlR = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
    const url = messageReply.body.match(urlR);

    if (!url) return api.sendMessage('Please reply to a valid link!', threadID, messageID);

    if (url[0].indexOf('pastebin') !== -1) {
      try {
        const response = await axios.get(url[0]);
        fs.writeFileSync(filePath, response.data, 'utf-8');
        return api.sendMessage(`Code applied to ${fileName}. Use "load" command to use!`, threadID, messageID);
      } catch (error) {
        return api.sendMessage('Error while applying the code!', threadID, messageID);
      }
    }

    if (url[0].indexOf('buildtool') !== -1 || url[0].indexOf('tinyurl.com') !== -1) {
      try {
        const response = await request(url[0]);
        const $ = cheerio.load(response.body);
        const code = $('.language-js').first().text();

        fs.writeFileSync(filePath, code, 'utf-8');
        return api.sendMessage(`Code applied to ${fileName}. Use "load" command to use!`, threadID, messageID);
      } catch (error) {
        return api.sendMessage('Error while applying the code!', threadID, messageID);
      }
    }

    if (url[0].indexOf('drive.google') !== -1) {
      try {
        const id = url[0].match(/[-\w]{25,}/)[0];
        const { data } = await axios.get(`https://drive.google.com/uc?id=${id}&export=download`, {
          responseType: 'arraybuffer',
        });

        fs.writeFileSync(filePath, data, 'binary');
        return api.sendMessage(`Code applied to ${fileName}. Use "load" command to use!`, threadID, messageID);
      } catch (error) {
        return api.sendMessage('Error while applying the code!', threadID, messageID);
      }
    }

    return api.sendMessage('Unsupported link!', threadID, messageID);
  }

  if (!args[0]) {
    return api.sendMessage('Please provide a file name!', threadID, messageID);
  }

  if (fs.existsSync(filePath)) {
    return api.sendMessage(`File "${fileName}" already exists!`, threadID, messageID);
  }

  try {
    const urlR = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
    const url = args[1].match(urlR);

    if (!url) return api.sendMessage('Please provide a valid link!', threadID, messageID);

    if (url[0].indexOf('pastebin') !== -1) {
      const paste = await client.createPaste({
        code: fs.readFileSync(filePath, 'utf-8'),
        expireDate: 'N',
        format: 'javascript',
        name,
        publicity: 1,
      });

      return api.sendMessage(`Code applied to pastebin: ${paste.url}`, threadID, messageID);
    }

    if (url[0].indexOf('buildtool') !== -1 || url[0].indexOf('tinyurl.com') !== -1) {
      const response = await request(url[0]);
      const $ = cheerio.load(response.body);
      const code = $('.language-js').first().text();

      fs.writeFileSync(filePath, code, 'utf-8');
      return api.sendMessage(`Code applied to ${fileName}. Use "load" command to use!`, threadID, messageID);
    }

    if (url[0].indexOf('drive.google') !== -1) {
      const id = url[0].match(/[-\w]{25,}/)[0];
      const { data } = await axios.get(`https://drive.google.com/uc?id=${id}&export=download`, {
        responseType: 'arraybuffer',
      });

      fs.writeFileSync(filePath, data, 'binary');
      return api.sendMessage(`Code applied to ${fileName}. Use "load" command to use!`, threadID, messageID);
    }

    return api.sendMessage('Unsupported link!', threadID, messageID);
  } catch (error) {
    return api.sendMessage('Error while applying the code!', threadID, messageID);
  }
};
