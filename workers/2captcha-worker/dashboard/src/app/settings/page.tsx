'use client';

import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { useWebSocket } from '@/lib/websocket-client';

interface WorkerConfig {
  workerId: string;
  apiKey: string;
  minAccuracy: number;
  emergencyStopAccuracy: number;
  maxConcurrent: number;
  autoStart: boolean;
  notifications: boolean;
}

const defaultConfig: WorkerConfig = {
  workerId: 'worker-001',
  apiKey: 'sk-***...***',
  minAccuracy: 95,
  emergencyStopAccuracy: 90,
  maxConcurrent: 5,
  autoStart: true,
  notifications: true,
};

export default function SettingsPage() {
  const { connected } = useWebSocket();
  const [config, setConfig] = useState<WorkerConfig>(defaultConfig);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // In a real app, this would save to the backend
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleChange = (key: keyof WorkerConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation connected={connected} />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Worker Settings</h1>
          <p className="text-gray-600 mt-1">
            Configure your 2Captcha worker behavior and thresholds
          </p>
        </div>

        {/* General Settings */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">General</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Worker ID
              </label>
              <input
                type="text"
                value={config.workerId}
                onChange={(e) => handleChange('workerId', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => handleChange('apiKey', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your 2Captcha API key for authentication
              </p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoStart"
                checked={config.autoStart}
                onChange={(e) => handleChange('autoStart', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="autoStart" className="ml-2 block text-sm text-gray-900">
                Auto-start worker on system boot
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="notifications"
                checked={config.notifications}
                onChange={(e) => handleChange('notifications', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="notifications" className="ml-2 block text-sm text-gray-900">
                Enable browser notifications for alerts
              </label>
            </div>
          </div>
        </div>

        {/* Performance Settings */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Performance</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Concurrent Tasks
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={config.maxConcurrent}
                onChange={(e) => handleChange('maxConcurrent', parseInt(e.target.value))}
                className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum number of CAPTCHAs to solve simultaneously
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Warning Accuracy Threshold (%)
              </label>
              <input
                type="number"
                min={80}
                max={99}
                value={config.minAccuracy}
                onChange={(e) => handleChange('minAccuracy', parseInt(e.target.value))}
                className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Show warning when accuracy drops below this value
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emergency Stop Threshold (%)
              </label>
              <input
                type="number"
                min={70}
                max={95}
                value={config.emergencyStopAccuracy}
                onChange={(e) => handleChange('emergencyStopAccuracy', parseInt(e.target.value))}
                className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Automatically stop worker when accuracy drops below this value
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div>
            {saved && (
              <span className="text-green-600 text-sm font-medium">
                ✓ Settings saved successfully
              </span>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setConfig(defaultConfig)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Reset to Defaults
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-12 bg-red-50 rounded-lg border border-red-200 p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Danger Zone</h2>
          <p className="text-sm text-red-700 mb-4">
            These actions cannot be undone. Be careful!
          </p>
          
          <div className="flex gap-3">
            <button className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors">
              Clear All Data
            </button>
            <button className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors">
              Reset API Key
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
