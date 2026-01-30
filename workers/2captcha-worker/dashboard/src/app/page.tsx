'use client';

import { useWebSocket } from '@/lib/websocket-client';
import { Navigation } from '@/components/Navigation';
import { StatCard } from '@/components/StatCard';
import { AlertBanner } from '@/components/AlertBanner';
import { AccuracyChart } from '@/components/AccuracyChart';
import { SubmissionTable } from '@/components/SubmissionTable';
import { formatCurrency } from '@/lib/utils';
import { useMemo } from 'react';

export default function OverviewPage() {
  const { stats, alerts, connected, acknowledgeAlert } = useWebSocket();

  const chartData = useMemo(() => {
    if (!stats?.recentSubmissions) return [];
    
    // Generate chart data from recent submissions
    const data: { time: string; accuracy: number }[] = [];
    let successCount = 0;
    let totalCount = 0;
    
    // Process in chunks of 5 submissions
    const submissions = [...stats.recentSubmissions].reverse();
    
    submissions.forEach((sub, index) => {
      totalCount++;
      if (sub.result === 'success') successCount++;
      
      // Add data point every 5 submissions or at the end
      if (index % 5 === 0 || index === submissions.length - 1) {
        const date = new Date(sub.timestamp);
        data.push({
          time: date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }),
          accuracy: totalCount > 0 ? (successCount / totalCount) * 100 : 100,
        });
      }
    });
    
    return data.slice(-20); // Keep last 20 data points
  }, [stats?.recentSubmissions]);

  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);
  const showEmergencyStop = stats && stats.accuracy < 90;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation connected={connected} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Emergency Stop Banner */}
        {showEmergencyStop && (
          <div className="mb-6 p-4 bg-red-600 text-white rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🛑</span>
                <div>
                  <h2 className="text-lg font-bold">EMERGENCY STOP ACTIVATED</h2>
                  <p className="text-red-100">
                    Accuracy dropped to {stats?.accuracy.toFixed(1)}%. Worker has been stopped.
                  </p>
                </div>
              </div>
              <button className="px-4 py-2 bg-white text-red-600 font-medium rounded-md hover:bg-red-50 transition-colors">
                Resume Worker
              </button>
            </div>
          </div>
        )}

        {/* Alerts */}
        {unacknowledgedAlerts.length > 0 && (
          <div className="mb-6 space-y-3">
            {unacknowledgedAlerts.map(alert => (
              <AlertBanner 
                key={alert.id} 
                alert={alert} 
                onAcknowledge={acknowledgeAlert}
              />
            ))}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Current Accuracy"
            value={stats ? `${stats.accuracy.toFixed(1)}%` : '--'}
            subtitle="Last 24 hours"
            trend={stats && stats.accuracy >= 95 ? 'up' : stats && stats.accuracy >= 90 ? 'neutral' : 'down'}
            trendValue={stats ? `${stats.accuracy >= 95 ? 'Good' : stats.accuracy >= 90 ? 'Warning' : 'Critical'}` : ''}
            alert={stats ? stats.accuracy < 95 : false}
            icon={
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          
          <StatCard
            title="CAPTCHAs Solved Today"
            value={stats?.captchasSolvedToday ?? '--'}
            subtitle="Total submissions"
            icon={
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
          />
          
          <StatCard
            title="Earnings Estimate"
            value={stats ? formatCurrency(stats.earningsEstimate) : '--'}
            subtitle="Today's estimated earnings"
            trend="up"
            trendValue="+$0.00/hr"
            icon={
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          
          <StatCard
            title="Success Rate"
            value={stats ? `${stats.successRate.toFixed(1)}%` : '--'}
            subtitle="Overall success rate"
            icon={
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
        </div>

        {/* Chart and Table */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <AccuracyChart data={chartData} />
          <SubmissionTable submissions={stats?.recentSubmissions ?? []} maxRows={8} />
        </div>

        {/* Connection Status */}
        {!connected && (
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-medium text-yellow-800">Connection Lost</h3>
                <p className="text-sm text-yellow-700">
                  Attempting to reconnect to worker... Data may be outdated.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
