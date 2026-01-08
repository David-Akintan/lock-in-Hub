

export enum Role {
  MENTOR = 'MENTOR',
  STUDENT = 'STUDENT',
}

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
  email?: string;
  bio?: string;
  location?: string;
  language?: string;
  points?: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  timestamp: Date;
  author: string;
}

export type BroadcastTag = 'Alert' | 'Mindset' | 'Trading' | 'Schedule';

export interface Broadcast {
  id: string;
  title?: string; // Added title for headline
  message: string;
  tag: BroadcastTag;
  timestamp: Date;
  isScheduled?: boolean;
  scheduledFor?: Date;
}

export interface Session {
  id: string;
  title: string;
  type: 'BACKTESTING' | 'SCALPING_CALL' | 'LESSON';
  date: string;
  duration: string;
  thumbnail: string;
  url?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string;
  audio?: string;
  timestamp: Date;
}

export interface Habit {
  id: string;
  name: string;
  completed: boolean;
  category: 'SPIRITUAL' | 'DISCIPLINE' | 'FITNESS';
}

export interface ProgressLog {
  id: string;
  type: 'GYM' | 'TRADING';
  imageUrl: string;
  date: string;
  caption: string;
}

export interface Strategy {
  id: string;
  userId: string;
  name: string;
  description?: string;
  rules?: string[];
  winRate?: number;
}

export interface TradeLog {
  id: string;
  userId: string;
  pair: string;
  direction: 'LONG' | 'SHORT';
  session: 'LONDON' | 'NY' | 'ASIA';
  outcome: 'WIN' | 'LOSS' | 'BE' | 'OPEN';

  // -- The Risk Load Model --
  rr: number;         // Final Realized Net R (e.g., +6.0 or -2.0)
  riskLoad: number;   // The Multiplier (Default 1.0)
  setupRR?: number;   // The Technical Target (e.g., 3.0)

  pnl?: number;
  entryPrice?: number;
  exitPrice?: number;
  lotSize?: number;
  strategyId?: string;
  tags?: string[];
  notes?: string;
  date: string;
  screenshot?: string; // For verification (Base64)
  setupImages?: string[]; // For analysis (Base64 array)
}

export type GroupPermission = 'ANNOUNCEMENT' | 'PUBLIC' | 'PRIVATE';

export interface ChatGroup {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: GroupPermission;
  mutedBy: string[];
  pinnedMessageIds: string[];
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderRole: Role;
  type: 'TEXT' | 'IMAGE' | 'VOICE';
  content: string;
  timestamp: Date;
  isPinned?: boolean;
  replyToId?: string;
  reactions?: Record<string, string[]>;
}

// --- NEW COMMUNITY STRUCTURE TYPES ---

export interface TradeSetup {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  authorAvatar: string;
  pair: string;
  direction: 'LONG' | 'SHORT';
  status: 'PENDING' | 'ACTIVE' | 'INVALIDATED' | 'CLOSED';
  analysis: string;
  image?: string;
  timestamp: Date;
  likes: number;
}

export interface TradeResult {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  pair: string;
  outcome: 'WIN' | 'LOSS' | 'BE';
  rr: number;
  image?: string;
  reflection: string;
  timestamp: Date;
}

export interface LibraryModule {
  id: string;
  title: string;
  description: string;
  order: number;
}

export type ResourceType = 'VIDEO' | 'PDF' | 'LINK';

export interface LibraryResource {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  type: ResourceType;
  url: string;
  thumbnail?: string;
  duration?: string;
  isCompleted: boolean;
  progress?: number;
  isLocked?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: Date;
}

export type JournalMood = 'On Fire' | 'Good' | 'Meh' | 'Off' | null;

export interface JournalEntry {
  id: string;
  userId: string;
  date: string;
  content: string;
  mood: JournalMood;
  tags: string[];
  imageUrls: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface NewsEvent {
  title: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  time: string; // HH:mm format (24h)
  currency: string;
}
