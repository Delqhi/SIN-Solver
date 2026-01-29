'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  Activity,
  Settings,
  Users,
  BarChart3,
  FileText,
  Bell,
  Shield,
  ChevronLeft,
  ChevronRight,
  Zap,
  Webhook,
  Terminal,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Analytics', href: '/analytics', icon: <BarChart3 className="h-5 w-5" /> },
  { label: 'Activity Log', href: '/activity', icon: <Activity className="h-5 w-5" /> },
  { label: 'Models', href: '/models', icon: <Zap className="h-5 w-5" /> },
];

const adminNavItems: NavItem[] = [
  { label: 'Users', href: '/users', icon: <Users className="h-5 w-5" /> },
  { label: 'API Keys', href: '/api-keys', icon: <Webhook className="h-5 w-5" /> },
  { label: 'Security', href: '/security', icon: <Shield className="h-5 w-5" /> },
  { label: 'Logs', href: '/logs', icon: <Terminal className="h-5 w-5" /> },
  { label: 'Settings', href: '/settings', icon: <Settings className="h-5 w-5" /> },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

    const content = (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
          "hover:bg-accent group",
          isActive 
            ? "bg-accent/80 text-accent-foreground font-medium" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <span className={cn(
          "transition-colors",
          isActive ? "text-blue-500" : "group-hover:text-foreground"
        )}>
          {item.icon}
        </span>
        {!collapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="bg-blue-500/10 text-blue-500 text-xs px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.label}
            {item.badge && (
              <span className="bg-blue-500/10 text-blue-500 text-xs px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-card border-r transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">SIN-Solver</h1>
                <p className="text-xs text-muted-foreground">Enterprise</p>
              </div>
            </Link>
          )}
          {collapsed && (
            <div className="mx-auto h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-[60px] h-6 w-6 rounded-full border bg-background shadow-sm"
          onClick={onToggle}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>

        {/* Navigation */}
        <div className="flex flex-col h-[calc(100vh-4rem)] overflow-y-auto py-4 px-2">
          {/* Main Nav */}
          <nav className="space-y-1">
            {mainNavItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>

          <Separator className="my-4" />

          {/* Admin Nav */}
          {!collapsed && (
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Administration
            </p>
          )}
          <nav className="space-y-1">
            {adminNavItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>

          {/* Footer */}
          <div className="mt-auto pt-4">
            <Separator className="mb-4" />
            {!collapsed && (
              <div className="px-3 py-2 rounded-lg bg-accent/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>System Online</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  v1.0.0 • API v2
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
