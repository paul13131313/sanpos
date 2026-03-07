import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import { getAllWalks } from '@/src/lib/storage';
import { evaluateBadges, Badge } from '@/src/lib/badges';

export default function BadgesScreen() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [hiddenCount, setHiddenCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadBadges();
    }, [])
  );

  const loadBadges = async () => {
    const walks = await getAllWalks();
    const result = evaluateBadges(walks);
    setBadges(result);
    setUnlockedCount(result.filter((b) => b.unlocked).length);
    setHiddenCount(result.filter((b) => !b.visible).length);
  };

  const visibleBadges = badges.filter((b) => b.visible);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>バッジ</Text>
        <Text style={styles.sub}>
          {unlockedCount} 解除済み
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {visibleBadges.map((badge) => (
          <View
            key={badge.id}
            style={[styles.badgeCard, !badge.unlocked && styles.badgeLocked]}
          >
            <Text style={[styles.badgeEmoji, !badge.unlocked && styles.emojiLocked]}>
              {badge.emoji}
            </Text>
            <Text style={styles.badgeLabel}>{badge.label}</Text>
            <Text style={styles.badgeDesc}>{badge.desc}</Text>
            {badge.unlocked ? (
              <Text style={styles.unlockedMark}>✅</Text>
            ) : (
              <>
                {badge.progress && (
                  <Text style={styles.progressText}>{badge.progress}</Text>
                )}
                <View style={styles.lockOverlay}>
                  <Text style={styles.lockIcon}>🔒</Text>
                </View>
              </>
            )}
          </View>
        ))}

        {/* 隠れバッジの存在をほのめかす */}
        {hiddenCount > 0 && (
          <View style={styles.hiddenHint}>
            <Text style={styles.hiddenText}>
              ??? あと {hiddenCount} 個のバッジが隠れています
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.base,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  sub: {
    fontSize: 11,
    color: Colors.textSub,
    marginTop: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 20,
  },
  badgeCard: {
    width: '47%',
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  badgeLocked: {
    opacity: 0.5,
  },
  badgeEmoji: {
    fontSize: 36,
  },
  emojiLocked: {
    opacity: 0.4,
  },
  badgeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  badgeDesc: {
    fontSize: 11,
    color: Colors.textSub,
    textAlign: 'center',
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.accent,
    marginTop: 2,
  },
  unlockedMark: {
    fontSize: 14,
    marginTop: 2,
  },
  lockOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  lockIcon: {
    fontSize: 14,
  },
  hiddenHint: {
    width: '100%',
    paddingVertical: 20,
    alignItems: 'center',
  },
  hiddenText: {
    fontSize: 13,
    color: Colors.textSub,
  },
});
