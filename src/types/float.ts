import CommandoClient from '../client';
import Argument from '../commands/argument';
import Util from '../util';
import ArgumentType from './base';

export default class FloatArgumentType extends ArgumentType<'float'> {
    public constructor(client: CommandoClient) {
        super(client, 'float');
    }

    public validate(value: string | undefined, _: unknown, argument: Argument<'float'>): boolean | string {
        if (typeof value === 'undefined') return false;
        const float = /^[\d.]+$/.test(value) && parseFloat(value);
        if (float === false || isNaN(float)) return false;

        if (argument.oneOf && !argument.oneOf.includes(float)) {
            return `Please enter one of the following options: ${argument.oneOf.map(opt => `\`${opt}\``).join(', ')}`;
        }
        if (!Util.isNullish(argument.min) && float < argument.min) {
            return `Please enter a number above or exactly ${argument.min}.`;
        }
        if (!Util.isNullish(argument.max) && float > argument.max) {
            return `Please enter a number below or exactly ${argument.max}.`;
        }

        return true;
    }

    public parse(value: string): number {
        return parseFloat(value);
    }
}
