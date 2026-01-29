import { motion } from 'framer-motion';
import { FileText, History, MessageSquare, Shield } from 'lucide-react';

const DOCS = [
  { id: 'AGENTS.md', name: 'Agents Mandate', icon: Shield, color: 'text-blue-400' },
  { id: 'lastchanges.md', name: 'Last Changes', icon: History, color: 'text-purple-400' },
  { id: 'userprompts.md', name: 'User Prompts', icon: MessageSquare, color: 'text-green-400' },
  { id: 'BLUEPRINT.md', name: 'Blueprint', icon: FileText, color: 'text-orange-400' },
];

const DocsSidebar = ({ activeDoc, onSelect }) => {
  return (
    <div className="w-64 flex-shrink-0 space-y-2">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-4 mb-4">
        Knowledge Base
      </h2>
      <nav className="space-y-1">
        {DOCS.map((doc) => {
          const Icon = doc.icon;
          const isActive = activeDoc === doc.id;

          return (
            <button
              key={doc.id}
              onClick={() => onSelect(doc.id)}
              className={`
                w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200
                ${isActive 
                  ? 'bg-white/10 text-white border border-white/10 shadow-lg' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'}
              `}
            >
              <Icon className={`mr-3 h-5 w-5 ${isActive ? doc.color : 'text-gray-500'}`} />
              {doc.name}
              {isActive && (
                <motion.div
                  layoutId="activeDoc"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default DocsSidebar;
