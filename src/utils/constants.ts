// App-wide constants

export const APP_NAME = 'Throne';

// Session constraints
export const MIN_SESSION_DURATION_SECONDS = 1;
export const MAX_SESSION_DURATION_SECONDS = 3 * 60 * 60; // 3 hours
export const MAX_NOTES_LENGTH = 200;

// "Still pooping?" popup intervals (in seconds)
export const STILL_POOPING_INTERVALS = [
  10 * 60,  // 10 minutes
  20 * 60,  // 20 minutes
  30 * 60,  // 30 minutes
  45 * 60,  // 45 minutes
];

// Prediction
export const HISTOGRAM_BUCKET_SIZE_MINUTES = 15;
export const HISTOGRAM_BUCKETS_PER_DAY = 96; // 24 * 60 / 15
export const DECAY_LAMBDA = 0.95;
export const MIN_SESSIONS_FOR_PREDICTION = 5;
export const PREDICTION_CONFIDENCE_THRESHOLD = 0.5;
export const PREDICTION_NOTIFICATION_LEAD_MINUTES = 10;

// Chat
export const MAX_MESSAGE_LENGTH = 500;
export const MESSAGES_PER_PAGE = 50;
export const MESSAGE_RATE_LIMIT_MS = 1000;

// Health thresholds
export const HEALTHY_DURATION_MAX_SECONDS = 15 * 60; // 15 minutes
export const HEALTHY_DURATION_MIN_SECONDS = 60; // 1 minute
export const HEALTHY_FREQUENCY_MAX_PER_DAY = 4;
export const HEALTHY_FREQUENCY_MIN_PER_DAY = 0.3; // ~once every 3 days

// Theme colors
export const COLORS = {
  primary: '#8B5E3C',       // Warm brown
  primaryDark: '#4A2B0F',   // Dark brown
  primaryLight: '#C4956A',  // Light brown
  accent: '#F5A623',        // Golden/amber
  background: '#FFF8F0',    // Warm cream
  surface: '#FFFFFF',
  surfaceElevated: '#FFF5EB',
  text: '#2D1B0E',
  textSecondary: '#8B7355',
  textLight: '#B8A089',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  border: '#E8DDD0',
  tabBarActive: '#8B5E3C',
  tabBarInactive: '#B8A089',
  chatBubbleSelf: '#8B5E3C',
  chatBubbleOther: '#F0E6D8',
} as const;

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
} as const;
