'use client';

import { trpc } from '@/lib/trpc';
import { Post } from '@/components/Post';
import { useParams } from 'next/navigation';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { data: profile, isLoading } = trpc.users.profile.useQuery({ username });

  if (isLoading) return <div className="animate-pulse">Loading profile...</div>;
  if (!profile) return <div>User not found</div>;

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-end gap-4">
          <div className="w-24 h-24 rounded-full bg-delqhi-700 border-4 border-dark-bg -mt-12 flex items-center justify-center text-3xl font-bold">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              profile.username[0].toUpperCase()
            )}
          </div>
          <div className="flex-1 pb-2">
            <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
            <p className="text-dark-muted">@{profile.username}</p>
          </div>
          <button className="btn btn-outline mb-2">Follow</button>
        </div>
        <p className="mt-4">{profile.bio}</p>
        <div className="flex gap-4 mt-4 text-sm">
          <span className="text-dark-muted"><strong className="text-dark-text">{profile.following_count}</strong> Following</span>
          <span className="text-dark-muted"><strong className="text-dark-text">{profile.followers_count}</strong> Followers</span>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold border-b border-dark-border pb-2">Posts</h2>
        {/* This would ideally be a user-specific timeline component */}
        <p className="text-dark-muted text-center py-8">User posts will appear here</p>
      </div>
    </div>
  );
}
