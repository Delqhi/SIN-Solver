/**
 * Chat Demo Page
 * Demonstrates the ChatSidebar integration with mock data
 * Shows autonomous workflow correction flow
 */

'use client'

import React, { useState } from 'react';
import Head from 'next/head';
import { 
  LayoutDashboard, 
  Workflow, 
  Settings, 
  Bell,
  Search,
  Menu,
  X,
  Zap,
  Activity,
  Server
} from 'lucide-react';
import ChatSidebar from '../components/Chat/ChatSidebar';

// Mock dashboard data
const MOCK_WORKFLOWS = [
  { id: 1, name: 'Daten-Import', status: 'running', progress: 78, lastRun: '2m ago' },
  { id: 2, name: 'Email-Verarbeitung', status: 'warning', progress: 45, lastRun: '5m ago' },
  { id: 3, name: 'API-Sync', status: 'error', progress: 0, lastRun: '12m ago' },
  { id: 4, name: 'Report-Generator', status: 'idle', progress: 0, lastRun: '1h ago' },
];

const MOCK_STATS = [
  { label: 'Active Workflows', value: '12', change: '+2', trend: 'up' },
  { label: 'Success Rate', value: '94.2%', change: '+1.5%', trend: 'up' },
  { label: 'Avg Duration', value: '4m 32s', change: '-12s', trend: 'down' },
  { label: 'Errors Today', value: '3', change: '-5', trend: 'down' },
];

export default function ChatDemoPage() {
  const [chatOpen, setChatOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <>
      <Head>
        <title>Chat Demo | SIN-Solver Dashboard</title>
        <meta name="description" content="AI Chat Integration Demo" />
      </Head>

      <div className="min-h-screen bg-black text-white flex">
        {/* Main Sidebar */}
        <aside 
          className={`
            fixed inset-y-0 left-0 z-30
            w-64 bg-slate-950 border-r border-white/10
            transform transition-transform duration-300
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">SIN-Solver</h1>
                <p className="text-xs text-slate-500">Dashboard</p>
              </div>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            {[
              { icon: LayoutDashboard, label: 'Dashboard', active: true },
              { icon: Workflow, label: 'Workflows', active: false },
              { icon: Activity, label: 'Monitoring', active: false },
              { icon: Server, label: 'Agents', active: false },
              { icon: Settings, label: 'Settings', active: false },
            ].map((item) => (
              <button
                key={item.label}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm
                  transition-all duration-200
                  ${item.active 
                    ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className={`
          flex-1 transition-all duration-300
          ${sidebarOpen ? 'ml-64' : 'ml-0'}
          ${chatOpen ? 'mr-0 md:mr-[360px]' : 'mr-0'}
        `}>
          {/* Header */}
          <header className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Suchen..."
                    className="w-64 bg-slate-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setChatOpen(!chatOpen)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                    transition-all duration-200
                    ${chatOpen 
                      ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' 
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }
                  `}
                >
                  <Zap className="w-4 h-4" />
                  AI Chat
                </button>

                <button className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </button>
              </div>
            </div>
          </header>

          {/* Dashboard Content */}
          <div className="p-6 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {MOCK_STATS.map((stat) => (
                <div 
                  key={stat.label}
                  className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-5 hover:bg-slate-800/50 transition-all duration-300"
                >
                  <p className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-2">{stat.label}</p>
                  <div className="flex items-end justify-between">
                    <span className="text-2xl font-bold text-white">{stat.value}</span>
                    <span className={`text-xs font-medium ${stat.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Workflows Section */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Aktive Workflows</h2>
                <button className="text-xs text-orange-400 hover:text-orange-300 font-medium">Alle anzeigen →</button>
              </div>

              <div className="divide-y divide-white/5">
                {MOCK_WORKFLOWS.map((workflow) => (
                  <div 
                    key={workflow.id}
                    className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`
                        w-3 h-3 rounded-full
                        ${workflow.status === 'running' ? 'bg-emerald-500 animate-pulse' : ''}
                        ${workflow.status === 'warning' ? 'bg-amber-500' : ''}
                        ${workflow.status === 'error' ? 'bg-red-500' : ''}
                        ${workflow.status === 'idle' ? 'bg-slate-600' : ''}
                      `} />
                      <div>
                        <p className="font-medium text-slate-200">{workflow.name}</p>
                        <p className="text-xs text-slate-500">Letzte Ausführung: {workflow.lastRun}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {workflow.status === 'running' && (
                        <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                            style={{ width: `${workflow.progress}%` }}
                          />
                        </div>
                      )}
                      <span className={`
                        text-xs font-medium px-2 py-1 rounded-lg
                        ${workflow.status === 'running' ? 'bg-emerald-500/10 text-emerald-400' : ''}
                        ${workflow.status === 'warning' ? 'bg-amber-500/10 text-amber-400' : ''}
                        ${workflow.status === 'error' ? 'bg-red-500/10 text-red-400' : ''}
                        ${workflow.status === 'idle' ? 'bg-slate-700/50 text-slate-400' : ''}
                      `}>
                        {workflow.status === 'running' && 'Running'}
                        {workflow.status === 'warning' && 'Warning'}
                        {workflow.status === 'error' && 'Error'}
                        {workflow.status === 'idle' && 'Idle'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-3xl p-6">
                <h3 className="text-lg font-semibold text-orange-400 mb-2">AI-Assistent</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Der integrierte AI-Chat kann Workflows überwachen, Fehler erkennen und autonom korrigieren.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setChatOpen(true)}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-xl text-sm font-medium transition-all"
                  >
                    Chat öffnen
                  </button>
                </div>
              </div>

              <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Autonome Korrektur</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Wenn ein Workflow-Fehler erkannt wird, wird automatisch eine Korrektur vorgeschlagen.
                </p>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  System aktiv
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Chat Sidebar */}
        <ChatSidebar 
          isOpen={chatOpen} 
          onToggle={setChatOpen}
        />
      </div>
    </>
  );
}
