import React from 'react';
import { MessageSquare, Bot, Wrench } from 'lucide-react';
import clsx from 'clsx';
import type { TabId } from '../types';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
}) => {
  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'agent', label: 'Create Agent', icon: Bot },
    { id: 'tool', label: 'Create Tool', icon: Wrench },
  ];

  return (
    <div className="w-64 h-screen bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">Agentic Chatbot</h1>
      </div>

      {/* Tabs */}
      <div className="p-2 flex-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-3 rounded-lg mb-1 transition-colors',
                activeTab === tab.id
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon size={20} />
              <span className="font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;
