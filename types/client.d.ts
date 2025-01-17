import { Awaitable, Client, ClientOptions, Collection, Guild, InviteGenerationOptions, IntentsBitField, User, If } from 'discord.js';
import CommandoRegistry from './registry';
import CommandDispatcher from './dispatcher';
import CommandoMessage, { CommandoMessageResponse } from './extensions/message';
import CommandoGuild from './extensions/guild';
import ClientDatabaseManager from './database/ClientDatabaseManager';
import Schemas from './database/Schemas';
import GuildDatabaseManager from './database/GuildDatabaseManager';
import { Nullable } from './util';
import { CommandoUserResolvable, OverwrittenClientEvents } from './discord.overrides';
import Command, { CommandBlockData, CommandBlockReason, CommandContext } from './commands/base';
import { ArgumentCollectorResult } from './commands/collector';
import ArgumentType from './types/base';
import CommandGroup from './commands/group';
import SettingProvider from './providers/base';
import GuildSettingsHelper from './providers/helper';
export interface CommandoClientOptions extends ClientOptions {
    /**
     * Default command prefix
     * @default '!'
     */
    prefix?: string | null;
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
    /** IDs of the bot owners' Discord user */
    owners?: Set<string> | string[];
    /** Invite URL to the bot's support server */
    serverInvite?: string;
    /** Invite options for the bot */
    inviteOptions?: InviteGenerationOptions | string;
    /** The guild ID where to register test application commands */
    testAppGuild?: string;
    /** The URI which will establish your connection with MongoDB */
    mongoDbURI?: string;
    /** The directory in which your modules are stored in */
    modulesDir?: string;
    /** The names of the modules to exclude */
    excludeModules?: string[];
}
export interface CommandoClientEvents extends OverwrittenClientEvents {
    commandBlock: [context: CommandContext, reason: CommandBlockReason, data?: CommandBlockData];
    commandCancel: [command: Command, reason: string, message: CommandoMessage, result?: ArgumentCollectorResult];
    commandError: [
        command: Command,
        error: Error,
        context: CommandContext,
        args: Record<string, unknown> | string[] | string,
        fromPattern?: boolean,
        result?: ArgumentCollectorResult
    ];
    commandoGuildCreate: [guild: CommandoGuild];
    commandoMessageCreate: [message: CommandoMessage];
    commandoMessageDelete: [message: CommandoMessage];
    commandoMessageUpdate: [oldMessage: CommandoMessage, newMessage: CommandoMessage];
    commandPrefixChange: [guild?: CommandoGuild | null, prefix?: string | null];
    commandRegister: [command: Command, registry: CommandoRegistry];
    commandReregister: [newCommand: Command, oldCommand: Command];
    commandRun: [
        command: Command,
        promise: Awaitable<Nullable<CommandoMessageResponse> | void>,
        context: CommandContext,
        args: Record<string, unknown> | string[] | string,
        fromPattern?: boolean,
        result?: ArgumentCollectorResult | null
    ];
    commandStatusChange: [guild: CommandoGuild | null, command: Command, enabled: boolean];
    commandUnregister: [command: Command];
    databaseReady: [client: CommandoClient<true>];
    groupRegister: [group: CommandGroup, registry: CommandoRegistry];
    groupStatusChange: [guild: CommandoGuild | null, group: CommandGroup, enabled: boolean];
    guildsReady: [client: CommandoClient<true>];
    modulesReady: [client: CommandoClient<true>];
    providerReady: [provider: SettingProvider];
    typeRegister: [type: ArgumentType, registry: CommandoRegistry];
    unknownCommand: [message: CommandoMessage];
}
/** Discord.js Client with a command framework */
export default class CommandoClient<ClientReady extends boolean = boolean, ProviderReady extends boolean = boolean, Provider extends SettingProvider = SettingProvider> extends Client<ClientReady> {
    /**
     * Internal global command prefix, controlled by the {@link CommandoClient.prefix CommandoClient#prefix} getter/setter
     */
    protected _prefix?: string | null;
    /** Invite for the bot */
    botInvite: string | null;
    /** The client's database manager */
    database: ClientDatabaseManager;
    /** The guilds' database manager, mapped by the guilds ids */
    databases: Collection<string, GuildDatabaseManager>;
    /** Object containing all the schemas this client uses. */
    databaseSchemas: typeof Schemas;
    /** The client's command dispatcher */
    dispatcher: CommandDispatcher;
    /** Options for the client */
    options: Omit<CommandoClientOptions, 'intents'> & {
        intents: IntentsBitField;
    };
    /** The client's command registry */
    registry: CommandoRegistry;
    /** The client's setting provider */
    provider: If<ProviderReady, Provider>;
    /** Shortcut to use setting provider methods for the global settings */
    settings: GuildSettingsHelper;
    /**
     * @param options - Options for the client
     */
    constructor(options: CommandoClientOptions);
    /**
     * Global command prefix. An empty string indicates that there is no default prefix, and only mentions will be used.
     * Setting to `null` means that the default prefix from {@link CommandoClient.options CommandoClient#options} will
     * be used instead.
     * @emits {@link CommandoClientEvents.commandPrefixChange commandPrefixChange}
     */
    get prefix(): string | undefined;
    set prefix(prefix: Nullable<string>);
    /**
     * Owners of the bot, set by the {@link CommandoClientOptions.owners CommandoClientOptions#owners} option
     * <info>If you simply need to check if a user is an owner of the bot, please instead use
     * {@link CommandoClient.isOwner CommandoClient#isOwner}.</info>
     * @readonly
     */
    get owners(): User[] | null;
    /**
     * Checks whether a user is an owner of the bot (in {@link CommandoClientOptions.owners CommandoClientOptions#owners})
     * @param user - User to check for ownership
     */
    isOwner(user: CommandoUserResolvable): boolean;
    isReady(): this is CommandoClient<true>;
    destroy(): Promise<void>;
    /**
     * Sets the setting provider to use, and initializes it once the client is ready
     * @param provider - Provider to use
     */
    setProvider(provider: Awaitable<Provider>): Promise<void>;
    /** Checks if the provider is ready. */
    isProviderReady(): this is CommandoClient<true, true, Provider>;
    /**
     * Await an event **once**, and get a resolved result from the `listener`.
     * @param event - The event to listen to.
     * @param listener - Listener function.
     * @returns Resolved result from `listener`.
     */
    awaitEvent<K extends keyof CommandoClientEvents, T>(event: K, listener: (this: CommandoClient, ...args: CommandoClientEvents[K]) => T): Promise<Awaited<T>>;
    /** Initializes all default listeners that make the client work. */
    protected initDefaultListeners(): void;
    /** Parses all {@link Guild} instances into {@link CommandoGuild}s. */
    protected parseGuilds(client: CommandoClient<true>): Promise<void>;
    /**
     * Parses a {@link Guild} instance into a {@link CommandoGuild}.
     * @param guild - The Guild to parse
     */
    protected parseGuild(guild: Guild): CommandoGuild;
    on<K extends keyof CommandoClientEvents>(event: K, listener: (this: this, ...args: CommandoClientEvents[K]) => unknown): this;
    once<K extends keyof CommandoClientEvents>(event: K, listener: (this: this, ...args: CommandoClientEvents[K]) => unknown): this;
    emit<K extends keyof CommandoClientEvents>(event: K, ...args: CommandoClientEvents[K]): boolean;
    off<K extends keyof CommandoClientEvents>(event: K, listener: (this: this, ...args: CommandoClientEvents[K]) => unknown): this;
    removeAllListeners<K extends keyof CommandoClientEvents>(event?: K): this;
}
