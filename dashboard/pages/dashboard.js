import { useEffect, useState } from 'react';
import Head from 'next/head';
import LogViewer from '../components/Terminal/LogViewer';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [services, setServices] = useState([]);
  const [telemetry, setTelemetry] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timestamp, setTimestamp] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);

  const fetchDashboardData = async () => {
    setRefreshing(true);
    try {
      const docsResponse = await fetch('/api/docs');
      const docsData = await docsResponse.json();
      setStats(docsData);

      const servicesResponse = await fetch('/api/services');
      const servicesData = await servicesResponse.json();
      setServices(servicesData.services);

      const telemetryResponse = await fetch('/api/docker/stats');
      if (telemetryResponse.ok) {
        const telemetryData = await telemetryResponse.json();
        const telMap = {};
        telemetryData.forEach(t => {
          telMap[t.id] = t;
        });
        setTelemetry(telMap);
      }

      setTimestamp(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleControl = async (containerId, action) => {
    try {
      const response = await fetch('/api/docker/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerId, action })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${action} container`);
      }
      
      fetchDashboardData();
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <>
        <Head>
          <title>SIN-Solver Cockpit Dashboard | Loading</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin mb-4">
              <div className="text-4xl">⏳</div>
            </div>
            <p className="text-xl">Loading Dashboard...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Head>
          <title>SIN-Solver Cockpit Dashboard | Error</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-8">⚠️ Dashboard Error</h1>
            <div className="bg-red-900 p-6 rounded-lg">
              <p className="text-lg">Error: {error}</p>
              <p className="text-sm text-red-300 mt-2">Please check the console for details.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const healthyServices = services.filter(s => s.status === 'healthy').length;
  const totalServices = services.length;
  const healthPercentage = totalServices > 0 ? Math.round((healthyServices / totalServices) * 100) : 0;

  return (
    <>
      <Head>
        <title>SIN-Solver Cockpit Dashboard</title>
        <meta name="description" content="Centralized control panel for the SIN-Solver AI automation ecosystem" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <header className="bg-slate-900 border-b border-slate-700 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                  <span className="text-3xl">🎮</span>
                  SIN-Solver Cockpit Dashboard
                </h1>
                <p className="text-slate-400">Centralized control panel for AI automation ecosystem</p>
              </div>
              <div className="text-right text-sm text-slate-400">
                <p>Last updated: {timestamp.toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-8">
          <section className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">System Health</h2>
              <button 
                onClick={fetchDashboardData}
                disabled={refreshing}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition border border-slate-600 ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
                {refreshing ? 'Refreshing...' : 'Refresh Status'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-slate-700 to-slate-600 p-6 rounded-lg border border-slate-500">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
                  Overall Status
                </h3>
                <div className="flex items-baseline gap-2">
                  <p className={`text-4xl font-bold ${
                    healthPercentage === 100 ? 'text-green-400' : healthPercentage > 50 ? 'text-yellow-400' : 'text-red-400'
                  }`}>{healthPercentage}%</p>
                  <p className="text-slate-400">Healthy</p>
                </div>
                <p className="text-xs text-slate-400 mt-3">
                  {healthyServices} of {totalServices} services operational
                </p>
              </div>

              <div className="bg-gradient-to-br from-slate-700 to-slate-600 p-6 rounded-lg border border-slate-500">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
                  Active Services
                </h3>
                <p className="text-4xl font-bold text-blue-400">{totalServices}</p>
                <p className="text-xs text-slate-400 mt-3">
                  Available in network
                </p>
              </div>

              <div className="bg-gradient-to-br from-slate-700 to-slate-600 p-6 rounded-lg border border-slate-500">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
                  Active Workflows
                </h3>
                <p className="text-4xl font-bold text-purple-400">12</p>
                <p className="text-xs text-slate-400 mt-3">
                  Running in n8n
                </p>
              </div>

              <div className="bg-gradient-to-br from-slate-700 to-slate-600 p-6 rounded-lg border border-slate-500">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
                  API Status
                </h3>
                <p className={`text-4xl font-bold ${healthPercentage === 100 ? 'text-green-500' : 'text-yellow-500'}`}>
                  {healthPercentage === 100 ? 'OK' : 'WARN'}
                </p>
                <p className="text-xs text-slate-400 mt-3">
                  {healthPercentage === 100 ? 'All endpoints responding' : 'Some services are down'}
                </p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Services Status</h2>
            <div className="bg-slate-700 rounded-lg overflow-hidden border border-slate-600">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-600 bg-slate-600">
                    <th className="px-6 py-4 text-left font-semibold">Service</th>
                    <th className="px-6 py-4 text-left font-semibold">Status</th>
                    <th className="px-6 py-4 text-left font-semibold">CPU / RAM</th>
                    <th className="px-6 py-4 text-left font-semibold">Port</th>
                    <th className="px-6 py-4 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service, idx) => {
                    const tel = telemetry[service.containerId] || {};
                    return (
                      <tr key={idx} className="border-b border-slate-600 hover:bg-slate-600 transition">
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-2">
                            <span className="text-xl">{service.icon}</span>
                            <div>
                              <div className="font-semibold">{service.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{service.containerId}</div>
                            </div>
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center w-fit gap-2 ${
                            service.status === 'healthy' 
                              ? 'bg-green-900/50 text-green-400 border border-green-700' 
                              : 'bg-red-900/50 text-red-400 border border-red-700'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${
                              service.status === 'healthy' ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                            }`}></span>
                            {service.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {tel.cpu ? (
                            <div className="text-xs space-y-1">
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-400">CPU:</span>
                                <span className="font-mono text-blue-400">{tel.cpu}%</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-400">RAM:</span>
                                <span className="font-mono text-purple-400">{tel.memory?.percent}%</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs italic">No telemetry</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-300 font-mono text-sm">{service.port || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {service.status === 'healthy' ? (
                              <>
                                <button 
                                  onClick={() => handleControl(service.containerId, 'stop')}
                                  className="p-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded transition border border-red-800/50"
                                  title="Stop"
                                >
                                  ⏹️
                                </button>
                                <button 
                                  onClick={() => handleControl(service.containerId, 'restart')}
                                  className="p-1.5 bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 rounded transition border border-blue-800/50"
                                  title="Restart"
                                >
                                  🔄
                                </button>
                              </>
                            ) : (
                              <button 
                                onClick={() => handleControl(service.containerId, 'start')}
                                className="p-1.5 bg-green-900/30 hover:bg-green-900/50 text-green-400 rounded transition border border-green-800/50"
                                title="Start"
                              >
                                ▶️
                              </button>
                            )}
                            <button 
                              onClick={() => setSelectedContainer({ id: service.containerId, name: service.name })}
                              className="p-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded transition border border-slate-500"
                              title="View Logs"
                            >
                              📋
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {selectedContainer && (
            <LogViewer 
              containerId={selectedContainer.id}
              containerName={selectedContainer.name}
              onClose={() => setSelectedContainer(null)}
            />
          )}

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">API Documentation</h2>
            {stats && (
              <div className="bg-slate-700 p-6 rounded-lg border border-slate-600 overflow-auto max-h-96">
                <pre className="text-xs font-mono text-slate-300">
                  {JSON.stringify(stats, null, 2)}
                </pre>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6">Quick Links</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <a
                href="http://localhost:3000"
                className="bg-slate-700 hover:bg-slate-600 p-4 rounded-lg border border-slate-600 transition"
              >
                <div className="text-2xl mb-2">🏠</div>
                <div className="font-semibold">Home</div>
                <div className="text-xs text-slate-400">Dashboard home page</div>
              </a>
              <a
                href="http://localhost:3000/docs"
                className="bg-slate-700 hover:bg-slate-600 p-4 rounded-lg border border-slate-600 transition"
              >
                <div className="text-2xl mb-2">📚</div>
                <div className="font-semibold">Docs</div>
                <div className="text-xs text-slate-400">Documentation</div>
              </a>
              <a
                href="http://localhost:5678"
                className="bg-slate-700 hover:bg-slate-600 p-4 rounded-lg border border-slate-600 transition"
              >
                <div className="text-2xl mb-2">⚙️</div>
                <div className="font-semibold">n8n</div>
                <div className="text-xs text-slate-400">Workflow orchestrator</div>
              </a>
              <a
                href="http://localhost:8041"
                className="bg-slate-700 hover:bg-slate-600 p-4 rounded-lg border border-slate-600 transition"
              >
                <div className="text-2xl mb-2">💻</div>
                <div className="font-semibold">CodeServer</div>
                <div className="text-xs text-slate-400">Code execution API</div>
              </a>
            </div>
          </section>
        </main>

        <footer className="bg-slate-900 border-t border-slate-700 p-6 mt-12">
          <div className="max-w-7xl mx-auto text-center text-slate-400">
            <p>SIN-Solver Cockpit Dashboard v1.0.0 | All systems operational</p>
          </div>
        </footer>
      </div>
    </>
  );
}
