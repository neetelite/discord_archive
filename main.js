console.log("starting");

import Discord from "discord.js-selfbot";

import fs from "fs";
import download from "download";

const client = new Discord.Client();
const token = "ODEwMjI3MDk3NzE2MTI5ODM0.YQPJlw.IehJWFtm7RkEjHPCNMHobB0eebI";

const servers_to_archive = ["869944530789597225", "855611975526645770"];
const channels_to_skip = ["bump", "gateway"];

const messages_from_channel = async (channel) => {
    var messages = [];
    var options = { limit: 100 };

    while (true) {
        const messages_fetched = await channel.messages.fetch(options);
        messages.push(...messages_fetched.array());
        options.before = messages_fetched.last().id;

        if (messages_fetched.size < options.limit) break;
    }

    return messages;
}

const message_return_get = (message) => {
    const garbage = {
        activity: message.activity,
        flags: message.flags,
        embeds: message.embeds,
        webhook: message.webhookID,
        application: message.applicationID,

        type: message.type,

        channel: message.channel.id,
        guild: message.guild.id,

        is_tts: message.tts,
        is_system: message.system,
        is_pinned: message.pinned,
        is_deleted: message.deleted,

        date_edited: message.editedTimestamp,
    };

    const attachments = [];
    for (const attachment of message.attachments.array()) {
        attachments.push(attachment.id);
    }

    var reference = null;
    if (message.reference) reference = message.reference.messageID;

    const message_return = {
        id: message.id,
        author: message.author.tag,

        date_created: message.createdTimestamp,

        content: message.content,
        attachments: attachments,

        reference: reference,
    }

    return (JSON.stringify(message_return));
}

const message_attachments_download = async (message, directory) => {
    for (const attachment of message.attachments.array()) {
        const filename = `${attachment.id}:${message.author.id}:${message.createdTimestamp}:${attachment.name}`;
        const path = `${directory}/${filename}`;

        if (!fs.existsSync(path)) {
            try {
                console.log(`\tFile downloading: ${path}`);
                await download(attachment.url, directory, { filename: filename });
            }
            catch (err) {
                console.log(`\t\tFile failed: ${path}\n${err}`);
                process.exit(1);
            }
        }
        else (`File already exists: ${path}`);
    }
}

const server_archive = async (guild) => {
    console.log(`Archiving ${guild.name}`);

    const dir_server = `./server/${guild.name}`;
    const dir_image = `${dir_server}/images`;
    if (!fs.existsSync(dir_image)) fs.mkdirSync(dir_image, { recursive: true });

    for (const channel of guild.channels.cache.array()) {
        if (channel.type != "text") continue;
        if (channels_to_skip.includes(channel.name)) continue;

        console.log(`\t${channel.name}`)

        const file_channel = `${dir_server}/${channel.name}.txt`;
        var file = fs.createWriteStream(file_channel);
        file.on('error', function (err) { (error) });

        var message_array = [];
        const messages = await messages_from_channel(channel);
        for (const message of messages) {
            message_array.unshift(message_return_get(message) + "\n");
            await message_attachments_download(message, dir_image);
        }

        file.write(message_array.join(''));
        file.end();
    }

}

client.on("ready", async () => {
    console.log("Logged in as " + client.user.tag);
})

client.on("message", async (message) => {
    try {
        if (!message.guild) return;
        if (!servers_to_archive.includes(message.guild.id)) return;
        if (message.type != "DEFAULT") return;

        if (message.content == "^archive") server_archive(message.guild);
        else {
            const dir_server = `./server/${message.guild.name}`;
            var file_channel = `${dir_server}/${message.channel.name}.txt`;

            const message_return = message_return_get(message);
            console.log(message_return);

            fs.appendFileSync(file_channel, message_return + "\n");

            const dir_image = `${dir_server}/images`;
            if (message.attachments.size > 0) await message_attachments_download(message, dir_image);
        }
    }
    catch (err) {
        console.log(err);
    }
})

client.login(token);
