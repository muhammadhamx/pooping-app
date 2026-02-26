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
  primary: '#6B3A1F',       // Rich chocolate
  primaryDark: '#3D1E0C',   // Deep espresso
  primaryLight: '#B8784A',  // Caramel
  accent: '#FFB020',        // Bright amber gold
  accentLight: '#FFD580',   // Soft gold
  background: '#1A1118',    // Deep plum-black
  backgroundCard: '#251C22',// Slightly lighter card bg
  surface: '#2E2330',       // Dark surface
  surfaceElevated: '#3A2E3E',// Elevated purple-tint
  text: '#F5EDE8',          // Warm white
  textSecondary: '#A89CAE', // Muted lavender
  textLight: '#776B7D',     // Faded purple
  success: '#4ADE80',       // Bright green
  warning: '#FBBF24',       // Amber
  error: '#FB7185',         // Soft red-pink
  border: '#3E3344',        // Subtle border
  tabBarActive: '#FFB020',
  tabBarInactive: '#776B7D',
  chatBubbleSelf: '#6B3A1F',
  chatBubbleOther: '#3A2E3E',
} as const;

// Gradient presets for LinearGradient
export const GRADIENTS = {
  warm: ['#1A1118', '#251C22'] as const,
  header: ['#1A1118', '#2A1F28'] as const,
  gold: ['#FFB020', '#FF8C00'] as const,
  fire: ['#FF6B35', '#FFB020'] as const,
  surface: ['#2E2330', '#251C22'] as const,
  accent: ['#FFB020', '#E8940A'] as const,
  banner: ['#3D1E0C', '#6B3A1F', '#8B5530'] as const,
  navbar: ['#1A1118', '#211720'] as const,
  button: ['#FFB020', '#E8940A'] as const,
  buttonDanger: ['#FB7185', '#E5475B'] as const,
} as const;

// Shadow presets
export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  cardElevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  glow: {
    shadowColor: '#FFB020',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
} as const;
