import type { Conversation, ChatMessage } from '../types';

// LocalStorage utility for managing conversations

const STORAGE_KEY = 'agentic_chatbot_conversations';
const CURRENT_CONVERSATION_KEY = 'agentic_chatbot_current_conversation';

export const conversationStorage = {
  // Get all conversations
  getAll: (): Conversation[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading conversations:', error);
      return [];
    }
  },

  // Get conversation by ID
  getById: (id: string): Conversation | undefined => {
    const conversations = conversationStorage.getAll();
    return conversations.find(conv => conv.id === id);
  },

  // Save a conversation
  save: (conversation: Conversation): Conversation | null => {
    try {
      const conversations = conversationStorage.getAll();
      const index = conversations.findIndex(conv => conv.id === conversation.id);
      
      if (index >= 0) {
        conversations[index] = conversation;
      } else {
        conversations.push(conversation);
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
      return conversation;
    } catch (error) {
      console.error('Error saving conversation:', error);
      return null;
    }
  },

  // Create a new conversation
  create: (agentId: number, agentName: string): Conversation => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      agentId,
      agentName,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return conversationStorage.save(newConversation)!;
  },

  // Add message to conversation
  addMessage: (conversationId: string, message: ChatMessage): Conversation | null => {
    const conversation = conversationStorage.getById(conversationId);
    if (!conversation) return null;

    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };

    conversation.messages.push(newMessage);
    conversation.updatedAt = new Date().toISOString();
    
    return conversationStorage.save(conversation);
  },

  // Delete a conversation
  delete: (id: string): boolean => {
    try {
      const conversations = conversationStorage.getAll();
      const filtered = conversations.filter(conv => conv.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      
      // Clear current conversation if it was deleted
      const currentId = conversationStorage.getCurrent();
      if (currentId === id) {
        conversationStorage.clearCurrent();
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return false;
    }
  },

  // Set current conversation
  setCurrent: (id: string): void => {
    localStorage.setItem(CURRENT_CONVERSATION_KEY, id);
  },

  // Get current conversation ID
  getCurrent: (): string | null => {
    return localStorage.getItem(CURRENT_CONVERSATION_KEY);
  },

  // Clear current conversation
  clearCurrent: (): void => {
    localStorage.removeItem(CURRENT_CONVERSATION_KEY);
  },
};



