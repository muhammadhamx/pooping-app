import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '@/stores/authStore';
import { getLeaderboard, type LeaderboardEntry } from '@/lib/database';
import { COLORS, SHADOWS } from '@/utils/constants';

const THRONE_LABELS = [
  'Supreme Sitter',
  'Vice Sitter',
  'Chancellor of the Bowl',
];

const HEADER_QUIPS = [
  'Who rules the throne room?',
  'The porcelain elite',
  'Top sitters this season',
  'Hall of Throne Fame',
];

function Row({
  entry,
  index,
  isMe,
}: {
  entry: LeaderboardEntry;
  index: number;
  isMe: boolean;
}) {
  const medal = index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

  return (
    <View style={[styles.row, isMe && styles.rowHighlight, index === 0 && styles.rowFirst]}>
      <View style={styles.rankCol}>
        {medal ? (
          <Text style={[styles.medal, index === 0 && styles.medalFirst]}>{medal}</Text>
        ) : (
          <Text style={styles.rankNumber}>{index + 1}</Text>
        )}
      </View>
      <Text style={[styles.avatar, index === 0 && styles.avatarFirst]}>
        {entry.avatar_emoji}
      </Text>
      <View style={styles.nameCol}>
        <Text
          style={[styles.name, isMe && styles.nameHighlight, index === 0 && styles.nameFirst]}
          numberOfLines={1}
        >
          {entry.display_name || 'Anonymous Pooper'}{isMe ? ' (You)' : ''}
        </Text>
        {index < 3 && (
          <Text style={styles.throneLabel}>{THRONE_LABELS[index]}</Text>
        )}
      </View>
      <View style={styles.xpCol}>
        <Text style={[styles.xp, isMe && styles.xpHighlight]}>
          {entry.xp.toLocaleString()}
        </Text>
        <Text style={styles.xpUnit}>XP</Text>
      </View>
    </View>
  );
}

export function LeaderboardCard() {
  const userId = useAuthStore((s) => s.user?.id);
  const [allEntries, setAllEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const quip = useMemo(
    () => HEADER_QUIPS[Math.floor(Math.random() * HEADER_QUIPS.length)],
    []
  );

  const load = useCallback(async () => {
    try {
      const data = await getLeaderboard();
      setAllEntries(data);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || allEntries.length === 0) return null;

  const top3 = allEntries.slice(0, 3);
  const totalCount = allEntries.length;
  const userIndex = allEntries.findIndex((e) => e.id === userId);
  // Show user row separately if they're not already in top 3
  const userInTop3 = userIndex >= 0 && userIndex < 3;
  const showUserRow = userIndex >= 3;
  const userEntry = userIndex >= 0 ? allEntries[userIndex] : null;

  return (
    <Animated.View entering={FadeInDown.delay(200).springify().damping(18)} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerEmoji}>🏆</Text>
          <View>
            <Text style={styles.headerTitle}>Throne Royalty</Text>
            <Text style={styles.headerQuip}>{quip}</Text>
          </View>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{totalCount}</Text>
        </View>
      </View>

      {/* Top 3 */}
      {top3.map((entry, index) => (
        <Row
          key={entry.id}
          entry={entry}
          index={index}
          isMe={entry.id === userId}
        />
      ))}

      {/* Divider + user's position (if not in top 3) */}
      {showUserRow && userEntry && (
        <>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>
              {totalCount} throne sitters total
            </Text>
            <View style={styles.dividerLine} />
          </View>
          <Row entry={userEntry} index={userIndex} isMe />
        </>
      )}

      {/* If user IS in top 3, just show total count at the bottom */}
      {userInTop3 && totalCount > 3 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            You're top {userIndex + 1} out of {totalCount} throne sitters 🔥
          </Text>
        </View>
      )}

      {/* If user not found in leaderboard at all (shouldn't happen now) */}
      {userIndex < 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            You're on the board — start a session to climb up! 🚽
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerEmoji: {
    fontSize: 26,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerQuip: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginTop: 1,
  },
  countBadge: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  countText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.accent,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 10,
  },
  rowHighlight: {
    backgroundColor: COLORS.accent + '12',
  },
  rowFirst: {
    paddingVertical: 14,
  },
  rankCol: {
    width: 28,
    alignItems: 'center',
  },
  medal: {
    fontSize: 18,
  },
  medalFirst: {
    fontSize: 22,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  avatar: {
    fontSize: 22,
  },
  avatarFirst: {
    fontSize: 28,
  },
  nameCol: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  nameHighlight: {
    color: COLORS.accent,
  },
  nameFirst: {
    fontSize: 15,
    fontWeight: '800',
  },
  throneLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginTop: 1,
  },
  xpCol: {
    alignItems: 'flex-end',
  },
  xp: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  xpHighlight: {
    color: COLORS.accent,
  },
  xpUnit: {
    fontSize: 10,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: 11,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
