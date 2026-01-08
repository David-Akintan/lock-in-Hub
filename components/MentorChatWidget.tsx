
import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, MessageSquare, History, Maximize2, Minimize2, Trash2, ChevronLeft, Plus, GripHorizontal, Mic, StopCircle, Play, Pause, Square, AudioLines, Loader2 } from 'lucide-react';
import { useAppState } from '../App';
import { streamMessageToAI, transcribeAudio } from '../services/geminiService';
import { ChatSession, ChatMessage } from '../types';
import { Button } from './Shared';

const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  const paragraphs = text.split(/\n\n+/);
  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, pIndex) => {
        if (paragraph.trim().startsWith('* ') || paragraph.trim().startsWith('- ')) {
            const items = paragraph.split(/\n/).map(item => item.replace(/^[*|-]\s/, ''));
            return (
                <ul key={pIndex} className="list-disc pl-5 space-y-1 text-white/90">
                    {items.map((item, i) => (
                        <li key={i}><InlineFormat text={item} /></li>
                    ))}
                </ul>
            );
        }
        return (
             <p key={pIndex} className="leading-relaxed text-white/90">
                <InlineFormat text={paragraph} />
             </p>
        );
      })}
    </div>
  );
};

const InlineFormat: React.FC<{ text: string }> = ({ text }) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="font-bold text-accent">{part.slice(2, -2)}</strong>;
                }
                return <span key={i}>{part}</span>;
            })}
        </>
    );
};

// --- Custom Audio Player for Chat Bubbles (Legacy Support) ---
const AudioBubble: React.FC<{ url: string; duration?: string }> = ({ url, duration }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateProgress = () => {
            setProgress((audio.currentTime / audio.duration) * 100);
        };
        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
        };

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('ended', handleEnded);
        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) audioRef.current.pause();
            else audioRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <div className="flex items-center gap-3 min-w-[160px]">
            <button 
                onClick={togglePlay} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 transition-transform"
            >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
            <div className="flex-1 space-y-1">
                <div className="h-1 bg-white/20 rounded-full overflow-hidden w-full">
                    <div className="h-full bg-white transition-all duration-100" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="flex justify-between text-[9px] text-white/60 font-mono">
                    <span>{isPlaying && audioRef.current ? formatDuration(audioRef.current.currentTime) : '0:00'}</span>
                    <span>{duration || '0:00'}</span>
                </div>
            </div>
            <audio ref={audioRef} src={url} className="hidden" />
        </div>
    );
};

const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

export const MentorChatWidget: React.FC = () => {
    const { chatSessions, currentSessionId, createNewSession, switchSession, deleteSession, updateSessionMessages } = useAppState();
    const [isOpen, setIsOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    
    // --- Voice Recording State ---
    const [recorderState, setRecorderState] = useState<'idle' | 'recording'>('idle');
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    
    // Refs
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerIntervalRef = useRef<any>(null);

    // Drag State
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    const sessionsList = (chatSessions as ChatSession[]) || [];
    const currentMessages = sessionsList.find(s => s.id === currentSessionId)?.messages || [];

    // Ensure session exists
    useEffect(() => {
        if (isOpen && !currentSessionId) {
            if (sessionsList.length > 0) {
                switchSession(sessionsList[0].id);
            } else {
                createNewSession();
            }
        }
    }, [isOpen, currentSessionId, sessionsList, createNewSession, switchSession]);

    // Reset position on close
    useEffect(() => {
        if (!isOpen) {
            const timer = setTimeout(() => setPosition({ x: 0, y: 0 }), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [currentMessages, isTyping, isOpen, recorderState, isTranscribing]);

    // Drag Handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
        setIsDragging(true);
        const touch = e.touches[0];
        dragStartRef.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            e.preventDefault();
            setPosition({
                x: e.clientX - dragStartRef.current.x,
                y: e.clientY - dragStartRef.current.y
            });
        };
        const handleMouseUp = () => {
            setIsDragging(false);
        };
        
        const handleTouchMove = (e: TouchEvent) => {
            if (!isDragging) return;
            if (e.cancelable) e.preventDefault(); // Prevent scrolling
            const touch = e.touches[0];
            setPosition({
                x: touch.clientX - dragStartRef.current.x,
                y: touch.clientY - dragStartRef.current.y
            });
        };
        const handleTouchEnd = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleTouchMove, { passive: false });
            window.addEventListener('touchend', handleTouchEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isDragging]);

    // --- Audio Logic ---

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                // Audio Stopped -> Transcribe
                setRecorderState('idle');
                setIsTranscribing(true);
                
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                
                // Convert Blob to Base64
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = async () => {
                    const base64String = (reader.result as string).split(',')[1];
                    const text = await transcribeAudio(base64String);
                    
                    if (text) {
                        setInput(prev => (prev ? prev + " " + text : text));
                    }
                    setIsTranscribing(false);
                };

                // Stop tracks
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setRecorderState('recording');
            setRecordingTime(0);
            
            timerIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error("Microphone access denied:", error);
            alert("Microphone access required for voice notes.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        }
    };

    const cancelRecording = () => {
        // Just stop and don't process (clearing chunks happens on start)
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            // Override onstop to do nothing
            mediaRecorderRef.current.onstop = null;
            mediaRecorderRef.current.stop();
        }
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        setRecorderState('idle');
        setRecordingTime(0);
    };

    const handleSend = async () => {
        if (!input.trim() || isTyping || !currentSessionId) return;

        const userText = input.trim();
        const userMsg: ChatMessage = { 
            id: Date.now().toString(), 
            role: 'user', 
            text: userText, 
            timestamp: new Date() 
        };
        
        const updatedMessages = [...currentMessages, userMsg];
        updateSessionMessages(currentSessionId, updatedMessages);
        setInput('');
        setIsTyping(true);

        const historyForService = updatedMessages.slice(0, -1)
            .filter(m => m.text && m.text.trim().length > 0)
            .map(m => ({ 
                role: m.role, 
                parts: [{ text: m.text }] 
            }));

        let fullResponse = "";
        const botMsgId = (Date.now() + 1).toString();
        
        updateSessionMessages(currentSessionId, [...updatedMessages, { 
            id: botMsgId, 
            role: 'model', 
            text: '', 
            timestamp: new Date() 
        }]);

        try {
            await streamMessageToAI(userMsg.text, historyForService, (chunk) => {
                fullResponse += chunk;
                updateSessionMessages(currentSessionId, [...updatedMessages, { 
                    id: botMsgId, 
                    role: 'model', 
                    text: fullResponse, 
                    timestamp: new Date() 
                }]);
            });
        } catch (e) {
            console.error("Chat Error", e);
            if (!fullResponse) {
                 updateSessionMessages(currentSessionId, [...updatedMessages, { 
                    id: botMsgId, 
                    role: 'model', 
                    text: "I'm having trouble connecting right now. Please try again.", 
                    timestamp: new Date() 
                }]);
            }
        } finally {
            setIsTyping(false);
        }
    };

    // Group sessions by date
    const groupedSessions = sessionsList.reduce((acc, session) => {
        const date = new Date(session.updatedAt);
        const today = new Date();
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        
        let key = 'Previous';
        if (date.toDateString() === today.toDateString()) key = 'Today';
        else if (date.toDateString() === yesterday.toDateString()) key = 'Yesterday';
  
        if (!acc[key]) acc[key] = [];
        acc[key].push(session);
        return acc;
    }, {} as Record<string, ChatSession[]>);

    return (
        <>
            {/* Floating Trigger Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-20 md:bottom-6 right-6 z-[100] w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-all duration-300 hover:scale-110 active:scale-95 ${isOpen ? 'bg-zinc-800 text-white rotate-90' : 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white'}`}
            >
                {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-7 h-7 fill-current" />}
            </button>

            {/* Chat Popup Container - Optimized for Mobile & Desktop */}
            <div 
                style={{
                    transform: isOpen ? 'none' : 'translateY(100%) scale(0.95)',
                    opacity: isOpen ? 1 : 0,
                    pointerEvents: isOpen ? 'auto' : 'none',
                }}
                className={`
                    fixed z-[99] 
                    /* Mobile Styles: Bottom Sheet */
                    bottom-0 left-0 right-0 h-[85vh] w-full rounded-t-[32px]
                    /* Desktop Styles: Floating Card */
                    md:bottom-24 md:right-6 md:w-[400px] md:h-[600px] md:max-h-[80vh] md:rounded-[32px] md:left-auto md:w-auto
                    bg-[#09090b]/95 backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col origin-bottom
                    transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) will-change-transform
                `}
            >
                {/* Header - Draggable on Desktop */}
                <div 
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    className={`flex items-center justify-between p-4 border-b border-white/5 bg-gradient-to-r from-white/5 to-transparent select-none touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                >
                    <div className="flex items-center gap-3">
                        {isHistoryOpen ? (
                            <button onClick={() => setIsHistoryOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white cursor-pointer">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center border border-accent/20">
                                <Bot className="w-4 h-4 text-accent" />
                            </div>
                        )}
                        <div>
                            <h3 className="text-sm font-bold text-white tracking-tight leading-none">Mentor AI</h3>
                            <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider">{isHistoryOpen ? 'Conversation History' : 'Performance Architect'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="md:hidden opacity-30 px-2">
                            <GripHorizontal className="w-4 h-4 text-white" />
                        </div>
                        {!isHistoryOpen && (
                            <button 
                                onClick={() => setIsHistoryOpen(true)}
                                className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors cursor-pointer"
                                title="History"
                            >
                                <History className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Body - Toggle between Chat and History */}
                <div className="flex-1 relative overflow-hidden bg-black/20">
                    
                    {/* Chat View */}
                    <div className={`absolute inset-0 flex flex-col transition-transform duration-300 ${isHistoryOpen ? 'translate-x-full' : 'translate-x-0'}`}>
                        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                            {currentMessages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 p-8 select-none">
                                    <Bot className="w-12 h-12 mb-4" />
                                    <p className="text-sm font-medium">Ready to analyze your session.</p>
                                </div>
                            )}
                            
                            {currentMessages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-200`}>
                                    <div 
                                        className={`max-w-[85%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                            msg.role === 'user' 
                                            ? 'bg-[#327AFF] text-white rounded-tr-sm' 
                                            : 'bg-white/10 text-zinc-100 rounded-tl-sm border border-white/5'
                                        }`}
                                    >
                                        {msg.audio ? (
                                            <AudioBubble url={msg.audio} duration={formatDuration(0)} />
                                        ) : (
                                            msg.role === 'user' ? msg.text : <FormattedText text={msg.text} />
                                        )}
                                    </div>
                                </div>
                            ))}
                            
                            {isTyping && (
                                <div className="flex justify-start animate-in fade-in">
                                    <div className="bg-white/5 px-3 py-2 rounded-2xl rounded-tl-sm border border-white/5 flex items-center gap-1.5 h-9">
                                        <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce delay-75"></div>
                                        <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce delay-150"></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-[#09090b] border-t border-white/10 relative pb-safe-bottom">
                            {recorderState === 'idle' && (
                                <div className="relative flex items-center gap-2 animate-in fade-in duration-200">
                                    {isTranscribing ? (
                                        <div className="w-full flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                                            <Loader2 className="w-4 h-4 text-accent animate-spin" />
                                            <span className="text-sm text-white/50 font-medium">Transcribing voice note...</span>
                                        </div>
                                    ) : (
                                        <input
                                            ref={inputRef}
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                            placeholder="Ask Mentor..."
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-20 py-3 text-sm text-white focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all placeholder:text-white/20"
                                            disabled={isTyping}
                                        />
                                    )}
                                    
                                    {!isTranscribing && (
                                        <div className="absolute right-1.5 flex items-center gap-1">
                                            <button 
                                                onClick={startRecording}
                                                disabled={isTyping}
                                                className="p-2 rounded-lg transition-all text-white/40 hover:text-white hover:bg-white/10"
                                                title="Record Voice Note"
                                            >
                                                <Mic className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={handleSend}
                                                disabled={!input.trim() || isTyping}
                                                className={`p-2 rounded-lg transition-all ${input.trim() ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-white/20 hover:text-white hover:bg-white/10'}`}
                                            >
                                                <Send className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {recorderState === 'recording' && (
                                <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                                        <span className="text-sm font-mono font-bold text-red-400 tabular-nums">{formatDuration(recordingTime)}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest animate-pulse hidden md:block">Recording...</span>
                                        <button 
                                            onClick={cancelRecording}
                                            className="text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-wider px-3 py-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={stopRecording}
                                            className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-red-500/30"
                                            title="Finish Recording"
                                        >
                                            <Square className="w-3.5 h-3.5 fill-current" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* History View */}
                    <div className={`absolute inset-0 bg-[#09090b] flex flex-col transition-transform duration-300 ${isHistoryOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                        <div className="p-4 border-b border-white/5">
                            <button 
                                onClick={() => { createNewSession(); setIsHistoryOpen(false); }}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm font-bold text-white uppercase tracking-wider group"
                            >
                                <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" /> New Chat
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-6">
                            {Object.entries(groupedSessions).map(([group, sessions]) => (
                                <div key={group}>
                                    <h4 className="px-4 text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">{group}</h4>
                                    <div className="space-y-1">
                                        {sessions.map(session => (
                                            <div 
                                                key={session.id}
                                                className={`group flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all ${currentSessionId === session.id ? 'bg-white/10 border border-white/5' : 'hover:bg-white/5 border border-transparent'}`}
                                                onClick={() => { switchSession(session.id); setIsHistoryOpen(false); }}
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <MessageSquare className={`w-4 h-4 shrink-0 ${currentSessionId === session.id ? 'text-accent' : 'text-white/30'}`} />
                                                    <span className={`text-sm truncate ${currentSessionId === session.id ? 'text-white font-medium' : 'text-white/70'}`}>
                                                        {session.title}
                                                    </span>
                                                </div>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-white/20 hover:text-red-500 transition-all"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
};
