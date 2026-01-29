import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileJson, 
  Play, 
  RefreshCw, 
  ExternalLink, 
  Check,
  Workflow,
  GitBranch,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Code2
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300,
    },
  },
};

function NodeCard({ node, index }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const nodeIcons = {
    'n8n-nodes-base.webhook': GitBranch,
    'n8n-nodes-base.respondToWebhook': ArrowRightLeft,
    'custom-captcha-solver': Check,
    default: Workflow,
  };
  
  const Icon = nodeIcons[node.type] || nodeIcons.default;
  
  const nodeColors = {
    'n8n-nodes-base.webhook': 'from-blue-500 to-cyan-500',
    'n8n-nodes-base.respondToWebhook': 'from-emerald-500 to-teal-500',
    'custom-captcha-solver': 'from-orange-500 to-amber-500',
    default: 'from-slate-500 to-slate-600',
  };
  
  const colorClass = nodeColors[node.type] || nodeColors.default;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative"
    >
      {/* Connection Line */}
      {index > 0 && (
        <div className="absolute -top-4 left-6 w-0.5 h-4 bg-gradient-to-b from-slate-600 to-slate-500" />
      )}
      
      <div 
        className="flex items-start gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Node Number */}
        <div className="flex flex-col items-center">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center shadow-lg flex-shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <span className="mt-2 text-xs font-mono text-slate-500">#{index + 1}</span>
        </div>
        
        {/* Node Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-white">{node.name}</h4>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{node.type}</p>
            </div>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </motion.div>
          </div>
          
          {/* Expanded Details */}
          <motion.div
            initial={false}
            animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-3 border-t border-slate-700/50">
              <div className="text-xs text-slate-400 space-y-1">
                <p><span className="text-slate-500">ID:</span> {node.id}</p>
                <p><span className="text-slate-500">Type:</span> {node.type}</p>
                <p><span className="text-slate-500">Position:</span> [{index * 200}, {index * 100}]</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export default function WorkflowStep2({ workflow, onDeploy, onRegenerate, isLoading }) {
  const [viewMode, setViewMode] = useState('visual'); // 'visual' | 'json'
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(workflow, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleOpenInN8n = () => {
    // Open n8n in new tab for editing
    window.open('https://n8n.delqhi.com', '_blank');
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center">
        <h3 className="text-xl font-semibold text-white mb-2">
          Review Your Workflow
        </h3>
        <p className="text-slate-400 max-w-lg mx-auto">
          AI has generated a workflow based on your description. Review it before deploying to n8n.
        </p>
      </motion.div>

      {/* View Toggle */}
      <motion.div variants={itemVariants} className="flex items-center justify-center gap-2">
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-800 border border-slate-700">
          <button
            onClick={() => setViewMode('visual')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'visual'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Workflow className="w-4 h-4" />
            Visual
          </button>
          <button
            onClick={() => setViewMode('json')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'json'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-4 h-4" />
            JSON
          </button>
        </div>
      </motion.div>

      {/* Workflow Preview */}
      <motion.div variants={itemVariants}>
        {viewMode === 'visual' ? (
          <div className="space-y-3">
            {/* Workflow Info Card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-white text-lg">{workflow.name}</h4>
                  <p className="text-sm text-slate-400 mt-1">{workflow.description}</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-medium text-emerald-400">Ready</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-700/50">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <GitBranch className="w-4 h-4" />
                  <span>{Object.keys(workflow.nodes).length} nodes</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>{Object.keys(workflow.connections).length} connections</span>
                </div>
              </div>
            </div>

            {/* Node Flow */}
            <div className="space-y-0">
              {workflow.nodes.map((node, index) => (
                <NodeCard key={node.id} node={node} index={index} />
              ))}
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition-colors"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <FileJson className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 overflow-x-auto text-xs font-mono text-slate-300 max-h-96 overflow-y-auto">
              {JSON.stringify(workflow, null, 2)}
            </pre>
          </div>
        )}
      </motion.div>

      {/* Action Buttons */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3 pt-4">
        <motion.button
          onClick={onRegenerate}
          disabled={isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 py-3.5 px-4 rounded-xl font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Regenerate
        </motion.button>
        
        <motion.button
          onClick={handleOpenInN8n}
          disabled={isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 py-3.5 px-4 rounded-xl font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 transition-all flex items-center justify-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Edit in n8n
        </motion.button>
        
        <motion.button
          onClick={onDeploy}
          disabled={isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-[2] py-3.5 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Deploying...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Deploy to n8n
            </>
          )}
        </motion.button>
      </motion.div>

      {/* Security Note */}
      <motion.p 
        variants={itemVariants}
        className="text-center text-xs text-slate-500"
      >
        This workflow will be saved to your n8n instance at{' '}
        <span className="text-slate-400">n8n.delqhi.com</span>
      </motion.p>
    </motion.div>
  );
}
