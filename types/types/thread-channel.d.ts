import ArgumentType from './base';
import { AnyThreadChannel } from 'discord.js';
import CommandoClient from '../client';
import CommandoMessage from '../extensions/message';
import Argument from '../commands/argument';
export default class ThreadChannelArgumentType extends ArgumentType<'thread-channel'> {
    constructor(client: CommandoClient);
    validate(value: string | undefined, message: CommandoMessage, argument: Argument<'thread-channel'>): boolean | string;
    parse(value: string, message: CommandoMessage): AnyThreadChannel | null;
}
