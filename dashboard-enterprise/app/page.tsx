'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import KPICards from '@/components/KPICards';
import SolveRateChart from '@/components/SolveRateChart';
import CaptchaTypeDistribution from '@/components/CaptchaTypeDistribution';
import ModelPerformance from '@/components/ModelPerformance';
import RecentSolves from '@/components/RecentSolves';
import SystemHealth from '@/components/SystemHealth';

export default function DashboardPage() {
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Initialize dark mode on mount
  useEffect(() => {
    // Check localStorage or system preference
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      setDarkMode(savedMode === 'true');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  // Apply dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);
  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      {/* Top Bar */}
      <TopBar 
        darkMode={darkMode} 
        onDarkModeToggle={toggleDarkMode}
        sidebarCollapsed={sidebarCollapsed}
      />

      {/* Main Content */}
      <main
        className={cn(
          "pt-16 transition-all duration-300 min-h-screen",
          sidebarCollapsed ? "pl-16" : "pl-64"
        )}
      >
        <div className="p-6 space-y-6">
          {/* Page Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Real-time monitoring and analytics for your CAPTCHA solving infrastructure
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live Updates
              </span>
              <span>•</span>
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          {/* KPI Cards */}
          <KPICards />

          {/* Main Charts Section */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Solve Rate Chart - Takes 2 columns */}
            <div className="lg:col-span-2">
              <SolveRateChart />
            </div>

            {/* Captcha Type Distribution */}
            <CaptchaTypeDistribution />
          </div>

          {/* Secondary Section */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Model Performance - Takes 2 columns */}
            <div className="lg:col-span-2">
              <ModelPerformance />
            </div>

            {/* Recent Solves & System Health */}
            <div className="space-y-6">
              <RecentSolves />
              <SystemHealth />
            </div>
          </div>

          {/* Footer */}
          <footer className="pt-8 border-t">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
              <p>© 2026 SIN-Solver Enterprise. All rights reserved.</p>
              <div className="flex items-center gap-4">
                <a href="#" className="hover:text-foreground transition-colors">Documentation</a>
                <a href="#" className="hover:text-foreground transition-colors">API Reference</a>
                <a href="#" className="hover:text-foreground transition-colors">Support</a>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
