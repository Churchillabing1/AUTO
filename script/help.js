module.exports.config = {
    name: 'help',
    version: '1.0.0',
    role: 0,
    hasPrefix: true,
    aliases: ['info'],
    description: "Beginner's guide",
    usage: "Help [page] or [command]",
    credits: 'Develeoper',
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
            let helpMessage = `Command List:\n\n`;
            for (let i = start; i < Math.min(end, commands.length); i++) {
                helpMessage += `\t${i + 1}. 「 ${prefix}${commands[i]} 」\n`;
            }
            helpMessage += '\nEvent List:\n\n';
            eventCommands.forEach((eventCommand, index) => {
                helpMessage += `\t${index + 1}. 「 ${prefix}${eventCommand} 」\n`;
            });
            helpMessage += `\nPage ${page}/${Math.ceil(commands.length / pages)}. To view the next page, type '${prefix}help page number'. To view information about a specific command, type '${prefix}help command name'.\n\n`;
            helpMessage += `Developer: 🄲🄷🅄🅁🄲🄷🄸🄻🄻\nFacebook: https://www.facebook.com/profile.php?id=100087212564100`;
            api.sendMessage(helpMessage, event.threadID, event.messageID);
        } else if (!isNaN(input)) {
            // Remaining code remains unchanged
        } else {
            // Remaining code remains unchanged
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
