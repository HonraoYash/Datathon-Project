import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { chatAPI } from '../services/api';
import { conversationStorage } from '../services/conversationStorage';
import type { Conversation, Agent } from '../types';

interface ChatInterfaceProps {
  conversation: Conversation | undefined;
  agent: Agent | null;
  onMessageUpdate: (conversation: Conversation) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  conversation,
  agent,
  onMessageUpdate,
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, [websocket]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages, streamingMessage]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !agent) return;

    // Ensure we have a conversation
    let currentConv = conversation;
    if (!currentConv) {
      // Create a new conversation if none exists
      const newConv = conversationStorage.create(agent.id, agent.name);
      onMessageUpdate(newConv);
      currentConv = newConv;
    }

    const userMessage = {
      role: 'user' as const,
      content: input.trim(),
    };

    // Add user message to conversation
    const updatedConversation = conversationStorage.addMessage(currentConv.id, userMessage);
    if (!updatedConversation) return;
    
    onMessageUpdate(updatedConversation);
    const userInput = input.trim();
    setInput('');
    setIsLoading(true);
    setStreamingMessage('');

    try {
      // Prepare messages for API (only user/assistant messages, no system)
      // Ensure proper format with role and content
      const apiMessages = updatedConversation.messages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: String(msg.content || ''),
        }));

      let assistantContent = '';

      // Try WebSocket first, fallback to SSE
      try {
        const ws = chatAPI.createWebSocket(
          agent.id,
          apiMessages,
          (chunk: string) => {
            assistantContent += chunk;
            setStreamingMessage(assistantContent);
          },
          (error: Error) => {
            console.error('WebSocket error, falling back to SSE:', error);
            // Fallback to SSE streaming
            chatAPI.chatStream(agent.id, apiMessages, (chunk: string) => {
              assistantContent += chunk;
              setStreamingMessage(assistantContent);
            }).then(() => {
              // Save final message
              if (assistantContent) {
                const assistantMessage = {
                  role: 'assistant' as const,
                  content: assistantContent,
                };
                const finalConversation = conversationStorage.addMessage(updatedConversation.id, assistantMessage);
                if (finalConversation) {
                  onMessageUpdate(finalConversation);
                }
              }
              setIsLoading(false);
              setStreamingMessage('');
            }).catch((err) => {
              console.error('SSE also failed:', err);
              setIsLoading(false);
              setStreamingMessage('');
              const errorMessage = {
                role: 'assistant' as const,
                content: `Error: ${err.message || 'Connection failed'}`,
              };
              const errorConversation = conversationStorage.addMessage(updatedConversation.id, errorMessage);
              if (errorConversation) {
                onMessageUpdate(errorConversation);
              }
            });
          },
          () => {
            // On WebSocket close - save the final message
            if (assistantContent) {
              const assistantMessage = {
                role: 'assistant' as const,
                content: assistantContent,
              };
              const finalConversation = conversationStorage.addMessage(updatedConversation.id, assistantMessage);
              if (finalConversation) {
                onMessageUpdate(finalConversation);
              }
            }
            setIsLoading(false);
            setStreamingMessage('');
            setWebsocket(null);
          }
        );

        setWebsocket(ws);
      } catch (wsError) {
        // If WebSocket creation fails, use SSE
        console.error('WebSocket creation failed, using SSE:', wsError);
        await chatAPI.chatStream(agent.id, apiMessages, (chunk: string) => {
          assistantContent += chunk;
          setStreamingMessage(assistantContent);
        });
        
        // Save final message
        if (assistantContent) {
          const assistantMessage = {
            role: 'assistant' as const,
            content: assistantContent,
          };
          const finalConversation = conversationStorage.addMessage(updatedConversation.id, assistantMessage);
          if (finalConversation) {
            onMessageUpdate(finalConversation);
          }
        }
        setIsLoading(false);
        setStreamingMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        role: 'assistant' as const,
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
      const errorConversation = conversationStorage.addMessage(updatedConversation.id, errorMessage);
      if (errorConversation) {
        onMessageUpdate(errorConversation);
      }
      setIsLoading(false);
      setStreamingMessage('');
    }
  };

  const currentMessages = conversation ? conversation.messages : [];
  const displayMessages = [...currentMessages];
  if (streamingMessage) {
    displayMessages.push({
      role: 'assistant' as const,
      content: streamingMessage,
      id: 'streaming',
    });
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900 h-screen">
      {/* Chat Header */}
      <div className="border-b border-gray-800 bg-gray-900 px-6 py-4">
        <h2 className="text-lg font-semibold text-white">
          {agent ? agent.name : 'Chat'}
        </h2>
        {agent && (
          <p className="text-sm text-gray-400 mt-1">{agent.description || 'No description'}</p>
        )}
      </div>

      {/* Messages Container - Above input */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-6"
      >
        {displayMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-xl mb-2">Start a conversation</p>
              <p className="text-sm">Type a message below to begin</p>
            </div>
          </div>
        ) : (
          displayMessages.map((message) => (
            <div
              key={message.id || `msg-${message.timestamp}`}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-800 text-gray-100'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="border-t border-gray-800 bg-gray-900 px-6 py-4">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                placeholder={
                  !agent 
                    ? "Please select an agent to start chatting"
                    : "Type your message... (Press Enter to send, Shift+Enter for new line)"
                }
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[52px] max-h-32"
                rows={1}
                disabled={isLoading || !agent}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isLoading || !agent}
              className="px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center min-w-[52px]"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
