import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ConversationsPanel from './components/ConversationsPanel';
import ChatInterface from './components/ChatInterface';
import CreateAgent from './components/CreateAgent';
import { agentsAPI } from './services/api';
import { conversationStorage } from './services/conversationStorage';
import type { TabId, Agent, Conversation } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgents();
    loadConversations();
    
    // Refresh agents every 30 seconds
    const interval = setInterval(loadAgents, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAgents = async () => {
    try {
      const response = await agentsAPI.getActive();
      setAgents(response.data);
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = () => {
    const allConversations = conversationStorage.getAll();
    setConversations(allConversations);
    
    // Try to restore current conversation
    const savedCurrentId = conversationStorage.getCurrent();
    if (savedCurrentId && allConversations.find(c => c.id === savedCurrentId)) {
      setCurrentConversationId(savedCurrentId);
    }
  };

  const handleNewConversation = (agentId: number) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    const newConversation = conversationStorage.create(agentId, agent.name);
    setConversations([newConversation, ...conversations]);
    setCurrentConversationId(newConversation.id);
    conversationStorage.setCurrent(newConversation.id);
  };

  const handleConversationSelect = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    conversationStorage.setCurrent(conversationId);
  };

  const handleMessageUpdate = (updatedConversation: Conversation) => {
    setConversations(prev => {
      const updated = prev.map(conv =>
        conv.id === updatedConversation.id ? updatedConversation : conv
      );
      // Sort by updatedAt (most recent first)
      return updated.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    });
  };

  const currentConversation = conversations.find(c => c.id === currentConversationId);
  const currentAgent = currentConversation 
    ? agents.find(a => a.id === currentConversation.agentId)
    : null;

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return (
          <>
            <ConversationsPanel
              conversations={conversations}
              currentConversationId={currentConversationId}
              onConversationSelect={handleConversationSelect}
              onNewConversation={handleNewConversation}
              agents={agents}
              loading={loading}
            />
            <ChatInterface
              conversation={currentConversation}
              agent={currentAgent}
              onMessageUpdate={handleMessageUpdate}
            />
          </>
        );
      case 'agent':
        return (
          <CreateAgent
            onAgentCreated={(agent) => {
              // Reload agents after creation
              loadAgents();
            }}
          />
        );
      case 'tool':
        return (
          <div className="flex-1 flex items-center justify-center bg-gray-900">
            <div className="text-center text-gray-500">
              <p className="text-lg">Create Tool</p>
              <p className="text-sm mt-2">This feature will be implemented next</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      {renderContent()}
    </div>
  );
}

export default App;
