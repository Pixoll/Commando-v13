"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = __importDefault(require("./base"));
class InviteArgumentType extends base_1.default {
    /** The fetched invite */
    fetchedInvite;
    constructor(client) {
        super(client, 'invite');
        this.fetchedInvite = null;
    }
    async validate(value) {
        if (typeof value === 'undefined')
            return false;
        const invite = await this.client.fetchInvite(value).catch(() => null);
        this.fetchedInvite = invite;
        return !!invite;
    }
    async parse(value) {
        const { fetchedInvite } = this;
        if (fetchedInvite) {
            this.fetchedInvite = null;
            return fetchedInvite;
        }
        return await this.client.fetchInvite(value);
    }
}
exports.default = InviteArgumentType;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW52aXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3R5cGVzL2ludml0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUVBLGtEQUFrQztBQUVsQyxNQUFxQixrQkFBbUIsU0FBUSxjQUFzQjtJQUNsRSx5QkFBeUI7SUFDZixhQUFhLENBQXdCO0lBRS9DLFlBQW1CLE1BQXNCO1FBQ3JDLEtBQUssQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFeEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7SUFDOUIsQ0FBQztJQUVNLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBeUI7UUFDM0MsSUFBSSxPQUFPLEtBQUssS0FBSyxXQUFXO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFDL0MsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEUsSUFBSSxDQUFDLGFBQWEsR0FBRyxNQUErQixDQUFDO1FBQ3JELE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUNwQixDQUFDO0lBRU0sS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFhO1FBQzVCLE1BQU0sRUFBRSxhQUFhLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFDL0IsSUFBSSxhQUFhLEVBQUU7WUFDZixJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztZQUMxQixPQUFPLGFBQWEsQ0FBQztTQUN4QjtRQUNELE9BQU8sTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQW1CLENBQUM7SUFDbEUsQ0FBQztDQUNKO0FBekJELHFDQXlCQyJ9