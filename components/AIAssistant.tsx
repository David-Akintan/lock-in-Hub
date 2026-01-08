
import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Shared';
import { Send, Bot, Sparkles, User, Copy, ThumbsUp, RefreshCw, Zap, Mic, MicOff, Volume2, StopCircle, Image as ImageIcon, X, History, Plus, MessageSquare, Trash2, ChevronLeft, Phone, PhoneOff, Activity } from 'lucide-react';
import { ChatMessage, ChatSession } from '../types';
import { sendMessageToAI, streamMessageToAI } from '../services/geminiService';
import { useAppState } from '../App';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob } from "@google/genai";
import { MENTOR_SYSTEM_PROMPT } from '../constants';

// --- AUDIO HELPERS ---

const PCM_WORKLET = `
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const float32Data = input[0];
      this.port.postMessage(float32Data);
    }
    return true;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
`;

function encodePCM(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createPCMBlob(data: Float32Array): GenAIBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Convert float32 (-1.0 to 1.0) to int16
    int16[i] = Math.max(-1, Math.min(1, data[i])) * 32768;
  }
  return {
    data: encodePCM(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

function decodeAudio(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- LIVE VOICE INTERFACE COMPONENT ---
const LiveVoiceInterface: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [volumeLevel, setVolumeLevel] = useState(0); 
    const [isMuted, setIsMuted] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string>('');
    
    const nextStartTimeRef = useRef(0);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const activeSessionRef = useRef<any>(null);
    const visualizerFrameRef = useRef<number>(0);

    useEffect(() => {
        let mounted = true;

        const startSession = async () => {
            try {
                if (!process.env.API_KEY) {
                    if (mounted) {
                        setStatus('error');
                        setErrorMsg('API Key Missing');
                    }
                    return;
                }

                // 1. Initialize Audio Contexts
                const InputContextClass = window.AudioContext || (window as any).webkitAudioContext;
                const inputCtx = new InputContextClass({ sampleRate: 16000 });
                inputAudioContextRef.current = inputCtx;

                const OutputContextClass = window.AudioContext || (window as any).webkitAudioContext;
                const outputCtx = new OutputContextClass({ sampleRate: 24000 });
                outputAudioContextRef.current = outputCtx;

                // 2. Setup Analyser for Visualizer (Output)
                const analyser = outputCtx.createAnalyser();
                analyser.fftSize = 256;
                analyser.smoothingTimeConstant = 0.5;
                analyserRef.current = analyser;

                // 3. Setup AudioWorklet for Input (Microphone)
                const blob = new Blob([PCM_WORKLET], { type: 'application/javascript' });
                const workletUrl = URL.createObjectURL(blob);
                await inputCtx.audioWorklet.addModule(workletUrl);

                // 4. Initialize Client and Connect
                const client = new GoogleGenAI({ apiKey: process.env.API_KEY });
                
                const sessionPromise = client.live.connect({
                    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                    config: {
                        responseModalities: [Modality.AUDIO],
                        systemInstruction: MENTOR_SYSTEM_PROMPT,
                        speechConfig: {
                            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                        }
                    },
                    callbacks: {
                        onopen: async () => {
                            if (!mounted) return;
                            setStatus('connected');
                            
                            // Setup Microphone Stream
                            try {
                                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                                streamRef.current = stream;
                                
                                const source = inputCtx.createMediaStreamSource(stream);
                                const workletNode = new AudioWorkletNode(inputCtx, 'pcm-processor');
                                
                                workletNode.port.onmessage = (event) => {
                                    if (isMuted) return;
                                    const inputData = event.data as Float32Array;
                                    const pcmBlob = createPCMBlob(inputData);
                                    
                                    // Send to Gemini
                                    sessionPromise.then(session => {
                                        session.sendRealtimeInput({ media: pcmBlob });
                                    });
                                };

                                source.connect(workletNode);
                                workletNode.connect(inputCtx.destination); // Keep pipeline alive
                                workletNodeRef.current = workletNode;

                            } catch (err) {
                                console.error("Mic Error:", err);
                                if (mounted) {
                                    setStatus('error');
                                    setErrorMsg('Microphone Access Denied');
                                }
                            }
                        },
                        onmessage: async (msg: LiveServerMessage) => {
                            if (!mounted) return;
                            
                            // Handle Audio Output
                            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                            if (base64Audio && outputAudioContextRef.current) {
                                const ctx = outputAudioContextRef.current;
                                
                                // Reset timer if interrupted
                                if (msg.serverContent?.interrupted) {
                                    nextStartTimeRef.current = 0;
                                }

                                try {
                                    const audioBuffer = await decodeAudioData(
                                        decodeAudio(base64Audio),
                                        ctx,
                                        24000,
                                        1
                                    );
                                    
                                    const source = ctx.createBufferSource();
                                    source.buffer = audioBuffer;
                                    
                                    // Route through Analyser for visuals
                                    if (analyserRef.current) {
                                        source.connect(analyserRef.current);
                                        analyserRef.current.connect(ctx.destination);
                                    } else {
                                        source.connect(ctx.destination);
                                    }
                                    
                                    const currentTime = ctx.currentTime;
                                    // Basic jitter buffer logic
                                    const startTime = Math.max(currentTime, nextStartTimeRef.current);
                                    
                                    source.start(startTime);
                                    nextStartTimeRef.current = startTime + audioBuffer.duration;
                                    
                                } catch (e) {
                                    console.error("Audio Decode Error", e);
                                }
                            }
                        },
                        onclose: () => {
                            if (mounted) setStatus('error');
                        },
                        onerror: (err) => {
                            console.error("Live Error:", err);
                            if (mounted) {
                                setStatus('error');
                                const errorString = String(err);
                                if (errorString.includes("permission") || errorString.includes("403")) {
                                    setErrorMsg('Permission Denied: Check API Key');
                                } else {
                                    setErrorMsg('Connection Failed');
                                }
                            }
                        }
                    }
                });

                // Store session for cleanup
                sessionPromise.then(s => { activeSessionRef.current = s; });

                // Start Visualizer Loop
                const draw = () => {
                    if (!mounted) return;
                    if (analyserRef.current) {
                        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                        analyserRef.current.getByteFrequencyData(dataArray);
                        
                        // Calculate average volume for the orb scale
                        let sum = 0;
                        for (let i = 0; i < dataArray.length; i++) {
                            sum += dataArray[i];
                        }
                        const average = sum / dataArray.length;
                        // Boost it a bit for visual impact
                        setVolumeLevel(average * 2.5); 
                    }
                    visualizerFrameRef.current = requestAnimationFrame(draw);
                };
                draw();

            } catch (e) {
                console.error("Initialization Failed:", e);
                if (mounted) {
                    setStatus('error');
                    setErrorMsg('Initialization Failed');
                }
            }
        };

        startSession();

        return () => {
            mounted = false;
            cancelAnimationFrame(visualizerFrameRef.current);
            // Cleanup
            if (activeSessionRef.current) activeSessionRef.current.close();
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (workletNodeRef.current) workletNodeRef.current.disconnect();
            if (inputAudioContextRef.current) inputAudioContextRef.current.close();
            if (outputAudioContextRef.current) outputAudioContextRef.current.close();
        };
    }, []);

    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-500">
            {/* Ambient Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px] transition-all duration-300 ${status === 'connected' ? 'opacity-100 scale-100' : 'opacity-20 scale-50'}`}></div>
            </div>

            {/* Header */}
            <div className="absolute top-6 left-0 right-0 flex justify-center">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
                    <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : status === 'error' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                    <span className="text-xs font-bold text-white uppercase tracking-widest">
                        {status === 'connecting' ? 'Establishing Uplink...' : status === 'error' ? (errorMsg || 'Connection Failed') : 'Live Session Active'}
                    </span>
                </div>
            </div>

            {/* Visualizer Orb */}
            <div className="relative z-10 flex flex-col items-center gap-12">
                <div className="relative">
                    {/* Core Orb */}
                    <div 
                        className={`w-32 h-32 rounded-full bg-gradient-to-br shadow-[0_0_60px_rgba(79,70,229,0.5)] flex items-center justify-center transition-transform duration-75 ease-out relative z-10 ${status === 'error' ? 'from-red-600 to-red-800' : 'from-indigo-500 to-purple-600'}`}
                        style={{ transform: `scale(${status === 'error' ? 1 : (1 + Math.min(0.5, volumeLevel / 100))})` }}
                    >
                        {status === 'error' ? <PhoneOff className="w-12 h-12 text-white/50" /> : <Bot className="w-12 h-12 text-white fill-white/20" />}
                    </div>
                    
                    {/* Ripple Effects - Reacts to higher volumes */}
                    {status === 'connected' && (
                        <>
                            <div className={`absolute inset-0 rounded-full border border-white/20 scale-150 animate-ping opacity-20 ${volumeLevel > 30 ? 'block' : 'hidden'}`}></div>
                            <div className={`absolute inset-0 rounded-full border border-accent/40 scale-125 animate-pulse opacity-30 ${volumeLevel > 50 ? 'block' : 'hidden'}`}></div>
                        </>
                    )}
                </div>

                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-black text-white tracking-tight">Mentor AI</h2>
                    <p className="text-white/40 font-medium text-sm uppercase tracking-widest">
                        {status === 'error' ? 'Session Terminated' : isMuted ? 'Microphone Muted' : 'Listening...'}
                    </p>
                </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-12 flex items-center gap-6 z-20">
                <button 
                    onClick={toggleMute}
                    disabled={status === 'error'}
                    className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${isMuted ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/10 hover:bg-white/20'} ${status === 'error' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isMuted ? <MicOff className="w-6 h-6 stroke-[2.5]" /> : <Mic className="w-6 h-6" />}
                </button>
                
                <button 
                    onClick={onClose}
                    className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.4)] hover:shadow-[0_0_60px_rgba(239,68,68,0.6)] transition-all scale-100 hover:scale-105 active:scale-95"
                >
                    <PhoneOff className="w-8 h-8 fill-current" />
                </button>

                <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                    <Activity className="w-6 h-6" />
                </div>
            </div>
        </div>
    );
};

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

const STARTER_PROMPTS = [
    { icon: "🔥", text: "Roast my routine" },
    { icon: "🧠", text: "Fix my trading psychology" },
    { icon: "📉", text: "How to pass a prop firm?" },
    { icon: "💪", text: "Give me a 30m workout" },
];

export const AIAssistant: React.FC<{ onScrollDirectionChange?: (direction: 'up' | 'down') => void }> = ({ onScrollDirectionChange }) => {
  const { chatSessions, currentSessionId, createNewSession, switchSession, deleteSession, updateSessionMessages } = useAppState();
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [showLiveInterface, setShowLiveInterface] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const textBeforeRef = useRef('');
  const shouldAutoScrollRef = useRef(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastScrollTopRef = useRef(0);

  const sessionsList = (chatSessions as ChatSession[]) || [];
  const currentMessages = sessionsList.find(s => s.id === currentSessionId)?.messages || [];

  // --- INITIALIZATION EFFECT ---
  useEffect(() => {
    if (!currentSessionId) {
        if (sessionsList.length > 0) {
            switchSession(sessionsList[0].id);
        } else {
            createNewSession();
        }
    }
  }, [currentSessionId, sessionsList, createNewSession, switchSession]);

  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior });
  };

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
        scrollToBottom();
    }
  }, [currentMessages, loading, isTyping]);

  useEffect(() => {
    const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) setAvailableVoices(voices);
    };
    loadVoices();
    if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  const handleScroll = () => {
      if (!scrollRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      shouldAutoScrollRef.current = isNearBottom;

      if (onScrollDirectionChange) {
          const delta = scrollTop - lastScrollTopRef.current;
          if (Math.abs(delta) > 10) {
              onScrollDirectionChange(delta > 0 ? 'down' : 'up');
              lastScrollTopRef.current = scrollTop;
          }
      }
  };

  const handleReset = () => {
      createNewSession();
      setSpeakingMessageId(null);
      window.speechSynthesis.cancel();
      setPendingImage(null);
      if(isMobileView) setShowHistory(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => { setPendingImage(reader.result as string); };
        reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    const imageToSend = pendingImage;
    if ((!textToSend.trim() && !imageToSend) || loading || isTyping || !currentSessionId) return;
    
    // Stop any existing speech
    if (speakingMessageId) { window.speechSynthesis.cancel(); setSpeakingMessageId(null); }

    // 1. Add User Message immediately
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: textToSend, image: imageToSend || undefined, timestamp: new Date() };
    const messagesWithUser = [...currentMessages, userMsg];
    updateSessionMessages(currentSessionId, messagesWithUser);
    
    setInput('');
    setPendingImage(null);
    setLoading(true);
    shouldAutoScrollRef.current = true;

    // 2. Prepare History for AI
    // CRITICAL FIX: Slicing (0, -1) removes the just-added user message from history.
    // The Gemini Service takes (message, history). If history contains the message being sent, 
    // it results in [User, User, Model] which fails sanitation or logic.
    // We send the 'textToSend' as the message, and the *previous* messages as history.
    const historyForService = messagesWithUser.slice(0, -1).map(m => ({ 
        role: m.role, 
        parts: [{ text: m.text || (m.image ? " [Image Attachment] " : "") }] 
    }));

    // 3. Handle Streaming Response
    if (!imageToSend) {
        // Create an empty bot message to fill in
        const botMsgId = (Date.now() + 1).toString();
        const placeholderBotMsg: ChatMessage = { id: botMsgId, role: 'model', text: '', timestamp: new Date() };
        updateSessionMessages(currentSessionId, [...messagesWithUser, placeholderBotMsg]);
        setLoading(false); 
        setIsTyping(true);

        let accumulatedText = "";
        
        await streamMessageToAI(userMsg.text, historyForService, (chunk) => {
            accumulatedText += chunk;
            const updatedMessages = [...messagesWithUser, { ...placeholderBotMsg, text: accumulatedText }];
            updateSessionMessages(currentSessionId, updatedMessages);
            shouldAutoScrollRef.current = true;
        });
        
        setIsTyping(false);
    } else {
        // Image handling (Analysis)
        const responseText = await sendMessageToAI(userMsg.text, historyForService, imageToSend);
        setLoading(false);
        const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: responseText, timestamp: new Date() };
        updateSessionMessages(currentSessionId, [...messagesWithUser, botMsg]);
    }
  };

  const handleSpeak = (text: string, id: string) => {
    if (!('speechSynthesis' in window)) return;
    if (speakingMessageId === id) { window.speechSynthesis.cancel(); setSpeakingMessageId(null); return; }
    window.speechSynthesis.cancel();
    
    const cleanText = text.replace(/\*\*/g, '').replace(/[*#_]/g, ''); 
    const utterance = new SpeechSynthesisUtterance(cleanText);
    let selectedVoice: SpeechSynthesisVoice | undefined;

    if (availableVoices.length > 0) {
        selectedVoice = availableVoices.find(v => v.name.toLowerCase().includes('whizkid')) || availableVoices.find(v => v.name.includes('Natural') && v.lang.startsWith('en')) || availableVoices.find(v => v.lang.startsWith('en'));
    }
    if (selectedVoice) { utterance.voice = selectedVoice; utterance.lang = selectedVoice.lang; } else { utterance.lang = 'en-US'; }
    
    utterance.pitch = 1.0; utterance.rate = 1.0; 
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    setSpeakingMessageId(id);
    window.speechSynthesis.speak(utterance);
  };

  const startTranscription = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("Speech recognition not supported in this browser.");
        return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    textBeforeRef.current = input; 
    recognitionRef.current.onstart = () => setIsTranscribing(true);
    recognitionRef.current.onend = () => setIsTranscribing(false);
    recognitionRef.current.onresult = (event: any) => {
        let final = '';
        let interim = '';
        for (let i = 0; i < event.results.length; ++i) {
            if (event.results[i].isFinal) final += event.results[i][0].transcript; else interim += event.results[i][0].transcript;
        }
        setInput(textBeforeRef.current + (textBeforeRef.current && !textBeforeRef.current.endsWith(' ') ? ' ' : '') + final + interim);
    };
    recognitionRef.current.start();
  };

  const stopTranscription = () => { if (recognitionRef.current) recognitionRef.current.stop(); setIsTranscribing(false); };

  const groupedSessions = sessionsList.reduce((acc, session) => {
      const date = new Date(session.updatedAt);
      const today = new Date();
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      
      let key = 'Previous 7 Days';
      if (date.toDateString() === today.toDateString()) key = 'Today';
      else if (date.toDateString() === yesterday.toDateString()) key = 'Yesterday';
      else if (date < new Date(new Date().setDate(today.getDate() - 7))) key = 'Older';

      if (!acc[key]) acc[key] = [];
      acc[key].push(session);
      return acc;
  }, {} as Record<string, ChatSession[]>);

  const containerClass = "flex h-[calc(100vh-140px)] md:h-[calc(100vh-120px)] w-full bg-[#09090b] text-white overflow-hidden font-sans relative md:rounded-[24px] md:border md:border-white/10 shadow-2xl";

  return (
    <div className={containerClass}>
      
      {/* Live AI Overlay */}
      {showLiveInterface && <LiveVoiceInterface onClose={() => setShowLiveInterface(false)} />}

      {/* Sidebar / History Drawer */}
      <div className={`
          absolute inset-y-0 left-0 z-20 w-[280px] bg-[#0A0A0A] border-r border-white/10 flex flex-col transition-transform duration-300 ease-in-out
          ${isMobileView ? (showHistory ? 'translate-x-0' : '-translate-x-full') : 'relative translate-x-0'}
      `}>
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <span className="text-xs font-bold text-white/50 uppercase tracking-widest">History</span>
              <Button size="xs" variant="ghost" icon={Plus} onClick={handleReset} className="text-white/70 hover:text-white">New Chat</Button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-4">
              {Object.entries(groupedSessions).map(([group, sessions]) => (
                  <div key={group}>
                      <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 mb-2">{group}</h4>
                      <div className="space-y-1">
                          {sessions.map(session => (
                              <div 
                                  key={session.id} 
                                  onClick={() => { switchSession(session.id); if(isMobileView) setShowHistory(false); }}
                                  className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${currentSessionId === session.id ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                              >
                                  <div className="flex items-center gap-2 overflow-hidden">
                                      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                                      <span className="text-xs font-medium truncate">{session.title}</span>
                                  </div>
                                  {sessionsList.length > 1 && (
                                      <button 
                                          onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                                          className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity p-1"
                                      >
                                          <Trash2 className="w-3 h-3" />
                                      </button>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative bg-transparent overflow-hidden">
          {/* Header */}
          <div className="bg-white/[0.02] border-b border-white/5 p-4 flex items-center justify-between backdrop-blur-xl z-10 shrink-0">
            <div className="flex items-center gap-3">
                {isMobileView && (
                    <button onClick={() => setShowHistory(!showHistory)} className="p-2 -ml-2 text-white/50 hover:text-white rounded-full">
                        {showHistory ? <X className="w-5 h-5" /> : <History className="w-5 h-5" />}
                    </button>
                )}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center border border-white/10 shadow-lg">
                    <Bot className="w-5 h-5 text-accent drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                </div>
                <div>
                    <h3 className="font-bold text-white flex items-center gap-2 text-sm tracking-tight">
                        Mentor AI <span className="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded border border-accent/20 uppercase tracking-wide font-bold">Beta</span>
                    </h3>
                    <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Performance Architect</p>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setShowLiveInterface(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse"
                >
                    <Phone className="w-3.5 h-3.5 fill-current" /> Call Mentor
                </button>
                {!isMobileView && <Button variant="ghost" size="sm" onClick={handleReset} icon={RefreshCw} className="rounded-xl">New Chat</Button>}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth bg-transparent custom-scrollbar pb-32" ref={scrollRef} onScroll={handleScroll}>
            {currentMessages.map((msg, idx) => {
                const isMe = msg.role === 'user';
                return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group animate-in slide-in-from-bottom-2 duration-300`}>
                        <div className={`max-w-[85%] md:max-w-[75%]`}>
                            <div className={`px-4 py-3 text-[15px] shadow-lg relative ${
                                isMe 
                                    ? 'bg-gradient-to-br from-[#327AFF] to-[#1B5BFF] text-white rounded-[20px] rounded-br-[4px] shadow-[0_4px_15px_rgba(27,91,255,0.3)]' 
                                    : 'bg-white/[0.08] backdrop-blur-[20px] text-white rounded-[20px] rounded-bl-[4px] border border-white/10'
                            }`}>
                                {msg.image && (
                                    <div className="mb-3 rounded-xl overflow-hidden border border-white/10">
                                        <img src={msg.image} alt="Attachment" className="max-w-full max-h-[300px] object-cover" />
                                    </div>
                                )}
                                {isMe ? <p>{msg.text}</p> : <FormattedText text={msg.text} />}
                            </div>
                            
                            <div className={`flex items-center gap-2 mt-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">
                                    {msg.timestamp.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                </span>
                                {!isMe && idx !== 0 && (
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                        <button className="text-white/30 hover:text-white" onClick={() => navigator.clipboard.writeText(msg.text)}><Copy className="w-3 h-3" /></button>
                                        <button 
                                            className={`transition-colors ${speakingMessageId === msg.id ? 'text-accent animate-pulse' : 'text-white/30 hover:text-accent'}`}
                                            onClick={() => handleSpeak(msg.text, msg.id)}
                                        >
                                            {speakingMessageId === msg.id ? <StopCircle className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })}
            
            {loading && (
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white/[0.08] backdrop-blur-[20px] px-4 py-3 rounded-[20px] rounded-bl-[4px] flex items-center gap-1 shadow-sm h-[46px] border border-white/10">
                   <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '-0.3s' }}></div>
                   <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '-0.15s' }}></div>
                   <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                </div>
              </div>
            )}

            {isTyping && !loading && (
                 <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <span className="text-xs text-accent animate-pulse font-mono ml-2">Mentor is thinking...</span>
                 </div>
            )}
          </div>

          {/* Input Area */}
          <div className={`p-4 bg-white/[0.02] backdrop-blur-xl border-t border-white/5 z-10 shrink-0 ${isMobileView ? 'pb-safe-bottom mb-[80px]' : ''}`}>
            
            {pendingImage && (
                <div className="mb-2 relative inline-block animate-in zoom-in-95 duration-200">
                    <img src={pendingImage} alt="Preview" className="h-16 w-16 object-cover rounded-xl border border-white/20" />
                    <button onClick={() => setPendingImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"><X className="w-3 h-3" /></button>
                </div>
            )}

            {currentMessages.length < 3 && !loading && !isTyping && !pendingImage && (
                <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar mb-1 px-1">
                    {STARTER_PROMPTS.map((p) => (
                        <button key={p.text} onClick={() => handleSend(p.text)} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-accent/30 rounded-full text-xs font-bold text-white/80 hover:text-accent transition-all whitespace-nowrap backdrop-blur-md shadow-lg">
                            <span className="text-base">{p.icon}</span> {p.text}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex gap-3 max-w-4xl mx-auto items-center">
              <div className="flex-1 relative group">
                <input
                    ref={inputRef}
                    type="text"
                    className={`w-full vision-glass bg-white/[0.05] border-white/10 rounded-[24px] pl-12 pr-12 py-3.5 text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all placeholder:text-white/40 shadow-inner ${isTranscribing ? 'border-red-500/50 bg-red-500/10' : ''}`}
                    placeholder={isTranscribing ? "Listening..." : "Ask about discipline..."}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    disabled={loading || isTyping}
                />
                
                <div className="absolute left-2 top-1/2 -translate-y-1/2">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors" disabled={loading || isTyping}>
                        <ImageIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                        onMouseDown={startTranscription}
                        onMouseUp={stopTranscription}
                        onTouchStart={startTranscription}
                        onTouchEnd={stopTranscription}
                        disabled={loading || isTyping}
                        className={`p-2 rounded-full transition-all ${isTranscribing ? 'text-red-500 bg-red-500/20 animate-pulse' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
                    >
                        <Mic className="w-5 h-5" />
                    </button>
                </div>
              </div>

              <Button 
                  onClick={() => handleSend()} 
                  disabled={loading || isTyping || (!input.trim() && !pendingImage)} 
                  className={`w-12 h-12 p-0 rounded-full flex items-center justify-center transition-all shrink-0 ${input.trim() || pendingImage ? 'bg-[#327AFF] hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(50,122,255,0.4)]' : 'bg-white/10 text-white/30 hover:bg-white/20'}`}
              >
                  <Send className="w-5 h-5 ml-0.5" />
              </Button>
            </div>
            
            <div className="text-center mt-3">
                <p className="text-[9px] text-white/30 flex items-center justify-center gap-1.5 uppercase tracking-widest font-bold">
                    <Zap className="w-3 h-3 text-gold" />
                    AI can make mistakes. Trust your own analysis.
                </p>
            </div>
          </div>
      </div>
    </div>
  );
};
