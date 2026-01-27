import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Book, Code, User, Bot } from 'lucide-react';

export default function Documentation({ initialViewMode = 'user', initialCategory = null }) {
  const [structure, setStructure] = useState(null);
  const [currentDoc, setCurrentDoc] = useState(null);
  const [selectedPath, setSelectedPath] = useState(null);
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialViewMode) setViewMode(initialViewMode);
  }, [initialViewMode]);

  useEffect(() => {
    fetch('/api/docs')
      .then(res => res.json())
      .then(data => {
        setStructure(data);
        setLoading(false);
        
        const params = new URLSearchParams(window.location.search);
        const docParam = params.get('doc');
        if (docParam) {
            handleSelectDoc(docParam);
        } else {
            if (initialCategory && data[initialCategory] && data[initialCategory].length > 0) {
                handleSelectDoc(data[initialCategory][0].path);
            } else if (data.user && data.user.length > 0) {
                handleSelectDoc(data.user[0].path);
            }
        }
      })
      .catch(err => {
          console.error("Failed to load docs structure", err);
          setLoading(false);
      });
  }, []);

  const handleSelectDoc = async (path) => {
    setSelectedPath(path);
    try {
        const res = await fetch(`/api/docs?doc=${path}`);
        if (res.ok) {
            const data = await res.json();
            setCurrentDoc(data.content);
            
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('doc', path);
            window.history.replaceState({}, '', newUrl);
        } else {
            setCurrentDoc('# Error\nDocument not found.');
        }
    } catch (e) {
        setCurrentDoc('# Error\nFailed to load document.');
    }
  };

  const getVisibleCategories = () => {
    if (!structure) return [];
    if (viewMode === 'developer') {
        return [
            { id: 'developer', label: 'Developer Protocols', icon: Code, items: structure.developer },
            { id: 'agents', label: 'Agent Intelligence', icon: Bot, items: structure.agents },
            { id: 'user', label: 'User Manuals', icon: User, items: structure.user }
        ];
    }
    return [
        { id: 'user', label: 'User Manuals', icon: User, items: structure.user },
        { id: 'agents', label: 'Agent Intelligence', icon: Bot, items: structure.agents }
    ];
  };

  if (loading) {
      return <div style={{ padding: '40px', color: '#666' }}>Initializing Knowledge Base...</div>;
  }

  const categories = getVisibleCategories();

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: '#0a0a0a', color: '#e0e0e0', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      <Head>
        <title>Empire State Manual | 2026</title>
      </Head>

      <div style={{ 
          width: '280px', 
          backgroundColor: '#111', 
          borderRight: '1px solid #222', 
          display: 'flex', 
          flexDirection: 'column',
          flexShrink: 0
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #222' }}>
            <div style={{ display: 'flex', background: '#222', borderRadius: '8px', padding: '4px' }}>
                <button 
                    onClick={() => setViewMode('user')}
                    style={{ 
                        flex: 1, 
                        padding: '8px', 
                        borderRadius: '6px', 
                        border: 'none', 
                        background: viewMode === 'user' ? '#333' : 'transparent',
                        color: viewMode === 'user' ? '#fff' : '#888',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    USER VIEW
                </button>
                <button 
                    onClick={() => setViewMode('developer')}
                    style={{ 
                        flex: 1, 
                        padding: '8px', 
                        borderRadius: '6px', 
                        border: 'none', 
                        background: viewMode === 'developer' ? '#333' : 'transparent',
                        color: viewMode === 'developer' ? '#10b981' : '#888',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    DEV VIEW
                </button>
            </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 10px' }}>
            {categories.map(cat => (
                <div key={cat.id} style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 10px 8px', color: '#666', fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px' }}>
                        <cat.icon size={14} />
                        {cat.label.toUpperCase()}
                    </div>
                    {cat.items && cat.items.map(item => (
                        <button
                            key={item.path}
                            onClick={() => handleSelectDoc(item.path)}
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 10px 8px 32px',
                                background: selectedPath === item.path ? '#1a1a1a' : 'transparent',
                                color: selectedPath === item.path ? '#ff6d5a' : '#aaa',
                                border: 'none',
                                borderLeft: selectedPath === item.path ? '2px solid #ff6d5a' : '2px solid transparent',
                                fontSize: '13px',
                                cursor: 'pointer',
                                borderRadius: '0 4px 4px 0',
                                marginBottom: '2px',
                                transition: 'all 0.1s'
                            }}
                        >
                            {item.title}
                        </button>
                    ))}
                </div>
            ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '40px 60px', maxWidth: '100%' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {currentDoc ? (
                <div className="markdown-content">
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                            h1: ({node, ...props}) => <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#fff', marginBottom: '24px', borderBottom: '1px solid #333', paddingBottom: '16px' }} {...props} />,
                            h2: ({node, ...props}) => <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#f0f0f0', marginTop: '40px', marginBottom: '16px' }} {...props} />,
                            h3: ({node, ...props}) => <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#ff6d5a', marginTop: '32px', marginBottom: '12px' }} {...props} />,
                            p: ({node, ...props}) => <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#ccc', marginBottom: '16px' }} {...props} />,
                            ul: ({node, ...props}) => <ul style={{ paddingLeft: '20px', marginBottom: '16px', color: '#ccc' }} {...props} />,
                            li: ({node, ...props}) => <li style={{ marginBottom: '8px', lineHeight: '1.6' }} {...props} />,
                            code: ({node, inline, className, children, ...props}) => {
                                const match = /language-(\w+)/.exec(className || '')
                                return !inline ? (
                                    <div style={{ background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '16px', margin: '20px 0', overflowX: 'auto' }}>
                                        <code style={{ fontFamily: 'monospace', fontSize: '13px', color: '#e0e0e0' }} {...props}>
                                            {children}
                                        </code>
                                    </div>
                                ) : (
                                    <code style={{ background: '#222', padding: '2px 6px', borderRadius: '4px', fontSize: '13px', color: '#ff6d5a', fontFamily: 'monospace' }} {...props}>
                                        {children}
                                    </code>
                                )
                            },
                            blockquote: ({node, ...props}) => <blockquote style={{ borderLeft: '4px solid #ff6d5a', paddingLeft: '16px', marginLeft: 0, color: '#888', fontStyle: 'italic' }} {...props} />,
                            a: ({node, ...props}) => <a style={{ color: '#38bdf8', textDecoration: 'none' }} {...props} />,
                            table: ({node, ...props}) => <table style={{ width: '100%', borderCollapse: 'collapse', margin: '20px 0', fontSize: '14px' }} {...props} />,
                            th: ({node, ...props}) => <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #333', color: '#fff', background: '#1a1a1a' }} {...props} />,
                            td: ({node, ...props}) => <td style={{ padding: '12px', borderBottom: '1px solid #222', color: '#ccc' }} {...props} />,
                        }}
                    >
                        {currentDoc}
                    </ReactMarkdown>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#444' }}>
                    <Book size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <p>Select a document to begin</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
