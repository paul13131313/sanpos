import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  SafeAreaView,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import { getAllWalks } from '@/src/lib/storage';
import { formatDistance, formatDuration } from '@/src/lib/geo';
import MapWrapper from '@/src/components/MapWrapper';
import { Walk } from '@/src/types';

const FILTER_TAGS = [
  { label: 'すべて', emoji: '' },
  { label: '🌸 桜', emoji: '🌸' },
  { label: '🐶 犬連れ', emoji: '🐶' },
  { label: '🐱 猫スポット', emoji: '🐱' },
  { label: '☕ カフェ', emoji: '☕' },
  { label: '🌳 公園', emoji: '🌳' },
];

export default function MapScreen() {
  const [walks, setWalks] = useState<Walk[]>([]);
  const [activeFilter, setActiveFilter] = useState(0);
  const [selectedWalk, setSelectedWalk] = useState<Walk | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadWalks();
    }, [])
  );

  const loadWalks = async () => {
    const all = await getAllWalks();
    setWalks(all);
  };

  // フィルタリング
  const filteredWalks = activeFilter === 0
    ? walks
    : walks.filter((w) =>
        w.tags.includes(FILTER_TAGS[activeFilter].emoji) ||
        w.checkpoints.some((cp) => cp.tags.includes(FILTER_TAGS[activeFilter].emoji))
      );

  // すべてのポイントをフラット化して地図に表示
  const allCheckpoints = filteredWalks.flatMap((w) =>
    w.checkpoints.map((cp) => ({
      lat: cp.lat,
      lng: cp.lng,
      tags: cp.tags,
      comment: cp.comment,
      photoUri: cp.photoUri,
    }))
  );

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* マップエリア（画面の大部分を占める） */}
      <View style={styles.mapContainer}>
        <MapWrapper
          checkpoints={allCheckpoints}
          showsUserLocation
          style={styles.map}
        />

        {/* フィルタータグ（マップ上にオーバーレイ） */}
        <View style={styles.filterOverlay}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTER_TAGS.map((tag, i) => (
              <TouchableOpacity
                key={tag.label}
                style={[
                  styles.filterTag,
                  activeFilter === i && styles.filterTagActive,
                ]}
                onPress={() => setActiveFilter(i)}
              >
                <Text
                  style={[
                    styles.filterText,
                    activeFilter === i && styles.filterTextActive,
                  ]}
                >
                  {tag.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 散歩カード（マップ下部にオーバーレイ） */}
        {filteredWalks.length > 0 && (
          <View style={styles.cardsOverlay}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.walkList}
            >
              {filteredWalks.map((walk) => (
                <TouchableOpacity
                  key={walk.id}
                  style={styles.walkMiniCard}
                  onPress={() => setSelectedWalk(walk)}
                >
                  <Text style={styles.miniTitle} numberOfLines={1}>
                    {walk.tags.slice(0, 2).join('')} {walk.title || `${formatDate(walk.startedAt)}の散歩`}
                  </Text>
                  <Text style={styles.miniStats}>
                    {formatDistance(walk.distanceM)} · {formatDuration(walk.durationSec)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* 散歩詳細モーダル */}
      <Modal
        visible={!!selectedWalk}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (viewingPhoto) {
            setViewingPhoto(null);
          } else {
            setSelectedWalk(null);
          }
        }}
      >
        {selectedWalk && !viewingPhoto && (
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
                        <Pressable onPress={() => setViewingPhoto(cp.photoUri!)}>
                          <Image source={{ uri: cp.photoUri }} style={styles.cpPhoto} />
                        </Pressable>
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

        {/* 写真フルスクリーン（同じModal内で切替） */}
        {selectedWalk && viewingPhoto && (
          <Pressable
            style={styles.photoOverlay}
            onPress={() => setViewingPhoto(null)}
          >
            <Image
              source={{ uri: viewingPhoto }}
              style={styles.photoFull}
              resizeMode="contain"
            />
            <Pressable
              style={styles.photoCloseBtn}
              onPress={() => setViewingPhoto(null)}
            >
              <Text style={styles.photoCloseText}>✕</Text>
            </Pressable>
          </Pressable>
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
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  filterOverlay: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
  },
  filterTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  filterTagActive: {
    backgroundColor: Colors.buttonDark,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.tabInactive,
  },
  filterTextActive: {
    color: '#fff',
  },
  // 散歩カードオーバーレイ
  cardsOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
  },
  walkList: {
    paddingHorizontal: 10,
    gap: 6,
  },
  walkMiniCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  miniTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  miniStats: {
    fontSize: 10,
    color: Colors.textSub,
    marginTop: 1,
  },

  // Detail modal
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

  // 写真フルスクリーン
  photoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoFull: {
    width: '100%',
    height: '80%',
  },
  photoCloseBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCloseText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
});
