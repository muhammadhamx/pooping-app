-- Add cosmetics, achievements, and reward session count to profiles
-- so they survive sign-out/sign-in and device changes.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS selected_title_id TEXT DEFAULT 'the_newbie',
  ADD COLUMN IF NOT EXISTS unlocked_title_ids JSONB DEFAULT '["the_newbie"]'::jsonb,
  ADD COLUMN IF NOT EXISTS unlocked_achievement_ids JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reward_session_count INTEGER DEFAULT 0;
