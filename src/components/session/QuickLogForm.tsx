import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { COLORS, MAX_SESSION_DURATION_SECONDS } from '@/utils/constants';

interface Props {
  onSubmit: (startedAt: string, durationSeconds: number, notes?: string) => Promise<void>;
}

export function QuickLogForm({ onSubmit }: Props) {
  const [minutes, setMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const mins = parseInt(minutes, 10);
    if (isNaN(mins) || mins < 1) {
      Alert.alert('Invalid duration', 'Please enter at least 1 minute.');
      return;
    }

    const durationSeconds = mins * 60;
    if (durationSeconds > MAX_SESSION_DURATION_SECONDS) {
      Alert.alert('Too long', 'Maximum session duration is 3 hours.');
      return;
    }

    setIsSubmitting(true);
    try {
      const startedAt = new Date(
        Date.now() - durationSeconds * 1000
      ).toISOString();
      await onSubmit(startedAt, durationSeconds, notes || undefined);
      setMinutes('');
      setNotes('');
      Alert.alert('Logged!', 'Session added to your history.');
    } catch {
      Alert.alert('Error', 'Failed to log session. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Log</Text>
      <Text style={styles.subtitle}>Log a recent session</Text>

      <View style={styles.row}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Duration (minutes)</Text>
          <TextInput
            style={styles.input}
            value={minutes}
            onChangeText={setMinutes}
            keyboardType="numeric"
            placeholder="5"
            placeholderTextColor={COLORS.textLight}
            maxLength={3}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="How was it?"
          placeholderTextColor={COLORS.textLight}
          maxLength={200}
          multiline
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.disabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
        activeOpacity={0.8}
      >
        <Text style={styles.submitText}>
          {isSubmitting ? 'Logging...' : 'Log Session'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.surfaceElevated,
  },
  notesInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  disabled: {
    opacity: 0.6,
  },
  submitText: {
    color: COLORS.primaryDark,
    fontSize: 16,
    fontWeight: '700',
  },
});
