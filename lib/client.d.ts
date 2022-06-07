import { Client, Collection, ClientOptions, InviteGenerationOptions, CachedManager, Snowflake, GuildResolvable, GuildCreateOptions, FetchGuildOptions, FetchGuildsOptions, UserResolvable, Guild, User, ClientEvents, Message } from 'discord.js';
import { Model } from 'mongoose';
import CommandoRegistry from './registry';
import CommandDispatcher from './dispatcher';
import CommandoMessage from './extensions/message';
import CommandoGuild from './extensions/guild';
import ClientDatabaseManager from './database/ClientDatabaseManager';
import { ArgumentCollectorResult } from './commands/collector';
import Command, { CommandBlockData, CommandBlockReason, CommandInstances } from './commands/base';
import CommandGroup from './commands/group';
import ArgumentType from './types/base';
import GuildDatabaseManager from './database/GuildDatabaseManager';
interface CommandoClientOptions extends ClientOptions {
    /**
     * Default command prefix
     * @default '!'
     */
    prefix?: string;
    /**
     * Time in seconds that command messages should be editable
     * @default 30
     */
    commandEditableDuration?: number;
    /**
     * Whether messages without commands can be edited to a command
     * @default true
     */
    nonCommandEditable?: boolean;
    /** ID of the bot owner's Discord user, or multiple ids */
    owner?: string | string[] | Set<string>;
    /** Invite URL to the bot's support server */
    serverInvite?: string;
    /** Invite options for the bot */
    inviteOptions?: InviteGenerationOptions | string;
    /** The test guild ID or the slash commands */
    testGuild?: string;
    /** The URI which will establish your connection with MongoDB */
    mongoDbURI?: string;
    /** The directory in which your modules are stored in */
    modulesDir?: string;
    /** The names of the modules to exclude */
    excludeModules?: string[];
}
declare class CommandoGuildManager extends CachedManager<Snowflake, CommandoGuild, GuildResolvable> {
    create(name: string, options?: GuildCreateOptions): Promise<CommandoGuild>;
    fetch(options: Snowflake | FetchGuildOptions): Promise<CommandoGuild>;
    fetch(options?: FetchGuildsOptions): Promise<Collection<Snowflake, CommandoGuild>>;
}
interface CommandoClientEvents extends ClientEvents {
    commandBlock: [instances: CommandInstances, reason: CommandBlockReason, data?: CommandBlockData];
    commandCancel: [command: Command, reason: string, message: CommandoMessage, result?: ArgumentCollectorResult];
    commandError: [
        command: Command,
        error: Error,
        instances: CommandInstances,
        args: object | string | string[],
        fromPattern: boolean,
        result?: ArgumentCollectorResult
    ];
    commandoGuildCreate: [guild: CommandoGuild];
    commandoMessageCreate: [message: CommandoMessage];
    commandoMessageUpdate: [oldMessage: Message, newMessage: CommandoMessage];
    commandPrefixChange: [guild?: CommandoGuild | null, prefix?: string | null];
    commandRegister: [command: Command, registry: CommandoRegistry];
    commandReregister: [newCommand: Command, oldCommand: Command];
    commandRun: [
        command: Command,
        promise: Promise<unknown>,
        instances: CommandInstances,
        args: object | string | string[],
        fromPattern?: boolean,
        result?: ArgumentCollectorResult | null
    ];
    commandStatusChange: [guild: CommandoGuild | null, command: Command, enabled: boolean];
    commandUnregister: [command: Command];
    databaseReady: [client: CommandoClient];
    groupRegister: [group: CommandGroup, registry: CommandoRegistry];
    groupStatusChange: [guild: CommandoGuild | null, group: CommandGroup, enabled: boolean];
    guildsReady: [client: CommandoClient];
    typeRegister: [type: ArgumentType, registry: CommandoRegistry];
    unknownCommand: [message: CommandoMessage];
}
/**
 * Discord.js Client with a command framework
 * @augments Client
 */
export default class CommandoClient extends Client {
    /** Internal global command prefix, controlled by the {@link CommandoClient#prefix} getter/setter */
    protected _prefix?: string | null;
    /** Invite for the bot */
    botInvite: string | null;
    /** The client's database manager */
    database: ClientDatabaseManager;
    /** The guilds' database manager, mapped by the guilds ids */
    databases: Collection<string, GuildDatabaseManager>;
    /** Object containing all the schemas this client uses. */
    databaseSchemas: Record<string, Model<unknown>>;
    /** The client's command dispatcher */
    dispatcher: CommandDispatcher;
    guilds: CommandoGuildManager;
    /** Options for the client */
    options: CommandoClientOptions;
    /** The client's command registry */
    registry: CommandoRegistry;
    on<K extends keyof CommandoClientEvents>(event: K, listener: (...args: CommandoClientEvents[K]) => void): this;
    once<K extends keyof CommandoClientEvents>(event: K, listener: (...args: CommandoClientEvents[K]) => void): this;
    emit<K extends keyof CommandoClientEvents>(event: K, ...args: CommandoClientEvents[K]): boolean;
    /**
     * @param options - Options for the client
     */
    constructor(options: CommandoClientOptions);
    /**
     * Global command prefix. An empty string indicates that there is no default prefix, and only mentions will be used.
     * Setting to `null` means that the default prefix from {@link CommandoClient#options} will be used instead.
     * @emits {@link CommandoClient#commandPrefixChange}
     */
    get prefix(): string | undefined;
    set prefix(prefix: string | undefined);
    /**
     * Owners of the bot, set by the {@link CommandoClientOptions#owner} option
     * <info>If you simply need to check if a user is an owner of the bot, please instead use
     * {@link CommandoClient#isOwner}.</info>
     * @readonly
     */
    get owners(): null | User[];
    /**
     * Checks whether a user is an owner of the bot (in {@link CommandoClientOptions#owner})
     * @param user - User to check for ownership
     */
    isOwner(user: UserResolvable): boolean;
    /** Parses all {@link Guild} instances into {@link CommandoGuild}s. */
    protected parseGuilds(): void;
    /**
     * Parses a {@link Guild} instance into a {@link CommandoGuild}.
     * @param guild - The Guild to parse
     */
    protected parseGuild(guild: Guild): void;
}
export {};
