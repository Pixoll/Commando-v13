import { stripIndent } from 'common-tags';
import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    Colors,
    CommandInteraction,
    CommandInteractionOption,
    EmbedBuilder,
    GuildMember,
    TextBasedChannel,
    User,
} from 'discord.js';
import CommandoClient from '../client';
import Command from '../commands/base';
import FriendlyError from '../errors/friendly';
import Util from '../util';
import CommandoGuild from './guild';

// @ts-expect-error: GuildMember's constructor is private
declare class CommandoMember extends GuildMember {
    public guild: CommandoGuild;
}

/**
 * An extension of the base Discord.js CommandInteraction class to add command-related functionality.
 * @augments CommandInteraction
 */
export default class CommandoInteraction extends CommandInteraction {
    /** The client the interaction is for */
    declare public readonly client: CommandoClient<true>;
    declare public member: CommandoMember | null;
    /** Command that the interaction triggers */
    protected _command: Command;

    /**
     * @param client - The client the interaction is for
     * @param data - The interaction data
     */
    public constructor(client: CommandoClient, data: CommandInteraction) {
        if (data.commandType !== ApplicationCommandType.ChatInput) {
            throw new RangeError(`Unsupported command interaction type "${data.commandType}".`);
        }

        // @ts-expect-error: data.toJSON() does not work
        super(client, { id: data.id });
        Object.assign(this, data);

        this._command = client.registry.resolveCommand(data.commandName);
    }

    public get author(): User {
        return this.user;
    }

    public get channel(): TextBasedChannel {
        return super.channel as TextBasedChannel;
    }

    /** Command that the interaction triggers */
    // @ts-expect-error: This is meant to override CommandInteraction's command getter.
    public get command(): Command {
        return this._command;
    }

    /** The guild this message is for */
    public get guild(): CommandoGuild | null {
        return super.guild as CommandoGuild;
    }

    /** Whether this interaction is able to been edited (has been previously deferred or replied to) */
    public isEditable(): boolean {
        return this.deferred || this.replied;
    }

    /**
     * Parses the options data into usable arguments
     * @see Command#run
     */
    public parseArgs(options: CommandInteractionOption[]): Record<string, unknown> {
        const args: Record<string, unknown> = {};
        const { client, guild } = this;
        const { channels } = client;
        let members = null, roles = null;
        if (guild) {
            members = guild.members;
            roles = guild.roles;
        }

        for (const option of options) {
            const { name, value, type, channel, member, user, role, attachment } = option;
            if (name && Util.isNullish(value)) {
                args.subCommand = name;
                if (option.options) {
                    Object.assign(args, this.parseArgs(option.options));
                }
                continue;
            }

            const optionName = Util.removeDashes(name);
            switch (type) {
                case ApplicationCommandOptionType.Boolean:
                case ApplicationCommandOptionType.Integer:
                case ApplicationCommandOptionType.Number:
                case ApplicationCommandOptionType.String:
                case ApplicationCommandOptionType.Subcommand:
                    args[optionName] = value ?? null;
                    break;
                case ApplicationCommandOptionType.Channel:
                    args[optionName] = channel ? channels.resolve(channel.id) : null;
                    break;
                case ApplicationCommandOptionType.Mentionable: {
                    const resolvedMember = member instanceof GuildMember && members ? members.resolve(member) : null;
                    const resolvedChannel = channel ? channels.resolve(channel.id) : null;
                    const resolvedRole = role && roles ? roles.resolve(role.id) : null;
                    args[optionName] = resolvedMember ?? user ?? resolvedChannel ?? resolvedRole ?? null;
                    break;
                }
                case ApplicationCommandOptionType.Role:
                    args[optionName] = role && roles ? roles.resolve(role.id) : null;
                    break;
                case ApplicationCommandOptionType.User: {
                    const resolvedMember = member instanceof GuildMember && members ? members.resolve(member) : null;
                    args[optionName] = resolvedMember ?? user ?? null;
                    break;
                }
                case ApplicationCommandOptionType.Attachment:
                    args[optionName] = attachment ?? null;
                    break;
                default:
                    throw new RangeError(`Unsupported option type "${type}".`);
            }
        }

        return args;
    }

    /** Runs the command */
    public async run(): Promise<void> {
        const { command, channelId, channel, guild, author, guildId, client, options } = this;
        const { groupId, memberName } = command;
        const { user: clientUser } = client;

        if (guild && !channel.isDMBased()) {
            const { members } = guild;

            // Obtain the member for the ClientUser if it doesn't already exist
            const me = members.me ?? await members.fetch(clientUser.id);

            const clientPerms = me.permissionsIn(channel).serialize();
            if (clientPerms.ViewChannel && !clientPerms.SendMessages) {
                await author.send(stripIndent`
                    It seems like I cannot **Send Messages** in this channel: ${channel.toString()}
                    Please try in another channel, or contact the admins of **${guild.name}** to solve this issue.
                `).catch(() => null);
                return;
            }

            if (!clientPerms.UseApplicationCommands) {
                await author.send(stripIndent`
                    It seems like I cannot **Use Application Commands** in this channel: ${channel.toString()}
                    Please try in another channel, or contact the admins of **${guild.name}** to solve this issue.
                `).catch(() => null);
                return;
            }

            // Make sure the command is usable in this context
            if (command.dmOnly) {
                client.emit('commandBlock', { interaction: this }, 'dmOnly');
                await command.onBlock({ interaction: this }, 'dmOnly');
                return;
            }
        }

        // Make sure the command is usable in this context
        if ((command.guildOnly || command.guildOwnerOnly) && !guild) {
            client.emit('commandBlock', { interaction: this }, 'guildOnly');
            await command.onBlock({ interaction: this }, 'guildOnly');
            return;
        }

        // Ensure the channel is a NSFW one if required
        if ('nsfw' in channel && !channel.nsfw) {
            client.emit('commandBlock', { interaction: this }, 'nsfw');
            await command.onBlock({ interaction: this }, 'nsfw');
            return;
        }

        // Ensure the user has permission to use the command
        const hasPermission = command.hasPermission({ interaction: this });
        if (hasPermission !== true) {
            if (typeof hasPermission === 'string') {
                client.emit('commandBlock', { interaction: this }, hasPermission);
                await command.onBlock({ interaction: this }, hasPermission);
                return;
            }
            const data = { missing: hasPermission };
            client.emit('commandBlock', { interaction: this }, 'userPermissions', data);
            await command.onBlock({ interaction: this }, 'userPermissions', data);
            return;
        }

        // Ensure the client user has the required permissions
        if (!channel.isDMBased() && command.clientPermissions) {
            const missing = channel.permissionsFor(clientUser)?.missing(command.clientPermissions) || [];
            if (missing.length > 0) {
                const data = { missing };
                client.emit('commandBlock', { interaction: this }, 'clientPermissions', data);
                await command.onBlock({ interaction: this }, 'clientPermissions', data);
                return;
            }
        }

        if (command.deprecated) {
            const embed = new EmbedBuilder()
                .setColor(Colors.Gold)
                .addFields([{
                    name: `The \`${command.name}\` command has been marked as deprecated!`,
                    value: `Please start using the \`${command.replacing}\` command from now on.`,
                }]);

            await channel.send({ content: author.toString(), embeds: [embed] });
        }

        // Parses the options into an arguments object. Array.from to prevent "readonly" error.
        const args = this.parseArgs(Array.from(options.data));

        // Run the command
        try {
            const location = guildId ? `${guildId}:${channelId}` : `DM:${author.id}`;
            client.emit('debug', `Running slash command "${groupId}:${memberName}" at "${location}".`);
            if (command.slashInfo && 'deferEphemeral' in command.slashInfo) {
                await this.deferReply({ ephemeral: command.slashInfo.deferEphemeral }).catch(() => null);
            }
            const promise = command.run({ interaction: this }, args);

            client.emit('commandRun', command, promise, { interaction: this }, args);
            await promise;
        } catch (err) {
            client.emit('commandError', command, err as Error, { interaction: this }, args);
            if (err instanceof FriendlyError) {
                const { deferred, replied } = this;
                if (deferred || replied) {
                    await this.editReply({ content: err.message, components: [], embeds: [] });
                } else {
                    await this.reply(err.message);
                }
            }
            await command.onError(err as Error, { interaction: this }, args);
        }
    }
}
