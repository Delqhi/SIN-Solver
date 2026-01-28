'use client';

import { Heart, MessageCircle, Repeat2, Share, Bookmark } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';

interface PostProps {
  post: {
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
  };
}

export function Post({ post }: PostProps) {
  const utils = trpc.useUtils();
  const likeMutation = trpc.posts.like.useMutation({
    onSuccess: () => utils.posts.timeline.invalidate(),
  });

  return (
    <article className="card hover:bg-dark-card/80 transition-colors">
      <div className="flex gap-3">
        <Link href={`/${post.username}`}>
          <div className="w-12 h-12 rounded-full bg-delqhi-700 flex items-center justify-center">
            {post.avatar_url ? (
              <img src={post.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-lg font-bold">{post.username[0].toUpperCase()}</span>
            )}
          </div>
        </Link>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link href={`/${post.username}`} className="font-bold hover:underline">
              {post.display_name || post.username}
            </Link>
            <Link href={`/${post.username}`} className="text-dark-muted">
              @{post.username}
            </Link>
            <span className="text-dark-muted">·</span>
            <time className="text-dark-muted text-sm">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </time>
          </div>
          
          <p className="mt-1 whitespace-pre-wrap break-words">{post.content}</p>
          
          {Array.isArray(post.mediaUrls) && post.mediaUrls.length > 0 && (
            <div className="mt-3 rounded-xl overflow-hidden">
              {post.mediaUrls.map((media, i) => {
                const m = media as { type: string; url: string };
                return <img key={i} src={m.url} alt="" className="w-full" />;
              })}
            </div>
          )}
          
          <div className="flex items-center justify-between mt-3 max-w-md text-dark-muted">
            <button className="flex items-center gap-1 hover:text-delqhi-400 group">
              <MessageCircle className="w-5 h-5" />
              <span>{post.comments_count}</span>
            </button>
            <button className="flex items-center gap-1 hover:text-green-400 group">
              <Repeat2 className="w-5 h-5" />
            </button>
            <button 
              onClick={() => likeMutation.mutate({ postId: post.id })}
              className="flex items-center gap-1 hover:text-red-400 group"
            >
              <Heart className="w-5 h-5" />
              <span>{post.likes_count}</span>
            </button>
            <button className="flex items-center gap-1 hover:text-delqhi-400">
              <Bookmark className="w-5 h-5" />
            </button>
            <button className="flex items-center gap-1 hover:text-delqhi-400">
              <Share className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
