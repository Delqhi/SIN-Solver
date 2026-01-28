'use client';

import { trpc } from '@/lib/trpc';
import { Post } from './Post';

export function Timeline() {
  const { data, isLoading, fetchNextPage, hasNextPage } = trpc.posts.timeline.useInfiniteQuery(
    { limit: 20 },
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded-full bg-dark-border" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-dark-border rounded w-1/4" />
                <div className="h-4 bg-dark-border rounded w-3/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const posts = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Post key={post.id} post={post} />
      ))}
      
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          className="w-full py-3 text-delqhi-400 hover:bg-dark-card rounded-xl"
        >
          Load more
        </button>
      )}
    </div>
  );
}
