'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  
  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      router.push('/login');
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    registerMutation.mutate({ email, username, password });
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <h1 className="text-3xl font-bold text-center mb-8">Join Delqhi</h1>
      
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
          <label className="block text-sm font-medium mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
          disabled={registerMutation.isPending}
          className="btn btn-primary w-full"
        >
          {registerMutation.isPending ? 'Creating account...' : 'Register'}
        </button>
        
        <p className="text-center text-dark-muted">
          Already have an account?{' '}
          <Link href="/login" className="text-delqhi-400 hover:underline">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
