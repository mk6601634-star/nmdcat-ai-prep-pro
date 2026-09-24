import React, { useState, useEffect } from 'react';
import UiCard from './UiCard';
import { User } from '../lib/firebase';
import {
  Cpu,
  Sparkles,
  Zap,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Play,
  Layers,
  Database,
  ShieldCheck,
  Server,
  ArrowRight,
  TrendingUp,
  Clock,
  Send
} from 'lucide-react';

export type AIProviderId = 'gemini' | 'cerebras' | 'groq' | 'longcat';
export type AIMode = 'auto' | 'gemini' | 'cerebras' | 'groq' | 'longcat';

interface ModelDefinition {
  id: string;
  provider: AIProviderId;
  name: string;
  capabilities: {
    text: boolean;
    json: boolean;
    vision: boolean;
    fastInference?: boolean;
    deepReasoning?: boolean;
  };
  contextLimit?: number;
  supportsStructuredOutput?: boolean;
  isEnabled: boolean;
  recommendedTasks: string[];
  description?: string;
}

interface ProviderHealth {
  providerId: AIProviderId;
  name: string;
  isConfigured: boolean;
  isAvailable: boolean;
  latencyMs?: number;
  lastChecked?: string;
  lastError?: string;
}

interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  fallbackCount: number;
  totalLatencyMs: number;
  averageLatencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  hasTokenTracking: boolean;
  lastUsed?: string;
  lastError?: string;
}

interface AIConfigData {
  mode: AIMode;
  defaultProvider: AIProviderId;
  defaultModel: Record<AIProviderId, string>;
  fallbackOrder: AIProviderId[];
  fallbackEnabled: boolean;
  autoRoutingEnabled: boolean;
  cachingEnabled: boolean;
}

interface AdminAiModelShifterProps {
  currentUser?: User | null;
}

export const AdminAiModelShifter: React.FC<AdminAiModelShifterProps> = ({ currentUser }) => {
  const [config, setConfig] = useState<AIConfigData | null>(null);
  const [models, setModels] = useState<ModelDefinition[]>([]);
  const [providers, setProviders] = useState<ProviderHealth[]>([]);
  const [metrics, setMetrics] = useState<Record<AIProviderId, ProviderMetrics> | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  const [selectedMode, setSelectedMode] = useState<AIMode>('auto');
  const [selectedModels, setSelectedModels] = useState<Record<AIProviderId, string>>({
    gemini: 'gemini-2.5-flash',
    cerebras: 'llama3.1-8b',
    groq: 'openai/gpt-oss-20b',
    longcat: 'longcat-default'
  });
  const [fallbackEnabled, setFallbackEnabled] = useState<boolean>(true);
  const [autoRoutingEnabled, setAutoRoutingEnabled] = useState<boolean>(true);
  const [cachingEnabled, setCachingEnabled] = useState<boolean>(true);

  const [testProvider, setTestProvider] = useState<AIProviderId>('gemini');
  const [testModel, setTestModel] = useState<string>('');
  const [testPrompt, setTestPrompt] = useState<string>('Explain the biochemical mechanism of ATP production in mitochondria.');
  const [testJsonMode, setTestJsonMode] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const fetchConfig = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    try {
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/admin/ai-config', {
        headers: { Authorization: 'Bearer ' + token }
      });

      if (!res.ok) {
        throw new Error('Failed to load AI configuration (' + res.status + ')');
      }

      const data = await res.json();
      setConfig(data.config);
      setModels(data.models || []);
      setProviders(data.providers || []);
      setMetrics(data.metrics || null);

      if (data.config) {
        setSelectedMode(data.config.mode || 'auto');
        setSelectedModels(data.config.defaultModel || {});
        setFallbackEnabled(data.config.fallbackEnabled !== false);
        setAutoRoutingEnabled(data.config.autoRoutingEnabled !== false);
        setCachingEnabled(data.config.cachingEnabled !== false);
      }
    } catch (err: any) {
      console.error('Failed to fetch AI config:', err);
      setSaveErrorMsg(err.message || 'Error connecting to AI Gateway');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [currentUser]);

  const handleSaveConfig = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    try {
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/admin/ai-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({
          mode: selectedMode,
          defaultModel: selectedModels,
          fallbackEnabled,
          autoRoutingEnabled,
          cachingEnabled
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Server rejected update (' + res.status + ')');
      }

      const data = await res.json();
      setConfig(data.config);
      setSaveSuccessMsg('AI Gateway Configuration successfully applied & persisted!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      setSaveErrorMsg(err.message || 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunTest = async () => {
    if (!currentUser || !testPrompt.trim()) return;
    setIsTesting(true);
    setTestResult(null);
    setTestError(null);

    try {
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/admin/ai-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({
          provider: testProvider,
          model: testModel || selectedModels[testProvider],
          prompt: testPrompt,
          jsonMode: testJsonMode
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Test call failed (' + res.status + ')');
      }

      const data = await res.json();
      setTestResult(data.result);
    } catch (err: any) {
      setTestError(err.message || 'Test generation failed');
    } finally {
      setIsTesting(false);
    }
  };

  const modelsForProvider = (providerId: AIProviderId) =>
    models.filter(m => m.provider === providerId);

  return (
    <div className="space-y-6">
      <UiCard className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950/80 via-slate-950 to-slate-900 border-indigo-500/20">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Cpu className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Multi-Provider AI Gateway & Model Shifter
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-100">
              Autonomous AI Engine & Telemetry Control
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Switch providers instantly between Google Gemini, Cerebras Cloud, Groq, and LongCat.
              Manage automated task routing, fallback resilience chains, and monitor token usage in real time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchConfig}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 flex items-center gap-2 transition-all"
            >
              <RefreshCw className={'w-3.5 h-3.5 ' + (isLoading ? 'animate-spin text-indigo-400' : '')} />
              <span>Refresh Telemetry</span>
            </button>
            <button
              onClick={handleSaveConfig}
              disabled={isSaving || isLoading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-slate-950 text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sliders className="w-4 h-4" />}
              <span>Save AI Configuration</span>
            </button>
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {saveErrorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>{saveErrorMsg}</span>
          </div>
        )}
      </UiCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {providers.map(p => {
          const providerModels = modelsForProvider(p.providerId);
          const pMetrics = metrics ? metrics[p.providerId] : null;

          return (
            <UiCard
              key={p.providerId}
              className={'p-5 rounded-2xl border transition-all ' + (
                selectedMode === p.providerId
                  ? 'border-indigo-500/50 bg-indigo-950/20 shadow-lg shadow-indigo-500/10'
                  : 'border-slate-800 bg-slate-900/60'
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h4 className="text-sm font-bold text-slate-100">{p.name}</h4>
                </div>
                {p.isConfigured ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Active</span>
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-slate-800 text-slate-400 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    <span>No Key</span>
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Inference Latency:</span>
                  <span className="font-mono text-slate-200">
                    {p.latencyMs ? p.latencyMs + ' ms' : 'Live standby'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Registered Models:</span>
                  <span className="font-semibold text-slate-300">{providerModels.length} models</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Total Requests:</span>
                  <span className="font-mono text-slate-300">{pMetrics ? pMetrics.totalRequests : 0}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Success Rate:</span>
                  <span className="font-mono text-emerald-400">
                    {pMetrics && pMetrics.totalRequests > 0
                      ? Math.round((pMetrics.successfulRequests / pMetrics.totalRequests) * 100) + '%'
                      : '100%'}
                  </span>
                </div>
              </div>
            </UiCard>
          );
        })}
      </div>

      <UiCard className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>AI Operating Mode (Model Shifter)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Choose whether the server dynamically routes tasks across providers or locks all generation to a specific provider.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {[
            { id: 'auto', title: 'Auto Router', desc: 'Dynamic task routing + instant failover', icon: Sparkles, color: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/40 text-indigo-300' },
            { id: 'gemini', title: 'Google Gemini', desc: 'Deep reasoning & PRISM grounding', icon: Cpu, color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/40 text-blue-300' },
            { id: 'cerebras', title: 'Cerebras Cloud', desc: 'Ultra-fast sub-100ms LPU throughput', icon: Zap, color: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300' },
            { id: 'groq', title: 'Groq Cloud', desc: 'High-speed open model cascade', icon: Activity, color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300' },
            { id: 'longcat', title: 'LongCat AI', desc: 'Custom / OpenAI-compatible endpoint', icon: Server, color: 'from-purple-500/20 to-pink-500/20 border-purple-500/40 text-purple-300' }
          ].map(m => {
            const Icon = m.icon;
            const isSelected = selectedMode === m.id;

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMode(m.id as AIMode)}
                className={'p-4 rounded-2xl border text-left transition-all relative ' + (
                  isSelected
                    ? 'bg-gradient-to-br ' + m.color + ' border-2 shadow-lg shadow-indigo-500/10'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-400'
                )}
              >
                {isSelected && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                )}
                <Icon className={'w-5 h-5 mb-2 ' + (isSelected ? 'text-white' : 'text-slate-400')} />
                <h4 className={'text-xs font-bold ' + (isSelected ? 'text-slate-100' : 'text-slate-300')}>
                  {m.title}
                </h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-snug">{m.desc}</p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-800">
          {(['gemini', 'cerebras', 'groq', 'longcat'] as AIProviderId[]).map(pId => {
            const pModels = modelsForProvider(pId);

            return (
              <div key={pId} className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 capitalize flex items-center justify-between">
                  <span>{pId} Default Model</span>
                  <span className="text-[10px] text-slate-400">{pModels.length} available</span>
                </label>
                <select
                  value={selectedModels[pId] || ''}
                  onChange={e => setSelectedModels(prev => ({ ...prev, [pId]: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {pModels.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
          <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={fallbackEnabled}
              onChange={e => setFallbackEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-500 focus:ring-0 bg-slate-900 border-slate-700"
            />
            <div>
              <span className="text-xs font-bold text-slate-200 block">Transient 0ms Failover</span>
              <span className="text-[10px] text-slate-400">Auto-switch on 429 quota or capacity timeouts</span>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={autoRoutingEnabled}
              onChange={e => setAutoRoutingEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-500 focus:ring-0 bg-slate-900 border-slate-700"
            />
            <div>
              <span className="text-xs font-bold text-slate-200 block">Task-Aware Smart Routing</span>
              <span className="text-[10px] text-slate-400">Routes MCQs to Cerebras, PRISM to Gemini</span>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={cachingEnabled}
              onChange={e => setCachingEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-500 focus:ring-0 bg-slate-900 border-slate-700"
            />
            <div>
              <span className="text-xs font-bold text-slate-200 block">Deterministic Cache (15m)</span>
              <span className="text-[10px] text-slate-400">Caches non-private syllabus queries to save quota</span>
            </div>
          </label>
        </div>
      </UiCard>

      <UiCard className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Live Provider Usage & Token Telemetry</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified server-side request counts, latency benchmarks, and token consumption.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Requests</th>
                <th className="px-4 py-3">Success / Fail</th>
                <th className="px-4 py-3">Avg Latency</th>
                <th className="px-4 py-3">Token Usage</th>
                <th className="px-4 py-3">Failovers</th>
                <th className="px-4 py-3">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(['gemini', 'cerebras', 'groq', 'longcat'] as AIProviderId[]).map(pId => {
                const p = providers.find(x => x.providerId === pId);
                const m = metrics ? metrics[pId] : null;

                return (
                  <tr key={pId} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3.5 font-bold text-slate-100 capitalize flex items-center gap-2">
                      <span
                        className={'w-2 h-2 rounded-full ' + (
                          p && p.isConfigured ? 'bg-emerald-400' : 'bg-slate-600'
                        )}
                      />
                      <span>{p ? p.name : pId}</span>
                    </td>
                    <td className="px-4 py-3.5 font-mono">{m ? m.totalRequests : 0}</td>
                    <td className="px-4 py-3.5 font-mono">
                      <span className="text-emerald-400">{m ? m.successfulRequests : 0}</span>
                      <span className="text-slate-400"> / </span>
                      <span className="text-rose-400">{m ? m.failedRequests : 0}</span>
                    </td>
                    <td className="px-4 py-3.5 font-mono">
                      {m && m.averageLatencyMs ? m.averageLatencyMs + ' ms' : '—'}
                    </td>
                    <td className="px-4 py-3.5 font-mono">
                      {m && m.totalTokens > 0 ? (
                        <span>
                          {m.totalTokens.toLocaleString()}{' '}
                          <span className="text-[10px] text-slate-400">
                            (in: {m.inputTokens.toLocaleString()}, out: {m.outputTokens.toLocaleString()})
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Usage unavailable</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-amber-400">{m ? m.fallbackCount : 0}</td>
                    <td className="px-4 py-3.5 text-slate-400">
                      {m && m.lastUsed ? new Date(m.lastUsed).toLocaleTimeString() : 'Idle'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </UiCard>

      <UiCard className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Play className="w-4 h-4 text-purple-400" />
            <span>Interactive Provider & Model Sandbox</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Directly test prompt responses, latency, and structured outputs on any configured adapter.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Test Provider</label>
            <select
              value={testProvider}
              onChange={e => {
                const nextP = e.target.value as AIProviderId;
                setTestProvider(nextP);
                const pModels = modelsForProvider(nextP);
                if (pModels.length > 0) setTestModel(pModels[0].id);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
            >
              <option value="gemini">Google Gemini</option>
              <option value="cerebras">Cerebras Cloud</option>
              <option value="groq">Groq Cloud</option>
              <option value="longcat">LongCat AI</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Model Override</label>
            <select
              value={testModel || selectedModels[testProvider] || ''}
              onChange={e => setTestModel(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
            >
              {modelsForProvider(testProvider).map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-300 w-full cursor-pointer">
              <input
                type="checkbox"
                checked={testJsonMode}
                onChange={e => setTestJsonMode(e.target.checked)}
                className="w-4 h-4 rounded text-purple-500 focus:ring-0 bg-slate-900 border-slate-700"
              />
              <span>JSON Structured Output</span>
            </label>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1 block">Test Prompt</label>
          <textarea
            value={testPrompt}
            onChange={e => setTestPrompt(e.target.value)}
            rows={3}
            placeholder="Type a test question or prompt..."
            className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {testResult && (
              <span className="text-emerald-400">
                ✅ Generated in {testResult.latencyMs}ms via {testResult.provider} ({testResult.model})
              </span>
            )}
            {testError && <span className="text-rose-400">❌ {testError}</span>}
          </span>

          <button
            onClick={handleRunTest}
            disabled={isTesting || !testPrompt.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white text-xs font-bold shadow-lg shadow-purple-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
            {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Execute Test Request</span>
          </button>
        </div>

        {testResult && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-2">
              <span>Model Output Preview:</span>
              <span>Tokens: {testResult.usage && testResult.usage.totalTokens ? testResult.usage.totalTokens : 'N/A'}</span>
            </div>
            <pre className="text-xs text-slate-200 whitespace-pre-wrap font-sans max-h-60 overflow-y-auto leading-relaxed">
              {testResult.text}
            </pre>
          </div>
        )}
      </UiCard>
    </div>
  );
};

export default AdminAiModelShifter;