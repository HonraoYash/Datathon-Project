// Type definitions for the application

export interface Agent {
  id: number;
  name: string;
  description: string | null;
  system_prompt: string;
  model: string;
  temperature: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface Tool {
  id: number;
  name: string;
  description: string;
  tool_type: 'builtin' | 'custom';
  implementation: string | null;
  parameters: Record<string, any> | null;
  agent_id: number | null;
  created_at: string;
  updated_at: string | null;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface Conversation {
  id: string;
  agentId: number;
  agentName: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatRequest {
  agent_id: number;
  messages: ChatMessage[];
  stream?: boolean;
}

export interface ChatResponse {
  response: string;
  agent_id: number;
}

export type TabId = 'chat' | 'agent' | 'tool';



