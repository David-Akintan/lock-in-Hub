-- SUPABASE SCHEMA FOR LOCK-IN HUB

-- 1. Profiles (Linked to Auth)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT CHECK (role IN ('MENTOR', 'STUDENT')) NOT NULL,
    avatar TEXT,
    points INTEGER DEFAULT 0,
    bio TEXT,
    location TEXT,
    language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Function to create user profile (bypasses RLS)
CREATE OR REPLACE FUNCTION create_user_profile(
    user_id UUID,
    user_name TEXT,
    user_role TEXT,
    user_avatar TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles (id, name, role, avatar)
    VALUES (user_id, user_name, user_role, user_avatar);
END;
$$;

-- 2. Habits
CREATE TABLE public.habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    category TEXT CHECK (category IN ('SPIRITUAL', 'DISCIPLINE', 'FITNESS')) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own habits" ON public.habits USING (auth.uid() = user_id);

-- 3. Trade Logs
CREATE TABLE public.trade_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    pair TEXT NOT NULL,
    direction TEXT CHECK (direction IN ('LONG', 'SHORT')) NOT NULL,
    session TEXT CHECK (session IN ('LONDON', 'NY', 'ASIA')),
    outcome TEXT CHECK (outcome IN ('WIN', 'LOSS', 'BE', 'OPEN')) NOT NULL,
    rr DECIMAL(10,2) NOT NULL,
    risk_load DECIMAL(10,2) DEFAULT 1.0,
    setup_rr DECIMAL(10,2),
    pnl DECIMAL(12,2),
    entry_price DECIMAL(18,6),
    exit_price DECIMAL(18,6),
    lot_size DECIMAL(10,2),
    strategy_id UUID, -- Will link later if needed
    tags TEXT[],
    notes TEXT,
    date DATE NOT NULL,
    screenshot TEXT, -- URL to storage
    setup_images TEXT[], -- URLs to storage
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trade_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own trades" ON public.trade_logs USING (auth.uid() = user_id);

-- 4. Chat Groups
CREATE TABLE public.chat_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    type TEXT CHECK (type IN ('ANNOUNCEMENT', 'PUBLIC', 'PRIVATE')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Groups are viewable by authenticated users" ON public.chat_groups FOR SELECT USING (auth.role() = 'authenticated');

-- 5. Group Messages
CREATE TABLE public.group_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.chat_groups(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) NOT NULL,
    type TEXT CHECK (type IN ('TEXT', 'IMAGE', 'VOICE')) NOT NULL,
    content TEXT NOT NULL,
    reply_to_id UUID REFERENCES public.group_messages(id),
    reactions JSONB DEFAULT '{}'::jsonb,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages are viewable by everyone in group" ON public.group_messages FOR SELECT USING (true);
CREATE POLICY "Users can insert their own messages" ON public.group_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- 6. Library
CREATE TABLE public.library_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.library_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES public.library_modules(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('VIDEO', 'PDF', 'LINK')) NOT NULL,
    url TEXT NOT NULL,
    thumbnail TEXT,
    duration TEXT,
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Library RLS
ALTER TABLE public.library_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Library is viewable by students" ON public.library_modules FOR SELECT USING (true);
CREATE POLICY "Resources are viewable by students" ON public.library_resources FOR SELECT USING (true);
