'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { 
  Bell, 
  Moon, 
  Sun, 
  User, 
  Settings, 
  LogOut, 
  Wifi,
  WifiOff,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebSocket } from '@/lib/websocket';

interface TopBarProps {
  darkMode: boolean;
  onDarkModeToggle: () => void;
  sidebarCollapsed: boolean;
}

// Mock notifications - in real app these would come from API
const mockNotifications = [
  { id: '1', title: 'High error rate detected', message: 'Gemini solver showing 15% error rate', type: 'warning', time: '2 min ago' },
  { id: '2', title: 'System backup completed', message: 'Daily backup finished successfully', type: 'success', time: '1 hour ago' },
  { id: '3', title: 'New API key created', message: 'Production API key was regenerated', type: 'info', time: '3 hours ago' },
];

export default function TopBar({ darkMode, onDarkModeToggle, sidebarCollapsed }: TopBarProps) {
  const [notifications, setNotifications] = useState(mockNotifications);
  const { isConnected, latency } = useWebSocket();

  const unreadCount = notifications.length;

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-16 bg-card/80 backdrop-blur-md border-b transition-all duration-300",
        sidebarCollapsed ? "left-16" : "left-64"
      )}
    >
      <div className="flex h-full items-center justify-between px-4">
        {/* Left side - Breadcrumb/Title */}
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Dashboard</h2>
          
          {/* Connection Status */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/50 text-xs">
            {isConnected ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-500">Connected</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{latency}ms</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-red-500" />
                <span className="text-red-500">Disconnected</span>
              </>
            )}
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={onDarkModeToggle}
          >
            {darkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearNotifications}>
                    Clear all
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                    <div className="flex items-center gap-2 w-full">
                      {notification.type === 'warning' && (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                      {notification.type === 'success' && (
                        <Zap className="h-4 w-4 text-emerald-500" />
                      )}
                      {notification.type === 'info' && (
                        <Bell className="h-4 w-4 text-blue-500" />
                      )}
                      <span className="font-medium text-sm">{notification.title}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{notification.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-6">{notification.message}</p>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="/avatar.png" alt="Admin" />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    AD
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">Admin User</p>
                  <p className="text-xs text-muted-foreground">admin@sin-solver.io</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-500">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
