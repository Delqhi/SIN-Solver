import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import superjson from 'superjson';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const protectedProcedure = t.procedure;

export const appRouter = t.router({
  health: publicProcedure.query(() => ({ status: 'ok' as const, timestamp: '' })),

  auth: t.router({
    register: publicProcedure
      .input(z.object({
        username: z.string(),
        email: z.string(),
        password: z.string(),
        displayName: z.string().optional(),
      }))
      .mutation(() => ({
        user: { id: '', username: '', email: '' },
        accessToken: '',
        refreshToken: '',
      })),

    login: publicProcedure
      .input(z.object({
        email: z.string(),
        password: z.string(),
      }))
      .mutation(() => ({
        user: { id: '', username: '', email: '' },
        accessToken: '',
        refreshToken: '',
      })),

    refresh: publicProcedure
      .input(z.object({ refreshToken: z.string() }))
      .mutation(() => ({ accessToken: '' })),
  }),

  posts: t.router({
    create: protectedProcedure
      .input(z.object({
        content: z.string(),
        mediaUrls: z.array(z.object({
          type: z.enum(['image', 'video', 'gif']),
          url: z.string(),
          thumbnail: z.string().optional(),
        })).optional(),
        visibility: z.enum(['public', 'followers', 'private']).default('public'),
        replyToId: z.string().optional(),
      }))
      .mutation(() => ({ id: '', createdAt: '' })),

    timeline: protectedProcedure
      .input(z.object({
        cursor: z.string().optional(),
        limit: z.number().default(20),
      }))
      .query(() => ({
        items: [] as Array<{
          id: string;
          content: string;
          media_urls: string;
          mediaUrls: unknown[];
          likes_count: number;
          comments_count: number;
          created_at: Date;
          username: string;
          display_name: string;
          avatar_url: string | null;
        }>,
        nextCursor: null as string | null,
      })),

    get: publicProcedure
      .input(z.object({ postId: z.string() }))
      .query(() => ({
        id: '',
        content: '',
        media_urls: '',
        mediaUrls: [] as unknown[],
        likes_count: 0,
        comments_count: 0,
        created_at: new Date(),
        username: '',
        display_name: '',
        avatar_url: null as string | null,
      })),

    like: protectedProcedure
      .input(z.object({ postId: z.string() }))
      .mutation(() => ({ success: true })),

    unlike: protectedProcedure
      .input(z.object({ postId: z.string() }))
      .mutation(() => ({ success: true })),

    delete: protectedProcedure
      .input(z.object({ postId: z.string() }))
      .mutation(() => ({ success: true })),
  }),

  users: t.router({
    profile: publicProcedure
      .input(z.object({ username: z.string() }))
      .query(() => ({
        id: '',
        username: '',
        display_name: '',
        bio: '',
        avatar_url: null as string | null,
        banner_url: null as string | null,
        followers_count: 0,
        following_count: 0,
        posts_count: 0,
        is_verified: false,
        created_at: new Date(),
      })),

    me: protectedProcedure
      .query(() => ({
        id: '',
        username: '',
        email: '',
        display_name: '',
        bio: '',
        avatar_url: null as string | null,
        banner_url: null as string | null,
        followers_count: 0,
        following_count: 0,
        posts_count: 0,
      })),

    update: protectedProcedure
      .input(z.object({
        displayName: z.string().optional(),
        bio: z.string().optional(),
        avatarUrl: z.string().optional(),
        bannerUrl: z.string().optional(),
      }))
      .mutation(() => ({ success: true })),

    follow: protectedProcedure
      .input(z.object({ userId: z.string() }))
      .mutation(() => ({ success: true })),

    unfollow: protectedProcedure
      .input(z.object({ userId: z.string() }))
      .mutation(() => ({ success: true })),

    isFollowing: protectedProcedure
      .input(z.object({ userId: z.string() }))
      .query(() => ({ isFollowing: false })),

    followers: publicProcedure
      .input(z.object({
        username: z.string(),
        limit: z.number().default(20),
      }))
      .query(() => ({
        followers: [] as Array<{
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
        }>,
      })),

    following: publicProcedure
      .input(z.object({
        username: z.string(),
        limit: z.number().default(20),
      }))
      .query(() => ({
        following: [] as Array<{
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
        }>,
      })),
  }),

  search: t.router({
    users: publicProcedure
      .input(z.object({
        query: z.string(),
        limit: z.number().default(20),
      }))
      .query(() => ({
        users: [] as Array<{
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
        }>,
      })),

    posts: publicProcedure
      .input(z.object({
        query: z.string(),
        limit: z.number().default(20),
      }))
      .query(() => ({
        posts: [] as Array<{
          id: string;
          content: string;
          username: string;
          created_at: Date;
        }>,
      })),
  }),
});

export type AppRouter = typeof appRouter;
