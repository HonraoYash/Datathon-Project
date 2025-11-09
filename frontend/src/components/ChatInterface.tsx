import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Paperclip, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { chatAPI, ocrAPI } from '../services/api';
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Cleanup WebSocket
  useEffect(() => {
    return () => {
      if (websocket) websocket.close();
    };
  }, [websocket]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => scrollToBottom(), [conversation?.messages, streamingMessage]);

  /** ---------------------------
   *  File Handling
   * --------------------------- */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setUploadStatus('error');
        setUploadMessage('Please select a PDF file');
        return;
      }
      setSelectedFile(file);
      setUploadStatus('idle');
      setUploadMessage('');
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;
    setUploadStatus('uploading');
    setUploadMessage('Uploading PDF...');
    try {
      const response = await ocrAPI.uploadPDF(selectedFile);
      setUploadStatus('success');
      setUploadMessage(`PDF uploaded successfully! Job ID: ${response.databricks_run?.run_id || 'N/A'}`);
      setTimeout(() => {
        setSelectedFile(null);
        setUploadStatus('idle');
        setUploadMessage('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 3000);
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage(error instanceof Error ? error.message : 'Failed to upload PDF');
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setUploadMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /** ---------------------------
   *  Chat Sending
   * --------------------------- */
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !agent) return;

    // Create conversation if not existing yet
    let currentConv = conversation;
    if (!currentConv) {
      const newConv = conversationStorage.create(agent.id, agent.name);
      onMessageUpdate(newConv);
      currentConv = newConv;
    }

    const userMessage = { role: 'user' as const, content: input.trim() };
    const updatedConversation = conversationStorage.addMessage(currentConv.id, userMessage);
    if (!updatedConversation) return;
    onMessageUpdate(updatedConversation);

    const apiMessages = updatedConversation.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: String(m.content || '') }));

    setInput('');
    setIsLoading(true);
    setStreamingMessage('');
    let assistantContent = '';

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
          chatAPI.chatStream(agent.id, apiMessages, (chunk: string) => {
            assistantContent += chunk;
            setStreamingMessage(assistantContent);
          }).then(() => {
            const msg = { role: 'assistant' as const, content: assistantContent };
            const finalConv = conversationStorage.addMessage(updatedConversation.id, msg);
            if (finalConv) onMessageUpdate(finalConv);
            setIsLoading(false);
            setStreamingMessage('');
          });
        },
        () => {
          if (assistantContent) {
            const msg = { role: 'assistant' as const, content: assistantContent };
            const finalConv = conversationStorage.addMessage(updatedConversation.id, msg);
            if (finalConv) onMessageUpdate(finalConv);
          }
          setIsLoading(false);
          setStreamingMessage('');
          setWebsocket(null);
        }
      );
      setWebsocket(ws);
    } catch (wsError) {
      console.error('WebSocket creation failed:', wsError);
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

  /** ---------------------------
   *  JSX Render
   * --------------------------- */
  return (
    <div className="flex-1 flex flex-col bg-gray-900 h-screen">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900 px-6 py-4">
        <h2 className="text-lg font-semibold text-white">
          {agent ? agent.name : 'Chat'}
        </h2>
        {agent && (
          <p className="text-sm text-gray-400 mt-1">
            {agent.description || 'No description'}
          </p>
        )}
      </div>

      {/* Messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {displayMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-center">
            <div>
              <p className="text-xl mb-2">Start a conversation</p>
              <p className="text-sm">Type a message below to begin</p>
            </div>
          </div>
        ) : (
          displayMessages.map((m) => (
            <div key={m.id || `msg-${m.timestamp}`} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-3xl rounded-2xl px-4 py-3 ${
                  m.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-800 text-gray-100'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 bg-gray-900 px-6 py-4">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto">
          {/* File upload preview */}
          {selectedFile && (
            <div className="mb-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText size={18} className="text-primary-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300 truncate">{selectedFile.name}</span>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                {/* Upload button always enabled */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleFileUpload}
                    disabled={uploadStatus === 'uploading'}
                    className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 text-white rounded transition-colors"
                  >
                    {uploadStatus === 'uploading' ? 'Uploading…' : 'Upload PDF'}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                    aria-label="Remove file"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              {uploadMessage && (
                <div
                  className={`mt-2 text-xs ${
                    uploadStatus === 'success'
                      ? 'text-green-400'
                      : uploadStatus === 'error'
                      ? 'text-red-400'
                      : 'text-gray-400'
                  }`}
                >
                  {uploadMessage}
                </div>
              )}
            </div>
          )}

          {/* Input row */}
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="pdf-upload"
            />

            {/* 📎 Enable always (only block while uploading) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || uploadStatus === 'uploading'}
              className="px-4 py-3 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 text-gray-300 rounded-lg flex items-center justify-center min-w-[52px]"
              title="Attach PDF"
            >
              <Paperclip size={20} />
            </button>

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
                placeholder="Type your message… (Enter to send, Shift+Enter for newline)"
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[52px] max-h-32"
                rows={1}
                disabled={isLoading}
              />
            </div>

            {/* ✈️ Send always active when there's input */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 text-white rounded-lg flex items-center justify-center min-w-[52px]"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;