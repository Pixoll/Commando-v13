import { model, Schema } from 'mongoose';
import { BaseSchemaWithTimestamps, DocumentFrom } from './base';

export interface ErrorSchema extends Omit<BaseSchemaWithTimestamps, '_id'> {
    readonly _id: string;
    type: string;
    name: string;
    message: string;
    command?: string | undefined;
    files: string;
}

const ErrorsModel = model<DocumentFrom<ErrorSchema, true>>('errors', new Schema({
    _id: String,
    type: String,
    name: String,
    message: String,
    command: String,
    files: String,
}, { timestamps: true }));

export default ErrorsModel;
