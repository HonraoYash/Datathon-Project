import React, { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { agentsAPI, toolsAPI, chatAPI, modelsAPI } from '../services/api';
import AgentsPanel from './AgentsPanel';
import type { Agent, Tool } from '../types';

interface CreateAgentProps {
  onAgentCreated?: (agent: Agent) => void;
}

type TabType = 'prompt' | 'tool' | 'test';

interface Model {
  id: string;
  name: string;
  provider: string;
}

const CreateAgent: React.FC<CreateAgentProps> = ({ onAgentCreated }) => {
  const [activeTab, setActiveTab] = useState<TabType>('prompt');
  const [agentName, setAgentName] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedTools, setSelectedTools] = useState<number[]>([]);
  const [testQuestion, setTestQuestion] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  
  const [models, setModels] = useState<Model[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [allAgents, setAllAgents] = useState<Agent[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [agentsLoading, setAgentsLoading] = useState(true);

  useEffect(() => {
    loadModels();
    loadTools();
    loadAgents();
  }, []);

  // Ensure selectedModel is set when models are loaded
  useEffect(() => {
    if (models.length > 0 && !selectedModel && !loading && !currentAgent) {
      console.log('Auto-selecting first model:', models[0].id);
      setSelectedModel(models[0].id);
    }
  }, [models, loading]);

  const loadModels = async () => {
    try {
      const response = await modelsAPI.getAvailable();
      const data = response.data;
      const modelsList = data.models || [];
      console.log('Models loaded:', modelsList);
      setModels(modelsList);
      // Always set selectedModel if not set and models exist (and no current agent)
      if (modelsList.length > 0 && !currentAgent) {
        // Use functional update to ensure we're checking the latest state
        setSelectedModel(prev => {
          if (!prev && modelsList.length > 0) {
            console.log('Setting default model:', modelsList[0].id);
            return modelsList[0].id;
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Error loading models:', error);
      // Fallback models
      const fallbackModels = [
        { id: 'llama3.2', name: 'Llama 3.2', provider: 'Ollama' },
        { id: 'claude-sonnet-3.5', name: 'Claude Sonnet 3.5', provider: 'Anthropic' },
        { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
      ];
      console.log('Using fallback models:', fallbackModels);
      setModels(fallbackModels);
      if (!currentAgent) {
        setSelectedModel(prev => {
          if (!prev) {
            console.log('Setting fallback model: llama3.2');
            return 'llama3.2';
          }
          return prev;
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadTools = async () => {
    try {
      const response = await toolsAPI.getAll();
      setTools(response.data);
    } catch (error) {
      console.error('Error loading tools:', error);
    }
  };

  const loadAgents = async () => {
    try {
      setAgentsLoading(true);
      const response = await agentsAPI.getAll();
      setAllAgents(response.data);
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setAgentsLoading(false);
    }
  };

  const handleAgentSelect = (agent: Agent | null) => {
    if (agent) {
      setCurrentAgent(agent);
      setAgentName(agent.name);
      setSelectedModel(agent.model);
      setSystemPrompt(agent.system_prompt || '');
      
      // Load connected tools for this agent
      loadAgentTools(agent.id);
    } else {
      // New agent
      setCurrentAgent(null);
      setAgentName('');
      setSelectedModel(models.length > 0 ? models[0].id : '');
      setSystemPrompt('');
      setSelectedTools([]);
    }
  };

  const loadAgentTools = async (agentId: number) => {
    try {
      const response = await toolsAPI.getByAgent(agentId);
      setSelectedTools(response.data.map(tool => tool.id));
    } catch (error) {
      console.error('Error loading agent tools:', error);
      setSelectedTools([]);
    }
  };

  const handleSaveAgent = async () => {
    console.log('handleSaveAgent called', { agentName, selectedModel, saving, loading });
    
    if (!agentName.trim()) {
      alert('Please provide an agent name');
      return;
    }
    
    if (!selectedModel) {
      alert('Please select a model. Current value: ' + selectedModel);
      return;
    }

    if (saving) {
      console.log('Already saving, ignoring');
      return;
    }

      console.log('Starting save...', { agentName, selectedModel, systemPrompt });
    setSaving(true);
    try {
      const agentData = {
        name: agentName.trim(),
        description: '',
        system_prompt: systemPrompt || 'You are a helpful assistant.',
        model: selectedModel,
        temperature: '0.7',
        is_active: true,
      };

      console.log('Sending agent data:', agentData);
      
      let savedAgent: Agent;
      if (currentAgent) {
        console.log('Updating existing agent:', currentAgent.id);
        const response = await agentsAPI.update(currentAgent.id, agentData);
        savedAgent = response.data;
        console.log('Agent updated:', savedAgent);
      } else {
        console.log('Creating new agent');
        const response = await agentsAPI.create(agentData);
        savedAgent = response.data;
        console.log('Agent created:', savedAgent);
      }

      // Update tools if any selected
      if (selectedTools.length > 0 && savedAgent) {
        for (const toolId of selectedTools) {
          try {
            await toolsAPI.update(toolId, { agent_id: savedAgent.id });
          } catch (error) {
            console.error(`Error connecting tool ${toolId}:`, error);
          }
        }
      }

      setCurrentAgent(savedAgent);
      // Reload agents list
      await loadAgents();
      if (onAgentCreated) {
        onAgentCreated(savedAgent);
      }
      alert('Agent saved successfully!');
    } catch (error: any) {
      console.error('Error saving agent:', error);
      alert(`Error: ${error.response?.data?.detail || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrompt = async () => {
    if (!agentName.trim()) {
      alert('Please provide an agent name');
      return;
    }
    
    if (!selectedModel) {
      alert('Please select a model');
      return;
    }

    console.log('Saving prompt:', { agentName, selectedModel, systemPrompt });
    
    if (saving) {
      console.log('Already saving, ignoring');
      return;
    }
    
    setSaving(true);
    try {
      const agentData = {
        name: agentName.trim(),
        description: '',
        system_prompt: systemPrompt || 'You are a helpful assistant.',
        model: selectedModel,
        temperature: '0.7',
        is_active: true,
      };

      console.log('Sending prompt data:', agentData);
      
      let savedAgent: Agent;
      if (currentAgent) {
        console.log('Updating existing agent:', currentAgent.id);
        const response = await agentsAPI.update(currentAgent.id, agentData);
        savedAgent = response.data;
        console.log('Prompt updated:', savedAgent);
      } else {
        console.log('Creating new agent');
        const response = await agentsAPI.create(agentData);
        savedAgent = response.data;
        console.log('Agent created:', savedAgent);
      }

      setCurrentAgent(savedAgent);
      // Reload agents list
      await loadAgents();
      alert('Prompt saved successfully!');
    } catch (error: any) {
      console.error('Error saving prompt:', error);
      alert(`Error: ${error.response?.data?.detail || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleConnectTool = (toolId: number) => {
    if (!selectedTools.includes(toolId)) {
      setSelectedTools([...selectedTools, toolId]);
    }
  };

  const handleDisconnectTool = (toolId: number) => {
    setSelectedTools(selectedTools.filter(id => id !== toolId));
  };

  const handleTest = async () => {
    // If no agent saved yet, create a temporary one for testing
    let agentToTest = currentAgent;
    
    if (!agentToTest) {
      if (!agentName.trim() || !selectedModel) {
        alert('Please provide an agent name, select a model, and save the agent first');
        return;
      }
      // Create a temporary agent for testing
      try {
        const agentData = {
          name: `${agentName}_test_${Date.now()}`,
          description: 'Temporary test agent',
          system_prompt: systemPrompt || 'You are a helpful assistant.',
          model: selectedModel,
          temperature: '0.7',
          is_active: true,
        };
        const response = await agentsAPI.create(agentData);
        agentToTest = response.data;
      } catch (error: any) {
        alert(`Error creating test agent: ${error.response?.data?.detail || error.message}`);
        return;
      }
    }

    if (!testQuestion.trim()) {
      alert('Please enter a test question');
      return;
    }

    setTestLoading(true);
    setTestResponse('');
    
    try {
      // Ensure proper message format
      const messages = [
        { 
          role: 'user' as const, 
          content: String(testQuestion || '') 
        }
      ];

      let response = '';
      
      // Try WebSocket first, fallback to SSE, then to non-streaming
      try {
        const ws = chatAPI.createWebSocket(
          agentToTest.id,
          messages,
          (chunk: string) => {
            response += chunk;
            setTestResponse(response);
          },
          (error: Error) => {
            console.error('WebSocket error, trying SSE:', error);
            // Fallback to SSE
            chatAPI.chatStream(agentToTest.id, messages, (chunk: string) => {
              response += chunk;
              setTestResponse(response);
            }).catch((sseError: any) => {
              console.error('SSE error, trying non-streaming:', sseError);
              // Final fallback to non-streaming
              chatAPI.chat(agentToTest.id, messages).then((result) => {
                setTestResponse(result.response);
              }).catch((finalError: any) => {
                setTestResponse(`Error: ${finalError.response?.data?.detail || finalError.message}`);
              }).finally(() => {
                setTestLoading(false);
              });
            });
          },
          () => {
            setTestResponse(response);
            setTestLoading(false);
          }
        );
      } catch (wsError) {
        // If WebSocket creation fails, use SSE
        try {
          await chatAPI.chatStream(agentToTest.id, messages, (chunk: string) => {
            response += chunk;
            setTestResponse(response);
          });
          setTestResponse(response);
        } catch (sseError: any) {
          // Final fallback to non-streaming
          try {
            const result = await chatAPI.chat(agentToTest.id, messages);
            setTestResponse(result.response);
          } catch (finalError: any) {
            console.error('All methods failed:', finalError);
            setTestResponse(`Error: ${finalError.response?.data?.detail || finalError.message}`);
          }
        }
        setTestLoading(false);
      }
    } catch (error: any) {
      console.error('Error testing agent:', error);
      setTestResponse(`Error: ${error.response?.data?.detail || error.message || 'Unknown error'}`);
      setTestLoading(false);
    }
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'prompt', label: 'Prompt' },
    { id: 'tool', label: 'Tool' },
    { id: 'test', label: 'Test' },
  ];

  return (
    <div className="flex-1 flex bg-gray-900 h-screen">
      {/* Agents Panel */}
      <AgentsPanel
        agents={allAgents}
        currentAgentId={currentAgent?.id || null}
        onAgentSelect={handleAgentSelect}
        onNewAgent={() => handleAgentSelect(null)}
        loading={agentsLoading}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-gray-900 h-screen">
      {/* Header with Name and Save Button */}
      <div className="border-b border-gray-800 bg-gray-900 px-6 py-4 flex items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={agentName}
            onChange={(e) => {
              console.log('Agent name changed:', e.target.value);
              setAgentName(e.target.value);
            }}
            placeholder="Enter agent name..."
            className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Save Agent button clicked', { agentName, selectedModel, saving, loading });
            if (!saving && !loading) {
              handleSaveAgent();
            }
          }}
          disabled={!agentName.trim() || !selectedModel || saving || loading}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
          title={loading ? 'Loading models...' : !agentName.trim() ? 'Enter agent name' : !selectedModel ? 'Select a model' : ''}
        >
          {saving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save size={18} />
              <span>Save Agent</span>
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800 flex px-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 border-b-2 transition-colors font-medium ${
              activeTab === tab.id
                ? 'border-primary-600 text-white'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'prompt' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Save Changes Button at top right */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Save Changes button clicked', { agentName, selectedModel, saving, loading });
                  if (!saving && !loading) {
                    handleSavePrompt();
                  }
                }}
                disabled={!agentName.trim() || !selectedModel || saving || loading}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
                title={loading ? 'Loading models...' : !agentName.trim() ? 'Enter agent name' : !selectedModel ? 'Select a model' : ''}
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>

            {/* Model Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => {
                  console.log('Model selected:', e.target.value);
                  setSelectedModel(e.target.value);
                }}
                disabled={loading}
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              >
                <option value="">-- Select a model --</option>
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.provider})
                  </option>
                ))}
              </select>
              {selectedModel && (
                <p className="text-xs text-gray-400 mt-1">Selected: {selectedModel}</p>
              )}
            </div>

            {/* System Prompt Textarea */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                System Prompt
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter the system prompt for your agent..."
                className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                rows={15}
              />
            </div>
          </div>
        )}

        {activeTab === 'tool' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Available Tools</h3>
              
              {tools.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>No tools available. Create tools in the "Create Tool" tab first.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tools.map((tool) => {
                    const isConnected = selectedTools.includes(tool.id);
                    return (
                      <div
                        key={tool.id}
                        className={`p-4 rounded-lg border ${
                          isConnected
                            ? 'bg-primary-900/30 border-primary-600'
                            : 'bg-gray-800 border-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-white">{tool.name}</h4>
                            <p className="text-sm text-gray-400 mt-1">{tool.description}</p>
                          </div>
                          {isConnected ? (
                            <button
                              onClick={() => handleDisconnectTool(tool.id)}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                            >
                              Disconnect
                            </button>
                          ) : (
                            <button
                              onClick={() => handleConnectTool(tool.id)}
                              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm"
                            >
                              Connect Tool
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'test' && (
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 gap-6 h-full">
              {/* Left: Input */}
              <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Test Question
                </label>
                <textarea
                  value={testQuestion}
                  onChange={(e) => setTestQuestion(e.target.value)}
                  placeholder="Enter your test question..."
                  className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={10}
                />
                <button
                  onClick={handleTest}
                  disabled={!testQuestion.trim() || !currentAgent || testLoading}
                  className="mt-4 px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {testLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <span>Test Agent</span>
                  )}
                </button>
              </div>

              {/* Right: Response */}
              <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Agent Response
                </label>
                <div className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 overflow-y-auto">
                  {testResponse ? (
                    <div className="whitespace-pre-wrap">{testResponse}</div>
                  ) : (
                    <div className="text-gray-500">
                      {currentAgent
                        ? 'Enter a test question and click "Test Agent"'
                        : 'Please save an agent first before testing'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default CreateAgent;

