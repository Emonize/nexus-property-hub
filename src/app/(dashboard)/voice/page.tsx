'use client';

import { useState } from 'react';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';

export default function VoicePage() {
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Hello! I\'m Rentova, your AI property assistant. You can ask me about rent status, file maintenance tickets, check trust scores, or find available spaces. How can I help you today?' },
  ]);
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');

    // Simulate AI response
    setTimeout(() => {
      let response = 'I\'m processing your request...';
      const lower = userMsg.toLowerCase();

      if (lower.includes('rent') && lower.includes('status')) {
        response = 'For Rentova Tower: 6 of 7 payments received this month. Collection rate is 85.7%. Priya Sharma\'s payment for Bedroom 3 ($900) is still pending.';
      } else if (lower.includes('maintenance') || lower.includes('ticket')) {
        response = 'I\'ve created a maintenance ticket for that issue. The AI triage system has assessed it as high severity, category: plumbing. Estimated repair cost: $280. The property owner has been notified.';
      } else if (lower.includes('trust') || lower.includes('score')) {
        response = 'Here are the current trust scores: Alex Rivera: 820 (Excellent), Jordan Park: 760 (Good), Priya Sharma: 680 (Good). Priya\'s score is impacted by a flagged background check.';
      } else if (lower.includes('available') || lower.includes('vacant')) {
        response = 'I found 2 available spaces: Unit 3C (800 sqft, $2,200/mo) and Garage Bay A (200 sqft, $350/mo). Would you like to schedule a viewing?';
      } else {
        response = 'I can help you with: checking rent status, filing maintenance tickets, viewing trust scores, finding available spaces, and managing lease status. What would you like to do?';
      }

      setMessages(prev => [...prev, { role: 'ai', text: response }]);
    }, 1000);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Voice Agent</h1>
          <p className="page-subtitle">AI-powered voice assistant for property management</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={isListening ? 'btn-danger' : 'btn-primary'} onClick={() => setIsListening(!isListening)}>
            {isListening ? <><PhoneOff size={16} /> End Call</> : <><Phone size={16} /> Start Call</>}
          </button>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="glass-card" style={{ padding: 0, height: 'calc(100vh - 250px)', display: 'flex', flexDirection: 'column' }}>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
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
        </div>

        {/* Input Bar */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--nexus-border)', display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => setIsListening(!isListening)}
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: isListening ? 'rgba(234, 67, 53, 0.15)' : 'rgba(108, 99, 255, 0.1)',
              border: `2px solid ${isListening ? 'var(--nexus-critical)' : 'var(--nexus-primary)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
              color: isListening ? 'var(--nexus-critical)' : 'var(--nexus-primary-light)',
              animation: isListening ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
            }}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <input
            className="nexus-input"
            placeholder="Type a message or use voice..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            style={{ flex: 1 }}
          />
          <button className="btn-primary" onClick={handleSend} style={{ padding: '12px 20px' }}>Send</button>
        </div>
      </div>
    </div>
  );
}
