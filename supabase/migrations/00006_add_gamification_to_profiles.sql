-- Add gamification columns to profiles so data survives reinstalls
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_last_date TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS streak_freezes INTEGER NOT NULL DEFAULT 2;
