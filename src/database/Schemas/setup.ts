import { model, Schema } from 'mongoose';
import { BaseSchema, DocumentFrom } from './base';
import { Snowflake } from 'discord.js';

export interface SetupSchema extends BaseSchema {
    guild: Snowflake;
    logsChannel: Snowflake;
    memberRole: Snowflake;
    botRole: Snowflake;
    mutedRole: Snowflake;
    lockChannels: Snowflake[];
}

const SetupModel = model<DocumentFrom<SetupSchema>>('setup', new Schema({
    guild: String,
    logsChannel: String,
    memberRole: String,
    botRole: String,
    mutedRole: String,
    lockChannels: [String],
}), 'setup');

export default SetupModel;
