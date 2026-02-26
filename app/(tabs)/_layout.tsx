import { useEffect, memo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { COLORS } from '@/utils/constants';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabMeta {
  label: string;
  icon: IoniconsName;
  iconFocused: IoniconsName;
}

const TAB_META: Record<string, TabMeta> = {
  session: { label: 'Throne', icon: 'home-outline', iconFocused: 'home' },
  stats: { label: 'Stats', icon: 'bar-chart-outline', iconFocused: 'bar-chart' },
  predict: { label: 'Predict', icon: 'sparkles-outline', iconFocused: 'sparkles' },
  chat: { label: 'Chat', icon: 'chatbubble-ellipses-outline', iconFocused: 'chatbubble-ellipses' },
};

const SPRING_CONFIG = { damping: 16, stiffness: 200, mass: 0.8 };

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// ─── Single animated tab ───

const TabItem = memo(function TabItem({
  routeName,
  routeKey,
  focused,
  onPress,
  onLongPress,
}: {
  routeName: string;
  routeKey: string;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const meta = TAB_META[routeName];
  if (!meta) return null;

  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, SPRING_CONFIG);
  }, [focused, progress]);

  // Gold pill: fades in and scales up
  const pillStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.6, 1]) },
    ],
  }));

  // Icon: bounces slightly
  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 0.5, 1], [1, 1.15, 1]) },
    ],
  }));

  // Label: fades in and slides from the left
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.3, 1], [0, 1]),
    maxWidth: interpolate(progress.value, [0, 1], [0, 80]),
    marginLeft: interpolate(progress.value, [0, 1], [0, 6]),
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [-8, 0]) },
    ],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem}
    >
      {/* Gold pill background — always rendered, visibility driven by progress */}
      <AnimatedLinearGradient
        colors={['#FFB020', '#E8940A'] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.pill, pillStyle]}
      />

      {/* Content layer on top of the pill */}
      <View style={styles.contentRow} pointerEvents="none">
        <Animated.View style={iconStyle}>
          <Ionicons
            name={focused ? meta.iconFocused : meta.icon}
            size={20}
            color={focused ? COLORS.primaryDark : COLORS.textLight}
          />
        </Animated.View>
        <Animated.Text
          style={[styles.label, labelStyle]}
          numberOfLines={1}
        >
          {meta.label}
        </Animated.Text>
      </View>
    </Pressable>
  );
});

// ─── Custom Tab Bar ───

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.barOuter}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <TabItem
              key={route.key}
              routeName={route.name}
              routeKey={route.key}
              focused={focused}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── Layout ───

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.background },
        headerShadowVisible: false,
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 20,
          letterSpacing: -0.5,
        },
        headerRight: () => (
          <Pressable
            onPress={() => router.push('/settings')}
            style={styles.settingsBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="settings-outline" size={20} color={COLORS.textSecondary} />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen key="session" name="session" options={{ title: 'Throne' }} />
      <Tabs.Screen key="stats" name="stats" options={{ title: 'Stats' }} />
      <Tabs.Screen key="predict" name="predict" options={{ title: 'Predict' }} />
      <Tabs.Screen key="chat" name="chat" options={{ title: 'Chat' }} />
    </Tabs>
  );
}

// ─── Styles ───

const BOTTOM_INSET = Platform.OS === 'ios' ? 24 : 8;

const styles = StyleSheet.create({
  barOuter: {
    paddingHorizontal: 16,
    paddingBottom: BOTTOM_INSET,
    backgroundColor: COLORS.background,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  // Gold pill sits absolutely behind the content
  pill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    shadowColor: '#FFB020',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  // Icon + label sit on top
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
    overflow: 'hidden',
  },
  settingsBtn: {
    marginRight: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
