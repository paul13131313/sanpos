-- profilesにユニークIDとニックネーム用のカラムを追加
-- location_nameもwalksに追加

-- 1. walksにlocation_name追加
ALTER TABLE walks ADD COLUMN IF NOT EXISTS location_name TEXT;

-- 2. profilesにusername追加（ソシャゲ風のユニークID）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- 3. 新規ユーザー作成時にランダムなusernameを自動付与するよう関数を更新
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    new.id,
    'sanpo_' || floor(random() * 9000 + 1000)::int || substr(md5(new.id::text), 1, 2)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
