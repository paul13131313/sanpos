import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import { getAllWalks, deleteWalk, getProfileImage, saveProfileImage } from '@/src/lib/storage';
import { formatDistance, formatDuration } from '@/src/lib/geo';
import { Walk } from '@/src/types';
import { supabase } from '@/src/lib/supabase';
import { deleteWalkFromSupabase } from '@/src/lib/sync';

export default function ProfileScreen() {
  const [walks, setWalks] = useState<Walk[]>([]);
  const [displayName, setDisplayName] = useState<string>('散歩好き');
  const [username, setUsername] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    loadProfile();
    getProfileImage().then(setProfileImage);
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', user.id)
      .single();

    if (data) {
      setDisplayName(data.display_name || '散歩好き');
      setUsername(data.username || '');
    }
  };

  const saveDisplayName = async () => {
    if (!newName.trim() || newName.trim().length > 20) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ display_name: newName.trim() })
      .eq('id', user.id);

    setDisplayName(newName.trim());
    setEditingName(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadWalks();
    }, [])
  );

  const loadWalks = async () => {
    const all = await getAllWalks();
    setWalks(all);
  };

  const pickProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setProfileImage(uri);
      await saveProfileImage(uri);
    }
  };

  const totalDistance = walks.reduce((sum, w) => sum + w.distanceM, 0);
  const totalDuration = walks.reduce((sum, w) => sum + w.durationSec, 0);

  const handleDelete = (walk: Walk) => {
    Alert.alert('削除しますか？', `${formatDistance(walk.distanceM)} の散歩記録`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          await deleteWalk(walk.id);
          deleteWalkFromSupabase(walk.id).catch(() => {});
          await loadWalks();
        },
      },
    ]);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const renderWalkItem = ({ item }: { item: Walk }) => (
    <TouchableOpacity
      style={styles.walkItem}
      onLongPress={() => handleDelete(item)}
    >
      <View style={styles.walkHeader}>
        <Text style={styles.walkDate}>{formatDate(item.startedAt)}</Text>
        {item.locationName && (
          <Text style={styles.walkLocation}>📍 {item.locationName}</Text>
        )}
        {item.tags.length > 0 && (
          <Text style={styles.walkTags}>{item.tags.join(' ')}</Text>
        )}
      </View>
      {item.title ? (
        <Text style={styles.walkTitle}>{item.title}</Text>
      ) : null}
      <View style={styles.walkStats}>
        <Text style={styles.walkStat}>🚶 {formatDistance(item.distanceM)}</Text>
        <Text style={styles.walkStat}>⏱ {formatDuration(item.durationSec)}</Text>
        <Text style={styles.walkStat}>📍 {item.checkpoints.length}スポット</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={pickProfileImage} activeOpacity={0.8}>
          <View style={styles.avatarLarge}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <Text style={{ fontSize: 32 }}>🧑</Text>
            )}
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>📷</Text>
            </View>
          </View>
        </TouchableOpacity>
        {editingName ? (
          <View style={styles.editNameRow}>
            <TextInput
              style={styles.editNameInput}
              value={newName}
              onChangeText={setNewName}
              maxLength={20}
              autoFocus
              placeholder="ニックネーム"
              placeholderTextColor={Colors.textSub}
            />
            <TouchableOpacity onPress={saveDisplayName}>
              <Text style={styles.editNameSave}>保存</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditingName(false)}>
              <Text style={styles.editNameCancel}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => { setNewName(displayName); setEditingName(true); }}>
            <Text style={styles.userName}>{displayName} ✏️</Text>
          </TouchableOpacity>
        )}
        {username ? (
          <Text style={styles.userId}>@{username}</Text>
        ) : null}
      </View>

      {/* ログアウトボタン */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => {
          Alert.alert('ログアウト', 'ログアウトしますか？', [
            { text: 'キャンセル', style: 'cancel' },
            {
              text: 'ログアウト',
              style: 'destructive',
              onPress: () => supabase.auth.signOut(),
            },
          ]);
        }}
      >
        <Text style={styles.logoutText}>ログアウト</Text>
      </TouchableOpacity>

      {/* 統計 */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{walks.length}</Text>
          <Text style={styles.statLabel}>散歩</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{formatDistance(totalDistance)}</Text>
          <Text style={styles.statLabel}>累計距離</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{formatDuration(totalDuration)}</Text>
          <Text style={styles.statLabel}>累計時間</Text>
        </View>
      </View>

      {/* 散歩一覧 */}
      <Text style={styles.sectionTitle}>散歩の記録</Text>
      {walks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>👟</Text>
          <Text style={styles.emptyText}>まだ散歩の記録がありません</Text>
          <Text style={styles.emptySub}>記録タブから散歩を始めてみましょう</Text>
        </View>
      ) : (
        <FlatList
          data={walks}
          keyExtractor={(item) => item.id}
          renderItem={renderWalkItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.base,
  },
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 12,
    gap: 8,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.bgSub,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  editBadgeText: {
    fontSize: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  userId: {
    fontSize: 12,
    color: Colors.textSub,
    marginTop: 2,
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editNameInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: Colors.text,
    minWidth: 140,
  },
  editNameSave: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent,
  },
  editNameCancel: {
    fontSize: 16,
    color: Colors.textSub,
    paddingHorizontal: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 20,
  },
  walkItem: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  walkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  walkDate: {
    fontSize: 12,
    color: Colors.textSub,
  },
  walkLocation: {
    fontSize: 11,
    color: Colors.textMid,
  },
  walkTags: {
    fontSize: 14,
    marginLeft: 'auto',
  },
  walkTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  walkStats: {
    flexDirection: 'row',
    gap: 16,
  },
  walkStat: {
    fontSize: 12,
    color: Colors.textSub,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textSub,
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 16,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logoutText: {
    fontSize: 13,
    color: Colors.textSub,
    fontWeight: '600',
  },
});
