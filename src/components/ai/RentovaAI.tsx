/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Sparkles, Mic, MicOff, Phone, PhoneOff, Loader2, MessageSquare } from 'lucide-react';

interface RentovaAIProps {
  role?: string;
  userName?: string;
}

type Mode = 'chat' | 'voice';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function RentovaAI({ role = 'owner', userName = 'User' }: RentovaAIProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('chat');
  const [fabHovered, setFabHovered] = useState(false);

  // ── Chat State ──
  const getGreeting = () => {
    if (role === 'vendor') return "Hi! I'm your **Vendor Dispatch AI**. I can help you locate jobs and estimate payouts.";
    if (role === 'tenant') return "Hi! I'm your **Tenant Support Agent**. I can help with your lease, payments, and service requests.";
    return "Hi! I'm your **Rentova AI Copilot**. How can I help manage your portfolio today?";
  };

  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: getGreeting() },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Voice State ──
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [vapi, setVapi] = useState<any>(null);
  const [voiceMessages, setVoiceMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const voiceChatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && mode === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, mode]);

  // ── Voice SDK Init ──
  useEffect(() => {
    let vapiInstance: any = null;
    async function initVapi() {
      try {
        const VapiModule = await import('@vapi-ai/web');
        const Vapi = VapiModule.default;
        vapiInstance = new Vapi('dd698ad7-d46e-41cf-b0cd-c36f1faa09ca');
        setVapi(vapiInstance);

        vapiInstance.on('call-start', () => {
          setIsConnecting(false);
          setIsListening(true);
        });

        vapiInstance.on('call-end', () => {
          setIsListening(false);
          setIsConnecting(false);
          setVoiceMessages(prev => [...prev, { role: 'ai', text: 'Call ended.' }]);
        });

        vapiInstance.on('message', (message: any) => {
          if (message.type === 'transcript' && message.transcriptType === 'final') {
            setVoiceMessages(prev => [...prev, {
              role: message.role === 'user' ? 'user' : 'ai',
              text: message.transcript,
            }]);
            setTimeout(() => {
              voiceChatRef.current?.scrollTo({ top: voiceChatRef.current.scrollHeight, behavior: 'smooth' });
            }, 100);
          }
        });

        vapiInstance.on('error', () => {
          setIsConnecting(false);
          setIsListening(false);
        });
      } catch {
        // Vapi SDK not available
      }
    }
    initVapi();
    return () => { vapiInstance?.stop(); };
  }, []);

  // ── Chat Send ──
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: res.ok ? data.content : 'Something went wrong.',
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Failed to reach Rentova AI.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Voice Toggle ──
  const toggleVoice = () => {
    if (!vapi) return;
    if (isListening || isConnecting) {
      vapi.stop();
    } else {
      setIsConnecting(true);
      const isTenant = role === 'tenant';
      const systemPrompt = isTenant
        ? `You are Rentova, an AI property assistant helping a tenant named ${userName}. Keep responses brief and warm.`
        : `You are Rentova, an AI property management assistant for ${userName}. Keep responses brief and helpful.`;

      vapi.start({
        name: `Rentova AI`,
        firstMessage: isTenant
          ? `Hi ${userName}, I'm Rentova. How can I help you today?`
          : `Hello ${userName}, I'm Rentova. What do you need help with?`,
        model: {
          provider: 'openai',
          model: 'gpt-4',
          messages: [{ role: 'system', content: systemPrompt }],
        },
        voice: { provider: '11labs', voiceId: 'bIHbv24MWmeRgasZH58o' },
      });
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (isListening || isConnecting) vapi?.stop();
  };

  return (
    <>
      {/* ── FAB ── */}
      <button
        onClick={() => setIsOpen(true)}
        onMouseEnter={() => setFabHovered(true)}
        onMouseLeave={() => setFabHovered(false)}
        aria-label="Ask Rentova AI"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9000,
          width: fabHovered ? 'auto' : 56,
          height: 56,
          padding: fabHovered ? '0 20px 0 16px' : 0,
          borderRadius: 28,
          border: 'none',
          cursor: 'pointer',
          background: 'linear-gradient(135deg, #6C63FF, #5046E5)',
          color: '#fff',
          display: isOpen ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          boxShadow: '0 4px 24px rgba(108, 99, 255, 0.4), 0 0 0 0 rgba(108, 99, 255, 0.2)',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          animation: 'fab-glow 3s ease-in-out infinite',
        }}
      >
        <Sparkles size={22} />
        {fabHovered && (
          <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', fontFamily: 'var(--font-body)' }}>
            Ask Rentova
          </span>
        )}
      </button>

      {/* ── Backdrop ── */}
      {isOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)', zIndex: 9998,
            animation: 'fade-in-overlay 0.2s ease',
          }}
          onClick={handleClose}
        />
      )}

      {/* ── Drawer ── */}
      <div style={{
        position: 'fixed',
        bottom: isOpen ? 0 : -700,
        right: 0,
        width: '100%',
        maxWidth: 420,
        height: 'min(85dvh, 700px)',
        zIndex: 9999,
        background: 'var(--nexus-bg)',
        borderRadius: '20px 20px 0 0',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'bottom 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>

        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--nexus-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6C63FF, #5046E5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Rentova AI</div>
              <div style={{ fontSize: 11, color: 'var(--nexus-text-muted)' }}>
                {mode === 'voice' ? (isListening ? 'Listening...' : 'Voice mode') : 'AI Assistant'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Mode Toggle */}
            <div style={{
              display: 'flex', background: 'var(--nexus-bg-elevated)',
              borderRadius: 8, padding: 2, border: '1px solid var(--nexus-border)',
            }}>
              <button
                onClick={() => setMode('chat')}
                style={{
                  padding: '6px 10px', border: 'none', borderRadius: 6, cursor: 'pointer',
                  background: mode === 'chat' ? 'var(--nexus-primary)' : 'transparent',
                  color: mode === 'chat' ? '#fff' : 'var(--nexus-text-muted)',
                  display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600,
                  transition: 'all 0.2s',
                }}
              >
                <MessageSquare size={13} /> Chat
              </button>
              <button
                onClick={() => setMode('voice')}
                style={{
                  padding: '6px 10px', border: 'none', borderRadius: 6, cursor: 'pointer',
                  background: mode === 'voice' ? 'var(--nexus-primary)' : 'transparent',
                  color: mode === 'voice' ? '#fff' : 'var(--nexus-text-muted)',
                  display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600,
                  transition: 'all 0.2s',
                }}
              >
                <Mic size={13} /> Voice
              </button>
            </div>

            <button
              onClick={handleClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--nexus-text-muted)', padding: 4 }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Chat Mode ── */}
        {mode === 'chat' && (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {messages.map((msg) => (
                <div key={msg.id} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: msg.role === 'user' ? 'var(--nexus-bg-hover)' : 'rgba(108, 99, 255, 0.15)',
                    color: msg.role === 'user' ? 'var(--nexus-text-secondary)' : 'var(--nexus-primary-light)',
                  }}>
                    {msg.role === 'user' ? <User size={13} /> : <Bot size={14} />}
                  </div>
                  <div style={{
                    maxWidth: '80%', padding: '10px 14px', borderRadius: 14, fontSize: 13, lineHeight: 1.55,
                    background: msg.role === 'user' ? 'var(--nexus-primary)' : 'var(--nexus-bg-elevated)',
                    color: msg.role === 'user' ? '#fff' : 'var(--nexus-text)',
                    borderBottomRightRadius: msg.role === 'user' ? 4 : 14,
                    borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 14,
                  }}>
                    {msg.content.split('**').map((text, i) => (i % 2 === 1 ? <strong key={i}>{text}</strong> : text))}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(108, 99, 255, 0.15)', color: 'var(--nexus-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bot size={14} />
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: 14, background: 'var(--nexus-bg-elevated)', borderBottomLeftRadius: 4, fontSize: 13 }}>
                    <span style={{ display: 'flex', gap: 3, color: 'var(--nexus-text-muted)' }}>
                      <span className="ai-dot" style={{ animationDelay: '0s' }}>.</span>
                      <span className="ai-dot" style={{ animationDelay: '0.15s' }}>.</span>
                      <span className="ai-dot" style={{ animationDelay: '0.3s' }}>.</span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div style={{ padding: '14px 16px', borderTop: '1px solid var(--nexus-border)' }}>
              <form style={{ position: 'relative' }} onSubmit={sendMessage}>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  disabled={isLoading}
                  style={{
                    width: '100%', padding: '12px 44px 12px 16px', outline: 'none',
                    background: 'var(--nexus-bg-elevated)', border: '1px solid var(--nexus-border)',
                    borderRadius: 20, fontSize: 13, color: 'var(--nexus-text)',
                  }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  style={{
                    position: 'absolute', right: 5, top: 5, bottom: 5, width: 34,
                    background: input.trim() && !isLoading ? 'var(--nexus-primary)' : 'transparent',
                    color: input.trim() && !isLoading ? '#fff' : 'var(--nexus-text-muted)',
                    border: 'none', borderRadius: '50%', cursor: input.trim() ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          </>
        )}

        {/* ── Voice Mode ── */}
        {mode === 'voice' && (
          <>
            <div ref={voiceChatRef} style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {voiceMessages.length === 0 && !isListening && !isConnecting && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--nexus-text-muted)' }}>
                  <Mic size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Tap the button below to start</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Speak naturally — Rentova will respond in real time</div>
                </div>
              )}
              {voiceMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '80%', padding: '10px 14px', borderRadius: 14, fontSize: 13, lineHeight: 1.55,
                    background: msg.role === 'user' ? 'var(--nexus-primary)' : 'var(--nexus-bg-elevated)',
                    color: msg.role === 'user' ? '#fff' : 'var(--nexus-text)',
                    borderBottomRightRadius: msg.role === 'user' ? 4 : 14,
                    borderBottomLeftRadius: msg.role === 'ai' ? 4 : 14,
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isConnecting && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ padding: '10px 14px', borderRadius: 14, background: 'var(--nexus-bg-elevated)', borderBottomLeftRadius: 4, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <Loader2 size={14} className="spin" style={{ color: 'var(--nexus-primary-light)' }} />
                    <span style={{ color: 'var(--nexus-text-muted)' }}>Starting voice call...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Voice Control */}
            <div style={{
              padding: '20px', borderTop: '1px solid var(--nexus-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
            }}>
              <button
                onClick={toggleVoice}
                disabled={!vapi}
                style={{
                  width: 64, height: 64, borderRadius: '50%',
                  border: `3px solid ${(isListening || isConnecting) ? 'var(--nexus-critical)' : 'var(--nexus-primary)'}`,
                  background: (isListening || isConnecting) ? 'rgba(234, 67, 53, 0.1)' : 'rgba(108, 99, 255, 0.1)',
                  color: (isListening || isConnecting) ? 'var(--nexus-critical)' : 'var(--nexus-primary-light)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                  animation: isListening ? 'voice-pulse 1.5s ease-in-out infinite' : 'none',
                }}
              >
                {isConnecting ? <Loader2 size={24} className="spin" /> :
                 isListening ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
              <div style={{ fontSize: 13, color: 'var(--nexus-text-muted)', maxWidth: 200 }}>
                {isConnecting ? 'Connecting...' :
                 isListening ? 'Listening — speak now' :
                 'Tap to start a voice call'}
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes fab-glow {
          0%, 100% { box-shadow: 0 4px 24px rgba(108, 99, 255, 0.35); }
          50% { box-shadow: 0 4px 32px rgba(108, 99, 255, 0.55), 0 0 60px rgba(108, 99, 255, 0.15); }
        }
        @keyframes fade-in-overlay {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes voice-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(108, 99, 255, 0.3); }
          50% { box-shadow: 0 0 0 12px rgba(108, 99, 255, 0); }
        }
        .ai-dot {
          animation: ai-bounce 1s infinite;
          font-weight: 800;
          font-size: 18px;
          line-height: 1;
        }
        @keyframes ai-bounce {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
    </>
  );
}
