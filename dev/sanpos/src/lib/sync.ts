/**
 * Supabase同期レイヤー
 * ローカル保存と同時にSupabaseにもデータを保存する
 */
import { supabase } from './supabase';
import { Walk, Checkpoint } from '../types';

// --- 散歩をSupabaseに保存 ---

export async function syncWalkToSupabase(walk: Walk): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return; // 未ログインなら同期しない

  // walks テーブルに保存
  const { error: walkError } = await supabase.from('walks').upsert({
    id: walk.id,
    user_id: user.id,
    title: walk.title || null,
    started_at: walk.startedAt,
    ended_at: walk.endedAt,
    duration_sec: walk.durationSec,
    distance_m: walk.distanceM,
    points: walk.points,
    tags: walk.tags,
    season_tag: walk.seasonTag,
    is_public: walk.isPublic,
    location_name: walk.locationName || null,
  });

  if (walkError) {
    console.error('Walk同期エラー:', walkError.message);
    return;
  }

  // checkpoints テーブルに保存
  if (walk.checkpoints.length > 0) {
    const checkpointRows = walk.checkpoints.map((cp) => ({
      id: cp.id,
      walk_id: walk.id,
      lat: cp.lat,
      lng: cp.lng,
      comment: cp.comment,
      tags: cp.tags,
      photo_url: cp.photoUri || null,
      timestamp: cp.timestamp,
    }));

    const { error: cpError } = await supabase
      .from('checkpoints')
      .upsert(checkpointRows);

    if (cpError) {
      console.error('Checkpoint同期エラー:', cpError.message);
    }
  }
}

// --- 写真をSupabase Storageにアップロード ---

export async function uploadCheckpointPhoto(
  walkId: string,
  checkpointId: string,
  photoUri: string
): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  try {
    // ファイルを読み込んでアップロード
    const response = await fetch(photoUri);
    const blob = await response.blob();

    const filePath = `${user.id}/${walkId}/${checkpointId}.jpg`;

    const { error } = await supabase.storage
      .from('checkpoint-photos')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('写真アップロードエラー:', error.message);
      return null;
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from('checkpoint-photos')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (e: any) {
    console.error('写真アップロード失敗:', e.message);
    return null;
  }
}

// --- Supabaseから散歩を削除 ---

export async function deleteWalkFromSupabase(walkId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // checkpointsはON DELETE CASCADEで自動削除される
  const { error } = await supabase
    .from('walks')
    .delete()
    .eq('id', walkId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Walk削除エラー:', error.message);
  }
}

// --- 公開散歩を取得（タイムライン用） ---

export async function fetchPublicWalks(limit = 20): Promise<Walk[]> {
  const { data, error } = await supabase
    .from('walks')
    .select(`
      *,
      checkpoints (*),
      profiles!inner (display_name, avatar_emoji)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('公開散歩取得エラー:', error.message);
    return [];
  }

  // Supabaseのデータ形式 → アプリのWalk型に変換
  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationSec: row.duration_sec,
    distanceM: row.distance_m,
    points: row.points || [],
    checkpoints: (row.checkpoints || []).map((cp: any) => ({
      id: cp.id,
      lat: cp.lat,
      lng: cp.lng,
      comment: cp.comment,
      tags: cp.tags || [],
      photoUri: cp.photo_url,
      timestamp: cp.timestamp,
    })),
    tags: row.tags || [],
    seasonTag: row.season_tag || '',
    isPublic: row.is_public,
    locationName: row.location_name || undefined,
    // 追加情報（タイムライン表示用）
    authorName: row.profiles?.display_name || '散歩好き',
    authorEmoji: row.profiles?.avatar_emoji || '🚶',
  }));
}
