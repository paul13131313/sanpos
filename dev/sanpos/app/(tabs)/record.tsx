import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  SafeAreaView,
  Switch,
  ScrollView,
  Animated,
} from 'react-native';
import * as Location from 'expo-location';
import { Colors } from '@/src/constants/colors';
import { startLocationTracking, stopLocationTracking, getCurrentLocation } from '@/src/lib/location';
import { getRecordingPoints, clearRecordingPoints, saveWalk } from '@/src/lib/storage';
import { syncWalkToSupabase, uploadCheckpointPhoto } from '@/src/lib/sync';
import { calcTotalDistance, formatDistance, formatDurationShort } from '@/src/lib/geo';
import { getSeasonTag } from '@/src/constants/tags';
import TagPicker from '@/src/components/TagPicker';
import CheckpointModal from '@/src/components/CheckpointModal';
import MapWrapper from '@/src/components/MapWrapper';
import { Walk, WalkPoint, Checkpoint } from '@/src/types';

type RecordingState = 'idle' | 'recording' | 'finished';

export default function RecordScreen() {
  const [state, setState] = useState<RecordingState>('idle');
  const [points, setPoints] = useState<WalkPoint[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  // 記録中ドットの点滅アニメーション
  const dotAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'recording') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, { toValue: 0.2, duration: 800, useNativeDriver: true }),
          Animated.timing(dotAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      dotAnim.setValue(1);
    }
  }, [state]);

  // モーダル
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [walkTitle, setWalkTitle] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const pollPoints = useCallback(async () => {
    const pts = await getRecordingPoints();
    setPoints(pts);
    if (pts.length > 1) {
      setDistance(calcTotalDistance(pts));
    }
  }, []);

  const startRecording = async () => {
    try {
      await clearRecordingPoints();
      await startLocationTracking();
      startTimeRef.current = Date.now();
      setState('recording');
      setCheckpoints([]);

      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      pollRef.current = setInterval(pollPoints, 2000);
    } catch (error: any) {
      Alert.alert('エラー', error.message || '位置情報を取得できません');
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    await stopLocationTracking();
    await pollPoints();
    setState('finished');
    setShowTagPicker(true);
  };

  const addCheckpoint = async (data: {
    comment: string;
    tags: string[];
    photoUri?: string;
  }) => {
    // まずモーダルを閉じる（フリーズ防止）
    setShowCheckpoint(false);

    // 記録済みのポイントから最新位置を使う（GPS待ちを回避）
    let lat: number;
    let lng: number;

    if (points.length > 0) {
      const last = points[points.length - 1];
      lat = last.lat;
      lng = last.lng;
    } else {
      const loc = await getCurrentLocation();
      if (!loc) {
        Alert.alert('位置情報を取得できませんでした');
        return;
      }
      lat = loc.lat;
      lng = loc.lng;
    }

    const cp: Checkpoint = {
      id: Date.now().toString(),
      lat,
      lng,
      comment: data.comment,
      tags: data.tags,
      photoUri: data.photoUri,
      timestamp: Date.now(),
    };
    setCheckpoints((prev) => [...prev, cp]);
  };

  const saveAndReset = async () => {
    const pts = await getRecordingPoints();
    const totalDist = calcTotalDistance(pts);

    // 出発地点の地名を取得
    let locationName: string | undefined;
    if (pts.length > 0) {
      try {
        const [geo] = await Location.reverseGeocodeAsync({
          latitude: pts[0].lat,
          longitude: pts[0].lng,
        });
        if (geo) {
          // 日本の場合: city + district / name
          const parts = [geo.city, geo.district || geo.name].filter(Boolean);
          locationName = parts.join(' ') || undefined;
        }
      } catch {
        // 取得失敗しても保存は続行
      }
    }

    const walk: Walk = {
      id: Date.now().toString(),
      title: walkTitle || undefined,
      startedAt: startTimeRef.current,
      endedAt: Date.now(),
      durationSec: elapsed,
      distanceM: totalDist,
      points: pts,
      checkpoints,
      tags: selectedTags,
      seasonTag: getSeasonTag(),
      isPublic,
      locationName,
    };

    await saveWalk(walk);
    await clearRecordingPoints();

    // バックグラウンドでSupabaseに同期（失敗してもローカルには保存済み）
    syncWalkToSupabase(walk).catch((e) =>
      console.error('Supabase同期失敗:', e.message)
    );

    setShowTagPicker(false);
    setSelectedTags([]);
    setWalkTitle('');
    setIsPublic(false);
    setPoints([]);
    setCheckpoints([]);
    setElapsed(0);
    setDistance(0);
    setState('idle');

    Alert.alert('保存しました', `${formatDistance(totalDist)} の散歩を記録しました`);
  };

  const discardAndReset = async () => {
    await clearRecordingPoints();
    setShowTagPicker(false);
    setSelectedTags([]);
    setWalkTitle('');
    setPoints([]);
    setCheckpoints([]);
    setElapsed(0);
    setDistance(0);
    setState('idle');
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const toggleTag = (emoji: string) => {
    setSelectedTags((prev) =>
      prev.includes(emoji) ? prev.filter((t) => t !== emoji) : [...prev, emoji]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* === IDLE === */}
      {state === 'idle' && (
        <View style={styles.idleContainer}>
          <Text style={styles.idleEmoji}>🚶</Text>
          <Text style={styles.idleTitle}>散歩を始めよう</Text>
          <Text style={styles.idleSub}>
            ボタンを押すとGPS記録がスタートします
          </Text>
          <TouchableOpacity style={styles.startButton} onPress={startRecording}>
            <Text style={styles.startButtonText}>スタート</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* === RECORDING === */}
      {state === 'recording' && (
        <View style={styles.recordingFull}>
          {/* 地図エリア */}
          <View style={styles.mapArea}>
            <MapWrapper
              points={points}
              checkpoints={checkpoints}
              showsUserLocation
              followsUserLocation
              style={styles.map}
            />

            {/* 記録中バッジ */}
            <View style={styles.recordingBadge}>
              <Animated.View style={[styles.recordingDot, { opacity: dotAnim }]} />
              <Text style={styles.recordingBadgeText}>記録中</Text>
            </View>
          </View>

          {/* 下部パネル */}
          <View style={styles.bottomPanel}>
            {/* 統計 */}
            <View style={styles.statsBar}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatDurationShort(elapsed)}</Text>
                <Text style={styles.statLabel}>時間</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatDistance(distance)}</Text>
                <Text style={styles.statLabel}>距離</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{checkpoints.length}</Text>
                <Text style={styles.statLabel}>スポット</Text>
              </View>
            </View>

            {/* ボタン行 */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.checkpointBtn}
                onPress={() => setShowCheckpoint(true)}
              >
                <Text style={styles.checkpointIcon}>📍</Text>
                <Text style={styles.checkpointLabel}>スポット追加</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
                <View style={styles.stopInner}>
                  <View style={styles.stopSquare} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.checkpointBtn} onPress={() => setShowCheckpoint(true)}>
                <Text style={styles.checkpointIcon}>📷</Text>
                <Text style={styles.checkpointLabel}>写真を撮る</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* チェックポイントモーダル */}
      <CheckpointModal
        visible={showCheckpoint}
        onClose={() => setShowCheckpoint(false)}
        onSave={addCheckpoint}
      />

      {/* タグ選択モーダル（終了後） */}
      <Modal visible={showTagPicker} animationType="slide">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>散歩を保存</Text>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* サマリー */}
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>距離</Text>
                <Text style={styles.summaryValue}>{formatDistance(distance)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>時間</Text>
                <Text style={styles.summaryValue}>{formatDurationShort(elapsed)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>スポット</Text>
                <Text style={styles.summaryValue}>{checkpoints.length}箇所</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>みんなに公開</Text>
                <Switch
                  value={isPublic}
                  onValueChange={setIsPublic}
                  trackColor={{ false: Colors.border, true: Colors.accent }}
                  thumbColor="#fff"
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }], marginRight: -5 }}
                />
              </View>
            </View>

            {/* タイトル入力 */}
            <View style={styles.titleInputWrap}>
              <TextInput
                style={styles.titleInput}
                placeholder="タイトル（オプション）"
                placeholderTextColor={Colors.textSub}
                value={walkTitle}
                onChangeText={setWalkTitle}
              />
            </View>

            {/* タグ選択 */}
            <Text style={styles.sectionLabel}>タグを選択</Text>
            <View style={styles.tagPickerWrap}>
              <TagPicker selected={selectedTags} onToggle={toggleTag} />
            </View>
          </ScrollView>

          {/* ボタン（常に画面下部に固定） */}
          <View style={{ flexDirection: 'row', marginHorizontal: 20, paddingVertical: 16, gap: 10 }}>
            <TouchableOpacity style={styles.discardBtn} onPress={discardAndReset}>
              <Text style={styles.discardBtnText}>破棄</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={saveAndReset}>
              <Text style={styles.saveBtnText}>保存する</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.base,
  },

  // === IDLE ===
  idleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
  },
  idleEmoji: {
    fontSize: 64,
  },
  idleTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  idleSub: {
    fontSize: 13,
    color: Colors.textSub,
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: Colors.buttonDark,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  // === RECORDING ===
  recordingFull: {
    flex: 1,
  },
  mapArea: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  recordingBadge: {
    position: 'absolute',
    top: 12,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e74c3c',
  },
  recordingBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e74c3c',
  },

  // Bottom panel
  bottomPanel: {
    backgroundColor: Colors.base,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSub,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  checkpointBtn: {
    alignItems: 'center',
    gap: 4,
  },
  checkpointIcon: {
    fontSize: 24,
  },
  checkpointLabel: {
    fontSize: 11,
    color: Colors.textSub,
    fontWeight: '600',
  },
  stopButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  stopInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopSquare: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#fff',
  },

  // === MODAL ===
  modalSafe: {
    flex: 1,
    backgroundColor: Colors.base,
  },
  modalHeader: {
    padding: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  summary: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textSub,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  titleInputWrap: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  titleInput: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSub,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  modalScroll: {
    flex: 1,
  },
  tagPickerWrap: {
    paddingHorizontal: 20,
  },
  discardBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.buttonLight,
    alignItems: 'center',
  },
  discardBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.tabInactive,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.buttonDark,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
