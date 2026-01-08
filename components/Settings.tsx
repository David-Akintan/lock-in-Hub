
import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '../App';
import { 
  ChevronRight, Bell, Shield, Moon, LogOut, Smartphone, Download, Trash2, 
  Camera, Globe, Activity, Zap, TrendingUp, Target, Award, Crown, 
  Settings as SettingsIcon, Hexagon, Lock, Save 
} from 'lucide-react';
import { Button, CountUp, StaggerItem } from './Shared';
import { Role } from '../types';

// --- CUSTOM ICONS ---
const Crosshair = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
);

const Brain = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>
);

// --- TYPES & CONFIG ---

interface BadgeDef {
    id: string;
    label: string;
    description: string;
    icon: React.ElementType;
    condition: (stats: any) => boolean;
}

const BADGES: BadgeDef[] = [
    { id: 'b1', label: 'First Blood', description: 'Log your first trade', icon: Target, condition: (stats: any) => stats.totalTrades > 0 },
    { id: 'b2', label: 'Iron Mind', description: '7 Day Protocol Streak', icon: Brain, condition: (stats: any) => stats.streak >= 7 },
    { id: 'b3', label: 'Sniper', description: 'Win Rate > 60% (Min 5 Trades)', icon: Crosshair, condition: (stats: any) => stats.totalTrades >= 5 && stats.winRate > 60 },
    { id: 'b4', label: 'Centurion', description: 'Reach 1000 XP', icon: Shield, condition: (stats: any) => stats.xp >= 1000 },
    { id: 'b5', label: 'Monk Mode', description: '30 Day Protocol Streak', icon: Zap, condition: (stats: any) => stats.streak >= 30 },
    { id: 'b6', label: 'Whale', description: 'Net Profit > 50R', icon: Crown, condition: (stats: any) => stats.netR > 50 },
];

// --- COMPONENTS ---

const SectionLabel = ({ label }: { label: string }) => (
    <div className="flex items-center gap-3 mb-4 mt-8 first:mt-0">
        <h3 className="text-[10px] font-bold text-zinc-400 dark:text-white/30 uppercase tracking-widest">{label}</h3>
        <div className="h-px flex-1 bg-zinc-200 dark:bg-white/5"></div>
    </div>
);

const SettingsRow = ({ icon: Icon, label, value, onClick, danger }: any) => (
    <button 
        onClick={onClick}
        className="w-full flex items-center justify-between p-4 border-b border-zinc-100 dark:border-white/5 last:border-0 hover:bg-zinc-50 dark:hover:bg-white/5 transition-all group"
    >
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors border ${danger ? 'bg-red-500/5 border-red-500/10 text-red-500 group-hover:bg-red-500/10' : 'bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/5 text-zinc-500 dark:text-white/50 group-hover:bg-zinc-100 dark:group-hover:bg-white/10 group-hover:text-zinc-900 dark:group-hover:text-white'}`}>
                <Icon className="w-5 h-5" />
            </div>
            <span className={`font-medium text-sm ${danger ? 'text-red-600 dark:text-red-500' : 'text-zinc-900 dark:text-white'}`}>{label}</span>
        </div>
        <div className="flex items-center gap-3">
            {value && <span className="text-xs font-medium text-zinc-400 dark:text-white/30 font-mono">{value}</span>}
            <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-white/20 group-hover:text-zinc-500 dark:group-hover:text-white/60 transition-colors" />
        </div>
    </button>
);

const StatModule = ({ label, value, subtext, icon: Icon, trend, isCurrency, colorClass = "text-zinc-900 dark:text-white" }: any) => (
    <div className="relative overflow-hidden rounded-[24px] bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/10 p-5 group hover:border-zinc-300 dark:hover:border-white/20 transition-all">
        {/* Background Glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-current to-transparent opacity-[0.03] rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none text-zinc-500 dark:text-white"></div>
        
        <div className="flex justify-between items-start mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border bg-zinc-50 dark:bg-white/5 border-zinc-100 dark:border-white/5 text-zinc-500 dark:text-white/50 group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5" />
            </div>
            {trend && (
                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${trend > 0 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/10' : 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/10'}`}>
                    {trend > 0 ? '▲' : '▼'} {Math.abs(trend)}%
                </span>
            )}
        </div>

        <div>
            <div className={`text-3xl font-black tracking-tight mb-1 ${colorClass}`}>
                {typeof value === 'number' ? (
                    <CountUp 
                        end={value} 
                        prefix={isCurrency && value > 0 ? '+' : ''} 
                        suffix={isCurrency ? 'R' : ''} 
                        decimals={isCurrency ? 1 : 0} 
                    />
                ) : (
                    value
                )}
            </div>
            <p className="text-[10px] font-bold text-zinc-400 dark:text-white/30 uppercase tracking-wider">{label}</p>
        </div>
        
        {subtext && (
            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-white/5">
                <p className="text-[10px] font-medium text-zinc-400 dark:text-white/30 font-mono truncate">{subtext}</p>
            </div>
        )}
    </div>
);

const BadgeCard: React.FC<{ badge: BadgeDef, unlocked: boolean }> = ({ badge, unlocked }) => (
    <div className={`relative group p-4 rounded-[24px] border transition-all duration-300 flex flex-col items-center text-center gap-3 ${unlocked ? 'bg-gradient-to-b from-zinc-50 to-white dark:from-white/5 dark:to-transparent border-accent/20 shadow-[0_4px_20px_-10px_rgba(139,92,246,0.3)]' : 'bg-zinc-50/50 dark:bg-white/[0.02] border-zinc-200 dark:border-white/5 opacity-60 hover:opacity-100'}`}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner transition-transform group-hover:scale-110 duration-500 ${unlocked ? 'bg-accent text-white border-white/20 shadow-accent/40' : 'bg-zinc-200 dark:bg-white/5 text-zinc-400 dark:text-white/20 border-transparent'}`}>
            <badge.icon className="w-6 h-6" />
        </div>
        
        <div className="space-y-1">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${unlocked ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-white/40'}`}>{badge.label}</h4>
            <p className="text-[9px] text-zinc-400 dark:text-white/30 leading-tight px-1">{badge.description}</p>
        </div>

        {!unlocked && (
            <div className="absolute top-3 right-3 text-zinc-300 dark:text-white/10">
                <Lock className="w-3 h-3" />
            </div>
        )}
    </div>
);

// --- MAIN PAGE ---

export const Settings: React.FC = () => {
    const { currentUser, logout, theme, toggleTheme, updateUser, tradeLogs } = useAppState();
    const [activeTab, setActiveTab] = useState<'IDENTITY' | 'SYSTEM'>('IDENTITY');
    
    // Stats State
    const [streak, setStreak] = useState(0);
    const [stats, setStats] = useState({ totalTrades: 0, winRate: 0, netR: 0, xp: 0, streak: 0 });

    // Profile Edit State
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [avatar, setAvatar] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (currentUser) {
            setName(currentUser.name);
            setBio(currentUser.bio || '');
            setAvatar(currentUser.avatar);
        }
    }, [currentUser]);

    // Calculate Stats
    useEffect(() => {
        if (!currentUser) return;

        // 1. Streak
        const savedLogs = localStorage.getItem('lockin_logs');
        let currentStreak = 0;
        if (savedLogs) {
            const logs = JSON.parse(savedLogs);
            const dates = Object.keys(logs);
            if (dates.length > 0) currentStreak = dates.length; // Simplified visual proxy
        }
        setStreak(currentStreak);

        // 2. Trade Stats
        const myTrades = tradeLogs.filter(t => t.userId === currentUser.id);
        const totalTrades = myTrades.length;
        const wins = myTrades.filter(t => t.outcome === 'WIN').length;
        const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
        const netR = myTrades.reduce((acc, t) => acc + (t.rr || 0), 0);
        
        setStats({
            totalTrades,
            winRate,
            netR,
            xp: currentUser.points || 0,
            streak: currentStreak
        });

    }, [currentUser, tradeLogs]);

    const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => setAvatar(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const saveProfile = () => {
        updateUser({ name, bio, avatar });
    };

    if (!currentUser) return null;

    const level = Math.floor((currentUser.points || 0) / 1000) + 1;
    const progressToNext = ((currentUser.points || 0) % 1000) / 10; // %

    return (
        <div className="flex flex-col items-center w-full min-h-screen pb-32">
            
            {/* Custom Tab Switcher */}
            <div className="sticky top-0 z-30 py-4 w-full flex justify-center bg-white/80 dark:bg-[#020202]/80 backdrop-blur-xl border-b border-zinc-200 dark:border-white/5 mb-8">
                <div className="bg-zinc-100 dark:bg-white/5 p-1 rounded-full flex gap-1 shadow-inner border border-zinc-200 dark:border-white/5">
                    <button 
                        onClick={() => setActiveTab('IDENTITY')}
                        className={`px-8 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${activeTab === 'IDENTITY' ? 'bg-white dark:bg-[#0A0A0A] text-zinc-900 dark:text-white shadow-lg shadow-black/5 dark:shadow-black/20 ring-1 ring-black/5 dark:ring-white/10' : 'text-zinc-500 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white'}`}
                    >
                        <SettingsIcon className="w-3.5 h-3.5" /> Identity
                    </button>
                    <button 
                        onClick={() => setActiveTab('SYSTEM')}
                        className={`px-8 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${activeTab === 'SYSTEM' ? 'bg-white dark:bg-[#0A0A0A] text-zinc-900 dark:text-white shadow-lg shadow-black/5 dark:shadow-black/20 ring-1 ring-black/5 dark:ring-white/10' : 'text-zinc-500 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white'}`}
                    >
                        <Hexagon className="w-3.5 h-3.5" /> System
                    </button>
                </div>
            </div>

            <div className="w-full max-w-5xl px-4 md:px-0">
                {activeTab === 'IDENTITY' ? (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        
                        {/* 1. HERO PROFILE CARD */}
                        <div className="relative w-full overflow-hidden rounded-[40px] bg-[#0A0A0A] border border-white/10 shadow-2xl group">
                           {/* Background FX */}
                           <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.15),transparent_50%)]"></div>
                           <div className="absolute bottom-0 left-0 w-full h-2/3 bg-gradient-to-t from-black to-transparent"></div>
                           <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

                           <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center md:items-start gap-10">
                              
                              {/* Avatar Module */}
                              <div className="relative shrink-0 group/avatar">
                                 <div className="w-36 h-36 md:w-44 md:h-44 relative flex items-center justify-center">
                                    {/* Rotating Rings */}
                                    <div className="absolute inset-0 rounded-full border border-white/5 border-dashed animate-[spin_30s_linear_infinite]"></div>
                                    <div className="absolute inset-2 rounded-full border border-white/5 border-dotted animate-[spin_20s_linear_infinite_reverse]"></div>
                                    
                                    {/* Level Progress */}
                                    <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-[0_0_15px_rgba(139,92,246,0.4)]">
                                        <circle cx="50%" cy="50%" r="44%" stroke="currentColor" strokeWidth="2" fill="none" className="text-white/5" />
                                        <circle cx="50%" cy="50%" r="44%" stroke="#8B5CF6" strokeWidth="2" fill="none" strokeDasharray="300" strokeDashoffset={300 - (300 * progressToNext / 100)} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                                    </svg>

                                    {/* Image */}
                                    <div className="w-[82%] h-[82%] rounded-full overflow-hidden border-[3px] border-[#0A0A0A] relative z-10 shadow-2xl">
                                        <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover grayscale group-hover/avatar:grayscale-0 transition-all duration-700" />
                                    </div>

                                    {/* Level Badge */}
                                    <div className="absolute -bottom-4 bg-[#0A0A0A] ring-1 ring-white/10 px-4 py-1.5 rounded-full flex items-center gap-2 shadow-xl z-20">
                                        <div className="w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_8px_#8B5CF6]"></div>
                                        <span className="text-[10px] font-black text-white tracking-[0.2em]">LVL {level}</span>
                                    </div>
                                 </div>
                              </div>

                              {/* Info Module */}
                              <div className="flex-1 text-center md:text-left space-y-5">
                                 <div className="space-y-1">
                                    <div className="flex items-center justify-center md:justify-start gap-4">
                                        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase leading-none">{currentUser.name}</h1>
                                        {currentUser.role === Role.MENTOR && (
                                            <div className="px-2.5 py-1 bg-violet-500/10 border border-violet-500/30 rounded text-[10px] font-bold text-violet-400 uppercase tracking-widest shadow-[0_0_20px_rgba(139,92,246,0.15)]">
                                                PRO
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-white/50 font-mono text-sm max-w-lg mx-auto md:mx-0 leading-relaxed">
                                        {currentUser.bio || "System status: Online. Ready to execute."}
                                    </p>
                                 </div>

                                 <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-10 gap-y-4 pt-4 border-t border-white/5">
                                    <div>
                                        <span className="block text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mb-1">Join Date</span>
                                        <span className="font-mono text-sm font-medium text-white/80 tracking-wide">OCT 14, 2023</span>
                                    </div>
                                    <div>
                                        <span className="block text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mb-1">Operator ID</span>
                                        <span className="font-mono text-sm font-medium text-white/80 tracking-wide">#8829-X</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 px-4 py-2 rounded-lg bg-green-500/5 border border-green-500/10">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]"></div>
                                        <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Uplink Active</span>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* 2. STATS MODULES */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StaggerItem index={0} className="h-full">
                                <StatModule 
                                    label="Net Profit" 
                                    value={stats.netR} 
                                    isCurrency 
                                    icon={TrendingUp} 
                                    trend={12} 
                                    subtext="Lifetime PnL" 
                                    colorClass={stats.netR >= 0 ? 'text-emerald-500' : 'text-red-500'}
                                />
                            </StaggerItem>
                            <StaggerItem index={1} className="h-full">
                                <StatModule label="Win Rate" value={<><CountUp end={stats.winRate} decimals={0} />%</>} icon={Target} subtext={`${stats.totalTrades} Executions`} />
                            </StaggerItem>
                            <StaggerItem index={2} className="h-full">
                                <StatModule label="Discipline" value={<><CountUp end={streak} /> Days</>} icon={Zap} subtext="Protocol Streak" colorClass="text-orange-500" />
                            </StaggerItem>
                            <StaggerItem index={3} className="h-full">
                                <StatModule label="Experience" value={<CountUp end={stats.xp} />} icon={Activity} subtext={`${1000 - (stats.xp % 1000)} XP to Lvl ${level + 1}`} colorClass="text-accent" />
                            </StaggerItem>
                        </div>

                        {/* 3. TROPHY CASE */}
                        <div className="space-y-6">
                            <SectionLabel label="Achievements" />
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {BADGES.map((badge, i) => (
                                    <StaggerItem key={badge.id} index={i} delayPerItem={0.03}>
                                        <BadgeCard badge={badge} unlocked={badge.condition(stats)} />
                                    </StaggerItem>
                                ))}
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-right-4 duration-500">
                        {/* SYSTEM SETTINGS VIEW */}
                        
                        {/* Profile Edit */}
                        <div>
                            <SectionLabel label="Public Identity" />
                            <div className="bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/10 rounded-[24px] overflow-hidden p-6 space-y-6 shadow-sm">
                                <div className="flex flex-col md:flex-row items-center gap-6">
                                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                        <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-white/10 overflow-hidden ring-4 ring-zinc-50 dark:ring-white/5">
                                            <img src={avatar} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Camera className="w-6 h-6 text-white" />
                                        </div>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarSelect} />
                                    </div>
                                    <div className="flex-1 w-full space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-zinc-400 dark:text-white/30 uppercase tracking-widest ml-1">Codename</label>
                                            <input 
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white font-bold focus:border-accent focus:outline-none transition-all"
                                                placeholder="Display Name"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-zinc-400 dark:text-white/30 uppercase tracking-widest ml-1">Bio</label>
                                            <input 
                                                value={bio}
                                                onChange={(e) => setBio(e.target.value)}
                                                className="w-full bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-700 dark:text-white/80 focus:border-accent focus:outline-none transition-all"
                                                placeholder="Mission statement..."
                                            />
                                        </div>
                                    </div>
                                </div>
                                <Button onClick={saveProfile} className="w-full" size="sm" icon={Save}>Save Identity</Button>
                            </div>
                        </div>

                        {/* App Settings */}
                        <div>
                            <SectionLabel label="Preferences" />
                            <div className="flex flex-col bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/10 rounded-[24px] overflow-hidden shadow-sm">
                                <SettingsRow icon={Globe} label="Language" value={currentUser.language || 'English (US)'} onClick={() => {}} />
                                <SettingsRow icon={Bell} label="Notifications" value="On" onClick={() => {}} />
                                <div className="p-4 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={toggleTheme}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-white/5 flex items-center justify-center text-zinc-500 dark:text-white/50 border border-zinc-200 dark:border-white/5">
                                            <Moon className="w-5 h-5" />
                                        </div>
                                        <span className="font-semibold text-sm text-zinc-900 dark:text-white">Dark Mode</span>
                                    </div>
                                    <button className={`w-12 h-7 rounded-full relative transition-colors border border-transparent ${theme === 'dark' ? 'bg-accent border-accent/20' : 'bg-zinc-200 dark:bg-white/10'}`}>
                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${theme === 'dark' ? 'left-6' : 'left-1'}`}></div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Security */}
                        <div>
                            <SectionLabel label="Security" />
                            <div className="flex flex-col bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/10 rounded-[24px] overflow-hidden shadow-sm">
                                <SettingsRow icon={Shield} label="Password" value="••••••••" onClick={() => {}} />
                                <SettingsRow icon={Smartphone} label="Active Sessions" value="2 Devices" onClick={() => {}} />
                                <SettingsRow icon={Download} label="Export Archive" onClick={() => {}} />
                                <SettingsRow icon={Trash2} label="Terminate Account" danger onClick={() => {}} />
                            </div>
                        </div>

                        <Button 
                            onClick={logout} 
                            variant="secondary"
                            className="w-full bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 mt-8" 
                            icon={LogOut}
                        >
                            Disconnect Session
                        </Button>

                        <p className="text-center text-[10px] text-zinc-400 dark:text-white/20 font-mono">
                            SESSION ID: {currentUser.id.slice(0,8)}... • BUILD v3.0
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
