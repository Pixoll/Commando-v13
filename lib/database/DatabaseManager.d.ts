import { Collection, LimitedCollection } from 'discord.js';
import { FilterQuery, UpdateAggregationStage, UpdateQuery } from 'mongoose';
import CommandoGuild from '../extensions/guild';
import { ModelFrom, SimplifiedModel, BaseSchema } from './Schemas';
export interface DefaultDocument extends BaseSchema {
    guild?: string;
}
/** A MongoDB database schema manager */
export default class DatabaseManager<T extends DefaultDocument> {
    /** Guild for this database */
    readonly guild: CommandoGuild | null;
    /** The name of the schema this manager is for */
    Schema: SimplifiedModel<T>;
    /** The cache for this manager */
    cache: LimitedCollection<string, T>;
    /**
     * @param schema - The schema of this manager
     * @param guild - The guild this manager is for
     */
    constructor(schema: ModelFrom<T, boolean>, guild?: CommandoGuild);
    /**
     * Add a single document to the database.
     * @param doc - The document to add
     * @returns The added document
     */
    add(doc: T): Promise<T>;
    /**
     * Delete a single document from the database
     * @param doc - The document to delete or its ID
     * @returns The deleted document
     */
    delete(doc: T | string): Promise<T>;
    /**
     * Update a single document of the database
     * @param doc - The document to update or its ID
     * @param update - The update to apply
     * @returns The updated document
     */
    update(doc: T | string, update: T | UpdateAggregationStage | UpdateQuery<T>): Promise<T>;
    /**
     * Fetch a single document
     * @param filter - The ID or fetching filter for this document
     * @returns The fetched document
     */
    fetch(filter?: FilterQuery<T> | string): Promise<T | null>;
    /**
     * Fetch multiple documents
     * @param filter - The fetching filter for the documents
     * @returns The fetched documents
     */
    fetchMany(filter?: FilterQuery<T>): Promise<Collection<string, T>>;
    /** Filtering function for fetching documents. May only be used in `Array.filter()` or `Collection.filter()` */
    protected filterDocuments(filter: FilterQuery<T>): (doc: T) => boolean;
}