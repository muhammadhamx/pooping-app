# Pooping

**Track your throne time. Predict your next visit. Chat with fellow poopers.**

A humor-first bathroom session tracker built with React Native and Expo. Log sessions, analyze your patterns, get AI-powered predictions for your next visit, and chat with other users in real time.

## Features

### Session Tracking
- Live timer with haptic feedback and animated start/stop
- Quick log for manually adding past sessions
- Rate each session (1-5 stars) and add notes
- Escalating humor messages based on session duration
- Persistent notification when app is backgrounded

### Stats & Insights
- View stats by day, week, month, or all time
- Total sessions, average duration, longest session, streak count
- Time-of-day distribution bar chart
- Health insights with pattern analysis and regularity assessment

### Predictions
- Histogram-based prediction engine trained on your personal data
- Predicts your next session with a confidence percentage
- Live countdown to predicted time
- Peak hours, regularity score, and frequency patterns
- Unlocks after logging enough sessions

### Poop Buddy Chat
- Real-time buddy matching — get paired with someone also on the throne
- Live "poopers online" counter
- Public chat rooms (The Throne Room, Morning Regulars, Late Night Club, etc.)
- All chat features are session-gated — you must be actively pooping

### Achievements & Gamification
- Unlock badges for milestones (streaks, session counts, speed records)
- Achievement grid with locked/unlocked states and humor-filled flavor text

### Settings & Account
- Custom display name and avatar emoji
- Anonymous auth (no sign-up required)
- Optional email linking for data recovery
- Notification preferences
- Account deletion with cascading data cleanup

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo SDK 54 |
| Language | TypeScript (strict mode) |
| Navigation | Expo Router (file-based) |
| State | Zustand + AsyncStorage |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Edge Functions) |
| Real-time | Supabase Broadcast + Presence channels |
| Notifications | expo-notifications (lazy-loaded for Expo Go compatibility) |
| Charts | react-native-gifted-charts |
| OTA Updates | EAS Update |

## Project Structure

```
app/
  (auth)/          # Welcome screen, anonymous sign-in
  (tabs)/          # Main tab screens (session, stats, predict, chat)
  chat/            # Chat room and buddy chat screens
  settings.tsx     # Profile, achievements, account management
src/
  components/      # Reusable UI components
  stores/          # Zustand stores (session, chat)
  prediction/      # Prediction engine
  humor/           # Jokes, messages, and fun copy
  lib/             # Supabase client, auth, database, notifications, realtime
  hooks/           # Custom React hooks
  types/           # TypeScript type definitions
supabase/
  migrations/      # 5 SQL migrations (profiles, sessions, chat, utilities, policies)
  functions/       # Edge Functions (keep-alive, delete-account)
  seed.sql         # Initial chat rooms
```

## Getting Started

### Prerequisites

- Node.js 18+
- Expo Go app (for mobile testing) or a development build
- Supabase project (local or hosted)

### Setup

```bash
# Install dependencies
npm install

# Copy env template and fill in your Supabase credentials
cp .env.example .env

# Start the dev server (serves mobile + web)
npx expo start
```

Press `w` for web, scan the QR code with Expo Go for mobile.

### Database

```bash
# Push migrations to your Supabase project
npx supabase db push --include-seed

# Deploy Edge Functions
npx supabase functions deploy keep-alive --no-verify-jwt
npx supabase functions deploy delete-account
```

## OTA Updates

The app uses EAS Update for over-the-air updates. Users get new features without updating from the app store.

```bash
# Push an update to production
npm run update:production

# Push to preview channel
npm run update:preview
```

## Build & Submit

```bash
# Development build (for testing on real devices)
npm run build:dev:android
npm run build:dev:ios

# Production build
npm run build:production

# Submit to stores
npm run submit:android
npm run submit:ios
```

## Anti-Pause

Supabase free tier pauses after 1 week of inactivity. A GitHub Actions cron job pings the `keep-alive` Edge Function every 6 hours to prevent this.

## License

MIT
