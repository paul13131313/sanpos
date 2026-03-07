import AsyncStorage from '@react-native-async-storage/async-storage';
import { Walk, WalkPoint } from '../types';

const WALKS_LIST_KEY = '@sanpos_walks_list';
const WALK_PREFIX = '@sanpos_walk_';
const RECORDING_KEY = '@sanpos_recording_points';

// --- 散歩一覧 ---

export async function getWalkIds(): Promise<string[]> {
  const json = await AsyncStorage.getItem(WALKS_LIST_KEY);
  if (!json) return [];
  return JSON.parse(json);
}

export async function getWalk(id: string): Promise<Walk | null> {
  const json = await AsyncStorage.getItem(`${WALK_PREFIX}${id}`);
  if (!json) return null;
  return JSON.parse(json);
}

export async function getAllWalks(): Promise<Walk[]> {
  const ids = await getWalkIds();
  const walks: Walk[] = [];
  for (const id of ids) {
    const walk = await getWalk(id);
    if (walk) walks.push(walk);
  }
  return walks;
}

export async function saveWalk(walk: Walk): Promise<void> {
  const ids = await getWalkIds();
  const newIds = [walk.id, ...ids.filter((id) => id !== walk.id)];
  await AsyncStorage.setItem(WALKS_LIST_KEY, JSON.stringify(newIds));
  await AsyncStorage.setItem(`${WALK_PREFIX}${walk.id}`, JSON.stringify(walk));
}

export async function deleteWalk(id: string): Promise<void> {
  const ids = await getWalkIds();
  const newIds = ids.filter((wid) => wid !== id);
  await AsyncStorage.setItem(WALKS_LIST_KEY, JSON.stringify(newIds));
  await AsyncStorage.removeItem(`${WALK_PREFIX}${id}`);
}

// --- プロフィール画像 ---

const PROFILE_IMAGE_KEY = '@sanpos_profile_image';

export async function getProfileImage(): Promise<string | null> {
  return AsyncStorage.getItem(PROFILE_IMAGE_KEY);
}

export async function saveProfileImage(uri: string): Promise<void> {
  await AsyncStorage.setItem(PROFILE_IMAGE_KEY, uri);
}

// --- 記録中のポイント ---

export async function getRecordingPoints(): Promise<WalkPoint[]> {
  const json = await AsyncStorage.getItem(RECORDING_KEY);
  if (!json) return [];
  return JSON.parse(json);
}

export async function appendRecordingPoints(newPoints: WalkPoint[]): Promise<void> {
  const existing = await getRecordingPoints();
  const merged = [...existing, ...newPoints];
  await AsyncStorage.setItem(RECORDING_KEY, JSON.stringify(merged));
}

export async function clearRecordingPoints(): Promise<void> {
  await AsyncStorage.removeItem(RECORDING_KEY);
}
