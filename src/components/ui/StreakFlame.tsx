import { Text, StyleSheet, View } from 'react-native';
import { getStreakEmoji } from '@/gamification/streaks';

interface StreakFlameProps {
  streak: number;
  size?: 'small' | 'medium' | 'large';
}

const SIZE_MAP = {
  small: 20,
  medium: 28,
  large: 40,
};

export function StreakFlame({ streak, size = 'medium' }: StreakFlameProps) {
  const emoji = streak <= 0 ? '🔥' : getStreakEmoji(streak);

  return (
    <View style={styles.container}>
      <Text style={[styles.emoji, { fontSize: SIZE_MAP[size] }]}>
        {emoji}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    textAlign: 'center',
  },
});
