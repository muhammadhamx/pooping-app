import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Session } from '@/types/database';
import { formatDuration, formatDateTime } from '@/utils/formatters';
import { COLORS, SHADOWS } from '@/utils/constants';

interface Props {
  session: Session;
  onRate?: (rating: number) => void;
}

function getSessionAccent(session: Session) {
  if (session.is_quick_log) return '#818CF8';
  if (session.duration_seconds && session.duration_seconds > 900) return COLORS.error;
  if (session.rating && session.rating >= 4) return COLORS.accent;
  return COLORS.primaryLight;
}

export function SessionCard({ session, onRate }: Props) {
  const stars = session.rating
    ? '★'.repeat(session.rating) + '☆'.repeat(5 - session.rating)
    : null;

  const accent = getSessionAccent(session);

  const handleRate = async (rating: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRate?.(rating);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <View style={styles.content}>
        <View style={styles.row}>
          <View style={[styles.emojiCircle, { backgroundColor: accent + '15' }]}>
            <Text style={styles.emoji}>
              {session.is_quick_log ? '📝' : '🚽'}
            </Text>
          </View>

          <View style={styles.middle}>
            <Text style={styles.dateText}>
              {formatDateTime(session.started_at)}
            </Text>
            {session.notes && (
              <Text style={styles.notes} numberOfLines={1}>
                {session.notes}
              </Text>
            )}
            {stars && <Text style={styles.rating}>{stars}</Text>}
          </View>

          <View style={styles.right}>
            <Text style={[styles.duration, { color: accent }]}>
              {session.duration_seconds
                ? formatDuration(session.duration_seconds)
                : '—'}
            </Text>
            {session.is_quick_log && (
              <Text style={styles.quickLogTag}>Quick</Text>
            )}
          </View>
        </View>

        {onRate && !session.rating && (
          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>Rate this session:</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => handleRate(n)}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  style={styles.starButton}
                >
                  <Text style={styles.rateStar}>☆</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.subtle,
  },
  accentBar: {
    width: 4,
  },
  content: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emoji: {
    fontSize: 20,
  },
  middle: {
    flex: 1,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  notes: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  rating: {
    fontSize: 13,
    color: COLORS.accent,
    marginTop: 3,
    letterSpacing: 1,
  },
  right: {
    marginLeft: 12,
    alignItems: 'flex-end',
  },
  duration: {
    fontSize: 17,
    fontWeight: '800',
  },
  quickLogTag: {
    fontSize: 10,
    fontWeight: '600',
    color: '#818CF8',
    backgroundColor: '#818CF820',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 4,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  rateLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  starButton: {
    padding: 2,
  },
  rateStar: {
    fontSize: 24,
    color: COLORS.accent,
  },
});
