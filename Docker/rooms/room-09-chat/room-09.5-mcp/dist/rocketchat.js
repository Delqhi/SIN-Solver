"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RocketChatClient = void 0;
const axios_1 = __importDefault(require("axios"));
class RocketChatClient {
    constructor(config) {
        this.client = axios_1.default.create({
            baseURL: `${config.url}/api/v1`,
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': config.userId,
                'X-Auth-Token': config.authToken,
            },
        });
    }
    async getInfo() {
        const response = await this.client.get('/info');
        return response.data;
    }
    async postMessage(channel, text, attachments) {
        const response = await this.client.post('/chat.postMessage', {
            channel,
            text,
            attachments,
        });
        return response.data;
    }
    async createChannel(name, members = [], readOnly = false) {
        const response = await this.client.post('/channels.create', {
            name,
            members,
            readOnly,
        });
        return response.data;
    }
    async listChannels() {
        const response = await this.client.get('/channels.list');
        return response.data;
    }
    async addUserToChannel(roomId, userId) {
        const response = await this.client.post('/channels.invite', {
            roomId,
            userId,
        });
        return response.data;
    }
    async getHistory(roomId, count = 50) {
        const response = await this.client.get('/channels.history', {
            params: { roomId, count },
        });
        return response.data;
    }
    async getUsers() {
        const response = await this.client.get('/users.list');
        return response.data;
    }
    async createUser(user) {
        const response = await this.client.post('/users.create', user);
        return response.data;
    }
    // Generic request for any endpoint not covered above
    async request(method, endpoint, data) {
        const response = await this.client.request({
            method,
            url: endpoint,
            data,
        });
        return response.data;
    }
}
exports.RocketChatClient = RocketChatClient;
