/**
 * バッジ解除ロジック
 * 散歩データを分析してバッジの解除状態を判定する
 * visible: 進捗がある or 前提バッジ解除済みで表示される（段階的発見）
 */
import { Walk } from '../types';

export type Badge = {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  unlocked: boolean;
  visible: boolean;      // 表示するかどうか
  progress?: string;     // "3/5" のような進捗表示
};

type BadgeDefinition = {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  /** このバッジが表示されるための前提バッジID（undefinedなら常に表示） */
  requiresBadge?: string;
  check: (walks: Walk[]) => { unlocked: boolean; progress?: string };
};

// 日付をYYYY-MM-DD形式に変換（連続日数計算用）
function toDateString(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 連続日数を計算
function getMaxConsecutiveDays(walks: Walk[]): number {
  if (walks.length === 0) return 0;

  const dates = [...new Set(walks.map((w) => toDateString(w.startedAt)))].sort();
  if (dates.length === 0) return 0;

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

// 朝散歩（6時〜9時に開始）の回数
function getMorningWalkCount(walks: Walk[]): number {
  return walks.filter((w) => {
    const hour = new Date(w.startedAt).getHours();
    return hour >= 6 && hour < 9;
  }).length;
}

// 夜散歩（19時〜23時に開始）の回数
function getNightWalkCount(walks: Walk[]): number {
  return walks.filter((w) => {
    const hour = new Date(w.startedAt).getHours();
    return hour >= 19 && hour < 23;
  }).length;
}

// 特定タグの散歩数
function getTagWalkCount(walks: Walk[], tag: string): number {
  return walks.filter((w) => w.tags.includes(tag)).length;
}

// 総チェックポイント数
function getTotalCheckpoints(walks: Walk[]): number {
  return walks.reduce((sum, w) => sum + w.checkpoints.length, 0);
}

// 写真付きチェックポイント数
function getPhotoCheckpoints(walks: Walk[]): number {
  return walks.reduce((sum, w) => {
    return sum + w.checkpoints.filter((cp) => cp.photoUri).length;
  }, 0);
}

// 猫タグのチェックポイント数
function getCatCheckpoints(walks: Walk[]): number {
  return walks.reduce((sum, w) => {
    return sum + w.checkpoints.filter((cp) => cp.tags.includes('🐱')).length;
  }, 0);
}

// 累計距離(km)
function getTotalKm(walks: Walk[]): number {
  return walks.reduce((sum, w) => sum + w.distanceM, 0) / 1000;
}

// 散歩した日数（ユニーク日数）
function getUniqueDays(walks: Walk[]): number {
  return new Set(walks.map((w) => toDateString(w.startedAt))).size;
}

// バッジ定義（順番が段階的発見の順序に影響）
const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // === 最初から見えるバッジ ===
  {
    id: 'first_walk',
    emoji: '👣',
    label: 'はじめの一歩',
    desc: '初めての散歩を記録',
    check: (walks) => ({
      unlocked: walks.length >= 1,
      progress: walks.length >= 1 ? undefined : '0/1',
    }),
  },
  {
    id: 'walker_3',
    emoji: '🚶',
    label: '散歩好き',
    desc: '散歩を3回記録',
    check: (walks) => ({
      unlocked: walks.length >= 3,
      progress: walks.length >= 3 ? undefined : `${walks.length}/3`,
    }),
  },
  {
    id: 'first_spot',
    emoji: '📍',
    label: 'スポット発見',
    desc: '初めてのスポットを記録',
    check: (walks) => {
      const total = getTotalCheckpoints(walks);
      return {
        unlocked: total >= 1,
        progress: total >= 1 ? undefined : '0/1',
      };
    },
  },
  {
    id: 'streak_3',
    emoji: '🔥',
    label: '3日連続',
    desc: '3日連続で散歩を記録',
    check: (walks) => {
      const streak = getMaxConsecutiveDays(walks);
      return {
        unlocked: streak >= 3,
        progress: streak >= 3 ? undefined : `${streak}/3日`,
      };
    },
  },

  // === 前提バッジ解除で見えるバッジ ===
  {
    id: 'walker_10',
    emoji: '⭐',
    label: 'レギュラー',
    desc: '散歩を10回記録',
    requiresBadge: 'walker_3',
    check: (walks) => ({
      unlocked: walks.length >= 10,
      progress: walks.length >= 10 ? undefined : `${walks.length}/10`,
    }),
  },
  {
    id: 'walker_10km',
    emoji: '📏',
    label: '10kmウォーカー',
    desc: '累計10km達成',
    requiresBadge: 'first_walk',
    check: (walks) => {
      const totalKm = getTotalKm(walks);
      return {
        unlocked: totalKm >= 10,
        progress: totalKm >= 10 ? undefined : `${totalKm.toFixed(1)}/10km`,
      };
    },
  },
  {
    id: 'explorer',
    emoji: '🗺️',
    label: '探検家',
    desc: '10箇所のスポットを発見',
    requiresBadge: 'first_spot',
    check: (walks) => {
      const total = getTotalCheckpoints(walks);
      return {
        unlocked: total >= 10,
        progress: total >= 10 ? undefined : `${total}/10`,
      };
    },
  },
  {
    id: 'photographer',
    emoji: '📸',
    label: 'フォトグラファー',
    desc: '写真を10枚撮影',
    requiresBadge: 'first_spot',
    check: (walks) => {
      const count = getPhotoCheckpoints(walks);
      return {
        unlocked: count >= 10,
        progress: count >= 10 ? undefined : `${count}/10`,
      };
    },
  },
  {
    id: 'streak_7',
    emoji: '🔥',
    label: '7日連続',
    desc: '1週間毎日散歩を記録',
    requiresBadge: 'streak_3',
    check: (walks) => {
      const streak = getMaxConsecutiveDays(walks);
      return {
        unlocked: streak >= 7,
        progress: streak >= 7 ? undefined : `${streak}/7日`,
      };
    },
  },
  {
    id: 'morning_walker',
    emoji: '🌅',
    label: '朝活サンパー',
    desc: '朝散歩（6〜9時）を5回',
    requiresBadge: 'walker_3',
    check: (walks) => {
      const count = getMorningWalkCount(walks);
      return {
        unlocked: count >= 5,
        progress: count >= 5 ? undefined : `${count}/5`,
      };
    },
  },
  {
    id: 'night_walker',
    emoji: '🌙',
    label: 'ナイトウォーカー',
    desc: '夜散歩（19〜23時）を5回',
    requiresBadge: 'walker_3',
    check: (walks) => {
      const count = getNightWalkCount(walks);
      return {
        unlocked: count >= 5,
        progress: count >= 5 ? undefined : `${count}/5`,
      };
    },
  },
  {
    id: 'sakura_hunter',
    emoji: '🌸',
    label: '桜ハンター',
    desc: '桜タグの散歩を5回',
    requiresBadge: 'first_walk',
    check: (walks) => {
      const count = getTagWalkCount(walks, '🌸');
      return {
        unlocked: count >= 5,
        progress: count >= 5 ? undefined : `${count}/5`,
      };
    },
  },
  {
    id: 'cat_master',
    emoji: '🐱',
    label: '猫マスター',
    desc: '猫スポットを5箇所発見',
    requiresBadge: 'first_spot',
    check: (walks) => {
      const count = getCatCheckpoints(walks);
      return {
        unlocked: count >= 5,
        progress: count >= 5 ? undefined : `${count}/5`,
      };
    },
  },
  {
    id: 'cafe_lover',
    emoji: '☕',
    label: 'カフェ巡り',
    desc: 'カフェタグの散歩を5回',
    requiresBadge: 'first_walk',
    check: (walks) => {
      const count = getTagWalkCount(walks, '☕');
      return {
        unlocked: count >= 5,
        progress: count >= 5 ? undefined : `${count}/5`,
      };
    },
  },

  // === 上級バッジ（さらに前提が深い） ===
  {
    id: 'walker_50',
    emoji: '🏆',
    label: 'ベテラン',
    desc: '散歩を50回記録',
    requiresBadge: 'walker_10',
    check: (walks) => ({
      unlocked: walks.length >= 50,
      progress: walks.length >= 50 ? undefined : `${walks.length}/50`,
    }),
  },
  {
    id: 'walker_50km',
    emoji: '🎖️',
    label: '50km達成',
    desc: '累計50km達成',
    requiresBadge: 'walker_10km',
    check: (walks) => {
      const totalKm = getTotalKm(walks);
      return {
        unlocked: totalKm >= 50,
        progress: totalKm >= 50 ? undefined : `${totalKm.toFixed(1)}/50km`,
      };
    },
  },
  {
    id: 'walker_100km',
    emoji: '💯',
    label: '100km達成',
    desc: '累計100km達成',
    requiresBadge: 'walker_50km',
    check: (walks) => {
      const totalKm = getTotalKm(walks);
      return {
        unlocked: totalKm >= 100,
        progress: totalKm >= 100 ? undefined : `${totalKm.toFixed(1)}/100km`,
      };
    },
  },
  {
    id: 'streak_30',
    emoji: '👑',
    label: '30日連続',
    desc: '1ヶ月毎日散歩を記録',
    requiresBadge: 'streak_7',
    check: (walks) => {
      const streak = getMaxConsecutiveDays(walks);
      return {
        unlocked: streak >= 30,
        progress: streak >= 30 ? undefined : `${streak}/30日`,
      };
    },
  },
  {
    id: 'grand_explorer',
    emoji: '🌍',
    label: '大探検家',
    desc: '50箇所のスポットを発見',
    requiresBadge: 'explorer',
    check: (walks) => {
      const total = getTotalCheckpoints(walks);
      return {
        unlocked: total >= 50,
        progress: total >= 50 ? undefined : `${total}/50`,
      };
    },
  },
  {
    id: 'daily_20',
    emoji: '📅',
    label: '20日達成',
    desc: '20日間散歩した日がある',
    requiresBadge: 'walker_10',
    check: (walks) => {
      const days = getUniqueDays(walks);
      return {
        unlocked: days >= 20,
        progress: days >= 20 ? undefined : `${days}/20日`,
      };
    },
  },
];

// メインの関数: 散歩データからバッジ状態を計算
export function evaluateBadges(walks: Walk[]): Badge[] {
  // まず全バッジを評価
  const results = BADGE_DEFINITIONS.map((def) => {
    const result = def.check(walks);
    return {
      id: def.id,
      emoji: def.emoji,
      label: def.label,
      desc: def.desc,
      unlocked: result.unlocked,
      progress: result.progress,
      requiresBadge: def.requiresBadge,
    };
  });

  // 解除済みバッジIDのセット
  const unlockedIds = new Set(results.filter((r) => r.unlocked).map((r) => r.id));

  // 表示判定: 前提なし→常に表示 / 前提あり→前提が解除済みなら表示
  return results.map((r) => {
    const visible = !r.requiresBadge || unlockedIds.has(r.requiresBadge);
    return {
      id: r.id,
      emoji: r.emoji,
      label: r.label,
      desc: r.desc,
      unlocked: r.unlocked,
      visible,
      progress: r.progress,
    };
  });
}
