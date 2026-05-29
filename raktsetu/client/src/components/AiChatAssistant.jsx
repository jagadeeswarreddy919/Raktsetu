import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Activity, X } from 'lucide-react';

const DEFAULT_WELCOME =
  'Hello! I am your RaktSetu AI assistant. Ask about blood donation eligibility, diet tips, emergency requests, or how to chat with matched donors.';

const getBotReply = (query) => {
  const q = query.toLowerCase();
  if (q.includes('eligible') || q.includes('can i donate')) {
    return 'To donate, you should be 18–65 years old, weigh at least 45 kg, and be free from active infections. Complete your profile for eligibility checks.';
  }
  if (q.includes('request') || q.includes('emergency') || q.includes('blood need')) {
    return 'Recipients can post blood requests from the dashboard. Donors receive real-time match alerts and can open secure chat to coordinate donation.';
  }
  if (q.includes('chat') || q.includes('message') || q.includes('contact')) {
    return 'When a request is matched or accepted, tap Chat Now on the alert to open a secure 1:1 workspace with the other party.';
  }
  if (q.includes('notification') || q.includes('push') || q.includes('alert')) {
    return 'Enable push notifications from the bell icon to get greeting alerts, blood match updates, and chat messages even when the tab is in the background.';
  }
  if (q.includes('badge') || q.includes('reward') || q.includes('point')) {
    return 'Earn RaktSetu points by pledging to requests and referring donors. Badges unlock as you level up on the donor dashboard.';
  }
  if (q.includes('diet') || q.includes('eat') || q.includes('food') || q.includes('iron')) {
    return 'Before donating: eat iron-rich foods (spinach, dates, lentils), stay hydrated, and avoid fatty meals right before the session.';
  }
  return 'I can help with eligibility, posting requests, enabling notifications, and connecting via chat. What would you like to know?';
};

const AiChatAssistant = ({ title = 'AI Healthcare Assistant', welcome = DEFAULT_WELCOME, accentClass = 'bg-primary-600' }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ sender: 'bot', text: welcome }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userText = input.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, { sender: 'bot', text: getBotReply(userText) }]);
      setTyping(false);
    }, 900);
  };

  const quickPrompt = (text) => setInput(text);

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex flex-col items-end gap-3 print:hidden">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 40 }}
            className="w-[min(100vw-2rem,20rem)] h-96 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className={`p-4 ${accentClass} text-white flex justify-between items-center`}>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider">{title}</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-grow p-4 overflow-y-auto space-y-3 text-[11px]">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`p-2.5 max-w-[85%] rounded-2xl ${
                      msg.sender === 'user'
                        ? `${accentClass} text-white`
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {typing && (
                <p className="text-[10px] text-slate-400 italic">Typing advice...</p>
              )}
            </div>

            <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 flex gap-1 overflow-x-auto text-[9px] font-bold">
              {['Am I eligible?', 'Enable alerts', 'Chat on requests'].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => quickPrompt(label)}
                  className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shrink-0"
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSend} className="p-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about donations, alerts, or chat..."
                className="flex-grow p-2.5 bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-slate-750 text-xs rounded-xl outline-none"
              />
              <button type="submit" className={`px-3 py-2 ${accentClass} text-white font-black text-xs rounded-xl`}>
                Send
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`p-4 ${accentClass} text-white rounded-full shadow-2xl hover:scale-105 transition-all`}
        aria-label="Open AI assistant"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    </div>
  );
};

export default AiChatAssistant;
