
import React, { useEffect, useState } from 'react';
import { useAppState } from '../App';
import {
    Lock, Zap, MessageSquare, Brain, User as UserIcon,
    TrendingUp, Calendar, ArrowRight, Activity, Plus,
    ShieldAlert, CheckCircle2, Play, Radio, AlertTriangle, Info, Clock
} from 'lucide-react';
import { NextNewsWidget, UnifiedMentorMessageCard, CountUp } from './Shared';
import { Broadcast } from '../types';

export const StudentDashboard: React.FC<{ onJoinSession: () => void; onNavigate: (tab: string) => void }> = ({ onJoinSession, onNavigate }) => {
    const { announcements, tradeLogs, currentUser, broadcasts, dailyMindsetUrl, dailyMindsetThumbnail } = useAppState();
    const [protocolStats, setProtocolStats] = useState({ percentage: 0, violations: 0 });

    // Calculate Performance (Daily R)
    // Normalize today to YYYY-MM-DD for comparison
    const now = new Date();
    const todayKey = now.toISOString().split('T')[0];

    const todaysTrades = tradeLogs.filter(t => {
        if (t.userId !== currentUser?.id) return false;
        return t.date === todayKey;
    });

    // FIX: Use the new signed RR value which includes Risk Load
    const totalRR = todaysTrades.reduce((acc, t) => acc + (t.rr || 0), 0);

    const dailyTarget = 3;
    // Clamp for progress bar (0 to 100)
    const progress = Math.min(100, Math.max(0, (totalRR / dailyTarget) * 100));

    // Calculate Protocol Stats from LocalStorage (Shared with Habits component)
    useEffect(() => {
        // 1. Get Logs
        const savedLogs = localStorage.getItem(`lockin_logs_${currentUser?.id || 'guest'}`);

        // 2. Get Habit Config (to know total count)
        const savedHabits = localStorage.getItem('lockin_habit_defs');
        let totalHabits = 7; // Default fallback if no config saved yet (matches initial const)

        if (savedHabits) {
            try {
                const habits = JSON.parse(savedHabits);
                totalHabits = habits.length;
            } catch (e) {
                console.error("Failed to parse habit defs for stats", e);
            }
        }

        if (savedLogs) {
            const logs = JSON.parse(savedLogs);
            const log = logs[todayKey];
            const completed = log?.completedHabits?.length || 0;

            // Avoid division by zero if user deletes all habits
            const percentage = totalHabits > 0 ? Math.round((completed / totalHabits) * 100) : 0;

            setProtocolStats({ percentage, violations: 0 });
        } else {
            setProtocolStats({ percentage: 0, violations: 0 });
        }
    }, [todayKey]);

    return (
        <div className="max-w-5xl mx-auto w-full pb-32 md:pb-24 space-y-4 md:space-y-8 animate-in fade-in duration-700 pt-2 md:pt-4">

            {/* 0. Unified Mentor Message Card */}
            <UnifiedMentorMessageCard
                broadcasts={broadcasts}
                currentUser={currentUser}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* LEFT COLUMN */}
                <div className="space-y-4 md:space-y-6">

                    {/* 1. Daily Mindset Video */}
                    <div className="vision-glass p-6 rounded-[26px] border border-zinc-200 dark:border-white/10 relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-zinc-900 dark:text-white mb-1 flex items-center gap-2">
                                    <Play className="w-4 h-4 text-red-500 fill-current" />
                                    Daily Mindset
                                </h3>
                                <p className="text-zinc-500 dark:text-white/50 text-xs font-medium">Fuel your mind before you start.</p>
                            </div>
                        </div>
                        <div className="aspect-video rounded-[20px] overflow-hidden bg-black/50 border border-zinc-200 dark:border-white/10 relative group cursor-pointer shadow-lg">
                            <video
                                src={dailyMindsetUrl}
                                poster={dailyMindsetThumbnail}
                                className="w-full h-full object-cover"
                                controls
                                playsInline
                            >
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    </div>

                    {/* 1.5 News Widget */}
                    <div className="h-full min-h-[220px]">
                        <NextNewsWidget />
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-4 md:space-y-6 flex flex-col">

                    {/* 3. Performance Card (Moved from Left) */}
                    <div className="vision-glass p-5 md:p-6 relative overflow-hidden flex flex-col justify-center border border-zinc-200 dark:border-white/10 min-h-[180px]">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <p className="text-[10px] font-bold text-zinc-500 dark:text-white/40 uppercase tracking-widest mb-1">Session Performance</p>
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-3xl font-light tracking-tighter ${totalRR > 0 ? 'text-green-500' : totalRR < 0 ? 'text-red-500' : 'text-zinc-900 dark:text-white'}`}>
                                        {totalRR > 0 ? '+' : ''}<CountUp end={Math.abs(totalRR)} decimals={2} />
                                    </span>
                                    <span className="text-sm text-zinc-400 dark:text-white/40 font-medium">R</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-zinc-500 dark:text-white/40 uppercase tracking-widest mb-1">Target</p>
                                <p className="text-xl font-medium text-zinc-900 dark:text-white">{dailyTarget}R</p>
                            </div>
                        </div>

                        <div className="relative h-2 w-full bg-zinc-100 dark:bg-white/5 rounded-full overflow-hidden mb-2">
                            <div
                                className={`absolute top-0 left-0 h-full shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all duration-1000 ease-out ${totalRR >= 0 ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600' : 'bg-red-500'}`}
                                style={{ width: `${Math.abs(progress)}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] text-zinc-400 dark:text-white/30 uppercase tracking-widest">Goal Progress</span>
                            <span className="text-[9px] font-mono text-accent"><CountUp end={Math.round(progress)} />%</span>
                        </div>
                    </div>

                    {/* 2. Quick Actions */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Log Trade', icon: Plus, action: () => onNavigate('habits-trading') },
                            { label: 'Protocol', icon: Zap, action: () => onNavigate('habits') },
                            { label: 'Comms', icon: MessageSquare, action: () => onNavigate('community') },
                        ].map((btn, i) => (
                            <button
                                key={i}
                                onClick={btn.action}
                                className="flex flex-col items-center justify-center gap-3 py-5 rounded-[22px] bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/10 hover:border-zinc-300 dark:hover:border-accent/30 transition-all group shadow-sm active:scale-95"
                            >
                                <btn.icon className="w-6 h-6 text-zinc-400 dark:text-white/50 group-hover:text-accent transition-colors" />
                                <span className="text-[10px] font-bold text-zinc-500 dark:text-white/40 uppercase tracking-wider group-hover:text-zinc-900 dark:group-hover:text-white transition-colors text-center leading-tight">{btn.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 5. Protocol Snapshot - Mobile Optimized Grid */}
            <div className="vision-glass grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-0 p-4 md:py-4 items-center border border-zinc-200 dark:border-white/10">
                <div className="text-center p-2 bg-zinc-50 dark:bg-white/5 rounded-xl md:bg-transparent md:p-0">
                    <p className="text-[9px] text-zinc-500 dark:text-white/30 uppercase font-bold mb-1">Compliance</p>
                    <p className="text-xl md:text-lg font-bold text-zinc-900 dark:text-white"><CountUp end={protocolStats.percentage} />%</p>
                </div>

                <div className="hidden md:block w-px h-8 bg-zinc-200 dark:bg-white/10"></div>

                <div className="text-center p-2 bg-zinc-50 dark:bg-white/5 rounded-xl md:bg-transparent md:p-0">
                    <p className="text-[9px] text-zinc-500 dark:text-white/30 uppercase font-bold mb-1">XP Points</p>
                    <p className="text-xl md:text-lg font-bold text-accent"><CountUp end={currentUser?.points || 0} /></p>
                </div>

                <div className="hidden md:block w-px h-8 bg-zinc-200 dark:bg-white/10"></div>

                <div className="text-center p-2 bg-zinc-50 dark:bg-white/5 rounded-xl md:bg-transparent md:p-0">
                    <p className="text-[9px] text-zinc-500 dark:text-white/30 uppercase font-bold mb-1">Level</p>
                    <p className="text-xl md:text-lg font-bold text-zinc-900 dark:text-white">{Math.floor((currentUser?.points || 0) / 1000) + 1}</p>
                </div>

                <div className="hidden md:block w-px h-8 bg-zinc-200 dark:bg-white/10"></div>

                <div className="text-center p-2 bg-zinc-50 dark:bg-white/5 rounded-xl md:bg-transparent md:p-0">
                    <p className="text-[9px] text-zinc-500 dark:text-white/30 uppercase font-bold mb-1">Violations</p>
                    <p className="text-xl md:text-lg font-bold text-red-500">{protocolStats.violations}</p>
                </div>
            </div>
        </div>
    );
};
