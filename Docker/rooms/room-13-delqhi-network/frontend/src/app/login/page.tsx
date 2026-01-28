'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/lib/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { setAuth } = useAuthStore();
  
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      router.push('/');
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <h1 className="text-3xl font-bold text-center mb-8">Login to Delqhi</h1>
      
      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-400">
            {error}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input w-full"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input w-full"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="btn btn-primary w-full"
        >
          {loginMutation.isPending ? 'Logging in...' : 'Login'}
        </button>
        
        <p className="text-center text-dark-muted">
          Don't have an account?{' '}
          <Link href="/register" className="text-delqhi-400 hover:underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
