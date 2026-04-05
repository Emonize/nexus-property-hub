/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Loader2 } from 'lucide-react';
import Vapi from '@vapi-ai/web';
import toast from 'react-hot-toast';
import { createSpace } from '@/lib/actions/spaces';
import { getCurrentUser } from '@/lib/actions/auth';
import type { UserRole } from '@/types/database';

const VAPI_PUBLIC_KEY = 'dd698ad7-d46e-41cf-b0cd-c36f1faa09ca';

export default function VoicePage() {
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [vapi, setVapi] = useState<any>(null);
  const [userRole, setUserRole] = useState<UserRole | 'tenant'>('owner');
  const [userName, setUserName] = useState<string>('Guest');
  const chatRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Hello! I\'m Rentova, your AI voice assistant. Press Start Call to boot up the Voice pipeline.' },
  ]);

  // Hook into Role
  useEffect(() => {
    async function loadAuth() {
      const profile = await getCurrentUser();
      if (profile) {
        setUserRole(profile.role);
        setUserName(profile.full_name || 'Valued User');
      }
    }
    loadAuth();
  }, []);

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

    vapiInstance.on('message', async (message: any) => {
      // Handle Speech Transcript
      if (message.type === 'transcript' && message.transcriptType === 'final') {
        setMessages(prev => [...prev, { role: message.role === 'user' ? 'user' : 'ai', text: message.transcript }]);
        setTimeout(() => {
          chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
        }, 100);
      }
      
      // Handle Function/Tool Calling
      if (message.type === 'tool-calls' && message.toolCallList) {
        for (const tool of message.toolCallList) {
          // --- OWNER TOOLS ---
          if (tool.function.name === 'createSpace') {
             try {
                toast.loading(`Vapi executing: createSpace...`, { id: 'vapi_tool' });
                const args = tool.function.arguments;
                const parsed = typeof args === 'string' ? JSON.parse(args) : args;
                
                // Fire Server Action
                const res = await createSpace({
                  name: parsed.name,
                  type: parsed.type || 'residential',
                  base_rent: parsed.base_rent || 0,
                  status: 'vacant'
                });

                if (res?.error) throw new Error(res.error);

                toast.success(`Property ${parsed.name} created!`, { id: 'vapi_tool' });
                setMessages(prev => [...prev, { role: 'ai', text: `*[Executed Database Operation: Created Space ${parsed.name}]*` }]);

                vapiInstance.send({
                  type: 'add-message',
                  message: {
                    role: 'tool',
                    tool_call_id: tool.id,
                    content: `Successfully created property ${parsed.name} with ID ${res?.data?.id || 'unknown'}. Tell the user the operation succeeded.`,
                  }
                });
             } catch (e: any) {
                toast.error(`Database Error: ${e.message}`, { id: 'vapi_tool' });
                vapiInstance.send({
                  type: 'add-message',
                  message: {
                    role: 'tool',
                    tool_call_id: tool.id,
                    content: `Failed to create property. Error: ${e.message}. Tell the user it failed.`,
                  }
                });
             }
          }
          
          // --- TENANT TOOLS ---
          if (tool.function.name === 'createTicket') {
             try {
                toast.loading(`Vapi logging maintenance request...`, { id: 'vapi_tool_tenant' });
                const args = tool.function.arguments;
                const parsed = typeof args === 'string' ? JSON.parse(args) : args;

                // Fire real server action
                const { createMaintenanceTicket } = await import('@/lib/actions/maintenance');
                const res = await createMaintenanceTicket({
                  space_id: parsed.space_id || '00000000-0000-0000-0000-000000000000',
                  title: parsed.title,
                  description: parsed.description || '',
                });

                if (res?.error) throw new Error(res.error);

                toast.success(`Ticket logged: ${parsed.title}`, { id: 'vapi_tool_tenant' });
                setMessages(prev => [...prev, { role: 'ai', text: `*[Executed Database Operation: Created Ticket ${parsed.title}]*` }]);

                vapiInstance.send({
                  type: 'add-message',
                  message: {
                    role: 'tool',
                    tool_call_id: tool.id,
                    content: `Successfully logged maintenance request for ${parsed.title} with ID ${res?.data?.id || 'unknown'}. Tell the user the ticket was submitted to the landlord.`,
                  }
                });
             } catch (e: any) {
                toast.error(`Ticket Error: ${e.message}`, { id: 'vapi_tool_tenant' });
                vapiInstance.send({
                  type: 'add-message',
                  message: {
                    role: 'tool',
                    tool_call_id: tool.id,
                    content: `Failed to log ticket. Error: ${e.message}.`,
                  }
                });
             }
          }
        }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCall = () => {
    if (isListening || isConnecting) {
      vapi?.stop();
    } else {
      setIsConnecting(true);

      // Map dynamic Agent payload based on User Role Auth
      const isTenant = userRole === 'tenant';

      const systemPrompt = isTenant
        ? `You are Rentova, an AI property assistant helping a tenant named ${userName}. Keep responses extremely brief and warm. You have authorization to log maintenance requests via the createTicket tool. If they report an issue, use the createTicket tool.`
        : `You are Rentova, an AI property management assistant for the landlord ${userName}. You keep responses brief and helpful. You have authorization to create properties via the createSpace tool. If a user asks to add a property, always use the createSpace tool directly.`;

      const toolsPayload = isTenant 
        ? [
            {
              type: "function",
              function: {
                name: "createTicket",
                description: "Create a new maintenance request or issue ticket. Call this whenever the tenant reports something broken.",
                parameters: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "A very brief 3 word title of the issue." },
                    description: { type: "string", description: "The full details of the broken item." }
                  },
                  required: ["title"]
                }
              }
            }
          ]
        : [
            {
              type: "function",
              function: {
                name: "createSpace",
                description: "Create a new property/space in the database. Call this whenever the owner asks to add a property.",
                parameters: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "The name of the property" },
                    type: { type: "string", enum: ["residential", "commercial", "storage", "parking"], description: "The category type of the property" },
                    base_rent: { type: "number", description: "The numerical monthly rent value in dollars" }
                  },
                  required: ["name", "type", "base_rent"]
                }
              }
            }
          ];

      vapi?.start({
        name: isTenant ? `Rentova AI [Tenant: ${userName}]` : `Rentova AI [Owner Setup]`,
        firstMessage: isTenant 
          ? `Hi ${userName}, I am Rentova. I can help you check your lease or file a maintenance request.`
          : `Hello ${userName}, I am the Rentova AI. What property information do you need today?`,
        model: {
          provider: "openai",
          model: "gpt-4",
          messages: [{
            role: "system",
            content: systemPrompt
          }],
          tools: toolsPayload as any // Hard typing override for dynamic Vapi config
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
          <p className="page-subtitle">Real-time WebRTC AI Assistant via Vapi Integration ({userRole})</p>
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
