"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = __importDefault(require("./base"));
const better_ms_1 = require("better-ms");
const util_1 = __importDefault(require("../util"));
class DurationArgumentType extends base_1.default {
    constructor(client) {
        super(client, 'duration');
    }
    validate(val, _, arg) {
        const int = typeof val === 'number' ? val
            : /^\d+$/.test(val) ? parseInt(val) : (0, better_ms_1.ms)(val);
        if (!int || int < 1000) {
            return 'Please enter a valid duration format. Use the `help` command for more information.';
        }
        if (int > (0, better_ms_1.ms)('1y')) {
            return 'The max. usable duration is `1 year`. Please try again.';
        }
        if (!util_1.default.isNullish(arg.min) && int < arg.min) {
            return `Please enter a duration above or exactly ${(0, better_ms_1.ms)(arg.min)}.`;
        }
        if (!util_1.default.isNullish(arg.max) && int > arg.max) {
            return `Please enter a duration below or exactly ${(0, better_ms_1.ms)(arg.max)}.`;
        }
        return true;
    }
    parse(val) {
        if (typeof val === 'number')
            return val;
        if (/^\d+$/.test(val))
            return parseInt(val);
        return (0, better_ms_1.ms)(val);
    }
}
exports.default = DurationArgumentType;
//# sourceMappingURL=duration.js.map