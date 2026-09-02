/* AI Copilot Page */
import React, { useState } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';

const QUICK_SUGGESTIONS = [
  'Can we reach Maitri Station within 48 hours?',
  'What is the current iceberg risk along Route Alpha?',
  'Show me the safest route to Bharati Station',
  'When will sea ice concentration drop below 30% on our path?',
  'Compare fuel consumption across all route options',
];

export default function CopilotPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', content: input }]);
    // TODO: Call copilotService.ask(input) and add response
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: 'Copilot is not yet connected to the backend. When connected, I will retrieve real-time data from the CryoNav system to answer your question with citations.',
      },
    ]);
    setInput('');
  };

  return (
    <div style={{ height: 'calc(100vh - var(--topbar-height) - var(--statusbar-height) - var(--space-10))', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <h1 className="page-title"><Bot size={28} style={{ verticalAlign: 'middle' }} /> AI Copilot</h1>
        <p className="page-subtitle">Ask questions grounded in CryoNav system state — Never invents data</p>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Messages */}
        <div className="chat-messages" style={{ flex: 1 }}>
          {messages.length === 0 && (
            <div className="empty-state" style={{ flex: 1 }}>
              <Sparkles size={48} style={{ color: 'var(--color-accent-purple)', opacity: 0.3 }} />
              <h3 className="empty-state-title" style={{ marginTop: 'var(--space-4)' }}>CryoNav Intelligence Assistant</h3>
              <p className="empty-state-description" style={{ marginBottom: 'var(--space-4)' }}>
                Ask about routes, risks, icebergs, weather, or any aspect of your Antarctic mission.
                All answers are backed by real system data.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', justifyContent: 'center' }}>
                {QUICK_SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setInput(q); }}
                    style={{ fontSize: 'var(--font-size-xs)' }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`chat-message ${msg.role === 'user' ? 'user' : 'assistant'}`}>
              {msg.content}
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="chat-input-area">
          <input
            className="chat-input"
            type="text"
            placeholder="Ask CryoNav..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button className="btn btn-primary" onClick={handleSend} disabled={!input.trim()}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
