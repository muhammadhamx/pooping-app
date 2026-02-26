import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { useSessionStore } from '@/stores/sessionStore';
import { buildModel, predictNextSession, getInsights } from '@/prediction/engine';
import { formatTime, formatDuration } from '@/utils/formatters';
import { getRandomItem, EMPTY_STATE_MESSAGES } from '@/humor/jokes';
import { MIN_SESSIONS_FOR_PREDICTION, COLORS, SHADOWS } from '@/utils/constants';
import { format } from 'date-fns';

export default function PredictScreen() {
  const user = useAuthStore((s) => s.user);
  const sessions = useSessionStore((s) => s.sessions);
  const loadSessions = useSessionStore((s) => s.loadSessions);

  useEffect(() => {
    if (user?.id) {
      loadSessions(user.id);
    }
  }, [user?.id, loadSessions]);

  const model = useMemo(() => buildModel(sessions), [sessions]);
  const prediction = useMemo(() => predictNextSession(model), [model]);
  const insights = useMemo(() => getInsights(model), [model]);

  if (sessions.length < MIN_SESSIONS_FOR_PREDICTION) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🔮</Text>
          <Text style={styles.emptyText}>
            {getRandomItem(EMPTY_STATE_MESSAGES.prediction)}
          </Text>
          <Text style={styles.emptySubtext}>
            {sessions.length}/{MIN_SESSIONS_FOR_PREDICTION} sessions logged
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(sessions.length / MIN_SESSIONS_FOR_PREDICTION) * 100}%`,
                },
              ]}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Main Prediction Card */}
      {prediction ? (
        <View style={styles.predictionCard}>
          <Text style={styles.predictionLabel}>Next Predicted Session</Text>
          <Text style={styles.predictionEmoji}>🔮</Text>
          <Text style={styles.predictionTime}>
            {formatTime(prediction.predictedTime.toISOString())}
          </Text>
          <Text style={styles.predictionDay}>
            {format(prediction.predictedTime, 'EEEE, MMM d')}
          </Text>
          <View style={styles.confidenceContainer}>
            <Text style={styles.confidenceLabel}>Confidence</Text>
            <View style={styles.confidenceBar}>
              <View
                style={[
                  styles.confidenceFill,
                  { width: `${Math.round(prediction.confidence * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.confidenceValue}>
              {Math.round(prediction.confidence * 100)}%
            </Text>
          </View>

          {/* Countdown */}
          <CountdownText targetTime={prediction.predictedTime} />
        </View>
      ) : (
        <View style={styles.predictionCard}>
          <Text style={styles.predictionEmoji}>🤷</Text>
          <Text style={styles.noPrediction}>
            Can't find a clear pattern yet. Keep logging!
          </Text>
        </View>
      )}

      {/* Pattern Insights */}
      {insights.length > 0 && (
        <View style={styles.insightsContainer}>
          <Text style={styles.insightsTitle}>Pattern Insights</Text>
          {insights.map((insight, i) => (
            <View key={i} style={styles.insightCard}>
              <Text style={styles.insightEmoji}>
                {insight.type === 'peak_times'
                  ? '⏰'
                  : insight.type === 'regularity'
                  ? '🎯'
                  : '📅'}
              </Text>
              <Text style={styles.insightText}>{insight.message}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Model Stats */}
      <View style={styles.modelInfo}>
        <Text style={styles.modelInfoText}>
          Based on {model.totalSessions} sessions
        </Text>
      </View>
    </ScrollView>
  );
}

function CountdownText({ targetTime }: { targetTime: Date }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const diffMs = targetTime.getTime() - now.getTime();

  if (diffMs <= 0) {
    return <Text style={styles.countdown}>Any moment now...</Text>;
  }

  const diffSeconds = Math.round(diffMs / 1000);
  return (
    <Text style={styles.countdown}>
      In about {formatDuration(diffSeconds)}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  predictionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.cardElevated,
  },
  predictionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  predictionEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  predictionTime: {
    fontSize: 42,
    fontWeight: '700',
    color: COLORS.text,
  },
  predictionDay: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  countdown: {
    fontSize: 14,
    color: COLORS.accent,
    marginTop: 12,
    fontWeight: '600',
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
    width: '100%',
  },
  confidenceLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    width: 70,
  },
  confidenceBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
  },
  confidenceFill: {
    height: 6,
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  confidenceValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
    width: 36,
    textAlign: 'right',
  },
  noPrediction: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  insightsContainer: {
    marginTop: 20,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.subtle,
  },
  insightEmoji: {
    fontSize: 24,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  modelInfo: {
    alignItems: 'center',
    marginTop: 20,
  },
  modelInfoText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  progressBar: {
    width: 200,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
  },
  progressFill: {
    height: 6,
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
});
