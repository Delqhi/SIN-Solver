import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import WorkflowStep1 from './WorkflowStep1';
import WorkflowStep2 from './WorkflowStep2';
import WorkflowStep3 from './WorkflowStep3';

const STEPS = [
  { id: 1, label: 'Describe', icon: Sparkles },
  { id: 2, label: 'Review', icon: CheckCircle },
  { id: 3, label: 'Deploy', icon: Sparkles },
];

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300,
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 20,
    transition: { duration: 0.2 }
  },
};

export default function WorkflowModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [prompt, setPrompt] = useState('');
  const [generatedWorkflow, setGeneratedWorkflow] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deployResult, setDeployResult] = useState(null);

  const resetState = useCallback(() => {
    setCurrentStep(1);
    setPrompt('');
    setGeneratedWorkflow(null);
    setIsLoading(false);
    setError(null);
    setDeployResult(null);
  }, []);

  const handleClose = useCallback(() => {
    onClose();
    setTimeout(resetState, 300);
  }, [onClose, resetState]);

  const handleGenerate = useCallback(async (inputPrompt) => {
    setIsLoading(true);
    setError(null);

    try {
      // Mock API call - replace with actual endpoint
      // const response = await fetch('/api/workflows/generate', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ prompt: inputPrompt })
      // });
      // const data = await response.json();

      // Mock response for demonstration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockWorkflow = {
        name: 'Automated Captcha Solver',
        description: inputPrompt,
        nodes: [
          { id: 'trigger', type: 'n8n-nodes-base.webhook', name: 'Webhook Trigger' },
          { id: 'captcha', type: 'custom-captcha-solver', name: 'Captcha Solver' },
          { id: 'response', type: 'n8n-nodes-base.respondToWebhook', name: 'Return Result' },
        ],
        connections: {
          trigger: { main: [[{ node: 'captcha', type: 'main', index: 0 }]] },
          captcha: { main: [[{ node: 'response', type: 'main', index: 0 }]] },
        },
      };

      setGeneratedWorkflow(mockWorkflow);
      setCurrentStep(2);
    } catch (err) {
      setError(err.message || 'Failed to generate workflow');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDeploy = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Mock deployment
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setDeployResult({
        success: true,
        workflowId: 'wf_' + Math.random().toString(36).substr(2, 9),
        n8nUrl: 'https://n8n.delqhi.com/workflow/123',
      });
      setCurrentStep(3);
    } catch (err) {
      setError(err.message || 'Failed to deploy workflow');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRegenerate = useCallback(() => {
    handleGenerate(prompt);
  }, [prompt, handleGenerate]);

  const handleCreateAnother = useCallback(() => {
    resetState();
  }, [resetState]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          variants={backdropVariants}
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl"
          variants={modalVariants}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Create Workflow
                </h2>
                <p className="text-xs text-slate-400">
                  AI-powered workflow generation
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper */}
          <div className="px-6 py-4 bg-slate-950/30 border-b border-slate-800">
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2">
                {STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;
                  const isLast = index === STEPS.length - 1;

                  return (
                    <React.Fragment key={step.id}>
                      <div className="flex items-center gap-2">
                        <motion.div
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                              : isCompleted
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}
                          animate={isActive ? { scale: [1, 1.02, 1] } : {}}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                              isActive
                                ? 'bg-orange-500 text-white'
                                : isCompleted
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-700 text-slate-400'
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              step.id
                            )}
                          </div>
                          <span className="hidden sm:inline">{step.label}</span>
                        </motion.div>
                      </div>
                      {!isLast && (
                        <div
                          className={`w-8 sm:w-12 h-0.5 mx-1 ${
                            isCompleted ? 'bg-emerald-500/50' : 'bg-slate-700'
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-6 py-3 bg-red-950/50 border-b border-red-900/50"
              >
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <WorkflowStep1
                  key="step1"
                  prompt={prompt}
                  setPrompt={setPrompt}
                  onGenerate={handleGenerate}
                  isLoading={isLoading}
                />
              )}
              {currentStep === 2 && (
                <WorkflowStep2
                  key="step2"
                  workflow={generatedWorkflow}
                  onDeploy={handleDeploy}
                  onRegenerate={handleRegenerate}
                  isLoading={isLoading}
                />
              )}
              {currentStep === 3 && (
                <WorkflowStep3
                  key="step3"
                  result={deployResult}
                  onCreateAnother={handleCreateAnother}
                  onClose={handleClose}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Loading Overlay */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-10"
              >
                <div className="text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-12 h-12 rounded-full border-2 border-orange-500/30 border-t-orange-500 mx-auto mb-4"
                  />
                  <p className="text-slate-300 font-medium">
                    {currentStep === 1 ? 'Generating workflow...' : 'Deploying to n8n...'}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    This may take a few moments
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
