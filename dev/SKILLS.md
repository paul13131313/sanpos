# SKILLS.md - 技術スキルマップ
> 新しいチャット開始時にこのファイルを読み込ませること。
> 新しい技術を習得したら随時更新する。

## 🟢 実務レベル（プロジェクトで使用済み）

### フロントエンド
- **HTML / CSS / JavaScript** — 全プロジェクトの基盤
- **React** — MY RANKING、生成新聞など複数プロジェクト
- **Next.js** — フルスタックアプリ構築
- **Tailwind CSS** — UIスタイリング
- **Web Audio API** — 音楽アプリ、リズムゲーム、アンビエントサウンド
- **PWA** — 生成新聞のオフライン対応・インストール
- **Three.js** — 3Dグラフィックス（SOUND COSMOS）
- **WebGL2 / GLSL シェーダー** — 流体シミュレーション（FLUID NOISE）
- **TensorFlow.js** — ブラウザ上ML推論・手認識（AIR SYNTH）
- **WebRTC (PeerJS)** — P2Pリアルタイム通信（SYNC PAD）
- **D3.js** — データビジュアライゼーション・Force Simulation（SKILL GALAXY）
- **Chrome Extension (Manifest V3)** — ブラウザ拡張開発（COLOR THIEF）
- **Web Workers** — CPU並列処理（FRACTAL DIVE）
- **Web Speech API** — ブラウザ音声認識（VOICE MEMO）
- **IndexedDB** — ブラウザ内永続ストレージ（VOICE MEMO）
- **CSS Scroll-Driven Animations** — スクロール連動アニメーション（SCROLL STAGE）
- **Intersection Observer** — 要素可視性検出・遅延表示（SCROLL STAGE）
- **Canvas 2D ゲーム開発** — ゲームループ・当たり判定・状態管理（PIXEL DODGE）
- **WebSocket** — リアルタイム双方向通信（LIVE BOARD）
- **HTML Drag and Drop API** — ネイティブドラッグ&ドロップ（KANBAN FLOW）
- **View Transitions API** — ページ内アニメーション遷移（KANBAN FLOW）
- **Web Animations API (WAAPI)** — プログラマティックアニメーション制御（MOTION LAB）
- **Web Components (Custom Elements v1 / Shadow DOM)** — 再利用可能UIコンポーネント設計（COMPONENT KIT）
- **MediaPipe Face Landmarker** — 顔468点ランドマーク検出・表情認識（FACE MIRROR）
- **MediaPipe Object Detector** — リアルタイム物体検出・分類（DARK SCANNER）
- **MediaPipe Pose Landmarker** — 全身33点ポーズ推定・骨格描画（DARK SCANNER）

### バックエンド / インフラ
- **Cloudflare Workers** — 生成新聞のAPI・配信基盤、LIVE BOARDのWebSocketサーバー
- **Cloudflare Durable Objects** — ステートフルエッジコンピューティング（LIVE BOARD）
- **Supabase** — DB・認証（MY RANKINGなど）
- **Stripe** — 決済連携（生成新聞 月額サブスク）
- **OAuth認証** — ソーシャルログイン実装

### API連携
- **Claude API** — AI生成コンテンツ（生成新聞の記事生成）
- **LINE Messaging API** — Bot連携（体重記録システム）

### ツール / デプロイ
- **GitHub Pages** — 静的サイトホスティング
- **Claude Code (CC)** — AI支援開発のメインツール
- **Git / GitHub** — バージョン管理・リポジトリ運用

## 🟡 学習中 / 次に取り組む

- **WGPU / WebGPU** — 次世代GPUグラフィックスAPI
- **WebGPU Compute Shader** — GPUパーティクル・カーネル実行

## 📁 主要プロジェクト実績

| プロジェクト | 技術スタック | 概要 |
|---|---|---|
| 生成新聞 | React, Cloudflare Workers, Claude API, Stripe, PWA | 月額300円 AI生成新聞サブスク |
| MY RANKING | React, Next.js, Supabase | フルスタック個人ランキングシステム |
| necoo | React | TikTok風猫動画ビューア |
| 台湾レストランガイド | HTML/CSS/JS | 台湾グルメ情報サイト |
| 音楽アプリ群 | Web Audio API | インタラクティブ楽器・リズムゲーム |
| 素材タッチ体験 | HTML/CSS/JS | インタラクティブ素材表現 |
| 体重記録Bot | LINE Messaging API | LINE連携の体重管理 |
| STUDIO PAUL | WebGL2/GLSL, CSS Scroll-Driven Animations, Intersection Observer | ポートフォリオ（WebGLノイズ背景 + スクロール演出） |
| SOUND COSMOS | Three.js, Web Audio API | 3Dオーディオビジュアライザー |
| FLUID NOISE | WebGL2, GLSL, Web Audio API | Audio Reactive 流体シミュレーション |
| AIR SYNTH | TensorFlow.js, Web Audio API | 手で空中演奏するAIシンセサイザー |
| SYNC PAD | WebRTC, PeerJS, Web Audio API | P2Pリアルタイム共演ドラムマシン |
| SKILL GALAXY | D3.js | インタラクティブ技術スキルマップ可視化 |
| COLOR THIEF | Chrome Extension, Manifest V3, Canvas API | ページ配色抽出Chrome拡張 |
| FRACTAL DIVE | Web Workers, Canvas API | 並列計算マンデルブロ集合エクスプローラー |
| VOICE MEMO | Web Speech API, IndexedDB, Web Audio API | リアルタイム音声文字起こしメモ |
| SCROLL STAGE | CSS Scroll-Driven Animations, Intersection Observer | スクロール演出ショーケース |
| PIXEL DODGE | Canvas 2D, Web Audio API | レトロ弾避けアーケードゲーム |
| LIVE BOARD | WebSocket, Cloudflare Durable Objects, Canvas 2D | リアルタイム共有ホワイトボード |
| KANBAN FLOW | Drag and Drop API, View Transitions API | ドラッグ&ドロップ カンバンボード |
| MOTION LAB | Web Animations API | アニメーションAPI実験室 |
| COMPONENT KIT | Web Components, Shadow DOM, Custom Elements | 再利用可能UIコンポーネントライブラリ |
| FACE MIRROR | MediaPipe Face Landmarker, Canvas 2D, Blendshapes | リアルタイム顔ランドマーク検出＆4エフェクト |
| DARK SCANNER | MediaPipe (Object Detector, Face Detector, Pose Landmarker), Canvas 2D | CIA分析風ダークテックHUD画像ジェネレーター |

## 📝 運用ルール
1. 新しい技術を使ったら「実務レベル」に追加
2. 興味がある技術は「学習中」に追加
3. プロジェクト完了時にテーブルに追記
4. チャット開始時に「SKILLS.mdを読んで」と伝える
