-- walksテーブルにlocation_nameカラムを追加
ALTER TABLE walks ADD COLUMN IF NOT EXISTS location_name TEXT;
