import fetch, { RequestInit as NodeFetchRequestInit } from 'node-fetch';
import { config } from '../config.js';

interface ApiResult {
  result: {
    data: {
      json: Record<string, unknown>;
    };
  };
}

async function apiCall(endpoint: string, options: NodeFetchRequestInit = {}): Promise<ApiResult> {
  const response = await fetch(`${config.apiBaseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiToken}`,
      ...(options.headers as Record<string, string> || {}),
    },
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json() as Promise<ApiResult>;
}

export async function createPost(args: { content: string; visibility?: string }) {
  const result = await apiCall('/trpc/posts.create', {
    method: 'POST',
    body: JSON.stringify({ json: args }),
  });
  return { content: [{ type: 'text', text: `Post created with ID: ${(result.result.data.json as { id: string }).id}` }] };
}

export async function getTimeline(args: { limit?: number; cursor?: string }) {
  const params = new URLSearchParams();
  params.set('input', JSON.stringify({ json: args }));
  const result = await apiCall(`/trpc/posts.timeline?${params}`);
  const posts = (result.result.data.json as { items: Array<{ username: string; content: string }> }).items;
  return {
    content: [{
      type: 'text',
      text: posts.map((p) => `@${p.username}: ${p.content.slice(0, 100)}...`).join('\n\n'),
    }],
  };
}

export async function searchPosts(args: { query: string; limit?: number }) {
  const params = new URLSearchParams();
  params.set('input', JSON.stringify({ json: args }));
  const result = await apiCall(`/trpc/posts.search?${params}`);
  return { content: [{ type: 'text', text: JSON.stringify(result.result.data.json, null, 2) }] };
}

export async function getUserProfile(args: { username: string }) {
  const params = new URLSearchParams();
  params.set('input', JSON.stringify({ json: args }));
  const result = await apiCall(`/trpc/users.profile?${params}`);
  const user = result.result.data.json as { username: string; display_name?: string; bio?: string; followers_count: number; following_count: number; posts_count: number };
  return {
    content: [{
      type: 'text',
      text: `@${user.username} (${user.display_name || 'No name'})\nBio: ${user.bio || 'No bio'}\nFollowers: ${user.followers_count} | Following: ${user.following_count} | Posts: ${user.posts_count}`,
    }],
  };
}

export async function followUser(args: { userId: string }) {
  await apiCall('/trpc/users.follow', {
    method: 'POST',
    body: JSON.stringify({ json: args }),
  });
  return { content: [{ type: 'text', text: `Successfully followed user ${args.userId}` }] };
}

export async function unfollowUser(args: { userId: string }) {
  await apiCall('/trpc/users.unfollow', {
    method: 'POST',
    body: JSON.stringify({ json: args }),
  });
  return { content: [{ type: 'text', text: `Successfully unfollowed user ${args.userId}` }] };
}

export async function likePost(args: { postId: string }) {
  await apiCall('/trpc/posts.like', {
    method: 'POST',
    body: JSON.stringify({ json: args }),
  });
  return { content: [{ type: 'text', text: `Successfully liked post ${args.postId}` }] };
}

export async function sendMessage(args: { userId: string; content: string }) {
  const result = await apiCall('/trpc/messages.send', {
    method: 'POST',
    body: JSON.stringify({ json: args }),
  });
  return { content: [{ type: 'text', text: `Message sent successfully` }] };
}

export async function getTrending(args: { limit?: number }) {
  const params = new URLSearchParams();
  params.set('input', JSON.stringify({ json: args }));
  const result = await apiCall(`/trpc/trending.list?${params}`);
  return { content: [{ type: 'text', text: JSON.stringify(result.result.data.json, null, 2) }] };
}

export async function getNotifications(args: { limit?: number; unreadOnly?: boolean }) {
  const params = new URLSearchParams();
  params.set('input', JSON.stringify({ json: args }));
  const result = await apiCall(`/trpc/notifications.list?${params}`);
  return { content: [{ type: 'text', text: JSON.stringify(result.result.data.json, null, 2) }] };
}

export async function getCurrentUser(): Promise<Record<string, unknown>> {
  const result = await apiCall('/trpc/users.me');
  return result.result.data.json;
}
