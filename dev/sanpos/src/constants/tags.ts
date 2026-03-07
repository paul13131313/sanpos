export type TagCategory = {
  label: string;
  tags: { emoji: string; label: string }[];
};

export const TAG_CATEGORIES: TagCategory[] = [
  {
    label: '季節・自然',
    tags: [
      { emoji: '🌸', label: '桜' },
      { emoji: '🌿', label: '新緑' },
      { emoji: '🍂', label: '紅葉' },
      { emoji: '🌧️', label: '雨の日' },
    ],
  },
  {
    label: 'ルート',
    tags: [
      { emoji: '🐶', label: '犬の散歩' },
      { emoji: '🐱', label: '猫発見' },
      { emoji: '🌳', label: '公園' },
      { emoji: '🌊', label: '水辺' },
    ],
  },
  {
    label: '発見',
    tags: [
      { emoji: '☕', label: 'カフェ' },
      { emoji: '🍜', label: 'グルメ' },
      { emoji: '🎨', label: 'アート' },
    ],
  },
  {
    label: '気分',
    tags: [
      { emoji: '🌅', label: '朝散歩' },
      { emoji: '🌙', label: '夜散歩' },
      { emoji: '🔇', label: '静かな道' },
    ],
  },
];

export function getSeasonTag(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 4) return '🌸';
  if (month >= 5 && month <= 6) return '🌿';
  if (month >= 7 && month <= 8) return '🌻';
  if (month >= 9 && month <= 11) return '🍂';
  return '☃️';
}

export function getSeasonLabel(): { emoji: string; title: string; sub: string } {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 4) {
    return { emoji: '🌸', title: '桜シーズン到来', sub: '今週の桜スポット投稿' };
  }
  if (month >= 5 && month <= 6) {
    return { emoji: '🌿', title: '新緑の季節', sub: '今週の新緑スポット投稿' };
  }
  if (month >= 7 && month <= 8) {
    return { emoji: '🌻', title: '夏の散歩日和', sub: '今週の夏スポット投稿' };
  }
  if (month >= 9 && month <= 11) {
    return { emoji: '🍂', title: '紅葉シーズン', sub: '今週の紅葉スポット投稿' };
  }
  return { emoji: '☃️', title: '冬の散歩', sub: '今週の冬スポット投稿' };
}
