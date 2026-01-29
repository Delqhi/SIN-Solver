import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';

const MarkdownViewer = ({ content, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Select a document to view
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="prose prose-invert max-w-none p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl"
    >
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({node, ...props}) => <h1 className="text-4xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 border-b border-white/10 pb-4" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-2xl font-semibold mt-12 mb-6 text-blue-300" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-xl font-medium mt-8 mb-4 text-purple-300" {...props} />,
          p: ({node, ...props}) => <p className="text-gray-300 leading-relaxed mb-6" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc list-inside mb-6 space-y-2 text-gray-300" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-6 space-y-2 text-gray-300" {...props} />,
          li: ({node, ...props}) => <li className="ml-4" {...props} />,
          code: ({node, inline, className, children, ...props}) => {
            const match = /language-(\w+)/.exec(className || '');
            return !inline ? (
              <pre className="bg-black/40 p-6 rounded-xl border border-white/5 overflow-x-auto my-8">
                <code className="text-sm font-mono text-blue-200" {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="bg-white/10 px-1.5 py-0.5 rounded text-blue-300 font-mono text-sm" {...props}>
                {children}
              </code>
            );
          },
          table: ({node, ...props}) => (
            <div className="overflow-x-auto my-8 rounded-xl border border-white/10">
              <table className="min-w-full divide-y divide-white/10" {...props} />
            </div>
          ),
          thead: ({node, ...props}) => <thead className="bg-white/5" {...props} />,
          th: ({node, ...props}) => <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider" {...props} />,
          td: ({node, ...props}) => <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 border-t border-white/5" {...props} />,
          blockquote: ({node, ...props}) => (
            <blockquote className="border-l-4 border-blue-500/50 bg-blue-500/5 pl-6 py-4 my-8 italic text-gray-400 rounded-r-xl" {...props} />
          ),
          a: ({node, ...props}) => <a className="text-blue-400 hover:text-blue-300 transition-colors underline decoration-blue-500/30 underline-offset-4" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </motion.div>
  );
};

export default MarkdownViewer;
