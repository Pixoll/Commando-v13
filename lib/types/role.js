"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = __importDefault(require("./base"));
const util_1 = __importDefault(require("../util"));
const discord_js_1 = require("discord.js");
class RoleArgumentType extends base_1.default {
    constructor(client) {
        super(client, 'role');
    }
    validate(val, msg, arg) {
        if (!msg.guild)
            return false;
        const matches = val.match(/^(?:<@&)?(\d+)>?$/);
        if (matches)
            return msg.guild.roles.cache.has(matches[1]);
        const search = val.toLowerCase();
        let roles = msg.guild.roles.cache.filter(nameFilterInexact(search));
        const first = roles.first();
        if (!first)
            return false;
        if (roles.size === 1) {
            if (arg.oneOf && !arg.oneOf.includes(first.id))
                return false;
            return true;
        }
        const exactRoles = roles.filter(nameFilterExact(search));
        const exact = exactRoles.first();
        if (exactRoles.size === 1 && exact) {
            if (arg.oneOf && !arg.oneOf.includes(exact.id))
                return false;
            return true;
        }
        if (exactRoles.size > 0)
            roles = exactRoles;
        return roles.size <= 15
            ? `${util_1.default.disambiguation(roles.map(role => `${(0, discord_js_1.escapeMarkdown)(role.name)}`), 'roles')}\n`
            : 'Multiple roles found. Please be more specific.';
    }
    parse(val, msg) {
        if (!msg.guild)
            return null;
        const matches = val.match(/^(?:<@&)?(\d+)>?$/);
        if (matches)
            return msg.guild.roles.resolve(matches[1]);
        const search = val.toLowerCase();
        const roles = msg.guild.roles.cache.filter(nameFilterInexact(search));
        if (roles.size === 0)
            return null;
        if (roles.size === 1)
            return roles.first() ?? null;
        const exactRoles = roles.filter(nameFilterExact(search));
        if (exactRoles.size === 1)
            return exactRoles.first() ?? null;
        return null;
    }
}
exports.default = RoleArgumentType;
function nameFilterExact(search) {
    return (role) => role.name.toLowerCase() === search;
}
function nameFilterInexact(search) {
    return (role) => role.name.toLowerCase().includes(search);
}
//# sourceMappingURL=role.js.map