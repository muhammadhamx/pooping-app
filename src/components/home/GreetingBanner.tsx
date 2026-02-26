import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { XPProgressBar } from '@/components/ui/XPProgressBar';
import { getGreeting } from '@/humor/greetings';
import { useGamificationStore } from '@/stores/gamificationStore';
import { COLORS, GRADIENTS } from '@/utils/constants';

export function GreetingBanner() {
  const { rank, xpProgress } = useGamificationStore();
  const greeting = getGreeting();

  return (
    <LinearGradient
      colors={GRADIENTS.banner}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.banner}
    >
      {/* Decorative circles */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      <View style={styles.topRow}>
        <View style={styles.greetingSection}>
          <Text style={styles.greetingEmoji}>{greeting.emoji}</Text>
          <Text style={styles.greetingText}>{greeting.message}</Text>
        </View>
      </View>

      <View style={styles.rankRow}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankEmoji}>{rank.emoji}</Text>
        </View>
        <View style={styles.rankInfo}>
          <Text style={styles.rankName}>{rank.name}</Text>
          <Text style={styles.rankDescription}>{rank.description}</Text>
        </View>
      </View>

      <View style={styles.xpSection}>
        <XPProgressBar
          current={xpProgress.current}
          needed={xpProgress.needed}
          percentage={xpProgress.percentage}
          showLabel={true}
          height={8}
          labelColor="rgba(255,248,240,0.7)"
          trackColor="rgba(255,255,255,0.1)"
          fillColor={COLORS.accent}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,176,32,0.08)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,176,32,0.05)',
  },
  topRow: {
    marginBottom: 16,
  },
  greetingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greetingEmoji: {
    fontSize: 28,
  },
  greetingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5EDE8',
    flex: 1,
    lineHeight: 22,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  rankBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,176,32,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,176,32,0.25)',
  },
  rankEmoji: {
    fontSize: 22,
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 0.5,
  },
  rankDescription: {
    fontSize: 12,
    color: 'rgba(245,237,232,0.5)',
    marginTop: 2,
    fontStyle: 'italic',
  },
  xpSection: {
    marginTop: 4,
  },
});
