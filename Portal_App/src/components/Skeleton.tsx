import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface SkeletonRowProps {
  width?: string | number;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export function SkeletonRow({ width = '100%', height = 18, borderRadius = 6, style }: SkeletonRowProps) {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#27272a',
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.rowTop}>
        <SkeletonRow width="60%" height={14} />
        <SkeletonRow width="20%" height={14} />
      </View>
      <SkeletonRow width="80%" height={12} style={{ marginTop: 10 }} />
      <SkeletonRow width="40%" height={10} style={{ marginTop: 8 }} />
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
