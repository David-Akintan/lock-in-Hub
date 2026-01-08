
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChatGroup, GroupMessage, User, Role, TradeSetup, TradeResult, GroupPermission } from '../types';
import { 
  Send, Trash2, Edit2, Mic, Image as ImageIcon, Search, ArrowLeft, Bell, BellOff, 
  ShieldAlert, CheckCheck, Play, Pause, AudioLines, StopCircle, X, Plus, Reply, Pin, 
  Zap, Activity, Flame, TrendingUp, BarChart2, MessageSquare, Files, ArrowUpRight, 
  ArrowDownRight, Clock, Target, CheckCircle2, Maximize2, MoreHorizontal, Filter, 
  Calendar, Layers, Hash, Paperclip, ChevronRight
} from 'lucide-react';
import { FastImage, Modal, Button } from './Shared';

// --- TYPES & HELPERS ---

type TimelineItemType = 'NOTE' | 'SETUP' | 'RESULT' | 'ANNOUNCEMENT';

interface TimelineItem {
  id: string;
  type: TimelineItemType;
  date: Date;
  data: GroupMessage | TradeSetup | TradeResult;
  authorId: string;
  authorName: string;
  authorRole: Role;
  authorAvatar: string;
}

const getSession = (date: Date) => {
  const hour = date.getUTCHours();
  // Approximate sessions in UTC
  if (hour >= 21 || hour < 7) return 'ASIA SESSION';
  if (hour >= 7 && hour < 13) return 'LONDON SESSION';
  return 'NEW YORK SESSION';
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

const formatPreviewTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return formatTime(date);
    if (days === 1) return 'Yesterday';
    if (days < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// --- SUB-COMPONENTS ---

// 1. TIMELINE CARDS

const MentorBadge = () => (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#8B5CF6] text-white text-[9px] font-bold uppercase tracking-wider">
    <ShieldAlert className="w-2.5 h-2.5 fill-current" />
    Mentor
  </span>
);

const AnnouncementCard: React.FC<{ item: TimelineItem; onClick: () => void }> = ({ item, onClick }) => {
  const msg = item.data as GroupMessage;
  return (
    <div onClick={onClick} className="relative pl-6 py-2 group cursor-pointer">
      <div className="absolute left-[11px] top-3 w-3 h-3 bg-[#8B5CF6] rounded-full ring-4 ring-zinc-50 dark:ring-[#050505] z-10 shadow-[0_0_10px_#8B5CF6]"></div>
      <div className="bg-purple-50 dark:bg-[#8B5CF6]/10 border border-purple-200 dark:border-[#8B5CF6]/30 rounded-lg p-4 transition-all hover:bg-purple-100 dark:hover:bg-[#8B5CF6]/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MentorBadge />
            <span className="text-xs font-bold text-[#8B5CF6]">SYSTEM BROADCAST</span>
          </div>
          <span className="text-[10px] font-mono text-[#8B5CF6]/60">{formatTime(item.date)}</span>
        </div>
        <p className="text-sm font-medium text-zinc-900 dark:text-white leading-relaxed">{msg.content}</p>
      </div>
    </div>
  );
};

const SetupCard: React.FC<{ item: TimelineItem; onClick: () => void }> = ({ item, onClick }) => {
  const setup = item.data as TradeSetup;
  return (
    <div onClick={onClick} className="relative pl-6 py-2 group cursor-pointer">
      <div className="absolute left-[13px] top-4 w-2 h-2 bg-blue-500 rounded-full ring-4 ring-zinc-50 dark:ring-[#050505] opacity-50 group-hover:opacity-100 transition-opacity"></div>
      <div className="bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/5 rounded-lg p-0 overflow-hidden hover:border-zinc-300 dark:hover:border-white/20 transition-all shadow-sm">
        <div className="flex items-center justify-between p-3 border-b border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-[10px] border ${setup.direction === 'LONG' ? 'bg-green-500/10 text-green-600 dark:text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-500 border-red-500/20'}`}>
              {setup.direction === 'LONG' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            </div>
            <div>
              <span className="block text-sm font-bold text-zinc-900 dark:text-white tracking-wide">{setup.pair}</span>
              <span className="text-[10px] text-zinc-500 dark:text-white/40 uppercase font-bold">{setup.status}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 dark:text-white/30">{formatTime(item.date)}</span>
        </div>
        <div className="p-3">
          <p className="text-xs text-zinc-600 dark:text-white/70 line-clamp-2 leading-relaxed">{setup.analysis}</p>
        </div>
      </div>
    </div>
  );
};

const ResultCard: React.FC<{ item: TimelineItem; onClick: () => void }> = ({ item, onClick }) => {
  const result = item.data as TradeResult;
  const isWin = result.outcome === 'WIN';
  return (
    <div onClick={onClick} className="relative pl-6 py-2 group cursor-pointer">
      <div className={`absolute left-[13px] top-4 w-2 h-2 rounded-full ring-4 ring-zinc-50 dark:ring-[#050505] opacity-50 group-hover:opacity-100 transition-opacity ${isWin ? 'bg-green-500' : 'bg-red-500'}`}></div>
      <div className="bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/5 rounded-lg p-3 hover:border-zinc-300 dark:hover:border-white/20 transition-all flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded flex flex-col items-center justify-center border ${isWin ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            <span className={`text-[10px] font-black ${isWin ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
              {result.rr > 0 ? '+' : ''}{result.rr}R
            </span>
          </div>
          <div>
            <span className="block text-xs font-bold text-zinc-900 dark:text-white">{result.pair} {result.outcome}</span>
            <span className="text-[10px] text-zinc-500 dark:text-white/40 line-clamp-1 italic">"{result.reflection}"</span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 dark:text-white/30">{formatTime(item.date)}</span>
      </div>
    </div>
  );
};

const NoteCard: React.FC<{ item: TimelineItem; onClick: () => void; isSelected: boolean }> = ({ item, onClick, isSelected }) => {
  const note = item.data as GroupMessage;
  const isMentor = item.authorRole === Role.MENTOR;
  
  return (
    <div onClick={onClick} className={`relative pl-6 py-1 group cursor-pointer ${isSelected ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}>
      <div className="absolute left-[15px] top-[14px] w-1 h-1 bg-zinc-300 dark:bg-white/20 rounded-full group-hover:bg-zinc-400 dark:group-hover:bg-white/60 transition-colors"></div>
      <div className={`rounded-lg px-3 py-2 transition-all border ${isSelected ? 'bg-white dark:bg-white/10 border-zinc-200 dark:border-white/10 shadow-sm' : 'bg-transparent border-transparent hover:bg-zinc-100 dark:hover:bg-white/5'}`}>
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className={`text-[11px] font-bold ${isMentor ? 'text-[#8B5CF6]' : 'text-zinc-500 dark:text-white/60'}`}>{item.authorName}</span>
          {isMentor && <ShieldAlert className="w-3 h-3 text-[#8B5CF6] fill-current/20" />}
          <span className="text-[9px] font-mono text-zinc-400 dark:text-white/20 ml-auto">{formatTime(item.date)}</span>
        </div>
        
        {note.type === 'VOICE' ? (
          <div className="mt-1 flex items-center gap-3 p-2 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 w-fit">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div className="flex flex-col">
               <span className="text-[10px] font-bold text-zinc-500 dark:text-white/50 uppercase tracking-wider">Voice Note</span>
               <audio controls src={note.content} className="h-6 w-32 md:w-48 opacity-50" />
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-zinc-800 dark:text-white/90 leading-relaxed font-light">{note.content}</p>
        )}

        {note.type === 'IMAGE' && (
            <div className="mt-2 rounded overflow-hidden border border-zinc-200 dark:border-white/10 max-w-[200px] relative group/img">
                <img src={note.content} className="w-full h-auto object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors cursor-zoom-in" />
            </div>
        )}
      </div>
    </div>
  );
};

// 2. CONTEXT PANEL (Right Side)

const ContextPanel: React.FC<{ item: TimelineItem | null; onClose: () => void }> = ({ item, onClose }) => {
  if (!item) return (
    <div className="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-white/20 p-8 text-center border-l border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-[#050505]">
      <Activity className="w-12 h-12 mb-4 opacity-50" />
      <p className="text-xs font-bold uppercase tracking-widest">Select an event<br/>to view details</p>
    </div>
  );

  const isSetup = item.type === 'SETUP';
  const isResult = item.type === 'RESULT';
  const isNote = item.type === 'NOTE';
  const data: any = item.data;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#080808] border-l-0 xl:border-l border-zinc-200 dark:border-white/5 animate-in slide-in-from-right-4 duration-300 w-full will-change-transform shadow-2xl">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-white/5 shrink-0 bg-white dark:bg-[#080808]">
        <div className="flex items-center gap-3">
          <FastImage src={item.authorAvatar} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-white/5" alt={item.authorName} />
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-none">{item.authorName}</h3>
            <p className="text-[10px] text-zinc-500 dark:text-white/40 font-mono mt-1">{item.type} • {item.date.toLocaleString()}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-full text-zinc-500 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-white dark:bg-[#080808]">
        
        {/* Main Value Display */}
        {(isSetup || isResult) && (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-center">
              <p className="text-[10px] text-zinc-500 dark:text-white/40 uppercase font-bold tracking-widest mb-1">Pair</p>
              <p className="text-xl font-black text-zinc-900 dark:text-white">{data.pair}</p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-center">
              <p className="text-[10px] text-zinc-500 dark:text-white/40 uppercase font-bold tracking-widest mb-1">{isSetup ? 'Bias' : 'Result'}</p>
              {isSetup ? (
                <p className={`text-xl font-black ${data.direction === 'LONG' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>{data.direction}</p>
              ) : (
                <p className={`text-xl font-black ${data.outcome === 'WIN' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>{data.rr}R</p>
              )}
            </div>
          </div>
        )}

        {/* Text Content */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-zinc-400 dark:text-white/30 uppercase tracking-widest">
            {isSetup ? 'Analysis' : isResult ? 'Reflection' : 'Message'}
          </h4>
          <p className="text-sm text-zinc-800 dark:text-white/90 leading-relaxed font-light whitespace-pre-wrap">
            {isSetup ? data.analysis : isResult ? data.reflection : data.content}
          </p>
        </div>

        {/* Media */}
        {(data.image || (isNote && data.type === 'IMAGE')) && (
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-zinc-400 dark:text-white/30 uppercase tracking-widest">Attachment</h4>
            <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10 bg-black">
              <img src={data.image || data.content} className="w-full h-auto" />
            </div>
          </div>
        )}
        
        {/* Voice Note Player in Context */}
        {isNote && data.type === 'VOICE' && (
           <div className="space-y-2">
             <h4 className="text-[10px] font-bold text-zinc-400 dark:text-white/30 uppercase tracking-widest">Audio</h4>
             <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center">
                <audio controls src={data.content} className="w-full" />
             </div>
           </div>
        )}

        {/* Meta Stats (Fake for UI) */}
        <div className="pt-6 border-t border-zinc-200 dark:border-white/5 flex gap-6">
          <div className="flex items-center gap-2 text-zinc-400 dark:text-white/40">
            <Flame className="w-4 h-4" />
            <span className="text-xs font-mono">12 Reactions</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400 dark:text-white/40">
            <Reply className="w-4 h-4" />
            <span className="text-xs font-mono">3 Replies</span>
          </div>
        </div>

      </div>

      {/* Footer Action */}
      <div className="p-4 border-t border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-white/[0.02] mb-safe-bottom">
        <button className="w-full py-3 rounded-lg bg-zinc-200 dark:bg-white/5 hover:bg-zinc-300 dark:hover:bg-white/10 border border-zinc-300 dark:border-white/5 hover:border-zinc-400 dark:hover:border-white/10 text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider transition-all">
          Reply to thread
        </button>
      </div>
    </div>
  );
};

// --- NEW COMPONENT: CHANNEL LIST ITEM ---

const ChannelRow: React.FC<{ 
    group: ChatGroup; 
    lastActivity?: { text: string, time: Date };
    onClick: () => void 
}> = ({ group, lastActivity, onClick }) => {
    return (
        <div 
            onClick={onClick}
            className="group flex items-center gap-4 p-4 border-b border-zinc-200 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/5 transition-all cursor-pointer active:bg-zinc-200 dark:active:bg-white/10"
        >
            {/* Icon */}
            <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-[#0F0F0F] border border-zinc-200 dark:border-white/10 flex items-center justify-center text-2xl shadow-sm group-hover:scale-105 transition-transform duration-300">
                    {group.icon}
                </div>
                {group.type === 'ANNOUNCEMENT' && (
                    <div className="absolute -bottom-1 -right-1 bg-[#8B5CF6] text-white p-1 rounded-full border border-black shadow-lg">
                        <ShieldAlert className="w-3 h-3" />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white truncate">{group.name}</h3>
                    {lastActivity && (
                        <span className="text-[10px] text-zinc-500 dark:text-white/30 font-medium whitespace-nowrap">
                            {formatPreviewTime(lastActivity.time)}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {group.pinnedMessageIds.length > 0 && (
                        <Pin className="w-3 h-3 text-zinc-400 dark:text-white/30 shrink-0" />
                    )}
                    <p className="text-sm text-zinc-600 dark:text-white/50 truncate font-medium">
                        {lastActivity ? lastActivity.text : <span className="italic opacity-50">No messages yet</span>}
                    </p>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

interface ChatSystemProps {
  currentUser: User;
  groups: ChatGroup[];
  messages: GroupMessage[];
  setups: TradeSetup[];
  results: TradeResult[];
  onSendMessage: (groupId: string, content: string, type: 'TEXT' | 'IMAGE' | 'VOICE', replyToId?: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  onPinMessage: (groupId: string, messageId: string) => void;
  onMuteGroup: (groupId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onAddSetup: (setup: TradeSetup) => void;
  onAddResult: (result: TradeResult) => void;
  onCreateGroup: (name: string, description: string, type: GroupPermission, icon: string) => void;
  onScrollDirectionChange?: (direction: 'up' | 'down') => void;
}

export const ChatSystem: React.FC<ChatSystemProps> = ({ 
  currentUser, groups, messages, setups, results, onSendMessage, onAddSetup, onAddResult, onCreateGroup 
}) => {
  // State
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);
  const [input, setInput] = useState('');
  
  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Local State for Modals/Media
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupType, setNewGroupType] = useState<GroupPermission>('PUBLIC');
  const [newGroupIcon, setNewGroupIcon] = useState('💬');
  const [isRecording, setIsRecording] = useState(false);

  // -- Helper to get last activity for list view --
  const getLastActivity = (groupId: string) => {
      // Collect all items for this group
      const msgs = messages.filter(m => m.groupId === groupId);
      const stps = setups.filter(s => s.groupId === groupId);
      const rslts = results.filter(r => r.groupId === groupId);

      // Combine and sort
      const all = [
          ...msgs.map(m => ({ date: m.timestamp, text: m.type === 'IMAGE' ? '📷 Photo' : m.type === 'VOICE' ? '🎤 Voice Note' : m.content })),
          ...stps.map(s => ({ date: s.timestamp, text: `📈 Setup: ${s.pair} ${s.direction}` })),
          ...rslts.map(r => ({ date: r.timestamp, text: `📊 Result: ${r.pair} ${r.outcome}` }))
      ].sort((a, b) => b.date.getTime() - a.date.getTime());

      if (all.length > 0) return { text: all[0].text, time: all[0].date };
      return undefined;
  };

  // -- Handlers --

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    onCreateGroup(newGroupName, newGroupDesc, newGroupType, newGroupIcon);
    setIsCreateGroupOpen(false);
    setNewGroupName(''); setNewGroupDesc(''); setNewGroupType('PUBLIC'); setNewGroupIcon('💬');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && selectedGroupId) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            onSendMessage(selectedGroupId, reader.result as string, 'IMAGE');
        };
        reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleRecording = async () => {
      if (isRecording) {
          mediaRecorderRef.current?.stop();
          setIsRecording(false);
      } else {
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const recorder = new MediaRecorder(stream);
              mediaRecorderRef.current = recorder;
              audioChunksRef.current = [];

              recorder.ondataavailable = (event) => {
                  audioChunksRef.current.push(event.data);
              };

              recorder.onstop = () => {
                  if (selectedGroupId) {
                      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                      const audioUrl = URL.createObjectURL(audioBlob);
                      onSendMessage(selectedGroupId, audioUrl, 'VOICE');
                  }
                  stream.getTracks().forEach(track => track.stop());
              };

              recorder.start();
              setIsRecording(true);
          } catch (error) {
              console.error('Error accessing microphone:', error);
              alert('Microphone access required for voice notes.');
          }
      }
  };

  // -- Derived Data for Active Chat --
  
  const timelineItems = useMemo(() => {
    if (!selectedGroupId) return [];
    
    const msgs: TimelineItem[] = messages
      .filter(m => m.groupId === selectedGroupId)
      .map(m => ({
        id: m.id,
        type: m.senderRole === Role.MENTOR && groups.find(g=>g.id === selectedGroupId)?.type === 'ANNOUNCEMENT' ? 'ANNOUNCEMENT' : 'NOTE',
        date: m.timestamp,
        data: m,
        authorId: m.senderId,
        authorName: m.senderName,
        authorRole: m.senderRole,
        authorAvatar: m.senderAvatar
      }));

    const stps: TimelineItem[] = setups
      .filter(s => s.groupId === selectedGroupId)
      .map(s => ({
        id: s.id,
        type: 'SETUP',
        date: s.timestamp,
        data: s,
        authorId: s.authorId,
        authorName: s.authorName,
        authorRole: s.authorRole,
        authorAvatar: s.authorAvatar
      }));

    const rslts: TimelineItem[] = results
      .filter(r => r.groupId === selectedGroupId)
      .map(r => ({
        id: r.id,
        type: 'RESULT',
        date: r.timestamp,
        data: r,
        authorId: r.authorId,
        authorName: r.authorName,
        authorRole: Role.STUDENT, // Assuming mostly students post results
        authorAvatar: r.authorAvatar
      }));

    return [...msgs, ...stps, ...rslts].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [messages, setups, results, selectedGroupId, groups]);

  const groupedTimeline = useMemo(() => {
    const grouped: { session: string; items: TimelineItem[] }[] = [];
    let currentSession = '';
    let currentChunk: TimelineItem[] = [];

    timelineItems.forEach(item => {
      const session = getSession(item.date);
      const dateKey = item.date.toDateString() + session; 
      
      if (dateKey !== currentSession) {
        if (currentChunk.length > 0) {
          grouped.push({ session: getSession(currentChunk[0].date), items: currentChunk });
        }
        currentSession = dateKey;
        currentChunk = [item];
      } else {
        currentChunk.push(item);
      }
    });
    
    if (currentChunk.length > 0) {
      grouped.push({ session: getSession(currentChunk[0].date), items: currentChunk });
    }

    return grouped;
  }, [timelineItems]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current && selectedGroupId) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [timelineItems.length, selectedGroupId]);

  const activeGroup = groups.find(g => g.id === selectedGroupId);
  const canPost = activeGroup?.type !== 'ANNOUNCEMENT' || currentUser.role === Role.MENTOR;
  const isMentor = currentUser.role === Role.MENTOR;

  // --- RENDER ---

  // 1. HOME VIEW (List)
  if (!selectedGroupId) {
      return (
          <div className="flex flex-col h-full w-full bg-white dark:bg-[#050505] text-zinc-900 dark:text-white overflow-hidden font-sans relative md:rounded-[24px] md:border md:border-zinc-200 md:dark:border-white/10 shadow-2xl animate-in fade-in duration-300">
              {/* Header */}
              <div className="h-16 border-b border-zinc-200 dark:border-white/5 flex items-center justify-between px-4 md:px-6 shrink-0 bg-zinc-50 dark:bg-[#080808]">
                  <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-widest">Community</h2>
                  <div className="flex gap-2">
                      <button className="p-2 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-full text-zinc-500 dark:text-white/50 hover:text-zinc-900 dark:hover:text-white transition-colors">
                          <Search className="w-5 h-5" />
                      </button>
                      {isMentor && (
                          <button onClick={() => setIsCreateGroupOpen(true)} className="p-2 bg-zinc-200 dark:bg-white/5 hover:bg-zinc-300 dark:hover:bg-white/10 rounded-full text-zinc-900 dark:text-white border border-zinc-300 dark:border-white/5 transition-colors">
                              <Plus className="w-5 h-5" />
                          </button>
                      )}
                  </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {groups.map(group => (
                      <ChannelRow 
                          key={group.id} 
                          group={group} 
                          lastActivity={getLastActivity(group.id)}
                          onClick={() => setSelectedGroupId(group.id)} 
                      />
                  ))}
                  
                  {groups.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-64 text-zinc-400 dark:text-white/30">
                          <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
                          <p className="text-sm font-medium">No active channels</p>
                      </div>
                  )}
              </div>

              {/* Create Group Modal */}
              <Modal 
                isOpen={isCreateGroupOpen} 
                title="Create New Terminal" 
                onClose={() => setIsCreateGroupOpen(false)} 
                onConfirm={handleCreateGroup} 
                confirmText="Initialize"
              >
                  {/* ... (Keep existing modal content) ... */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 dark:text-white/40 uppercase pl-1">Group Name</label>
                        <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} className="w-full bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white text-sm focus:border-[#8B5CF6] focus:outline-none" placeholder="e.g. Crypto Signals" autoFocus />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 dark:text-white/40 uppercase pl-1">Description</label>
                        <textarea value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} className="w-full bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white text-sm resize-none focus:border-[#8B5CF6] focus:outline-none" placeholder="What's this room for?" rows={2} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-500 dark:text-white/40 uppercase pl-1">Type</label>
                            <div className="relative">
                                <select value={newGroupType} onChange={e => setNewGroupType(e.target.value as GroupPermission)} className="w-full bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white text-sm appearance-none focus:border-[#8B5CF6] focus:outline-none">
                                    <option value="PUBLIC">Public Chat</option>
                                    <option value="ANNOUNCEMENT">Read-Only (Announcements)</option>
                                    <option value="PRIVATE">Private (Invite Only)</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-500 dark:text-white/40 uppercase pl-1">Icon</label>
                            <div className="flex gap-2">
                                <input value={newGroupIcon} onChange={e => setNewGroupIcon(e.target.value)} className="w-12 text-center bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl py-3 text-zinc-900 dark:text-white text-xl focus:border-[#8B5CF6] focus:outline-none" maxLength={2} />
                                <div className="flex-1 flex gap-1 overflow-x-auto no-scrollbar items-center">
                                    {['📢','💬','📈','🚨','🧠','💸'].map(icon => (
                                        <button key={icon} onClick={() => setNewGroupIcon(icon)} className="p-2 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-lg text-lg transition-colors">{icon}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                  </div>
              </Modal>
          </div>
      );
  }

  // 2. CHAT FOCUS VIEW (Fullscreen)
  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-[#050505] text-zinc-900 dark:text-white overflow-hidden font-sans relative md:rounded-[24px] md:border md:border-zinc-200 md:dark:border-white/10 shadow-2xl animate-in slide-in-from-right-4 duration-300">
        
        {/* Chat Header */}
        <div className="h-16 border-b border-zinc-200 dark:border-white/5 flex items-center justify-between px-4 md:px-6 shrink-0 bg-white/90 dark:bg-[#080808]/90 backdrop-blur-md z-10">
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setSelectedGroupId(null)}
                    className="p-2 -ml-2 rounded-full text-zinc-500 dark:text-white/50 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => {/* Optional: Group Info */}}>
                    <span className="text-2xl">{activeGroup?.icon}</span>
                    <div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white tracking-wide">{activeGroup?.name}</h3>
                        <p className="text-[9px] text-zinc-500 dark:text-white/30 uppercase tracking-wider font-bold">{activeGroup?.type === 'ANNOUNCEMENT' ? 'Broadcast Channel' : 'Live Feed'}</p>
                    </div>
                </div>
            </div>
            <div className="flex gap-2">
                <button className="p-2 text-zinc-400 dark:text-white/30 hover:text-zinc-900 dark:hover:text-white transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-white/5"><Search className="w-5 h-5" /></button>
                <button className="p-2 text-zinc-400 dark:text-white/30 hover:text-zinc-900 dark:hover:text-white transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-white/5"><MoreHorizontal className="w-5 h-5" /></button>
            </div>
        </div>

        {/* Timeline Feed */}
        <div className="flex-1 flex overflow-hidden relative bg-zinc-50 dark:bg-[#050505]">
            <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-8 py-6 space-y-8">
                {groupedTimeline.map((group, idx) => (
                    <div key={idx} className="relative">
                        {/* Session Separator */}
                        <div className="sticky top-0 z-10 flex items-center gap-4 py-4 mb-2">
                            <div className="h-px bg-gradient-to-r from-transparent via-zinc-300 dark:via-white/10 to-transparent flex-1"></div>
                            <div className="px-3 py-1 rounded-full bg-white dark:bg-[#0F0F0F] border border-zinc-200 dark:border-white/5 shadow-lg flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${group.session.includes('NEW YORK') ? 'bg-blue-500' : group.session.includes('LONDON') ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                                <span className="text-[9px] font-black text-zinc-500 dark:text-white/50 uppercase tracking-widest">{group.session}</span>
                            </div>
                            <div className="h-px bg-gradient-to-r from-transparent via-zinc-300 dark:via-white/10 to-transparent flex-1"></div>
                        </div>

                        {/* Items */}
                        <div className="space-y-1 relative border-l border-zinc-200 dark:border-white/5 ml-4 md:ml-8 pl-4 md:pl-0">
                            {group.items.map(item => {
                                const isSelected = selectedItem?.id === item.id;
                                if (item.type === 'ANNOUNCEMENT') return <AnnouncementCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />;
                                if (item.type === 'SETUP') return <SetupCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />;
                                if (item.type === 'RESULT') return <ResultCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />;
                                return <NoteCard key={item.id} item={item} onClick={() => setSelectedItem(item)} isSelected={isSelected} />;
                            })}
                        </div>
                    </div>
                ))}
                
                {timelineItems.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 mt-20 text-zinc-400 dark:text-white/40">
                        <Activity className="w-16 h-16 mb-4" />
                        <p className="text-xs uppercase tracking-widest font-bold">No activity recorded</p>
                    </div>
                )}
            </div>

            {/* Context Inspector (Overlay on Mobile, Panel on Desktop) */}
            {selectedItem && (
                <>
                    <div className="xl:hidden fixed inset-0 z-[60] bg-white/95 dark:bg-[#050505]/95 backdrop-blur-md animate-in slide-in-from-right-4 duration-300">
                        <div className="h-full w-full max-w-md ml-auto border-l border-zinc-200 dark:border-white/10">
                            <ContextPanel item={selectedItem} onClose={() => setSelectedItem(null)} />
                        </div>
                    </div>
                    <div className="hidden xl:block w-[350px] shrink-0 border-l border-zinc-200 dark:border-white/5 bg-white dark:bg-[#080808]">
                        <ContextPanel item={selectedItem} onClose={() => setSelectedItem(null)} />
                    </div>
                </>
            )}
        </div>

        {/* Input Area */}
        {canPost && (
            <div className="p-4 bg-white dark:bg-[#050505] border-t border-zinc-200 dark:border-white/5 z-20 md:mb-0 mb-[85px]">
                <div className="max-w-4xl mx-auto flex gap-2 items-end">
                    <div className="flex gap-1 items-center pb-2">
                        <button onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white transition-colors" title="Upload Image">
                            <Paperclip className="w-5 h-5" />
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                    </div>
                    
                    <div className="flex-1 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-2xl p-1 flex items-center">
                        <input 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && input.trim()) {
                                    onSendMessage(selectedGroupId, input, 'TEXT');
                                    setInput('');
                                }
                            }}
                            disabled={isRecording}
                            className="flex-1 bg-transparent border-none px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none placeholder:text-zinc-400 dark:placeholder:text-white/20 font-medium"
                            placeholder={isRecording ? "Recording voice note..." : "Message..."}
                        />
                        <button 
                            onClick={toggleRecording}
                            className={`p-2.5 rounded-xl transition-all mr-1 ${isRecording ? 'bg-red-500/10 text-red-500 animate-pulse' : 'text-zinc-400 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10'}`}
                        >
                            {isRecording ? <StopCircle className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                        </button>
                    </div>

                    <button 
                        onClick={() => {
                            if (input.trim()) {
                                onSendMessage(selectedGroupId, input, 'TEXT');
                                setInput('');
                            }
                        }}
                        className={`p-3.5 mb-0.5 rounded-xl transition-all ${input.trim() ? 'bg-[#327AFF] text-white shadow-[0_0_15px_rgba(50,122,255,0.4)] hover:scale-105' : 'bg-zinc-200 dark:bg-white/5 text-zinc-400 dark:text-white/20'}`}
                        disabled={!input.trim()}
                    >
                        <ArrowUpRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};
