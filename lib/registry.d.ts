import { Collection } from 'discord.js';
import CommandoClient from './client';
import Command, { CommandInstances } from './commands/base';
import CommandGroup from './commands/group';
import CommandoMessage from './extensions/message';
import ArgumentType from './types/base';
interface RequireAllOptions {
    dirname: string;
    filter?: RegExp | ((name: string, path: string) => string | false);
    excludeDirs?: RegExp;
    map?: ((name: string, path: string) => string);
    resolve?: ((module: unknown) => unknown);
    recursive?: boolean;
}
/** Object specifying which types to register */
interface DefaultTypesOptions {
    /**
     * Whether to register the built-in string type
     * @default true
     */
    string?: boolean;
    /**
     * Whether to register the built-in integer type
     * @default true
     */
    integer?: boolean;
    /**
     * Whether to register the built-in float type
     * @default true
     */
    float?: boolean;
    /**
     * Whether to register the built-in boolean type
     * @default true
     */
    boolean?: boolean;
    /**
     * Whether to register the built-in duration type
     * @default true
     */
    duration?: boolean;
    /**
     * Whether to register the built-in date type
     * @default true
     */
    date?: boolean;
    /**
     * Whether to register the built-in time type
     * @default true
     */
    time?: boolean;
    /**
     * Whether to register the built-in user type
     * @default true
     */
    user?: boolean;
    /**
     * Whether to register the built-in member type
     * @default true
     */
    member?: boolean;
    /**
     * Whether to register the built-in role type
     * @default true
     */
    role?: boolean;
    /**
     * Whether to register the built-in channel type
     * @default true
     */
    channel?: boolean;
    /**
     * Whether to register the built-in text-channel type
     * @default true
     */
    textChannel?: boolean;
    /**
     * Whether to register the built-in thread-channel type
     * @default true
     */
    threadChannel?: boolean;
    /**
     * Whether to register the built-in voice-channel type
     * @default true
     */
    voiceChannel?: boolean;
    /**
     * Whether to register the built-in stage-channel type
     * @default true
     */
    stageChannel?: boolean;
    /**
     * Whether to register the built-in category-channel type
     * @default true
     */
    categoryChannel?: boolean;
    /**
     * Whether to register the built-in message type
     * @default true
     */
    message?: boolean;
    /**
     * Whether to register the built-in invite type
     * @default true
     */
    invite?: boolean;
    /**
     * Whether to register the built-in custom-emoji type
     * @default true
     */
    customEmoji?: boolean;
    /**
     * Whether to register the built-in default-emoji type
     * @default true
     */
    defaultEmoji?: boolean;
    /**
     * Whether to register the built-in command type
     * @default true
     */
    command?: boolean;
    /**
     * Whether to register the built-in group type
     * @default true
     */
    group?: boolean;
}
/**
 * A CommandResolvable can be:
 * - A {@link Command}
 * - A command name
 * - A {@link CommandoMessage}
 */
export declare type CommandResolvable = Command | CommandoMessage | string;
/**
 * A CommandGroupResolvable can be:
 * - A {@link CommandGroup}
 * - A group ID
 */
export declare type CommandGroupResolvable = CommandGroup | string;
/** Handles registration and searching of commands and groups */
export default class CommandoRegistry {
    /** The client this registry is for */
    readonly client: CommandoClient;
    /** Registered commands, mapped by their name */
    commands: Collection<string, Command>;
    /** Registered command groups, mapped by their ID */
    groups: Collection<string, CommandGroup>;
    /** Registered argument types, mapped by their ID */
    types: Collection<string, ArgumentType>;
    /** Fully resolved path to the bot's commands directory */
    commandsPath: string | null;
    /** Command to run when an unknown command is used */
    unknownCommand: Command | null;
    /**
     * @param client - Client to use
     */
    constructor(client: CommandoClient);
    /** Registers every client and guild slash command available - this may only be called upon startup. */
    protected registerSlashCommands(): Promise<void>;
    /**
     * Registers a single group
     * @param group - A CommandGroup instance
     * or the constructor parameters (with ID, name, and guarded properties)
     * @see {@link CommandoRegistry#registerGroups}
     */
    registerGroup(group: CommandGroup | {
        id: string;
        name?: string;
        guarded?: boolean;
    }): this;
    /**
     * Registers multiple groups
     * @param groups - An array of CommandGroup instances or the constructors parameters (with ID, name, and guarded
     * properties).
     * @example
     * registry.registerGroups([
     *     { id: 'fun', name: 'Fun' },
     *     { id: 'mod', name: 'Moderation' }
     * ]);
     */
    registerGroups(groups: Array<CommandGroup | {
        id: string;
        name?: string;
        guarded?: boolean;
    }>): this;
    /**
     * Registers a single command
     * @param command - Either a Command instance, or a constructor for one
     * @see {@link CommandoRegistry#registerCommands}
     */
    registerCommand(command: Command): this;
    /**
     * Registers multiple commands
     * @param commands - An array of Command instances or constructors
     * @param ignoreInvalid - Whether to skip over invalid objects without throwing an error
     */
    registerCommands(commands: Command[], ignoreInvalid?: boolean): this;
    /**
     * Registers all commands in a directory. The files must export a Command class constructor or instance.
     * @param options - The path to the directory, or a require-all options object
     * @example
     * const path = require('path');
     * registry.registerCommandsIn(path.join(__dirname, 'commands'));
     */
    registerCommandsIn(options: RequireAllOptions | string): this;
    /**
     * Registers a single argument type
     * @param type - Either an ArgumentType instance, or a constructor for one
     * @see {@link CommandoRegistry#registerTypes}
     */
    registerType(type: ArgumentType): this;
    /**
     * Registers multiple argument types
     * @param types - An array of ArgumentType instances or constructors
     * @param ignoreInvalid - Whether to skip over invalid objects without throwing an error
     */
    registerTypes(types: ArgumentType[], ignoreInvalid?: boolean): this;
    /**
     * Registers all argument types in a directory. The files must export an ArgumentType class constructor or instance.
     * @param options - The path to the directory, or a require-all options object
     */
    registerTypesIn(options: RequireAllOptions | string): this;
    /**
     * Registers the default argument types to the registry
     * @param types - Object specifying which types to register
     */
    registerDefaultTypes(types?: DefaultTypesOptions): this;
    /**
     * Reregisters a command (does not support changing name, group, or memberName)
     * @param command - New command
     * @param oldCommand - Old command
     */
    reregisterCommand(command: Command, oldCommand: Command): void;
    /**
     * Unregisters a command
     * @param command - Command to unregister
     */
    unregisterCommand(command: Command): void;
    /**
     * Finds all groups that match the search string
     * @param searchString - The string to search for
     * @param exact - Whether the search should be exact
     * @return All groups that are found
     */
    findGroups(searchString?: string | null, exact?: boolean): CommandGroup[];
    /**
     * Resolves a CommandGroupResolvable to a CommandGroup object
     * @param group - The group to resolve
     * @return The resolved CommandGroup
     */
    resolveGroup(group: CommandGroupResolvable): CommandGroup;
    /**
     * Finds all commands that match the search string
     * @param searchString - The string to search for
     * @param exact - Whether the search should be exact
     * @param instances - The instances to check usability against
     * @return All commands that are found
     */
    findCommands(searchString?: string | null, exact?: boolean, instances?: CommandInstances): Command[];
    /**
     * Resolves a CommandResolvable to a Command object
     * @param command - The command to resolve
     * @return The resolved Command
     */
    resolveCommand(command: CommandResolvable): Command;
    /**
     * Resolves a command file path from a command's group ID and memberName
     * @param group - ID of the command's group
     * @param memberName - Member name of the command
     * @return Fully-resolved path to the corresponding command file
     */
    resolveCommandPath(group: string, memberName: string): string;
}
export {};
