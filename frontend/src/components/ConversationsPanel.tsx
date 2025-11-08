import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import clsx from 'clsx';
import type { Agent, Conversation } from '../types';

interface ConversationsPanelProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onConversationSelect: (id: string) => void;
  onNewConversation: (agentId: number) => void;
  agents: Agent[];
  loading?: boolean;
}

const ConversationsPanel: React.FC<ConversationsPanelProps> = ({
  conversations,
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  agents,
  loading = false,
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgentId(agentId);
  };

  const handleNewConversationClick = () => {
    if (selectedAgentId) {
      onNewConversation(parseInt(selectedAgentId, 10));
    }
  };

  const filteredConversations = conversations.filter(
    conv => !selectedAgentId || conv.agentId === parseInt(selectedAgentId, 10)
  );

  return (
    <div className="w-80 h-screen bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Agent Selection */}
      <div className="p-4 border-b border-gray-800">
        <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
          Select Agent
        </label>
        <select
          value={selectedAgentId}
          onChange={(e) => handleAgentSelect(e.target.value)}
          disabled={loading}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">-- Select an agent --</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id.toString()}>
              {agent.name}
            </option>
          ))}
        </select>
      </div>

      {/* New Conversation Button */}
      <div className="p-4 border-b border-gray-800">
        <button
          onClick={handleNewConversationClick}
          disabled={!selectedAgentId}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Plus size={18} />
          <span>New Conversation</span>
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase mb-3">
            Conversations
          </div>
          <div className="space-y-1">
            {filteredConversations.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                {selectedAgentId ? 'No conversations for this agent' : 'No conversations yet'}
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const preview = conversation.messages[0]?.content?.substring(0, 50) || 'New Conversation';
                return (
                  <button
                    key={conversation.id}
                    onClick={() => onConversationSelect(conversation.id)}
                    className={clsx(
                      'w-full text-left px-3 py-2 rounded-lg transition-colors text-sm',
                      currentConversationId === conversation.id
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    )}
                    title={conversation.agentName}
                  >
                    <div className="font-medium truncate mb-1">
                      {preview}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(conversation.updatedAt).toLocaleDateString()}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationsPanel;



