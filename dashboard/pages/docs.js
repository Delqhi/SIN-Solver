'use client'

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import DocsSidebar from '../components/Docs/DocsSidebar';
import MarkdownViewer from '../components/Docs/MarkdownViewer';
import { motion, AnimatePresence } from 'framer-motion';

export default function DocumentationPage() {
  const [activeDoc, setActiveDoc] = useState('AGENTS.md');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [dockerStatus, setDockerStatus] = useState('Checking...');
  const [isAutoWorkActive, setIsAutoWorkActive] = useState(false);

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services');
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
        setDockerStatus('Healthy');
      }
    } catch (e) {
      console.warn('Docker Bridge unavailable');
      setDockerStatus('Offline');
    }
  };

  const fetchDocContent = async (file) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/docs/content?file=${file}`);
      if (res.ok) {
        const data = await res.json();
        setContent(data.content);
      } else {
        setContent(`# Error\nFailed to load ${file}`);
      }
    } catch (e) {
      setContent(`# Error\nAn unexpected error occurred while loading ${file}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
    fetchDocContent(activeDoc);
    const interval = setInterval(fetchServices, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchDocContent(activeDoc);
  }, [activeDoc]);

  return (
    <DashboardLayout
      activeRoomId="docs"
      setActiveRoomId={(id) => {
        if (id !== 'docs') window.location.href = `/?view=${id}`;
      }}
      services={services}
      isAutoWorkActive={isAutoWorkActive}
      toggleAutoWork={() => setIsAutoWorkActive(!isAutoWorkActive)}
      dockerStatus={dockerStatus}
    >
      <div className="flex h-full overflow-hidden bg-black/20 backdrop-blur-sm p-6 gap-6">
        <DocsSidebar activeDoc={activeDoc} onSelect={setActiveDoc} />
        
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeDoc}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <MarkdownViewer content={content} isLoading={isLoading} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
}
