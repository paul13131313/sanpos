export type WalkPoint = {
  lat: number;
  lng: number;
  timestamp: number;
};

export type Checkpoint = {
  id: string;
  lat: number;
  lng: number;
  comment: string;
  tags: string[];
  photoUri?: string;
  timestamp: number;
};

export type Walk = {
  id: string;
  title?: string;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  distanceM: number;
  points: WalkPoint[];
  checkpoints: Checkpoint[];
  tags: string[];
  seasonTag: string;
  isPublic: boolean;
  /** 出発地点の地名（逆ジオコーディングで自動取得） */
  locationName?: string;
  /** 投稿者の表示名（公開散歩で使用） */
  authorName?: string;
  /** 投稿者のアバター絵文字（公開散歩で使用） */
  authorEmoji?: string;
};
