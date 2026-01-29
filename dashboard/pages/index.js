import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import DashboardView from '../components/DashboardView';
import IframeView from '../components/Tools/IframeView';
import Settings from '../components/Settings';
import WorkerMissionControl from '../components/WorkerMissionControl';
import WorkflowBuilder from '../components/WorkflowBuilder';
import MarkdownViewer from '../components/Docs/MarkdownViewer';

export default function Home() {
  const [activeRoomId, setActiveRoomId] = useState('overview');
  const [services, setServices] = useState([]);
  const [dockerStatus, setDockerStatus] = useState('Checking...');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isAutoWorkActive, setIsAutoWorkActive] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [docContent, setDocContent] = useState(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/services');
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
        setDockerStatus('Healthy');
        setIsDemoMode(false);
      } else {
        throw new Error('API failed');
      }
    } catch (e) {
      console.warn('Docker Bridge unavailable:', e);
      setDockerStatus('Offline');
      setServices([]); 
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeRoomId === 'docs') {
      setIsLoadingDoc(true);
      fetch('/api/docs/content?file=AGENTS.md')
        .then(res => res.json())
        .then(data => {
          setDocContent(data.content);
          setIsLoadingDoc(false);
        })
        .catch(err => {
          console.error(err);
          setIsLoadingDoc(false);
        });
    }
  }, [activeRoomId]);

  if (!mounted) return null;

  const renderContent = () => {
    if (activeRoomId === 'overview') return <DashboardView services={services} isDemoMode={isDemoMode} dockerStatus={dockerStatus} />;
    if (activeRoomId === 'settings') return <Settings />;
    if (activeRoomId === 'mission-control') return <WorkerMissionControl isAutoWorkActive={isAutoWorkActive} />;
    if (activeRoomId === 'workflow-builder') return <WorkflowBuilder />;
    if (activeRoomId === 'docs') return <MarkdownViewer content={docContent} isLoading={isLoadingDoc} />;
    
    const activeService = services.find(s => s.containerId === activeRoomId);
    if (activeService) {
      return <IframeView service={activeService} />;
    }

    return <div className="p-10 text-center text-slate-500">Unknown View</div>;
  };

  return (
    <DashboardLayout
      activeRoomId={activeRoomId}
      setActiveRoomId={setActiveRoomId}
      services={services}
      isAutoWorkActive={isAutoWorkActive}
      toggleAutoWork={() => setIsAutoWorkActive(!isAutoWorkActive)}
      dockerStatus={dockerStatus}
      isDemoMode={isDemoMode}
    >
      {renderContent()}
    </DashboardLayout>
  );
}
