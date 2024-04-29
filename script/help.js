const {
    commandListMessage,
    eventListMessage,
    commandNotFoundMessage,
    eventNotFoundMessage,
    helpMessage
} = require('./helpers');

module.exports.config = {
    name: 'help',
    version: '1.0.0',
    role: 0,
    hasPrefix: true,
    aliases: ['info'],
    description: "Beginner's guide",
    usage: "Help [page] or [command]",
    credits: 'Developer',
};

module.exports.run = async function({
    api,
    event,
    enableCommands,
    args,
    Utils,
    prefix
}) {
    const input = args.join(' ');
    try {
        const eventCommands = enableCommands[1].handleEvent;
        const commands = enableCommands[0].commands;

        if (!input) {
            const pages = 20;
            let page = 1;
            let start = (page - 1) * pages;
            let end = start + pages;
            const helpMessage = commandListMessage(commands, prefix, pages, page, start, end);
            api.sendMessage(helpMessage, event.threadID, event.messageID);
        } else if (!isNaN(input)) {
            const pages = 20;
            let page = parseInt(input);
            if (page < 1 || page > Math.ceil(commands.length / pages)) {
                api.sendMessage(commandNotFoundMessage(prefix), event.threadID, event.messageID);
                return;
            }
            let start = (page - 1) * pages;
            let end = start + pages;
            const helpMessage = commandListMessage(commands, prefix, pages, page, start, end);
            api.sendMessage(helpMessage, event.threadID, event.messageID);
        } else {
            const command = commands.find(cmd => cmd.name.toLowerCase() === input.toLowerCase() || cmd.aliases.includes(input.toLowerCase()));
            if (!command) {
                api.sendMessage(eventNotFoundMessage(input, prefix), event.threadID, event.messageID);
                return;
            }
            const helpMessage = helpMessage(command, prefix);
            api.sendMessage(helpMessage, event.threadID, event.messageID);
        }
    } catch (error) {
        console.log(error);
    }
};

module.exports.handleEvent = async function({
    api,
    event,
    prefix
}) {
    const {
        threadID,
        messageID,
        body
    } = event;
    const message = prefix ? 'This is my prefix: ' + prefix : "Sorry i don't have prefix";
    if (body?.toLowerCase().startsWith('prefix')) {
        api.sendMessage(message, threadID, messageID);
    }
}

// helpers.js

const commandListMessage = (commands, prefix, pages, page, start, end) => {
    let helpMessage = `Command List:\n\n`;
    for (let i = start; i < Math.min(end, commands.length); i++) {
        helpMessage += `\t${i + 1}. 「 ${prefix}${commands[i].name} 」\n`;
    }
    helpMessage += '\nEvent List:\n\n';
    eventListMessage.forEach((eventCommand, index) => {
        helpMessage += `\t${index + 1}. 「 ${prefix}${eventCommand} 」\n`;
    });
    helpMessage += `\nPage ${page}/${Math.ceil(commands.length / pages)}. To view the next page, type '${prefix}help page number'. To view information about a specific command, type '${prefix}help command name'.\n\n`;
    helpMessage += `Developer: 🄲🄷🅄🅁🄲🄷🄸🄻🄻\nFacebook: https://www.facebook.com/profile.php?id=100087212564100`;
    return helpMessage;
}

const eventListMessage = [
    // Add event commands here
];

const commandNotFoundMessage = (input, prefix) => {
    return `Command or page not found. To view the command list, type '${prefix}help'. To view information about a specific command, type '${prefix}help command name'.`;
}

const eventNotFoundMessage = (input, prefix) => {
    return `Event or page not found. To view the event list, type '${prefix}help events'.`;
}

const helpMessage = (command, prefix) => {
    const {
        name,
        aliases,
        description,
        usage,
        credits
    } = command;
    let helpMessage = `Command: ${name}\n`;
    if (aliases.length > 0) {
        helpMessage += `Aliases: ${aliases.join(', ')}\n`;
    }
    if (description) {
        helpMessage += `Description: ${description}\n`;
    }
    if (usage) {
        helpMessage += `Usage: ${prefix}${usage}\n`;
    }
    if (credits) {
        helpMessage += `Credits: ${credits}\n`;
    }
    return helpMessage;
}

module.exports = {
    commandListMessage,
    eventListMessage,
    commandNotFoundMessage,
    eventNotFoundMessage,
    helpMessage
};
