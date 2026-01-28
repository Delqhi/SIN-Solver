'use client';

import { useState } from 'react';
import { Image, Video, Smile } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/lib/auth';

export function CreatePost() {
  const [content, setContent] = useState('');
  const { user } = useAuthStore();
  const utils = trpc.useUtils();
  
  const createMutation = trpc.posts.create.useMutation({
    onSuccess: () => {
      setContent('');
      utils.posts.timeline.invalidate();
    },
  });

  if (!user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    createMutation.mutate({ content });
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-full bg-delqhi-700 flex items-center justify-center">
          <span className="text-lg font-bold">{user.username[0].toUpperCase()}</span>
        </div>
        
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's happening?"
            className="w-full bg-transparent resize-none outline-none text-xl min-h-[100px]"
            maxLength={10000}
          />
          
          <div className="flex items-center justify-between border-t border-dark-border pt-3 mt-3">
            <div className="flex gap-2 text-delqhi-400">
              <button type="button" className="p-2 hover:bg-delqhi-500/20 rounded-full">
                <Image className="w-5 h-5" />
              </button>
              <button type="button" className="p-2 hover:bg-delqhi-500/20 rounded-full">
                <Video className="w-5 h-5" />
              </button>
              <button type="button" className="p-2 hover:bg-delqhi-500/20 rounded-full">
                <Smile className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-dark-muted text-sm">{content.length}/10000</span>
              <button
                type="submit"
                disabled={!content.trim() || createMutation.isPending}
                className="btn btn-primary disabled:opacity-50"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
