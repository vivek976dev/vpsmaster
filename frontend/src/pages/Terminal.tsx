import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal as TerminalIcon, 
  Send, 
  Trash2, 
  ShieldAlert, 
  CornerDownLeft, 
  Maximize2,
  Copy,
  Check
} from 'lucide-react';
import { api } from '../services/api';

interface OutputLine {
  id: string;
  type: 'command' | 'output' | 'error' | 'system';
  text: string;
  timestamp: string;
}

export default function Terminal() {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [lines, setLines] = useState<OutputLine[]>([
    {
      id: 'welcome-1',
      type: 'system',
      text: 'Ubuntu 24.04.1 LTS (GNU/Linux 6.8.0-40-generic x86_64)',
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: 'welcome-2',
      type: 'system',
      text: 'VPSMaster Interactive Management Shell. Type commands or click common shortcuts below.',
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: 'welcome-3',
      type: 'system',
      text: 'Security notice: All terminal sessions and commands are recorded in the immutable audit log.',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [executing, setExecuting] = useState(false);
  const [copied, setCopied] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const runCommand = async (cmdToRun: string) => {
    const trimmed = cmdToRun.trim();
    if (!trimmed) return;

    if (trimmed === 'clear') {
      setLines([]);
      setCommand('');
      return;
    }

    const timeStr = new Date().toLocaleTimeString();
    setLines((prev) => [
      ...prev,
      { id: Math.random().toString(), type: 'command', text: `$ ${trimmed}`, timestamp: timeStr },
    ]);
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);
    setCommand('');
    setExecuting(true);

    try {
      const res = await api.execTerminal(trimmed);
      const outputText = res.output || res.result || '(Command executed with no output)';
      setLines((prev) => [
        ...prev,
        { id: Math.random().toString(), type: 'output', text: outputText, timestamp: new Date().toLocaleTimeString() },
      ]);
    } catch (err: any) {
      setLines((prev) => [
        ...prev,
        { id: Math.random().toString(), type: 'error', text: `Error: ${err.message}`, timestamp: new Date().toLocaleTimeString() },
      ]);
    } finally {
      setExecuting(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runCommand(command);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIdx);
        setCommand(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const nextIdx = historyIndex + 1;
        if (nextIdx >= history.length) {
          setHistoryIndex(-1);
          setCommand('');
        } else {
          setHistoryIndex(nextIdx);
          setCommand(history[nextIdx]);
        }
      }
    }
  };

  const shortcuts = [
    { label: 'Uptime & Load', cmd: 'uptime' },
    { label: 'Memory Stats', cmd: 'free -h' },
    { label: 'Disk Allocation', cmd: 'df -h' },
    { label: 'Network Sockets', cmd: 'ss -tulpn' },
    { label: 'Nginx Test', cmd: 'nginx -t' },
    { label: 'Active Services', cmd: 'systemctl list-units --type=service --state=running | head -n 15' },
    { label: 'UFW Firewall', cmd: 'ufw status verbose' },
    { label: 'Kernel Version', cmd: 'uname -a' },
  ];

  const handleCopyTerminal = () => {
    const text = lines.map((l) => l.text).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TerminalIcon className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Interactive Web Terminal
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Secure root administrative terminal interface with real-time command auditing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyTerminal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy Buffer'}
          </button>
          <button
            onClick={() => setLines([])}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            Clear
          </button>
        </div>
      </div>

      {/* Shortcuts Quick Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 text-xs font-semibold whitespace-nowrap">Shortcuts:</span>
        {shortcuts.map((s) => (
          <button
            key={s.label}
            onClick={() => runCommand(s.cmd)}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[11px] whitespace-nowrap transition-colors"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Terminal Screen */}
      <div className="bg-slate-950 rounded-2xl shadow-xl border border-slate-800 flex flex-col h-[560px] overflow-hidden">
        {/* Window Bar */}
        <div className="bg-slate-900/90 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            <span className="text-xs font-mono text-slate-400 ml-2">root@vpsmaster:~</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400/80 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Session Connected
          </span>
        </div>

        {/* Console Log Area */}
        <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-1.5 select-text">
          {lines.map((l) => (
            <div key={l.id} className="leading-relaxed">
              {l.type === 'command' && (
                <div className="text-emerald-400 font-semibold">{l.text}</div>
              )}
              {l.type === 'system' && (
                <div className="text-indigo-400/90 italic">{l.text}</div>
              )}
              {l.type === 'output' && (
                <div className="text-slate-200 whitespace-pre-wrap">{l.text}</div>
              )}
              {l.type === 'error' && (
                <div className="text-rose-400 font-semibold whitespace-pre-wrap">{l.text}</div>
              )}
            </div>
          ))}
          {executing && (
            <div className="text-amber-400 animate-pulse flex items-center gap-2">
              <span>Executing command...</span>
            </div>
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="bg-slate-900 border-t border-slate-800 p-3 flex items-center gap-2">
          <span className="text-emerald-400 font-mono text-xs font-bold pl-2">$</span>
          <input
            ref={inputRef}
            type="text"
            value={command}
            disabled={executing}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a shell command (e.g. df -h, systemctl status nginx) and press Enter..."
            className="flex-1 bg-transparent border-none text-slate-100 font-mono text-xs focus:outline-none focus:ring-0 placeholder-slate-600"
            autoFocus
          />
          <button
            type="submit"
            disabled={executing || !command.trim()}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center gap-1 disabled:opacity-40 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}

