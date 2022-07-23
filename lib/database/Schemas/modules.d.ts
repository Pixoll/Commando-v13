/// <reference types="mongoose/types/aggregate" />
/// <reference types="mongoose/types/callback" />
/// <reference types="mongoose/types/collection" />
/// <reference types="mongoose/types/connection" />
/// <reference types="mongoose/types/cursor" />
/// <reference types="mongoose/types/document" />
/// <reference types="mongoose/types/error" />
/// <reference types="mongoose/types/expressions" />
/// <reference types="mongoose/types/helpers" />
/// <reference types="mongoose/types/middlewares" />
/// <reference types="mongoose/types/indexes" />
/// <reference types="mongoose/types/models" />
/// <reference types="mongoose/types/mongooseoptions" />
/// <reference types="mongoose/types/pipelinestage" />
/// <reference types="mongoose/types/populate" />
/// <reference types="mongoose/types/query" />
/// <reference types="mongoose/types/schemaoptions" />
/// <reference types="mongoose/types/schematypes" />
/// <reference types="mongoose/types/session" />
/// <reference types="mongoose/types/types" />
/// <reference types="mongoose/types/utility" />
/// <reference types="mongoose/types/validation" />
/// <reference types="mongoose" />
/// <reference types="mongoose/types/inferschematype" />
import { BaseSchema, DocumentFrom } from './base';
export interface ModuleSchema extends BaseSchema {
    guild: string;
    stickyRoles: boolean;
    welcome: boolean;
    auditLogs: {
        boosts: boolean;
        channels: boolean;
        commands: boolean;
        emojis: boolean;
        events: boolean;
        invites: boolean;
        members: boolean;
        messages: boolean;
        moderation: boolean;
        modules: boolean;
        roles: boolean;
        server: boolean;
        stickers: boolean;
        threads: boolean;
        users: boolean;
        voice: boolean;
    };
}
declare const ModulesModel: import("mongoose").Model<DocumentFrom<ModuleSchema, false>, {}, {}, {}, any>;
export default ModulesModel;
