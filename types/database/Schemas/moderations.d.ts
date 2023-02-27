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
/// <reference types="mongoose/types/virtuals" />
/// <reference types="mongoose" />
/// <reference types="mongoose/types/inferschematype" />
import { BaseSchemaWithTimestamps, DocumentFrom } from './base';
import { Snowflake } from 'discord.js';
export type TimeBasedModerationType = 'mute' | 'temp-ban' | 'time-out';
export type ModerationType = TimeBasedModerationType | 'ban' | 'kick' | 'soft-ban' | 'warn';
export interface ModerationSchema extends Omit<BaseSchemaWithTimestamps, '_id'> {
    readonly _id: string;
    type: ModerationType;
    guild: Snowflake;
    userId: Snowflake;
    userTag: string;
    modId: Snowflake;
    modTag: string;
    reason: string;
    duration?: string | undefined;
}
declare const ModerationsModel: import("mongoose").Model<DocumentFrom<ModerationSchema, true>, {}, {}, {}, any>;
export default ModerationsModel;