
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card, Button, Modal, Badge, NextNewsWidget, UnifiedMentorMessageCard, CountUp } from './Shared';
import { Users, Mic, Video, StopCircle, Bell, Trash2, Plus, Monitor, Disc, MicOff, VideoOff, Minimize2, Maximize2, AlertCircle, X, PictureInPicture, ExternalLink, Save, CheckCircle, Scaling, Expand, Crop, MessageSquarePlus, Settings, Radio, Shield, Youtube, UploadCloud, Play, Image as ImageIcon, Calendar, TrendingUp, BarChart2, BookOpen, MessageSquare, Zap, Brain, BellRing, Clock, MoreHorizontal, Activity, Layers, ArrowRight, ChevronRight, Send, AlertTriangle } from 'lucide-react';
import { useAppState } from '../App';
import { GroupPermission, BroadcastTag } from '../types';

// --- Upload Mindset Modal ---
const UploadMindsetModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { updateDailyMindset } = useAppState();
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    
    const videoInputRef = useRef<HTMLInputElement>(null);
    const thumbInputRef = useRef<HTMLInputElement>(null);

    const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setVideoUrl(URL.createObjectURL(file));
            setUploadProgress(0); // Reset progress
        }
    };

    const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => setThumbnailUrl(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        if (!videoUrl) return;
        setIsSaving(true);
        
        // Simulate upload progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            setUploadProgress(progress);
            if (progress >= 100) {
                clearInterval(interval);
                updateDailyMindset(videoUrl, thumbnailUrl || undefined);
                setIsSaving(false);
                onClose();
                setVideoUrl(null);
                setThumbnailUrl(null);
                setUploadProgress(0);
            }
        }, 200); // 2 seconds total simulated time
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} title="Update Mindset Video" onClose={onClose} onConfirm={handleSave} confirmText="Publish" confirmVariant="primary">
            <div className="space-y-6">
                {/* Video Preview / Upload */}
                <div className="space-y-2">
                    <div 
                        onClick={() => !videoUrl && videoInputRef.current?.click()}
                        className={`aspect-video rounded-2xl border-2 border-dashed transition-all cursor-pointer relative group overflow-hidden ${videoUrl ? 'border-transparent bg-black' : 'border-white/10 bg-black/20 hover:bg-black/30 hover:border-white/30'}`}
                    >
                        {videoUrl ? (
                            <>
                                <video src={videoUrl} className="w-full h-full object-contain" controls />
                                <button 
                                    onClick={(e) => { e.stopPropagation(); videoInputRef.current?.click(); }} 
                                    className="absolute top-3 right-3 bg-black/70 hover:bg-black text-white text-[10px] font-bold px-3 py-1.5 rounded-lg backdrop-blur-md transition-all opacity-0 group-hover:opacity-100"
                                >
                                    Replace Video
                                </button>
                            </>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                                <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <UploadCloud className="w-7 h-7 text-white/40 group-hover:text-white/80" />
                                </div>
                                <p className="text-sm font-bold text-white mb-1">Click to Upload Video</p>
                                <p className="text-[10px] text-white/40 uppercase tracking-wider font-medium">MP4, MOV up to 100MB</p>
                            </div>
                        )}
                        <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={handleVideoSelect} />
                    </div>
                </div>

                {/* Thumbnail Upload */}
                <div className="space-y-1.5">
                     <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest pl-1">Thumbnail</label>
                     <div 
                        onClick={() => thumbInputRef.current?.click()}
                        className="flex items-center gap-4 p-3 rounded-xl bg-black/40 border border-white/10 cursor-pointer hover:bg-black/60 transition-colors group"
                     >
                         {thumbnailUrl ? (
                             <img src={thumbnailUrl} className="w-14 h-14 rounded-lg object-cover bg-black border border-white/10" />
                         ) : (
                             <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-white/20"><ImageIcon className="w-6 h-6 text-white/30" /></div>
                         )}
                         <div className="flex-1">
                             <p className="text-sm font-medium text-white/90 group-hover:text-white">{thumbnailUrl ? 'Change Thumbnail' : 'Upload Cover Image'}</p>
                             <p className="text-[10px] text-white/40 mt-0.5 uppercase tracking-wide">16:9 recommended</p>
                         </div>
                         <input type="file" ref={thumbInputRef} className="hidden" accept="image/*" onChange={handleThumbnailSelect} />
                     </div>
                </div>

                {/* Progress Bar (Visible during saving) */}
                {isSaving && (
                    <div className="space-y-1.5 pt-2">
                        <div className="flex justify-between text-[9px] uppercase font-bold text-white/40 tracking-wider">
                            <span>Uploading...</span>
                            <span>{uploadProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-accent shadow-[0_0_10px_rgba(139,92,246,0.5)] transition-all duration-200" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

const QuickActionBtn = ({ icon: Icon, label, onClick }: any) => (
    <button onClick={onClick} className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white dark:bg-[#080808] border border-zinc-200 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 hover:border-zinc-300 dark:hover:border-white/10 transition-all group shadow-sm">
        <Icon className="w-4 h-4 text-zinc-400 dark:text-white/50 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
        <span className="text-sm font-medium text-zinc-500 dark:text-white/60 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{label}</span>
    </button>
);

const MetricItem = ({ label, value, highlight, warn }: any) => (
    <div className="flex flex-col items-center text-center p-2">
        <span className={`text-2xl md:text-3xl font-light tracking-tight ${highlight ? 'text-zinc-900 dark:text-white' : warn ? 'text-red-500 dark:text-red-400' : 'text-zinc-600 dark:text-white/80'}`}>
            {typeof value === 'number' ? <CountUp end={value} /> : value}
        </span>
        <span className="text-[10px] font-bold text-zinc-400 dark:text-white/30 uppercase tracking-widest mt-1">{label}</span>
    </div>
);

const StudentRow = ({ student }: any) => (
    <div className="flex items-center justify-between py-4 border-b border-zinc-200 dark:border-white/5 last:border-0 hover:bg-zinc-50 dark:hover:bg-white/[0.02] px-4 -mx-4 rounded-xl transition-colors cursor-pointer group animate-slide-up-fade">
        <div className="flex items-center gap-4">
            <img src={student.avatar} className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 object-cover grayscale group-hover:grayscale-0 transition-all" />
            <div>
                <h4 className="text-sm font-medium text-zinc-800 dark:text-white/90 group-hover:text-black dark:group-hover:text-white">{student.name}</h4>
                <p className="text-xs text-zinc-500 dark:text-white/40 font-mono">Level {Math.floor((student.points || 0) / 100)}</p>
            </div>
        </div>
        <div className="flex items-center gap-6">
            <div className="text-right hidden md:block">
                <span className="text-xs font-medium text-zinc-500 dark:text-white/60 block"><CountUp end={student.points || 0} /> XP</span>
            </div>
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide ${student.points > 1200 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-white/40 border-zinc-200 dark:border-white/10'}`}>
                {student.points > 1200 ? 'Locked In' : 'Drifting'}
            </div>
        </div>
    </div>
);

// --- Main Dashboard Component ---

export const MentorDashboard: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { users, announcements, currentUser, dailyMindsetUrl, dailyMindsetThumbnail, broadcasts, addBroadcast } = useAppState();
  
  // Modals
  const [showMindsetUpload, setShowMindsetUpload] = useState(false);
  
  const students = users.filter(u => u.role === 'STUDENT');

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-6 animate-in fade-in duration-700">
      
      {/* Modals */}
      <UploadMindsetModal isOpen={showMindsetUpload} onClose={() => setShowMindsetUpload(false)} />
      
      {/* 0. Unified Mentor Message Card (Replaces Broadcast & Daily Brief Hero) */}
      <UnifiedMentorMessageCard 
          broadcasts={broadcasts} 
          currentUser={currentUser} 
          onAddBroadcast={addBroadcast} 
      />

      {/* 1. Daily Mindset & News Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="vision-glass p-6 rounded-[26px] border border-white/10 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-bold text-zinc-900 dark:text-white mb-1 flex items-center gap-2">
                        <Play className="w-4 h-4 text-red-500 fill-current" />
                        Daily Mindset
                    </h3>
                    <p className="text-zinc-500 dark:text-white/50 text-xs font-medium">Current active video.</p>
                </div>
                </div>
                <div className="aspect-video rounded-[20px] overflow-hidden bg-black/50 border border-white/10 relative group cursor-pointer shadow-lg">
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

        <NextNewsWidget />
      </div>

      {/* 2. Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
        <QuickActionBtn icon={Video} label="Mindset Video" onClick={() => setShowMindsetUpload(true)} />
        <QuickActionBtn icon={Layers} label="Add Resource" onClick={() => onNavigate('library')} />
      </div>

      {/* 3. Student Snapshot */}
      <div className="space-y-8">
        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-8 border-b border-zinc-200 dark:border-white/5">
            <MetricItem label="Total Students" value={students.length} />
            <MetricItem label="Avg XP" value={1240} />
            <MetricItem label="Protocol %" value="88%" highlight />
            <MetricItem label="Violations" value={12} warn />
        </div>

        {/* Student List */}
        <div className="space-y-2">
            <h3 className="text-xs font-bold text-zinc-400 dark:text-white/30 uppercase tracking-widest mb-4 pl-1">Recent Activity</h3>
            {students.slice(0, 3).map(student => (
                <StudentRow key={student.id} student={student} />
            ))}
        </div>

        <button className="w-full py-4 rounded-xl border border-zinc-200 dark:border-white/5 text-xs font-bold text-zinc-400 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-all uppercase tracking-widest">
            View Full Roster
        </button>
      </div>

    </div>
  );
};
