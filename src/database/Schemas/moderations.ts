import { model, Schema } from 'mongoose';
import { BaseSchemaWithTimestamps, DocumentFrom } from './base';

export type TimeBasedModerationType =
    | 'mute'
    | 'temp-ban'
    | 'time-out';

type ModerationType =
    | TimeBasedModerationType
    | 'ban'
    | 'kick'
    | 'soft-ban'
    | 'warn';

export interface ModerationSchema extends Omit<BaseSchemaWithTimestamps, '_id'> {
    readonly _id: string;
    type: ModerationType;
    guild: string;
    userId: string;
    userTag: string;
    modId: string;
    modTag: string;
    reason: string;
    duration?: string | undefined;
}

const ModerationsModel = model<DocumentFrom<ModerationSchema, true>>('moderations', new Schema({
    _id: String,
    type: String,
    guild: String,
    userId: String,
    userTag: String,
    modId: String,
    modTag: String,
    reason: String,
    duration: String,
}, { timestamps: true }));

export default ModerationsModel;
