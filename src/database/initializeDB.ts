import { Collection, LimitedCollection } from 'discord.js';
import { connect } from 'mongoose';
import requireAll from 'require-all';
import CommandoClient from '../client';
import { DefaultDocument } from './DatabaseManager';
import Schemas, { ModelFrom } from './Schemas';
import Util from '../util';

type Module = (client: CommandoClient) => Promise<unknown>;

/**
 * Connects to MongoDB, caches the database and loads all client modules.
 * @param client - The client the database is for.
 */
export default async function initializeDB(client: CommandoClient): Promise<void> {
    const connected = await connectDB(client);
    if (!connected) return;
    await cacheDB(client);
    await loadModules(client);
}

/**
 * Connects the client to the database.
 * @param client - The client this handlers is for.
 */
async function connectDB(client: CommandoClient): Promise<boolean> {
    const { options } = client;
    const { mongoDbURI } = options;
    const { MONGO_DB_URI } = process.env;

    if (!MONGO_DB_URI && !mongoDbURI) return false;
    await connect(mongoDbURI ?? MONGO_DB_URI!, { keepAlive: true });
    client.emit('debug', 'Established database connection');
    return true;
}

/**
 * Caches all the DB data.
 * @param client - The client this handlers is for.
 */
async function cacheDB(client: CommandoClient): Promise<void> {
    const { database, databases, guilds } = client;

    const schemas = Object.values(Schemas) as Array<ModelFrom<DefaultDocument, true>>;
    // Resolves all promises at once after getting all data.
    const schemasData = await Promise.all(schemas.map(schema => schema.find({})));

    const data: Collection<string, LimitedCollection<string, DefaultDocument>> = new Collection();
    for (let i = 0; i < schemas.length; i++) {
        const schemaName = Util.removeDashes(schemas[i].collection.name);
        const entries = schemasData[i].map<[string, DefaultDocument]>(doc => [doc._id.toString(), doc]);

        const documents = new LimitedCollection({
            maxSize: 200,
        }, entries);

        data.set(schemaName, documents);
    }

    const clientData = data.mapValues(coll => coll.filter(doc => typeof doc.guild !== 'string'));
    // @ts-expect-error: init is protected in ClientDatabaseManager
    database.init(clientData);

    for (const guild of guilds.cache.values()) {
        const guildData = data.mapValues(coll => coll.filter(doc => doc.guild === guild.id));
        // @ts-expect-error: init is protected in GuildDatabaseManager
        guild.database.init(guildData);
        databases.set(guild.id, guild.database);
    }
    client.emit('debug', 'Database caching process finished');
    client.emit('databaseReady', client);
}

/**
 * Loads all the client's modules.
 * @param client - The client this handlers is for.
 */
async function loadModules(client: CommandoClient): Promise<void> {
    const { options } = client;
    const { modulesDir, excludeModules } = options;

    if (!modulesDir) return;
    const features = requireAll(modulesDir) as Record<string, Record<string, Module>>;
    for (const folderName of Object.keys(features)) {
        const folder = features[folderName];
        if (typeof folder !== 'object') continue;
        for (const fileName in folder) {
            if (excludeModules?.includes(fileName)) continue;
            const file = folder[fileName];
            await file(client);
            client.emit('debug', `Loaded feature ${folderName}/${fileName}`);
        }
    }
    client.emit('debug', 'Loaded client features');
    client.emit('modulesReady', client);
}
