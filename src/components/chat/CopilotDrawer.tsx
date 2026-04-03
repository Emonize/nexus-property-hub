'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Sparkles } from 'lucide-react';

interface CopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  role?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function CopilotDrawer({ isOpen, onClose, role = 'owner' }: CopilotDrawerProps) {
  
  const getGreeting = () => {
    if (role === 'vendor') return "Hello! I am your **Vendor Dispatch AI**. I can help you locate jobs and estimate payouts.";
    if (role === 'tenant') return "Hello! I am your **Tenant Support Agent**. I can help you understand your lease and request service.";
    return "Hello! I am your **Rentova AI Copilot**. How can I help you manage your portfolio today?";
  };

  const getTitle = () => {
    if (role === 'vendor') return "Vendor Dispatch AI";
    if (role === 'tenant') return "Tenant Support Agent";
    return "Rentova Copilot";
  };

  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: getGreeting() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        body: JSON.stringify({ messages: [...messages, userMsg] })
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: data.content }]);
      } else {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'An error occurred while connecting to the AI.' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Failed to contact Rentova Copilot.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 9998,
          opacity: isOpen ? 1 : 0, transition: 'opacity 0.3s ease'
        }}
        onClick={onClose}
      />
      <div 
        style={{
          position: 'fixed', top: 0, right: 0, width: '100%', maxWidth: 400,
          height: '100dvh',
          background: 'var(--nexus-bg)', zIndex: 9999,
          boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
          display: 'flex', flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--nexus-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--nexus-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--nexus-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Sparkles size={18} />
            </div>
            <div>
              <h2 style={{ fontWeight: 600, fontSize: 16 }}>{getTitle()}</h2>
              <span style={{ fontSize: 13, color: 'var(--nexus-text-secondary)' }}>Gemini 2.5 Flash</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--nexus-text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Chat Feed */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ 
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: msg.role === 'user' ? '#111' : 'rgba(0, 212, 170, 0.15)',
                color: msg.role === 'user' ? '#fff' : 'var(--nexus-accent)'
              }}>
                {msg.role === 'user' ? <User size={14} /> : <Bot size={16} />}
              </div>
              <div style={{
                maxWidth: '80%', padding: '12px 16px', borderRadius: 16, fontSize: 14, lineHeight: 1.5,
                background: msg.role === 'user' ? 'var(--nexus-accent)' : 'var(--nexus-bg-elevated)',
                color: msg.role === 'user' ? '#fff' : 'var(--nexus-text-primary)',
                borderBottomRightRadius: msg.role === 'user' ? 4 : 16,
                borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 16,
              }}>
                {msg.content.split('**').map((text, i) => (i % 2 === 1 ? <strong key={i}>{text}</strong> : text))}
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0, 212, 170, 0.15)', color: 'var(--nexus-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={16} /></div>
              <div style={{ padding: '12px 16px', borderRadius: 16, background: 'var(--nexus-bg-elevated)', borderBottomLeftRadius: 4 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <div className="dot-pulse" style={{ animationDelay: '0s' }}>•</div>
                  <div className="dot-pulse" style={{ animationDelay: '0.2s' }}>•</div>
                  <div className="dot-pulse" style={{ animationDelay: '0.4s' }}>•</div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '20px 20px calc(20px + env(safe-area-inset-bottom)) 20px', borderTop: '1px solid var(--nexus-border)', background: 'var(--nexus-bg)' }}>
          <form style={{ position: 'relative' }} onSubmit={sendMessage}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Copilot anything..." 
              disabled={isLoading}
              style={{
                width: '100%', padding: '14px 44px 14px 16px', outline: 'none',
                background: 'var(--nexus-bg-elevated)', border: '1px solid var(--nexus-border)',
                borderRadius: 24, fontSize: 14, color: 'var(--nexus-text-primary)'
              }} 
            />
            <button 
              type="submit"
              disabled={!input.trim() || isLoading}
              style={{
                position: 'absolute', right: 6, top: 6, bottom: 6, width: 36,
                background: input.trim() && !isLoading ? 'var(--nexus-accent)' : 'transparent',
                color: input.trim() && !isLoading ? '#fff' : 'var(--nexus-text-secondary)',
                border: 'none', borderRadius: '50%', cursor: input.trim() && !isLoading ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              <Send size={16} style={{ marginLeft: -2 }} />
            </button>
          </form>
          <div style={{ fontSize: 11, textAlign: 'center', color: 'var(--nexus-text-secondary)', marginTop: 12 }}>
            AI can make mistakes. Verify important financial data.
          </div>
        </div>
      </div>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        .dot-pulse { animation: pulse 1s infinite; margin: 0 1px; color: var(--nexus-text-secondary); }
      `}</style>
    </>
  );
}
