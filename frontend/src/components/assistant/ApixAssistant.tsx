import { useEffect, useRef, useState } from 'react';
import { Bot, ChevronRight, CircleHelp, ExternalLink, MessageCircle, Minus, Navigation, Send, Sparkles, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getAirfares,
  getHealth,
  getMethodology,
  getNationalHistory,
  getPipelineRuns,
  getQuality,
  getRoutes,
} from '../../api/api';
import type { Methodology } from '../../api/types';

type Message = {
  id: number;
  role: 'assistant' | 'user';
  text: string;
  action?: { label: string; path: string };
};

const QUICK = [
  'What is the current APIx?',
  'Why is coverage 95%?',
  'Explain this page',
  'How is APIx calculated?',
];

const ROUTES: Record<string, { path: string; label: string }> = {
  dashboard: { path: '/dashboard', label: 'Dashboard' },
  home: { path: '/dashboard', label: 'Dashboard' },
  routes: { path: '/routes', label: 'Route Explorer' },
  route: { path: '/routes', label: 'Route Explorer' },
  analytics: { path: '/analytics', label: 'Analytics' },
  quality: { path: '/quality', label: 'Data Quality' },
  data: { path: '/quality', label: 'Data Quality' },
  pipeline: { path: '/pipeline', label: 'Collection Pipeline' },
  collection: { path: '/pipeline', label: 'Collection Pipeline' },
  backtesting: { path: '/backtesting', label: 'Backtesting' },
  backtest: { path: '/backtesting', label: 'Backtesting' },
  methodology: { path: '/methodology', label: 'Methodology' },
  system: { path: '/system', label: 'System Status' },
  status: { path: '/system', label: 'System Status' },
};

function money(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function pageName(pathname: string) {
  const names: Record<string, string> = {
    '/routes': 'Route Explorer',
    '/analytics': 'Analytics',
    '/quality': 'Data Quality',
    '/pipeline': 'Collection Pipeline',
    '/backtesting': 'Backtesting',
    '/methodology': 'Methodology',
    '/system': 'System Status',
  };
  return names[pathname] || 'Dashboard';
}

function classify(q: string) {
  const text = q.toLowerCase().trim();

  if (text.startsWith('go to ') || text.startsWith('take me to ') || text.startsWith('open ') || text.startsWith('show me ')) {
    for (const [key, route] of Object.entries(ROUTES)) {
      if (text.includes(key)) return { type: 'navigate' as const, ...route };
    }
    if (text.includes('data quality')) return { type: 'navigate' as const, ...ROUTES.quality };
    if (text.includes('route explorer')) return { type: 'navigate' as const, ...ROUTES.routes };
    if (text.includes('collection pipeline')) return { type: 'navigate' as const, ...ROUTES.pipeline };
    if (text.includes('system status')) return { type: 'navigate' as const, ...ROUTES.system };
  }

  if (text.includes('explain this page') || text.includes('what am i looking at') || text.includes('what is this page')) {
    return { type: 'page_help' as const };
  }

  if (
    text.includes('how is apix') ||
    text.includes('how does apix') ||
    text.includes('calculate') ||
    text.includes('formula') ||
    text.includes('route weight') ||
    text.includes('weights')
  ) {
    return { type: 'methodology' as const };
  }

  if (
    text.includes('apix') ||
    text.includes('index') ||
    text.includes('coverage') ||
    text.includes('observation') ||
    text.includes('fare') ||
    text.includes('price') ||
    text.includes('lead time') ||
    text.includes('t+1') ||
    text.includes('t+7') ||
    text.includes('t+15') ||
    text.includes('t+21') ||
    text.includes('t+30') ||
    text.includes('t+45') ||
    text.includes('pipeline') ||
    text.includes('collection') ||
    text.includes('quality') ||
    text.includes('outlier') ||
    text.includes('backtest') ||
    text.includes('route')
  ) {
    return { type: 'live' as const, question: text };
  }

  return { type: 'unknown' as const };
}

function explainPage(pathname: string) {
  const explanations: Record<string, string> = {
    '/dashboard':
      'The Dashboard is the executive view of APIx. It combines the current national airfare signal with route coverage, observation volume, the reference route and lead-time pricing behavior.',
    '/routes':
      'Route Explorer lets you inspect a directional route, including its APIx history, coverage, lead-time windows, observations and route metadata.',
    '/analytics':
      'Analytics is for interpreting market behavior: route movement, lead-time pricing patterns and analytical signals derived from collected observations.',
    '/quality':
      'Data Quality shows whether collected airfare observations are suitable for index calculation. Flagged records remain stored for auditability but are excluded from index calculations.',
    '/pipeline':
      'Collection Pipeline shows the operational path from collection through validation, cleaning, database import and index generation. It reports actual persisted runs.',
    '/backtesting':
      'Backtesting compares APIx movement with a legitimate independent reference series. Missing historical periods are preserved instead of being fabricated.',
    '/methodology':
      'Methodology explains how APIx converts live airfare observations into route and national indicators, including lead-time windows, geometric-mean aggregation and DGCA route weights.',
    '/system':
      'System Status is the operational health view. It reports backend/database availability, source capability and the latest pipeline state.',
  };
  return explanations[pathname] || explanations['/dashboard'];
}

async function liveAnswer(question: string) {
  const [national, quality, routes, pipeline] = await Promise.all([
    getNationalHistory(5),
    getQuality(),
    getRoutes(),
    getPipelineRuns(1),
  ]);

  const latest = national[0];

  if (question.includes('coverage')) {
    if (!latest) return { text: 'A national coverage snapshot is not available yet.' };
    return {
      text:
        `Current weighted route coverage is ${pct(latest.route_coverage_ratio)}. ` +
        `${latest.routes_used} of ${latest.routes_expected} configured routes contribute to the published national index. ` +
        `Missing routes are not fabricated; covered-route weights are renormalized.`,
    };
  }

  if (question.includes('quality') || question.includes('outlier') || question.includes('valid')) {
    return {
      text:
        `The database contains ${quality.observations_total.toLocaleString('en-IN')} observations. ` +
        `${quality.observations_valid.toLocaleString('en-IN')} are valid (${pct(quality.valid_rate)}), ` +
        `and ${quality.observations_flagged.toLocaleString('en-IN')} are flagged. ` +
        `Flagged observations remain stored for auditability but are excluded from index calculations.`,
    };
  }

  if (question.includes('pipeline') || question.includes('collection')) {
    const run = pipeline[0];
    if (!run) return { text: 'No persisted pipeline run is currently available.' };
    return {
      text:
        `The latest recorded pipeline started ${formatDate(run.started_at)}. ` +
        `Status: ${run.status}. It requested ${run.routes_requested} routes, ` +
        `succeeded on ${run.routes_succeeded}, failed on ${run.routes_failed}, ` +
        `and collected ${run.observations_collected.toLocaleString('en-IN')} observations.`,
      action: { label: 'Open Collection Pipeline', path: '/pipeline' },
    };
  }

  if (question.includes('route')) {
    return {
      text: `The configured APIx basket currently contains ${routes.length} directional routes. Use Route Explorer to inspect an individual route.`,
      action: { label: 'Open Route Explorer', path: '/routes' },
    };
  }

  if (question.includes('t+1') || question.includes('t+7') || question.includes('t+15') || question.includes('t+21') || question.includes('t+30') || question.includes('t+45') || question.includes('lead time') || question.includes('fare')) {
    const fares = await getAirfares({ quality_status: 'valid', limit: 5000 });
    const stats = [1, 7, 15, 21, 30, 45].map(days => {
      const rows = fares.filter(x => x.advance_days === days);
      const avg = rows.length ? rows.reduce((sum, x) => sum + x.total_fare, 0) / rows.length : null;
      return { days, avg, count: rows.length };
    }).filter(x => x.avg !== null);

    if (!stats.length) return { text: 'There are not enough valid airfare observations for a lead-time summary yet.' };

    return {
      text:
        `Current valid-observation averages are ${stats.map(x => `T+${x.days}: ${money(x.avg as number)} (${x.count} obs)`).join('; ')}. ` +
        `This is descriptive market behavior, not a causal estimate.`,
    };
  }

  if (question.includes('backtest')) {
    return {
      text: 'Backtesting compares APIx movement with a legitimate independent reference series. If enough overlapping history is not available, the backend reports that limitation rather than fabricating a result.',
      action: { label: 'Open Backtesting', path: '/backtesting' },
    };
  }

  if (question.includes('current') || question.includes('now') || question.includes('national') || question.includes('what is apix')) {
    if (!latest) return { text: 'A national APIx snapshot is not available yet.' };

    const baseChange = (((latest.index / 100) - 1) * 100).toFixed(3);
    const previous = national.length > 1 ? national[1] : null;
    const movement = previous ? latest.index - previous.index : null;

    return {
      text:
        `The latest National APIx is ${latest.index.toFixed(4)}. ` +
        `With 100 as the prototype base, that is ${baseChange}% relative to the base. ` +
        `${movement === null ? 'There is not yet enough stored national history for a snapshot-to-snapshot movement.' : `The change from the previous stored snapshot is ${movement >= 0 ? '+' : ''}${movement.toFixed(4)} index points.`} ` +
        `Coverage is ${pct(latest.route_coverage_ratio)} across ${latest.routes_used}/${latest.routes_expected} routes, using ${latest.observations_used.toLocaleString('en-IN')} observations.`,
    };
  }

  return {
    text: 'I can answer questions about the current APIx data, methodology, quality and collection pipeline. Try “What is the current APIx?” or “Why is coverage 95%?”',
  };
}

export default function ApixAssistant() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'assistant',
      text: 'Hi! I’m the APIx Assistant. I can explain the live airfare index, help you navigate the portal, and answer questions using the current backend data.',
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    setMinimized(false);
  }, [location.pathname]);

  const addMessage = (message: Omit<Message, 'id'>) => {
    setMessages(prev => [...prev, { ...message, id: Date.now() + Math.random() }]);
  };

  const ask = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;

    setInput('');
    addMessage({ role: 'user', text });
    setBusy(true);

    try {
      const intent = classify(text);

      if (intent.type === 'navigate') {
        addMessage({
          role: 'assistant',
          text: `Sure — opening ${intent.label}.`,
          action: { label: `Open ${intent.label}`, path: intent.path },
        });
        window.setTimeout(() => navigate(intent.path), 250);
      } else if (intent.type === 'page_help') {
        addMessage({ role: 'assistant', text: explainPage(location.pathname) });
      } else if (intent.type === 'methodology') {
        const m: Methodology = await getMethodology();
        addMessage({
          role: 'assistant',
          text:
            `APIx uses ${m.base_index} as its base index and currently uses ${m.lead_time_windows.map(x => `T+${x}`).join(', ')} lead-time windows. ` +
            `${m.elementary_formula} ${m.national_aggregation} Missing sources are recorded rather than replaced with fabricated fares.`,
          action: { label: 'Open Methodology', path: '/methodology' },
        });
      } else if (intent.type === 'live') {
        const answer = await liveAnswer(intent.question);
        addMessage({ role: 'assistant', text: answer.text, action: answer.action });
      } else {
        addMessage({
          role: 'assistant',
          text: 'I’m focused on APIx navigation and factual explanations. Try “What is the current APIx?”, “Why is coverage 95%?”, “How is APIx calculated?”, or “Explain this page”.',
        });
      }
    } catch (error) {
      addMessage({
        role: 'assistant',
        text: error instanceof Error ? `I couldn't retrieve that live information right now. ${error.message}` : 'I could not retrieve that information from the APIx backend right now.',
      });
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        aria-label="Open APIx Assistant"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#172033] text-white shadow-[0_12px_35px_rgba(23,32,51,0.22)] transition hover:-translate-y-0.5 hover:bg-[#101828] focus:outline-none focus:ring-4 focus:ring-[#155EEF]/20"
      >
        <MessageCircle size={22} />
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#0E9F9A] text-[9px] font-bold">AI</span>
      </button>
    );
  }

  if (minimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-2xl border border-[#D0D5DD] bg-white px-3 py-2 shadow-[0_12px_35px_rgba(23,32,51,0.16)]">
        <button type="button" onClick={() => setMinimized(false)} className="flex items-center gap-2 text-sm font-semibold text-[#172033]">
          <Bot size={18} className="text-[#155EEF]" /> APIx Assistant
        </button>
        <button type="button" aria-label="Close APIx Assistant" onClick={() => setOpen(false)} className="rounded-lg p-2 text-[#667085] hover:bg-[#F2F4F7]">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <section aria-label="APIx Assistant" className="fixed bottom-5 right-5 z-50 flex w-[min(390px,calc(100vw-24px))] flex-col overflow-hidden rounded-3xl border border-[#D0D5DD] bg-white shadow-[0_20px_60px_rgba(23,32,51,0.20)]">
      <header className="flex items-center justify-between border-b border-[#EAECF0] bg-[#172033] px-4 py-3 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10"><Bot size={19} /></div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">APIx Assistant</div>
            <div className="truncate text-[10px] text-white/65">Helping with {pageName(location.pathname)}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Minimize APIx Assistant" onClick={() => setMinimized(true)} className="rounded-lg p-2 text-white/75 hover:bg-white/10 hover:text-white"><Minus size={16} /></button>
          <button type="button" aria-label="Close APIx Assistant" onClick={() => setOpen(false)} className="rounded-lg p-2 text-white/75 hover:bg-white/10 hover:text-white"><X size={16} /></button>
        </div>
      </header>

      <div className="max-h-[430px] min-h-[330px] overflow-y-auto bg-[#F8FAFC] px-3 py-4">
        <div className="mb-3 flex items-start gap-2 rounded-2xl border border-[#DCE6F7] bg-white p-3">
          <Sparkles size={15} className="mt-0.5 shrink-0 text-[#155EEF]" />
          <p className="text-[11px] leading-5 text-[#475467]">Current-number answers come from the APIx backend. Navigation commands open the relevant page.</p>
        </div>

        <div className="space-y-3">
          {messages.map(message => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={message.role === 'user' ? 'max-w-[84%] rounded-2xl rounded-br-md bg-[#155EEF] px-3 py-2.5 text-xs leading-5 text-white' : 'max-w-[88%] rounded-2xl rounded-bl-md border border-[#E4E7EC] bg-white px-3 py-2.5 text-xs leading-5 text-[#344054]'}>
                {message.text}
                {message.action && (
                  <button type="button" onClick={() => navigate(message.action!.path)} className="mt-2 flex w-full items-center justify-between rounded-xl bg-[#F2F6FF] px-3 py-2 text-left text-[11px] font-semibold text-[#155EEF]">
                    {message.action.label}<ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {busy && <div className="flex justify-start"><div className="rounded-2xl rounded-bl-md border border-[#E4E7EC] bg-white px-3 py-2.5 text-xs text-[#667085]">Checking current APIx data…</div></div>}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-[#EAECF0] bg-white p-3">
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
          {QUICK.map(prompt => (
            <button type="button" key={prompt} onClick={() => void ask(prompt)} disabled={busy} className="shrink-0 rounded-full border border-[#D0D5DD] bg-white px-2.5 py-1.5 text-[10px] font-medium text-[#475467] hover:border-[#98A2B3] hover:bg-[#F9FAFB] disabled:opacity-50">
              {prompt}
            </button>
          ))}
        </div>

        <form onSubmit={event => { event.preventDefault(); void ask(input); }} className="flex items-end gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-[#D0D5DD] bg-white px-3 py-2 focus-within:border-[#155EEF] focus-within:ring-2 focus-within:ring-[#155EEF]/10">
            <CircleHelp size={15} className="shrink-0 text-[#98A2B3]" />
            <input value={input} onChange={event => setInput(event.target.value)} placeholder="Ask about APIx…" aria-label="Ask APIx Assistant" className="min-w-0 flex-1 bg-transparent text-xs text-[#172033] outline-none placeholder:text-[#98A2B3]" />
          </div>
          <button type="submit" disabled={!input.trim() || busy} aria-label="Send question" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#155EEF] text-white disabled:cursor-not-allowed disabled:opacity-40">
            <Send size={15} />
          </button>
        </form>

        <div className="mt-2 flex items-center justify-between text-[9px] text-[#98A2B3]">
          <span className="flex items-center gap-1"><Navigation size={10} />Page-aware</span>
          <span className="flex items-center gap-1"><ExternalLink size={10} />Live backend data</span>
        </div>
      </div>
    </section>
  );
}
