import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Colors } from '../constants/colors';
import { Walk } from '../types';
import { formatDistance, formatDuration } from '../lib/geo';

type WalkCardProps = {
  walk: Walk;
  onPress?: () => void;
  /** カードの表示順（スタガードアニメーション用） */
  index?: number;
};

export default function WalkCard({ walk, onPress, index = 0 }: WalkCardProps) {
  const [liked, setLiked] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const delay = Math.min(index * 80, 400);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const dateStr = formatRelativeDate(walk.startedAt);
  const allTags = walk.tags.length > 0 ? walk.tags.join(' ') : walk.seasonTag;
  const photos = walk.checkpoints.filter((cp) => cp.photoUri);
  const firstComment = walk.checkpoints.find((cp) => cp.comment)?.comment;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{walk.authorEmoji || '🚶'}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.title} numberOfLines={1}>
            {walk.title || `${dateStr}の散歩`}
          </Text>
          <Text style={styles.time} numberOfLines={1}>
            {dateStr}{walk.locationName ? ` · ${walk.locationName}` : ''}
          </Text>
        </View>
        {allTags ? (
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>{allTags}</Text>
          </View>
        ) : null}
      </View>

      {/* 写真ストリップ */}
      {photos.length > 0 && (
        <View style={styles.photoStrip}>
          {photos.slice(0, 4).map((cp) => (
            <Image
              key={cp.id}
              source={{ uri: cp.photoUri }}
              style={styles.photoItem}
            />
          ))}
          {photos.length > 4 && (
            <View style={styles.photoMore}>
              <Text style={styles.photoMoreText}>+{photos.length - 4}</Text>
            </View>
          )}
        </View>
      )}

      {/* チェックポイントタグ表示（写真なしの場合） */}
      {photos.length === 0 && walk.checkpoints.length > 0 && (
        <View style={styles.spotRow}>
          {walk.checkpoints.slice(0, 5).map((cp) => (
            <View key={cp.id} style={styles.spotChip}>
              <Text style={styles.spotText}>
                {cp.tags.length > 0 ? cp.tags[0] : '📍'}
                {cp.comment ? ` ${cp.comment}` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* 統計 */}
      <View style={styles.stats}>
        <Text style={styles.statText}>🚶 {formatDistance(walk.distanceM)}</Text>
        <Text style={styles.statText}>⏱ {formatDuration(walk.durationSec)}</Text>
        {walk.checkpoints.length > 0 && (
          <Text style={styles.statText}>📍 {walk.checkpoints.length}スポット</Text>
        )}
      </View>

      {/* コメント */}
      {firstComment && (
        <View style={styles.commentWrap}>
          <Text style={styles.comment} numberOfLines={2}>{firstComment}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setLiked(!liked)}
        >
          <Text style={styles.actionIcon}>{liked ? '❤️' : '🤍'}</Text>
          <Text style={styles.actionLabel}>{liked ? 1 : 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { marginLeft: 'auto' }]}>
          <Text style={styles.actionIcon}>🗺️</Text>
          <Text style={styles.actionLabel}>ルートを見る</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
    </Animated.View>
  );
}

function formatRelativeDate(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'たった今';
  if (mins < 60) return `${mins}分前`;
  if (hours < 24) return `${hours}時間前`;
  if (days < 7) return `${days}日前`;

  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingBottom: 10,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bgSub,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  time: {
    fontSize: 11,
    color: Colors.textSub,
  },
  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.buttonLight,
  },
  tagText: {
    fontSize: 14,
  },
  photoStrip: {
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  photoItem: {
    flex: 1,
    height: 80,
    borderRadius: 12,
  },
  photoMore: {
    width: 48,
    height: 80,
    borderRadius: 12,
    backgroundColor: Colors.bgSub,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoMoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMid,
  },
  spotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  spotChip: {
    backgroundColor: Colors.bgSub,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  spotText: {
    fontSize: 12,
    color: Colors.textMid,
  },
  stats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 16,
  },
  statText: {
    fontSize: 12,
    color: Colors.textSub,
  },
  commentWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  comment: {
    fontSize: 13,
    color: '#4a4038',
    lineHeight: 21,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.bgSub,
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIcon: {
    fontSize: 16,
  },
  actionLabel: {
    fontSize: 12,
    color: Colors.textSub,
  },
});
