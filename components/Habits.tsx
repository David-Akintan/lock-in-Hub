
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, Button, Badge, Modal, CountUp, StaggerItem } from './Shared';
import { Check, Flame, Calendar, Trophy, PenTool, Smile, Frown, Meh, ChevronLeft, ChevronRight, Play, Pause, Lock, BookOpen, Clock, Tag, Trash2, Save, X, Image as ImageIcon, Search, MoreHorizontal, LayoutGrid, List, Plus, CheckCircle, ArrowUp, RotateCcw, RotateCw, TrendingUp, TrendingDown, DollarSign, Activity, BarChart2, Maximize2, Calculator, Percent, ChevronDown, RefreshCw, Sparkles, ScanLine, Globe, BarChart, CalendarCheck, Zap, AlertTriangle, AlertOctagon, Timer, Siren, ShieldAlert, Target, Volume2, VolumeX, Headphones, Music, Radio, AlignLeft, Move, Scissors, UploadCloud, Minimize2, Waves, Wind, CloudRain, Sliders, ExternalLink, Settings, Lightbulb, Scale, Briefcase, Wifi, Edit2 } from 'lucide-react';
import { YOUTUBE_PLAYLISTS, DAILY_NEWS_SCHEDULE } from '../constants';
import { useAppState } from '../App';
import { JournalEntry, JournalMood, TradeLog, Strategy, NewsEvent } from '../types';

// --- Constants & Types ---

type Category = 'SPIRITUAL' | 'DISCIPLINE' | 'FITNESS' | 'TRADING' | 'CUSTOM';

interface HabitDef {
    id: string;
    label: string;
    category: Category;
    points: number;
}

const DEFAULT_HABIT_CONFIG: HabitDef[] = [
    { id: 'h1', label: 'Morning Prayer / Fajr', category: 'SPIRITUAL', points: 20 },
    { id: 'h2', label: 'Read 10 Pages (Quran/Bible)', category: 'SPIRITUAL', points: 15 },
    { id: 'h3', label: 'Cold Shower', category: 'DISCIPLINE', points: 25 },
    { id: 'h4', label: 'No Social Media (First 1h)', category: 'DISCIPLINE', points: 20 },
    { id: 'h5', label: 'Journal 5 Minutes', category: 'DISCIPLINE', points: 10 },
    { id: 'h6', label: '45min Workout', category: 'FITNESS', points: 30 },
    { id: 'h7', label: 'Clean Diet (No Sugar)', category: 'FITNESS', points: 20 },
];

const PSYCH_TAGS = ['FOMO', 'Revenge', 'Early Exit', 'Late Entry', 'A+ Setup', 'News', 'Hesitation', 'Perfect Execution'];

interface DayLog {
    date: string; // ISO Date String (YYYY-MM-DD)
    completedHabits: string[];
}

// --- Helper Functions ---

const getLevel = (xp: number) => {
    if (xp < 100) return { name: 'ROOKIE', color: 'text-zinc-400 dark:text-white/50', icon: Lock };
    if (xp < 300) return { name: 'DISCIPLINED', color: 'text-blue-500 dark:text-blue-400', icon: Check };
    if (xp < 600) return { name: 'LOCKED IN', color: 'text-accent', icon: Flame };
    return { name: 'MONK MODE', color: 'text-red-500', icon: Trophy };
};

const formatDate = (date: Date) => date.toISOString().split('T')[0];

const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

// --- Trade Calculation Logic (Centralized) ---
const calculateTradeStats = (trades: TradeLog[]) => {
    const closedTrades = trades.filter(t => t.outcome !== 'OPEN');

    const wins = closedTrades.filter(t => t.outcome === 'WIN');
    const losses = closedTrades.filter(t => t.outcome === 'LOSS');
    const totalClosed = closedTrades.length;

    const winRate = totalClosed > 0 ? (wins.length / totalClosed) * 100 : 0;

    // Net R is just the sum of the signed RR values
    const netR = closedTrades.reduce((acc, t) => acc + (t.rr || 0), 0);

    const grossProfitR = wins.reduce((acc, t) => acc + (t.rr || 0), 0);
    const grossLossR = Math.abs(losses.reduce((acc, t) => acc + (t.rr || 0), 0));

    const avgWinR = wins.length > 0 ? grossProfitR / wins.length : 0;
    const avgLossR = losses.length > 0 ? grossLossR / losses.length : 0;

    const winRateDecimal = wins.length / totalClosed || 0;
    const lossRateDecimal = losses.length / totalClosed || 0;

    // Expectancy Formula: (P_win * Avg_Win) - (P_loss * Avg_Loss)
    const expectancy = totalClosed > 0
        ? (winRateDecimal * avgWinR) - (lossRateDecimal * avgLossR)
        : 0;

    // Profit Factor Formula
    const pnlValues = closedTrades.map(t => t.pnl || 0);

    const grossProfitPnl = closedTrades.filter(t => t.outcome === 'WIN').reduce((a, t) => a + (t.pnl || 0), 0);
    const grossLossPnl = Math.abs(closedTrades.filter(t => t.outcome === 'LOSS').reduce((a, t) => a + (t.pnl || 0), 0));

    const usePnlForPF = grossProfitPnl > 0 || grossLossPnl > 0;

    let profitFactor = 0;
    if (usePnlForPF) {
        profitFactor = grossLossPnl === 0 ? (grossProfitPnl > 0 ? 100 : 0) : grossProfitPnl / grossLossPnl;
    } else {
        profitFactor = grossLossR === 0 ? (grossProfitR > 0 ? 100 : 0) : grossProfitR / grossLossR;
    }

    return {
        winRate,
        netR,
        netPnl: pnlValues.reduce((a, b) => a + b, 0),
        expectancy,
        profitFactor: Math.min(profitFactor, 99.99), // Cap for UI
        totalTrades: totalClosed
    };
};

// --- Trade Journal Constants ---

const CALCULATOR_ASSETS: Record<string, { symbol: string; pipSize: number; stdLotValue: number }[]> = {
    'Forex Majors': [
        { symbol: 'EURUSD', pipSize: 0.0001, stdLotValue: 10 },
        { symbol: 'GBPUSD', pipSize: 0.0001, stdLotValue: 10 },
        { symbol: 'USDJPY', pipSize: 0.01, stdLotValue: 6.80 },
        { symbol: 'AUDUSD', pipSize: 0.0001, stdLotValue: 10 },
        { symbol: 'USDCAD', pipSize: 0.0001, stdLotValue: 7.50 },
        { symbol: 'USDCHF', pipSize: 0.0001, stdLotValue: 11 },
        { symbol: 'NZDUSD', pipSize: 0.0001, stdLotValue: 10 },
    ],
    'Forex Minors': [
        { symbol: 'EURGBP', pipSize: 0.0001, stdLotValue: 12.5 },
        { symbol: 'EURJPY', pipSize: 0.01, stdLotValue: 6.80 },
        { symbol: 'GBPJPY', pipSize: 0.01, stdLotValue: 6.80 },
        { symbol: 'AUDJPY', pipSize: 0.01, stdLotValue: 6.80 },
        { symbol: 'CADJPY', pipSize: 0.01, stdLotValue: 6.80 },
    ],
    'Indices': [
        { symbol: 'US30', pipSize: 1, stdLotValue: 1 },
        { symbol: 'NAS100', pipSize: 1, stdLotValue: 1 },
        { symbol: 'SPX500', pipSize: 0.1, stdLotValue: 1 },
        { symbol: 'GER30', pipSize: 1, stdLotValue: 1 },
    ],
    'Metals': [
        { symbol: 'XAUUSD', pipSize: 0.01, stdLotValue: 10 },
        { symbol: 'XAGUSD', pipSize: 0.01, stdLotValue: 50 },
    ],
    'Crypto': [
        { symbol: 'BTCUSD', pipSize: 1, stdLotValue: 1 },
        { symbol: 'ETHUSD', pipSize: 1, stdLotValue: 1 },
    ]
};

// --- SUB COMPONENTS ---

const ProgressBar: React.FC<{ progress: number; color?: string }> = React.memo(({ progress, color = "bg-blue-500" }) => {
    const [animatedProgress, setAnimatedProgress] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => setAnimatedProgress(Math.max(0, Math.min(100, progress))), 100);
        return () => clearTimeout(timer);
    }, [progress]);

    return (
        <div className="h-1.5 w-full bg-zinc-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full ${color} transition-all duration-1000 ease-out`} style={{ width: `${animatedProgress}%` }}></div>
        </div>
    );
});

const InputGroup = ({ label, value, onChange, type = "text", placeholder }: any) => (
    <div className="space-y-1">
        <label className="text-xs font-bold text-zinc-500 dark:text-white/40 uppercase ml-2">{label}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-colors"
        />
    </div>
);

const HabitEditorModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    habit?: HabitDef;
    onSave: (habit: HabitDef) => void;
}> = ({ isOpen, onClose, habit, onSave }) => {
    const [label, setLabel] = useState('');
    const [category, setCategory] = useState<Category>('DISCIPLINE');
    const [points, setPoints] = useState('10');

    useEffect(() => {
        if (habit) {
            setLabel(habit.label);
            setCategory(habit.category);
            setPoints(habit.points.toString());
        } else {
            setLabel('');
            setCategory('DISCIPLINE');
            setPoints('10');
        }
    }, [habit, isOpen]);

    const handleSave = () => {
        if (!label) return;
        onSave({
            id: habit?.id || Date.now().toString(),
            label,
            category,
            points: parseInt(points) || 0
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} title={habit ? 'Edit Protocol' : 'New Protocol'} onClose={onClose} onConfirm={handleSave} confirmText="Save">
            <div className="space-y-4">
                <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 dark:text-white/40 uppercase pl-1">Task Name</label>
                    <input
                        value={label}
                        onChange={e => setLabel(e.target.value)}
                        className="w-full bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white text-sm focus:border-accent focus:outline-none"
                        placeholder="e.g. Read 10 Pages"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 dark:text-white/40 uppercase pl-1">Category</label>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value as Category)}
                            className="w-full bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white text-sm appearance-none focus:border-accent focus:outline-none"
                        >
                            <option value="DISCIPLINE">Discipline</option>
                            <option value="FITNESS">Fitness</option>
                            <option value="SPIRITUAL">Spiritual</option>
                            <option value="TRADING">Trading</option>
                            <option value="CUSTOM">Custom</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 dark:text-white/40 uppercase pl-1">XP Points</label>
                        <input
                            type="number"
                            value={points}
                            onChange={e => setPoints(e.target.value)}
                            className="w-full bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white text-sm focus:border-accent focus:outline-none"
                            placeholder="10"
                        />
                    </div>
                </div>
            </div>
        </Modal>
    );
};

const FocusTimer: React.FC = React.memo(() => {
    // Session State
    const [mode, setMode] = useState<'IDLE' | 'BREATHING' | 'FOCUS' | 'COMPLETED'>('IDLE');
    const [timeLeft, setTimeLeft] = useState(60 * 60); // Default 60 mins
    const [initialTime, setInitialTime] = useState(60 * 60);
    const [objectives, setObjectives] = useState<string[]>(['', '', '']);
    const [breathText, setBreathText] = useState('Inhale');
    const [breathPhase, setBreathPhase] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let interval: any;
        if (mode === 'FOCUS' && timeLeft > 0) {
            interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
        } else if (timeLeft === 0 && mode === 'FOCUS') {
            setMode('COMPLETED');
            if (document.fullscreenElement) document.exitFullscreen();
        }
        return () => clearInterval(interval);
    }, [mode, timeLeft]);

    useEffect(() => {
        if (mode !== 'BREATHING') return;
        const cycle = async () => {
            setBreathText('Inhale (4s)'); setBreathPhase(100); await new Promise(r => setTimeout(r, 4000));
            setBreathText('Hold (7s)'); setBreathPhase(100); await new Promise(r => setTimeout(r, 7000));
            setBreathText('Exhale (8s)'); setBreathPhase(0); await new Promise(r => setTimeout(r, 8000));
            setMode('FOCUS');
        };
        cycle();
    }, [mode]);

    const startSession = async () => { setMode('BREATHING'); try { await containerRef.current?.requestFullscreen(); } catch (e) { } };
    const formatTime = (seconds: number) => { const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = seconds % 60; return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; };

    if (mode === 'IDLE' || mode === 'COMPLETED') {
        return (
            <div className="w-full max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500" ref={containerRef}>
                {mode === 'COMPLETED' && (<div className="bg-green-500/10 border border-green-500/20 p-4 rounded-2xl text-center mb-6"><h3 className="text-green-500 font-bold text-lg">Session Complete</h3><Button onClick={() => setMode('IDLE')} className="mt-3" size="sm">Reset</Button></div>)}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-bold text-zinc-400 dark:text-white/40 uppercase tracking-widest">Duration</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {[25, 45, 90].map(m => (
                                    <button key={m} onClick={() => { setInitialTime(m * 60); setTimeLeft(m * 60); }} className={`py-3 rounded-xl font-bold border transition-all ${initialTime === m * 60 ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white shadow-lg' : 'bg-zinc-100 dark:bg-white/5 border-transparent text-zinc-500 dark:text-white/40 hover:bg-zinc-200 dark:hover:bg-white/10'}`}>{m}m</button>
                                ))}
                            </div>
                        </div>

                        {/* Audio Links */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-bold text-zinc-400 dark:text-white/40 uppercase tracking-widest">Audio Focus</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <a href="https://music.apple.com/us/playlist/pure-focus/pl.0b593f1142b54a5c833156d5668e05e5" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-white/10 hover:border-zinc-300 dark:hover:border-white/20 transition-all group">
                                    <Music className="w-4 h-4 text-pink-500 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-bold text-zinc-700 dark:text-white/80">Apple Music</span>
                                </a>
                                <a href="https://open.spotify.com/genre/focus-home" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-white/10 hover:border-zinc-300 dark:hover:border-white/20 transition-all group">
                                    <Headphones className="w-4 h-4 text-green-500 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-bold text-zinc-700 dark:text-white/80">Spotify</span>
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-[10px] font-bold text-zinc-400 dark:text-white/40 uppercase tracking-widest">Objectives</h3>
                        <div className="space-y-2">
                            {objectives.map((obj, i) => (
                                <input key={i} value={obj} onChange={(e) => { const n = [...objectives]; n[i] = e.target.value; setObjectives(n); }} placeholder={`Objective ${i + 1}`} className="w-full bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white text-sm focus:border-accent focus:outline-none placeholder:text-zinc-400 dark:placeholder:text-white/20" />
                            ))}
                        </div>
                        <div className="pt-4">
                            <button onClick={startSession} disabled={!objectives[0]} className="w-full py-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">Enter Chamber</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div ref={containerRef} className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-start z-50"><div className="flex items-center gap-2"><div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div><span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Ghost Mode</span></div><button onClick={() => { setMode('IDLE'); if (document.fullscreenElement) document.exitFullscreen(); }} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/30 hover:text-white"><Minimize2 className="w-6 h-6" /></button></div>
            <div className="relative z-10 flex flex-col items-center">
                {mode === 'BREATHING' ? (<><div className="w-64 h-64 rounded-full border-2 border-white/10 flex items-center justify-center transition-all duration-[4000ms] ease-in-out relative" style={{ transform: `scale(${0.8 + (breathPhase / 100) * 0.4})`, boxShadow: `0 0 ${breathPhase}px rgba(139, 92, 246, ${0.2 + (breathPhase / 200)})` }}><div className="w-full h-full rounded-full bg-accent/5 backdrop-blur-sm"></div></div><h2 className="text-4xl font-light text-white mt-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 tracking-widest uppercase">{breathText}</h2></>) : (<><div className="relative w-80 h-80 flex items-center justify-center group"><svg className="w-full h-full transform -rotate-90"><circle cx="50%" cy="50%" r="48%" stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="transparent" /><circle cx="50%" cy="50%" r="48%" stroke="#8B5CF6" strokeWidth="4" fill="transparent" strokeDasharray="942" strokeDashoffset={942 - (942 * ((initialTime - timeLeft) / initialTime))} strokeLinecap="round" className="transition-all duration-1000 ease-linear" /></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-7xl font-black text-white tracking-tighter tabular-nums drop-shadow-2xl">{formatTime(timeLeft)}</span><span className="text-xs text-accent uppercase tracking-[0.4em] font-bold mt-4 animate-pulse">Locked In</span></div></div></>)}
            </div>
        </div>
    );
});

const ImageToolsModal: React.FC<{ isOpen: boolean; onClose: () => void; imageData: string | null; onSave: (finalData: string, width?: string) => void }> = React.memo(({ isOpen, onClose, imageData, onSave }) => {
    if (!isOpen || !imageData) return null;
    return <Modal isOpen={isOpen} title="Edit Image" onClose={onClose} onConfirm={() => { onSave(imageData); onClose(); }} confirmText="Insert"><div className="flex justify-center"><img src={imageData} className="max-h-[300px] object-contain" /></div></Modal>;
});

const AppleNoteEditor: React.FC<{ initialContent?: string; onUpdate: (json: string) => void; editable?: boolean }> = React.memo(({ initialContent, onUpdate, editable = true }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    useEffect(() => { if (editorRef.current && initialContent && editorRef.current.innerHTML !== initialContent) { editorRef.current.innerHTML = initialContent; } }, [initialContent]);
    return <div ref={editorRef} contentEditable={editable} onInput={() => onUpdate(editorRef.current?.innerHTML || '')} className="w-full min-h-[200px] outline-none text-zinc-800 dark:text-white text-base leading-relaxed whitespace-pre-wrap p-4 bg-transparent empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400 dark:empty:before:text-white/30" data-placeholder="Start typing..." />;
});

const JournalManager: React.FC<{ dateKey: string; entry?: JournalEntry; allEntries: JournalEntry[]; onSave: (content: string, mood: JournalMood, imageUrls: string[]) => void; onDelete: (id: string) => void; currentDate: Date; onNavigate: (d: number) => void }> = React.memo(({ dateKey, entry, allEntries, onSave, onDelete, currentDate, onNavigate }) => {
    const [content, setContent] = useState('');
    const [mood, setMood] = useState<JournalMood>(null);
    useEffect(() => { setContent(entry?.content || ''); setMood(entry?.mood || null); }, [dateKey, entry]);
    return (
        <div className="vision-glass rounded-[26px] p-6 border border-zinc-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2"><PenTool className="w-4 h-4 text-accent" />Journal</h3>
                <div className="flex items-center gap-2 bg-zinc-100 dark:bg-white/5 rounded-lg p-1 border border-zinc-200 dark:border-white/5">
                    <button onClick={() => onNavigate(-1)} className="p-1 hover:bg-zinc-200 dark:hover:bg-white/10 rounded text-zinc-500 dark:text-white/50 hover:text-zinc-900 dark:hover:text-white transition-colors"><ChevronLeft className="w-3.5 h-3.5" /></button>
                    <span className="text-[10px] uppercase text-zinc-600 dark:text-white/60 font-bold tracking-widest min-w-[70px] text-center">{currentDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    <button onClick={() => onNavigate(1)} className="p-1 hover:bg-zinc-200 dark:hover:bg-white/10 rounded text-zinc-500 dark:text-white/50 hover:text-zinc-900 dark:hover:text-white transition-colors"><ChevronRight className="w-3.5 h-3.5" /></button>
                </div>
            </div>
            <div className="bg-white dark:bg-black/20 rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/10"><AppleNoteEditor initialContent={content} onUpdate={setContent} editable={true} /></div>
            <div className="flex justify-between items-center mt-4">
                <div className="flex gap-2">{['On Fire', 'Good', 'Meh', 'Off'].map(m => (<button key={m} onClick={() => setMood(m as any)} className={`px-3 py-1 rounded text-[10px] border ${mood === m ? 'bg-accent text-white border-accent' : 'border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-white/40'}`}>{m}</button>))}</div>
                <Button size="sm" onClick={() => onSave(content, mood, [])}>Save</Button>
            </div>
        </div>
    );
});

const StrategyManagerModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { strategies, addStrategy, deleteStrategy, currentUser } = useAppState();
    const [newStrategy, setNewStrategy] = useState('');
    const handleAdd = () => { if (!newStrategy.trim()) return; addStrategy({ id: Date.now().toString(), userId: currentUser?.id || 'unknown', name: newStrategy, description: '', rules: [] }); setNewStrategy(''); };
    if (!isOpen) return null;
    return <Modal isOpen={isOpen} title="Manage Playbooks" onClose={onClose} confirmText="Done"><div className="space-y-4"><div className="flex gap-2"><input value={newStrategy} onChange={e => setNewStrategy(e.target.value)} className="flex-1 bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-zinc-900 dark:text-white" placeholder="New Strategy Name" /><Button onClick={handleAdd} size="sm" icon={Plus}>Add</Button></div><div className="space-y-2">{strategies.map(s => (<div key={s.id} className="flex justify-between p-2 bg-zinc-100 dark:bg-white/5 rounded"><span className="text-zinc-900 dark:text-white text-sm">{s.name}</span><button onClick={() => deleteStrategy(s.id)}><Trash2 className="w-4 h-4 text-zinc-400 dark:text-white/30" /></button></div>))}</div></div></Modal>;
};

const RiskCalculatorWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [assetType, setAssetType] = useState('Forex Majors');
    const [instrument, setInstrument] = useState(CALCULATOR_ASSETS['Forex Majors'][0]);

    // Inputs
    const [entry, setEntry] = useState('');
    const [stopLoss, setStopLoss] = useState('');
    const [balance, setBalance] = useState('100000');
    const [riskPercent, setRiskPercent] = useState('1.0');

    // Sync instrument when type changes
    useEffect(() => {
        setInstrument(CALCULATOR_ASSETS[assetType][0]);
    }, [assetType]);

    // Calculation Logic
    const results = useMemo(() => {
        const entryPrice = parseFloat(entry);
        const slPrice = parseFloat(stopLoss);
        const accBalance = parseFloat(balance);
        const riskPct = parseFloat(riskPercent);

        if (!entryPrice || !slPrice || !accBalance || !riskPct) {
            return { lotSize: 0, riskAmount: 0, pipDistance: 0 };
        }

        const pipDist = Math.abs(entryPrice - slPrice) / instrument.pipSize;
        const riskAmount = accBalance * (riskPct / 100);

        let pipValuePerStdLot = instrument.stdLotValue;

        const lotSize = riskAmount / (pipDist * pipValuePerStdLot);

        return {
            lotSize: Math.max(0, lotSize),
            riskAmount,
            pipDistance: pipDist,
        };
    }, [entry, stopLoss, balance, riskPercent, instrument]);

    return (
        <div className="vision-glass border border-zinc-200 dark:border-white/10 rounded-[26px] overflow-hidden transition-all duration-300">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-white dark:bg-white/5 hover:bg-zinc-50 dark:hover:bg-white/10 transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent border border-accent/20 group-hover:scale-110 transition-transform">
                        <Calculator className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-widest block">Position Size</span>
                        <span className="text-[9px] text-zinc-500 dark:text-white/40 font-medium">Risk Calculator</span>
                    </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-zinc-400 dark:text-white/40 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="p-5 space-y-5 bg-zinc-50 dark:bg-[#050505] animate-in slide-in-from-top-4 border-t border-zinc-200 dark:border-white/5 shadow-inner">
                    <div className="space-y-4">
                        {/* Row 1: Market Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-zinc-500 dark:text-white/30 uppercase tracking-[0.2em] pl-1">Market</label>
                                <div className="relative group">
                                    <select value={assetType} onChange={(e) => setAssetType(e.target.value)} className="w-full bg-white dark:bg-[#121212] border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-zinc-900 dark:text-white focus:border-zinc-400 dark:focus:border-white/30 focus:outline-none appearance-none transition-all cursor-pointer font-medium hover:bg-zinc-100 dark:hover:bg-white/5">
                                        {Object.keys(CALCULATOR_ASSETS).map(k => <option key={k} value={k}>{k}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 dark:text-white/30 pointer-events-none" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-zinc-500 dark:text-white/30 uppercase tracking-[0.2em] pl-1">Asset</label>
                                <div className="relative group">
                                    <select value={instrument.symbol} onChange={(e) => setInstrument(CALCULATOR_ASSETS[assetType].find(i => i.symbol === e.target.value) || instrument)} className="w-full bg-white dark:bg-[#121212] border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-zinc-900 dark:text-white focus:border-zinc-400 dark:focus:border-white/30 focus:outline-none appearance-none transition-all cursor-pointer font-mono font-medium hover:bg-zinc-100 dark:hover:bg-white/5">
                                        {CALCULATOR_ASSETS[assetType].map(i => <option key={i.symbol} value={i.symbol}>{i.symbol}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 dark:text-white/30 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Account Params */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-zinc-500 dark:text-white/30 uppercase tracking-[0.2em] pl-1">Balance</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-white/20 text-xs">$</span>
                                    <input type="number" value={balance} onChange={e => setBalance(e.target.value)} className="w-full bg-white dark:bg-[#121212] border border-zinc-200 dark:border-white/10 rounded-xl pl-6 pr-3 py-2.5 text-xs text-zinc-900 dark:text-white font-mono focus:border-zinc-400 dark:focus:border-white/30 focus:outline-none transition-all" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-zinc-500 dark:text-white/30 uppercase tracking-[0.2em] pl-1">Risk %</label>
                                <div className="relative">
                                    <input type="number" value={riskPercent} onChange={e => setRiskPercent(e.target.value)} className="w-full bg-white dark:bg-[#121212] border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-zinc-900 dark:text-white font-mono focus:border-zinc-400 dark:focus:border-white/30 focus:outline-none transition-all" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-white/20 text-xs">%</span>
                                </div>
                            </div>
                        </div>

                        {/* Row 3: Trade Params */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-zinc-500 dark:text-white/30 uppercase tracking-[0.2em] pl-1">Entry</label>
                                <input type="number" value={entry} onChange={e => setEntry(e.target.value)} className="w-full bg-white dark:bg-[#121212] border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-zinc-900 dark:text-white font-mono focus:border-zinc-400 dark:focus:border-white/30 focus:outline-none transition-all" placeholder="0.00000" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-zinc-500 dark:text-white/30 uppercase tracking-[0.2em] pl-1">Stop</label>
                                <input type="number" value={stopLoss} onChange={e => setStopLoss(e.target.value)} className="w-full bg-white dark:bg-[#121212] border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-zinc-900 dark:text-white font-mono focus:border-zinc-400 dark:focus:border-white/30 focus:outline-none transition-all" placeholder="0.00000" />
                            </div>
                        </div>
                    </div>

                    {/* Output Section - Thunderblack Luxury */}
                    <div className="bg-zinc-900 dark:bg-[#0A0A0A] rounded-xl p-4 border border-zinc-200 dark:border-white/10 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[50px] -mr-16 -mt-16 pointer-events-none"></div>
                        <div className="relative z-10 flex flex-col gap-1">
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/30">
                                <span>Result</span>
                                <span>{results.pipDistance > 0 ? `${results.pipDistance.toFixed(1)} Pips` : '0.0 Pips'}</span>
                            </div>
                            <div className="flex items-baseline justify-between mt-1">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-medium text-white tracking-tight tabular-nums">
                                        <CountUp end={results.lotSize} decimals={2} />
                                    </span>
                                    <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Lots</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-bold text-white uppercase tracking-wider">{instrument.symbol}</div>
                                    <div className="text-xs font-mono text-red-400 mt-0.5">-${results.riskAmount.toFixed(2)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

const NewTradeModal: React.FC<{ isOpen: boolean; onClose: () => void; selectedDate: Date }> = React.memo(({ isOpen, onClose, selectedDate }) => {
    const { addTradeLog, currentUser, strategies } = useAppState();
    const [pair, setPair] = useState('EURUSD');
    const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
    const [outcome, setOutcome] = useState<'WIN' | 'LOSS' | 'BE' | 'OPEN'>('OPEN');

    // Updated Logic
    const [setupRR, setSetupRR] = useState<string>('3.0'); // Technical RR
    const [riskLoad, setRiskLoad] = useState<string>('1.0'); // Execution Risk Multiplier

    const [entryPrice, setEntryPrice] = useState('');
    const [exitPrice, setExitPrice] = useState('');
    const [lotSize, setLotSize] = useState('');
    const [selectedStrategy, setSelectedStrategy] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [pnl, setPnl] = useState('');
    const [session, setSession] = useState<'LONDON' | 'NY' | 'ASIA'>('NY');
    const [notes, setNotes] = useState('');

    // New Image State
    const [setupImages, setSetupImages] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setSetupRR('3.0'); setRiskLoad('1.0'); setEntryPrice(''); setExitPrice(''); setLotSize(''); setPnl('');
            setSelectedTags([]); setNotes(''); setSetupImages([]);
        }
    }, [isOpen]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            // Explicitly cast to File[] to ensure compatibility with readAsDataURL which expects Blob (File extends Blob)
            const files = Array.from(e.target.files) as File[];
            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (reader.result) {
                        setSetupImages(prev => [...prev, reader.result as string]);
                    }
                };
                reader.readAsDataURL(file);
            });
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeImage = (index: number) => {
        setSetupImages(prev => prev.filter((_, i) => i !== index));
    };

    const toggleTag = (tag: string) => {
        setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    // Calculate Result Preview
    const finalRR = useMemo(() => {
        const sRR = parseFloat(setupRR) || 0;
        const rLoad = parseFloat(riskLoad) || 1;

        if (outcome === 'WIN') return sRR * rLoad;
        if (outcome === 'LOSS') return -1 * rLoad;
        return 0;
    }, [setupRR, riskLoad, outcome]);

    const handleSubmit = () => {
        addTradeLog({
            id: Date.now().toString(),
            userId: currentUser?.id || 'unknown',
            pair: pair.toUpperCase(),
            direction,
            outcome,
            rr: finalRR, // Store calculated
            setupRR: parseFloat(setupRR) || 0,
            riskLoad: parseFloat(riskLoad) || 1,
            pnl: parseFloat(pnl) || undefined,
            entryPrice: parseFloat(entryPrice) || undefined,
            exitPrice: parseFloat(exitPrice) || undefined,
            lotSize: parseFloat(lotSize) || undefined,
            strategyId: selectedStrategy || undefined,
            tags: selectedTags,
            session,
            notes,
            date: formatDate(selectedDate), // Use the selected date instead of today
            setupImages,
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} title="New Ticket" onClose={onClose} onConfirm={handleSubmit} confirmText="Save Trade">
            <div className="space-y-6 text-left">
                {/* Section 1: Core Info */}
                <div className="flex gap-4">
                    <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 dark:text-white/40 uppercase pl-1">Pair</label>
                        <input value={pair} onChange={e => setPair(e.target.value)} className="w-full bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white text-sm uppercase font-mono" placeholder="EURUSD" />
                    </div>
                    <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 dark:text-white/40 uppercase pl-1">Direction</label>
                        <div className="flex bg-zinc-100 dark:bg-black/40 p-1 rounded-xl border border-zinc-200 dark:border-white/10 h-[46px]">
                            <button onClick={() => setDirection('LONG')} className={`flex-1 text-xs font-bold rounded-lg transition-all ${direction === 'LONG' ? 'bg-green-600 text-white' : 'text-zinc-500 dark:text-white/40'}`}>LONG</button>
                            <button onClick={() => setDirection('SHORT')} className={`flex-1 text-xs font-bold rounded-lg transition-all ${direction === 'SHORT' ? 'bg-red-600 text-white' : 'text-zinc-500 dark:text-white/40'}`}>SHORT</button>
                        </div>
                    </div>
                </div>

                {/* Section 2: Technical Setup */}
                <div className="space-y-3 p-4 bg-zinc-50 dark:bg-white/5 rounded-2xl border border-zinc-200 dark:border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-accent/50"></div>
                    <h4 className="text-[10px] font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                        <Scale className="w-3 h-3" /> Technical Setup
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-500 dark:text-white/40 uppercase pl-1">Target RR</label>
                            <input type="number" value={setupRR} onChange={e => setSetupRR(e.target.value)} className="w-full bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white text-sm" placeholder="3.0" step="0.1" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-500 dark:text-white/40 uppercase pl-1">Strategy</label>
                            <select value={selectedStrategy} onChange={e => setSelectedStrategy(e.target.value)} className="w-full bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white text-sm">
                                <option value="">Discretionary</option>
                                {strategies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Section 3: Execution Risk */}
                <div className="space-y-3 p-4 bg-zinc-50 dark:bg-white/5 rounded-2xl border border-zinc-200 dark:border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-accent/50"></div>
                    <h4 className="text-[10px] font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                        <ShieldAlert className="w-3 h-3" /> Execution Risk
                    </h4>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[9px] font-bold text-zinc-500 dark:text-white/40 uppercase">Risk Load (R)</label>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${parseFloat(riskLoad) > 1.5 ? 'bg-red-500 text-white' : parseFloat(riskLoad) < 1 ? 'bg-blue-500 text-white' : 'bg-zinc-200 dark:bg-white/10 text-zinc-600 dark:text-white'}`}>
                                {parseFloat(riskLoad).toFixed(2)}x Risk
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <input type="number" value={riskLoad} onChange={e => setRiskLoad(e.target.value)} className="flex-1 bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white text-sm" step="0.25" />
                            {[0.5, 1.0, 2.0].map(val => (
                                <button key={val} onClick={() => setRiskLoad(val.toString())} className={`px-3 rounded-xl border text-xs font-bold transition-all ${parseFloat(riskLoad) === val ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white' : 'bg-transparent text-zinc-500 dark:text-white/40 border-zinc-200 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/30'}`}>
                                    {val}x
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Section 4: Result */}
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-500 dark:text-white/40 uppercase pl-1">Outcome</label>
                            <select value={outcome} onChange={e => setOutcome(e.target.value as any)} className="w-full bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white text-sm">
                                <option value="OPEN">Open</option>
                                <option value="WIN">Win</option>
                                <option value="LOSS">Loss</option>
                                <option value="BE">Break Even</option>
                            </select>
                        </div>
                        {outcome !== 'OPEN' && (
                            <div className={`p-3 rounded-xl border flex flex-col justify-center items-center ${finalRR > 0 ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400' : finalRR < 0 ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400' : 'bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-white/60'}`}>
                                <span className="text-[9px] font-bold uppercase tracking-widest">Net Result</span>
                                <span className="text-2xl font-black">{finalRR > 0 ? '+' : ''}{finalRR.toFixed(2)}R</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Notes Section */}
                <div className="space-y-1.5">
                    <label className="text-[9px] uppercase font-bold text-zinc-500 dark:text-white/40 pl-1">Notes</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl p-4 text-zinc-900 dark:text-white text-sm h-20 resize-none" placeholder="Execution notes..." />
                </div>

                {/* Attachments Section */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-[9px] uppercase font-bold text-zinc-500 dark:text-white/40 pl-1">Attachments</label>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[10px] font-bold text-accent uppercase tracking-wider flex items-center gap-1 hover:text-accent/80 transition-colors"
                        >
                            <ImageIcon className="w-3 h-3" /> Add Image
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageSelect}
                            className="hidden"
                            accept="image/*"
                            multiple
                        />
                    </div>

                    {/* Image Grid */}
                    {setupImages.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto py-2 no-scrollbar">
                            {setupImages.map((img, i) => (
                                <div key={i} className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-zinc-200 dark:border-white/10 group">
                                    <img src={img} className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => removeImage(i)}
                                        className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
});

// --- NEW COMPONENTS FOR HABITS ---

const HabitRow: React.FC<{
    habit: HabitDef;
    completed: boolean;
    onToggle: () => void;
    onEdit: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
}> = React.memo(({ habit, completed, onToggle, onEdit, onDelete }) => (
    <div onClick={onToggle} className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group ${completed ? 'bg-green-500/10 border-green-500/20' : 'bg-white dark:bg-white/5 border-zinc-200 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/10'}`}>
        <div className="flex items-center gap-4">
            <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${completed ? 'bg-green-500 border-green-500' : 'border-zinc-300 dark:border-white/20'}`}>
                {completed && <Check className="w-4 h-4 text-black" />}
            </div>
            <div>
                <h4 className={`font-bold text-sm ${completed ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-white/60 group-hover:text-zinc-900 dark:group-hover:text-white'}`}>{habit.label}</h4>
                <p className="text-[10px] font-bold text-zinc-400 dark:text-white/20 uppercase tracking-widest">{habit.category} • {habit.points} XP</p>
            </div>
        </div>
        <div className="flex items-center gap-3">
            {completed && <span className="text-xs font-bold text-green-500 animate-in zoom-in">+ {habit.points} XP</span>}

            {/* Edit Actions - Only visible on hover */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(e); }}
                    className="p-1.5 rounded-lg text-zinc-400 dark:text-white/30 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
                >
                    <Settings className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(e); }}
                    className="p-1.5 rounded-lg text-zinc-400 dark:text-white/30 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    </div>
));

const ViewTradeModal: React.FC<{ trade: TradeLog | null; onClose: () => void }> = ({ trade, onClose }) => {
    if (!trade) return null;
    return (
        <Modal isOpen={!!trade} title={`${trade.pair} ${trade.direction}`} onClose={onClose} onConfirm={onClose} confirmText="Close" confirmVariant="primary">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-50 dark:bg-white/5 p-3 rounded-xl border border-zinc-200 dark:border-white/5">
                        <span className="text-[10px] text-zinc-500 dark:text-white/40 uppercase font-bold">Net Result</span>
                        <p className={`text-lg font-bold ${trade.outcome === 'WIN' ? 'text-green-600 dark:text-green-500' : trade.outcome === 'LOSS' ? 'text-red-600 dark:text-red-500' : 'text-zinc-900 dark:text-white'}`}>{trade.rr > 0 ? '+' : ''}{trade.rr}R</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-white/5 p-3 rounded-xl border border-zinc-200 dark:border-white/5">
                        <span className="text-[10px] text-zinc-500 dark:text-white/40 uppercase font-bold">Risk Load</span>
                        <p className="text-lg font-bold text-zinc-900 dark:text-white">{trade.riskLoad || 1}x</p>
                    </div>
                </div>
                <div className="bg-zinc-50 dark:bg-white/5 p-4 rounded-xl border border-zinc-200 dark:border-white/5">
                    <span className="text-[10px] text-zinc-500 dark:text-white/40 uppercase font-bold block mb-2">Analysis</span>
                    <p className="text-zinc-800 dark:text-white/80 text-sm whitespace-pre-wrap">{trade.notes || "No notes."}</p>
                </div>

                {/* Attached Images */}
                {trade.setupImages && trade.setupImages.length > 0 && (
                    <div className="space-y-2">
                        <span className="text-[10px] text-zinc-500 dark:text-white/40 uppercase font-bold block pl-1">Chart Images</span>
                        <div className="grid grid-cols-2 gap-2">
                            {trade.setupImages.map((img, i) => (
                                <div key={i} className="rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10 cursor-pointer group" onClick={() => window.open(img, '_blank')}>
                                    <img src={img} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-500" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

const RiskCalculatorModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [balance, setBalance] = useState('');
    const [riskPercent, setRiskPercent] = useState('1');
    const [stopLoss, setStopLoss] = useState('');
    const riskAmount = (parseFloat(balance) * parseFloat(riskPercent)) / 100;
    const standardLotValue = 10;
    const lots = stopLoss ? (riskAmount / (parseFloat(stopLoss) * standardLotValue)).toFixed(2) : '0.00';
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} title="Position Size Calculator" onClose={onClose} confirmText="Done">
            <div className="space-y-4">
                <InputGroup label="Account Balance" value={balance} onChange={setBalance} type="number" placeholder="100000" />
                <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Risk %" value={riskPercent} onChange={setRiskPercent} type="number" placeholder="1.0" />
                    <InputGroup label="Stop Loss (Pips)" value={stopLoss} onChange={setStopLoss} type="number" placeholder="10" />
                </div>
                <div className="p-4 bg-accent/10 border border-accent/20 rounded-xl text-center"><span className="text-[10px] font-bold text-accent uppercase tracking-widest">Recommended Lot Size</span><p className="text-3xl font-black text-zinc-900 dark:text-white mt-1">{lots} Lots</p><p className="text-xs text-zinc-500 dark:text-white/40 mt-1">Risking ${riskAmount.toFixed(2)}</p></div>
            </div>
        </Modal>
    );
};

const TradingCalendar: React.FC<{ trades: TradeLog[]; selectedDate: Date; onSelectDate: (d: Date) => void }> = ({ trades, selectedDate, onSelectDate }) => {
    const [viewDate, setViewDate] = useState(new Date());

    const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));

    const { calendarWeeks, monthStats } = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days: (Date | null)[] = [];

        let startPadding = firstDay.getDay() - 1;
        if (startPadding === -1) startPadding = 6;

        for (let i = 0; i < startPadding; i++) days.push(null);
        for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));

        // Pad the end to complete the grid if needed, though rows are flexible
        const weeks = [];
        let currentWeek = [];
        for (let i = 0; i < days.length; i++) {
            currentWeek.push(days[i]);
            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        }
        if (currentWeek.length > 0) {
            // Fill remaining with nulls
            while (currentWeek.length < 7) currentWeek.push(null);
            weeks.push(currentWeek);
        }

        const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
        const currentMonthTrades = trades.filter(t => t.date.startsWith(monthStr));
        const stats = calculateTradeStats(currentMonthTrades);

        return { calendarWeeks: weeks, monthStats: stats };
    }, [viewDate, trades]);

    return (
        <div className="vision-glass p-4 md:p-6 rounded-[26px] border border-zinc-200 dark:border-white/10 space-y-6">

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2 text-lg">
                        <CalendarCheck className="w-5 h-5 text-accent" />
                        {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <div className="flex bg-zinc-100 dark:bg-white/5 rounded-lg border border-zinc-200 dark:border-white/5">
                        <button onClick={prevMonth} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-white/50 hover:text-zinc-900 dark:hover:text-white transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                        <div className="w-px bg-zinc-200 dark:bg-white/10"></div>
                        <button onClick={nextMonth} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-white/50 hover:text-zinc-900 dark:hover:text-white transition-colors"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-2 md:gap-4">
                <div className="bg-zinc-50 dark:bg-white/5 rounded-xl p-2 md:p-3 border border-zinc-200 dark:border-white/5 text-center">
                    <p className="text-[8px] md:text-[9px] text-zinc-500 dark:text-white/40 uppercase font-bold tracking-wider">Net PnL</p>
                    <p className={`text-base md:text-lg font-black ${monthStats.netR >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                        {monthStats.netR > 0 ? '+' : ''}<CountUp end={Math.abs(monthStats.netR)} decimals={1} />R
                    </p>
                </div>
                <div className="bg-zinc-50 dark:bg-white/5 rounded-xl p-2 md:p-3 border border-zinc-200 dark:border-white/5 text-center">
                    <p className="text-[8px] md:text-[9px] text-zinc-500 dark:text-white/40 uppercase font-bold tracking-wider">Win Rate</p>
                    <p className={`text-base md:text-lg font-black ${monthStats.winRate >= 50 ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                        <CountUp end={monthStats.winRate} decimals={0} />%
                    </p>
                </div>
                <div className="bg-zinc-50 dark:bg-white/5 rounded-xl p-2 md:p-3 border border-zinc-200 dark:border-white/5 text-center">
                    <p className="text-[8px] md:text-[9px] text-zinc-500 dark:text-white/40 uppercase font-bold tracking-wider">Trades</p>
                    <p className="text-base md:text-lg font-black text-zinc-900 dark:text-white"><CountUp end={monthStats.totalTrades} decimals={0} /></p>
                </div>
                <div className="bg-zinc-50 dark:bg-white/5 rounded-xl p-2 md:p-3 border border-zinc-200 dark:border-white/5 text-center">
                    <p className="text-[8px] md:text-[9px] text-zinc-500 dark:text-white/40 uppercase font-bold tracking-wider">PF</p>
                    <p className="text-base md:text-lg font-black text-zinc-900 dark:text-white"><CountUp end={monthStats.profitFactor} decimals={2} /></p>
                </div>
            </div>

            <div className="space-y-1">
                <div className="grid grid-cols-8 gap-1 md:gap-2 mb-2">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S', ''].map((d, i) => (
                        <div key={i} className="text-center text-[9px] md:text-[10px] font-bold text-zinc-400 dark:text-white/20">{d}</div>
                    ))}
                </div>

                {calendarWeeks.map((week, wIdx) => {
                    // Calculate weekly PnL
                    const weekTrades = week.flatMap(day => {
                        if (!day) return [];
                        const dateKey = formatDate(day);
                        return trades.filter(t => t.date === dateKey);
                    });
                    const weekNetR = weekTrades.reduce((acc, t) => acc + (t.rr || 0), 0);

                    return (
                        <div key={wIdx} className="grid grid-cols-8 gap-1 md:gap-2">
                            {week.map((day, i) => {
                                if (!day) return <div key={i} className="aspect-square"></div>;

                                const dateKey = formatDate(day);
                                const dayTrades = trades.filter(t => t.date === dateKey);
                                const dailyNetR = dayTrades.reduce((acc, t) => acc + (t.rr || 0), 0);
                                const count = dayTrades.length;
                                const isSelected = day.toDateString() === selectedDate.toDateString();
                                const isToday = day.toDateString() === new Date().toDateString();

                                let bgClass = 'bg-white/50 dark:bg-white/5 border-transparent';
                                let textClass = 'text-zinc-400 dark:text-white/30';

                                if (count > 0) {
                                    // Calm, neutral colors - no aggressive backgrounds
                                    bgClass = 'bg-zinc-100 dark:bg-white/10 border-zinc-200 dark:border-white/10';
                                    textClass = dailyNetR > 0 ? 'text-emerald-600 dark:text-emerald-400' : dailyNetR < 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-300';
                                }

                                if (isSelected) {
                                    bgClass = 'bg-zinc-200 dark:bg-white/20 ring-1 ring-zinc-400 dark:ring-white shadow-lg z-10';
                                } else if (isToday) {
                                    bgClass += ' ring-1 ring-zinc-300 dark:ring-white/30';
                                } else {
                                    bgClass += ' hover:bg-zinc-100 dark:hover:bg-white/10';
                                }

                                return (
                                    <div
                                        key={i}
                                        onClick={() => onSelectDate(day)}
                                        className={`aspect-square rounded-lg border flex flex-col items-center justify-between p-0.5 md:p-1 cursor-pointer transition-all duration-200 ${bgClass}`}
                                    >
                                        <span className={`text-[7px] md:text-[8px] font-bold self-end ${isSelected || isToday ? 'opacity-100' : 'opacity-40'}`}>{day.getDate()}</span>
                                        {count > 0 ? (
                                            <span className={`text-[8px] md:text-[10px] font-bold leading-none ${textClass}`}>
                                                {dailyNetR > 0 ? '+' : ''}{dailyNetR.toFixed(1)}
                                            </span>
                                        ) : (
                                            <span className="text-[9px] md:text-[10px] opacity-10 font-bold">-</span>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Weekly Summary Column */}
                            <div className="flex flex-col items-center justify-center h-full">
                                {weekTrades.length > 0 && (
                                    <>
                                        <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">W{wIdx + 1}</span>
                                        <span className={`text-[9px] font-bold ${weekNetR > 0 ? 'text-emerald-500' : weekNetR < 0 ? 'text-red-500' : 'text-zinc-400'}`}>
                                            {weekNetR > 0 ? '+' : ''}{weekNetR.toFixed(1)}R
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const TradeLogCard: React.FC<{ trade: TradeLog; onDelete: () => void; onClick: () => void }> = ({ trade, onDelete, onClick }) => (
    <div onClick={onClick} className="group relative flex items-center justify-between p-3 md:p-4 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/10 hover:border-zinc-300 dark:hover:border-white/10 rounded-xl transition-all cursor-pointer shadow-sm">
        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center font-bold text-[10px] md:text-xs border shrink-0 ${trade.direction === 'LONG' ? 'bg-green-500/10 text-green-600 dark:text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-500 border-red-500/20'}`}>
                {trade.direction === 'LONG' ? 'BUY' : 'SELL'}
            </div>
            <div className="min-w-0">
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2 truncate">
                    {trade.pair}
                    {(trade.riskLoad || 1) !== 1 && (
                        <span className={`text-[9px] px-1.5 rounded border hidden sm:inline-block ${trade.riskLoad > 1 ? 'border-red-500/30 text-red-400 bg-red-500/10' : 'border-blue-500/30 text-blue-400 bg-blue-500/10'}`}>
                            {trade.riskLoad}x
                        </span>
                    )}
                </h4>
                <p className="text-[10px] text-zinc-500 dark:text-white/40 uppercase tracking-wider truncate">{trade.date} • {trade.session}</p>
            </div>
        </div>
        <div className="text-right pl-2 md:mr-8">
            <span className={`block font-black text-base md:text-lg ${trade.outcome === 'WIN' ? 'text-green-600 dark:text-green-500' : trade.outcome === 'LOSS' ? 'text-red-600 dark:text-red-500' : 'text-zinc-500 dark:text-white/60'}`}>
                {trade.rr > 0 ? '+' : ''}{trade.rr.toFixed(1)}R
            </span>
            <span className="text-[9px] font-bold text-zinc-400 dark:text-white/30 uppercase tracking-widest">{trade.outcome}</span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 text-zinc-300 dark:text-white/10 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
            <Trash2 className="w-4 h-4" />
        </button>
    </div>
);

// ... (fetchForexFactoryData, EconomicCalendarWidget same as previous but kept for full file integrity) ...
// --- MOCK FOREX FACTORY DATA GENERATOR ---
const seededRandom = (seed: number) => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
};

// Local interface for backend data structure
interface EconomicEvent {
    id: string;
    title: string;
    currency: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    date: string; // ISO '2024-12-16'
    time: string; // '14:00'
}

const fetchForexFactoryData = async (date: Date): Promise<EconomicEvent[]> => {
    // Simulate Network Delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const dateStr = date.toISOString().split('T')[0];
    let seed = dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const dayOfWeek = date.getDay();
    // No news on Sat (6) or Sun (0) usually
    if (dayOfWeek === 0 || dayOfWeek === 6) return [];

    const possibleEvents = [
        { t: "CPI m/m", c: "USD" },
        { t: "Core CPI m/m", c: "USD" },
        { t: "FOMC Statement", c: "USD" },
        { t: "Federal Funds Rate", c: "USD" },
        { t: "Non-Farm Employment Change", c: "USD" },
        { t: "Unemployment Rate", c: "USD" },
        { t: "GDP q/q", c: "USD" },
        { t: "Official Bank Rate", c: "GBP" },
        { t: "Monetary Policy Summary", c: "GBP" },
        { t: "Main Refinancing Rate", c: "EUR" },
        { t: "Monetary Policy Statement", c: "EUR" },
        { t: "CPI y/y", c: "GBP" },
        { t: "CPI y/y", c: "EUR" },
        { t: "Employment Change", c: "AUD" },
        { t: "RBA Rate Statement", c: "AUD" },
        { t: "Overnight Rate", c: "CAD" },
        { t: "BOJ Policy Rate", c: "JPY" }
    ];

    // Determine number of high impact events for this day (0 to 3)
    // Use date specific seed so it's consistent for the same date
    const numEvents = Math.floor(seededRandom(seed) * 4);

    if (numEvents === 0) return [];

    const events: EconomicEvent[] = [];
    for (let i = 0; i < numEvents; i++) {
        seed++;
        const eventIdx = Math.floor(seededRandom(seed) * possibleEvents.length);
        seed++;
        const hour = 8 + Math.floor(seededRandom(seed) * 10); // 08:00 to 18:00
        const minute = seededRandom(seed + 1) > 0.5 ? "30" : "00";

        events.push({
            id: `${dateStr}-${i}`,
            title: possibleEvents[eventIdx].t,
            currency: possibleEvents[eventIdx].c,
            impact: 'HIGH',
            time: `${hour.toString().padStart(2, '0')}:${minute}`,
            date: dateStr
        });
    }

    return events.sort((a, b) => a.time.localeCompare(b.time));
};

const EconomicCalendarWidget: React.FC<{ selectedDate: Date }> = ({ selectedDate }) => {
    const [events, setEvents] = useState<EconomicEvent[]>([]);
    const [viewDate, setViewDate] = useState<Date>(selectedDate);
    const [timeLeft, setTimeLeft] = useState<string | null>(null);
    const [nextEvent, setNextEvent] = useState<EconomicEvent | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Sync with parent selection if it changes
    useEffect(() => {
        setViewDate(selectedDate);
    }, [selectedDate]);

    // Fetch Data Effect
    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            setIsLoading(true);
            try {
                // In a real app, you would fetch from your backend proxy here:
                // const res = await fetch(`/api/calendar?date=${viewDate.toISOString()}`);
                const data = await fetchForexFactoryData(viewDate);
                if (mounted) setEvents(data);
            } catch (error) {
                console.error("Failed to fetch economic calendar", error);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        loadData();

        return () => { mounted = false; };
    }, [viewDate]);

    const highImpactEvents = useMemo(() => {
        return events.sort((a, b) => {
            const dtA = new Date(`${a.date}T${a.time}`).getTime();
            const dtB = new Date(`${b.date}T${b.time}`).getTime();
            return dtA - dtB;
        });
    }, [events]);

    useEffect(() => {
        const calculateTimeLeft = () => {
            if (highImpactEvents.length === 0) {
                setTimeLeft(null);
                setNextEvent(null);
                return;
            }

            const now = new Date();
            // Find first event in the list that is in the future relative to NOW
            const upcoming = highImpactEvents.find(e => {
                const eventDate = new Date(`${e.date}T${e.time}`);
                return eventDate > now;
            });

            if (upcoming) {
                setNextEvent(upcoming);
                const eventDate = new Date(`${upcoming.date}T${upcoming.time}`);
                const diff = eventDate.getTime() - now.getTime();

                if (diff > 0) {
                    const h = Math.floor(diff / (1000 * 60 * 60));
                    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const s = Math.floor((diff % (1000 * 60)) / 1000);
                    setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
                } else {
                    setTimeLeft(null);
                }
            } else {
                setNextEvent(null);
                setTimeLeft(null);
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(timer);
    }, [highImpactEvents]);

    const navigateDate = (days: number) => {
        const newDate = new Date(viewDate);
        newDate.setDate(newDate.getDate() + days);
        setViewDate(newDate);
    };

    const isToday = viewDate.toDateString() === new Date().toDateString();
    const displayDate = viewDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <div className="vision-glass p-6 rounded-[26px] border border-zinc-200 dark:border-white/10 flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                    <Globe className="w-4 h-4 text-zinc-400" /> Economic Calendar
                </h3>
                <span className="text-[9px] font-bold text-zinc-500 dark:text-white/30 bg-zinc-100 dark:bg-white/5 px-2 py-1 rounded border border-zinc-200 dark:border-white/5 uppercase tracking-wider">High Impact Only</span>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center justify-between bg-zinc-100 dark:bg-white/5 rounded-xl p-1 border border-zinc-200 dark:border-white/5">
                <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-lg text-zinc-500 dark:text-white/50 hover:text-zinc-900 dark:hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-accent" />
                    <span className="text-xs font-bold text-zinc-900 dark:text-white font-mono uppercase tracking-wider">{isToday ? 'Today' : displayDate}</span>
                </div>
                <div className="flex items-center gap-1">
                    {!isToday && (
                        <button onClick={() => setViewDate(new Date())} className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider bg-accent/10 text-accent hover:bg-accent/20 rounded border border-accent/20 mr-1 transition-colors">
                            Today
                        </button>
                    )}
                    <button onClick={() => navigateDate(1)} className="p-2 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-lg text-zinc-500 dark:text-white/50 hover:text-zinc-900 dark:hover:text-white transition-colors">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Countdown */}
            {!isLoading && timeLeft && nextEvent && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-zinc-100 dark:from-white/5 to-transparent border border-zinc-200 dark:border-white/5 flex items-center justify-between animate-in slide-in-from-top-2 duration-500">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                        <span className="text-[10px] font-bold text-zinc-500 dark:text-white/50 uppercase tracking-widest">Next Event</span>
                    </div>
                    <span className="text-sm font-mono font-bold text-zinc-900 dark:text-white tracking-widest tabular-nums">{timeLeft}</span>
                </div>
            )}

            {/* Events List */}
            <div className="space-y-2 min-h-[100px]">
                {isLoading ? (
                    <div className="space-y-3 pt-2">
                        {[1, 2].map(i => (
                            <div key={i} className="h-12 bg-zinc-100 dark:bg-white/5 rounded-xl animate-pulse border border-zinc-200 dark:border-white/5"></div>
                        ))}
                    </div>
                ) : highImpactEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center opacity-60">
                        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center mb-2 border border-zinc-200 dark:border-white/10">
                            <CheckCircle className="w-4 h-4 text-zinc-400 dark:text-white/40" />
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-white/60 font-medium">No high-impact economic news scheduled for this day.</p>
                    </div>
                ) : (
                    highImpactEvents.map((event, i) => {
                        const isNext = nextEvent?.id === event.id;

                        return (
                            <div
                                key={i}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isNext ? 'bg-zinc-100 dark:bg-white/10 border-zinc-300 dark:border-white/10 shadow-lg' : 'bg-white/40 dark:bg-white/5 border-zinc-200 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 opacity-80 hover:opacity-100'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-8 rounded-lg flex items-center justify-center font-bold text-[10px] border shadow-sm bg-red-500 text-white border-red-500 shadow-red-500/20`}>
                                        {event.currency}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <p className={`text-xs font-bold truncate pr-2 ${isNext ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-white/80'}`}>{event.title}</p>
                                        <p className="text-[9px] text-zinc-400 dark:text-white/30 font-medium">{displayDate}</p>
                                    </div>
                                </div>
                                <div className="text-right whitespace-nowrap pl-2">
                                    <p className={`text-[10px] font-mono font-bold ${isNext ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-white/40'}`}>{event.time}</p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

// --- Main Export ---
export const Habits: React.FC<{ initialTab?: 'LIFE' | 'TRADING' | 'FOCUS' }> = ({ initialTab = 'LIFE' }) => {
    const { tradeLogs, deleteTradeLog, currentUser, strategies, updateUser } = useAppState();
    const [activeTab, setActiveTab] = useState<'LIFE' | 'TRADING' | 'FOCUS'>(initialTab);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [viewDate, setViewDate] = useState<Date>(new Date());
    const [logs, setLogs] = useState<Record<string, DayLog>>({});

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    // -- Habit Management State --
    const [habitDefs, setHabitDefs] = useState<HabitDef[]>(() => {
        const saved = localStorage.getItem(`lockin_habit_defs_${currentUser?.id || 'guest'}`);
        return saved ? JSON.parse(saved) : DEFAULT_HABIT_CONFIG;
    });
    const [showHabitModal, setShowHabitModal] = useState(false);
    const [editingHabit, setEditingHabit] = useState<HabitDef | undefined>(undefined);

    // Navigation State
    const [showTradeModal, setShowTradeModal] = useState(false);
    const [showRiskCalculator, setShowRiskCalculator] = useState(false);
    const [showStrategyManager, setShowStrategyManager] = useState(false);
    const [selectedTrade, setSelectedTrade] = useState<TradeLog | null>(null);
    const [showAllTrades, setShowAllTrades] = useState(false);

    const [journals, setJournals] = useState<Record<string, JournalEntry>>({});

    // Filter Logic
    const allUserTrades = useMemo(() => tradeLogs.filter(log => log.userId === currentUser?.id), [tradeLogs, currentUser?.id]);

    // Daily specific data
    const dateKey = formatDate(selectedDate);
    const displayTrades = useMemo(() => allUserTrades.filter(t => t.date === dateKey), [allUserTrades, dateKey]);
    const dailyStats = useMemo(() => calculateTradeStats(displayTrades), [displayTrades]);

    // Calculate Cumulative R
    const cumulativeTrades = useMemo(() => {
        // Sort trades by date
        return [...allUserTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [allUserTrades]);

    const totalEquityR = useMemo(() => cumulativeTrades.reduce((acc, t) => acc + (t.rr || 0), 0), [cumulativeTrades]);

    const dailyJournal = journals[dateKey];

    const visibleDates = useMemo(() => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            days.push(addDays(viewDate, -i));
        }
        return days;
    }, [viewDate]);

    useEffect(() => {
        const savedLogs = localStorage.getItem(`lockin_logs_${currentUser?.id || 'guest'}`);
        if (savedLogs) setLogs(JSON.parse(savedLogs));
        const savedJournals = localStorage.getItem(`lockin_journals_${currentUser?.id || 'guest'}`);
        if (savedJournals) setJournals(JSON.parse(savedJournals));
    }, []);

    useEffect(() => {
        if (Object.keys(logs).length > 0) localStorage.setItem(`lockin_logs_${currentUser?.id || 'guest'}`, JSON.stringify(logs));
    }, [logs]);

    // Persist Habits on Change
    useEffect(() => {
        localStorage.setItem(`lockin_habit_defs_${currentUser?.id || 'guest'}`, JSON.stringify(habitDefs));
    }, [habitDefs]);

    const handleSaveHabit = (habit: HabitDef) => {
        setHabitDefs(prev => {
            if (prev.find(h => h.id === habit.id)) {
                return prev.map(h => h.id === habit.id ? habit : h);
            }
            return [...prev, habit];
        });
    };

    const handleDeleteHabit = (id: string) => {
        setHabitDefs(prev => prev.filter(h => h.id !== id));
    };

    const handleSaveJournal = useCallback((content: string, mood: JournalMood, imageUrls: string[]) => {
        setJournals(prev => {
            const newEntry: JournalEntry = {
                id: prev[dateKey]?.id || Date.now().toString(),
                userId: currentUser?.id || 'guest',
                date: dateKey,
                content,
                mood,
                tags: [],
                imageUrls,
                updatedAt: new Date().toISOString()
            };
            const updated = { ...prev, [dateKey]: newEntry };
            localStorage.setItem(`lockin_journals_${currentUser?.id || 'guest'}`, JSON.stringify(updated));
            return updated;
        });
    }, [dateKey, currentUser?.id]);

    const handleDeleteJournal = useCallback((id: string) => {
        setJournals(prev => {
            const entryToDelete = (Object.values(prev) as JournalEntry[]).find(e => e.id === id);
            if (!entryToDelete) return prev;
            const dk = entryToDelete.date;
            const updated = { ...prev };
            delete updated[dk];
            localStorage.setItem(`lockin_journals_${currentUser?.id || 'guest'}`, JSON.stringify(updated));
            return updated;
        });
    }, []);

    const currentLog = logs[dateKey] || { date: dateKey, completedHabits: [] };
    const completedCount = currentLog.completedHabits.length;
    const totalHabits = habitDefs.length;
    const progressPercentage = totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0;

    const totalXP = useMemo(() => (Object.values(logs) as DayLog[]).reduce((acc, log) => {
        return acc + log.completedHabits.reduce((sum, hId) => {
            const habit = habitDefs.find(h => h.id === hId);
            return sum + (habit?.points || 0);
        }, 0);
    }, 0), [logs, habitDefs]);

    // --- SYNC XP TO GLOBAL STATE ---
    useEffect(() => {
        if (currentUser && totalXP !== currentUser.points) {
            updateUser({ points: totalXP });
        }
    }, [totalXP, currentUser, updateUser]);

    const level = getLevel(totalXP);
    const LevelIcon = level.icon;

    const currentStreak = useMemo(() => {
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const k = formatDate(d);
            const log = logs[k];
            if (log && log.completedHabits.length >= Math.ceil(totalHabits * 0.5)) {
                streak++;
            } else if (i === 0 && log && log.completedHabits.length < Math.ceil(totalHabits * 0.5)) {
                continue;
            } else {
                break;
            }
        }
        return streak;
    }, [logs, totalHabits]);

    const toggleHabit = useCallback((id: string) => {
        setLogs(prev => {
            const prevLog = prev[dateKey] || { date: dateKey, completedHabits: [] };
            const isCompleted = prevLog.completedHabits.includes(id);
            const newCompleted = isCompleted
                ? prevLog.completedHabits.filter(h => h !== id)
                : [...prevLog.completedHabits, id];
            return {
                ...prev,
                [dateKey]: { ...prevLog, completedHabits: newCompleted }
            };
        });
    }, [dateKey]);

    const violations = useMemo(() => habitDefs.map(habit => {
        let missed = 0;
        visibleDates.forEach(d => {
            const k = formatDate(d);
            const log = logs[k];
            if (d <= new Date() && (!log || !log.completedHabits.includes(habit.id))) {
                missed++;
            }
        });
        return { name: habit.label, count: missed, category: habit.category };
    }).filter(v => v.count > 0).sort((a, b) => b.count - a.count), [visibleDates, logs, habitDefs]);

    const navigateWeek = useCallback((direction: 'prev' | 'next') => {
        const newDate = addDays(viewDate, direction === 'prev' ? -7 : 7);
        const today = new Date();
        if (direction === 'next' && newDate > today) {
            setViewDate(today);
        } else {
            setViewDate(newDate);
        }
    }, [viewDate]);

    const navigateDay = useCallback((days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    }, [selectedDate]);

    const isToday = selectedDate.toDateString() === new Date().toDateString();

    return (
        <div className="space-y-6 md:space-y-8 pb-32 md:pb-0">

            <HabitEditorModal
                isOpen={showHabitModal}
                onClose={() => setShowHabitModal(false)}
                habit={editingHabit}
                onSave={handleSaveHabit}
            />

            <div className="flex justify-center mb-6 px-4 md:px-0">
                <div className="bg-zinc-100 dark:bg-white/10 p-1 rounded-2xl flex w-full max-w-md border border-zinc-200 dark:border-white/10 shadow-lg">
                    <button
                        onClick={() => setActiveTab('LIFE')}
                        className={`flex-1 py-3 md:py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'LIFE' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30' : 'text-zinc-500 dark:text-white/5 hover:text-zinc-900 dark:hover:text-white'}`}
                    >
                        Life Protocol
                    </button>
                    <button
                        onClick={() => setActiveTab('TRADING')}
                        className={`flex-1 py-3 md:py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'TRADING' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30' : 'text-zinc-500 dark:text-white/5 hover:text-zinc-900 dark:hover:text-white'}`}
                    >
                        Trade Journal
                    </button>
                    <button
                        onClick={() => setActiveTab('FOCUS')}
                        className={`flex-1 py-3 md:py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'FOCUS' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30' : 'text-zinc-500 dark:text-white/5 hover:text-zinc-900 dark:hover:text-white'}`}
                    >
                        Deep Work
                    </button>
                </div>
            </div>

            {activeTab === 'FOCUS' && (
                <div className="vision-glass p-8 rounded-[26px] min-h-[600px] flex flex-col items-center justify-center border border-zinc-200 dark:border-white/10">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter mb-2">DEEP WORK CHAMBER</h2>
                        <p className="text-zinc-500 dark:text-white/40 text-sm font-medium uppercase tracking-widest">Eliminate Distractions</p>
                    </div>
                    <FocusTimer />
                </div>
            )}

            {activeTab === 'LIFE' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="md:col-span-4 relative group perspective-1000">
                            <div className="relative w-full aspect-[1.8/1] md:aspect-[2.2/1] rounded-[24px] overflow-hidden transition-all duration-500 hover:scale-[1.01] shadow-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#080808]">

                                {/* 1. Background Effects */}
                                <div className="absolute inset-0 bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-900 dark:via-black dark:to-zinc-950"></div>
                                <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.03)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_50%)] animate-pulse-slow"></div>
                                <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

                                {/* 2. Content */}
                                <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between z-10">

                                    {/* Top Row: Brand & Chip */}
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center backdrop-blur-md">
                                                <Lock className="w-5 h-5 text-zinc-900 dark:text-white" />
                                            </div>
                                            <div>
                                                <span className="block font-black text-zinc-900 dark:text-white text-lg tracking-tight leading-none italic">LOCK-IN</span>
                                                <span className="text-[10px] text-zinc-500 dark:text-white/40 uppercase tracking-[0.3em] font-bold">Protocol Card</span>
                                            </div>
                                        </div>
                                        {/* Modern Holographic Element */}
                                        <div className="relative overflow-hidden rounded-lg border border-zinc-200 dark:border-white/20">
                                            <div className="px-3 py-1 bg-gradient-to-r from-gray-100 via-white to-gray-200 dark:from-gray-200 dark:via-gray-100 dark:to-gray-300 text-black text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-inner">
                                                <Wifi className="w-3 h-3 rotate-90 opacity-60" />
                                                <span>NFC Active</span>
                                            </div>
                                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent translate-x-[-100%] animate-shimmer"></div>
                                        </div>
                                    </div>

                                    {/* Middle: Massive Streak */}
                                    <div className="flex flex-col justify-center py-2">
                                        <div className="flex items-end gap-1">
                                            <span className="text-[10px] font-bold text-zinc-500 dark:text-white/30 uppercase tracking-widest mb-1.5">Current Streak</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-500 dark:from-white dark:via-white dark:to-white/50 tracking-tighter drop-shadow-lg flex items-center gap-2">
                                                <CountUp end={currentStreak} duration={1500} />
                                                <span className="text-2xl md:text-3xl text-zinc-300 dark:text-white/30 font-medium self-end mb-3">DAYS</span>
                                            </div>
                                            {/* Flame Icon if streak > 3 */}
                                            {currentStreak > 3 && (
                                                <div className="p-3 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 animate-pulse">
                                                    <Flame className="w-8 h-8 fill-current" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bottom: Info Grid */}
                                    <div className="grid grid-cols-3 gap-4 border-t border-zinc-200 dark:border-white/10 pt-4">
                                        <div>
                                            <span className="block text-[9px] text-zinc-500 dark:text-white/30 uppercase font-bold tracking-wider mb-0.5">Holder</span>
                                            <span className="block text-sm font-bold text-zinc-900 dark:text-white tracking-wide truncate">{currentUser?.name || "Member"}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[9px] text-zinc-500 dark:text-white/30 uppercase font-bold tracking-wider mb-0.5">Rank</span>
                                            <div className={`flex items-center gap-1.5 font-bold text-sm ${level.color}`}>
                                                <LevelIcon className="w-3.5 h-3.5" />
                                                <span>{level.name}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-[9px] text-zinc-500 dark:text-white/30 uppercase font-bold tracking-wider mb-0.5">Lifetime XP</span>
                                            <span className="block text-sm font-mono font-bold text-zinc-900 dark:text-white tracking-wider">
                                                <CountUp end={totalXP} duration={2000} />
                                            </span>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Daily Protocol</h3>
                                <div className="flex items-center gap-3 bg-zinc-100 dark:bg-white/5 rounded-xl p-1.5 border border-zinc-200 dark:border-white/5">
                                    <button onClick={() => navigateDay(-1)} className="p-1 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-lg text-zinc-500 dark:text-white/50 hover:text-zinc-900 dark:hover:text-white transition-colors">
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <div className="flex items-center gap-2 px-1 min-w-[100px] justify-center">
                                        {!isToday && (
                                            <button onClick={() => setSelectedDate(new Date())} className="text-[9px] bg-accent/20 text-accent px-1.5 py-0.5 rounded font-bold uppercase tracking-wider mr-1 border border-accent/20">
                                                Today
                                            </button>
                                        )}
                                        <p className="text-zinc-900 dark:text-white text-xs font-bold uppercase tracking-wider">{selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                                    </div>
                                    <button onClick={() => navigateDay(1)} className="p-1 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-lg text-zinc-500 dark:text-white/50 hover:text-zinc-900 dark:hover:text-white transition-colors">
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`text-2xl font-black ${progressPercentage === 100 ? 'text-green-500' : 'text-zinc-900 dark:text-white'} drop-shadow-md`}>
                                    <CountUp end={progressPercentage} />%
                                </span>
                                <p className="text-[10px] uppercase text-zinc-500 dark:text-white/40 font-bold tracking-widest">Completion</p>
                            </div>

                            <ProgressBar progress={progressPercentage} color={progressPercentage === 100 ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'bg-gradient-to-r from-violet-600 to-indigo-500 shadow-[0_0_15px_rgba(139,92,246,0.4)]'} />

                            <div className="space-y-4">
                                {habitDefs.map((habit, i) => (
                                    <StaggerItem key={habit.id} index={i} delayPerItem={0.03}>
                                        <HabitRow
                                            habit={habit}
                                            completed={currentLog.completedHabits.includes(habit.id)}
                                            onToggle={() => toggleHabit(habit.id)}
                                            onEdit={() => { setEditingHabit(habit); setShowHabitModal(true); }}
                                            onDelete={() => handleDeleteHabit(habit.id)}
                                        />
                                    </StaggerItem>
                                ))}
                            </div>

                            <button
                                onClick={() => { setEditingHabit(undefined); setShowHabitModal(true); }}
                                className="w-full py-3 rounded-xl border border-dashed border-zinc-300 dark:border-white/20 text-zinc-400 dark:text-white/40 text-xs font-bold uppercase tracking-widest hover:border-zinc-400 dark:hover:border-white/40 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/5 transition-all"
                            >
                                + Add New Protocol Task
                            </button>
                        </div>

                        <div className="space-y-6">
                            <JournalManager
                                dateKey={dateKey}
                                entry={journals[dateKey]}
                                allEntries={Object.values(journals) as JournalEntry[]}
                                onSave={handleSaveJournal}
                                onDelete={handleDeleteJournal}
                                currentDate={selectedDate}
                                onNavigate={navigateDay}
                            />
                        </div>
                    </div>
                </>
            ) : activeTab === 'TRADING' ? (
                <div className="space-y-6 animate-in slide-in-from-right-2 duration-300">
                    <NewTradeModal isOpen={showTradeModal} onClose={() => setShowTradeModal(false)} selectedDate={selectedDate} />
                    <ViewTradeModal trade={selectedTrade} onClose={() => setSelectedTrade(null)} />
                    <RiskCalculatorModal isOpen={showRiskCalculator} onClose={() => setShowRiskCalculator(false)} />
                    <StrategyManagerModal isOpen={showStrategyManager} onClose={() => setShowStrategyManager(false)} />

                    {/* PnL Calendar - Passes all trades for dots, handles selection */}
                    <TradingCalendar
                        trades={allUserTrades}
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                    />

                    {/* Actions & Calculator Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 md:gap-3 content-start lg:col-span-3">
                            <div className="vision-glass p-3 md:p-4 rounded-[26px] flex flex-col justify-center items-center border border-zinc-200 dark:border-white/10 gap-2 group cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors h-full min-h-[100px]" onClick={() => setShowTradeModal(true)}>
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-accent flex items-center justify-center text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] group-hover:scale-110 transition-transform">
                                    <Plus className="w-5 h-5 md:w-6 md:h-6" />
                                </div>
                                <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-white/60 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">Log Trade</p>
                            </div>

                            <div className="vision-glass p-3 md:p-4 rounded-[26px] flex flex-col justify-center items-center border border-zinc-200 dark:border-white/10 gap-2 group cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors h-full min-h-[100px]" onClick={() => setShowStrategyManager(true)}>
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center text-zinc-900 dark:text-white border border-zinc-200 dark:border-white/10 group-hover:scale-110 transition-transform">
                                    <Lightbulb className="w-5 h-5 md:w-6 md:h-6" />
                                </div>
                                <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-white/60 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">Playbooks</p>
                            </div>

                            <div className="h-full min-h-[100px]">
                                <RiskCalculatorWidget />
                            </div>
                        </div>
                    </div>

                    {/* Daily Reflection from Journal if exists */}
                    {dailyJournal && (
                        <div className="vision-glass p-5 rounded-[20px] border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5">
                            <div className="flex items-center gap-3 mb-2">
                                <PenTool className="w-4 h-4 text-accent" />
                                <h4 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Daily Reflection</h4>
                            </div>
                            <div className="text-zinc-800 dark:text-white/80 text-sm whitespace-pre-wrap italic pl-7 border-l-2 border-accent/30">
                                {dailyJournal.content.replace(/<[^>]*>?/gm, '')}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-accent" /> Daily Trades
                                </h3>
                                {displayTrades.length > 3 && (
                                    <Button size="xs" variant="ghost" className="text-zinc-500 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white" onClick={() => setShowAllTrades(!showAllTrades)}>
                                        {showAllTrades ? 'Show Less' : 'View All'}
                                    </Button>
                                )}
                            </div>

                            {displayTrades.length === 0 ? (
                                <div className="vision-glass p-12 rounded-[26px] flex flex-col items-center justify-center text-center border border-zinc-200 dark:border-white/10 border-dashed">
                                    <BarChart2 className="w-12 h-12 text-zinc-300 dark:text-white/20 mb-4" />
                                    <h4 className="text-zinc-900 dark:text-white font-bold mb-2">No trades recorded on this day.</h4>
                                    <p className="text-zinc-500 dark:text-white/40 text-sm max-w-xs mb-6">Select another date in the calendar or log a new trade.</p>
                                    <Button onClick={() => setShowTradeModal(true)}>Log First Trade</Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {displayTrades.slice(0, showAllTrades ? undefined : 3).map((trade, i) => (
                                        <StaggerItem key={trade.id} index={i} delayPerItem={0.05}>
                                            <TradeLogCard
                                                trade={trade}
                                                onDelete={() => deleteTradeLog(trade.id)}
                                                onClick={() => setSelectedTrade(trade)}
                                            />
                                        </StaggerItem>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="vision-glass p-6 rounded-[26px] border border-zinc-200 dark:border-white/10">
                                <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-widest mb-6">Performance by Session</h3>
                                <div className="space-y-4">
                                    {['NY', 'LONDON', 'ASIA'].map(s => {
                                        const sessionTrades = displayTrades.filter(t => t.session === s);
                                        const sWins = sessionTrades.filter(t => t.outcome === 'WIN').length;
                                        const sTotal = sessionTrades.length;
                                        const rate = sTotal > 0 ? Math.round((sWins / sTotal) * 100) : 0;
                                        return (
                                            <div key={s} className="space-y-2">
                                                <div className="flex justify-between text-xs font-bold text-zinc-600 dark:text-white/60">
                                                    <span>{s}</span>
                                                    <span>{rate}% ({sWins}/{sTotal})</span>
                                                </div>
                                                <ProgressBar progress={rate} color="bg-blue-500" />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <EconomicCalendarWidget selectedDate={selectedDate} />
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};
