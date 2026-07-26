import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import type { ChatMessage } from '../types';
import { MessageSquareCode, Send, Sparkles, RefreshCw, Cpu, User, ChevronDown, ChevronUp, Activity, Newspaper, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ChatPage: React.FC = () => {
  const { activeSymbol, llmStatus } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      content: `Hello! I am your **Krypton AI Copilot**. I analyze market indicators, news sentiment, and portfolio risk parameters in real-time for **${activeSymbol}**. Ask me any question or click "Synthesize Strategy" for a comprehensive reading.`,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [expandedMeta, setExpandedMeta] = useState<Record<string, boolean>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputMessage('');
    setLoading(true);

    try {
      const res = await apiClient.post('/agent/chat', { message: textToSend });
      const data = res.data;

      const botMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        content: data.final_response || 'No response generated.',
        timestamp: new Date(),
        metadata: {
          indicators: data.indicators,
          news_items: data.news_items,
          sentiment_summary: data.sentiment_summary,
          risk_profile: data.risk_profile,
        },
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errText = err.response?.data?.detail || err.message || 'Failed to communicate with LLM agent';
      const botErr: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        content: `⚠️ Error: ${errText}. Please verify your LLM API Key in Settings.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botErr]);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerStrategy = async () => {
    if (loading) return;

    const userMsg: ChatMessage = {
      id: `user-strat-${Date.now()}`,
      sender: 'user',
      content: `Synthesize comprehensive multi-agent trading strategy for ${activeSymbol}`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await apiClient.post('/agent/strategy', {});
      const data = res.data;

      const botMsg: ChatMessage = {
        id: `assistant-strat-${Date.now()}`,
        sender: 'assistant',
        content: data.final_response || 'Strategy generated.',
        timestamp: new Date(),
        metadata: {
          indicators: data.indicators,
          news_items: data.news_items,
          sentiment_summary: data.sentiment_summary,
          risk_profile: data.risk_profile,
        },
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errText = err.response?.data?.detail || err.message || 'Strategy synthesis failed';
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          content: `⚠️ Strategy Error: ${errText}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleMeta = (msgId: string) => {
    setExpandedMeta((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  return (
    <div className="p-6 h-[calc(100vh-4rem)] flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between p-4 rounded-2xl glass-panel border border-indigo-500/20 shadow-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <MessageSquareCode className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              Krypton Multi-Agent LLM Assistant <span className="text-cyan-400 font-mono text-xs">[{activeSymbol}]</span>
            </h1>
            <p className="text-xs text-slate-400">
              Active Provider: <strong className="text-indigo-300">{llmStatus?.provider || 'Configured LLM'}</strong> ({llmStatus?.model_name || 'Active'})
            </p>
          </div>
        </div>

        <button
          onClick={handleTriggerStrategy}
          disabled={loading}
          className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Synthesize Strategy</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isMetaExpanded = expandedMeta[msg.id];
          const hasMetadata = msg.metadata && (msg.metadata.indicators || msg.metadata.news_items || msg.metadata.risk_profile);

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 mt-1">
                  <Cpu className="w-4 h-4 text-cyan-300" />
                </div>
              )}

              <div className={`max-w-2xl rounded-2xl p-4 space-y-2 ${
                isUser
                  ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-600/20 border border-indigo-400/30'
                  : 'glass-panel text-slate-100 rounded-tl-none border border-white/10 shadow-xl'
              }`}>
                <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {msg.content}
                </div>

                {!isUser && hasMetadata && (
                  <div className="pt-2 border-t border-white/10 text-xs">
                    <button
                      onClick={() => toggleMeta(msg.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300 hover:text-indigo-200 transition-colors"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>View Reasoning Context Data</span>
                      {isMetaExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <AnimatePresence>
                      {isMetaExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 p-3 rounded-xl bg-slate-900/80 border border-white/10 space-y-3 text-[11px]"
                        >
                          {msg.metadata?.indicators && (
                            <div>
                              <div className="font-bold text-cyan-400 flex items-center gap-1 mb-1">
                                <Activity className="w-3 h-3" /> Indicators Evaluated:
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono">
                                <div>EMA 20: ${msg.metadata.indicators.ema?.ema20}</div>
                                <div>RSI: {msg.metadata.indicators.rsi?.value}</div>
                                <div>MACD Trend: {msg.metadata.indicators.macd?.trend}</div>
                              </div>
                            </div>
                          )}

                          {msg.metadata?.news_items && (
                            <div>
                              <div className="font-bold text-emerald-400 flex items-center gap-1 mb-1">
                                <Newspaper className="w-3 h-3" /> News Items Evaluated:
                              </div>
                              <div className="text-slate-300">{msg.metadata.news_items.length} news articles scored</div>
                            </div>
                          )}

                          {msg.metadata?.risk_profile && (
                            <div>
                              <div className="font-bold text-amber-400 flex items-center gap-1 mb-1">
                                <ShieldAlert className="w-3 h-3" /> Risk Evaluation:
                              </div>
                              <div className="text-slate-300">Dominant Asset: {msg.metadata.risk_profile.concentration_risk?.dominant_asset}</div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <div className="text-[10px] text-slate-400 text-right font-mono pt-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-slate-300" />
                </div>
              )}
            </motion.div>
          );
        })}

        {loading && (
          <div className="flex gap-3 items-center text-slate-400 text-xs">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
            </div>
            <span className="italic">Krypton AI multi-agent graph is analyzing market indicators & LLM synthesis...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 text-xs shrink-0">
        {[
          `Analyze current RSI & EMA trend for ${activeSymbol}`,
          `What is the sentiment score of latest ${activeSymbol} news?`,
          `Should I enter a long position on ${activeSymbol} now?`,
        ].map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(prompt)}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl glass-card border border-white/10 text-slate-300 hover:text-white hover:border-indigo-500/30 transition-all whitespace-nowrap"
          >
            {prompt}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-3 shrink-0"
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={`Ask Krypton AI assistant about ${activeSymbol}...`}
          className="flex-1 px-4 py-3.5 rounded-2xl glass-input text-sm focus:border-indigo-500"
        />

        <button
          type="submit"
          disabled={loading || !inputMessage.trim()}
          className="p-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-40"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};
