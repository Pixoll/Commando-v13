import CommandoClient from '../client';
import Argument from '../commands/argument';
import CommandoMessage from '../extensions/message';
import ArgumentType from './base';

export default class IntegerArgumentType extends ArgumentType {
    public constructor(client: CommandoClient) {
        super(client, 'integer');
    }

    public validate(val: string, _: CommandoMessage, arg: Argument): boolean | string {
        const int = parseInt(val);
        if (isNaN(int)) return false;

        if (arg.oneOf && !arg.oneOf.includes(int)) {
            return `Please enter one of the following options: ${arg.oneOf.map(opt => `\`${opt}\``).join(', ')}`;
        }
        if (arg.min !== null && typeof arg.min !== 'undefined' && int < arg.min) {
            return `Please enter a number above or exactly ${arg.min}.`;
        }
        if (arg.max !== null && typeof arg.max !== 'undefined' && int > arg.max) {
            return `Please enter a number below or exactly ${arg.max}.`;
        }

        return true;
    }

    public parse(val: string): number {
        return parseInt(val);
    }
}