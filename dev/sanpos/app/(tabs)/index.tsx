import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Image,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import { getAllWalks } from '@/src/lib/storage';
import { fetchPublicWalks } from '@/src/lib/sync';
import { formatDistance, formatDuration } from '@/src/lib/geo';
import WalkCard from '@/src/components/WalkCard';
import SeasonBanner from '@/src/components/SeasonBanner';
import MapWrapper from '@/src/components/MapWrapper';
import { Walk } from '@/src/types';

type TimelineTab = 'mine' | 'public';

export default function HomeScreen() {
  const [myWalks, setMyWalks] = useState<Walk[]>([]);
  const [publicWalks, setPublicWalks] = useState<Walk[]>([]);
  const [activeTab, setActiveTab] = useState<TimelineTab>('mine');
  const [selectedWalk, setSelectedWalk] = useState<Walk | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadWalks();
    }, [])
  );

  const loadWalks = async () => {
    const all = await getAllWalks();
    all.sort((a, b) => b.startedAt - a.startedAt);
    setMyWalks(all);

    // 公開散歩も取得（エラーがあっても無視）
    fetchPublicWalks(30).then(setPublicWalks).catch(() => {});
  };

  const walks = activeTab === 'mine' ? myWalks : publicWalks;

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>sanpos</Text>
          <Text style={styles.tagline}>みんなの散歩、見つけよう。</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity>
            <Text style={styles.bellIcon}>🔔</Text>
          </TouchableOpacity>
          <View style={styles.profileIcon}>
            <Text style={{ fontSize: 16 }}>🧑</Text>
          </View>
        </View>
      </View>

      {/* タブ切替 */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'mine' && styles.tabItemActive]}
          onPress={() => setActiveTab('mine')}
        >
          <Text style={[styles.tabText, activeTab === 'mine' && styles.tabTextActive]}>
            じぶん
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'public' && styles.tabItemActive]}
          onPress={() => setActiveTab('public')}
        >
          <Text style={[styles.tabText, activeTab === 'public' && styles.tabTextActive]}>
            みんな
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        <SeasonBanner />

        {walks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🚶</Text>
            <Text style={styles.emptyTitle}>まだ散歩がありません</Text>
            <Text style={styles.emptySub}>
              記録タブから散歩を始めてみましょう！
            </Text>
          </View>
        ) : (
          walks.map((walk, i) => (
            <WalkCard
              key={walk.id}
              walk={walk}
              index={i}
              onPress={() => setSelectedWalk(walk)}
            />
          ))
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* 散歩詳細モーダル */}
      <Modal visible={!!selectedWalk} animationType="slide" transparent>
        {selectedWalk && (
          <View style={styles.detailOverlay}>
            <View style={styles.detailSheet}>
              <View style={styles.handle} />

              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>
                  {selectedWalk.title || `${formatDate(selectedWalk.startedAt)}の散歩`}
                </Text>
                <TouchableOpacity onPress={() => setSelectedWalk(null)}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* 地図 */}
              <View style={styles.detailMap}>
                <MapWrapper
                  points={selectedWalk.points}
                  checkpoints={selectedWalk.checkpoints}
                  style={styles.detailMapInner}
                />
              </View>

              {/* 統計 */}
              <View style={styles.detailStats}>
                <View style={styles.detailStatItem}>
                  <Text style={styles.detailStatValue}>
                    {formatDistance(selectedWalk.distanceM)}
                  </Text>
                  <Text style={styles.detailStatLabel}>距離</Text>
                </View>
                <View style={styles.detailStatItem}>
                  <Text style={styles.detailStatValue}>
                    {formatDuration(selectedWalk.durationSec)}
                  </Text>
                  <Text style={styles.detailStatLabel}>時間</Text>
                </View>
                <View style={styles.detailStatItem}>
                  <Text style={styles.detailStatValue}>
                    {selectedWalk.checkpoints.length}
                  </Text>
                  <Text style={styles.detailStatLabel}>スポット</Text>
                </View>
              </View>

              {/* タグ */}
              {selectedWalk.tags.length > 0 && (
                <View style={styles.detailTags}>
                  {selectedWalk.tags.map((t) => (
                    <View key={t} style={styles.detailTag}>
                      <Text style={styles.detailTagText}>{t}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* チェックポイント */}
              {selectedWalk.checkpoints.length > 0 && (
                <ScrollView style={styles.checkpointList}>
                  <Text style={styles.checkpointListTitle}>スポット</Text>
                  {selectedWalk.checkpoints.map((cp) => (
                    <View key={cp.id} style={styles.checkpointItem}>
                      {cp.photoUri && (
                        <Image source={{ uri: cp.photoUri }} style={styles.cpPhoto} />
                      )}
                      <View style={styles.cpInfo}>
                        {cp.tags.length > 0 && (
                          <Text style={styles.cpTags}>{cp.tags.join(' ')}</Text>
                        )}
                        {cp.comment ? (
                          <Text style={styles.cpComment}>{cp.comment}</Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 11,
    color: Colors.textSub,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bellIcon: {
    fontSize: 20,
  },
  profileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e8e0d8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: Colors.bgSub,
    borderRadius: 12,
    padding: 3,
    marginBottom: 8,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabItemActive: {
    backgroundColor: Colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSub,
  },
  tabTextActive: {
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 20,
  },

  // Empty state
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textSub,
    textAlign: 'center',
  },

  // Detail modal (same as map.tsx)
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    backgroundColor: Colors.base,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  closeText: {
    fontSize: 18,
    color: Colors.textSub,
    padding: 4,
  },
  detailMap: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  detailMapInner: {
    flex: 1,
  },
  detailStats: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  detailStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  detailStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  detailStatLabel: {
    fontSize: 11,
    color: Colors.textSub,
  },
  detailTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  detailTag: {
    backgroundColor: Colors.buttonLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailTagText: {
    fontSize: 16,
  },
  checkpointList: {
    maxHeight: 200,
  },
  checkpointListTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  checkpointItem: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 10,
  },
  cpPhoto: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  cpInfo: {
    flex: 1,
    gap: 2,
  },
  cpTags: {
    fontSize: 14,
  },
  cpComment: {
    fontSize: 13,
    color: Colors.textMid,
  },
});
