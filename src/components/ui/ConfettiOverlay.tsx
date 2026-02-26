import { useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

const { width } = Dimensions.get('window');

export interface ConfettiRef {
  fire: () => void;
}

export const ConfettiOverlay = forwardRef<ConfettiRef>(function ConfettiOverlay(_, ref) {
  const confettiRef = useRef<ConfettiCannon>(null);
  const [show, setShow] = useState(false);

  useImperativeHandle(ref, () => ({
    fire: () => {
      setShow(true);
    },
  }));

  if (!show) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <ConfettiCannon
        ref={confettiRef}
        count={80}
        origin={{ x: width / 2, y: -20 }}
        autoStart
        fadeOut
        fallSpeed={3000}
        explosionSpeed={400}
        colors={['#F5A623', '#8B5E3C', '#C4956A', '#FF8C00', '#4CAF50', '#E8DDD0']}
        onAnimationEnd={() => setShow(false)}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
});
