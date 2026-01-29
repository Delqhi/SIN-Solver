import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  ExternalLink, 
  Plus, 
  X,
  Copy,
  Check,
  Rocket,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useState } from 'react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
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

const checkmarkVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      damping: 15,
      stiffness: 200,
      delay: 0.3,
    },
  },
};

const pulseVariants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [0.5, 0.8, 0.5],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export default function WorkflowStep3({ result, onCreateAnother, onClose }) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyUrl = () => {
    if (result?.n8nUrl) {
      navigator.clipboard.writeText(result.n8nUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleOpenN8n = () => {
    if (result?.n8nUrl) {
      window.open(result.n8nUrl, '_blank');
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Success Animation */}
      <motion.div variants={itemVariants} className="text-center relative">
        {/* Animated Rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            variants={pulseVariants}
            animate="animate"
            className="w-32 h-32 rounded-full bg-emerald-500/10"
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            variants={pulseVariants}
            animate="animate"
            style={{ animationDelay: '0.5s' }}
            className="w-40 h-40 rounded-full bg-emerald-500/5"
          />
        </div>

        {/* Success Icon */}
        <motion.div
          variants={checkmarkVariants}
          className="relative w-24 h-24 mx-auto mb-6"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/30" />
          <div className="absolute inset-1 rounded-full bg-slate-900 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" strokeWidth={1.5} />
          </div>
          
          {/* Sparkles */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, type: 'spring' }}
            className="absolute -top-1 -right-1"
          >
            <Sparkles className="w-5 h-5 text-amber-400" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, type: 'spring' }}
            className="absolute -bottom-1 -left-1"
          >
            <Sparkles className="w-4 h-4 text-orange-400" />
          </motion.div>
        </motion.div>

        <h3 className="text-2xl font-bold text-white mb-2">
          Workflow Deployed!
        </h3>
        <p className="text-slate-400 max-w-md mx-auto">
          Your workflow has been successfully created and is now ready to use in n8n.
        </p>
      </motion.div>

      {/* Result Card */}
      <motion.div variants={itemVariants}>
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 shadow-xl">
          {/* Workflow ID */}
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-700/50">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Workflow ID</p>
              <p className="font-mono text-sm text-slate-300">{result?.workflowId}</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-emerald-400">Active</span>
            </div>
          </div>

          {/* n8n URL */}
          <div className="space-y-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider">n8n Workflow URL</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-sm text-slate-400 truncate">
                {result?.n8nUrl}
              </div>
              <motion.button
                onClick={handleCopyUrl}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                title="Copy URL"
              >
                {isCopied ? (
                  <Check className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </motion.button>
              <motion.button
                onClick={handleOpenN8n}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/20 transition-all"
                title="Open in n8n"
              >
                <ExternalLink className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 pt-6 border-t border-slate-700/50">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Quick Actions</p>
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                onClick={handleOpenN8n}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
              >
                <Rocket className="w-4 h-4" />
                Configure
              </motion.button>
              <motion.button
                onClick={handleOpenN8n}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                Test Run
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
        <motion.button
          onClick={onCreateAnother}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 py-4 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Another Workflow
        </motion.button>
        
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="py-4 px-6 rounded-xl font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all flex items-center justify-center gap-2"
        >
          <X className="w-5 h-5" />
          Close
        </motion.button>
      </motion.div>

      {/* Tips */}
      <motion.div variants={itemVariants} className="text-center">
        <p className="text-xs text-slate-500">
          💡 Tip: You can find all your workflows in the{' '}
          <a 
            href="https://n8n.delqhi.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-orange-400 hover:text-orange-300 underline"
          >
            n8n dashboard
          </a>
        </p>
      </motion.div>
    </motion.div>
  );
}
