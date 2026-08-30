'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, ChevronRight, Sparkles } from 'lucide-react';
import FormattedText from './FormattedText';

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
}

export default function ChatWidget({
  titleMain,
  titleAccent,
  welcomeMessage,
  placeholder,
  onAsk,
  onBack,
}: {
  titleMain: string;
  titleAccent: string;
  welcomeMessage: string;
  placeholder: string;
  onAsk: (question: string) => Promise<string>;
  onBack?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 'welcome', role: 'bot', text: welcomeMessage }]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  async function handleAsk() {
    const question = input.trim();
    if (!question || sending) return;

    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: question }]);
    setInput('');
    setSending(true);

    const text = await onAsk(question);
    setMessages((prev) => [...prev, { id: `b-${Date.now()}`, role: 'bot', text }]);
    setSending(false);
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="חזרה למסך הבית"
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-violet-50 hover:text-violet-600 transition shrink-0"
          >
            <ChevronRight size={20} />
          </button>
        )}
        <h2 className="text-lg leading-snug">
          <span className="font-extrabold text-slate-800">{titleMain}</span>{' '}
          <span className="font-medium text-violet-600 text-base align-middle">{titleAccent}</span>
        </h2>
      </div>

      <div className="rounded-2xl bg-violet-50/40 border border-violet-100 flex flex-col overflow-hidden">
        <div id="chat-history" className="flex flex-col gap-3 p-4 min-h-[22rem] max-h-[26rem] overflow-y-auto">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'bot' && (
                <span className="w-7 h-7 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0 me-2">
                  <Sparkles size={13} />
                </span>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  m.role === 'user'
                    ? 'bg-violet-600 text-white rounded-bl-sm leading-relaxed'
                    : 'bg-white text-slate-700 border border-slate-200 rounded-br-sm shadow-sm'
                }`}
              >
                {m.role === 'bot' ? <FormattedText text={m.text} /> : m.text}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <span className="w-7 h-7 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0 me-2">
                <Sparkles size={13} />
              </span>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-br-sm px-4 py-3 flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="flex items-center gap-2 border-t border-violet-100 bg-white p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-xl border border-slate-200 px-3.5 py-3 min-h-[48px] text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            aria-label="שליחת שאלה"
            className="w-11 h-11 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 hover:bg-violet-700 disabled:opacity-40 transition"
          >
            <Send size={17} />
          </button>
        </form>
      </div>
    </section>
  );
}
