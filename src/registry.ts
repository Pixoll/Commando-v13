/* eslint-disable new-cap */
import { Collection } from 'discord.js';
import path from 'path';
import requireAll from 'require-all';
import CommandoClient from './client';
import { ArgumentTypeString } from './commands/argument';
import Command, { APISlashCommand, CommandContext } from './commands/base';
import CommandGroup from './commands/group';
import CommandoMessage from './extensions/message';
import ArgumentType from './types/base';
import Util from './util';

declare function require<T>(id: string): T;

export interface RequireAllOptions {
    dirname: string;
    filter?: RegExp | ((name: string, path: string) => string | false);
    excludeDirs?: RegExp;
    map?: ((name: string, path: string) => string);
    resolve?: ((module: unknown) => unknown);
    recursive?: boolean;
}

/** Object specifying which types to register. All default to `true` */
export type DefaultTypesOptions = {
    [T in ArgumentTypeString]?: boolean;
};

/**
 * A CommandResolvable can be:
 * - A {@link Command}
 * - A command name
 * - A {@link CommandoMessage}
 */
export type CommandResolvable =
    | Command
    | CommandoMessage
    | string;

/**
 * A CommandGroupResolvable can be:
 * - A {@link CommandGroup}
 * - A group ID
 */
export type CommandGroupResolvable =
    | CommandGroup
    | string;

interface SlashCommandEntry {
    command: APISlashCommand;
    global: boolean;
}

/** Handles registration and searching of commands and groups */
export default class CommandoRegistry {
    /** The client this registry is for */
    declare public readonly client: CommandoClient;
    /** Registered commands, mapped by their name */
    public commands: Collection<string, Command>;
    /** Registered command groups, mapped by their ID */
    public groups: Collection<string, CommandGroup>;
    /** Registered argument types, mapped by their ID */
    public types: Collection<string, ArgumentType>;
    /** Fully resolved path to the bot's commands directory */
    public commandsPath: string | null;
    /** Command to run when an unknown command is used */
    public unknownCommand: Command | null;

    /**
     * @param client - Client to use
     */
    public constructor(client: CommandoClient) {
        Object.defineProperty(this, 'client', { value: client });

        this.commands = new Collection();
        this.groups = new Collection();
        this.types = new Collection();
        this.commandsPath = null;
        this.unknownCommand = null;
    }

    /** Registers every client and guild slash command available - this may only be called upon startup. */
    protected async registerSlashCommands(): Promise<void> {
        const { client, commands } = this;

        const slashCommands = Util.filterNullishValues(commands.mapValues(command => ({
            command: command.slashInfo,
            global: !command.testEnv,
        }))).filter((command): command is SlashCommandEntry =>
            !Util.isNullish(command.command)
        );

        await Promise.all(slashCommands.map(({ command, global }) =>
            this.registerSlashCommand(Util.omit(command, ['deferEphemeral']), global)
        ));
        await this.deleteUnusedSlashCommands(slashCommands);

        const guildOnlyAmount = slashCommands.filter(command => !command.global).size;
        const globalAmount = slashCommands.filter(command => command.global).size;

        if (guildOnlyAmount) client.emit('debug', `Loaded ${guildOnlyAmount} guild slash commands`);
        if (globalAmount) client.emit('debug', `Loaded ${globalAmount} global slash commands`);
    }

    /** Registers a slash command. */
    protected async registerSlashCommand(command: Omit<APISlashCommand, 'deferEphemeral'>, global: boolean): Promise<void> {
        const { application, options, guilds } = this.client as CommandoClient<true>;

        const guild = !global && options.testGuild ? await guilds.fetch(options.testGuild) : null;
        const commandManager = !global && guild ? guild.commands : application.commands;
        const allCommands = await commandManager.fetch({});
        const registeredCommand = allCommands.find(cmd => cmd.name === command.name);

        if (!registeredCommand) {
            await commandManager.create(command);
            return;
        }

        if (!registeredCommand.equals(command)) {
            await registeredCommand.edit(command);
            return;
        }
    }

    /** Deletes any slash commands that have been removed from the program. */
    protected async deleteUnusedSlashCommands(currentCommands: Collection<string, SlashCommandEntry>): Promise<void> {
        const client = this.client as CommandoClient<true>;
        const { application, options, guilds } = client as CommandoClient<true>;

        const guild = !global && options.testGuild ? await guilds.fetch(options.testGuild) : null;
        const registeredCommands = await Promise.all([
            guild?.commands.fetch(),
            application.commands.fetch(),
        ]).then(commands => commands[1].concat(commands[0] ?? new Collection()));

        const removedCommands = registeredCommands.filter(command => !currentCommands.has(command.name));
        await Promise.all(removedCommands.map(command => command.delete()));
        client.emit('debug', `Deleted ${removedCommands.size} unused slash commands`);
    }

    /**
     * Registers a single group
     * @param group - A CommandGroup instance
     * or the constructor parameters (with ID, name, and guarded properties)
     * @see CommandoRegistry#registerGroups
     */
    public registerGroup(group: CommandGroup | { id: string; name?: string; guarded?: boolean }): this {
        const { client, groups } = this;

        // @ts-expect-error: CommandGroup has "no construct signature"
        if (isConstructor(group, CommandGroup)) group = new group(client);
        else if (!(group instanceof CommandGroup)) {
            group = new CommandGroup(client, group.id, group.name, group.guarded);
        }

        const builtGroup = group as CommandGroup;

        const existing = groups.get(builtGroup.id);
        if (existing) {
            existing.name = builtGroup.name;
            client.emit('debug', `Group ${builtGroup.id} is already registered. Renamed it to "${builtGroup.name}".`);
        } else {
            groups.set(builtGroup.id, builtGroup);
            client.emit('groupRegister', builtGroup, this);
            client.emit('debug', `Registered group ${builtGroup.id}.`);
        }

        return this;
    }

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
    public registerGroups(groups: Array<CommandGroup | { id: string; name?: string; guarded?: boolean }>): this {
        if (!Array.isArray(groups)) throw new TypeError('Groups must be an array.');
        for (const group of groups) {
            this.registerGroup(group);
        }
        return this;
    }

    /**
     * Registers a single command
     * @param command - Either a Command instance, or a constructor for one
     * @see CommandoRegistry#registerCommands
     */
    public registerCommand(command: Command): this {
        const { client, commands, groups, unknownCommand } = this;

        // @ts-expect-error: Command has "no construct signature"
        if (isConstructor(command, Command)) command = new command(client);
        // @ts-expect-error: default doesn't exist in Command
        else if (isConstructor(command.default, Command)) command = new command.default(client);
        if (!(command instanceof Command)) throw new Error(`Invalid command object to register: ${command}`);

        const { name, aliases, groupId, memberName, unknown } = command;

        // Make sure there aren't any conflicts
        if (commands.some(cmd => cmd.name === name || cmd.aliases.includes(name))) {
            throw new Error(`A command with the name/alias "${name}" is already registered.`);
        }
        for (const alias of aliases) {
            if (commands.some(cmd => cmd.name === alias || cmd.aliases.includes(alias))) {
                throw new Error(`A command with the name/alias "${alias}" is already registered.`);
            }
        }
        const group = groups.find(grp => grp.id === groupId);
        if (!group) throw new Error(`Group "${groupId}" is not registered.`);
        if (group.commands.some(cmd => cmd.memberName === memberName)) {
            throw new Error(`A command with the member name "${memberName}" is already registered in ${group.id}`);
        }
        if (unknown && unknownCommand) throw new Error('An unknown command is already registered.');

        // Add the command
        command.group = group;
        group.commands.set(name, command);
        commands.set(name, command);
        if (unknown) this.unknownCommand = command;

        client.emit('commandRegister', command, this);
        client.emit('debug', `Registered command ${group.id}:${memberName}.`);

        return this;
    }

    /**
     * Registers multiple commands
     * @param commands - An array of Command instances or constructors
     * @param ignoreInvalid - Whether to skip over invalid objects without throwing an error
     */
    public registerCommands(commands: Command[], ignoreInvalid = false): this {
        if (!Array.isArray(commands)) throw new TypeError('Commands must be an array.');
        for (const command of commands) {
            // @ts-expect-error: Command not assignable to 'new () => unknown'
            const valid = isConstructor(command, Command) || isConstructor(command.default, Command)
                // @ts-expect-error: default doesn't exist in never
                || (command instanceof Command) || (command.default instanceof Command);

            if (ignoreInvalid && !valid) {
                this.client.emit('warn', `Attempting to register an invalid command object: ${command} skipping.`);
                continue;
            }
            this.registerCommand(command);
        }
        return this;
    }

    /**
     * Registers all commands in a directory. The files must export a Command class constructor or instance.
     * @param options - The path to the directory, or a require-all options object
     * @example
     * const path = require('path');
     * registry.registerCommandsIn(path.join(__dirname, 'commands'));
     */
    public registerCommandsIn(options: RequireAllOptions | string): this {
        const obj: Record<string, Record<string, Command>> = requireAll(options);
        const commands: Command[] = [];
        for (const group of Object.values(obj)) {
            for (const command of Object.values(group)) {
                commands.push(command);
            }
        }
        if (typeof options === 'string' && !this.commandsPath) this.commandsPath = options;
        else if (typeof options === 'object' && !this.commandsPath) this.commandsPath = options.dirname;
        return this.registerCommands(commands, true);
    }

    /**
     * Registers a single argument type
     * @param type - Either an ArgumentType instance, or a constructor for one
     * @see CommandoRegistry#registerTypes
     */
    public registerType(type: ArgumentType): this {
        const { client, types } = this;

        // @ts-expect-error: ArgumentType has "no construct signature"
        if (isConstructor(type, ArgumentType)) type = new type(client);
        // @ts-expect-error: default doesn't exist in ArgumentType
        else if (isConstructor(type.default, ArgumentType)) type = new type.default(client);
        if (!(type instanceof ArgumentType)) throw new Error(`Invalid type object to register: ${type}`);

        // Make sure there aren't any conflicts
        if (types.has(type.id)) throw new Error(`An argument type with the ID "${type.id}" is already registered.`);

        // Add the type
        types.set(type.id, type);

        client.emit('typeRegister', type, this);
        client.emit('debug', `Registered argument type ${type.id}.`);

        return this;
    }

    /**
     * Registers multiple argument types
     * @param types - An array of ArgumentType instances or constructors
     * @param ignoreInvalid - Whether to skip over invalid objects without throwing an error
     */
    public registerTypes(types: ArgumentType[], ignoreInvalid = false): this {
        if (!Array.isArray(types)) throw new TypeError('Types must be an array.');
        for (const type of types) {
            // @ts-expect-error: ArgumentType not assignable to 'new () => unknown'
            const valid = isConstructor(type, ArgumentType) || isConstructor(type.default, ArgumentType)
                // @ts-expect-error: default doesn't exist in never
                || (type instanceof ArgumentType) || (type.default instanceof ArgumentType);

            if (ignoreInvalid && !valid) {
                this.client.emit('warn', `Attempting to register an invalid argument type object: ${type} skipping.`);
                continue;
            }
            this.registerType(type);
        }
        return this;
    }

    /**
     * Registers all argument types in a directory. The files must export an ArgumentType class constructor or instance.
     * @param options - The path to the directory, or a require-all options object
     */
    public registerTypesIn(options: RequireAllOptions | string): this {
        const obj = requireAll(options) as Record<string, ArgumentType>;
        const types: ArgumentType[] = [];
        for (const type of Object.values(obj)) types.push(type);
        return this.registerTypes(types, true);
    }

    /**
     * Registers the default argument types to the registry
     * @param types - Object specifying which types to register
     */
    public registerDefaultTypes(types: DefaultTypesOptions = {}): this {
        const defaultTypes = Object.keys(requireAll(path.join(__dirname, '/types')))
            .filter(k => k !== 'base' && k !== 'union')
            .reduce<DefaultTypesOptions>((obj, k) => {
                const key = Util.removeDashes(k) as keyof DefaultTypesOptions;
                obj[key] = true;
                return obj;
            }, {});
        Object.assign(defaultTypes, types);

        for (let type in defaultTypes) {
            if (type !== type.toLowerCase()) {
                type = type.replace(/[A-Z]/g, '-$&').toLowerCase();
            }

            this.registerType(require(`./types/${type}`));
        }

        return this;
    }

    /**
     * Reregisters a command (does not support changing name, group, or memberName)
     * @param command - New command
     * @param oldCommand - Old command
     */
    public reregisterCommand(command: Command, oldCommand: Command): void {
        const { client, commands, unknownCommand } = this;

        // @ts-expect-error: Command has "no construct signature"
        if (isConstructor(command, Command)) command = new command(client);
        // @ts-expect-error: default doesn't exist in Command
        else if (isConstructor(command.default, Command)) command = new command.default(client);
        if (!(command instanceof Command)) throw new Error(`Invalid command object to register: ${command}`);

        const { name, groupId, memberName, unknown } = command;

        if (name !== oldCommand.name) throw new Error('Command name cannot change.');
        if (groupId !== oldCommand.groupId) throw new Error('Command group cannot change.');
        if (memberName !== oldCommand.memberName) throw new Error('Command memberName cannot change.');
        if (unknown && this.unknownCommand !== oldCommand) {
            throw new Error('An unknown command is already registered.');
        }

        command.group = this.resolveGroup(groupId);
        command.group.commands.set(name, command);
        commands.set(name, command);
        if (unknownCommand === oldCommand) this.unknownCommand = null;
        if (unknown) this.unknownCommand = command;

        client.emit('commandReregister', command, oldCommand);
        client.emit('debug', `Reregistered command ${groupId}:${memberName}.`);
    }

    /**
     * Unregisters a command
     * @param command - Command to unregister
     */
    public unregisterCommand(command: Command): void {
        const { commands, unknownCommand, client } = this;
        const { name, groupId, memberName } = command;

        commands.delete(name);
        command.group.commands.delete(name);
        if (unknownCommand === command) this.unknownCommand = null;

        client.emit('commandUnregister', command);
        client.emit('debug', `Unregistered command ${groupId}:${memberName}.`);
    }

    /**
     * Finds all groups that match the search string
     * @param searchString - The string to search for
     * @param exact - Whether the search should be exact
     * @return All groups that are found
     */
    public findGroups(searchString: string | null = null, exact = false): CommandGroup[] {
        const { groups } = this;
        if (!searchString) return groups.toJSON();

        // Find all matches
        const lcSearch = searchString.toLowerCase();
        const matchedGroups = groups.filter(
            exact ? groupFilterExact(lcSearch) : groupFilterInexact(lcSearch)
        ).toJSON();
        if (exact) return matchedGroups;

        // See if there's an exact match
        for (const group of matchedGroups) {
            if (group.name.toLowerCase() === lcSearch || group.id === lcSearch) return [group];
        }
        return matchedGroups;
    }

    /**
     * Resolves a CommandGroupResolvable to a CommandGroup object
     * @param group - The group to resolve
     * @return The resolved CommandGroup
     */
    public resolveGroup(group: CommandGroupResolvable): CommandGroup {
        if (group instanceof CommandGroup) return group;
        if (typeof group === 'string') {
            const groups = this.findGroups(group, true);
            if (groups.length === 1) return groups[0];
        }
        throw new Error('Unable to resolve group.');
    }

    /**
     * Finds all commands that match the search string
     * @param searchString - The string to search for
     * @param exact - Whether the search should be exact
     * @param context - The context to check usability against
     * @return All commands that are found
     */
    public findCommands(searchString: string | null = null, exact = false, context?: CommandContext): Command[] {
        const { commands } = this;
        if (!searchString) {
            return context
                ? commands.filter(cmd => cmd.isUsable(context)).toJSON()
                : commands.toJSON();
        }

        // Find all matches
        const lcSearch = searchString.toLowerCase();
        const matchedCommands = commands.filter(
            exact ? commandFilterExact(lcSearch) : commandFilterInexact(lcSearch)
        ).toJSON();
        if (exact) return matchedCommands;

        // See if there's an exact match
        for (const command of matchedCommands) {
            if (command.name === lcSearch || command.aliases?.some(ali => ali === lcSearch)) {
                return [command];
            }
        }

        return matchedCommands;
    }

    /**
     * Resolves a CommandResolvable to a Command object
     * @param command - The command to resolve
     * @return The resolved Command
     */
    public resolveCommand(command: CommandResolvable): Command {
        if (command instanceof Command) return command;
        if (command instanceof CommandoMessage && command.command) return command.command;
        if (typeof command === 'string') {
            const commands = this.findCommands(command, true);
            if (commands.length === 1) return commands[0];
        }
        throw new Error('Unable to resolve command.');
    }

    /**
     * Resolves a command file path from a command's group ID and memberName
     * @param group - ID of the command's group
     * @param memberName - Member name of the command
     * @return Fully-resolved path to the corresponding command file
     */
    public resolveCommandPath(group: string, memberName: string): string {
        const { commandsPath } = this;
        if (!commandsPath) throw new TypeError('Commands path cannot be null or undefined.');
        return path.join(commandsPath, group, `${memberName}.js`);
    }
}

function groupFilterExact(search: string) {
    return (grp: CommandGroup): boolean => grp.id === search || grp.name.toLowerCase() === search;
}

function groupFilterInexact(search: string) {
    return (grp: CommandGroup): boolean => grp.id.includes(search) || grp.name.toLowerCase().includes(search);
}

function commandFilterExact(search: string) {
    return (cmd: Command): boolean =>
        cmd.name === search
        || cmd.aliases?.some(ali => ali === search)
        || `${cmd.groupId}:${cmd.memberName}` === search;
}

function commandFilterInexact(search: string) {
    return (cmd: Command): boolean =>
        cmd.name.includes(search)
        || `${cmd.groupId}:${cmd.memberName}` === search
        || cmd.aliases?.some(ali => ali.includes(search));
}

function isConstructor(func: { new(): unknown }, _class: () => unknown): boolean {
    try {
        new new Proxy(func, {
            construct: () => Object.prototype,
        })();
        if (!_class) return true;
        return func.prototype instanceof _class;
    } catch (err) {
        return false;
    }
}
