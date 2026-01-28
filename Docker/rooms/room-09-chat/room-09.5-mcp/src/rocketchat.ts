import axios, { AxiosInstance } from 'axios';

export interface RocketChatConfig {
  url: string;
  userId: string;
  authToken: string;
}

export class RocketChatClient {
  private client: AxiosInstance;

  constructor(config: RocketChatConfig) {
    this.client = axios.create({
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

  async postMessage(channel: string, text: string, attachments?: any[]) {
    const response = await this.client.post('/chat.postMessage', {
      channel,
      text,
      attachments,
    });
    return response.data;
  }

  async createChannel(name: string, members: string[] = [], readOnly = false) {
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

  async addUserToChannel(roomId: string, userId: string) {
    const response = await this.client.post('/channels.invite', {
      roomId,
      userId,
    });
    return response.data;
  }

  async getHistory(roomId: string, count = 50) {
    const response = await this.client.get('/channels.history', {
      params: { roomId, count },
    });
    return response.data;
  }

  async getUsers() {
    const response = await this.client.get('/users.list');
    return response.data;
  }

  async createUser(user: { name: string; email: string; password: string; username: string }) {
    const response = await this.client.post('/users.create', user);
    return response.data;
  }

  // Generic request for any endpoint not covered above
  async request(method: string, endpoint: string, data?: any) {
    const response = await this.client.request({
      method,
      url: endpoint,
      data,
    });
    return response.data;
  }
}
