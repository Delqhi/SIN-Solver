import React, { useState } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Workflow, 
  ArrowRight,
  Zap,
  Bot,
  GitBranch,
  Play
} from 'lucide-react';
import WorkflowModal from '../components/Workflow/WorkflowModal';

export default function WorkflowDemoPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Head>
        <title>Workflow Creator | SIN-Solver Dashboard</title>
        <meta name="description" content="AI-powered workflow creation for SIN-Solver" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          {/* Background Decorations */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-7xl mx-auto px-6 py-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-3xl mx-auto"
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 mb-6"
              >
                <Sparkles className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-medium text-orange-400">AI-Powered</span>
              </motion.div>

              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  Create Workflows
                </span>
                <br />
                <span className="bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
                  With Natural Language
                </span>
              </h1>

              <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
                Describe what you want to automate, and our AI will generate a complete n8n workflow 
                ready for deployment.
              </p>

              {/* CTA Button */}
              <motion.button
                onClick={() => setIsModalOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-semibold text-lg shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 transition-all"
              >
                <Sparkles className="w-5 h-5" />
                Create New Workflow
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </motion.div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Bot,
                title: 'AI Generation',
                description: 'Describe your workflow in plain English and let AI handle the technical details.',
                color: 'from-blue-500 to-cyan-500',
              },
              {
                icon: GitBranch,
                title: 'Visual Editor',
                description: 'Review and customize your workflow with an intuitive visual interface.',
                color: 'from-purple-500 to-pink-500',
              },
              {
                icon: Zap,
                title: 'One-Click Deploy',
                description: 'Deploy directly to your n8n instance with a single click.',
                color: 'from-emerald-500 to-teal-500',
              },
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="group p-6 rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-all"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-400">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-slate-400">Three simple steps to automate your workflows</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Describe',
                description: 'Tell us what you want to automate in natural language.',
                icon: Bot,
              },
              {
                step: '02',
                title: 'Review',
                description: 'AI generates a workflow that you can preview and customize.',
                icon: Workflow,
              },
              {
                step: '03',
                title: 'Deploy',
                description: 'Deploy to n8n with one click and start automating.',
                icon: Play,
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="relative"
                >
                  <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50">
                    <span className="text-5xl font-bold text-slate-700/50">{item.step}</span>
                    <div className="mt-4 mb-4">
                      <Icon className="w-8 h-8 text-orange-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-slate-400">{item.description}</p>
                  </div>
                  {index < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                      <ArrowRight className="w-8 h-8 text-slate-600" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="max-w-7xl mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="text-center p-12 rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Automate?
            </h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
              Start creating intelligent workflows today. No coding required.
            </p>
            <motion.button
              onClick={() => setIsModalOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-semibold shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 transition-all"
            >
              <Sparkles className="w-5 h-5" />
              Get Started Now
            </motion.button>
          </motion.div>
        </div>
      </div>

      {/* Workflow Modal */}
      <WorkflowModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
