"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = __importDefault(require("./base"));
const util_1 = __importDefault(require("../util"));
const discord_js_1 = require("discord.js");
class StageChannelArgumentType extends base_1.default {
    constructor(client) {
        super(client, 'stage-channel');
    }
    validate(val, msg, arg) {
        const matches = val.match(/^(?:<#)?(\d+)>?$/);
        if (matches) {
            try {
                const channel = msg.client.channels.resolve(matches[1]);
                if (!channel || channel.type !== discord_js_1.ChannelType.GuildStageVoice)
                    return false;
                if (arg.oneOf && !arg.oneOf.includes(channel.id))
                    return false;
                return true;
            }
            catch (err) {
                return false;
            }
        }
        if (!msg.guild)
            return false;
        const search = val.toLowerCase();
        let channels = msg.guild.channels.cache.filter(channelFilterInexact(search));
        const first = channels.first();
        if (!first)
            return false;
        if (channels.size === 1) {
            if (arg.oneOf && !arg.oneOf.includes(first.id))
                return false;
            return true;
        }
        const exactChannels = channels.filter(channelFilterExact(search));
        const exact = exactChannels.first();
        if (exactChannels.size === 1 && exact) {
            if (arg.oneOf && !arg.oneOf.includes(exact.id))
                return false;
            return true;
        }
        if (exactChannels.size > 0)
            channels = exactChannels;
        return channels.size <= 15
            ? `${util_1.default.disambiguation(channels.map(chan => (0, discord_js_1.escapeMarkdown)(chan.name)), 'stage channels')}\n`
            : 'Multiple stage channels found. Please be more specific.';
    }
    parse(val, msg) {
        const matches = val.match(/^(?:<#)?(\d+)>?$/);
        if (matches)
            return msg.client.channels.resolve(matches[1]);
        if (!msg.guild)
            return null;
        const search = val.toLowerCase();
        const channels = msg.guild.channels.cache.filter(channelFilterInexact(search));
        if (channels.size === 0)
            return null;
        if (channels.size === 1)
            return channels.first() ?? null;
        const exactChannels = channels.filter(channelFilterExact(search));
        if (exactChannels.size === 1)
            return exactChannels.first() ?? null;
        return null;
    }
}
exports.default = StageChannelArgumentType;
function channelFilterExact(search) {
    return (chan) => chan.type === discord_js_1.ChannelType.GuildStageVoice && chan.name.toLowerCase() === search;
}
function channelFilterInexact(search) {
    return (chan) => chan.type === discord_js_1.ChannelType.GuildStageVoice && chan.name.toLowerCase().includes(search);
}
//# sourceMappingURL=stage-channel.js.map