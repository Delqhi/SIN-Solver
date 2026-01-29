import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  CheckCircle, 
  Clock, 
  Target, 
  TrendingUp,
  Loader2,
  AlertCircle,
  Shield
} from 'lucide-react';

const CAPTCHA_TYPE_COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-red-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-lime-500',
  'bg-rose-500'
];

export default function CaptchaStatsSection() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/captcha/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch captcha stats');
      }
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      setStats({
        today: {
          solved: 47,
          failed: 3,
          successRate: 94.0,
          avgTime: 1.23
        },
        total: {
          solved: 12547,
          failed: 623,
          successRate: 95.3,
          avgTime: 1.18
        },
        byType: [
          { type: 'alphanumeric', count: 5234, percentage: 41.7 },
          { type: 'math', count: 2156, percentage: 17.2 },
          { type: 'slider', count: 1876, percentage: 15.0 },
          { type: 'click', count: 1234, percentage: 9.8 },
          { type: 'h_captcha', count: 987, percentage: 7.9 },
          { type: 're_captcha', count: 543, percentage: 4.3 },
          { type: 'puzzle', count: 321, percentage: 2.6 },
          { type: 'rotate', count: 196, percentage: 1.5 }
        ],
        trends: {
          daily: [42, 38, 45, 52, 48, 55, 47],
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const StatCard = ({ icon: Icon, title, value, subtitle, color, trend }) => (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${color} bg-opacity-10`}>
            <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-green-400 text-xs font-medium">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </div>
        )}
      </div>
      {subtitle && <p className="text-xs text-slate-500 mt-3">{subtitle}</p>}
    </div>
  );

  const TypeDistributionBar = ({ type, count, percentage, index }) => (
    <div className="flex items-center gap-3">
      <div className="w-24 text-xs text-slate-400 truncate">{type}</div>
      <div className="flex-1 h-6 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${CAPTCHA_TYPE_COLORS[index % CAPTCHA_TYPE_COLORS.length]} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="w-16 text-right">
        <span className="text-xs font-medium text-white">{count}</span>
        <span className="text-xs text-slate-500 ml-1">({percentage.toFixed(1)}%)</span>
      </div>
    </div>
  );

  if (loading && !stats) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-8">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <BarChart3 className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Captcha Statistics</h3>
            <p className="text-xs text-slate-400">Real-time solving metrics and performance</p>
          </div>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300 transition-colors disabled:opacity-50"
        >
          <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700/50 rounded-xl">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>{error} - Showing demo data</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={CheckCircle}
          title="Solved Today"
          value={stats?.today?.solved?.toLocaleString() || '0'}
          subtitle={`${stats?.today?.failed || 0} failed attempts`}
          color="bg-green-500"
          trend="+12%"
        />
        <StatCard
          icon={Shield}
          title="Total Solved"
          value={stats?.total?.solved?.toLocaleString() || '0'}
          subtitle="All time captchas solved"
          color="bg-blue-500"
        />
        <StatCard
          icon={Target}
          title="Success Rate"
          value={`${stats?.today?.successRate?.toFixed(1) || '0'}%`}
          subtitle={`Avg: ${stats?.total?.successRate?.toFixed(1) || '0'}% all time`}
          color="bg-purple-500"
          trend="+2.3%"
        />
        <StatCard
          icon={Clock}
          title="Avg Solve Time"
          value={`${stats?.today?.avgTime?.toFixed(2) || '0'}s`}
          subtitle={`Total: ${stats?.total?.avgTime?.toFixed(2) || '0'}s average`}
          color="bg-orange-500"
          trend="-0.15s"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-6">
          <h4 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Captcha Types Distribution
          </h4>
          <div className="space-y-3">
            {stats?.byType?.slice(0, 8).map((item, index) => (
              <TypeDistributionBar
                key={item.type}
                type={item.type}
                count={item.count}
                percentage={item.percentage}
                index={index}
              />
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-6">
          <h4 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Weekly Trend
          </h4>
          <div className="h-48 flex items-end gap-2">
            {stats?.trends?.daily?.map((value, index) => {
              const max = Math.max(...stats.trends.daily);
              const height = (value / max) * 100;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full relative">
                    <div
                      className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-500 hover:from-blue-500 hover:to-blue-300"
                      style={{ height: `${height}%`, minHeight: '4px' }}
                    />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-slate-400 opacity-0 hover:opacity-100 transition-opacity">
                      {value}
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">{stats?.trends?.labels?.[index]}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Weekly Total</span>
              <span className="font-bold text-white">
                {stats?.trends?.daily?.reduce((a, b) => a + b, 0)?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-slate-400">Daily Average</span>
              <span className="font-bold text-blue-400">
                {Math.round(stats?.trends?.daily?.reduce((a, b) => a + b, 0) / 7)?.toLocaleString() || '0'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
