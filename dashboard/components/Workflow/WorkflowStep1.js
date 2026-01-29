import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Shield, 
  ClipboardList, 
  Globe, 
  AlertCircle,
  ArrowRight,
  Wand2
} from 'lucide-react';

const EXAMPLES = [
  {
    id: 'captcha',
    icon: Shield,
    label: 'Captcha Solver',
    description: 'Google reCAPTCHA automation',
    prompt: 'Create a workflow that solves Google reCAPTCHA challenges using the captcha solver service. It should receive a site key and URL, solve the challenge, and return the solution token.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'survey',
    icon: ClipboardList,
    label: 'Survey Automation',
    description: 'Swagbucks survey completion',
    prompt: 'Build a workflow that automates Swagbucks survey completion. It should log in, find available surveys, complete them using AI assistance, and track earnings.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'scraper',
    icon: Globe,
    label: 'Website Scraper',
    description: 'Login and data extraction',
    prompt: 'Create a web scraper workflow that logs into a website, navigates to specific pages, extracts structured data, and stores it in a database.',
    color: 'from-emerald-500 to-teal-500',
  },
];

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

export default function WorkflowStep1({ prompt, setPrompt, onGenerate, isLoading }) {
  const [validationError, setValidationError] = useState(null);
  const [charCount, setCharCount] = useState(prompt.length);

  const handlePromptChange = useCallback((e) => {
    const value = e.target.value;
    setPrompt(value);
    setCharCount(value.length);
    if (validationError && value.length >= 10) {
      setValidationError(null);
    }
  }, [setPrompt, validationError]);

  const handleExampleClick = useCallback((examplePrompt) => {
    setPrompt(examplePrompt);
    setCharCount(examplePrompt.length);
    setValidationError(null);
  }, [setPrompt]);

  const handleSubmit = useCallback(() => {
    if (prompt.length < 10) {
      setValidationError('Please enter at least 10 characters');
      return;
    }
    onGenerate(prompt);
  }, [prompt, onGenerate]);

  const isValid = prompt.length >= 10;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center"
      >
        <h3 className="text-xl font-semibold text-white mb-2"
        >
          Describe Your Workflow
        </h3
        >
        <p className="text-slate-400 max-w-lg mx-auto"
        >
          Tell us what you want to automate in natural language. 
          Our AI will generate a complete n8n workflow for you.
        </p
        >
      </motion.div>

      {/* Textarea */}
      <motion.div variants={itemVariants} className="relative"
      >
        <div
          className={`relative rounded-xl border-2 transition-all duration-200 ${
            validationError
              ? 'border-red-500/50 bg-red-950/10'
              : isValid
              ? 'border-emerald-500/30 bg-emerald-950/10'
              : 'border-slate-700 bg-slate-800/50 focus-within:border-orange-500/50'
          }`}
        >
          <textarea
            value={prompt}
            onChange={handlePromptChange}
            placeholder="Beschreibe deinen Workflow..."
            className="w-full h-40 p-4 bg-transparent text-white placeholder-slate-500 resize-none focus:outline-none text-sm leading-relaxed"
            disabled={isLoading}
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-3"
          >
            <span
              className={`text-xs font-medium ${
                charCount < 10
                  ? 'text-slate-500'
                  : charCount < 50
                  ? 'text-orange-400'
                  : 'text-emerald-400'
              }`}
            >
              {charCount} chars
            </span
            >
            {isValid && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center"
              >
                <Sparkles className="w-3 h-3 text-emerald-400" />
              </motion.div>
            )}
          </div>
        </div>

        {/* Validation Error */}
        {validationError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mt-2 text-red-400 text-sm"
          >
            <AlertCircle className="w-4 h-4" />
            <span>{validationError}</span>
          </motion.div>
        )}

        {/* Hint */}
        <p className="mt-2 text-xs text-slate-500"
        >
          Be specific about inputs, actions, and expected outputs for best results.
        </p
        >
      </motion.div>

      {/* Examples */}
      <motion.div variants={itemVariants} className="space-y-3"
      >
        <div className="flex items-center gap-2 text-slate-400"
        >
          <Wand2 className="w-4 h-4" />
          <span className="text-sm font-medium"
          >Quick Start Examples</span
          >
        </div
        >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {EXAMPLES.map((example) => {
            const Icon = example.icon;
            return (
              <motion.button
                key={example.id}
                onClick={() => handleExampleClick(example.prompt)}
                disabled={isLoading}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="group relative p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-all text-left overflow-hidden"
              >
                {/* Gradient Background */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${example.color} opacity-0 group-hover:opacity-5 transition-opacity`}
                />
                
                {/* Icon */}
                <div
                  className={`w-10 h-10 rounded-lg bg-gradient-to-br ${example.color} flex items-center justify-center mb-3 shadow-lg`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div
                >
                
                {/* Content */}
                <h4 className="font-medium text-white text-sm mb-1"
                >
                  {example.label}
                </h4
                >
                <p className="text-xs text-slate-400"
                >
                  {example.description}
                </p
                >
                
                {/* Arrow */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div
                >
              </motion.button>
            );
          })}
        </div
        >
      </motion.div>

      {/* Generate Button */}
      <motion.div variants={itemVariants} className="pt-4"
      >
        <motion.button
          onClick={handleSubmit}
          disabled={isLoading || !isValid}
          whileHover={isValid ? { scale: 1.02 } : {}}
          whileTap={isValid ? { scale: 0.98 } : {}}
          className={`w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-3 transition-all ${
            isValid
              ? 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 shadow-lg shadow-orange-500/25'
              : 'bg-slate-700 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles className="w-5 h-5" />
              </motion.div>
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Generate Workflow</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </motion.button
        >
        
        {!isValid && (
          <p className="text-center text-xs text-slate-500 mt-3"
          >
            Enter at least 10 characters to generate
          </p
          >
        )}
      </motion.div>
    </motion.div>
  );
}
