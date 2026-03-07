import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getSeasonLabel } from '../constants/tags';
import { Colors } from '../constants/colors';

export default function SeasonBanner() {
  const season = getSeasonLabel();

  return (
    <View style={styles.banner}>
      <Text style={styles.title}>{season.emoji} {season.title}</Text>
      <Text style={styles.sub}>{season.sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.accentLight,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  sub: {
    fontSize: 11,
    color: '#b08878',
  },
});
