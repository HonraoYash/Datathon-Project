import React from 'react';
import { Plus } from 'lucide-react';
import clsx from 'clsx';
import type { Agent } from '../types';

interface AgentsPanelProps {
  agents: Agent[];
  currentAgentId: number | null;
  onAgentSelect: (agent: Agent | null) => void;
  onNewAgent: () => void;
  loading?: boolean;
}

const AgentsPanel: React.FC<AgentsPanelProps> = ({
  agents,
  currentAgentId,
  onAgentSelect,
  onNewAgent,
  loading = false,
}) => {
  return (
    <div className="w-80 h-screen bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* New Agent Button */}
      <div className="p-4 border-b border-gray-800">
        <button
          onClick={onNewAgent}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Plus size={18} />
          <span>New Agent</span>
        </button>
      </div>

      {/* Agents List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase mb-3">
            Agents
          </div>
          <div className="space-y-1">
            {agents.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                {loading ? 'Loading agents...' : 'No agents created yet'}
              </div>
            ) : (
              agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => onAgentSelect(agent)}
                  className={clsx(
                    'w-full text-left px-3 py-2 rounded-lg transition-colors text-sm',
                    currentAgentId === agent.id
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  )}
                >
                  <div className="font-medium truncate mb-1">
                    {agent.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {agent.model}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentsPanel;



