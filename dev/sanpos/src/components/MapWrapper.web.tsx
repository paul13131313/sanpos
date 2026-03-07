import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

type MapWrapperProps = {
  points?: { lat: number; lng: number }[];
  checkpoints?: { lat: number; lng: number; tags: string[] }[];
  initialRegion?: any;
  style?: any;
  showsUserLocation?: boolean;
  followsUserLocation?: boolean;
  children?: React.ReactNode;
};

export default function MapWrapper({
  points = [],
  style,
  children,
}: MapWrapperProps) {
  return (
    <View style={[styles.webFallback, style]}>
      <Text style={styles.webEmoji}>🗺️</Text>
      <Text style={styles.webText}>
        {points.length > 0
          ? `${points.length}ポイント記録中`
          : '地図はネイティブアプリで表示されます'}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  webFallback: {
    flex: 1,
    backgroundColor: '#e8f0e8',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    gap: 8,
  },
  webEmoji: {
    fontSize: 40,
  },
  webText: {
    fontSize: 13,
    color: Colors.textMid,
    fontWeight: '600',
  },
});
