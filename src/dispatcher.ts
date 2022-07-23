import { oneLine, stripIndent } from 'common-tags';
import {
    EmbedBuilder, ButtonBuilder, ActionRowBuilder, Message, CommandInteraction, GuildMember, TextBasedChannel,
    CommandInteractionOption,
    Colors,
    InteractionType,
    ChannelType,
    ButtonStyle,
    ApplicationCommandOptionType
} from 'discord.js';
import CommandoClient from './client';
import { ArgumentResponse } from './commands/argument';
import FriendlyError from './errors/friendly';
import CommandoGuild from './extensions/guild';
import CommandoMessage, { CommandoMessageResponse } from './extensions/message';
import CommandoRegistry from './registry';
import Util from './util';

interface Inhibition {
    /** Identifier for the reason the command is being blocked */
    reason: string;
    /** Response being sent to the user */
    response?: Promise<Message> | null;
}

/**
 * A function that decides whether the usage of a command should be blocked
 * @param msg - Message triggering the command
 * @returns `false` if the command should *not* be blocked.
 * If the command *should* be blocked, then one of the following:
 * - A single string identifying the reason the command is blocked
 * - An Inhibition object
 */
type Inhibitor = (msg: CommandoMessage) => Inhibition | boolean | string;

// @ts-expect-error: GuildMember's constructor is private
declare class CommandoMember extends GuildMember {
    // @ts-expect-error: CommandoGuild is not assignable to Guild
    public guild: CommandoGuild;
}

export declare class CommandoInteraction extends CommandInteraction {
    // @ts-expect-error: CommandoClient is not assignable to Client
    public client: CommandoClient;
    // @ts-expect-error: CommandoGuild is not assignable to Guild
    public guild: CommandoGuild | null;
    // @ts-expect-error: CommandoMember is not assignable to Member
    public member: CommandoMember | null;
    public get channel(): TextBasedChannel;
}

/** Handles parsing messages and running commands from them */
export default class CommandDispatcher {
    /** Client this dispatcher handles messages for */
    public readonly client!: CommandoClient;
    /** Registry this dispatcher uses */
    public registry: CommandoRegistry;
    /** Functions that can block commands from running */
    public inhibitors: Set<Inhibitor>;
    /** Map of {@link RegExp}s that match command messages, mapped by string prefix */
    protected _commandPatterns: Map<string, RegExp>;
    /** Old command message results, mapped by original message ID */
    protected _results: Map<string, CommandoMessage>;
    /** Tuples in string form of user ID and channel ID that are currently awaiting messages from a user in a channel */
    protected _awaiting: Set<string>;

    /**
     * @param client - Client the dispatcher is for
     * @param registry - Registry the dispatcher will use
     */
    public constructor(client: CommandoClient, registry: CommandoRegistry) {
        Object.defineProperty(this, 'client', { value: client });

        this.registry = registry;
        this.inhibitors = new Set();
        this._commandPatterns = new Map();
        this._results = new Map();
        this._awaiting = new Set();
    }

    /**
     * Adds an inhibitor
     * @param inhibitor - The inhibitor function to add
     * @return Whether the addition was successful
     * @example
     * client.dispatcher.addInhibitor(msg => {
     *     if (blacklistedUsers.has(msg.author.id)) return 'blacklisted';
     * });
     * @example
     * client.dispatcher.addInhibitor(msg => {
     *     if (!coolUsers.has(msg.author.id)) return { reason: 'cool', response: msg.reply('You\'re not cool enough!') };
     * });
     */
    public addInhibitor(inhibitor: Inhibitor): boolean {
        const { inhibitors } = this;
        if (typeof inhibitor !== 'function') throw new TypeError('The inhibitor must be a function.');
        if (inhibitors.has(inhibitor)) return false;
        inhibitors.add(inhibitor);
        return true;
    }

    /**
     * Removes an inhibitor
     * @param inhibitor - The inhibitor function to remove
     * @return Whether the removal was successful
     */
    public removeInhibitor(inhibitor: Inhibitor): boolean {
        if (typeof inhibitor !== 'function') throw new TypeError('The inhibitor must be a function.');
        return this.inhibitors.delete(inhibitor);
    }

    /**
     * Handle a new message or a message update
     * @param message - The message to handle
     * @param oldMessage - The old message before the update
     */
    protected async handleMessage(message: CommandoMessage, oldMessage?: Message): Promise<void> {
        if (!this.shouldHandleMessage(message, oldMessage)) return;

        const { client, _results } = this;
        const { nonCommandEditable } = client.options;

        // Parse the message, and get the old result if it exists
        let cmdMsg: CommandoMessage | null;
        let oldCmdMsg: CommandoMessage | undefined;
        if (oldMessage) {
            oldCmdMsg = _results.get(oldMessage.id);
            if (!oldCmdMsg && !nonCommandEditable) return;
            cmdMsg = this.parseMessage(message);
            if (cmdMsg && oldCmdMsg) {
                cmdMsg.responses = oldCmdMsg.responses;
                cmdMsg.responsePositions = oldCmdMsg.responsePositions;
            }
        } else {
            cmdMsg = this.parseMessage(message);
        }

        // Run the command, or reply with an error
        let responses: ArgumentResponse | Message[] | null = null;
        if (cmdMsg) {
            commandResponses: {
                const inhibited = this.inhibit(cmdMsg);
                if (inhibited) {
                    responses = await inhibited.response ?? null;
                    break commandResponses;
                }

                if (!cmdMsg.command) {
                    client.emit('unknownCommand', cmdMsg);
                    responses = null;
                    break commandResponses;
                }

                if (!cmdMsg.command.isEnabledIn(message.guild)) {
                    if (cmdMsg.command.unknown) {
                        client.emit('unknownCommand', cmdMsg);
                        responses = null;
                        break commandResponses;
                    }

                    const responseEmbed = new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription(`The \`${cmdMsg.command.name}\` command is disabled.`);

                    responses = await cmdMsg.replyEmbed(responseEmbed);
                    break commandResponses;
                }

                if (!oldMessage || typeof oldCmdMsg !== 'undefined') {
                    responses = await cmdMsg.run();
                    if (typeof responses === 'undefined') responses = null;
                    if (Array.isArray(responses)) responses = await Promise.all(responses);
                }
            }

            // @ts-expect-error: finalize is protected in CommandoMessage
            cmdMsg.finalize(responses);
        } else if (oldCmdMsg) {
            // @ts-expect-error: finalize is protected in CommandoMessage
            oldCmdMsg.finalize(null);
            if (!nonCommandEditable) _results.delete(message.id);
        }

        if (cmdMsg && oldMessage) {
            client.emit('commandoMessageUpdate', oldMessage, cmdMsg);
        }

        this.cacheCommandoMessage(message, oldMessage, cmdMsg, responses);
    }

    /**
     * Handle a slash command interaction
     * @param interaction - The interaction to handle
     */
    protected async handleSlash(interaction: CommandoInteraction): Promise<unknown> {
        if (interaction.type !== InteractionType.ApplicationCommand) return;

        // Get the matching command
        const { commandName, channelId, channel, guild, user, guildId, client, options, deferred, replied } = interaction;
        const command = this.registry.resolveCommand(commandName);
        if (!command) return;

        const { groupId, memberName } = command;
        const { user: clientUser } = client;

        if (guild) {
            // Obtain the member for the ClientUser if it doesn't already exist
            if (!guild.members.cache.has(clientUser!.id)) {
                await guild.members.fetch(clientUser!.id);
            }

            // @ts-expect-error: some TextBasedChannel sub-types are not assignable to GuildChannelResolvable
            const clientPerms = guild.me!.permissionsIn(channel).serialize();
            if (clientPerms.VIEW_CHANNEL && !clientPerms.SEND_MESSAGES) {
                return await user.send(stripIndent`
                    It seems like I cannot **Send Messages** in this channel: ${channel.toString()}
                    Please try in another channel, or contact the admins of **${guild.name}** to solve this issue.
                `).catch(() => null);
            }

            if (!clientPerms.USE_APPLICATION_COMMANDS) {
                return await user.send(stripIndent`
                    It seems like I cannot **Use Application Commands** in this channel: ${channel.toString()}
                    Please try in another channel, or contact the admins of **${guild.name}** to solve this issue.
                `).catch(() => null);
            }

            // Obtain the member if we don't have it
            if (!guild.members.cache.has(user.id)) {
                // @ts-expect-error: GuildMember is not assignable to CommandoMember
                interaction.member = await guild.members.fetch(user);
            }

            // Make sure the command is usable in this context
            if (command.dmOnly) {
                client.emit('commandBlock', { interaction }, 'dmOnly');
                return await command.onBlock({ interaction }, 'dmOnly');
            }
        }

        // Make sure the command is usable in this context
        if ((command.guildOnly || command.guildOwnerOnly) && !guild) {
            client.emit('commandBlock', { interaction }, 'guildOnly');
            return await command.onBlock({ interaction }, 'guildOnly');
        }

        // Ensure the channel is a NSFW one if required
        // @ts-expect-error: 'nsfw' does not exist in DMChannel
        if (command.nsfw && !channel.nsfw) {
            client.emit('commandBlock', { interaction }, 'nsfw');
            return await command.onBlock({ interaction }, 'nsfw');
        }

        // Ensure the user has permission to use the command
        const hasPermission = command.hasPermission({ interaction });
        if (hasPermission !== true) {
            if (typeof hasPermission === 'string') {
                client.emit('commandBlock', { interaction }, hasPermission);
                return await command.onBlock({ interaction }, hasPermission);
            }
            const data = { missing: hasPermission };
            client.emit('commandBlock', { interaction }, 'userPermissions', data);
            return await command.onBlock({ interaction }, 'userPermissions', data);
        }

        // Ensure the client user has the required permissions
        if (channel.type !== ChannelType.DM && command.clientPermissions) {
            const missing = channel.permissionsFor(clientUser!)?.missing(command.clientPermissions) || [];
            if (missing.length > 0) {
                const data = { missing };
                client.emit('commandBlock', { interaction }, 'clientPermissions', data);
                return await command.onBlock({ interaction }, 'clientPermissions', data);
            }
        }

        if (command.deprecated) {
            const embed = new EmbedBuilder()
                .setColor(Colors.Gold)
                .addFields([{
                    name: `The \`${command.name}\` command has been marked as deprecated!`,
                    value: `Please start using the \`${command.replacing}\` command from now on.`,
                }]);

            await channel.send({ content: user.toString(), embeds: [embed] });
        }

        // Parses the options into an arguments object
        const args: Record<string, unknown> = {};
        for (const option of options.data) parseSlashArgs(args, option);

        // Run the command
        try {
            const location = guildId ? `${guildId}:${channelId}` : `DM:${user.id}`;
            client.emit('debug', `Running slash command "${groupId}:${memberName}" at "${location}".`);
            // @ts-expect-error: ephemeral does not exist in boolean
            await interaction.deferReply({ ephemeral: !!command.slash.ephemeral }).catch(() => null);
            const promise = command.run({ interaction }, args);

            client.emit('commandRun', command, promise, { interaction }, args);
            await promise;

            if (Util.probability(2)) {
                const { botInvite } = client;
                const embed = new EmbedBuilder()
                    .setColor('#4c9f4c')
                    .addFields([{
                        name: `Enjoying ${clientUser!.username}?`,
                        value: oneLine`
                        The please consider voting for it! It helps the bot to become more noticed
                        between other bots. And perhaps consider adding it to any of your own servers
                        as well!`,
                    }]);
                const vote = new ButtonBuilder()
                    .setEmoji('👍')
                    .setLabel('Vote me')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://top.gg/bot/802267523058761759/vote');
                const invite = new ButtonBuilder()
                    .setEmoji('🔗')
                    .setLabel('Invite me')
                    .setStyle(ButtonStyle.Link)
                    .setURL(botInvite!);

                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(vote, invite);

                await channel.send({ embeds: [embed], components: [row] }).catch(() => null);
            }

            return;
        } catch (err) {
            client.emit('commandError', command, err as Error, { interaction }, args);
            if (err instanceof FriendlyError) {
                if (deferred || replied) {
                    return await interaction.editReply({ content: err.message, components: [], embeds: [] });
                }
                return await interaction.reply(err.message);
            }
            return await command.onError(err as Error, { interaction }, args);
        }
    }

    /**
     * Check whether a message should be handled
     * @param message - The message to handle
     * @param oldMessage - The old message before the update
     */
    protected shouldHandleMessage(message: CommandoMessage, oldMessage?: Message): boolean {
        const { partial, author, channelId, content } = message;
        const { client, _awaiting } = this;

        // Ignore partial and bot messages
        if (partial) return false;
        if (author.bot || author.id === client.user!.id) return false;

        // Ignore messages from users that the bot is already waiting for input from
        if (_awaiting.has(author.id + channelId)) return false;

        // Make sure the edit actually changed the message content
        if (oldMessage && content === oldMessage.content) return false;

        return true;
    }

    /**
     * Inhibits a command message
     * @param {CommandoMessage} cmdMsg - Command message to inhibit
     */
    protected inhibit(cmdMsg: CommandoMessage): Inhibition | null {
        const { inhibitors, client } = this;
        for (const inhibitor of inhibitors) {
            let inhibit = inhibitor(cmdMsg);
            if (inhibit) {
                if (typeof inhibit !== 'object') inhibit = { reason: inhibit as string, response: null };

                const valid = typeof inhibit.reason === 'string'
                    && (typeof inhibit.response === 'undefined'
                        || inhibit.response === null
                        || Util.isPromise(inhibit.response)
                    );
                if (!valid) {
                    throw new TypeError(
                        `Inhibitor "${inhibitor.name}" had an invalid result must be a string or an Inhibition object.`
                    );
                }

                // @ts-expect-error: string is not assignable to CommandBlockReason
                client.emit('commandBlock', { message: cmdMsg }, inhibit.reason, inhibit);
                return inhibit;
            }
        }
        return null;
    }

    /**
     * Caches a command message to be editable
     * @param message - Triggering message
     * @param oldMessage - Triggering message's old version
     * @param cmdMsg - Command message to cache
     * @param responses - Responses to the message
     */
    protected cacheCommandoMessage(
        message: CommandoMessage,
        oldMessage: Message | undefined,
        cmdMsg: CommandoMessage | null,
        responses: CommandoMessageResponse
    ): void {
        const { client, _results } = this;
        const { commandEditableDuration, nonCommandEditable } = client.options;
        const { id } = message;

        if (commandEditableDuration! <= 0) return;
        if (!cmdMsg && !nonCommandEditable) return;
        if (responses !== null && cmdMsg) {
            _results.set(id, cmdMsg);
            if (!oldMessage) {
                setTimeout(() => {
                    _results.delete(id);
                }, commandEditableDuration! * 1000);
            }
            return;
        }
        _results.delete(id);
    }

    /**
     * Parses a message to find details about command usage in it
     * @param message - The message
     */
    protected parseMessage(message: CommandoMessage): CommandoMessage | null {
        const { client, _commandPatterns, registry } = this;
        const { content, guild } = message;

        // Find the command to run by patterns
        for (const command of registry.commands.values()) {
            if (!command.patterns) continue;
            for (const pattern of command.patterns) {
                const matches = pattern.exec(content);
                // @ts-expect-error: initCommand is protected in CommandoMessage
                if (matches) return message.initCommand(command, null, matches);
            }
        }

        // Find the command to run with default command handling
        const prefix = (guild?.prefix || client.prefix)!;
        if (!_commandPatterns.get(prefix)) this.buildCommandPattern(prefix);
        let cmdMsg = this.matchDefault(message, _commandPatterns.get(prefix)!, 2);
        if (!cmdMsg && !guild) cmdMsg = this.matchDefault(message, /^([^\s]+)/i, 1, true);
        return cmdMsg;
    }

    /**
     * Matches a message against a guild command pattern
     * @param message - The message
     * @param pattern - The pattern to match against
     * @param commandNameIndex - The index of the command name in the pattern matches
     * @param prefixless - Whether the match is happening for a prefixless usage
     */
    protected matchDefault(
        message: CommandoMessage, pattern: RegExp, commandNameIndex = 1, prefixless = false
    ): CommandoMessage | null {
        const { content } = message;
        const { registry } = this;

        const matches = pattern.exec(content);
        if (!matches) return null;
        const commands = registry.findCommands(matches[commandNameIndex], true);
        if (commands.length !== 1 || !commands[0].defaultHandling) {
            // @ts-expect-error: initCommand is protected in CommandoMessage
            return message.initCommand(registry.unknownCommand, prefixless ? content : matches[1], null);
        }
        const argString = content.substring(matches[1].length + (matches[2] ? matches[2].length : 0));
        // @ts-expect-error: initCommand is protected in CommandoMessage
        return message.initCommand(commands[0], argString, null);
    }

    /**
     * Creates a regular expression to match the command prefix and name in a message
     * @param prefix - Prefix to build the pattern for
     */
    protected buildCommandPattern(prefix?: string): RegExp {
        const { client, _commandPatterns } = this;
        const { id } = client.user!;

        let pattern: RegExp;
        if (prefix) {
            const escapedPrefix = Util.escapeRegex(prefix);
            pattern = new RegExp(
                `^(<@!?${id}>\\s+(?:${escapedPrefix}\\s*)?|${escapedPrefix}\\s*)([^\\s]+)`, 'i'
            );
        } else {
            pattern = new RegExp(`(^<@!?${id}>\\s+)([^\\s]+)`, 'i');
        }
        _commandPatterns.set(prefix!, pattern);
        client.emit('debug', `Built command pattern for prefix "${prefix}": ${pattern}`);
        return pattern;
    }
}

function parseSlashArgs(
    obj: Record<string, unknown>, { name, value, type, channel, member, user, role, options }: CommandInteractionOption
): void {
    if (name && (value === null || typeof value === 'undefined')) {
        obj.subCommand = name;
    } else {
        name = Util.removeDashes(name);
        switch (type) {
            case ApplicationCommandOptionType.Boolean:
            case ApplicationCommandOptionType.Integer:
            case ApplicationCommandOptionType.Number:
            case ApplicationCommandOptionType.String:
            case ApplicationCommandOptionType.Subcommand:
                obj[name] = value ?? null;
                break;
            case ApplicationCommandOptionType.Channel:
                obj[name] = channel ?? null;
                break;
            case ApplicationCommandOptionType.Mentionable:
                obj[name] = member ?? user ?? channel ?? role ?? null;
                break;
            case ApplicationCommandOptionType.Role:
                obj[name] = role ?? null;
                break;
            case ApplicationCommandOptionType.User:
                obj[name] = member ?? user ?? null;
                break;
        }
    }
    options?.forEach(opt => parseSlashArgs(obj, opt));
}
