import React, { createContext, useContext, useState, useEffect, useRef, Suspense, lazy, useMemo, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { Role, User, Announcement, Session, ChatGroup, GroupMessage, GroupPermission, JournalEntry, ChatSession, ChatMessage, TradeLog, Strategy, LibraryModule, LibraryResource, Broadcast, BroadcastTag, TradeSetup, TradeResult } from './types';
import { MOCK_USERS, INITIAL_ANNOUNCEMENTS, LIBRARY_SESSIONS, INITIAL_GROUPS, INITIAL_MESSAGES, YOUTUBE_PLAYLISTS, INITIAL_MODULES, INITIAL_RESOURCES, INITIAL_SETUPS, INITIAL_RESULTS } from './constants';
import { Button, ToastNotification } from './components/Shared';
import { LayoutDashboard, Activity, Brain, LogOut, Phone, VideoOff, Lock, Volume2, Mic, Video, MicOff, PhoneIncoming, MessageSquare, ChevronRight, Zap, Sun, Moon, Menu, User as UserIcon, X, FolderOpen, Layers } from 'lucide-react';
import { MentorChatWidget } from './components/MentorChatWidget';

// Lazy Load Large Components
const MentorDashboard = lazy(() => import('./components/MentorDashboard').then(module => ({ default: module.MentorDashboard })));
const StudentDashboard = lazy(() => import('./components/StudentDashboard').then(module => ({ default: module.StudentDashboard })));
const Habits = lazy(() => import('./components/Habits').then(module => ({ default: module.Habits })));
const ChatSystem = lazy(() => import('./components/ChatSystem').then(module => ({ default: module.ChatSystem })));
const Settings = lazy(() => import('./components/Settings').then(module => ({ default: module.Settings })));
const Library = lazy(() => import('./components/Library').then(module => ({ default: module.Library })));

const PageLoader = () => (
  <div className="flex items-center justify-center h-full w-full min-h-[50vh]">
    <div className="w-8 h-8 border-2 border-zinc-200 dark:border-white/10 border-t-accent rounded-full animate-spin"></div>
  </div>
);

// --- Global State ---
interface AppState {
  currentUser: User | null;
  login: (email: string, password: string, role: Role, name?: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;

  theme: 'light' | 'dark';
  toggleTheme: () => void;

  isContentProtectionEnabled: boolean;
  toggleContentProtection: () => void;

  dailyMindsetUrl: string;
  dailyMindsetThumbnail?: string;
  updateDailyMindset: (url: string, thumbnail?: string) => void;

  announcements: Announcement[];
  addAnnouncement: (a: Partial<Announcement>) => void;

  broadcasts: Broadcast[];
  addBroadcast: (title: string, message: string, tag: BroadcastTag, scheduledFor?: Date) => void;

  notification: { title: string; message: string } | null;
  showNotification: (title: string, message: string) => void;

  users: User[];
  addUser: (name: string) => void;
  removeUser: (id: string) => void;
  library: Session[];

  chatGroups: ChatGroup[];
  chatMessages: GroupMessage[];
  createGroup: (name: string, description: string, type: GroupPermission, icon: string) => void;
  sendMessage: (groupId: string, content: string, type: 'TEXT' | 'IMAGE' | 'VOICE', replyToId?: string) => void;
  deleteMessage: (messageId: string) => void;
  editMessage: (messageId: string, newContent: string) => void;
  pinMessage: (groupId: string, messageId: string) => void;
  muteGroup: (groupId: string) => void;
  toggleReaction: (messageId: string, emoji: string) => void;

  // New Structured Community Data
  tradeSetups: TradeSetup[];
  tradeResults: TradeResult[];
  addTradeSetup: (setup: TradeSetup) => void;
  addTradeResult: (result: TradeResult) => void;

  journalEntries: JournalEntry[];
  upsertJournalEntry: (entry: Partial<JournalEntry>) => void;
  deleteJournalEntry: (id: string) => void;

  tradeLogs: TradeLog[];
  addTradeLog: (trade: TradeLog) => void;
  deleteTradeLog: (id: string) => void;

  strategies: Strategy[];
  addStrategy: (strategy: Strategy) => void;
  deleteStrategy: (id: string) => void;

  chatSessions: ChatSession[];
  currentSessionId: string | null;
  createNewSession: () => void;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  updateSessionMessages: (sessionId: string, messages: ChatMessage[]) => void;

  // Library
  libraryModules: LibraryModule[];
  libraryResources: LibraryResource[];
  addResource: (res: LibraryResource) => void;
  deleteResource: (id: string) => void;
  markResourceComplete: (id: string) => void;
  updateResourceProgress: (id: string, progress: number) => void;
  addLibraryModule: (title: string, description: string) => void;
  deleteLibraryModule: (id: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const useAppState = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppState must be used within AppStateProvider');
  return context;
};

// --- Main Layout ---
const Sidebar: React.FC<{ currentTab: string; setTab: (t: string) => void; user: User }> = ({ currentTab, setTab, user }) => {
  const { logout, theme } = useAppState();

  const MENUS = [
    { id: 'dashboard', label: 'Hub', icon: LayoutDashboard },
    { id: 'library', label: 'Library', icon: Layers },
    { id: 'habits', label: 'Protocol', icon: Zap },
    { id: 'community', label: 'Comms', icon: MessageSquare },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  const visibleMenus = MENUS;

  return (
    <div className="h-screen flex flex-col fixed left-0 top-0 z-30 hidden md:flex bg-white/80 dark:bg-[#05020a]/60 backdrop-blur-xl border-r border-zinc-200 dark:border-white/5 transition-all duration-300 w-20 xl:w-64">
      <div className="p-6 md:p-4 xl:p-8 flex items-center justify-center xl:justify-start shrink-0">
        <div className="flex items-center gap-3 text-zinc-900 dark:text-white font-black text-2xl tracking-tighter select-none">
          <div className="w-10 h-10 bg-zinc-100 dark:bg-white/5 rounded-2xl flex items-center justify-center border border-zinc-200 dark:border-white/10 shadow-[0_0_20px_rgba(168,85,247,0.15)] shrink-0">
            <Lock className="w-5 h-5 text-accent" />
          </div>
          <span className="hidden xl:block">LOCK<span className="text-accent">IN</span></span>
        </div>
      </div>

      <nav className="flex-1 px-2 xl:px-4 flex flex-col justify-evenly py-4">
        {visibleMenus.map(menu => (
          <button
            key={menu.id}
            onClick={() => setTab(menu.id)}
            className={`w-full flex items-center justify-center xl:justify-between px-0 xl:px-4 py-3 xl:py-4 rounded-[20px] text-sm font-bold transition-all group duration-300 relative ${currentTab === menu.id
              ? 'bg-accent/10 text-white border border-accent/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
              : 'text-zinc-500 dark:text-white/50 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5'
              }`}
            title={menu.label}
          >
            <div className="flex items-center gap-4">
              <menu.icon className={`w-5 h-5 transition-colors duration-300 ${currentTab === menu.id ? 'text-accent drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'text-zinc-400 dark:text-white/40 group-hover:text-zinc-900 dark:group-hover:text-white'}`} />
              <span className="hidden xl:block">{menu.label}</span>
            </div>
            {currentTab === menu.id && <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_10px_#A855F7] animate-pulse hidden xl:block"></div>}
          </button>
        ))}
      </nav>

      <div className="p-2 xl:p-4 mx-2 xl:mx-4 mb-6 rounded-[24px] bg-white/50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 group relative shrink-0">
        <div className="flex items-center justify-center xl:justify-start gap-3 mb-0 xl:mb-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setTab('profile')}>
          <div className="relative shrink-0">
            <img src={user.avatar} className="w-8 h-8 xl:w-10 xl:h-10 rounded-full border-2 border-white/20 dark:border-white/10 object-cover" alt="avatar" />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 xl:w-3 xl:h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-black shadow-lg"></div>
          </div>
          <div className="overflow-hidden hidden xl:block">
            <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{user.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-[9px] text-zinc-500 dark:text-white/40 uppercase tracking-wider font-mono">{user.role}</p>
            </div>
          </div>
        </div>
        <div className="hidden xl:flex gap-2">
          <Button variant="ghost" className="w-full justify-start text-zinc-500 dark:text-white/40 hover:text-red-500 hover:bg-red-500/10 h-9 text-[10px] uppercase tracking-wider transition-colors" onClick={logout} icon={LogOut}>
            Log Out
          </Button>
        </div>
      </div>
    </div>
  );
};

const MobileMenuTrigger: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="fixed bottom-6 left-6 z-50 w-[54px] h-[54px] rounded-full vision-glass flex items-center justify-center md:hidden transition-transform active:scale-90 shadow-[0_0_20px_rgba(168,85,247,0.25)] border border-white/20 hover:bg-white/10"
  >
    <Menu className="w-6 h-6 text-white" />
  </button>
);

const MobileSideMenu: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  setTab: (t: string) => void;
}> = ({ isOpen, onClose, currentTab, setTab }) => {
  const { logout, currentUser } = useAppState();

  const MENUS = [
    { id: 'dashboard', label: 'Hub', icon: LayoutDashboard },
    { id: 'library', label: 'Library', icon: Layers },
    { id: 'habits', label: 'Protocol', icon: Zap },
    { id: 'community', label: 'Comms', icon: MessageSquare },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  const visibleMenus = MENUS;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 left-0 bottom-0 z-[70] w-[78%] max-w-[320px] bg-[#0a0510]/95 backdrop-blur-[40px] border-r border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] transform transition-transform duration-300 ease-out md:hidden flex flex-col rounded-r-[22px] overflow-hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div
          className="p-8 pt-12 pb-6 border-b border-white/5 bg-gradient-to-b from-purple-900/10 to-transparent cursor-pointer"
          onClick={() => { setTab('profile'); onClose(); }}
        >
          <div className="flex items-center gap-4 mb-2">
            <img src={currentUser?.avatar} alt="Profile" className="w-12 h-12 rounded-full border-2 border-white/10 object-cover shadow-lg" />
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">{currentUser?.name}</h2>
              <p className="text-xs text-white/40 font-mono">{currentUser?.role}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {visibleMenus.map((menu, index) => {
            const isActive = currentTab === menu.id;
            return (
              <button
                key={menu.id}
                onClick={() => { setTab(menu.id); onClose(); }}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-[18px] transition-all duration-200 border ${isActive
                  ? 'bg-accent/10 border-accent/30 text-white shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                  : 'bg-transparent border-transparent text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <menu.icon className={`w-5 h-5 ${isActive ? 'text-accent' : 'text-white/50'}`} />
                <span className={`text-sm font-bold tracking-wide ${isActive ? 'text-white' : ''}`}>{menu.label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_#A855F7]"></div>}
              </button>
            );
          })}
        </div>

        <div className="p-6 border-t border-white/5 bg-black/20">
          <button
            onClick={() => { logout(); onClose(); }}
            className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-[18px] bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/30 text-white/50 hover:text-red-400 transition-all text-sm font-bold uppercase tracking-wider"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </div>
    </>
  );
};

const FloatingGlassTabBar: React.FC<{
  currentTab: string;
  setTab: (t: string) => void;
  visible: boolean;
}> = ({ currentTab, setTab, visible }) => {
  const tabs = [
    { id: 'dashboard', label: 'Hub', icon: LayoutDashboard },
    { id: 'library', label: 'Library', icon: Layers },
    { id: 'habits', label: 'Protocol', icon: Zap },
    { id: 'community', label: 'Comms', icon: MessageSquare, badge: 3 },
    { id: 'profile', label: 'Profile', icon: UserIcon }
  ];
  const visibleTabs = tabs;

  const positionClass = 'bottom-2';
  const visibilityClass = visible
    ? 'opacity-100 translate-y-0 scale-100'
    : 'opacity-0 translate-y-12 scale-95 pointer-events-none';

  return (
    <div className={`fixed left-1/2 -translate-x-1/2 z-[90] w-[90%] max-w-[380px] md:hidden transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1) ${positionClass} ${visibilityClass} pb-safe-bottom`}>
      <div className="absolute inset-0 vision-glass rounded-[32px] bg-gradient-to-b from-white/10 to-white/5 border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.5)]"></div>
      <div className="absolute inset-0 rounded-[32px] shadow-[0_0_30px_rgba(168,85,247,0.15)] pointer-events-none"></div>
      <div className="relative flex items-center justify-between px-1 h-[56px]">
        {visibleTabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`relative group flex-1 flex flex-col items-center justify-center h-full active:scale-90 transition-transform duration-300 outline-none`}
            >
              <div className={`relative transition-all duration-300 ease-out flex flex-col items-center ${isActive ? 'scale-100 -translate-y-0.5' : 'scale-90 opacity-70'}`}>
                <tab.icon
                  className={`w-[20px] h-[20px] mb-0.5 transition-all duration-300 ${isActive
                    ? 'text-accent drop-shadow-[0_0_12px_rgba(168,85,247,0.8)]'
                    : 'text-[#8E8E93] group-hover:text-white'
                    }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {tab.badge && (
                  <div className="absolute -top-1.5 -right-2.5 bg-[#FF3B30] text-white text-[9px] font-bold h-[14px] min-w-[14px] px-0.5 rounded-full flex items-center justify-center shadow-lg shadow-red-500/40 z-10 animate-in zoom-in duration-300 border border-black/20">
                    {tab.badge}
                  </div>
                )}
              </div>
              <span className={`text-[9px] font-semibold transition-all duration-300 ${isActive ? 'text-white translate-y-0 opacity-100' : 'text-[#8E8E93] opacity-0 -translate-y-1 hidden'
                }`}>
                {tab.label}
              </span>
              {isActive && <div className="absolute -bottom-1 w-1 h-1 bg-accent rounded-full shadow-[0_0_8px_#A855F7]"></div>}
            </button>
          )
        })}
      </div>
    </div>
  );
};

const AuthScreen: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<'mentor' | 'student' | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmationMessage, setShowConfirmationMessage] = useState(false);
  const [showEmailVerified, setShowEmailVerified] = useState(false);
  const [showNoProfile, setShowNoProfile] = useState(false);
  const { login } = useAppState();

  // Check for email verification in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const token = urlParams.get('token');
    
    if (type === 'signup' && token) {
      setShowEmailVerified(true);
      // Set flag to prevent automatic profile fetching
      (window as any).skipAutoProfileFetch = true;
      // Clean URL to remove verification params
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Expose setters to global scope for fetchProfile
  useEffect(() => {
    (window as any).setShowNoProfile = setShowNoProfile;
    return () => {
      delete (window as any).setShowNoProfile;
    };
  }, []);

  const handleRoleClick = (role: 'mentor' | 'student') => {
    setSelectedRole(role);
  };

  const handleBack = () => {
    setSelectedRole(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setShowConfirmationMessage(false);
    setShowEmailVerified(false);
    setShowNoProfile(false);
    // Reset the auto-profile fetch flag when navigating away
    (window as any).skipAutoProfileFetch = false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !selectedRole) return;
    
    if (authMode === 'signup') {
      if (!name) {
        alert('Please enter your name');
        return;
      }
      if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
      }
    }
    
    setIsLoading(true);
    const role = selectedRole === 'mentor' ? Role.MENTOR : Role.STUDENT;
    
    // Reset the auto-profile fetch flag when user explicitly tries to sign in
    (window as any).skipAutoProfileFetch = false;
    
    await login(email, password, role, authMode === 'signup' ? name : undefined);
    setIsLoading(false);
    
    if (authMode === 'signup') {
      setShowConfirmationMessage(true);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-violet-600/10 rounded-full blur-[150px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-sm space-y-10 animate-in zoom-in-95 duration-700 relative z-10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-6 vision-glass rounded-[32px] mb-8 group bg-white/5 border border-white/10">
            <Lock className="w-12 h-12 text-accent drop-shadow-[0_0_30px_rgba(168,85,247,0.6)] group-hover:scale-110 transition-transform duration-500" />
          </div>
          <h1 className="text-5xl font-black text-white mb-3 tracking-tighter drop-shadow-2xl">LOCK<span className="text-accent">IN</span></h1>
          <p className="text-white/40 font-medium text-sm tracking-[0.2em] uppercase">Elite Performance</p>
        </div>

        <div className="space-y-4">
          {showNoProfile ? (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 mx-auto bg-orange-500/20 rounded-full flex items-center justify-center">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl">!</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-white">No Profile Found</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Your account exists but you haven't completed sign-up.<br/>
                  Please sign up to create your profile.
                </p>
                <div className="bg-orange-500/10 rounded-lg p-4 border border-orange-500/20">
                  <p className="text-white/80 text-xs leading-relaxed">
                    <strong>What happened:</strong><br/>
                    Your email was verified but profile creation<br/>
                    was not completed. Sign up below to finish.
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    setShowNoProfile(false);
                    setAuthMode('signup');
                  }}
                  className="w-full vision-glass p-4 rounded-[16px] bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors"
                >
                  Complete Sign Up
                </button>
                <button 
                  onClick={handleBack}
                  className="w-full text-white/60 hover:text-white text-sm transition-colors"
                >
                  ← Back to Role Selection
                </button>
              </div>
            </div>
          ) : showEmailVerified ? (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl">✓</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-white">Email Verified!</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Your account has been successfully verified.<br/>
                  You can now sign in to access your dashboard.
                </p>
                <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                  <p className="text-white/80 text-xs leading-relaxed">
                    <strong>Ready to go!</strong><br/>
                    Your account is active and ready to use.<br/>
                    Click below to sign in and get started.
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    setShowEmailVerified(false);
                    setAuthMode('signin');
                  }}
                  className="w-full vision-glass p-4 rounded-[16px] bg-green-500 text-white font-bold hover:bg-green-600 transition-colors"
                >
                  Sign In Now
                </button>
                <button 
                  onClick={handleBack}
                  className="w-full text-white/60 hover:text-white text-sm transition-colors"
                >
                  ← Back to Role Selection
                </button>
              </div>
            </div>
          ) : selectedRole === null ? (
            <>
              <button onClick={() => handleRoleClick('mentor')} className="group w-full vision-glass hover:bg-white/10 p-6 rounded-[24px] text-left transition-all duration-300 relative overflow-hidden border border-white/10">
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Admin Access</span>
                    <span className="block text-xl font-bold group-hover:text-accent transition-colors text-white">Mentor</span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <ChevronRight className="w-5 h-5 text-white/50 group-hover:text-accent transition-colors" />
                  </div>
                </div>
              </button>

              <button onClick={() => handleRoleClick('student')} className="group w-full vision-glass hover:bg-white/10 p-6 rounded-[24px] text-left transition-all duration-300 relative overflow-hidden border border-white/10">
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Member Access</span>
                    <span className="block text-xl font-bold group-hover:text-accent transition-colors text-white">Student</span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <ChevronRight className="w-5 h-5 text-white/50 group-hover:text-accent transition-colors" />
                  </div>
                </div>
              </button>
            </>
          ) : showConfirmationMessage ? (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 mx-auto bg-accent/20 rounded-full flex items-center justify-center">
                <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl">✓</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-white">Check Your Email</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  We've sent a confirmation email to:<br/>
                  <span className="text-accent font-mono text-xs">{email}</span>
                </p>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-white/80 text-xs leading-relaxed">
                    <strong>Next Steps:</strong><br/>
                    1. Check your inbox (and spam folder)<br/>
                    2. Click the confirmation link<br/>
                    3. Return here to sign in
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    setShowConfirmationMessage(false);
                    setAuthMode('signin');
                  }}
                  className="w-full vision-glass p-4 rounded-[16px] bg-accent text-white font-bold hover:bg-accent/90 transition-colors"
                >
                  Go to Sign In
                </button>
                <button 
                  onClick={handleBack}
                  className="w-full text-white/60 hover:text-white text-sm transition-colors"
                >
                  ← Back to Role Selection
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button onClick={handleBack} className="text-sm text-white/60 hover:text-white transition-colors">Back</button>
                <div className="text-sm text-white/40 uppercase tracking-wider font-mono">{selectedRole === 'mentor' ? 'Admin Access' : 'Member Access'}</div>
              </div>

              {/* Auth Mode Toggle */}
              <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                <button
                  onClick={() => setAuthMode('signin')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    authMode === 'signin'
                      ? 'bg-accent text-white'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setAuthMode('signup')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    authMode === 'signup'
                      ? 'bg-accent text-white'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white outline-none focus:border-accent/50 transition-colors"
                      required
                      disabled={isLoading}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs text-white/40 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white outline-none focus:border-accent/50 transition-colors"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/40 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white outline-none focus:border-accent/50 transition-colors"
                    required
                    minLength={6}
                    disabled={isLoading}
                  />
                </div>

                {authMode === 'signup' && (
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white outline-none focus:border-accent/50 transition-colors"
                      required
                      minLength={6}
                      disabled={isLoading}
                    />
                  </div>
                )}

                <div>
                  <button 
                    type="submit" 
                    className="w-full vision-glass p-4 rounded-[16px] bg-accent text-white font-bold hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                        {authMode === 'signin' ? 'Signing In...' : 'Creating Account...'}
                      </span>
                    ) : (
                      authMode === 'signin' ? 'Sign In' : 'Sign Up'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { currentUser, chatGroups, chatMessages, sendMessage, deleteMessage, editMessage, pinMessage, muteGroup, toggleReaction, theme, toggleTheme, users, notification, showNotification, tradeSetups, tradeResults, addTradeSetup, addTradeResult, createGroup } = useAppState();
  const [currentTab, setTab] = useState('dashboard');
  const [habitsInitialTab, setHabitsInitialTab] = useState<'LIFE' | 'TRADING' | 'FOCUS'>('LIFE');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef(0);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    setIsTabBarVisible(true);
  }, [currentTab]);

  const handleScrollDirection = (direction: 'up' | 'down') => {
    setIsTabBarVisible(direction === 'up');
  };

  const onMainScroll = () => {
    if (!mainScrollRef.current) return;
    const currentScrollTop = mainScrollRef.current.scrollTop;
    const delta = currentScrollTop - lastScrollTopRef.current;
    if (Math.abs(delta) > 10) {
      handleScrollDirection(delta > 0 ? 'down' : 'up');
      lastScrollTopRef.current = currentScrollTop;
    }
  };

  const handleNavigate = useCallback((tab: string) => {
    if (tab === 'habits-trading') {
      setHabitsInitialTab('TRADING');
      setTab('habits');
    } else {
      if (tab === 'habits') setHabitsInitialTab('LIFE');
      setTab(tab);
    }
  }, []);

  if (!currentUser) return <AuthScreen />;

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-white font-sans selection:bg-accent/30 relative transition-colors duration-300 flex flex-col">
      {/* Background Gradient is handled in global CSS now for deeper impact */}

      <Sidebar currentTab={currentTab} setTab={handleNavigate} user={currentUser} />

      <div className="md:ml-20 xl:ml-64 min-h-screen relative z-10 flex flex-col">
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-[#020202]/30 border-b border-zinc-200 dark:border-white/5 px-6 h-[72px] flex items-center justify-between backdrop-blur-xl transition-colors duration-300">
          <div className="md:hidden flex items-center gap-2 font-black tracking-tight text-lg text-zinc-900 dark:text-white">
            <Lock className="w-5 h-5 text-accent" />
            LOCK-IN
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm font-mono tracking-tight">
            <span className="text-zinc-400 dark:text-white/30">APP</span>
            <span className="text-zinc-300 dark:text-white/20">/</span>
            <span className="text-zinc-800 dark:text-white font-bold uppercase tracking-widest">{currentTab.replace('-', ' ')}</span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <div className="w-px h-4 bg-zinc-300 dark:bg-white/10 hidden md:block"></div>
            <div className="hidden md:flex items-center gap-3">
              <span className="text-xs font-mono text-zinc-500 dark:text-white/50">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </header>

        {/* Optimized Main Container: Locks height for Comms to prevent double scrollbars */}
        <main
          ref={mainScrollRef}
          onScroll={onMainScroll}
          className={`p-2 md:p-4 xl:p-8 max-w-7xl mx-auto w-full flex-1 ${currentTab === 'community'
            ? 'h-[calc(100dvh-72px)] overflow-hidden pb-0'
            : 'overflow-y-auto custom-scrollbar pb-32 md:pb-8'
            }`}
        >
          <Suspense fallback={<PageLoader />}>
            {currentTab === 'dashboard' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500">
                {currentUser.role === Role.MENTOR && <MentorDashboard onNavigate={handleNavigate} />}
                {currentUser.role === Role.STUDENT && <StudentDashboard onJoinSession={() => { }} onNavigate={handleNavigate} />}
              </div>
            )}
            {currentTab === 'library' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500">
                <Library />
              </div>
            )}
            {currentTab === 'habits' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500">
                <Habits initialTab={habitsInitialTab} />
              </div>
            )}
            {currentTab === 'community' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500 h-full">
                <ChatSystem
                  currentUser={currentUser}
                  groups={chatGroups}
                  messages={chatMessages}
                  setups={tradeSetups}
                  results={tradeResults}
                  onSendMessage={sendMessage}
                  onDeleteMessage={deleteMessage}
                  onEditMessage={editMessage}
                  onPinMessage={pinMessage}
                  onMuteGroup={muteGroup}
                  onToggleReaction={toggleReaction}
                  onAddSetup={addTradeSetup}
                  onAddResult={addTradeResult}
                  onCreateGroup={createGroup}
                  onScrollDirectionChange={handleScrollDirection}
                />
              </div>
            )}
            {currentTab === 'profile' && (
              <Settings />
            )}
          </Suspense>
        </main>
      </div>

      {/* Floating Mentor AI Widget - Only on Hub (Dashboard) */}
      {currentTab === 'dashboard' && <MentorChatWidget />}

      <FloatingGlassTabBar currentTab={currentTab} setTab={handleNavigate} visible={isTabBarVisible} />

      <MobileSideMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        currentTab={currentTab}
        setTab={handleNavigate}
      />

      {!isMobileMenuOpen && (
        <div className="md:hidden">
          <MobileMenuTrigger onClick={() => setIsMobileMenuOpen(true)} />
        </div>
      )}

      {/* Overlays... */}
      {notification && (
        <ToastNotification
          title={notification.title}
          message={notification.message}
          onClose={() => showNotification('', '')} // Just clears it, logic in App.tsx handles actual state clear
        />
      )}
    </div>
  );
};

const App = () => {
  // User & Theme
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isContentProtectionEnabled, setContentProtection] = useState(true);

  // Data
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [announcements, setAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [notification, setNotification] = useState<{ title: string; message: string } | null>(null);

  // Chat
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>(INITIAL_GROUPS);
  const [chatMessages, setChatMessages] = useState<GroupMessage[]>(INITIAL_MESSAGES);

  // Trading Community
  const [tradeSetups, setTradeSetups] = useState<TradeSetup[]>(INITIAL_SETUPS);
  const [tradeResults, setTradeResults] = useState<TradeResult[]>(INITIAL_RESULTS);

  // Personal
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);

  // AI Chat
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Library
  const [libraryModules, setLibraryModules] = useState<LibraryModule[]>(INITIAL_MODULES);
  const [libraryResources, setLibraryResources] = useState<LibraryResource[]>(INITIAL_RESOURCES);

  // Daily Mindset
  const [dailyMindsetUrl, setDailyMindsetUrl] = useState<string>('https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4');
  const [dailyMindsetThumbnail, setDailyMindsetThumbnail] = useState<string | undefined>(undefined);

  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store selected role for listener to use during signup
  const selectedRoleRef = useRef<Role | null>(null);

  // SUPABASE AUTH PERSISTENCE & PROFILE SYNC
  useEffect(() => {
    // 1. Handle Initial Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !(window as any).skipAutoProfileFetch) {
        fetchProfile(session.user.id);
      }
    });

    // 2. Listen for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !(window as any).skipAutoProfileFetch) {
        fetchProfile(session.user.id);
      } else if (!session) {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // DATA SYNC LOGIC
  useEffect(() => {
    if (!currentUser) return;

    // 1. Fetch initial Chat Groups
    supabase.from('chat_groups').select('*').then(({ data }) => {
      if (data) setChatGroups(data as any);
    });

    // 2. Fetch initial Messages
    supabase.from('group_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setChatMessages(data.map(m => ({
            id: m.id,
            groupId: m.group_id,
            senderId: m.sender_id,
            senderName: m.sender_name || 'User', // We might need to join with profiles or store sender info
            senderAvatar: m.sender_avatar,
            senderRole: m.sender_role as Role,
            type: m.type as any,
            content: m.content,
            timestamp: new Date(m.created_at),
            replyToId: m.reply_to_id
          })));
        }
      });

    // 3. Real-time Message Listener
    const channel = supabase.channel('realtime_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages' }, (payload) => {
        const newMessage = payload.new as any;
        setChatMessages(prev => [...prev, {
          id: newMessage.id,
          groupId: newMessage.group_id,
          senderId: newMessage.sender_id,
          senderName: newMessage.sender_name || 'User',
          senderAvatar: newMessage.sender_avatar,
          senderRole: newMessage.sender_role as Role,
          type: newMessage.type as any,
          content: newMessage.content,
          timestamp: new Date(newMessage.created_at),
          replyToId: newMessage.reply_to_id
        }]);
      })
      .subscribe();

    // 4. Fetch initial Trade Logs
    supabase.from('trade_logs')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('date', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setTradeLogs(data.map(t => ({
            id: t.id,
            userId: t.user_id,
            pair: t.pair,
            direction: t.direction as any,
            session: t.session as any,
            outcome: t.outcome as any,
            rr: Number(t.rr),
            riskLoad: Number(t.risk_load),
            setupRR: t.setup_rr ? Number(t.setup_rr) : undefined,
            pnl: t.pnl ? Number(t.pnl) : undefined,
            entryPrice: t.entry_price ? Number(t.entry_price) : undefined,
            exitPrice: t.exit_price ? Number(t.exit_price) : undefined,
            lotSize: t.lot_size ? Number(t.lot_size) : undefined,
            strategyId: t.strategy_id,
            tags: t.tags || [],
            notes: t.notes || '',
            date: t.date,
            screenshot: t.screenshot,
            setupImages: t.setup_images || []
          })));
        }
      });

    // 5. Fetch initial Habits (for current date)
    const today = new Date().toISOString().split('T')[0];
    supabase.from('habits')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('date', today)
      .then(({ data }) => {
        // This might need a different state structure if we want to support habit defs
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('Profile fetch result:', { data, error });

      if (error && error.code === 'PGRST116') {
        console.log('Profile not found, attempting to create from auth metadata');
        // Profile doesn't exist - try to create it from auth metadata
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Auth user metadata:', user?.user_metadata);
        
        if (user?.user_metadata?.name && user?.user_metadata?.role) {
          // Try to create profile directly
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              name: user.user_metadata.name,
              role: user.user_metadata.role,
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_metadata.name)}&background=7c3aed&color=fff`,
            });
          
          console.log('Profile creation result:', insertError);
          
          if (!insertError) {
            // Profile created successfully, fetch it
            const { data: newProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();
            
            if (newProfile) {
              setCurrentUser({
                id: newProfile.id,
                name: newProfile.name,
                email: user.email,
                role: newProfile.role as Role,
                avatar: newProfile.avatar || `https://ui-avatars.com/api/?name=${newProfile.name}&background=7c3aed&color=fff`,
                points: newProfile.points
              });
              return;
            }
          }
        }
        
        // If we get here, profile creation failed - show "no profile" screen
        (window as any).setShowNoProfile?.(true);
        return;
      }

      if (error && error.code === '42501') {
        console.log('RLS policy violation, attempting to create from auth metadata');
        // RLS policy violation - try the same approach
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Auth user metadata for RLS error:', user?.user_metadata);
        
        if (user?.user_metadata?.name && user?.user_metadata?.role) {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              name: user.user_metadata.name,
              role: user.user_metadata.role,
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_metadata.name)}&background=7c3aed&color=fff`,
            });
          
          console.log('Profile creation result for RLS:', insertError);
          
          if (!insertError) {
            const { data: newProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();
            
            if (newProfile) {
              setCurrentUser({
                id: newProfile.id,
                name: newProfile.name,
                email: user.email,
                role: newProfile.role as Role,
                avatar: newProfile.avatar || `https://ui-avatars.com/api/?name=${newProfile.name}&background=7c3aed&color=fff`,
                points: newProfile.points
              });
              return;
            }
          }
        }
        
        (window as any).setShowNoProfile?.(true);
        return;
      }

      // Handle 406 Not Acceptable and other errors
      if (error) {
        console.log('Other profile fetch error:', error);
        // Try to create from auth metadata as fallback
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.name && user?.user_metadata?.role) {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              name: user.user_metadata.name,
              role: user.user_metadata.role,
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_metadata.name)}&background=7c3aed&color=fff`,
            });
          
          if (!insertError) {
            const { data: newProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();
            
            if (newProfile) {
              setCurrentUser({
                id: newProfile.id,
                name: newProfile.name,
                email: user.email,
                role: newProfile.role as Role,
                avatar: newProfile.avatar || `https://ui-avatars.com/api/?name=${newProfile.name}&background=7c3aed&color=fff`,
                points: newProfile.points
              });
              return;
            }
          }
        }
        
        (window as any).setShowNoProfile?.(true);
        return;
      }
      
      if (data) {
        console.log('Profile found successfully:', data);
        setCurrentUser({
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role as Role,
          avatar: data.avatar || `https://ui-avatars.com/api/?name=${data.name}&background=7c3aed&color=fff`,
          points: data.points
        });
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
      // If it's a profile access error, try to create from auth metadata
      if (typeof e === 'object' && e && 'code' in e && (e.code === '42501' || e.code === 'PGRST116')) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.name && user?.user_metadata?.role) {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              name: user.user_metadata.name,
              role: user.user_metadata.role,
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_metadata.name)}&background=7c3aed&color=fff`,
            });
          
          if (!insertError) {
            const { data: newProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();
            
            if (newProfile) {
              setCurrentUser({
                id: newProfile.id,
                name: newProfile.name,
                email: user.email,
                role: newProfile.role as Role,
                avatar: newProfile.avatar || `https://ui-avatars.com/api/?name=${newProfile.name}&background=7c3aed&color=fff`,
                points: newProfile.points
              });
              return;
            }
        }
        
        (window as any).setShowNoProfile?.(true);
        return;
      }
    }
  };

  // Methods
  const login = async (email: string, password: string, role: Role, name?: string) => {
    selectedRoleRef.current = role;

    try {
      if (name) {
        // Sign Up flow
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
              role: role,
            }
          }
        });

        if (signUpError) throw signUpError;

        showNotification('📧 Check Your Email', 'Please check your inbox (and spam folder) for the confirmation email. Click the link to verify your account, then sign in.');
        return; // Don't try to create profile yet - wait for email verification
      } else {
        // Sign In flow
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;
        
        showNotification('Welcome back', 'Session started');
      }
    } catch (error: any) {
      console.error('Login Error:', error);
      showNotification('Auth Error', error.message || 'Failed to authenticate');
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    showNotification('Logged Out', 'Session ended.');
  };

  const updateUser = (updates: Partial<User>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
    setUsers(users.map(u => u.id === updated.id ? updated : u));
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const toggleContentProtection = () => setContentProtection(prev => !prev);

  const updateDailyMindset = (url: string, thumbnail?: string) => {
    setDailyMindsetUrl(url);
    if (thumbnail) setDailyMindsetThumbnail(thumbnail);
  };

  const addAnnouncement = (a: Partial<Announcement>) => {
    const newA: Announcement = {
      id: Date.now().toString(),
      title: a.title || 'New Announcement',
      content: a.content || '',
      timestamp: new Date(),
      author: currentUser?.name || 'System'
    };
    setAnnouncements(prev => [newA, ...prev]);
  };

  const addBroadcast = (title: string, message: string, tag: BroadcastTag, scheduledFor?: Date) => {
    const newB: Broadcast = {
      id: Date.now().toString(),
      title,
      message,
      tag,
      timestamp: new Date(),
      isScheduled: !!scheduledFor,
      scheduledFor
    };
    setBroadcasts(prev => [newB, ...prev]);
  };

  const showNotification = (title: string, message: string) => {
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);

    if (!title && !message) {
      setNotification(null);
      return;
    }
    setNotification({ title, message });
    const timer = setTimeout(() => setNotification(null), 5000);
    notificationTimerRef.current = timer;
  };

  const addUser = (name: string) => {
    const newUser: User = { id: Date.now().toString(), name, role: Role.STUDENT, avatar: 'https://picsum.photos/200' };
    setUsers(prev => [...prev, newUser]);
  };

  const removeUser = (id: string) => setUsers(prev => prev.filter(u => u.id !== id));

  const createGroup = (name: string, description: string, type: GroupPermission, icon: string) => {
    const newGroup: ChatGroup = {
      id: Date.now().toString(),
      name,
      description,
      type,
      icon,
      mutedBy: [],
      pinnedMessageIds: []
    };
    setChatGroups(prev => [...prev, newGroup]);
  };

  const sendMessage = async (groupId: string, content: string, type: 'TEXT' | 'IMAGE' | 'VOICE', replyToId?: string) => {
    if (!currentUser) return;

    // Optimistic Update (Optional, but let's do direct for now to ensure sync)
    const { error } = await supabase.from('group_messages').insert({
      group_id: groupId,
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      sender_avatar: currentUser.avatar,
      sender_role: currentUser.role,
      type,
      content,
      reply_to_id: replyToId
    });

    if (error) {
      console.error('Error sending message:', error);
      showNotification('Error', 'Failed to send message');
    }
  };

  const deleteMessage = (messageId: string) => setChatMessages(prev => prev.filter(m => m.id !== messageId));
  const editMessage = (messageId: string, newContent: string) => setChatMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: newContent } : m));
  const pinMessage = (groupId: string, messageId: string) => {
    setChatGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const isPinned = g.pinnedMessageIds.includes(messageId);
      return {
        ...g,
        pinnedMessageIds: isPinned ? g.pinnedMessageIds.filter(id => id !== messageId) : [...g.pinnedMessageIds, messageId]
      };
    }));
  };
  const muteGroup = (groupId: string) => { }; // Simplified
  const toggleReaction = (messageId: string, emoji: string) => {
    setChatMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const reactions = m.reactions || {};
      const users = reactions[emoji] || [];
      const hasReacted = currentUser && users.includes(currentUser.id);

      if (hasReacted) {
        reactions[emoji] = users.filter(u => u !== currentUser?.id);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else if (currentUser) {
        reactions[emoji] = [...users, currentUser.id];
      }
      return { ...m, reactions: { ...reactions } };
    }));
  };

  const addTradeSetup = (setup: TradeSetup) => setTradeSetups(prev => [setup, ...prev]);
  const addTradeResult = (result: TradeResult) => setTradeResults(prev => [result, ...prev]);

  const upsertJournalEntry = (entry: Partial<JournalEntry>) => {
    if (entry.id) {
      setJournalEntries(prev => prev.map(e => e.id === entry.id ? { ...e, ...entry } : e));
    } else if (currentUser) {
      const newEntry: JournalEntry = {
        id: Date.now().toString(),
        userId: currentUser.id,
        date: new Date().toISOString().split('T')[0],
        content: '',
        mood: null,
        tags: [],
        imageUrls: [],
        ...entry
      };
      setJournalEntries(prev => [newEntry, ...prev]);
    }
  };
  const deleteJournalEntry = (id: string) => setJournalEntries(prev => prev.filter(e => e.id !== id));

  const addTradeLog = async (trade: TradeLog) => {
    if (!currentUser) return;

    // 1. Insert into Supabase
    const { data, error } = await supabase.from('trade_logs').insert({
      user_id: currentUser.id,
      pair: trade.pair,
      direction: trade.direction,
      session: trade.session,
      outcome: trade.outcome,
      rr: trade.rr,
      risk_load: trade.riskLoad,
      setup_rr: trade.setupRR,
      pnl: trade.pnl,
      entry_price: trade.entryPrice,
      exit_price: trade.exitPrice,
      lot_size: trade.lotSize,
      strategy_id: trade.strategyId,
      tags: trade.tags,
      notes: trade.notes,
      date: trade.date,
      screenshot: trade.screenshot,
      setup_images: trade.setupImages
    }).select().single();

    if (error) {
      console.error('Error adding trade log:', error);
      showNotification('Error', 'Failed to save trade');
    } else if (data) {
      // 2. Update local state
      setTradeLogs(prev => [trade, ...prev]);
      showNotification('Success', 'Trade logged securely');
    }
  };
  const deleteTradeLog = (id: string) => setTradeLogs(prev => prev.filter(t => t.id !== id));

  const addStrategy = (strategy: Strategy) => setStrategies(prev => [...prev, strategy]);
  const deleteStrategy = (id: string) => setStrategies(prev => prev.filter(s => s.id !== id));

  // Render-level visibility: students see only their own personal data
  const visibleJournalEntries = currentUser
    ? journalEntries.filter(e => e.userId === currentUser.id)
    : [];

  // STRICT ISOLATION: Filter by currentUser.id for ALL roles
  const visibleTradeLogs = currentUser
    ? tradeLogs.filter(t => t.userId === currentUser.id)
    : [];

  const visibleStrategies = currentUser
    ? strategies.filter(s => s.userId === currentUser.id)
    : [];

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      updatedAt: new Date()
    };
    setChatSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const switchSession = (sessionId: string) => setCurrentSessionId(sessionId);
  const deleteSession = (sessionId: string) => {
    setChatSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) setCurrentSessionId(null);
  };
  const updateSessionMessages = (sessionId: string, messages: ChatMessage[]) => {
    setChatSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      // Update title if first message
      let title = s.title;
      if (messages.length > 0 && s.title === 'New Chat') {
        title = messages[0].text.slice(0, 30) || 'New Chat';
      }
      return { ...s, messages, title, updatedAt: new Date() };
    }));
  };

  const addResource = (res: LibraryResource) => setLibraryResources(prev => [...prev, res]);
  const deleteResource = (id: string) => setLibraryResources(prev => prev.filter(r => r.id !== id));
  const markResourceComplete = (id: string) => setLibraryResources(prev => prev.map(r => r.id === id ? { ...r, isCompleted: !r.isCompleted } : r));
  const updateResourceProgress = (id: string, progress: number) => setLibraryResources(prev => prev.map(r => r.id === id ? { ...r, progress } : r));

  const addLibraryModule = (title: string, description: string) => {
    const newMod: LibraryModule = { id: Date.now().toString(), title, description, order: libraryModules.length + 1 };
    setLibraryModules(prev => [...prev, newMod]);
  };
  const deleteLibraryModule = (id: string) => setLibraryModules(prev => prev.filter(m => m.id !== id));

  const appState: AppState = {
    currentUser, login, logout, updateUser,
    theme, toggleTheme,
    isContentProtectionEnabled, toggleContentProtection,
    dailyMindsetUrl, dailyMindsetThumbnail, updateDailyMindset,
    announcements, addAnnouncement,
    broadcasts, addBroadcast,
    notification, showNotification,
    users, addUser, removeUser,
    library: LIBRARY_SESSIONS,
    chatGroups, chatMessages, createGroup, sendMessage, deleteMessage, editMessage, pinMessage, muteGroup, toggleReaction,
    tradeSetups, tradeResults, addTradeSetup, addTradeResult,
    journalEntries: visibleJournalEntries, upsertJournalEntry, deleteJournalEntry,
    tradeLogs: visibleTradeLogs, addTradeLog, deleteTradeLog,
    strategies: visibleStrategies, addStrategy, deleteStrategy,
    chatSessions, currentSessionId, createNewSession, switchSession, deleteSession, updateSessionMessages,
    libraryModules, libraryResources, addResource, deleteResource, markResourceComplete, updateResourceProgress, addLibraryModule, deleteLibraryModule
  };

  return (
    <AppContext.Provider value={appState}>
      <AppContent />
    </AppContext.Provider>
  );
};

export default App;
