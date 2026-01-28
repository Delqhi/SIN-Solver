'use client';

import Link from 'next/link';
import { Home, Search, Bell, Mail, User, Settings } from 'lucide-react';
import { useAuthStore } from '@/lib/auth';

export function Navbar() {
  const { user, logout } = useAuthStore();

  return (
    <nav className="sticky top-0 z-50 bg-dark-bg/80 backdrop-blur-md border-b border-dark-border">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="text-xl font-bold text-delqhi-500">
            Delqhi
          </Link>
          
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-delqhi-400">
              <Home className="w-6 h-6" />
            </Link>
            <Link href="/search" className="hover:text-delqhi-400">
              <Search className="w-6 h-6" />
            </Link>
            <Link href="/notifications" className="hover:text-delqhi-400">
              <Bell className="w-6 h-6" />
            </Link>
            <Link href="/messages" className="hover:text-delqhi-400">
              <Mail className="w-6 h-6" />
            </Link>
            
            {user ? (
              <>
                <Link href={`/${user.username}`} className="hover:text-delqhi-400">
                  <User className="w-6 h-6" />
                </Link>
                <button onClick={logout} className="btn btn-outline text-sm">
                  Logout
                </button>
              </>
            ) : (
              <Link href="/login" className="btn btn-primary text-sm">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
