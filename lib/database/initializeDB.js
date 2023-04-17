"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const mongoose_1 = __importDefault(require("mongoose"));
const require_all_1 = __importDefault(require("require-all"));
const Schemas_1 = __importDefault(require("./Schemas"));
const util_1 = __importDefault(require("../util"));
/**
 * Connects to MongoDB, caches the database and loads all client modules.
 * @param client - The client the database is for.
 */
async function initializeDB(client) {
    const connected = await connectDB(client);
    if (!connected)
        return;
    await cacheDB(client);
    await loadModules(client);
}
exports.default = initializeDB;
/**
 * Connects the client to the database.
 * @param client - The client this handlers is for.
 */
async function connectDB(client) {
    const { mongoDbURI } = client.options;
    const { MONGO_DB_URI } = process.env;
    const uri = mongoDbURI ?? MONGO_DB_URI;
    if (!uri)
        return false;
    mongoose_1.default.set('strictQuery', true);
    await mongoose_1.default.connect(uri, { keepAlive: true });
    client.emit('debug', 'Established database connection');
    return true;
}
/**
 * Caches all the DB data.
 * @param client - The client this handlers is for.
 */
async function cacheDB(client) {
    const { database, databases, guilds } = client;
    const schemas = Object.values(Schemas_1.default);
    // Resolves all promises at once after getting all data.
    const schemasData = await Promise.all(schemas.map(schema => schema.find()));
    const data = new discord_js_1.Collection();
    for (let i = 0; i < schemas.length; i++) {
        const schemaName = util_1.default.removeDashes(schemas[i].collection.name);
        const entries = schemasData[i].map(doc => [doc._id?.toString() ?? '', util_1.default.jsonifyDocument(doc)]);
        const documents = new discord_js_1.LimitedCollection({
            maxSize: 200,
        }, entries);
        data.set(schemaName, documents);
    }
    const clientData = data.mapValues(coll => coll.filter(doc => typeof doc.guild !== 'string'));
    database['init'](clientData);
    for (const guild of guilds.cache.values()) {
        const guildData = data.mapValues(coll => coll.filter(doc => doc.guild === guild.id));
        guild.database['init'](guildData);
        databases.set(guild.id, guild.database);
    }
    client.emit('debug', 'Database caching process finished');
    client.emit('databaseReady', client);
}
/**
 * Loads all the client's modules.
 * @param client - The client this handlers is for.
 */
async function loadModules(client) {
    const { options } = client;
    const { modulesDir, excludeModules } = options;
    if (!modulesDir)
        return;
    const modules = (0, require_all_1.default)(modulesDir);
    for (const folderName of Object.keys(modules)) {
        const folder = modules[folderName];
        if (typeof folder !== 'object')
            continue;
        for (const fileName in folder) {
            if (excludeModules?.includes(fileName))
                continue;
            const file = folder[fileName];
            const loader = typeof file === 'function'
                ? file
                : file.default
                    || file[Object.keys(file).filter(k => k !== '__esModule')[0]];
            // eslint-disable-next-line no-await-in-loop
            await loader(client);
            client.emit('debug', `Loaded module ${folderName}/${fileName}`);
        }
    }
    client.emit('debug', 'Loaded client modules');
    client.emit('modulesReady', client);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdGlhbGl6ZURCLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2RhdGFiYXNlL2luaXRpYWxpemVEQi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLDJDQUEyRDtBQUMzRCx3REFBOEM7QUFDOUMsOERBQXFDO0FBRXJDLHdEQUEwRTtBQUMxRSxtREFBMkI7QUFhM0I7OztHQUdHO0FBQ1ksS0FBSyxVQUFVLFlBQVksQ0FBQyxNQUE0QjtJQUNuRSxNQUFNLFNBQVMsR0FBRyxNQUFNLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUMxQyxJQUFJLENBQUMsU0FBUztRQUFFLE9BQU87SUFDdkIsTUFBTSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdEIsTUFBTSxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDOUIsQ0FBQztBQUxELCtCQUtDO0FBRUQ7OztHQUdHO0FBQ0gsS0FBSyxVQUFVLFNBQVMsQ0FBQyxNQUE0QjtJQUNqRCxNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztJQUN0QyxNQUFNLEVBQUUsWUFBWSxFQUFFLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQztJQUNyQyxNQUFNLEdBQUcsR0FBRyxVQUFVLElBQUksWUFBWSxDQUFDO0lBRXZDLElBQUksQ0FBQyxHQUFHO1FBQUUsT0FBTyxLQUFLLENBQUM7SUFDdkIsa0JBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2xDLE1BQU0sa0JBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFDakQsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsaUNBQWlDLENBQUMsQ0FBQztJQUN4RCxPQUFPLElBQUksQ0FBQztBQUNoQixDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsS0FBSyxVQUFVLE9BQU8sQ0FBQyxNQUE0QjtJ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