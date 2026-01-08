
import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '../App';
import { Card, Button, Modal, Badge, StaggerItem } from './Shared';
import { Play, Pause, FileText, Link as LinkIcon, CheckCircle, Lock, Plus, Trash2, ExternalLink, Download, Clock, X, Film, FolderOpen, Save, File, Video, FileSpreadsheet, UploadCloud, Layers, RotateCcw, RotateCw, Volume2, VolumeX, Maximize, Minimize, Image as ImageIcon, ChevronDown } from 'lucide-react';
import { LibraryResource, ResourceType, Role } from '../types';

// --- Custom Video Player (Anti-Leak Style with Controls) ---
const SecureVideoPlayer: React.FC<{ resourceId?: string; url: string; thumbnail?: string; title: string; onClose: () => void }> = React.memo(({ resourceId, url, thumbnail, title, onClose }) => {
    const { updateResourceProgress } = useAppState();
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<any>(null);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Save progress on unmount or close
    useEffect(() => {
        return () => {
            if (resourceId && videoRef.current) {
                const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
                if (!isNaN(p)) updateResourceProgress(resourceId, p);
            }
        };
    }, [resourceId]);

    const resetControlsTimeout = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    };

    const handleMouseMove = () => {
        resetControlsTimeout();
    };

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
            setShowControls(true);
        } else {
            videoRef.current.play();
            resetControlsTimeout();
        }
        setIsPlaying(!isPlaying);
    };

    const skip = (seconds: number) => {
        if (!videoRef.current) return;
        videoRef.current.currentTime += seconds;
        resetControlsTimeout();
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        videoRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const toggleFullscreen = async () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            await containerRef.current.requestFullscreen();
        } else {
            await document.exitFullscreen();
        }
    };

    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        setCurrentTime(videoRef.current.currentTime);
        const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
        setProgress(p || 0);
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!videoRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        const percent = x / width;
        videoRef.current.currentTime = percent * videoRef.current.duration;
    };

    const formatTime = (seconds: number) => {
        if (!seconds) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div 
            ref={containerRef}
            className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300 group"
            onMouseMove={handleMouseMove}
            onTouchStart={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
        >
            <div className={`absolute top-0 left-0 right-0 p-4 pt-safe-top flex justify-between items-start z-20 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <h3 className="text-white font-bold text-lg drop-shadow-md px-2 truncate max-w-[80%]">{title}</h3>
                <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white pointer-events-auto transition-colors backdrop-blur-md"><X className="w-6 h-6" /></button>
            </div>

            <div className="flex-1 flex items-center justify-center relative bg-black" onClick={togglePlay} onContextMenu={e => e.preventDefault()}>
                <video 
                    ref={videoRef}
                    src={url} 
                    poster={thumbnail} 
                    className="max-w-full max-h-full w-full h-full object-contain pointer-events-none" 
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => { setIsPlaying(false); setShowControls(true); }}
                    playsInline
                />
                
                {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 hover:scale-110 transition-transform cursor-pointer">
                            <Play className="w-8 h-8 md:w-10 md:h-10 text-white fill-current ml-1" />
                        </div>
                    </div>
                )}
            </div>

            <div className={`absolute bottom-0 left-0 right-0 p-4 md:p-6 pb-safe-bottom bg-gradient-to-t from-black/90 via-black/60 to-transparent z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="h-1.5 bg-white/20 rounded-full cursor-pointer overflow-hidden group/bar mb-4 hover:h-2.5 transition-all" onClick={handleSeek}>
                    <div className="h-full bg-[#FEDD00] relative" style={{ width: `${progress}%` }}>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg scale-0 group-hover/bar:scale-100 transition-transform"></div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 md:gap-4">
                        <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="text-white hover:text-[#FEDD00] transition-colors">
                            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                        </button>
                        
                        <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); skip(-10); }} className="p-1.5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors hidden md:block">
                                <RotateCcw className="w-5 h-5" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); skip(10); }} className="p-1.5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors hidden md:block">
                                <RotateCw className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex items-center gap-2 group/vol">
                            <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="text-white/70 hover:text-white">
                                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                        </div>

                        <span className="text-xs font-mono font-medium text-white/60">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                            <Lock className="w-3 h-3 text-[#FEDD00]" />
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Protected</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="text-white/70 hover:text-white transition-colors">
                            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

// --- Add Module Modal ---
const AddModuleModal: React.FC<{ isOpen: boolean; onClose: () => void }> = React.memo(({ isOpen, onClose }) => {
    const { addLibraryModule } = useAppState();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = () => {
        if (!title) return;
        addLibraryModule(title, description);
        onClose();
        setTitle(''); setDescription('');
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} title="New Module" onClose={onClose} onConfirm={handleSubmit} confirmText="Create">
            <div className="space-y-5 text-left">
                <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-500 dark:text-white/40 uppercase tracking-widest pl-1">Module Title</label>
                    <input 
                        type="text" 
                        value={title} 
                        onChange={e => setTitle(e.target.value)} 
                        className="w-full bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white text-sm focus:border-accent focus:bg-white dark:focus:bg-black/60 focus:outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-white/20" 
                        placeholder="e.g. Phase 4: Mastery" 
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-500 dark:text-white/40 uppercase tracking-widest pl-1">Description</label>
                    <textarea 
                        value={description} 
                        onChange={e => setDescription(e.target.value)} 
                        rows={3} 
                        className="w-full bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white text-sm focus:border-accent focus:bg-white dark:focus:bg-black/60 focus:outline-none resize-none transition-all placeholder:text-zinc-400 dark:placeholder:text-white/20" 
                        placeholder="Brief overview of this module's content..." 
                    />
                </div>
            </div>
        </Modal>
    );
});

// --- Upload Resource Modal ---
const UploadResourceModal: React.FC<{ isOpen: boolean; onClose: () => void; defaultModuleId?: string }> = React.memo(({ isOpen, onClose, defaultModuleId }) => {
    const { addResource, libraryModules } = useAppState();
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [type, setType] = useState<ResourceType>('VIDEO');
    const [moduleId, setModuleId] = useState(defaultModuleId || (libraryModules[0]?.id || ''));
    
    // Upload Mode & Data
    const [uploadMode, setUploadMode] = useState<'LINK' | 'FILE'>('LINK');
    const [thumbnail, setThumbnail] = useState<string | undefined>(undefined);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const thumbInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const objectUrl = URL.createObjectURL(file);
            setUrl(objectUrl);
            if (!title) setTitle(file.name.replace(/\.[^/.]+$/, "")); 
        }
    };

    const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => setThumbnail(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = () => {
        if (!title || !url || !moduleId) return;
        addResource({
            id: Date.now().toString(),
            moduleId,
            title,
            description: '', 
            type,
            url,
            thumbnail: thumbnail || (type === 'VIDEO' ? `https://picsum.photos/seed/${Date.now()}/400/225` : undefined),
            isCompleted: false,
            progress: 0
        });
        onClose();
        setTitle(''); setUrl(''); setThumbnail(undefined); setUploadMode('LINK');
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} title="Add Resource" onClose={onClose} onConfirm={handleSubmit} confirmText="Add">
            <div className="space-y-5 text-left">
                <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-500 dark:text-white/40 uppercase tracking-widest pl-1">Module</label>
                    <div className="relative">
                        <select 
                            value={moduleId} 
                            onChange={e => setModuleId(e.target.value)} 
                            className="w-full bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white text-sm focus:border-accent focus:bg-white dark:focus:bg-black/60 focus:outline-none appearance-none transition-all cursor-pointer"
                        >
                            {libraryModules.map(m => <option key={m.id} value={m.id} className="bg-white dark:bg-zinc-900">{m.title}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-white/30 pointer-events-none" />
                    </div>
                </div>
                
                <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-500 dark:text-white/40 uppercase tracking-widest pl-1">Resource Type</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['VIDEO', 'PDF', 'LINK'].map(t => (
                            <button 
                                key={t} 
                                onClick={() => setType(t as ResourceType)} 
                                className={`py-3 rounded-xl text-[10px] font-bold border transition-all uppercase tracking-wide ${type === t ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white shadow-md' : 'bg-zinc-100 dark:bg-black/40 text-zinc-500 dark:text-white/40 border-transparent hover:bg-zinc-200 dark:hover:bg-black/60 hover:text-zinc-900 dark:hover:text-white'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-500 dark:text-white/40 uppercase tracking-widest pl-1">Title</label>
                    <input 
                        type="text" 
                        value={title} 
                        onChange={e => setTitle(e.target.value)} 
                        className="w-full bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white text-sm focus:border-accent focus:bg-white dark:focus:bg-black/60 focus:outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-white/20" 
                        placeholder="e.g. Masterclass Vol 1" 
                    />
                </div>

                {/* Upload Mode Toggle */}
                {type === 'VIDEO' || type === 'PDF' ? (
                    <div className="space-y-3">
                        <div className="flex bg-zinc-100 dark:bg-black/40 rounded-xl p-1 border border-zinc-200 dark:border-white/5">
                            <button onClick={() => setUploadMode('LINK')} className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${uploadMode === 'LINK' ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white'}`}>Link URL</button>
                            <button onClick={() => setUploadMode('FILE')} className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${uploadMode === 'FILE' ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white'}`}>Upload File</button>
                        </div>

                        {uploadMode === 'LINK' ? (
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-zinc-500 dark:text-white/40 uppercase tracking-widest pl-1">Direct Link</label>
                                <input 
                                    type="text" 
                                    value={url} 
                                    onChange={e => setUrl(e.target.value)} 
                                    className="w-full bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white text-sm font-mono focus:border-accent focus:bg-white dark:focus:bg-black/60 focus:outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-white/20" 
                                    placeholder="https://..." 
                                />
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-zinc-500 dark:text-white/40 uppercase tracking-widest pl-1">Select File</label>
                                <div onClick={() => fileInputRef.current?.click()} className={`border border-dashed border-zinc-300 dark:border-white/20 rounded-xl h-24 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/5 transition-all group ${url ? 'border-green-500/50 bg-green-500/5' : 'bg-zinc-50 dark:bg-black/40'}`}>
                                    <UploadCloud className={`w-6 h-6 mb-2 transition-transform group-hover:scale-110 ${url ? 'text-green-500' : 'text-zinc-400 dark:text-white/40'}`} />
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${url ? 'text-green-500 dark:text-green-400' : 'text-zinc-400 dark:text-white/40'}`}>{url ? 'File Selected' : 'Click or Drag to Upload'}</span>
                                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept={type === 'VIDEO' ? 'video/*' : type === 'PDF' ? 'application/pdf' : '*/*'} />
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-zinc-500 dark:text-white/40 uppercase tracking-widest pl-1">Link URL</label>
                        <input 
                            type="text" 
                            value={url} 
                            onChange={e => setUrl(e.target.value)} 
                            className="w-full bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white text-sm font-mono focus:border-accent focus:bg-white dark:focus:bg-black/60 focus:outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-white/20" 
                            placeholder="https://..." 
                        />
                    </div>
                )}

                {/* Thumbnail Upload (Only for Videos) */}
                {type === 'VIDEO' && (
                    <div className="space-y-1.5 pt-4 border-t border-zinc-200 dark:border-white/5">
                         <div className="flex justify-between items-center pl-1 mb-1">
                            <label className="text-[9px] font-bold text-zinc-500 dark:text-white/40 uppercase tracking-widest">Thumbnail (Optional)</label>
                            {thumbnail && <button onClick={() => setThumbnail(undefined)} className="text-[9px] text-red-500 hover:underline font-bold uppercase tracking-wider">Remove</button>}
                         </div>
                         <div onClick={() => thumbInputRef.current?.click()} className="flex items-center gap-4 p-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/40 cursor-pointer hover:bg-zinc-100 dark:hover:bg-black/60 transition-colors group">
                            {thumbnail ? (
                                <img src={thumbnail} className="w-12 h-12 rounded-lg object-cover bg-black border border-zinc-200 dark:border-white/10" />
                            ) : (
                                <div className="w-12 h-12 rounded-lg bg-zinc-200 dark:bg-white/5 flex items-center justify-center group-hover:bg-zinc-300 dark:group-hover:bg-white/10 transition-colors"><ImageIcon className="w-5 h-5 text-zinc-400 dark:text-white/30" /></div>
                            )}
                            <div className="flex-1">
                                <span className="text-xs text-zinc-700 dark:text-white/70 font-medium block group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{thumbnail ? 'Change Thumbnail' : 'Upload Cover Image'}</span>
                                <span className="text-[9px] text-zinc-400 dark:text-white/30 uppercase tracking-wide">16:9 Recommended</span>
                            </div>
                            <input type="file" ref={thumbInputRef} className="hidden" accept="image/*" onChange={handleThumbnailSelect} />
                         </div>
                    </div>
                )}
            </div>
        </Modal>
    );
});

// --- Resource Card ---
const ResourceCard: React.FC<{ resource: LibraryResource; onOpen: () => void }> = React.memo(({ resource, onOpen }) => {
    const { currentUser, deleteResource, markResourceComplete } = useAppState();
    const isMentor = currentUser?.role === Role.MENTOR;

    const Icon = resource.type === 'VIDEO' ? Film : resource.type === 'PDF' ? FileText : LinkIcon;
    const color = resource.type === 'VIDEO' ? 'text-purple-500 dark:text-purple-400' : resource.type === 'PDF' ? 'text-red-500 dark:text-red-400' : 'text-blue-500 dark:text-blue-400';

    return (
        <div className="group relative vision-glass overflow-hidden rounded-[20px] transition-all hover:border-zinc-300 dark:hover:border-white/20 hover:bg-zinc-50 dark:hover:bg-white/5 flex flex-col h-full active:scale-[0.98]">
            {resource.thumbnail && resource.type === 'VIDEO' && (
                <div className="aspect-video w-full relative overflow-hidden bg-black cursor-pointer" onClick={onOpen}>
                    <img src={resource.thumbnail} alt={resource.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                        </div>
                    </div>
                    {/* Progress Bar Overlay */}
                    {resource.progress !== undefined && resource.progress > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                            <div className="h-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" style={{ width: `${resource.progress}%` }}></div>
                        </div>
                    )}
                    {resource.duration && (
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/80 text-[9px] font-bold text-white font-mono border border-white/10">{resource.duration}</div>
                    )}
                </div>
            )}
            
            <div className="p-4 flex flex-col flex-1 gap-3">
                <div className="flex items-start gap-3">
                    {!resource.thumbnail && (
                        <div className={`w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center shrink-0 ${color}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight mb-1 truncate">{resource.title}</h4>
                        <p className="text-xs text-zinc-500 dark:text-white/50 line-clamp-2">{resource.description}</p>
                    </div>
                </div>

                <div className="mt-auto flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-white/5">
                    <button 
                        onClick={(e) => { e.stopPropagation(); markResourceComplete(resource.id); }}
                        className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 px-3 py-2 md:py-1 rounded-lg transition-colors ${resource.isCompleted ? 'text-green-600 dark:text-green-400 bg-green-500/10' : 'text-zinc-400 dark:text-white/30 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5'}`}
                    >
                        <CheckCircle className="w-3.5 h-3.5" /> {resource.isCompleted ? 'Completed' : 'Mark Done'}
                    </button>
                    
                    <div className="flex gap-2">
                        {isMentor && (
                            <button onClick={(e) => { e.stopPropagation(); deleteResource(resource.id); }} className="p-2 md:p-1.5 text-zinc-400 dark:text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                        {resource.type !== 'VIDEO' && (
                            <a href={resource.url} target="_blank" rel="noopener noreferrer" className="p-2 md:p-1.5 text-zinc-400 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1">
                                <span className="text-[9px] font-bold">OPEN</span> <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

// --- Main Library Component ---
export const Library: React.FC = () => {
    const { libraryModules, libraryResources, currentUser, deleteLibraryModule } = useAppState();
    const [activeVideo, setActiveVideo] = useState<LibraryResource | null>(null);
    const [showUpload, setShowUpload] = useState(false);
    const [showAddModule, setShowAddModule] = useState(false);
    const isMentor = currentUser?.role === Role.MENTOR;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 md:pb-8">
            {/* Header - Optimized for Mobile */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase flex items-center gap-3">
                        <FolderOpen className="w-6 h-6 text-accent" /> 
                        The Vault
                    </h1>
                    <p className="text-zinc-500 dark:text-white/40 text-sm font-medium mt-1">Official Mentorship Resources & Archives</p>
                </div>
                {isMentor && (
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button onClick={() => setShowAddModule(true)} variant="outline" icon={Layers} size="sm" className="flex-1 md:flex-none">New Phase</Button>
                        <Button onClick={() => setShowUpload(true)} icon={Plus} size="sm" className="flex-1 md:flex-none">Add Content</Button>
                    </div>
                )}
            </div>

            {/* Modules */}
            <div className="space-y-8">
                {libraryModules.sort((a,b) => a.order - b.order).map(module => {
                    const moduleResources = libraryResources.filter(r => r.moduleId === module.id);
                    if (moduleResources.length === 0 && !isMentor) return null;

                    return (
                        <div key={module.id} className="space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                <div className="flex items-center justify-between w-full md:w-auto">
                                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{module.title}</h2>
                                    {isMentor && (
                                        <button 
                                            onClick={() => deleteLibraryModule(module.id)}
                                            className="text-zinc-400 dark:text-white/20 hover:text-red-500 p-2 md:p-1 transition-colors md:hidden"
                                            title="Delete Module"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <div className="hidden md:block h-px flex-1 bg-zinc-200 dark:bg-white/10"></div>
                                <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
                                    <span className="text-[10px] font-bold text-zinc-400 dark:text-white/30 uppercase tracking-widest">{moduleResources.length} items</span>
                                    {isMentor && (
                                        <button 
                                            onClick={() => deleteLibraryModule(module.id)}
                                            className="text-zinc-400 dark:text-white/20 hover:text-red-500 p-1 transition-colors hidden md:block"
                                            title="Delete Module"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                                {moduleResources.map((res, i) => (
                                    <StaggerItem key={res.id} index={i} delayPerItem={0.05}>
                                        <ResourceCard 
                                            resource={res} 
                                            onOpen={() => {
                                                if (res.type === 'VIDEO') setActiveVideo(res);
                                                else window.open(res.url, '_blank');
                                            }} 
                                        />
                                    </StaggerItem>
                                ))}
                                {isMentor && (
                                    <button 
                                        onClick={() => setShowUpload(true)}
                                        className="h-full min-h-[140px] md:min-h-[180px] rounded-[20px] border border-dashed border-zinc-300 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/30 bg-zinc-50 dark:bg-white/[0.02] hover:bg-zinc-100 dark:hover:bg-white/[0.05] flex flex-col items-center justify-center gap-2 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Plus className="w-5 h-5 text-zinc-400 dark:text-white/30 group-hover:text-zinc-600 dark:group-hover:text-white" />
                                        </div>
                                        <span className="text-xs font-bold text-zinc-400 dark:text-white/30 group-hover:text-zinc-600 dark:group-hover:text-white">Add to {module.title}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Video Player Overlay */}
            {activeVideo && (
                <SecureVideoPlayer 
                    resourceId={activeVideo.id}
                    url={activeVideo.url} 
                    thumbnail={activeVideo.thumbnail}
                    title={activeVideo.title}
                    onClose={() => setActiveVideo(null)} 
                />
            )}

            <UploadResourceModal isOpen={showUpload} onClose={() => setShowUpload(false)} />
            <AddModuleModal isOpen={showAddModule} onClose={() => setShowAddModule(false)} />
        </div>
    );
};
