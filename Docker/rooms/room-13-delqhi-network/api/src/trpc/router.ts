import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { Context } from './context.js';
import { query, queryOne } from '../db/client.js';
import { signAccessToken, signRefreshToken, comparePassword, hashPassword } from '../auth/jwt.js';
import { v4 as uuidv4 } from 'uuid';

const t = initTRPC.context<Context>().create();

const publicProcedure = t.procedure;

const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const appRouter = t.router({
  health: publicProcedure.query(() => ({ status: 'ok', timestamp: new Date().toISOString() })),

  auth: t.router({
    register: publicProcedure
      .input(
        z.object({
          username: z.string().min(3).max(50),
          email: z.string().email(),
          password: z.string().min(8),
          displayName: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const passwordHash = hashPassword(input.password);
        const id = uuidv4();

        await query(
          `INSERT INTO users (id, username, email, password_hash, display_name, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [id, input.username, input.email, passwordHash, input.displayName || input.username]
        );

        const tokens = {
          accessToken: signAccessToken({ userId: id, username: input.username }),
          refreshToken: signRefreshToken({ userId: id, username: input.username }),
        };

        return { user: { id, username: input.username, email: input.email }, ...tokens };
      }),

    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const user = await queryOne<{
          id: string;
          username: string;
          password_hash: string;
        }>(
          'SELECT id, username, password_hash FROM users WHERE email = $1 AND deleted_at IS NULL',
          [input.email]
        );

        if (!user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password',
          });
        }

        const passwordValid = await comparePassword(input.password, user.password_hash);
        if (!passwordValid) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password',
          });
        }

        return {
          user: { id: user.id, username: user.username, email: input.email },
          accessToken: signAccessToken({ userId: user.id, username: user.username }),
          refreshToken: signRefreshToken({ userId: user.id, username: user.username }),
        };
      }),

    refresh: publicProcedure
      .input(z.object({ refreshToken: z.string() }))
      .mutation(async ({ input: _input }) => {
        try {
          const payload = signAccessToken({
            userId: 'temp',
            username: 'temp',
          });

          return {
            accessToken: payload,
          };
        } catch {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid refresh token' });
        }
      }),
  }),

  posts: t.router({
    create: protectedProcedure
      .input(
        z.object({
          content: z.string().min(1).max(10000),
          mediaUrls: z
            .array(
              z.object({
                type: z.enum(['image', 'video', 'gif']),
                url: z.string().url(),
                thumbnail: z.string().url().optional(),
              })
            )
            .optional(),
          visibility: z.enum(['public', 'followers', 'private']).default('public'),
          replyToId: z.string().uuid().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = uuidv4();

        await query(
          `INSERT INTO posts (id, user_id, content, media_urls, visibility, reply_to_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            id,
            ctx.user.userId,
            input.content,
            JSON.stringify(input.mediaUrls || []),
            input.visibility,
            input.replyToId || null,
          ]
        );

        await query('UPDATE users SET posts_count = posts_count + 1 WHERE id = $1', [
          ctx.user.userId,
        ]);

        return { id, createdAt: new Date().toISOString() };
      }),

    timeline: protectedProcedure
      .input(
        z.object({
          cursor: z.string().optional(),
          limit: z.number().min(1).max(50).default(20),
        })
      )
      .query(async ({ ctx, input }) => {
        const posts = await query<{
          id: string;
          content: string;
          media_urls: string;
          likes_count: number;
          comments_count: number;
          created_at: Date;
          username: string;
          display_name: string;
          avatar_url: string | null;
        }>(
          `SELECT p.id, p.content, p.media_urls, p.likes_count, p.comments_count, p.created_at, 
                  u.username, u.display_name, u.avatar_url
           FROM posts p
           JOIN users u ON p.user_id = u.id
           WHERE p.deleted_at IS NULL
           AND (p.visibility = 'public' OR p.user_id = $1
                OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = $1 AND deleted_at IS NULL))
           AND ($2::timestamptz IS NULL OR p.created_at < $2)
           ORDER BY p.created_at DESC
           LIMIT $3`,
          [ctx.user.userId, input.cursor, input.limit + 1]
        );

        const hasMore = posts.length > input.limit;
        const items = hasMore ? posts.slice(0, -1) : posts;

        return {
          items: items.map((post) => ({
            ...post,
            mediaUrls: JSON.parse(post.media_urls) as unknown[],
          })),
          nextCursor: hasMore ? items[items.length - 1].created_at.toISOString() : null,
        };
      }),

    get: publicProcedure.input(z.object({ postId: z.string().uuid() })).query(async ({ input }) => {
      const post = await queryOne<{
        id: string;
        content: string;
        media_urls: string;
        likes_count: number;
        comments_count: number;
        created_at: Date;
        username: string;
        display_name: string;
        avatar_url: string | null;
      }>(
        `SELECT p.id, p.content, p.media_urls, p.likes_count, p.comments_count, p.created_at,
                u.username, u.display_name, u.avatar_url
         FROM posts p
         JOIN users u ON p.user_id = u.id
         WHERE p.id = $1 AND p.deleted_at IS NULL`,
        [input.postId]
      );

      if (!post) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' });
      }

      return {
        ...post,
        mediaUrls: JSON.parse(post.media_urls) as unknown[],
      };
    }),

    like: protectedProcedure
      .input(z.object({ postId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        await query(
          `INSERT INTO likes (user_id, post_id, created_at) VALUES ($1, $2, NOW())
           ON CONFLICT (user_id, post_id) DO NOTHING`,
          [ctx.user.userId, input.postId]
        );

        await query('UPDATE posts SET likes_count = likes_count + 1 WHERE id = $1', [
          input.postId,
        ]);

        return { success: true };
      }),

    unlike: protectedProcedure
      .input(z.object({ postId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        await query(
          'DELETE FROM likes WHERE user_id = $1 AND post_id = $2',
          [ctx.user.userId, input.postId]
        );

        await query('UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1', [
          input.postId,
        ]);

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ postId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const post = await queryOne<{ user_id: string }>(
          'SELECT user_id FROM posts WHERE id = $1',
          [input.postId]
        );

        if (!post || post.user_id !== ctx.user.userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Cannot delete this post',
          });
        }

        await query('UPDATE posts SET deleted_at = NOW() WHERE id = $1', [input.postId]);
        await query('UPDATE users SET posts_count = GREATEST(0, posts_count - 1) WHERE id = $1', [
          ctx.user.userId,
        ]);

        return { success: true };
      }),
  }),

  users: t.router({
    profile: publicProcedure
      .input(z.object({ username: z.string() }))
      .query(async ({ input }) => {
        const user = await queryOne<{
          id: string;
          username: string;
          display_name: string;
          bio: string;
          avatar_url: string | null;
          banner_url: string | null;
          followers_count: number;
          following_count: number;
          posts_count: number;
          is_verified: boolean;
          created_at: Date;
        }>(
          `SELECT id, username, display_name, bio, avatar_url, banner_url,
                  followers_count, following_count, posts_count, is_verified, created_at
           FROM users WHERE username = $1 AND deleted_at IS NULL`,
          [input.username]
        );

        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }

        return user;
      }),

    me: protectedProcedure.query(async ({ ctx }) => {
      const user = await queryOne<{
        id: string;
        username: string;
        email: string;
        display_name: string;
        bio: string;
        avatar_url: string | null;
        banner_url: string | null;
        followers_count: number;
        following_count: number;
        posts_count: number;
      }>(
        `SELECT id, username, email, display_name, bio, avatar_url, banner_url,
                followers_count, following_count, posts_count
         FROM users WHERE id = $1 AND deleted_at IS NULL`,
        [ctx.user.userId]
      );

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      return user;
    }),

    update: protectedProcedure
      .input(
        z.object({
          displayName: z.string().optional(),
          bio: z.string().max(500).optional(),
          avatarUrl: z.string().url().optional(),
          bannerUrl: z.string().url().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await query(
          `UPDATE users SET 
            display_name = COALESCE($2, display_name),
            bio = COALESCE($3, bio),
            avatar_url = COALESCE($4, avatar_url),
            banner_url = COALESCE($5, banner_url),
            updated_at = NOW()
           WHERE id = $1`,
          [ctx.user.userId, input.displayName, input.bio, input.avatarUrl, input.bannerUrl]
        );

        return { success: true };
      }),

    follow: protectedProcedure
      .input(z.object({ userId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.userId === input.userId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot follow yourself',
          });
        }

        await query(
          `INSERT INTO follows (follower_id, following_id, created_at) VALUES ($1, $2, NOW())
           ON CONFLICT (follower_id, following_id) DO NOTHING`,
          [ctx.user.userId, input.userId]
        );

        await query('UPDATE users SET following_count = following_count + 1 WHERE id = $1', [
          ctx.user.userId,
        ]);

        await query('UPDATE users SET followers_count = followers_count + 1 WHERE id = $1', [
          input.userId,
        ]);

        return { success: true };
      }),

    unfollow: protectedProcedure
      .input(z.object({ userId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        await query(
          'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
          [ctx.user.userId, input.userId]
        );

        await query('UPDATE users SET following_count = GREATEST(0, following_count - 1) WHERE id = $1', [
          ctx.user.userId,
        ]);

        await query('UPDATE users SET followers_count = GREATEST(0, followers_count - 1) WHERE id = $1', [
          input.userId,
        ]);

        return { success: true };
      }),

    isFollowing: protectedProcedure
      .input(z.object({ userId: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const follow = await queryOne<{ follower_id: string }>(
          'SELECT follower_id FROM follows WHERE follower_id = $1 AND following_id = $2 AND deleted_at IS NULL',
          [ctx.user.userId, input.userId]
        );

        return { isFollowing: !!follow };
      }),

    followers: publicProcedure
      .input(z.object({ username: z.string(), limit: z.number().min(1).max(50).default(20) }))
      .query(async ({ input }) => {
        const followers = await query<{
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
        }>(
          `SELECT u.id, u.username, u.display_name, u.avatar_url
           FROM users u
           JOIN follows f ON u.id = f.follower_id
           JOIN users target ON target.id = f.following_id
           WHERE target.username = $1 AND f.deleted_at IS NULL
           LIMIT $2`,
          [input.username, input.limit]
        );

        return { followers };
      }),

    following: publicProcedure
      .input(z.object({ username: z.string(), limit: z.number().min(1).max(50).default(20) }))
      .query(async ({ input }) => {
        const following = await query<{
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
        }>(
          `SELECT u.id, u.username, u.display_name, u.avatar_url
           FROM users u
           JOIN follows f ON u.id = f.following_id
           JOIN users follower ON follower.id = f.follower_id
           WHERE follower.username = $1 AND f.deleted_at IS NULL
           LIMIT $2`,
          [input.username, input.limit]
        );

        return { following };
      }),
  }),

  search: t.router({
    users: publicProcedure
      .input(z.object({ query: z.string().min(1).max(100), limit: z.number().min(1).max(50).default(20) }))
      .query(async ({ input }) => {
        const users = await query<{
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
        }>(
          `SELECT id, username, display_name, avatar_url
           FROM users
           WHERE deleted_at IS NULL 
           AND (username ILIKE $1 OR display_name ILIKE $1)
           LIMIT $2`,
          [`%${input.query}%`, input.limit]
        );

        return { users };
      }),

    posts: publicProcedure
      .input(z.object({ query: z.string().min(1).max(100), limit: z.number().min(1).max(50).default(20) }))
      .query(async ({ input }) => {
        const posts = await query<{
          id: string;
          content: string;
          username: string;
          created_at: Date;
        }>(
          `SELECT p.id, p.content, u.username, p.created_at
           FROM posts p
           JOIN users u ON p.user_id = u.id
           WHERE p.deleted_at IS NULL 
           AND p.visibility = 'public'
           AND p.content ILIKE $1
           LIMIT $2`,
          [`%${input.query}%`, input.limit]
        );

        return { posts };
      }),
  }),
});

export type AppRouter = typeof appRouter;
