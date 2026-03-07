-- ==========================================
-- sanpos データベーススキーマ
-- Supabase SQL Editor で実行してください
-- ==========================================

-- 1. profiles テーブル（ユーザー情報）
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null default '散歩好き',
  avatar_emoji text not null default '🚶',
  created_at timestamptz not null default now()
);

-- 新規ユーザー作成時に自動でprofileを作る
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- トリガー
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. walks テーブル（散歩記録）
create table if not exists walks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text,
  started_at bigint not null,
  ended_at bigint not null,
  duration_sec integer not null,
  distance_m real not null,
  points jsonb not null default '[]',
  tags text[] not null default '{}',
  season_tag text not null default '',
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

-- 3. checkpoints テーブル（チェックポイント）
create table if not exists checkpoints (
  id uuid default gen_random_uuid() primary key,
  walk_id uuid references walks(id) on delete cascade not null,
  lat real not null,
  lng real not null,
  comment text not null default '',
  tags text[] not null default '{}',
  photo_url text,
  timestamp bigint not null,
  created_at timestamptz not null default now()
);

-- 4. インデックス
create index if not exists idx_walks_user_id on walks(user_id);
create index if not exists idx_walks_is_public on walks(is_public);
create index if not exists idx_walks_created_at on walks(created_at desc);
create index if not exists idx_checkpoints_walk_id on checkpoints(walk_id);

-- 5. RLS（Row Level Security）有効化
alter table profiles enable row level security;
alter table walks enable row level security;
alter table checkpoints enable row level security;

-- profiles: 自分のプロフィールのみ更新可、全員閲覧可
create policy "Public profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- walks: 自分のは全操作可、公開散歩は誰でも閲覧可
create policy "Users can CRUD own walks"
  on walks for all using (auth.uid() = user_id);

create policy "Public walks are viewable by everyone"
  on walks for select using (is_public = true);

-- checkpoints: walkの所有者は全操作可、公開walkのcheckpointは閲覧可
create policy "Users can CRUD own checkpoints"
  on checkpoints for all
  using (
    exists (
      select 1 from walks where walks.id = checkpoints.walk_id and walks.user_id = auth.uid()
    )
  );

create policy "Public walk checkpoints are viewable"
  on checkpoints for select
  using (
    exists (
      select 1 from walks where walks.id = checkpoints.walk_id and walks.is_public = true
    )
  );

-- 6. Storage バケット（写真用）
insert into storage.buckets (id, name, public)
values ('checkpoint-photos', 'checkpoint-photos', true)
on conflict (id) do nothing;

-- Storage ポリシー: 認証ユーザーはアップロード可、全員閲覧可
create policy "Anyone can view checkpoint photos"
  on storage.objects for select
  using (bucket_id = 'checkpoint-photos');

create policy "Authenticated users can upload checkpoint photos"
  on storage.objects for insert
  with check (bucket_id = 'checkpoint-photos' and auth.role() = 'authenticated');

create policy "Users can delete own checkpoint photos"
  on storage.objects for delete
  using (bucket_id = 'checkpoint-photos' and auth.uid()::text = (storage.foldername(name))[1]);
