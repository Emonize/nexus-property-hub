'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Loader2 } from 'lucide-react';
import Vapi from '@vapi-ai/web';
import toast from 'react-hot-toast';

const VAPI_PUBLIC_KEY = 'dd698ad7-d46e-41cf-b0cd-c36f1faa09ca';

export default function VoicePage() {
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [vapi, setVapi] = useState<any>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Hello! I\'m Rentova, your AI voice assistant. Press Start Call to boot up the Voice pipeline.' },
  ]);

  // Hook into Vapi on mount
  useEffect(() => {
    const vapiInstance = new Vapi(VAPI_PUBLIC_KEY);
    setVapi(vapiInstance);

    vapiInstance.on('call-start', () => {
      setIsConnecting(false);
      setIsListening(true);
      toast.success("Connected to Rentova Voice SDK");
    });

    vapiInstance.on('call-end', () => {
      setIsListening(false);
      setIsConnecting(false);
      setMessages(prev => [...prev, { role: 'ai', text: 'Call disconnected.' }]);
    });

    vapiInstance.on('message', (message: any) => {
      if (message.type === 'transcript' && message.transcriptType === 'final') {
        setMessages(prev => [...prev, { role: message.role === 'user' ? 'user' : 'ai', text: message.transcript }]);
        setTimeout(() => {
          chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
        }, 100);
      }
    });

    vapiInstance.on('error', (e: any) => {
      console.error(e);
      setIsConnecting(false);
      setIsListening(false);
      toast.error(e.message || "Hardware connection failed. Check microphones.");
    });

    return () => {
      vapiInstance.stop();
    };
  }, []);

  const toggleCall = () => {
    if (isListening || isConnecting) {
      vapi?.stop();
    } else {
      setIsConnecting(true);
      vapi?.start({
        name: "Rentova Assistant",
        firstMessage: "Hello, I am the Rentova AI. What property information do you need today?",
        model: {
          provider: "openai",
          model: "gpt-4",
          messages: [{
            role: "system",
            content: "You are an AI assistant for a property management software called Rentova. You keep responses brief and helpful."
          }]
        },
        voice: {
          provider: "11labs",
          voiceId: "bIHbv24MWmeRgasZH58o" // standard 11labs voice
        }
      });
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Voice Agent</h1>
          <p className="page-subtitle">Real-time WebRTC AI Assistant via Vapi Integration</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            className={(isListening || isConnecting) ? 'btn-danger' : 'btn-primary'} 
            onClick={toggleCall}
            disabled={!vapi}
          >
            {isConnecting && <Loader2 size={16} className="spin" />}
            {!isConnecting && isListening && <><PhoneOff size={16} /> End Call</>}
            {!isConnecting && !isListening && <><Phone size={16} /> Start Call</>}
          </button>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="glass-card" style={{ padding: 0, height: 'calc(100vh - 250px)', display: 'flex', flexDirection: 'column' }}>
        {/* Messages */}
        <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map((msg, i) => (
            <div key={i} className="slide-up" style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '70%',
                padding: '14px 18px',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: msg.role === 'user' ? 'var(--nexus-primary)' : 'var(--nexus-bg-card)',
                border: msg.role === 'ai' ? '1px solid var(--nexus-border)' : 'none',
                color: 'var(--nexus-text)',
                fontSize: 14,
                lineHeight: 1.6,
              }}>
                {msg.text}
              </div>
            </div>
          ))}
          {isConnecting && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
               <div style={{ padding: '14px 18px', background: 'var(--nexus-bg-card)', borderRadius: '18px 18px 18px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Loader2 size={14} className="spin" style={{ color: 'var(--nexus-accent)' }} /> 
                  <span style={{ fontSize: 13, color: 'var(--nexus-text-secondary)' }}>Dialing Vapi Servers...</span>
               </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--nexus-border)', display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={toggleCall}
            disabled={!vapi}
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: (isListening || isConnecting) ? 'rgba(234, 67, 53, 0.15)' : 'rgba(108, 99, 255, 0.1)',
              border: `2px solid ${(isListening || isConnecting) ? 'var(--nexus-critical)' : 'var(--nexus-primary)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
              color: (isListening || isConnecting) ? 'var(--nexus-critical)' : 'var(--nexus-primary-light)',
              animation: isListening ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
            }}
            aria-label="Toggle Microphone"
          >
            {(isListening || isConnecting) ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          
          <div style={{ flex: 1, padding: '12px 16px', background: 'var(--nexus-bg-elevated)', borderRadius: 8, border: '1px solid var(--nexus-border)', fontSize: 14, color: 'var(--nexus-text-muted)' }}>
            {isListening ? 'Speak directly into your microphone, the AI is listening...' : 'Press Start Call or tap the microphone to connect.'}
          </div>
        </div>
      </div>
    </div>
  );
}
