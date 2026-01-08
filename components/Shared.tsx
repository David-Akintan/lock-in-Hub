
import React, { useState, useEffect } from 'react';
import { 
  X, Check, AlertTriangle, Info, Loader2, ChevronRight, 
  Megaphone, Plus, Clock, Siren, Globe, Calendar 
} from 'lucide-react';
import { DAILY_NEWS_SCHEDULE } from '../constants';
import { NewsEvent, Broadcast, User, Role, BroadcastTag } from '../types';

// --- ANIMATION PRIMITIVES ---

export const CountUp: React.FC<{ 
  end: number; 
  duration?: number; 
  decimals?: number; 
  prefix?: string; 
  suffix?: string;
  className?: string; 
}> = ({ end, duration = 1000, decimals = 0, prefix = '', suffix = '', className = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Ease Out Expo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      setCount(ease * end);
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return (
    <span className={className}>
      {prefix}{count.toFixed(decimals)}{suffix}
    </span>
  );
};

export const StaggerItem: React.FC<{ 
  children: React.ReactNode; 
  index: number; 
  className?: string;
  delayPerItem?: number; 
}> = ({ children, index, className = '', delayPerItem = 0.05 }) => (
  <div 
    className={`animate-slide-up-fade ${className}`} 
    style={{ animationDelay: `${index * delayPerItem}s` }}
  >
    {children}
  </div>
);

// --- PRIMITIVES ---

export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-[20px] overflow-hidden ${className}`}>
    {children}
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; variant?: 'default' | 'outline' | 'secondary' | 'accent'; className?: string }> = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-white',
    outline: 'border border-zinc-200 dark:border-white/20 text-zinc-600 dark:text-white/60',
    secondary: 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
    accent: 'bg-accent/10 text-accent border border-accent/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export const Button: React.FC<{ 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'; 
  size?: 'sm' | 'md' | 'lg' | 'xs'; 
  icon?: any; 
  className?: string; 
  disabled?: boolean;
}> = ({ children, onClick, variant = 'primary', size = 'md', icon: Icon, className = '', disabled }) => {
  const base = "flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-lg shadow-zinc-500/10 dark:shadow-white/10",
    secondary: "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-300 dark:hover:bg-zinc-700",
    ghost: "bg-transparent text-zinc-600 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5",
    outline: "border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-white/5",
    danger: "bg-red-500/10 text-red-600 dark:text-red-500 hover:bg-red-500/20 border border-red-500/20"
  };

  const sizes = {
    xs: "px-2 py-1 text-[10px] uppercase tracking-wider",
    sm: "px-3 py-1.5 text-xs uppercase tracking-wider",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-base"
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {Icon && <Icon className={size === 'xs' ? 'w-3 h-3' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />}
      {children}
    </button>
  );
};

export const FastImage: React.FC<{ src: string; alt?: string; className?: string }> = ({ src, alt, className }) => (
  <img src={src} alt={alt} className={className} loading="lazy" />
);

export const Modal: React.FC<{ 
  isOpen: boolean; 
  title: string; 
  onClose: () => void; 
  children: React.ReactNode; 
  onConfirm?: () => void; 
  confirmText?: string;
  confirmVariant?: 'primary' | 'danger';
}> = ({ isOpen, title, onClose, children, onConfirm, confirmText, confirmVariant = 'primary' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90dvh] flex flex-col bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-white/10 rounded-[24px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header - Fixed Height */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-white/5 shrink-0">
          <h3 className="font-bold text-zinc-900 dark:text-white truncate pr-4">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-full text-zinc-500 dark:text-white/50 hover:text-zinc-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="p-4 md:p-6 text-zinc-900 dark:text-white overflow-y-auto overscroll-contain flex-1 min-h-0 custom-scrollbar">
          {children}
        </div>

        {/* Footer - Fixed Height */}
        {(onConfirm || confirmText) && (
          <div className="p-4 border-t border-zinc-100 dark:border-white/5 flex justify-end gap-3 bg-zinc-50 dark:bg-white/[0.02] shrink-0">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant={confirmVariant} onClick={onConfirm}>{confirmText || 'Confirm'}</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export const ToastNotification: React.FC<{ title: string; message: string; onClose: () => void }> = ({ title, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-[110] max-w-sm w-full animate-in slide-in-from-top-4 duration-300">
      <div className="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-white/10 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_30px_rgba(0,0,0,0.5)] flex gap-4 relative overflow-hidden group cursor-pointer" onClick={onClose}>
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent"></div>
        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
          <Megaphone className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-zinc-900 dark:text-white text-sm">{title}</h4>
          <p className="text-xs text-zinc-500 dark:text-white/60 mt-0.5 line-clamp-2">{message}</p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-zinc-400 dark:text-white/20 hover:text-zinc-900 dark:hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// --- WIDGETS ---

export const NextNewsWidget = React.memo(() => {
  const [nextEvent, setNextEvent] = useState<NewsEvent | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const tick = () => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // 1. Filter events for today that are in the future
        const upcoming = DAILY_NEWS_SCHEDULE
            .map(e => {
                const eventDate = new Date(`${todayStr}T${e.time}:00`);
                return { ...e, fullDate: eventDate };
            })
            .filter(e => e.fullDate > now)
            .sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());

        const closest = upcoming[0];

        if (closest) {
            setNextEvent(closest);
            const diffMs = closest.fullDate.getTime() - now.getTime();
            const diffSec = Math.floor(diffMs / 1000);
            
            const h = Math.floor(diffSec / 3600);
            const m = Math.floor((diffSec % 3600) / 60);
            const s = diffSec % 60;
            
            setTimeLeft(`${h}h ${m}m ${s}s`);
            
            // Progress within the last hour
            if (diffSec <= 3600) {
                setProgress(((3600 - diffSec) / 3600) * 100);
            } else {
                setProgress(0);
            }
        } else {
            setNextEvent(null);
            setTimeLeft("No Events");
            setProgress(0);
        }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!nextEvent) return (
      <div className="relative w-full h-full overflow-hidden rounded-[26px] p-6 bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-zinc-50 dark:bg-white/5 flex items-center justify-center border border-zinc-100 dark:border-white/5">
             <Check className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-900 dark:text-white">All Clear</p>
            <p className="text-[10px] font-medium text-zinc-500 dark:text-white/40 uppercase tracking-widest mt-0.5">No High Impact News</p>
          </div>
      </div>
  );

  const isHighImpact = nextEvent.impact === 'HIGH';

  return (
    <div className={`relative w-full h-full overflow-hidden rounded-[26px] group cursor-pointer border transition-all duration-500 flex flex-col justify-between ${isHighImpact ? 'bg-red-50 dark:bg-[#0A0A0A] border-red-200 dark:border-red-500/20 shadow-[0_0_30px_rgba(220,38,38,0.1)]' : 'bg-white dark:bg-white/[0.02] border-zinc-200 dark:border-white/5'}`}>
        
        {/* Background Gradients/Effects for High Impact */}
        {isHighImpact && (
            <>
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none mix-blend-multiply dark:mix-blend-screen"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/10 rounded-full blur-[60px] -ml-10 -mb-10 pointer-events-none mix-blend-multiply dark:mix-blend-screen"></div>
            </>
        )}

        {/* Main Content */}
        <div className="relative z-10 p-6 flex flex-col h-full justify-between">
            
            {/* Header: Icon + Badges */}
            <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border backdrop-blur-md shadow-lg ${isHighImpact ? 'bg-red-100 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-500' : 'bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-white/60'}`}>
                    {isHighImpact ? <Siren className="w-6 h-6 animate-pulse" /> : <Globe className="w-6 h-6" />}
                </div>
                
                <div className="flex flex-col items-end gap-1">
                     <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${isHighImpact ? 'bg-red-500 text-white border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'bg-zinc-100 dark:bg-white/10 text-zinc-500 dark:text-white/60 border-zinc-200 dark:border-white/5'}`}>
                        {nextEvent.impact} Impact
                     </span>
                     <span className="text-[10px] font-bold text-zinc-400 dark:text-white/30 font-mono tracking-wider">{nextEvent.currency}</span>
                </div>
            </div>

            {/* Middle: Event Title */}
            <div className="py-2">
                <h3 className={`text-lg md:text-xl font-bold leading-tight tracking-tight ${isHighImpact ? 'text-zinc-900 dark:text-white drop-shadow-sm' : 'text-zinc-900 dark:text-white'}`}>
                    {nextEvent.title}
                </h3>
            </div>

            {/* Bottom: Countdown */}
            <div>
                <p className="text-[9px] font-bold text-zinc-400 dark:text-white/30 uppercase tracking-[0.2em] mb-1">Time Remaining</p>
                <div className="flex items-baseline gap-2">
                    <Clock className={`w-4 h-4 ${isHighImpact ? 'text-red-500' : 'text-zinc-400'}`} />
                    <span className={`text-3xl font-mono font-bold tracking-tighter tabular-nums ${isHighImpact ? 'text-zinc-900 dark:text-white' : 'text-zinc-900 dark:text-white'}`}>
                        {timeLeft}
                    </span>
                </div>
            </div>
        </div>

        {/* Progress Bar (Attached to bottom) */}
        {progress > 0 && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-zinc-100 dark:bg-white/5">
                <div className={`h-full transition-all duration-1000 ease-linear shadow-[0_0_10px_currentColor] ${isHighImpact ? 'bg-red-500 text-red-500' : 'bg-accent text-accent'}`} style={{ width: `${progress}%` }}></div>
            </div>
        )}
    </div>
  );
});

export const UnifiedMentorMessageCard: React.FC<{ 
    broadcasts: Broadcast[]; 
    currentUser: User | null;
    onAddBroadcast?: (title: string, message: string, tag: BroadcastTag) => void; 
}> = ({ broadcasts, currentUser, onAddBroadcast }) => {
    const isMentor = currentUser?.role === Role.MENTOR;
    const latestBroadcast = broadcasts[0];
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [tag, setTag] = useState<BroadcastTag>('Alert');

    const handleSave = () => {
        if (onAddBroadcast && title && message) {
            onAddBroadcast(title, message, tag);
            setIsEditing(false);
            setTitle('');
            setMessage('');
        }
    };

    return (
        <div className="w-full relative">
            {/* New Broadcast Modal */}
            {isEditing && (
                <Modal isOpen={isEditing} title="New Broadcast" onClose={() => setIsEditing(false)} onConfirm={handleSave} confirmText="Publish" confirmVariant="primary">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-500 dark:text-white/40 uppercase tracking-widest">Type</label>
                            <div className="flex gap-2">
                                {['Alert', 'Mindset', 'Trading', 'Schedule'].map((t) => (
                                    <button 
                                        key={t}
                                        onClick={() => setTag(t as BroadcastTag)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all ${tag === t ? 'bg-accent text-white border-accent' : 'bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-white/40 border-zinc-200 dark:border-white/5 hover:bg-zinc-200 dark:hover:bg-white/10'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-500 dark:text-white/40 uppercase tracking-widest">Headline</label>
                            <input 
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-2 text-zinc-900 dark:text-white text-sm focus:border-accent outline-none"
                                placeholder="e.g. Market Warning"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-500 dark:text-white/40 uppercase tracking-widest">Message</label>
                            <textarea 
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="w-full bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-2 text-zinc-900 dark:text-white text-sm focus:border-accent outline-none resize-none"
                                rows={3}
                                placeholder="What's the update?"
                            />
                        </div>
                    </div>
                </Modal>
            )}

            {/* Display Card */}
            <div className="vision-glass p-1 rounded-[26px] bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-zinc-200 dark:border-white/10">
                <div className="bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-xl rounded-[24px] p-6 relative overflow-hidden">
                     {/* Background Glow */}
                     <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-[80px] pointer-events-none -mr-16 -mt-16"></div>
                     
                     <div className="relative z-10 flex flex-col md:flex-row gap-6 md:items-center justify-between">
                         <div className="flex items-start gap-5">
                             <div className="relative">
                                 <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                                     <Megaphone className="w-7 h-7 text-white" />
                                 </div>
                                 <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-black rounded-full flex items-center justify-center">
                                     <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                 </div>
                             </div>
                             
                             <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-2 mb-1">
                                     <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-accent text-white shadow-sm shadow-accent/20">
                                         {latestBroadcast?.tag || 'Alert'}
                                     </span>
                                     <span className="text-[10px] font-bold text-zinc-500 dark:text-white/40 uppercase tracking-wide">
                                         {latestBroadcast?.timestamp ? new Date(latestBroadcast.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Now'}
                                     </span>
                                 </div>
                                 <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white leading-tight mb-1">
                                     {latestBroadcast?.title || "Welcome to Lock-In"}
                                 </h2>
                                 <p className="text-sm text-zinc-600 dark:text-white/70 leading-relaxed max-w-2xl">
                                     {latestBroadcast?.message || "No active broadcasts at the moment. Stay disciplined."}
                                 </p>
                             </div>
                         </div>

                         {isMentor && (
                             <button 
                                 onClick={() => setIsEditing(true)}
                                 className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 text-xs font-bold uppercase tracking-widest text-zinc-900 dark:text-white transition-all group"
                             >
                                 <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                 New Update
                             </button>
                         )}
                     </div>
                </div>
            </div>
        </div>
    );
};
