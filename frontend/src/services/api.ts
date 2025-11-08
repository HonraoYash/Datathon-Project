import axios, { AxiosResponse } from 'axios';
import type { Agent, Tool, ChatMessage, ChatResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Agents API
export const agentsAPI = {
  getAll: (): Promise<AxiosResponse<Agent[]>> => api.get('/agents/'),
  getActive: (): Promise<AxiosResponse<Agent[]>> => api.get('/agents/active'),
  getById: (id: number): Promise<AxiosResponse<Agent>> => api.get(`/agents/${id}`),
  create: (data: Partial<Agent>): Promise<AxiosResponse<Agent>> => api.post('/agents/', data),
  update: (id: number, data: Partial<Agent>): Promise<AxiosResponse<Agent>> => api.put(`/agents/${id}`, data),
  delete: (id: number): Promise<AxiosResponse<void>> => api.delete(`/agents/${id}`),
};

// Tools API
export const toolsAPI = {
  getAll: (): Promise<AxiosResponse<Tool[]>> => api.get('/tools/'),
  getBuiltin: (): Promise<AxiosResponse<Tool[]>> => api.get('/tools/builtin'),
  getByAgent: (agentId: number): Promise<AxiosResponse<Tool[]>> => api.get(`/tools/agent/${agentId}`),
  getById: (id: number): Promise<AxiosResponse<Tool>> => api.get(`/tools/${id}`),
  create: (data: Partial<Tool>): Promise<AxiosResponse<Tool>> => api.post('/tools/', data),
  update: (id: number, data: Partial<Tool>): Promise<AxiosResponse<Tool>> => api.put(`/tools/${id}`, data),
  delete: (id: number): Promise<AxiosResponse<void>> => api.delete(`/tools/${id}`),
};

// Models API
export const modelsAPI = {
  getAvailable: () => api.get('/models/available'),
  getOllamaModels: () => api.get('/models/ollama'),
};

// Chat API with WebSocket support
export const chatAPI = {
  chat: async (agentId: number, messages: ChatMessage[]): Promise<ChatResponse> => {
    const response = await api.post<ChatResponse>('/chat/', {
      agent_id: agentId,
      messages,
      stream: false,
    });
    return response.data;
  },
  
  // WebSocket-based chat streaming
  createWebSocket: (
    agentId: number,
    messages: ChatMessage[],
    onMessage: (chunk: string) => void,
    onError?: (error: Error) => void,
    onClose?: () => void
  ): WebSocket => {
    const ws = new WebSocket(`${WS_BASE_URL}/ws/chat`);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        agent_id: agentId,
        messages,
        stream: true,
      }));
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'chunk' && data.content) {
          onMessage(data.content);
        } else if (data.type === 'done') {
          ws.close();
          if (onClose) onClose();
        } else if (data.type === 'error') {
          const error = new Error(data.message || 'WebSocket error');
          if (onError) onError(error);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        if (onError) onError(error as Error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (onError) onError(new Error('WebSocket connection error'));
    };
    
    ws.onclose = () => {
      if (onClose) onClose();
    };
    
    return ws;
  },
  
  // Fallback SSE streaming (for compatibility)
  chatStream: async (agentId: number, messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agentId,
        messages,
        stream: true,
      }),
    });

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            return;
          }
          onChunk(data);
        }
      }
    }
  },
};

export default api;

