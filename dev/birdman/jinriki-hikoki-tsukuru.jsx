import { useState, useEffect, useCallback, useRef } from "react";

const FL = "https://fonts.googleapis.com/css2?family=DotGothic16&display=swap";
const C = {
  bg: "#111422", bg2: "#1a1e33", bg3: "#222844", pnl: "#1c2340", pnl2: "#243055",
  acc: "#e94560", gold: "#ffd700", grn: "#4ecca3", blu: "#3282b8", wht: "#eee",
  gry: "#7888a0", gryD: "#4a5568", txt: "#d8dce8", dim: "#7888a0", org: "#f5a623",
  pur: "#9b59b6", pnk: "#e84393", sky: "#87ceeb", lake: "#1a6fa0", lakeL: "#2980b9",
  red: "#e74c3c", cfrp: "#2c3e50",
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = a => a[Math.floor(Math.random() * a.length)];

// ── AUDIO SYSTEM (Web Audio API) ──
const AudioSys = (() => {
  let ctx = null;
  let bgmGain = null;
  let sfxGain = null;
  let bgmOscs = [];
  let bgmAudio = null; // HTML Audio element for MP3 BGM
  let muted = false;
  const getCtx = () => {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      bgmGain = ctx.createGain(); bgmGain.gain.value = 0.12; bgmGain.connect(ctx.destination);
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.35; sfxGain.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };
  const N = { C4: 261.6, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392.0, A4: 440.0, B4: 493.9, C5: 523.3, D5: 587.3, E5: 659.3, F5: 698.5, G5: 784.0, A5: 880.0, C6: 1046.5 };

  // Helper: noise buffer
  const noiseBuf = (dur, decay) => {
    const c = getCtx();
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * decay));
    return buf;
  };
  // Helper: play a tone
  const tone = (freq, type, vol, start, dur) => {
    const c = getCtx();
    const osc = c.createOscillator(); osc.type = type; osc.frequency.value = freq;
    const g = c.createGain(); g.gain.setValueAtTime(vol, c.currentTime + start);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
    osc.connect(g); g.connect(sfxGain);
    osc.start(c.currentTime + start); osc.stop(c.currentTime + start + dur);
  };

  const stopBgm = () => {
    bgmOscs.forEach(o => { try { o.stop(); } catch(e){} }); bgmOscs = [];
    if (bgmAudio) { bgmAudio.pause(); bgmAudio.currentTime = 0; }
  };

  const playBgm = (type) => {
    stopBgm();
    if (muted) return;

    if (type === "main") {
      // MP3 BGM - loops
      if (!bgmAudio) {
        bgmAudio = new Audio(import.meta.env.BASE_URL + "bgm.mp3");
        bgmAudio.loop = true;
        bgmAudio.volume = 0.25;
      }
      bgmAudio.currentTime = 0;
      bgmAudio.play().catch(() => {});
    } else if (type === "flight") {
      // Uplifting arpeggio over MP3
      if (bgmAudio) { bgmAudio.volume = 0.12; bgmAudio.play().catch(() => {}); }
      const c = getCtx(); bgmGain.gain.value = 0.06;
      const melody = [N.C4, N.E4, N.G4, N.C5, N.E5, N.C5, N.G4, N.E4];
      let i = 0;
      const playNote = () => {
        if (muted) return;
        const c2 = getCtx();
        const osc = c2.createOscillator(); osc.type = "triangle";
        osc.frequency.value = melody[i % melody.length];
        const g = c2.createGain(); g.gain.setValueAtTime(0.05, c2.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c2.currentTime + 0.4);
        osc.connect(g); g.connect(bgmGain);
        osc.start(); osc.stop(c2.currentTime + 0.45);
        i++;
      };
      playNote();
      const iv = setInterval(playNote, 450);
      bgmOscs.push({ stop: () => clearInterval(iv) });
    } else if (type === "result") {
      // Fanfare chord + MP3 quieter
      if (bgmAudio) { bgmAudio.volume = 0.08; }
      const c = getCtx();
      [N.C4, N.E4, N.G4, N.C5, N.E5, N.G5].forEach((f, i) => {
        const osc = c.createOscillator(); osc.type = "triangle"; osc.frequency.value = f;
        const g = c.createGain(); g.gain.setValueAtTime(0, c.currentTime + i * 0.12);
        g.gain.linearRampToValueAtTime(0.08, c.currentTime + i * 0.12 + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.12 + 1.0);
        osc.connect(g); g.connect(sfxGain);
        osc.start(c.currentTime + i * 0.12); osc.stop(c.currentTime + i * 0.12 + 1.0);
      });
    }
  };

  const playSfx = (type) => {
    if (muted) return;
    const c = getCtx();

    if (type === "click") {
      // Short blip
      tone(880, "sine", 0.1, 0, 0.06);
    } else if (type === "select") {
      // Confirm selection - two-tone ascending
      tone(660, "sine", 0.08, 0, 0.08);
      tone(880, "sine", 0.08, 0.06, 0.1);
    } else if (type === "cancel") {
      // Descending tone
      tone(440, "sine", 0.08, 0, 0.08);
      tone(330, "sine", 0.08, 0.06, 0.1);
    } else if (type === "phaseChange") {
      // Phase transition - ascending fanfare blip
      tone(523, "triangle", 0.07, 0, 0.1);
      tone(659, "triangle", 0.07, 0.08, 0.1);
      tone(784, "triangle", 0.09, 0.16, 0.15);
    } else if (type === "weekPass") {
      // Week passing - soft tick
      tone(600, "sine", 0.05, 0, 0.04);
      tone(800, "sine", 0.03, 0.03, 0.04);
    } else if (type === "event") {
      // Random event popup - attention-grab
      tone(880, "square", 0.04, 0, 0.06);
      tone(1100, "square", 0.04, 0.06, 0.06);
      tone(880, "square", 0.04, 0.12, 0.06);
    } else if (type === "moneySpend") {
      // Coin spending sound
      tone(1200, "sine", 0.06, 0, 0.04);
      tone(900, "sine", 0.04, 0.05, 0.06);
    } else if (type === "moneyGain") {
      // Coin gain
      tone(800, "sine", 0.06, 0, 0.04);
      tone(1200, "sine", 0.08, 0.05, 0.08);
    } else if (type === "statUp") {
      // Stat increase sparkle
      tone(660, "triangle", 0.06, 0, 0.08);
      tone(880, "triangle", 0.06, 0.06, 0.08);
      tone(1100, "triangle", 0.06, 0.12, 0.12);
    } else if (type === "statDown") {
      // Stat decrease sad
      tone(440, "triangle", 0.06, 0, 0.1);
      tone(350, "triangle", 0.05, 0.08, 0.15);
    } else if (type === "takeoff") {
      // Dramatic launch whoosh
      const osc = c.createOscillator(); osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, c.currentTime + 0.8);
      const g = c.createGain(); g.gain.setValueAtTime(0.07, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.0);
      osc.connect(g); g.connect(sfxGain);
      osc.start(); osc.stop(c.currentTime + 1.0);
      // Wind noise
      const buf = noiseBuf(0.8, 0.3);
      const src = c.createBufferSource(); src.buffer = buf;
      const flt = c.createBiquadFilter(); flt.type = "bandpass"; flt.frequency.value = 800; flt.Q.value = 0.5;
      const ng = c.createGain(); ng.gain.value = 0.06;
      src.connect(flt); flt.connect(ng); ng.connect(sfxGain); src.start();
    } else if (type === "splash") {
      // Water splash - bigger and more dramatic
      const buf = noiseBuf(0.7, 0.15);
      const src = c.createBufferSource(); src.buffer = buf;
      const flt = c.createBiquadFilter(); flt.type = "lowpass"; flt.frequency.value = 500;
      const g = c.createGain(); g.gain.value = 0.15;
      src.connect(flt); flt.connect(g); g.connect(sfxGain); src.start();
      // Sub-bass thud
      tone(80, "sine", 0.12, 0, 0.3);
    } else if (type === "drumroll") {
      // Dramatic drumroll with crescendo
      for (let i = 0; i < 25; i++) {
        const buf = noiseBuf(0.05, 0.012);
        const src = c.createBufferSource(); src.buffer = buf;
        const g = c.createGain(); g.gain.value = 0.03 + i * 0.004;
        src.connect(g); g.connect(sfxGain);
        src.start(c.currentTime + i * 0.07);
      }
    } else if (type === "reveal") {
      // Cymbal crash + triumphant chord
      const buf = noiseBuf(1.0, 0.35);
      const src = c.createBufferSource(); src.buffer = buf;
      const flt = c.createBiquadFilter(); flt.type = "highpass"; flt.frequency.value = 2500;
      const g = c.createGain(); g.gain.value = 0.08;
      src.connect(flt); flt.connect(g); g.connect(sfxGain); src.start();
      [N.C4, N.E4, N.G4, N.C5, N.E5].forEach(f => {
        tone(f, "triangle", 0.06, 0, 1.5);
      });
    } else if (type === "jankenWin") {
      // Victory jingle
      tone(N.C5, "square", 0.06, 0, 0.12);
      tone(N.E5, "square", 0.06, 0.1, 0.12);
      tone(N.G5, "square", 0.08, 0.2, 0.2);
    } else if (type === "jankenLose") {
      // Sad descend
      tone(N.G4, "square", 0.06, 0, 0.12);
      tone(N.E4, "square", 0.05, 0.1, 0.12);
      tone(N.C4, "square", 0.04, 0.2, 0.2);
    } else if (type === "jankenDraw") {
      // Flat boing
      tone(N.E4, "square", 0.06, 0, 0.15);
      tone(N.E4, "square", 0.05, 0.12, 0.15);
    } else if (type === "miniGameStart") {
      // Exciting start sound
      tone(N.C5, "triangle", 0.07, 0, 0.08);
      tone(N.E5, "triangle", 0.07, 0.06, 0.08);
      tone(N.G5, "triangle", 0.07, 0.12, 0.08);
      tone(N.C6, "triangle", 0.09, 0.18, 0.15);
    } else if (type === "miniGameSuccess") {
      // Success fanfare
      tone(N.G4, "triangle", 0.07, 0, 0.1);
      tone(N.C5, "triangle", 0.07, 0.08, 0.1);
      tone(N.E5, "triangle", 0.08, 0.16, 0.1);
      tone(N.G5, "triangle", 0.1, 0.24, 0.25);
    } else if (type === "miniGameFail") {
      // Fail wah-wah
      tone(N.B4, "sawtooth", 0.04, 0, 0.15);
      tone(N.A4, "sawtooth", 0.04, 0.12, 0.15);
      tone(N.G4, "sawtooth", 0.03, 0.24, 0.15);
      tone(N.F4, "sawtooth", 0.03, 0.36, 0.3);
    } else if (type === "spirytus") {
      // Gulp gulp
      for (let i = 0; i < 3; i++) {
        tone(200 + i * 30, "sine", 0.08, i * 0.15, 0.1);
        tone(350 + i * 20, "sine", 0.04, i * 0.15 + 0.05, 0.08);
      }
    } else if (type === "bbqFlip") {
      // Sizzle
      const buf = noiseBuf(0.3, 0.08);
      const src = c.createBufferSource(); src.buffer = buf;
      const flt = c.createBiquadFilter(); flt.type = "bandpass"; flt.frequency.value = 4000; flt.Q.value = 2;
      const g = c.createGain(); g.gain.value = 0.06;
      src.connect(flt); flt.connect(g); g.connect(sfxGain); src.start();
    } else if (type === "pipeBake") {
      // Oven hum + ding
      tone(120, "sine", 0.04, 0, 0.5);
      tone(1400, "sine", 0.08, 0.4, 0.15);
    } else if (type === "pipeTemp") {
      // Temperature change click
      tone(1000, "sine", 0.05, 0, 0.03);
    } else if (type === "loadTest") {
      // Stress creak
      tone(150, "sawtooth", 0.04, 0, 0.2);
      tone(180, "sawtooth", 0.03, 0.15, 0.25);
    } else if (type === "loadPass") {
      // Structural integrity confirmed
      tone(N.C5, "sine", 0.08, 0, 0.15);
      tone(N.G5, "sine", 0.1, 0.12, 0.2);
    } else if (type === "loadFail") {
      // Crack/snap
      const buf = noiseBuf(0.15, 0.03);
      const src = c.createBufferSource(); src.buffer = buf;
      const g = c.createGain(); g.gain.value = 0.15;
      src.connect(g); g.connect(sfxGain); src.start();
      tone(200, "sawtooth", 0.06, 0.05, 0.3);
    } else if (type === "testFlight") {
      // Short flight whoosh
      const osc = c.createOscillator(); osc.type = "triangle";
      osc.frequency.setValueAtTime(300, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, c.currentTime + 0.3);
      osc.frequency.exponentialRampToValueAtTime(250, c.currentTime + 0.6);
      const g = c.createGain(); g.gain.setValueAtTime(0.06, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.7);
      osc.connect(g); g.connect(sfxGain);
      osc.start(); osc.stop(c.currentTime + 0.7);
    } else if (type === "cheer") {
      // Crowd cheer simulation
      for (let i = 0; i < 8; i++) {
        const buf = noiseBuf(0.4, 0.2);
        const src = c.createBufferSource(); src.buffer = buf;
        const flt = c.createBiquadFilter(); flt.type = "bandpass";
        flt.frequency.value = 800 + Math.random() * 600; flt.Q.value = 1;
        const g = c.createGain(); g.gain.value = 0.02;
        src.connect(flt); flt.connect(g); g.connect(sfxGain);
        src.start(c.currentTime + Math.random() * 0.15);
      }
    } else if (type === "hanami") {
      // Cherry blossom sparkle
      [N.E5, N.G5, N.A5, N.C6].forEach((f, i) => {
        tone(f, "sine", 0.05, i * 0.12, 0.3);
      });
    } else if (type === "yakitori") {
      // Skewer flip
      tone(500, "sine", 0.06, 0, 0.05);
      tone(700, "sine", 0.06, 0.04, 0.05);
      tone(500, "sine", 0.04, 0.08, 0.05);
    } else if (type === "timer") {
      // Countdown tick
      tone(1000, "sine", 0.06, 0, 0.03);
    }
  };

  return {
    playBgm, stopBgm, playSfx, getCtx,
    toggleMute: () => { muted = !muted; if (muted) { stopBgm(); } return muted; },
    isMuted: () => muted,
    setBgmVol: (v) => { if (bgmAudio) bgmAudio.volume = v; }
  };
})();

// ── FLIGHT DIALOGUE ──
const PILOT_LINES = [
  "機体は一流ってとこ見せてやるぜ！",
  "最高の景色だ！",
  "動け〜！俺の足！！",
  "まだいける…！",
  "琵琶湖でかい…！",
  "ペダルが重くなってきた…！",
  "風が気持ちいい…！",
  "みんなの1年が翼になってる！",
  "もうちょい…もうちょい…！",
];
const DESIGNER_LINES = [
  "がんばれ！",
  "さがってる！",
  "あげて！",
  "いい感じだ！",
  "風に乗ってる！",
  "ペース落とすな！",
  "いいぞその調子！",
  "高度安定してる！",
  "対岸見えてきた！",
];

// ── TEAM MEMBERS ──
const MEMBERS = [
  { name: "中村 航平", role: "部長", dept: "統括", em: "👔", per: "面倒見がいいリーダー" },
  { name: "高橋 結衣", role: "設計者", dept: "設計", em: "📐", per: "天才肌。こだわりが強い" },
  { name: "伊藤 蓮", role: "主翼PL", dept: "主翼", em: "🛩️", per: "几帳面で作業が丁寧" },
  { name: "渡辺 さくら", role: "尾翼PL", dept: "尾翼&操舵", em: "🎛️", per: "電装に強い理系女子" },
  { name: "小林 大地", role: "コックピットPL", dept: "コクピット", em: "🪑", per: "人間工学にこだわる" },
  { name: "加藤 美月", role: "フェアリングPL", dept: "フェアリング", em: "✨", per: "美大出身。造形の鬼" },
  { name: "松本 陸", role: "プロペラPL", dept: "プロペラ", em: "🌀", per: "流体力学オタク" },
  { name: "吉田 翼", role: "駆動PL", dept: "駆動", em: "⚙️", per: "メカに強い。口数は少ない" },
  { name: "山口 凛", role: "1年生", dept: "主翼", em: "🌱", per: "やる気満々の新入生" },
  { name: "石田 悠人", role: "1年生", dept: "フェアリング", em: "🌱", per: "不器用だけど根性がある" },
];

// ── PILOTS ──
const PILOTS = [
  { id: 0, name: "鈴木 翔太", h: 170, w: 58, sta: 85, ctrl: 70, desc: "自転車部出身。持久力◎ バランス型", em: "🚴" },
  { id: 1, name: "田中 美咲", h: 158, w: 48, sta: 65, ctrl: 90, desc: "軽量48kg＆操縦の天才。風を読む", em: "🎯" },
  { id: 2, name: "佐藤 健一", h: 180, w: 72, sta: 95, ctrl: 55, desc: "元陸上部。重いが馬力は圧倒的", em: "💪" },
  { id: 3, name: "山田 遥", h: 163, w: 52, sta: 75, ctrl: 80, desc: "3年目ベテラン。万能型パイロット", em: "⭐" },
];

const WINGS = [
  { id: "long", name: "長翼型", span: "32m", desc: "翼幅32m。低速安定。長距離向き。アスペクト比大", sM: .8, dM: 1.3, stM: 1.2 },
  { id: "mid", name: "標準翼型", span: "26m", desc: "翼幅26m。バランス重視。多くのチームが採用", sM: 1, dM: 1, stM: 1 },
  { id: "short", name: "短翼型", span: "20m", desc: "翼幅20m。高速型。体力消耗が激しい", sM: 1.3, dM: .7, stM: .8 },
];
const PROPS = [
  { id: "front", name: "前ペラ（牽引式）", desc: "安定性◎ 気流が翼に直接当たる", stM: 1.15, eM: .95 },
  { id: "mid", name: "中ペラ", desc: "駆動効率◎ 整備性に難あり", stM: 1, eM: 1.1 },
  { id: "rear", name: "後ペラ（推進式）", desc: "効率◎ 主流のDAE式配置", stM: .95, eM: 1.05 },
];
const RIDES = [
  { id: "rec", name: "リカンベント", desc: "空気抵抗↓ パワー伝達↑ 視界↓", drM: .85, pM: 1.1, vM: .9 },
  { id: "up", name: "アップライト", desc: "視界◎ 操縦しやすい 空気抵抗↑", drM: 1.1, pM: .95, vM: 1.15 },
];
const AIRFOILS = [
  { id: "dae11", name: "DAE11", desc: "高速域で高性能。失速角が小さい", lM: 1, dM: 1.05 },
  { id: "dae21", name: "DAE21", desc: "中間的な特性。扱いやすい", lM: 1.02, dM: 1 },
  { id: "dae31", name: "DAE31(定番)", desc: "低速安定型。穏やかな失速特性", lM: 1.05, dM: .97 },
  { id: "naca", name: "NACA4412", desc: "滑空機向きだが独特の味がある", lM: .95, dM: 1.02 },
  { id: "cust", name: "独自翼型に挑戦", desc: "XFOILで最適化！成功すれば最強…？", lM: 0, dM: 0 },
];
const WINDS = [
  { n: "無風", s: 0, d: "なし", m: 1 },
  { n: "微風(北東)", s: 1.5, d: "北東", m: .95 },
  { n: "軽風(南西)", s: 2.5, d: "南西", m: .85 },
  { n: "和風(北西)", s: 3.5, d: "北西", m: .7 },
  { n: "強風(南)", s: 5, d: "南", m: .4 },
];

// ── EVENTS with real names ──
const mkEv = () => [
  { n: "🌸 花見", d: `${pick(["松原公園","琵琶湖畔","大学キャンパス"])}で花見！${MEMBERS[0].name}の乾杯の挨拶で盛り上がった。`, e: "mor", v: 5 },
  { n: "💕 部内恋愛", d: `${MEMBERS[2].name}と${MEMBERS[5].name}が付き合い始めたらしい…！${MEMBERS[3].name}が「作業中にイチャつくな」と注意する一幕も。でも部の雰囲気は明るくなった。`, e: "mor", v: 3 },
  { n: "💔 破局の危機", d: `${MEMBERS[2].name}と${MEMBERS[5].name}がケンカ…。${MEMBERS[0].name}部長が間に入って仲裁。作業が半日止まった。部内の空気が重い。`, e: "mor", v: -8 },
  { n: "🍖 BBQ", d: `河原でBBQ！${MEMBERS[7].name}が黙々と肉を焼き続け「駆動班の火力管理」と称された。${MEMBERS[1].name}設計者は「炭の配置が非効率」とダメ出し。`, e: "sta", v: 3 },
  { n: "🎉 新入生歓迎会", d: `新入生が3人入部！${MEMBERS[8].name}と${MEMBERS[9].name}が「鳥人間、テレビで見てました！」と目を輝かせている。作業効率UP！`, e: "prg", v: 4 },
  { n: "🏕️ 秋合宿", d: `3泊4日の合宿！${MEMBERS[0].name}部長が「寝るな、作れ」と檄を飛ばす。${MEMBERS[8].name}は徹夜で初めてのリブ接着に成功。`, e: "prg", v: 8 },
  { n: "🍲 いも煮", d: `山形風いも煮会！${MEMBERS[4].name}の秘伝レシピが好評。${MEMBERS[9].name}が「大学生活で一番おいしい」と感動。`, e: "mor", v: 5 },
  { n: "🐻 いも煮(中止)", d: `⚠️ 熊出没警報！河川敷が封鎖され、いも煮は泣く泣く中止。${MEMBERS[6].name}が「熊にも空気抵抗はある」と謎の発言。`, e: "mor", v: -6 },
  { n: "⛷️ スキー合宿", d: `息抜きのスキー旅行！${MEMBERS[3].name}がまさかのスキー上手で一同驚愕。${MEMBERS[1].name}は「リフトの構造が気になる」と設計者魂。`, e: "mor", v: 6 },
  { n: "📝 卒論ラッシュ", d: `4年生の${MEMBERS[0].name}部長と${MEMBERS[1].name}設計者が卒論で多忙に。${MEMBERS[2].name}が「俺が現場を回す」と宣言。`, e: "prg", v: -10 },
  { n: "🏃 操縦訓練", d: `富士川滑空場でグライダー訓練。パイロットが「風の読み方がわかってきた」と手応え。`, e: "ctrl", v: 4 },
  { n: "🎓 OB訪問", d: `去年のパイロットOBが差し入れと助言に。「旋回時はラダーを早めに」とアドバイス。`, e: "ctrl", v: 3 },
  { n: "☔ 梅雨の湿気", d: `翼のフィルムが湿気で剥がれた…${MEMBERS[2].name}が徹夜で張り直し。「もう梅雨は嫌だ」とぼやく。`, e: "prg", v: -8 },
  { n: "🔧 工具破損", d: `ボール盤が壊れた！修理に3日。${MEMBERS[7].name}「部品が届くまで何もできない…」`, e: "prg", v: -5 },
  { n: "📸 取材が来た", d: `地元テレビ局が取材に！${MEMBERS[5].name}のフェアリングが「美しい」と褒められ、部全体の士気UP。`, e: "mor", v: 7 },
  { n: "🎵 作業用BGM論争", d: `${MEMBERS[6].name}「集中にはクラシック」vs ${MEMBERS[8].name}「やる気にはロック」論争が勃発。結局${MEMBERS[0].name}の鶴の一声で「各自イヤホン」に。`, e: "mor", v: 1 },
  { n: "🍜 深夜ラーメン", d: `徹夜作業後、${MEMBERS[0].name}が全員分のラーメンを奢る。「部長の財布が翼より軽くなった」と${MEMBERS[3].name}。`, e: "mor", v: 4 },
  { n: "💡 設計改善", d: `${MEMBERS[1].name}が翼端形状の改良案を思いつく。CFD解析の結果、誘導抗力が3%減。`, e: "prg", v: 3 },
  { n: "🏋️ 体力測定", d: `パイロットの体力測定。FTP(機能的出力閾値)が先月より5W向上！トレーニングの成果だ。`, e: "sta", v: 3 },
  { n: "🚫 部員脱退", d: `${MEMBERS[9].name}が「バイトが忙しくて…」と退部。${MEMBERS[0].name}部長「仕方ない…残ったメンバーで頑張ろう」`, e: "prg", v: -7 },
  { n: "💸 予算不足", d: `部費が底をつきかけている。カーボンプリプレグの追加購入を見送り。${MEMBERS[1].name}「設計変更で対応する」`, e: "prg", v: -6 },
  { n: "😤 部内対立", d: `${MEMBERS[1].name}設計者と${MEMBERS[6].name}プロペラ班が設計方針で衝突。「翼面荷重を下げろ」「いや推力が足りない」`, e: "mor", v: -7 },
  { n: "🤕 パイロット故障", d: `パイロットがトレーニング中に膝を痛めた。1週間の安静が必要。`, e: "sta", v: -6 },
  { n: "🌀 台風接近", d: `台風で作業場が浸水！完成済みパーツの一部にダメージ。${MEMBERS[2].name}「マジかよ…」`, e: "prg", v: -12 },
];

// ── AIRCRAFT SVG ──
function AircraftSVG({ wing, prop, ride, airfoil, size = 200, animate = true, noBg = false }) {
  const w = wing || "mid";
  const p = prop || "rear";
  const r = ride || "rec";
  // Wing half-spans (px) – determines visual width
  const wHS = { long: 88, mid: 68, short: 52 }[w];
  // Wing flex (how much tips curve upward)
  const wFlex = { long: 22, mid: 16, short: 10 }[w];
  // Rib count per side
  const ribN = { long: 10, mid: 8, short: 6 }[w];
  const cx = 120, fuseY = 72; // center of aircraft, fuselage Y
  const tailX = 18; // tail boom end
  const propXpos = { front: cx + 38, mid: cx - 10, rear: tailX + 4 }[p];
  const propR = { front: 13, mid: 11, rear: 12 }[p];
  // Fairing position (near wing, slightly forward)
  const fX = cx + (r === "rec" ? 2 : -2);
  const fY = fuseY + (r === "rec" ? 16 : 16);
  // wing curve: quadratic bezier from root to tip curving upward
  const wingPathR = `M ${cx},${fuseY - 4} Q ${cx + wHS * 0.6},${fuseY - 4 - wFlex * 0.5} ${cx + wHS},${fuseY - 4 - wFlex}`;
  const wingPathL = `M ${cx},${fuseY - 4} Q ${cx - wHS * 0.6},${fuseY - 4 - wFlex * 0.5} ${cx - wHS},${fuseY - 4 - wFlex}`;
  // Generate rib positions along wing curve
  const ribs = [];
  for (let i = 1; i <= ribN; i++) {
    const t = i / (ribN + 1);
    // quadratic bezier interpolation
    const ribXR = (1 - t) * (1 - t) * cx + 2 * (1 - t) * t * (cx + wHS * 0.6) + t * t * (cx + wHS);
    const ribYR = (1 - t) * (1 - t) * (fuseY - 4) + 2 * (1 - t) * t * (fuseY - 4 - wFlex * 0.5) + t * t * (fuseY - 4 - wFlex);
    const ribXL = (1 - t) * (1 - t) * cx + 2 * (1 - t) * t * (cx - wHS * 0.6) + t * t * (cx - wHS);
    const ribYL = ribYR; // symmetric
    ribs.push({ xR: ribXR, yR: ribYR, xL: ribXL, yL: ribYL, t });
  }
  // Wire attachment points (2 per side, at ~30% and ~60% span)
  const w1t = 0.3, w2t = 0.55;
  const wireR1x = (1 - w1t) ** 2 * cx + 2 * (1 - w1t) * w1t * (cx + wHS * 0.6) + w1t ** 2 * (cx + wHS);
  const wireR1y = (1 - w1t) ** 2 * (fuseY - 4) + 2 * (1 - w1t) * w1t * (fuseY - 4 - wFlex * 0.5) + w1t ** 2 * (fuseY - 4 - wFlex);
  const wireR2x = (1 - w2t) ** 2 * cx + 2 * (1 - w2t) * w2t * (cx + wHS * 0.6) + w2t ** 2 * (cx + wHS);
  const wireR2y = (1 - w2t) ** 2 * (fuseY - 4) + 2 * (1 - w2t) * w2t * (fuseY - 4 - wFlex * 0.5) + w2t ** 2 * (fuseY - 4 - wFlex);
  const wireAnchorX = cx, wireAnchorY = fuseY + 8;
  // Conventional tail (horizontal stabilizer near tail boom)
  const tvX = tailX, tvBot = fuseY, tvTop = fuseY - 22;
  const thHalf = 14;
  const hStabY = fuseY - 4; // horizontal stabilizer sits near the boom
  // Airfoil-dependent wing color tint
  const wingFill = { dae11: "rgba(100,180,255,0.12)", dae21: "rgba(140,200,255,0.10)", dae31: "rgba(180,220,255,0.08)", naca: "rgba(200,200,180,0.10)", cust: "rgba(255,180,100,0.12)" }[airfoil] || "rgba(180,220,255,0.08)";
  const wingStroke = "rgba(255,255,255,0.75)";
  const ribColor = "rgba(255,255,255,0.22)";
  const wireColor = "rgba(200,200,200,0.35)";
  const uid = `hpa_${w}_${p}_${r}`;
  return (
    <svg viewBox="0 0 240 130" width={size} height={size * 0.54} style={{ display: "block", margin: "0 auto" }}>
      <defs>
        <linearGradient id={`${uid}_sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6eb5e0" stopOpacity="0.35" />
          <stop offset="55%" stopColor="#a8d8ea" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#1a6fa0" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id={`${uid}_fair`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8f0ff" />
          <stop offset="50%" stopColor="#b8d4f0" />
          <stop offset="100%" stopColor="#8ab4d8" />
        </linearGradient>
        <linearGradient id={`${uid}_wfill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
          <stop offset="100%" stopColor={wingFill} />
        </linearGradient>
      </defs>
      {/* Background */}
      {!noBg && <rect width="240" height="130" fill={`url(#${uid}_sky)`} rx="8" />}
      {/* Lake shimmer */}
      {!noBg && <>
        <rect x="0" y="96" width="240" height="34" fill="rgba(26,111,160,0.2)" rx="0" />
        <line x1="10" y1="105" x2="50" y2="105" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
        <line x1="70" y1="110" x2="100" y2="110" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        <line x1="140" y1="108" x2="190" y2="108" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
      </>}

      {/* ──── WIRE BRACING (behind wing) ──── */}
      <line x1={wireAnchorX} y1={wireAnchorY} x2={wireR1x} y2={wireR1y} stroke={wireColor} strokeWidth="0.5" strokeDasharray="2,1.5" />
      <line x1={wireAnchorX} y1={wireAnchorY} x2={wireR2x} y2={wireR2y} stroke={wireColor} strokeWidth="0.5" strokeDasharray="2,1.5" />
      <line x1={wireAnchorX} y1={wireAnchorY} x2={cx - (wireR1x - cx)} y2={wireR1y} stroke={wireColor} strokeWidth="0.5" strokeDasharray="2,1.5" />
      <line x1={wireAnchorX} y1={wireAnchorY} x2={cx - (wireR2x - cx)} y2={wireR2y} stroke={wireColor} strokeWidth="0.5" strokeDasharray="2,1.5" />
      {/* Wire kingpost (small mast above wing center) */}
      <line x1={cx} y1={fuseY - 4} x2={cx} y2={fuseY - 14} stroke="rgba(255,255,255,0.3)" strokeWidth="0.7" />
      <line x1={cx} y1={fuseY - 14} x2={wireR1x} y2={wireR1y} stroke={wireColor} strokeWidth="0.4" />
      <line x1={cx} y1={fuseY - 14} x2={cx - (wireR1x - cx)} y2={wireR1y} stroke={wireColor} strokeWidth="0.4" />

      {/* ──── TAIL BOOM (thin CFRP tube) ──── */}
      <line x1={tailX} y1={fuseY} x2={cx + 42} y2={fuseY} stroke="#3a3a4a" strokeWidth="1.2" />
      <line x1={tailX} y1={fuseY} x2={cx + 42} y2={fuseY} stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />

      {/* ──── TAIL ──── */}
      {/* Vertical stabilizer (fin) */}
      <path d={`M ${tvX},${tvBot} L ${tvX - 1},${tvTop + 2} L ${tvX + 2},${tvTop}`} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" strokeLinecap="round" />
      {/* Horizontal stabilizer (near tail boom) */}
      <line x1={tvX - thHalf} y1={hStabY} x2={tvX + thHalf} y2={hStabY} stroke="rgba(255,255,255,0.65)" strokeWidth="1.3" strokeLinecap="round" />
      {/* Tail rib detail */}
      <line x1={tvX - thHalf * 0.5} y1={hStabY} x2={tvX - thHalf * 0.5} y2={hStabY + 1.5} stroke={ribColor} strokeWidth="0.4" />
      <line x1={tvX + thHalf * 0.5} y1={hStabY} x2={tvX + thHalf * 0.5} y2={hStabY + 1.5} stroke={ribColor} strokeWidth="0.4" />
      {/* Rudder hinge line */}
      <line x1={tvX} y1={tvTop + 4} x2={tvX} y2={tvBot - 3} stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" strokeDasharray="1,1" />

      {/* ──── MAIN WING (curved, with ribs) ──── */}
      {/* Wing surface fill - right */}
      <path d={`${wingPathR} L ${cx + wHS},${fuseY - 2 - wFlex} Q ${cx + wHS * 0.6},${fuseY - 2 - wFlex * 0.5} ${cx},${fuseY - 2} Z`} fill={`url(#${uid}_wfill)`} opacity="0.6" />
      {/* Wing surface fill - left */}
      <path d={`${wingPathL} L ${cx - wHS},${fuseY - 2 - wFlex} Q ${cx - wHS * 0.6},${fuseY - 2 - wFlex * 0.5} ${cx},${fuseY - 2} Z`} fill={`url(#${uid}_wfill)`} opacity="0.6" />
      {/* Leading edge - right */}
      <path d={wingPathR} fill="none" stroke={wingStroke} strokeWidth="1.3" strokeLinecap="round" />
      {/* Trailing edge - right */}
      <path d={`M ${cx},${fuseY - 2} Q ${cx + wHS * 0.6},${fuseY - 2 - wFlex * 0.5} ${cx + wHS},${fuseY - 2 - wFlex}`} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
      {/* Leading edge - left */}
      <path d={wingPathL} fill="none" stroke={wingStroke} strokeWidth="1.3" strokeLinecap="round" />
      {/* Trailing edge - left */}
      <path d={`M ${cx},${fuseY - 2} Q ${cx - wHS * 0.6},${fuseY - 2 - wFlex * 0.5} ${cx - wHS},${fuseY - 2 - wFlex}`} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
      {/* Ribs */}
      {ribs.map((rb, i) => (
        <g key={i}>
          <line x1={rb.xR} y1={rb.yR - 1} x2={rb.xR} y2={rb.yR + 2} stroke={ribColor} strokeWidth="0.5" />
          <line x1={rb.xL} y1={rb.yL - 1} x2={rb.xL} y2={rb.yL + 2} stroke={ribColor} strokeWidth="0.5" />
        </g>
      ))}
      {/* Wing tip endplates (subtle) */}
      <line x1={cx + wHS} y1={fuseY - 5 - wFlex} x2={cx + wHS} y2={fuseY - wFlex + 1} stroke="rgba(255,255,255,0.3)" strokeWidth="0.6" />
      <line x1={cx - wHS} y1={fuseY - 5 - wFlex} x2={cx - wHS} y2={fuseY - wFlex + 1} stroke="rgba(255,255,255,0.3)" strokeWidth="0.6" />
      {/* Spar line through wing center */}
      <path d={`M ${cx - wHS},${fuseY - 3 - wFlex} Q ${cx - wHS * 0.6},${fuseY - 3 - wFlex * 0.5} ${cx},${fuseY - 3} Q ${cx + wHS * 0.6},${fuseY - 3 - wFlex * 0.5} ${cx + wHS},${fuseY - 3 - wFlex}`} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />

      {/* ──── FAIRING / COCKPIT ──── */}
      {r === "rec" ? (
        <g>
          {/* Recumbent fairing - elongated teardrop */}
          <ellipse cx={fX} cy={fY} rx="16" ry="7.5" fill={`url(#${uid}_fair)`} stroke="rgba(100,160,220,0.6)" strokeWidth="0.8" />
          {/* Canopy window */}
          <ellipse cx={fX + 4} cy={fY - 2} rx="7" ry="3.5" fill="rgba(100,180,255,0.2)" stroke="rgba(150,200,255,0.4)" strokeWidth="0.5" />
          {/* Design accent stripe */}
          <path d={`M ${fX - 12},${fY + 1} Q ${fX},${fY + 5} ${fX + 14},${fY - 1}`} fill="none" stroke="rgba(59,130,200,0.5)" strokeWidth="1" />
          {/* Pilot head visible through canopy */}
          <circle cx={fX + 3} cy={fY - 1} r="2.2" fill="rgba(240,180,100,0.7)" />
        </g>
      ) : (
        <g>
          {/* Upright fairing - taller, more boxy */}
          <path d={`M ${fX - 10},${fY + 8} Q ${fX - 12},${fY - 4} ${fX - 4},${fY - 12} L ${fX + 6},${fY - 12} Q ${fX + 12},${fY - 4} ${fX + 10},${fY + 8} Z`} fill={`url(#${uid}_fair)`} stroke="rgba(100,160,220,0.6)" strokeWidth="0.8" />
          {/* Window */}
          <path d={`M ${fX - 2},${fY - 11} L ${fX + 5},${fY - 11} Q ${fX + 8},${fY - 5} ${fX + 5},${fY - 2} L ${fX - 2},${fY - 2} Q ${fX - 5},${fY - 5} ${fX - 2},${fY - 11}`} fill="rgba(100,180,255,0.2)" stroke="rgba(150,200,255,0.3)" strokeWidth="0.4" />
          {/* Pilot head */}
          <circle cx={fX + 1} cy={fY - 7} r="2.5" fill="rgba(240,180,100,0.7)" />
          {/* Body hint */}
          <line x1={fX + 1} y1={fY - 4} x2={fX + 1} y2={fY + 3} stroke="rgba(240,180,100,0.35)" strokeWidth="1" />
        </g>
      )}

      {/* ──── PROPELLER ──── */}
      <g>
        <circle cx={propXpos} cy={fuseY} r="1.5" fill="rgba(120,120,140,0.8)" />
        <g>
          {animate && <animateTransform attributeName="transform" type="rotate" from={`0 ${propXpos} ${fuseY}`} to={`360 ${propXpos} ${fuseY}`} dur="0.25s" repeatCount="indefinite" />}
          {/* 2-blade propeller */}
          <ellipse cx={propXpos} cy={fuseY - propR * 0.55} rx="1.2" ry={propR * 0.55} fill="rgba(255,255,255,0.55)" transform={`rotate(-8,${propXpos},${fuseY - propR * 0.55})`} />
          <ellipse cx={propXpos} cy={fuseY + propR * 0.55} rx="1.2" ry={propR * 0.55} fill="rgba(255,255,255,0.55)" transform={`rotate(8,${propXpos},${fuseY + propR * 0.55})`} />
        </g>
      </g>

      {/* ──── LANDING GEAR (small, for ground scenes) ──── */}
      <line x1={fX - 3} y1={fY + 7} x2={fX - 5} y2={fY + 11} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
      <circle cx={fX - 5} cy={fY + 12} r="1" fill="rgba(255,255,255,0.15)" />

      {/* ──── SPEC LABEL ──── */}
      {!noBg && <text x="120" y="124" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.3)" fontFamily="'DotGothic16',monospace">
        {airfoil === "cust" ? "独自翼型" : airfoil?.toUpperCase() || ""}{wing ? ` / ${WINGS.find(x=>x.id===wing)?.span||""}` : ""}
      </text>}
    </svg>
  );
}

// ── UI COMPONENTS ──
function Btn({ children, onClick, color = C.acc, disabled, small, wide, style: sx }) {
  return <button onClick={disabled ? undefined : (e) => { AudioSys.playSfx("click"); onClick && onClick(e); }} style={{
    fontFamily: "'DotGothic16',monospace", fontSize: small ? 11 : 13,
    padding: small ? "5px 10px" : "9px 16px", background: disabled ? C.gryD : color, color: C.wht,
    border: `2px solid ${disabled ? C.gry : "rgba(255,255,255,0.25)"}`, borderRadius: 4,
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
    width: wide ? "100%" : "auto", boxShadow: disabled ? "none" : "0 3px 0 rgba(0,0,0,0.4)",
    textShadow: "1px 1px 0 rgba(0,0,0,0.5)", letterSpacing: 1, ...sx,
  }}>{children}</button>;
}
function Bar({ label, val, max = 100, color = C.grn }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
    <span style={{ fontSize: 10, color: C.dim, width: 48, textAlign: "right", fontFamily: "'DotGothic16',monospace" }}>{label}</span>
    <div style={{ flex: 1, height: 9, background: C.bg2, borderRadius: 2, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ width: `${clamp(val / max * 100, 0, 100)}%`, height: "100%", background: `linear-gradient(90deg,${color},${color}77)`, transition: "width 0.4s", borderRadius: 2 }} />
    </div>
    <span style={{ fontSize: 10, color: C.txt, width: 26, fontFamily: "'DotGothic16',monospace" }}>{Math.round(val)}</span>
  </div>;
}
function Box({ title, children, style: sx }) {
  return <div style={{ background: C.pnl2, border: "2px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: 12, marginBottom: 10, ...sx }}>
    {title && <div style={{ fontSize: 12, color: C.gold, marginBottom: 7, fontFamily: "'DotGothic16',monospace", textShadow: "1px 1px 0 rgba(0,0,0,0.5)", borderBottom: `1px solid ${C.gold}22`, paddingBottom: 4 }}>◆ {title}</div>}
    {children}
  </div>;
}
function Dlg({ text, onClose, choices }) {
  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}>
    <div style={{ background: "linear-gradient(180deg,#2a3a5e,#1a2a4e)", border: "3px solid #ffd700", borderRadius: 8, padding: 18, maxWidth: 340, width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
      <div style={{ fontFamily: "'DotGothic16',monospace", fontSize: 12, color: C.txt, lineHeight: 1.8, marginBottom: 14, whiteSpace: "pre-wrap" }}>{text}</div>
      {choices ? <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {choices.map((c, i) => <Btn key={i} onClick={c.fn} color={c.c || C.acc} wide>{c.l}</Btn>)}
      </div> : <div style={{ textAlign: "center" }}><Btn onClick={onClose}>OK</Btn></div>}
    </div>
  </div>;
}

// ── JANKEN (じゅーじゃん) ──
const HANDS = [
  { id: "guu", name: "グー", em: "✊", beats: "choki" },
  { id: "choki", name: "チョキ", em: "✌️", beats: "paa" },
  { id: "paa", name: "パー", em: "🖐️", beats: "guu" },
];
function JankenDlg({ jk, onPick, onClose }) {
  const oppH = jk.oppHand ? HANDS.find(h => h.id === jk.oppHand) : null;
  const myH = jk.myHand ? HANDS.find(h => h.id === jk.myHand) : null;
  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
    <div style={{ background: "linear-gradient(180deg,#1a2848,#142040)", border: "3px solid #f5a623", borderRadius: 10, padding: 20, maxWidth: 340, width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.7)", fontFamily: "'DotGothic16',monospace" }}>
      <div style={{ textAlign: "center", fontSize: 13, color: "#f5a623", marginBottom: 4 }}>🧃 ジューじゃん！</div>
      <div style={{ textAlign: "center", fontSize: 10, color: C.dim, marginBottom: 14 }}>負けた人が自販機でジュースおごり(150円)</div>
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: C.dim, marginBottom: 2 }}>相手: {jk.opp}</div>
        <div style={{ fontSize: 48, marginBottom: 4 }}>{jk.phase === "result" ? oppH?.em : "❓"}</div>
      </div>
      <div style={{ textAlign: "center", fontSize: 10, color: C.dim }}>─── VS ───</div>
      {jk.phase === "pick" ? <>
        <div style={{ textAlign: "center", fontSize: 10, color: C.wht, margin: "8px 0" }}>じゃんけん…</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          {HANDS.map(h => (
            <div key={h.id} onClick={() => onPick(h.id)}
              style={{ cursor: "pointer", textAlign: "center", background: C.bg3, borderRadius: 8, padding: "10px 16px", border: "2px solid rgba(255,255,255,0.1)", transition: "border-color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#f5a623"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
            >
              <div style={{ fontSize: 36 }}>{h.em}</div>
              <div style={{ fontSize: 10, color: C.wht, marginTop: 2 }}>{h.name}</div>
            </div>
          ))}
        </div>
      </> : <>
        <div style={{ textAlign: "center", margin: "10px 0" }}>
          <div style={{ fontSize: 48 }}>{myH?.em}</div>
          <div style={{ fontSize: 10, color: C.wht }}>あなた: {myH?.name}</div>
        </div>
        <div style={{ textAlign: "center", fontSize: 18, color: jk.result === "win" ? C.gold : jk.result === "lose" ? C.acc : C.gry, marginBottom: 6, textShadow: "1px 1px 0 rgba(0,0,0,0.5)" }}>
          {jk.result === "win" ? "🎉 勝ち！ラッキー！" : jk.result === "lose" ? "😭 負け…おごりだ…" : "😐 あいこ！"}
        </div>
        <div style={{ textAlign: "center", fontSize: 10, color: C.dim, marginBottom: 12 }}>
          {jk.result === "win" ? `${jk.opp}がしぶしぶ自販機へ…。タダで飲むジュースは最高！` : jk.result === "lose" ? "財布から150円が消えていく…。次は勝つ！" : "もう一回やる？…いや、作業に戻ろう。"}
        </div>
        <div style={{ textAlign: "center" }}><Btn onClick={onClose}>OK</Btn></div>
      </>}
    </div>
  </div>;
}

// ── SPIRYTUS DRINKING GAME (芋煮前夜祭) ──
function SpiritsDlg({ sprt, onMash, onStart, onClose }) {
  const { phase, cups, timer } = sprt;
  const rank = cups >= 12 ? "伝説" : cups >= 8 ? "豪傑" : cups >= 5 ? "いける口" : cups >= 2 ? "ほどほど" : "下戸";
  const rankC = cups >= 12 ? "#ff4444" : cups >= 8 ? "#ff8800" : cups >= 5 ? "#ffd700" : cups >= 2 ? "#88bb88" : "#888888";
  const faces = cups >= 12 ? "🤮🤮🤮" : cups >= 8 ? "🥴🥴" : cups >= 5 ? "😆" : cups >= 2 ? "😊" : "🫣";
  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
    <div style={{ background: "linear-gradient(180deg,#3a1a1a,#2a1010)", border: "3px solid #ff6633", borderRadius: 10, padding: 20, maxWidth: 340, width: "100%", boxShadow: "0 8px 32px rgba(255,60,0,0.3)", fontFamily: "'DotGothic16',monospace" }}>
      <div style={{ textAlign: "center", fontSize: 14, color: "#ff8844", marginBottom: 2 }}>🍶 芋煮前夜祭</div>
      <div style={{ textAlign: "center", fontSize: 9, color: "#cc8866", marginBottom: 12 }}>スピリタス(96度)で乾杯！何杯イケる？</div>

      {phase === "intro" && <>
        <div style={{ textAlign: "center", fontSize: 60, marginBottom: 10 }}>🍶</div>
        <div style={{ textAlign: "center", fontSize: 10, color: "#ffaa88", lineHeight: 1.8, marginBottom: 12 }}>
          中村航平「明日の芋煮に備えて…まずは前夜祭だ！」<br />
          松本陸「スピリタスはポーランドの96度ウォッカ…」<br />
          加藤美月「知識はいいから飲め」
        </div>
        <div style={{ textAlign: "center", fontSize: 9, color: "#ff6644", marginBottom: 10 }}>⚡ 5秒間ボタン連打で杯を重ねろ！</div>
        <div style={{ textAlign: "center" }}><Btn onClick={onStart} color="#ff6633">🔥 いくぞ！</Btn></div>
      </>}

      {phase === "mash" && <>
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 48, color: "#ffd700", textShadow: "0 0 20px rgba(255,200,0,0.5)" }}>{cups}杯</div>
          <div style={{ fontSize: 28, margin: "4px 0" }}>{cups === 0 ? "🍶" : cups < 4 ? "😊🍶" : cups < 8 ? "😆🍶🔥" : "🥴🍶🔥🔥"}</div>
        </div>
        {/* Timer bar */}
        <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ width: `${(timer / 5) * 100}%`, height: "100%", background: timer > 2 ? "#ff8844" : "#ff4444", borderRadius: 4, transition: "width 0.1s linear" }} />
        </div>
        <div style={{ textAlign: "center" }}>
          <div onClick={onMash}
            style={{ display: "inline-block", cursor: "pointer", background: "linear-gradient(180deg,#ff4422,#cc2200)", color: "#fff", fontWeight: "bold", fontSize: 16, padding: "16px 40px", borderRadius: 10, border: "3px solid #ff8866", userSelect: "none", WebkitUserSelect: "none", boxShadow: "0 4px 12px rgba(255,60,0,0.4)", transition: "transform 0.05s", active: { transform: "scale(0.95)" } }}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.92)"}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
            onTouchStart={e => { e.preventDefault(); e.currentTarget.style.transform = "scale(0.92)"; onMash(); }}
            onTouchEnd={e => e.currentTarget.style.transform = "scale(1)"}
          >🍶 飲む！！</div>
        </div>
        <div style={{ textAlign: "center", fontSize: 9, color: "#cc6644", marginTop: 6 }}>残り {timer.toFixed(1)}秒</div>
      </>}

      {phase === "result" && <>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 48 }}>{faces}</div>
          <div style={{ fontSize: 36, color: rankC, textShadow: `0 0 15px ${rankC}55`, margin: "6px 0" }}>{cups}杯</div>
          <div style={{ fontSize: 14, color: rankC, marginBottom: 6 }}>【{rank}】</div>
        </div>
        <div style={{ fontSize: 10, color: "#ffaa88", lineHeight: 1.8, textAlign: "center", marginBottom: 10 }}>
          {cups >= 12 ? `伊藤蓮「おい大丈夫か…！？」\n翌日の芋煮、半分の記憶がない。\nでもチームの絆は鋼のように固くなった。` :
           cups >= 8 ? `高橋結衣「あんた意外と飲めるね」\n翌日は二日酔いだが、いい夜だった。\n部の結束が深まった。` :
           cups >= 5 ? `渡辺さくら「ちょうどいい感じじゃん」\nいい気分で芋煮の仕込みを手伝った。\nバランスの良い夜。` :
           cups >= 2 ? `石田悠人「僕もう無理です…」\nほどほどに楽しんで早めに就寝。\n翌日の体調は万全。` :
           `山口凛「え、1杯も…？」\nスピリタスの匂いだけで無理だった。\n…まあ、お酒は二十歳になってから。`}
        </div>
        <div style={{ fontSize: 9, color: "#888", textAlign: "center", marginBottom: 10 }}>
          {cups >= 12 ? "士気+12 体力-4 所持金-300" :
           cups >= 8 ? "士気+8 体力-2 所持金-200" :
           cups >= 5 ? "士気+5 所持金-100" :
           cups >= 2 ? "士気+2" :
           "（変化なし）"}
        </div>
        <div style={{ textAlign: "center" }}><Btn onClick={onClose}>OK</Btn></div>
      </>}
    </div>
  </div>;
}

// ── 🌸 HANAMI MINI-GAME (花咲かせ / 春) ──
function HanamiDlg({ data, onTap, onStart, onClose }) {
  const { phase, flowers, timer } = data;
  const rank = flowers >= 20 ? "満開" : flowers >= 12 ? "七分咲き" : flowers >= 6 ? "三分咲き" : "つぼみ";
  const rankC = flowers >= 20 ? "#ffaacc" : flowers >= 12 ? "#ff88aa" : flowers >= 6 ? "#cc8899" : "#888";
  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
    <div style={{ background: "linear-gradient(180deg,#2a1a2a,#1a1020)", border: "3px solid #ff88bb", borderRadius: 10, padding: 20, maxWidth: 340, width: "100%", boxShadow: "0 8px 32px rgba(255,100,180,0.2)", fontFamily: "'DotGothic16',monospace" }}>
      <div style={{ textAlign: "center", fontSize: 14, color: "#ff88bb", marginBottom: 2 }}>🌸 お花見大作戦</div>
      <div style={{ textAlign: "center", fontSize: 9, color: "#cc88aa", marginBottom: 12 }}>花が足りない！部員総出で咲かせろ！</div>
      {phase === "intro" && <>
        <div style={{ textAlign: "center", fontSize: 60, marginBottom: 10 }}>🌳</div>
        <div style={{ textAlign: "center", fontSize: 10, color: "#ffaacc", lineHeight: 1.8, marginBottom: 12 }}>
          加藤美月「え、桜がまだ全然咲いてないんだけど…」<br />
          中村航平「気合いで咲かせるぞ！」<br />
          高橋結衣「非科学的すぎる」
        </div>
        <div style={{ textAlign: "center", fontSize: 9, color: "#ff88bb", marginBottom: 10 }}>⚡ 5秒間連打で花を咲かせろ！</div>
        <div style={{ textAlign: "center" }}><Btn onClick={onStart} color="#ff66aa">🌸 咲かせるぞ！</Btn></div>
      </>}
      {phase === "play" && <>
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 42, color: "#ffccdd", textShadow: "0 0 15px rgba(255,150,200,0.4)" }}>{flowers}輪</div>
          <div style={{ fontSize: 24, margin: "4px 0", letterSpacing: 2 }}>{"🌸".repeat(Math.min(flowers, 15))}{flowers < 5 ? "🌳" : ""}</div>
        </div>
        <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ width: `${(timer / 5) * 100}%`, height: "100%", background: "#ff88bb", borderRadius: 4, transition: "width 0.1s" }} />
        </div>
        <div style={{ textAlign: "center" }}>
          <div onClick={onTap}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.92)"}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
            onTouchStart={e => { e.preventDefault(); e.currentTarget.style.transform = "scale(0.92)"; onTap(); }}
            onTouchEnd={e => e.currentTarget.style.transform = "scale(1)"}
            style={{ display: "inline-block", cursor: "pointer", background: "linear-gradient(180deg,#ff66aa,#cc3388)", color: "#fff", fontWeight: "bold", fontSize: 16, padding: "16px 40px", borderRadius: 10, border: "3px solid #ffaacc", userSelect: "none", WebkitUserSelect: "none", boxShadow: "0 4px 12px rgba(255,100,180,0.3)" }}
          >🌸 咲け！！</div>
        </div>
        <div style={{ textAlign: "center", fontSize: 9, color: "#cc88aa", marginTop: 6 }}>残り {timer.toFixed(1)}秒</div>
      </>}
      {phase === "result" && <>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 40 }}>{flowers >= 20 ? "🌸🌸🌸" : flowers >= 12 ? "🌸🌸" : flowers >= 6 ? "🌸" : "🌳"}</div>
          <div style={{ fontSize: 30, color: rankC, margin: "6px 0" }}>{flowers}輪</div>
          <div style={{ fontSize: 14, color: rankC }}>【{rank}】</div>
        </div>
        <div style={{ fontSize: 10, color: "#ffaacc", lineHeight: 1.8, textAlign: "center", marginBottom: 10 }}>
          {flowers >= 20 ? "圧巻の満開！最高の花見になった。\n部員全員テンション爆上がり！" :
           flowers >= 12 ? "なかなかの咲きっぷり。\n花の下で乾杯！いい気分。" :
           flowers >= 6 ? "まあまあ咲いた。\n「来年はもっと早く場所取りしよう」" :
           "ほぼ咲かず…。花より団子で過ごした。"}
        </div>
        <div style={{ fontSize: 9, color: "#888", textAlign: "center", marginBottom: 10 }}>
          {flowers >= 20 ? "士気+10" : flowers >= 12 ? "士気+6" : flowers >= 6 ? "士気+3" : "士気+1"}
        </div>
        <div style={{ textAlign: "center" }}><Btn onClick={onClose}>OK</Btn></div>
      </>}
    </div>
  </div>;
}

// ── 🥩 BBQ MINI-GAME (肉焼き / 夏) ──
function BbqDlg({ data, onFlip, onStart, onClose }) {
  const { phase, pos, result } = data;
  // pos: 0-100, green zone 35-65
  const inZone = pos >= 35 && pos <= 65;
  const zoneLabel = pos < 35 ? "🩸 生焼け…" : pos > 65 ? "🔥 焦げた…" : "✅ ナイス焼き加減！";
  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
    <div style={{ background: "linear-gradient(180deg,#2a1a0a,#1a1005)", border: "3px solid #ff8833", borderRadius: 10, padding: 20, maxWidth: 340, width: "100%", boxShadow: "0 8px 32px rgba(255,120,30,0.25)", fontFamily: "'DotGothic16',monospace" }}>
      <div style={{ textAlign: "center", fontSize: 14, color: "#ff8833", marginBottom: 2 }}>🥩 BBQ大会</div>
      <div style={{ textAlign: "center", fontSize: 9, color: "#cc8855", marginBottom: 12 }}>ちゃんと焼かないと食中毒だぞ！</div>
      {phase === "intro" && <>
        <div style={{ textAlign: "center", fontSize: 60, marginBottom: 10 }}>🥩</div>
        <div style={{ textAlign: "center", fontSize: 10, color: "#ffaa66", lineHeight: 1.8, marginBottom: 12 }}>
          吉田翼「…肉、焼くか」(黙々)<br />
          石田悠人「焼き加減むずかしいんですよね」<br />
          高橋結衣「生焼けだけは勘弁して。設計作業に支障が出る」
        </div>
        <div style={{ textAlign: "center", fontSize: 9, color: "#ff8833", marginBottom: 10 }}>🎯 バーが緑ゾーンにある時に「ひっくり返す」を押せ！</div>
        <div style={{ textAlign: "center" }}><Btn onClick={onStart} color="#ff6622">🔥 焼き始める！</Btn></div>
      </>}
      {phase === "play" && <>
        <div style={{ textAlign: "center", fontSize: 36, marginBottom: 8 }}>{pos < 35 ? "🥩💧" : pos > 65 ? "🥩🔥" : "🥩✨"}</div>
        {/* Timing bar */}
        <div style={{ position: "relative", height: 30, background: "rgba(255,255,255,0.08)", borderRadius: 6, overflow: "hidden", marginBottom: 10, border: "2px solid #555" }}>
          {/* danger zones */}
          <div style={{ position: "absolute", left: 0, width: "35%", height: "100%", background: "rgba(255,50,50,0.15)" }} />
          <div style={{ position: "absolute", right: 0, width: "35%", height: "100%", background: "rgba(255,50,50,0.15)" }} />
          {/* green zone */}
          <div style={{ position: "absolute", left: "35%", width: "30%", height: "100%", background: "rgba(50,255,50,0.18)", borderLeft: "2px dashed #4a4", borderRight: "2px dashed #4a4" }} />
          {/* cursor */}
          <div style={{ position: "absolute", left: `${pos}%`, top: 0, width: 4, height: "100%", background: "#fff", borderRadius: 2, transition: "left 0.02s linear", boxShadow: "0 0 8px rgba(255,255,255,0.5)" }} />
          <div style={{ position: "absolute", top: 2, left: 4, fontSize: 7, color: "#f66" }}>生</div>
          <div style={{ position: "absolute", top: 2, left: "46%", fontSize: 7, color: "#6f6" }}>OK</div>
          <div style={{ position: "absolute", top: 2, right: 4, fontSize: 7, color: "#f66" }}>焦</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div onClick={onFlip}
            style={{ display: "inline-block", cursor: "pointer", background: "linear-gradient(180deg,#ff8833,#cc5500)", color: "#fff", fontWeight: "bold", fontSize: 16, padding: "14px 36px", borderRadius: 10, border: "3px solid #ffaa66", userSelect: "none", WebkitUserSelect: "none", boxShadow: "0 4px 12px rgba(255,100,20,0.3)" }}
          >🔄 ひっくり返す！</div>
        </div>
      </>}
      {phase === "result" && <>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 48 }}>{result === "ok" ? "🥩👍" : result === "raw" ? "🤢" : "🥩💀"}</div>
          <div style={{ fontSize: 16, color: result === "ok" ? "#66ff66" : "#ff4444", margin: "8px 0" }}>
            {result === "ok" ? "完璧な焼き加減！" : result === "raw" ? "生焼け…食中毒発生！" : "黒焦げ…食中毒発生！"}
          </div>
        </div>
        <div style={{ fontSize: 10, color: "#ffaa66", lineHeight: 1.8, textAlign: "center", marginBottom: 10 }}>
          {result === "ok"
            ? `吉田翼「…完璧」(親指を立てる)\n美味い肉でパワーチャージ！`
            : result === "raw"
            ? `石田悠人「お腹痛い…」\n半数が腹を壊し、来週の作業がストップ…`
            : `松本陸「炭になってるぞこれ」\n無理して食べた結果、来週の作業がストップ…`}
        </div>
        <div style={{ fontSize: 9, color: "#888", textAlign: "center", marginBottom: 10 }}>
          {result === "ok" ? "体力+5 士気+4" : "⚠️ 来週の作業が1週ストップ 士気-5"}
        </div>
        <div style={{ textAlign: "center" }}><Btn onClick={onClose}>OK</Btn></div>
      </>}
    </div>
  </div>;
}

// ── 🍗 YAKITORI MINI-GAME (文化祭焼き鳥 / 秋) ──
function YakitoriDlg({ data, onTap, onStart, onClose }) {
  const { phase, skewers, timer } = data;
  const earnings = skewers * 50;
  const rank = skewers >= 25 ? "完売御礼" : skewers >= 15 ? "大繁盛" : skewers >= 8 ? "まあまあ" : "閑古鳥";
  const rankC = skewers >= 25 ? "#ffd700" : skewers >= 15 ? "#ff8833" : skewers >= 8 ? "#88aa88" : "#888";
  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
    <div style={{ background: "linear-gradient(180deg,#2a2010,#1a1508)", border: "3px solid #ffaa33", borderRadius: 10, padding: 20, maxWidth: 340, width: "100%", boxShadow: "0 8px 32px rgba(255,170,50,0.2)", fontFamily: "'DotGothic16',monospace" }}>
      <div style={{ textAlign: "center", fontSize: 14, color: "#ffaa33", marginBottom: 2 }}>🍗 文化祭 焼き鳥屋台</div>
      <div style={{ textAlign: "center", fontSize: 9, color: "#ccaa66", marginBottom: 12 }}>部費を稼げ！焼いて焼いて焼きまくれ！</div>
      {phase === "intro" && <>
        <div style={{ textAlign: "center", fontSize: 60, marginBottom: 10 }}>🍗</div>
        <div style={{ textAlign: "center", fontSize: 10, color: "#ffcc88", lineHeight: 1.8, marginBottom: 12 }}>
          中村航平「文化祭の売上は部費に直結する！」<br />
          渡辺さくら「1本50円、とにかく数を焼こう」<br />
          山口凛「わたし焼き鳥だけは得意です！」
        </div>
        <div style={{ textAlign: "center", fontSize: 9, color: "#ffaa33", marginBottom: 10 }}>⚡ 7秒間連打で焼き鳥を量産！</div>
        <div style={{ textAlign: "center" }}><Btn onClick={onStart} color="#ee8800">🍗 開店！</Btn></div>
      </>}
      {phase === "play" && <>
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 42, color: "#ffd700", textShadow: "0 0 15px rgba(255,200,0,0.4)" }}>{skewers}本</div>
          <div style={{ fontSize: 11, color: "#ffcc88" }}>💰 {earnings}円</div>
          <div style={{ fontSize: 20, margin: "4px 0" }}>{"🍗".repeat(Math.min(Math.floor(skewers / 3), 8))}</div>
        </div>
        <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ width: `${(timer / 7) * 100}%`, height: "100%", background: "#ffaa33", borderRadius: 4, transition: "width 0.1s" }} />
        </div>
        <div style={{ textAlign: "center" }}>
          <div onClick={onTap}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.92)"}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
            onTouchStart={e => { e.preventDefault(); e.currentTarget.style.transform = "scale(0.92)"; onTap(); }}
            onTouchEnd={e => e.currentTarget.style.transform = "scale(1)"}
            style={{ display: "inline-block", cursor: "pointer", background: "linear-gradient(180deg,#ffaa33,#cc7700)", color: "#fff", fontWeight: "bold", fontSize: 16, padding: "16px 40px", borderRadius: 10, border: "3px solid #ffcc66", userSelect: "none", WebkitUserSelect: "none", boxShadow: "0 4px 12px rgba(255,150,30,0.3)" }}
          >🍗 焼く！！</div>
        </div>
        <div style={{ textAlign: "center", fontSize: 9, color: "#ccaa66", marginTop: 6 }}>残り {timer.toFixed(1)}秒</div>
      </>}
      {phase === "result" && <>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 40 }}>{skewers >= 25 ? "🍗🏆🍗" : skewers >= 15 ? "🍗🍗" : skewers >= 8 ? "🍗" : "💨"}</div>
          <div style={{ fontSize: 30, color: rankC, margin: "6px 0" }}>{skewers}本 / {earnings}円</div>
          <div style={{ fontSize: 14, color: rankC }}>【{rank}】</div>
        </div>
        <div style={{ fontSize: 10, color: "#ffcc88", lineHeight: 1.8, textAlign: "center", marginBottom: 10 }}>
          {skewers >= 25 ? "行列ができる大盛況！\n他のサークルから嫉妬の目が…！" :
           skewers >= 15 ? "なかなかの売れ行き！\n部費の足しになった。" :
           skewers >= 8 ? "ぼちぼち売れた。\nまあ赤字にはならなかった。" :
           "全然売れず…。\n自分たちで食べた。"}
        </div>
        <div style={{ fontSize: 9, color: "#888", textAlign: "center", marginBottom: 10 }}>
          {skewers >= 25 ? `所持金+${earnings}円 士気+5` : skewers >= 15 ? `所持金+${earnings}円 士気+3` : skewers >= 8 ? `所持金+${earnings}円` : "士気+1(自分で食べて満足)"}
        </div>
        <div style={{ textAlign: "center" }}><Btn onClick={onClose}>OK</Btn></div>
      </>}
    </div>
  </div>;
}

// ── WEEK ACTIVITY SELECTOR ──
function WeekActions({ actions, onPick }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {actions.map((a, i) => (
      <div key={i} onClick={() => onPick(a)} style={{
        background: C.bg3, border: "2px solid rgba(255,255,255,0.08)", borderRadius: 6,
        padding: 10, cursor: "pointer", transition: "border-color 0.2s",
      }}
        onMouseEnter={e => e.currentTarget.style.borderColor = C.acc}
        onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
      >
        <div style={{ fontSize: 12, color: C.wht, marginBottom: 2 }}>{a.icon} {a.name}</div>
        <div style={{ fontSize: 10, color: C.dim }}>{a.desc}</div>
        {a.stats && <div style={{ fontSize: 9, color: C.grn, marginTop: 3 }}>{a.stats}</div>}
      </div>
    ))}
  </div>;
}

// ============================================================
export default function Game() {
  const [ph, setPh] = useState("title");
  const [team, setTeam] = useState("");
  const [pilot, setPilot] = useState(null);
  const [dsn, setDsn] = useState({ w: null, p: null, r: null, a: null });
  const [st, setSt] = useState({ mor: 55, prg: 0, sta: 0, ctrl: 0, pipeQ: 0, loadPass: false, tf: 0, money: 3000 });
  const [msg, setMsg] = useState(null);
  const [jk, setJk] = useState(null); // { phase:'pick'|'result', opp, oppHand, myHand, result }
  const [sprt, setSprt] = useState(null); // { phase:'intro'|'mash'|'result', cups, timer }
  const [hanami, setHanami] = useState(null); // { phase:'intro'|'play'|'result', flowers, timer }
  const [bbq, setBbq] = useState(null); // { phase:'intro'|'play'|'result', pos, dir, result }
  const [yakitori, setYakitori] = useState(null); // { phase:'intro'|'play'|'result', skewers, timer }
  const [evLog, setEvLog] = useState([]);
  const [wk, setWk] = useState(0);
  const [dStep, setDStep] = useState(0);
  const [custAf, setCustAf] = useState(null);
  const events = useRef(mkEv());

  // Pipe bake state
  const [pTemp, setPTemp] = useState(350);
  const [pPh, setPPh] = useState("intro"); // intro, playing, done
  const [pTmr, setPTmr] = useState(30);
  const [pScore, setPScore] = useState(0);
  const [pTicks, setPTicks] = useState(0);

  // Build phase - 4 chapters, 2 weeks each
  const [buildCh, setBuildCh] = useState(0); // 0-3
  const [buildWk, setBuildWk] = useState(0); // 0-1 within chapter
  const maxCh = 4;

  // Load test
  const [ldPh, setLdPh] = useState("pre"); // pre, testing, result
  const [ldPass, setLdPass] = useState(null);
  const [ldDelay, setLdDelay] = useState(0);

  // Test flight
  const [tfWk, setTfWk] = useState(0);
  const maxTfWk = 3;

  // Contest
  const [cPh, setCPh] = useState("pre");
  const [wind, setWind] = useState(null);
  const [course, setCourse] = useState(null);
  const [dist, setDist] = useState(0);
  const [cRes, setCRes] = useState(null);
  const maxD = 24000;
  // Flight dialogue
  const [flightMsg, setFlightMsg] = useState(null); // { text, from: "pilot"|"designer" }
  // Result reveal animation: null → "splash" → "wait" → "drumroll" → "reveal"
  const [revealPhase, setRevealPhase] = useState(null);
  // Audio mute state
  const [audioMuted, setAudioMuted] = useState(false);

  // Pipe bake timer - temp management only, 30 seconds
  useEffect(() => {
    if (pPh !== "playing") return;
    if (pTmr <= 0) { AudioSys.playSfx("cheer"); setPPh("done"); return; }
    const t = setInterval(() => {
      setPTmr(p => {
        if (p <= 1) { AudioSys.playSfx("cheer"); setPPh("done"); return 0; }
        return p - 1;
      });
      setPTemp(prev => {
        const drift = (Math.random() - 0.45) * 38;
        const next = clamp(prev + drift, 200, 500);
        // Score: if in optimal range
        if (next >= 330 && next <= 370) {
          setPScore(s => s + 1);
        }
        setPTicks(t => t + 1);
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [pPh, pTmr]);

  const calcPerf = useCallback(() => {
    if (!pilot || !dsn.w || !dsn.p || !dsn.r || !dsn.a) return null;
    const w = WINGS.find(x => x.id === dsn.w);
    const pr = PROPS.find(x => x.id === dsn.p);
    const ri = RIDES.find(x => x.id === dsn.r);
    let af = AIRFOILS.find(x => x.id === dsn.a);
    if (dsn.a === "cust" && custAf) af = custAf; else if (dsn.a === "cust") af = { lM: .9, dM: .9 };
    const pwr = (pilot.sta * .6 + st.sta * .4) * ri.pM;
    const ctrl = (pilot.ctrl * .5 + st.ctrl * .5) * ri.vM;
    const eff = pr.eM * af.dM / ri.drM;
    const stab = w.stM * pr.stM * af.lM;
    const rng = w.dM * eff * (pwr / 80) * stab;
    const spd = w.sM * eff * (pwr / 85);
    const wP = pilot.w > 65 ? (pilot.w - 65) * .5 : 0;
    return { pwr: clamp(pwr, 0, 120), ctrl: clamp(ctrl, 0, 120), eff: clamp(eff * 100, 0, 150), stab: clamp(stab * 100, 0, 150), rng: clamp(rng * 100, 0, 200), spd: clamp(spd * 100, 0, 200), wP };
  }, [pilot, dsn, st, custAf]);

  const fireEvent = useCallback((season) => {
    // season: 'autumn'|'spring'|'summer'|null
    // ~18% chance of janken (any season)
    if (Math.random() < 0.18) {
      const opp = pick(MEMBERS.filter(m => m.role !== "部長"));
      AudioSys.playSfx("miniGameStart");
      setJk({ phase: "pick", opp: opp.name, oppHand: null, myHand: null, result: null });
      setEvLog(p => [...p, "🧃ジューじゃん"]);
      return { n: "🧃 ジューじゃん", d: `${opp.name}「ジューじゃんしようぜ！」`, e: "jk", v: 0 };
    }
    // Season-specific mini-games (~15% each when in season)
    if (season === "autumn" && Math.random() < 0.15) {
      AudioSys.playSfx("miniGameStart");
      setSprt({ phase: "intro", cups: 0, timer: 5 });
      setEvLog(p => [...p, "🍶芋煮前夜祭"]);
      return { n: "🍶 芋煮前夜祭", d: "スピリタスで乾杯！", e: "mini", v: 0 };
    }
    if (season === "autumn" && Math.random() < 0.15) {
      AudioSys.playSfx("miniGameStart");
      setYakitori({ phase: "intro", skewers: 0, timer: 7 });
      setEvLog(p => [...p, "🍗文化祭焼き鳥"]);
      return { n: "🍗 文化祭", d: "焼き鳥屋台で部費を稼げ！", e: "mini", v: 0 };
    }
    if (season === "spring" && Math.random() < 0.18) {
      AudioSys.playSfx("miniGameStart");
      setHanami({ phase: "intro", flowers: 0, timer: 5 });
      setEvLog(p => [...p, "🌸お花見大作戦"]);
      return { n: "🌸 お花見大作戦", d: "花が足りない！咲かせろ！", e: "mini", v: 0 };
    }
    if (season === "summer" && Math.random() < 0.18) {
      AudioSys.playSfx("miniGameStart");
      setBbq({ phase: "intro", pos: 0, dir: 1, result: null });
      setEvLog(p => [...p, "🥩BBQ大会"]);
      return { n: "🥩 BBQ大会", d: "ちゃんと焼かないと食中毒だぞ！", e: "mini", v: 0 };
    }
    if (Math.random() > 0.65) return null;
    const pool = events.current;
    let ev;
    if (season === "autumn" && Math.random() < 0.18) {
      const bear = Math.random() < 0.3;
      ev = pool.find(e => e.n.includes("いも煮") && (bear ? e.n.includes("中止") : !e.n.includes("中止")));
      if (ev && !bear) {
        AudioSys.playSfx("miniGameStart");
        setSprt({ phase: "intro", cups: 0, timer: 5 });
      }
    } else {
      const f = pool.filter(e => !e.n.includes("いも煮"));
      ev = pick(f);
    }
    if (ev) {
      AudioSys.playSfx("event");
      setEvLog(p => [...p, ev.n]);
      setSt(s => {
        const ns = { ...s };
        if (ev.e === "mor") ns.mor = clamp(ns.mor + ev.v, 0, 100);
        if (ev.e === "sta") ns.sta = clamp(ns.sta + ev.v, 0, 120);
        if (ev.e === "prg") ns.prg = clamp(ns.prg + ev.v, 0, 100);
        if (ev.e === "ctrl") ns.ctrl = clamp(ns.ctrl + ev.v, 0, 120);
        return ns;
      });
    }
    return ev;
  }, []);

  const doJanken = useCallback((myId) => {
    const oppId = pick(HANDS).id;
    const my = HANDS.find(h => h.id === myId);
    const result = myId === oppId ? "draw" : my.beats === oppId ? "win" : "lose";
    AudioSys.playSfx(result === "win" ? "jankenWin" : result === "lose" ? "jankenLose" : "jankenDraw");
    if (result === "win") setSt(s => ({ ...s, mor: clamp(s.mor + 3, 0, 100) }));
    if (result === "lose") setSt(s => ({ ...s, money: Math.max(0, s.money - 150), mor: clamp(s.mor - 2, 0, 100) }));
    setJk(j => ({ ...j, phase: "result", oppHand: oppId, myHand: myId, result }));
  }, []);

  const closeJanken = useCallback(() => { setJk(null); }, []);

  // Spirytus drinking game
  const sprtRef = useRef(null);
  const startSprt = useCallback(() => {
    AudioSys.playSfx("miniGameStart");
    setSprt({ phase: "mash", cups: 0, timer: 5 });
  }, []);
  const mashSprt = useCallback(() => {
    AudioSys.playSfx("spirytus");
    setSprt(s => s && s.phase === "mash" ? { ...s, cups: s.cups + 1 } : s);
  }, []);
  const closeSprt = useCallback(() => {
    if (!sprt) return;
    const c = sprt.cups;
    AudioSys.playSfx(c >= 5 ? "miniGameSuccess" : "miniGameFail");
    setSt(s => {
      const ns = { ...s };
      if (c >= 12) { ns.mor = clamp(ns.mor + 12, 0, 100); ns.sta = clamp(ns.sta - 4, 0, 120); ns.money = Math.max(0, ns.money - 300); }
      else if (c >= 8) { ns.mor = clamp(ns.mor + 8, 0, 100); ns.sta = clamp(ns.sta - 2, 0, 120); ns.money = Math.max(0, ns.money - 200); }
      else if (c >= 5) { ns.mor = clamp(ns.mor + 5, 0, 100); ns.money = Math.max(0, ns.money - 100); }
      else if (c >= 2) { ns.mor = clamp(ns.mor + 2, 0, 100); }
      return ns;
    });
    setSprt(null);
  }, [sprt]);
  useEffect(() => {
    if (!sprt || sprt.phase !== "mash") return;
    const iv = setInterval(() => {
      setSprt(s => {
        if (!s || s.phase !== "mash") return s;
        const nt = Math.round((s.timer - 0.1) * 10) / 10;
        if (nt <= 0) return { ...s, phase: "result", timer: 0 };
        return { ...s, timer: nt };
      });
    }, 100);
    return () => clearInterval(iv);
  }, [sprt?.phase]);

  // 🌸 Hanami handlers
  const startHanami = useCallback(() => { AudioSys.playSfx("miniGameStart"); setHanami({ phase: "play", flowers: 0, timer: 5 }); }, []);
  const tapHanami = useCallback(() => { AudioSys.playSfx("hanami"); setHanami(s => s?.phase === "play" ? { ...s, flowers: s.flowers + 1 } : s); }, []);
  const closeHanami = useCallback(() => {
    if (!hanami) return;
    const f = hanami.flowers;
    AudioSys.playSfx(f >= 6 ? "miniGameSuccess" : "miniGameFail");
    setSt(s => ({ ...s, mor: clamp(s.mor + (f >= 20 ? 10 : f >= 12 ? 6 : f >= 6 ? 3 : 1), 0, 100) }));
    setHanami(null);
  }, [hanami]);
  useEffect(() => {
    if (!hanami || hanami.phase !== "play") return;
    const iv = setInterval(() => {
      setHanami(s => {
        if (!s || s.phase !== "play") return s;
        const nt = Math.round((s.timer - 0.1) * 10) / 10;
        if (nt <= 0) return { ...s, phase: "result", timer: 0 };
        return { ...s, timer: nt };
      });
    }, 100);
    return () => clearInterval(iv);
  }, [hanami?.phase]);

  // 🥩 BBQ handlers
  const startBbq = useCallback(() => { AudioSys.playSfx("miniGameStart"); setBbq({ phase: "play", pos: 0, dir: 1, result: null }); }, []);
  const flipBbq = useCallback(() => {
    AudioSys.playSfx("bbqFlip");
    setBbq(s => {
      if (!s || s.phase !== "play") return s;
      const r = s.pos >= 35 && s.pos <= 65 ? "ok" : s.pos < 35 ? "raw" : "burnt";
      return { ...s, phase: "result", result: r };
    });
  }, []);
  const closeBbq = useCallback(() => {
    if (!bbq) return;
    AudioSys.playSfx(bbq.result === "ok" ? "miniGameSuccess" : "miniGameFail");
    if (bbq.result === "ok") {
      setSt(s => ({ ...s, sta: clamp(s.sta + 5, 0, 120), mor: clamp(s.mor + 4, 0, 100) }));
    } else {
      // Food poisoning → skip 1 week
      setSt(s => ({ ...s, mor: clamp(s.mor - 5, 0, 100) }));
      setTfWk(w => Math.min(w + 1, maxTfWk));
      setWk(w => w + 1);
    }
    setBbq(null);
  }, [bbq, maxTfWk]);
  useEffect(() => {
    if (!bbq || bbq.phase !== "play") return;
    const iv = setInterval(() => {
      setBbq(s => {
        if (!s || s.phase !== "play") return s;
        let np = s.pos + s.dir * 1.8;
        let nd = s.dir;
        if (np >= 100) { np = 100; nd = -1; }
        if (np <= 0) { np = 0; nd = 1; }
        return { ...s, pos: np, dir: nd };
      });
    }, 30);
    return () => clearInterval(iv);
  }, [bbq?.phase]);

  // 🍗 Yakitori handlers
  const startYakitori = useCallback(() => { AudioSys.playSfx("miniGameStart"); setYakitori({ phase: "play", skewers: 0, timer: 7 }); }, []);
  const tapYakitori = useCallback(() => { AudioSys.playSfx("yakitori"); setYakitori(s => s?.phase === "play" ? { ...s, skewers: s.skewers + 1 } : s); }, []);
  const closeYakitori = useCallback(() => {
    if (!yakitori) return;
    const sk = yakitori.skewers;
    const earn = sk * 50;
    AudioSys.playSfx(sk >= 8 ? "miniGameSuccess" : "miniGameFail");
    setSt(s => ({
      ...s,
      money: s.money + (sk >= 8 ? earn : 0),
      mor: clamp(s.mor + (sk >= 25 ? 5 : sk >= 15 ? 3 : sk < 8 ? 1 : 0), 0, 100),
    }));
    setYakitori(null);
  }, [yakitori]);
  useEffect(() => {
    if (!yakitori || yakitori.phase !== "play") return;
    const iv = setInterval(() => {
      setYakitori(s => {
        if (!s || s.phase !== "play") return s;
        const nt = Math.round((s.timer - 0.1) * 10) / 10;
        if (nt <= 0) return { ...s, phase: "result", timer: 0 };
        return { ...s, timer: nt };
      });
    }, 100);
    return () => clearInterval(iv);
  }, [yakitori?.phase]);

  // Contest flight - use refs to avoid stale closures and effect re-runs
  const flightRef = useRef(null);
  useEffect(() => {
    if (cPh === "flying") {
      const perf = calcPerf();
      if (!perf) return;
      flightRef.current = { perf, wind: wind || WINDS[0], course, st: { ...st }, maxD };
    }
  }, [cPh]); // only capture once on flight start

  useEffect(() => {
    if (cPh !== "flying" || cRes) return;
    const cfg = flightRef.current;
    if (!cfg) return;
    const { perf, wind: wD, course: crs, st: fst, maxD: mD } = cfg;
    const cB = crs === "north" ? 1.05 : .95;
    const fBase = (perf.rng * perf.spd * perf.eff) / 130000;
    const inc = fBase * cB * wD.m * (1 + fst.tf * .04) * (fst.mor / 100) * (fst.prg >= 90 ? 1.1 : fst.prg >= 65 ? 1 : .7) * (1 + fst.pipeQ * .002) * (1 - perf.wP / 100);
    const iv = setInterval(() => {
      setDist(d => {
        const nd = d + inc * 120 + (Math.random() - .35) * inc * 30;
        if (d / mD > .35 && Math.random() < (d / mD - .35) * .04) {
          clearInterval(iv); setCRes({ d: nd, r: "パイロットの体力が限界に…！着水！" }); setCPh("done"); return nd;
        }
        if (wD.s > 2.5 && Math.random() < .015) {
          clearInterval(iv); setCRes({ d: nd, r: "突風に煽られ機体がバランスを崩した！" }); setCPh("done"); return nd;
        }
        if (fst.mor < 40 && Math.random() < .008) {
          clearInterval(iv); setCRes({ d: nd, r: "集中力が切れた…操縦ミスで高度を失い着水！" }); setCPh("done"); return nd;
        }
        if (nd >= mD) {
          clearInterval(iv); setCRes({ d: mD, r: "対岸到達！歴史に名を刻んだ！" }); setCPh("done"); return mD;
        }
        return nd;
      });
    }, 150);
    return () => clearInterval(iv);
  }, [cPh, cRes]);

  // Flight dialogue - show pilot/designer lines alternately every 3s
  useEffect(() => {
    if (cPh !== "flying") { setFlightMsg(null); return; }
    let turn = 0;
    const show = () => {
      const isPilot = turn % 2 === 0;
      setFlightMsg({
        text: isPilot ? pick(PILOT_LINES) : pick(DESIGNER_LINES),
        from: isPilot ? "pilot" : "designer"
      });
      turn++;
    };
    show();
    const iv = setInterval(show, 3500);
    return () => clearInterval(iv);
  }, [cPh]);

  // BGM control
  useEffect(() => {
    if (ph === "title") AudioSys.playBgm("main");
    else if (ph !== "contest") AudioSys.playBgm("main"); // Keep BGM playing through most phases
  }, [ph]);
  useEffect(() => {
    if (cPh === "flying") AudioSys.playBgm("flight");
    else if (cPh !== "flying") AudioSys.stopBgm();
  }, [cPh]);

  // Result reveal animation: splash → drumroll → announce → reveal
  useEffect(() => {
    if (cPh !== "done" || !cRes || revealPhase !== null) return;
    AudioSys.playSfx("splash");
    setRevealPhase("splash");
    const t1 = setTimeout(() => { setRevealPhase("drumroll"); AudioSys.playSfx("drumroll"); }, 2000);
    const t2 = setTimeout(() => setRevealPhase("announce"), 4500);
    const t3 = setTimeout(() => { setRevealPhase("reveal"); AudioSys.playSfx("reveal"); AudioSys.playBgm("result"); }, 6500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [cPh, cRes]);

  // ── RENDERERS ──
  const base = { fontFamily: "'DotGothic16',monospace", background: C.bg, color: C.txt, minHeight: "100vh", maxWidth: 420, margin: "0 auto", fontSize: 12, lineHeight: 1.6 };
  const hdr = (icon, ttl, sub) => (
    <div style={{ background: `linear-gradient(180deg,${C.pnl},${C.bg})`, padding: "7px 12px", borderBottom: `2px solid ${C.gold}33`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
      <span style={{ color: C.gold, fontSize: 12 }}>{icon} {ttl}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: C.dim, fontSize: 10 }}>{sub || team}</span>
        <button onClick={() => { const m = AudioSys.toggleMute(); setAudioMuted(m); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, opacity: 0.6, padding: 0 }}>{audioMuted ? "🔇" : "🔊"}</button>
      </div>
    </div>
  );
  const pad = { padding: 12, paddingBottom: 80 };
  const resetGame = () => {
    setPh("title"); setTeam(""); setPilot(null); setDsn({ w: null, p: null, r: null, a: null });
    setSt({ mor: 55, prg: 0, sta: 0, ctrl: 0, pipeQ: 0, loadPass: false, tf: 0, money: 3000 });
    setWk(0); setDStep(0); setCustAf(null); setEvLog([]); setPPh("intro"); setJk(null); setSprt(null); setHanami(null); setBbq(null); setYakitori(null);
    setBuildCh(0); setBuildWk(0); setLdPh("pre"); setLdPass(null); setLdDelay(0); setTfWk(0);
    setCPh("pre"); setDist(0); setCRes(null); events.current = mkEv(); flightRef.current = null;
    setFlightMsg(null); setRevealPhase(null); AudioSys.stopBgm();
  };


  // ──────── TITLE ────────
  if (ph === "title") return (
    <div style={base}>
      <link href={FL} rel="stylesheet" />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 20, textAlign: "center", background: `linear-gradient(180deg,#080b1a 0%,#121830 35%,${C.lake} 68%,#0c2240 100%)` }}>
        <div style={{ fontSize: 44, marginBottom: 2, animation: "bob 2.5s ease-in-out infinite" }}>✈️</div>
        <div style={{ fontSize: 26, color: C.gold, textShadow: "2px 2px 0 #000,0 0 20px rgba(255,215,0,0.3)", letterSpacing: 3, marginBottom: 2 }}>人力飛行機</div>
        <div style={{ fontSize: 34, color: C.wht, textShadow: "3px 3px 0 #000", letterSpacing: 6, marginBottom: 6 }}>つくーる</div>
        <div style={{ fontSize: 10, color: C.dim, marginBottom: 4 }}>─ 鳥人間コンテスト シミュレーション ─</div>
        <div style={{ fontSize: 10, color: C.gry, marginBottom: 24, lineHeight: 1.8 }}>
          秋の設計から夏の本番まで<br />仲間と1年かけて空を目指せ
        </div>
        <div style={{ display: "flex", gap: 5, marginBottom: 20, fontSize: 16 }}>
          {["🛠️", "🔧", "📐", "🔥", "⚖️", "✈️", "🏆"].map((e, i) => (
            <span key={i} style={{ animation: `fl ${1.5 + i * .15}s ease-in-out infinite alternate` }}>{e}</span>
          ))}
        </div>
        <Btn onClick={() => { AudioSys.playSfx("phaseChange"); setPh("teamName"); }}>▶ はじめる</Btn>
        <div style={{ marginTop: 20, fontSize: 9, color: C.gryD, lineHeight: 1.8 }}>
          人力プロペラ機部門 | 対岸到達ルール(折り返しなし)<br />
          部門: 主翼・尾翼&操舵・コックピット・フェアリング・プロペラ・駆動・エンジン
        </div>
        <style>{`@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}} @keyframes fl{from{transform:translateY(0)}to{transform:translateY(-5px)}}`}</style>
      </div>
    </div>
  );

  // ──────── TEAM NAME ────────
  if (ph === "teamName") return (
    <div style={base}><link href={FL} rel="stylesheet" />
      <div style={pad}>
        <div style={{ textAlign: "center", marginTop: 30, marginBottom: 24 }}>
          <div style={{ fontSize: 18, color: C.gold, marginBottom: 12 }}>チーム名を決めよう</div>
          <div style={{ fontSize: 11, color: C.dim, marginBottom: 16 }}>鳥人間コンテストに挑む仲間たちのチーム名は？</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 300, margin: "0 auto" }}>
          <input type="text" value={team} onChange={e => setTeam(e.target.value)} placeholder="例: WindWalkers" maxLength={20}
            style={{ fontFamily: "'DotGothic16',monospace", fontSize: 15, padding: "10px 14px", background: C.bg2, color: C.wht, border: `2px solid ${C.gold}55`, borderRadius: 6, outline: "none", textAlign: "center" }} />
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center" }}>
            {["鶴翼会", "蒼穹", "スカイウォーカーズ", "琵琶湖の風", "翼よあれ"].map(n => (
              <button key={n} onClick={() => setTeam(n)} style={{ fontFamily: "'DotGothic16',monospace", fontSize: 9, padding: "3px 7px", background: C.pnl, color: C.dim, border: `1px solid ${C.gry}33`, borderRadius: 3, cursor: "pointer" }}>{n}</button>
            ))}
          </div>
          <Btn onClick={() => { if (team.trim()) { AudioSys.playSfx("phaseChange"); setPh("members"); } }} disabled={!team.trim()} wide>決定</Btn>
        </div>
      </div>
    </div>
  );

  // ──────── TEAM MEMBERS INTRO ────────
  if (ph === "members") return (
    <div style={base}><link href={FL} rel="stylesheet" />
      {hdr("👥", "チーム紹介")}
      <div style={pad}>
        <Box title={`${team} のメンバー`}>
          <div style={{ fontSize: 10, color: C.dim, marginBottom: 8 }}>今年、鳥コンに挑む仲間たちだ。</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {MEMBERS.map((m, i) => (
              <div key={i} style={{ background: C.bg2, borderRadius: 4, padding: 7, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 11, color: C.wht }}>{m.em} {m.name}</div>
                <div style={{ fontSize: 9, color: C.gold }}>{m.role} ({m.dept})</div>
                <div style={{ fontSize: 8, color: C.dim, marginTop: 2 }}>{m.per}</div>
              </div>
            ))}
          </div>
        </Box>
        <div style={{ textAlign: "center" }}>
          <Btn onClick={() => { AudioSys.playSfx("phaseChange"); setPh("pilotSel"); }}>パイロット選択へ ▶</Btn>
        </div>
      </div>
    </div>
  );

  // ──────── PILOT SELECT ────────
  if (ph === "pilotSel") return (
    <div style={base}><link href={FL} rel="stylesheet" />
      {hdr("🧑‍✈️", "パイロット選択")}
      <div style={pad}>
        <div style={{ fontSize: 10, color: C.dim, marginBottom: 10, textAlign: "center" }}>エンジン班からパイロット候補を選出。機体はパイロットに合わせて設計する。</div>
        {PILOTS.map(p => (
          <div key={p.id} onClick={() => { setPilot(p); setSt(s => ({ ...s, sta: p.sta, ctrl: p.ctrl })); }}
            style={{ background: pilot?.id === p.id ? `${C.acc}30` : C.pnl2, border: `2px solid ${pilot?.id === p.id ? C.acc : "rgba(255,255,255,0.06)"}`, borderRadius: 6, padding: 10, marginBottom: 7, cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 14, color: C.wht }}>{p.em} {p.name}</span>
              <span style={{ fontSize: 9, color: C.dim }}>{p.h}cm / {p.w}kg</span>
            </div>
            <Bar label="体力" val={p.sta} color={C.grn} />
            <Bar label="操縦力" val={p.ctrl} color={C.blu} />
            <div style={{ fontSize: 9, color: C.dim, marginTop: 3 }}>{p.desc}</div>
          </div>
        ))}
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <Btn onClick={() => { if (pilot) { AudioSys.playSfx("phaseChange"); setPh("design"); } }} disabled={!pilot}>設計フェーズへ ▶</Btn>
        </div>
      </div>
    </div>
  );

  // ──────── DESIGN ────────
  if (ph === "design") {
    const steps = [
      { k: "w", t: "🛩️ 主翼設計", items: WINGS },
      { k: "p", t: "🌀 プロペラ配置", items: PROPS },
      { k: "r", t: "🪑 乗機姿勢", items: RIDES },
      { k: "a", t: "📐 翼型選定", items: AIRFOILS },
    ];
    const cs = steps[dStep];
    return (
      <div style={base}><link href={FL} rel="stylesheet" />
        {hdr("🍂", "秋：設計フェーズ", `W${wk + 1}`)}
        <div style={pad}>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 14 }}>
            {steps.map((_, i) => (
              <div key={i} style={{ width: 22, height: 22, borderRadius: "50%", background: i < dStep ? C.grn : i === dStep ? C.acc : C.bg2, border: `2px solid ${i <= dStep ? "rgba(255,255,255,0.3)" : C.gryD}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: C.wht }}>{i < dStep ? "✓" : i + 1}</div>
            ))}
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: dStep >= 4 ? C.gold : C.bg2, border: `2px solid ${dStep >= 4 ? C.gold : C.gryD}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>📋</div>
          </div>
          {dStep < 4 ? <>
            <Box title={cs.t}>
              <div style={{ fontSize: 10, color: C.dim, marginBottom: 8 }}>パイロット: {pilot?.em}{pilot?.name} ({pilot?.w}kg)</div>
              {cs.items.map(it => (
                <div key={it.id} onClick={() => {
                  AudioSys.playSfx("select");
                  if (it.id === "cust") {
                    const ok = Math.random() < .35;
                    const lm = ok ? +(1.08 + Math.random() * .07).toFixed(2) : .85;
                    const dm = ok ? +(1.05 + Math.random() * .05).toFixed(2) : .88;
                    setCustAf({ lM: lm, dM: dm });
                    AudioSys.playSfx(ok ? "miniGameSuccess" : "miniGameFail");
                    setMsg({ text: ok ? `🎉 ${MEMBERS[1].name}設計者の独自翼型が成功！\n揚力:${lm} 抗力低減:${dm}\nDAEシリーズを超える性能を実現！\n${MEMBERS[6].name}「マジか…すごい」` : `😰 ${MEMBERS[1].name}設計者の独自翼型…微妙な結果に。\nXFOIL解析ではよかったが製作精度が…\n${MEMBERS[0].name}「DAE31に戻すか？いや、このまま行こう」` });
                  }
                  setDsn(d => ({ ...d, [cs.k]: it.id }));
                }}
                  style={{ background: dsn[cs.k] === it.id ? `${C.acc}30` : C.bg, border: `2px solid ${dsn[cs.k] === it.id ? C.acc : "rgba(255,255,255,0.04)"}`, borderRadius: 5, padding: 9, marginBottom: 5, cursor: "pointer" }}>
                  <div style={{ fontSize: 12, color: C.wht, marginBottom: 2 }}>{it.name}</div>
                  <div style={{ fontSize: 10, color: C.dim }}>{it.desc}</div>
                </div>
              ))}
            </Box>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              {dStep > 0 && <Btn onClick={() => setDStep(s => s - 1)} color={C.gryD} small>◀ 戻る</Btn>}
              <Btn onClick={() => dsn[cs.k] && setDStep(s => s + 1)} disabled={!dsn[cs.k]} small>次へ ▶</Btn>
            </div>
          </> : <>
            <Box title="📋 設計書 & 機体プレビュー">
              <AircraftSVG wing={dsn.w} prop={dsn.p} ride={dsn.r} airfoil={dsn.a} size={220} />
              <div style={{ fontSize: 10, lineHeight: 2, marginTop: 8 }}>
                パイロット: {pilot?.em}{pilot?.name} | 主翼: {WINGS.find(x => x.id === dsn.w)?.name}({WINGS.find(x => x.id === dsn.w)?.span})<br />
                プロペラ: {PROPS.find(x => x.id === dsn.p)?.name} | 姿勢: {RIDES.find(x => x.id === dsn.r)?.name}<br />
                翼型: {AIRFOILS.find(x => x.id === dsn.a)?.name}
              </div>
            </Box>
            {calcPerf() && <Box title="📊 予測性能">{(() => { const p = calcPerf(); return <>
              <Bar label="パワー" val={p.pwr} max={120} color={C.acc} />
              <Bar label="操縦性" val={p.ctrl} max={120} color={C.blu} />
              <Bar label="効率" val={p.eff} max={150} color={C.grn} />
              <Bar label="安定性" val={p.stab} max={150} color={C.pur} />
              <Bar label="航続力" val={p.rng} max={200} color={C.gold} />
              <Bar label="速度" val={p.spd} max={200} color={C.org} />
              {p.wP > 0 && <div style={{ fontSize: 9, color: C.acc, marginTop: 3 }}>⚠️ 体重ペナルティ -{p.wP.toFixed(1)}%</div>}
            </>; })()}</Box>}
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <Btn onClick={() => setDStep(0)} color={C.gryD} small>◀ やり直す</Btn>
              <Btn onClick={() => { AudioSys.playSfx("phaseChange"); setPh("build"); setWk(w => w + 1); setBuildCh(0); setBuildWk(0); }}>設計完了！製作へ ▶</Btn>
            </div>
          </>}
        </div>
        {msg && <Dlg text={msg.text} onClose={() => setMsg(null)} />}
      </div>
    );
  }

  // ──────── BUILD PHASE (4 chapters × 2 weeks) ────────
  if (ph === "build") {
    const chapters = [
      { icon: "🛩️", season: "秋", title: "主翼班", sub: `${MEMBERS[2].name}(主翼PL)の指揮のもと、翼の骨格を作る`,
        actions: [
          { icon: "📐", name: "翼桁(スパー)積層", desc: `カーボンプリプレグを芯金に巻く。${MEMBERS[2].name}が指導`, stats: "進捗+3〜7", eff: () => { const v = rand(3, 7); setSt(s => ({ ...s, prg: clamp(s.prg + v, 0, 100) })); return `${MEMBERS[2].name}「積層角度、±45°で交互に。ここが強度の要だ」\n進捗+${v}`; } },
          { icon: "🪚", name: "リブ切り出し・接着", desc: `${MEMBERS[8].name}(1年)がスタイロフォームをカット`, stats: "進捗+2〜5", eff: () => { const v = rand(2, 5); setSt(s => ({ ...s, prg: clamp(s.prg + v, 0, 100) })); return `${MEMBERS[8].name}「翼型テンプレート通りに…できた！」\n${MEMBERS[2].name}「上出来だ」\n進捗+${v}`; } },
          { icon: "🏋️", name: "パイロット基礎トレーニング", desc: "ロードバイクで基礎体力作り", stats: "体力+2〜5", eff: () => { const v = rand(2, 5); setSt(s => ({ ...s, sta: clamp(s.sta + v, 0, 120) })); return `パイロット「まずは土台作りから」\n体力+${v}`; } },
        ]},
      { icon: "🌀", season: "冬前半", title: "プロペラ・駆動班", sub: `${MEMBERS[6].name}(プロペラ)と${MEMBERS[7].name}(駆動)が本領発揮`,
        actions: [
          { icon: "🌀", name: "プロペラブレード成形", desc: `${MEMBERS[6].name}がバルサとカーボンでブレードを削る`, stats: "進捗+3〜6", eff: () => { const v = rand(3, 6); setSt(s => ({ ...s, prg: clamp(s.prg + v, 0, 100) })); return `${MEMBERS[6].name}「翼端のねじり下げが肝。ピッチ分布を最適化した」\n進捗+${v}`; } },
          { icon: "⚙️", name: "チェーン・ギア組み立て", desc: `${MEMBERS[7].name}が駆動系を黙々と組む`, stats: "進捗+2〜5", eff: () => { const v = rand(2, 5); setSt(s => ({ ...s, prg: clamp(s.prg + v, 0, 100) })); return `${MEMBERS[7].name}「…ギア比3.2。伝達効率96%」(ボソッ)\n進捗+${v}`; } },
          { icon: "🔬", name: "駆動効率テスト", desc: "エルゴメーターにプロペラを繋いで回転数を測定", stats: "進捗+1〜3, 操縦力+1〜3", eff: () => { const p = rand(1, 3), c = rand(1, 3); setSt(s => ({ ...s, prg: clamp(s.prg + p, 0, 100), ctrl: clamp(s.ctrl + c, 0, 120) })); return `${MEMBERS[6].name}「回転数1600rpm…理論値に近い！」\n${MEMBERS[7].name}(無言でガッツポーズ)\n進捗+${p} 操縦力+${c}`; } },
        ]},
      { icon: "🎛️", season: "冬後半", title: "コックピット・操舵班", sub: `${MEMBERS[4].name}(コクピット)と${MEMBERS[3].name}(操舵)の精密作業`,
        actions: [
          { icon: "🪑", name: "コックピットフレーム製作", desc: `${MEMBERS[4].name}がパイロットの体格に合わせたフレームを作る`, stats: "進捗+2〜5, 体力+1〜2", eff: () => { const v = rand(2, 5), s = rand(1, 2); setSt(sv => ({ ...sv, prg: clamp(sv.prg + v, 0, 100), sta: clamp(sv.sta + s, 0, 120) })); return `${MEMBERS[4].name}「ペダル位置をあと5mm前に…よし、フィットした」\nパイロット「漕ぎやすい！」\n進捗+${v} 体力+${s}`; } },
          { icon: "🎛️", name: "操舵ワイヤ配線", desc: `${MEMBERS[3].name}がエレベータ・ラダーのワイヤを通す`, stats: "操縦力+2〜5", eff: () => { const v = rand(2, 5); setSt(s => ({ ...s, ctrl: clamp(s.ctrl + v, 0, 120) })); return `${MEMBERS[3].name}「ワイヤテンション均等。操舵の遊びは最小限に」\n操縦力+${v}`; } },
          { icon: "📡", name: "計器・通信テスト", desc: "高度計・速度計・無線機の動作確認", stats: "操縦力+1〜4, 士気+2", eff: () => { const v = rand(1, 4); setSt(s => ({ ...s, ctrl: clamp(s.ctrl + v, 0, 120), mor: clamp(s.mor + 2, 0, 100) })); return `${MEMBERS[3].name}「高度計OK、対気速度計OK、無線…聞こえますか？」\n${MEMBERS[0].name}(無線)「感度良好！」\n操縦力+${v} 士気+2`; } },
        ]},
      { icon: "✨", season: "春", title: "フェアリング・全体結合", sub: `${MEMBERS[5].name}(フェアリング)の腕の見せどころ。そして全部をひとつに`,
        actions: [
          { icon: "✨", name: "フェアリング成形", desc: `${MEMBERS[5].name}が発泡スチロールを彫刻のように削る`, stats: "進捗+3〜6, 士気+2", eff: () => { const v = rand(3, 6); setSt(s => ({ ...s, prg: clamp(s.prg + v, 0, 100), mor: clamp(s.mor + 2, 0, 100) })); return `${MEMBERS[5].name}「この曲面…完璧。美は空力だ」\n${MEMBERS[9].name}「先輩かっこいい…」\n進捗+${v} 士気+2`; } },
          { icon: "🔗", name: "各部結合・ボルト締結", desc: "主翼・胴体・尾翼・駆動系を全て繋ぐ", stats: "進捗+3〜7", eff: () => { const v = rand(3, 7); setSt(s => ({ ...s, prg: clamp(s.prg + v, 0, 100) })); return `${MEMBERS[0].name}「全部門、結合作業開始！」\n${MEMBERS[2].name}「主翼、接続完了」\n${MEMBERS[7].name}「…駆動OK」\n進捗+${v}`; } },
          { icon: "⚖️", name: "重量測定・バランス調整", desc: `${MEMBERS[1].name}設計者が重心位置を最終確認`, stats: "進捗+1〜3, 操縦力+1〜3", eff: () => { const p = rand(1, 3), c = rand(1, 3); setSt(s => ({ ...s, prg: clamp(s.prg + p, 0, 100), ctrl: clamp(s.ctrl + c, 0, 120) })); return `${MEMBERS[1].name}「全備重量${70 + rand(5, 15)}kg…想定内。重心位置は翼弦の28%」\n進捗+${p} 操縦力+${c}`; } },
        ]},
    ];
    const ch = chapters[buildCh];
    const globalWk = buildCh * 2 + buildWk;
    const totalWk = maxCh * 2;
    return (
      <div style={base}><link href={FL} rel="stylesheet" />
        {hdr(ch.icon, `${ch.season}：${ch.title}`, `${globalWk + 1}/${totalWk}週`)}
        <div style={pad}>
          {/* Chapter progress */}
          <div style={{ display: "flex", gap: 3, marginBottom: 10, justifyContent: "center" }}>
            {chapters.map((c, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ height: 4, borderRadius: 2, background: i < buildCh ? C.grn : i === buildCh ? C.acc : C.bg2, transition: "background 0.3s", marginBottom: 3 }} />
                <div style={{ fontSize: 8, color: i <= buildCh ? C.wht : C.gryD }}>{c.icon} {c.title.split("・")[0]}</div>
              </div>
            ))}
          </div>
          {/* Chapter intro on first week */}
          {buildWk === 0 && (
            <Box title={`${ch.icon} ${ch.title}`}>
              <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.8 }}>{ch.sub}</div>
              <div style={{ fontSize: 9, color: C.gry, marginTop: 4 }}>── 2週間でこのフェーズを完了させよう ──</div>
            </Box>
          )}
          <Box title="📊 チーム状況">
            <AircraftSVG wing={dsn.w} prop={dsn.p} ride={dsn.r} airfoil={dsn.a} size={140} />
            <div style={{ marginTop: 6 }}>
              <Bar label="進捗" val={st.prg} color={C.org} />
              <Bar label="士気" val={st.mor} color={C.pnk} />
              <Bar label="体力" val={st.sta} max={120} color={C.grn} />
              <Bar label="操縦力" val={st.ctrl} max={120} color={C.blu} />
            </div>
            <div style={{ fontSize: 10, color: C.gold, textAlign: "right", marginTop: 3 }}>💰 {st.money.toLocaleString()}円</div>
          </Box>
          {buildWk < 2 && <Box title={`📅 Week ${globalWk + 1}：${ch.title}`}>
            <WeekActions actions={ch.actions} onPick={a => {
              AudioSys.playSfx("weekPass");
              const result = a.eff();
              setSt(s => ({ ...s, mor: clamp(s.mor - rand(1, 3), 0, 100) }));
              const season = buildCh === 0 ? "autumn" : buildCh === 3 ? "spring" : null;
              const ev = fireEvent(season);
              if (ev && (ev.e === "jk" || ev.e === "mini")) {
                setMsg({ text: `📋 作業報告\n\n${result}` });
              } else {
                let txt = `📋 作業報告\n\n${result}`;
                if (ev) txt += `\n\n────────────\n${ev.n}\n${ev.d}`;
                setMsg({ text: txt });
              }
              const nextWk = buildWk + 1;
              if (nextWk >= 2) {
                if (buildCh + 1 >= maxCh) {
                  // All chapters done - mark for pipe bake transition
                  setBuildWk(2); // sentinel: shows "go to pipe" button
                } else {
                  setBuildCh(c => c + 1);
                  setBuildWk(0);
                }
              } else {
                setBuildWk(nextWk);
              }
              setWk(w => w + 1);
            }} />
          </Box>}
          {/* Transition to next chapter or pipe bake */}
          {buildWk === 0 && buildCh > 0 && globalWk > 0 && !msg && (
            <div style={{ textAlign: "center", fontSize: 9, color: C.dim, marginTop: 4 }}>
              ✅ {chapters[buildCh - 1]?.title} 完了
            </div>
          )}
          {buildWk >= 2 && (
            <div style={{ textAlign: "center", marginTop: 8, padding: "8px 0", borderTop: `1px solid ${C.gold}33` }}>
              <div style={{ fontSize: 11, color: C.gold, marginBottom: 6 }}>🎉 全部門の製作完了！パイプ焼きへ進もう。</div>
              <Btn onClick={() => { AudioSys.playSfx("phaseChange"); setPh("pipe"); setPPh("intro"); setPScore(0); setPTicks(0); setPTmr(30); setPTemp(350); }}>🔥 パイプ焼きへ ▶</Btn>
            </div>
          )}
        </div>
        {msg && <Dlg text={msg.text} onClose={() => setMsg(null)} />}
        {jk && <JankenDlg jk={jk} onPick={doJanken} onClose={closeJanken} />}
        {sprt && <SpiritsDlg sprt={sprt} onMash={mashSprt} onStart={startSprt} onClose={closeSprt} />}
        {hanami && <HanamiDlg data={hanami} onTap={tapHanami} onStart={startHanami} onClose={closeHanami} />}
        {bbq && <BbqDlg data={bbq} onFlip={flipBbq} onStart={startBbq} onClose={closeBbq} />}
        {yakitori && <YakitoriDlg data={yakitori} onTap={tapYakitori} onStart={startYakitori} onClose={closeYakitori} />}
      </div>
    );
  }

  // ──────── PIPE BAKE ────────
  if (ph === "pipe") {
    const tC = pTemp >= 330 && pTemp <= 370 ? C.grn : pTemp >= 300 && pTemp <= 400 ? C.org : C.acc;
    const tZ = pTemp >= 330 && pTemp <= 370 ? "◎最適" : pTemp >= 300 && pTemp <= 400 ? "△外れぎみ" : "✕危険！";
    const quality = pTicks > 0 ? Math.round(pScore / pTicks * 100) : 0;
    return (
      <div style={base}><link href={FL} rel="stylesheet" />
        {hdr("🔥", "パイプ焼き")}
        <div style={pad}>
          {pPh === "intro" && <>
            <Box title="🔥 パイプ焼きとは？">
              <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.8 }}>
                CFRPパイプの焼成工程。アルミ芯金にカーボンプリプレグを巻いてオーブンへ。
                温度が高すぎると樹脂が焦げ、低すぎると硬化不良。
                330〜370℃をキープし続けることが品質の鍵。
              </div>
              <div style={{ fontSize: 10, color: C.org, marginTop: 8, lineHeight: 1.8 }}>
                🎮 温度管理ミニゲーム（30秒）<br />
                温度はランダムに変動する。<br />「加熱」「冷却」ボタンで330〜370℃帯をキープせよ！
              </div>
            </Box>
            <div style={{ textAlign: "center" }}><Btn onClick={() => { AudioSys.playSfx("pipeBake"); setPPh("playing"); }}>🔥 焼成開始！</Btn></div>
          </>}
          {pPh === "playing" && <Box title={`⏱️ 残り ${pTmr}秒 | 適温率: ${quality}%`}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: C.dim }}>オーブン温度</span>
                <span style={{ fontSize: 14, color: tC, fontWeight: "bold" }}>{Math.round(pTemp)}℃ {tZ}</span>
              </div>
              <div style={{ height: 24, background: C.bg, borderRadius: 4, overflow: "hidden", position: "relative", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ position: "absolute", left: "43.3%", width: "13.3%", height: "100%", background: `${C.grn}22`, borderLeft: `1px dashed ${C.grn}`, borderRight: `1px dashed ${C.grn}` }} />
                <div style={{ position: "absolute", left: `${clamp((pTemp - 200) / 300 * 100, 0, 100)}%`, top: 0, bottom: 0, width: 5, background: tC, borderRadius: 2, transition: "left 0.3s", boxShadow: `0 0 10px ${tC}` }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: C.gryD, marginTop: 2 }}><span>200℃</span><span>330</span><span>370</span><span>500℃</span></div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <Btn onClick={() => { AudioSys.playSfx("pipeTemp"); setPTemp(t => clamp(t - 20, 200, 500)); }} color={C.blu}>🧊 冷却</Btn>
              <Btn onClick={() => { AudioSys.playSfx("pipeTemp"); setPTemp(t => clamp(t + 20, 200, 500)); }} color={C.red}>🔥 加熱</Btn>
            </div>
            <div style={{ textAlign: "center", marginTop: 10 }}>
              <div style={{ height: 6, background: C.bg2, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${pTmr / 30 * 100}%`, height: "100%", background: C.gold, transition: "width 1s linear", borderRadius: 3 }} />
              </div>
            </div>
          </Box>}
          {pPh === "done" && <>
            <Box title="📊 パイプ焼き結果">
              <div style={{ textAlign: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 44, marginBottom: 6 }}>{quality >= 70 ? "🏆" : quality >= 45 ? "👍" : "😅"}</div>
                <div style={{ fontSize: 16, color: quality >= 70 ? C.gold : quality >= 45 ? C.grn : C.acc }}>
                  {quality >= 70 ? "完璧なパイプ！" : quality >= 45 ? "まずまずの出来" : "品質にやや不安…"}
                </div>
              </div>
              <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.8 }}>
                適温キープ率: {quality}%<br />
                品質ランク: {quality >= 70 ? "A (構造強度+15%)" : quality >= 45 ? "B (強度+5%)" : "C (ペナルティなし)"}<br />
                {MEMBERS[2].name}「{quality >= 70 ? "このパイプ、最高の出来だ！" : quality >= 45 ? "悪くない。十分使える" : "うーん…不安だけどいけるか？"}"
              </div>
            </Box>
            <div style={{ textAlign: "center" }}><Btn onClick={() => {
              const q = quality >= 70 ? 15 : quality >= 45 ? 5 : 0;
              setSt(s => ({ ...s, pipeQ: q, prg: clamp(s.prg + 5 + Math.floor(q / 2), 0, 100) }));
              AudioSys.playSfx("phaseChange"); setPh("load"); setLdPh("pre"); setLdPass(null); setLdDelay(0); setWk(w => w + 1);
            }}>荷重試験へ ▶</Btn></div>
          </>}
        </div>
      </div>
    );
  }

  // ──────── LOAD TEST ────────
  if (ph === "load") return (
    <div style={base}><link href={FL} rel="stylesheet" />
      {hdr("🌸", "春：荷重試験", `遅延: ${ldDelay}週`)}
      <div style={pad}>
        {ldPh === "pre" && <>
          <Box title="⚖️ 主翼の荷重試験">
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <AircraftSVG wing={dsn.w} prop={dsn.p} ride={dsn.r} airfoil={dsn.a} size={160} />
            </div>
            <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.8 }}>
              主翼の翼桁に砂袋を載せ、設計荷重の<span style={{ color: C.gold }}>1.5倍</span>の負荷をかける。
              合格すれば製作続行、不合格なら補強・再製作で<span style={{ color: C.acc }}>1週間の遅れ</span>。
            </div>
            <div style={{ marginTop: 8 }}>
              <Bar label="製作進捗" val={st.prg} color={C.org} />
              <Bar label="パイプ品質" val={st.pipeQ} max={15} color={C.grn} />
            </div>
            <div style={{ fontSize: 9, color: C.dim, marginTop: 6 }}>
              ※ 合格率は製作進捗とパイプ品質に依存します
            </div>
          </Box>
          <div style={{ textAlign: "center" }}>
            <Btn onClick={() => {
              AudioSys.playSfx("loadTest");
              setLdPh("testing");
              setTimeout(() => {
                const chance = 0.3 + st.prg * 0.005 + st.pipeQ * 0.012;
                const pass = Math.random() < chance;
                setLdPass(pass);
                setLdPh("result");
                if (pass) { AudioSys.playSfx("loadPass"); } else { AudioSys.playSfx("loadFail"); }
                if (!pass) {
                  setSt(s => ({ ...s, prg: clamp(s.prg - 12, 0, 100), mor: clamp(s.mor - 5, 0, 100) }));
                  setLdDelay(d => d + 1);
                }
              }, 2000);
            }}>⚖️ 荷重試験 実施！</Btn>
          </div>
        </>}
        {ldPh === "testing" && <Box>
          <div style={{ textAlign: "center", padding: 30 }}>
            <div style={{ fontSize: 40, animation: "bob 1s ease-in-out infinite" }}>⚖️</div>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 12 }}>
              砂袋を載せていく… 1.0倍… 1.2倍… 1.5倍…
            </div>
            <div style={{ fontSize: 10, color: C.org, marginTop: 8 }}>ミシ…ミシ…</div>
          </div>
          <style>{`@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
        </Box>}
        {ldPh === "result" && <Box title={ldPass ? "✅ 荷重試験 合格！" : "❌ 荷重試験 不合格…"}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>{ldPass ? "🎉" : "💥"}</div>
            <div style={{ fontSize: 14, color: ldPass ? C.grn : C.acc, marginBottom: 6 }}>
              {ldPass ? "1.5倍荷重に耐えた！翼は健全！" : "翼桁にクラックが入った…！補強して再試験！"}
            </div>
            <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.8 }}>
              {ldPass
                ? `${MEMBERS[2].name}「よし！翼は大丈夫だ！」\n${MEMBERS[1].name}設計者「計算通りだ」（ドヤ顔）`
                : `${MEMBERS[2].name}「くそっ…！接着が甘かった…」\n${MEMBERS[0].name}部長「落ち着け。1週間で直そう」\n\n進捗 -8%。再試験が必要です。`}
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 12 }}>
            {ldPass
              ? <Btn onClick={() => { AudioSys.playSfx("phaseChange"); setSt(s => ({ ...s, loadPass: true })); setPh("testFlight"); setTfWk(0); setWk(w => w + 1); }}>テストフライトへ ▶</Btn>
              : <Btn onClick={() => { setLdPh("pre"); setWk(w => w + 1); const ev = fireEvent(null); if (ev) setMsg({ text: `${ev.n}\n${ev.d}` }); }} color={C.org}>🔧 補修して再試験</Btn>}
          </div>
        </Box>}
      </div>
      {msg && <Dlg text={msg.text} onClose={() => setMsg(null)} />}
    </div>
  );

  // ──────── TEST FLIGHT ────────
  if (ph === "testFlight") {
    const tfActions = [
      { icon: "✈️", name: "テストフライト実施", desc: "富士川滑空場で飛行試験。操縦力＆体力UP", stats: "操縦力+2〜5, 体力+1〜2, 進捗+1〜3", eff: () => { AudioSys.playSfx("testFlight"); const c = rand(2, 5), s = rand(1, 2), p = rand(1, 3); setSt(sv => ({ ...sv, ctrl: clamp(sv.ctrl + c, 0, 120), sta: clamp(sv.sta + s, 0, 120), prg: clamp(sv.prg + p, 0, 100), tf: sv.tf + 1 })); return `✈️ テストフライト #${st.tf + 1}\n${["離陸成功！200mの直線飛行を達成", "旋回練習。操舵の感触を掴んだ", "連続500m飛行成功！チーム最長記録更新！"][Math.min(st.tf, 2)]}\n\n操縦力+${c} 体力+${s} 進捗+${p}`; } },
      { icon: "🔧", name: "機体の微調整", desc: `${MEMBERS[1].name}が重心位置とワイヤテンション調整`, stats: "進捗+2〜4", eff: () => { const p = rand(2, 4); setSt(sv => ({ ...sv, prg: clamp(sv.prg + p, 0, 100) })); return `${MEMBERS[1].name}「重心位置を5mm後退。安定性が向上した」\n進捗+${p}`; } },
      { icon: "🏋️", name: "パイロット追い込み", desc: "本番想定の1時間連続ペダリング", stats: "体力+3〜6", eff: () => { const v = rand(3, 6); setSt(sv => ({ ...sv, sta: clamp(sv.sta + v, 0, 120) })); return `パイロット「キツい…でもまだいける！」\n体力+${v}`; } },
    ];
    return (
      <div style={base}><link href={FL} rel="stylesheet" />
        {hdr("☀️", "夏：テストフライト", `W${wk + tfWk + 1} (${tfWk + 1}/${maxTfWk})`)}
        <div style={pad}>
          <Box title="📊 チーム＆機体状況">
            <AircraftSVG wing={dsn.w} prop={dsn.p} ride={dsn.r} airfoil={dsn.a} size={160} />
            <div style={{ marginTop: 6 }}>
              <Bar label="操縦力" val={st.ctrl} max={120} color={C.blu} />
              <Bar label="体力" val={st.sta} max={120} color={C.grn} />
              <Bar label="進捗" val={st.prg} color={C.org} />
              <Bar label="士気" val={st.mor} color={C.pnk} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
              <div style={{ display: "flex", gap: 4 }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 20, height: 20, borderRadius: 3, background: i < st.tf ? C.grn : C.bg2, border: `1px solid ${i < st.tf ? C.grn : C.gryD}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: C.wht }}>{i < st.tf ? "✓" : ""}</div>)}
                <span style={{ fontSize: 9, color: C.dim, marginLeft: 4, alignSelf: "center" }}>テスト飛行 {st.tf}/3</span>
              </div>
              <span style={{ fontSize: 10, color: C.gold }}>💰 {st.money.toLocaleString()}円</span>
            </div>
          </Box>
          {tfWk < maxTfWk ? (
            <Box title={`📅 Week ${wk + tfWk + 1}：今週なにをする？`}>
              <WeekActions actions={tfActions} onPick={a => {
                AudioSys.playSfx("weekPass");
                const result = a.eff();
                setSt(s => ({ ...s, mor: clamp(s.mor - rand(1, 3), 0, 100) }));
                const ev = fireEvent("summer");
                if (ev && (ev.e === "jk" || ev.e === "mini")) {
                  setMsg({ text: result });
                } else {
                  let txt = result;
                  if (ev) txt += `\n\n────────────\n${ev.n}\n${ev.d}`;
                  setMsg({ text: txt });
                }
                setTfWk(w => w + 1);
                setWk(w => w + 1);
              }} />
            </Box>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: C.gold, marginBottom: 8 }}>準備期間終了。いざ琵琶湖へ！</div>
            </div>
          )}
          {(tfWk >= 1 || tfWk >= maxTfWk) && (
            <div style={{ textAlign: "center", marginTop: 6 }}>
              <Btn onClick={() => { AudioSys.playSfx("cheer"); setPh("contest"); setCPh("pre"); setDist(0); setCRes(null); setWind(WINDS[rand(0, WINDS.length - 1)]); }} color={C.acc}>
                🏆 鳥人間コンテスト本番へ！
              </Btn>
            </div>
          )}
        </div>
        {msg && <Dlg text={msg.text} onClose={() => setMsg(null)} />}
        {jk && <JankenDlg jk={jk} onPick={doJanken} onClose={closeJanken} />}
        {sprt && <SpiritsDlg sprt={sprt} onMash={mashSprt} onStart={startSprt} onClose={closeSprt} />}
        {hanami && <HanamiDlg data={hanami} onTap={tapHanami} onStart={startHanami} onClose={closeHanami} />}
        {bbq && <BbqDlg data={bbq} onFlip={flipBbq} onStart={startBbq} onClose={closeBbq} />}
        {yakitori && <YakitoriDlg data={yakitori} onTap={tapYakitori} onStart={startYakitori} onClose={closeYakitori} />}
      </div>
    );
  }

  // ──────── CONTEST ────────
  if (ph === "contest") return (
    <div style={base}><link href={FL} rel="stylesheet" />
      {hdr("🏆", "鳥人間コンテスト本番")}
      <div style={pad}>
        {cPh === "pre" && <>
          <Box title="📋 大会前日：機体安全検査">
            <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.8, marginBottom: 8 }}>
              琵琶湖・松原湖岸に到着。高さ10mのプラットフォームがそびえる。
              審査員による設計図・機体安全性・パイロット健康チェック。
            </div>
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <AircraftSVG wing={dsn.w} prop={dsn.p} ride={dsn.r} airfoil={dsn.a} size={180} />
            </div>
            <div style={{ textAlign: "center", fontSize: 12, color: C.grn }}>📋✅ 設計図 ✅ 機体安全性 ✅ 健康チェック<br />全項目合格！</div>
          </Box>
          <Box title="🌬️ 大会当日の風況">
            <div style={{ fontSize: 14, color: C.wht, textAlign: "center", marginBottom: 6 }}>{wind?.n} ({wind?.s}m/s・{wind?.d})</div>
            <div style={{ fontSize: 10, color: wind?.s > 3 ? C.acc : C.grn, textAlign: "center" }}>
              {wind?.s > 3 ? "⚠️ 風が強い。旋回と横風に注意" : wind?.s > 1 ? "穏やかな風。まずまずのコンディション" : "☀️ 無風。絶好のフライト日和！"}
            </div>
          </Box>
          <div style={{ textAlign: "center" }}><Btn onClick={() => setCPh("course")}>コース選択へ ▶</Btn></div>
        </>}

        {cPh === "course" && <>
          <Box title="🗺️ コース選択">
            <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.8, marginBottom: 10 }}>
              プラットフォームから琵琶湖の対岸を目指す。<br />
              折り返しなしルール。対岸到達(約10km)が最長記録。<br />
              風向きを読んで有利なコースを選べ！
            </div>
            <div style={{ background: `linear-gradient(180deg,${C.sky}33,${C.lake})`, height: 120, borderRadius: 6, position: "relative", marginBottom: 10, border: "1px solid rgba(255,255,255,0.12)" }}>
              <div style={{ position: "absolute", bottom: 6, right: 10, fontSize: 8, color: "rgba(255,255,255,0.4)" }}>琵琶湖</div>
              <div style={{ position: "absolute", bottom: 22, right: 18, fontSize: 14 }}>🏗️</div>
              <div style={{ position: "absolute", bottom: 25, right: 35, fontSize: 8, color: C.wht }}>彦根</div>
              <div style={{ position: "absolute", top: 12, right: 40, fontSize: 9, color: "rgba(255,255,255,0.5)" }}>← 北ルート</div>
              <div style={{ position: "absolute", top: 55, left: 12, fontSize: 9, color: "rgba(255,255,255,0.5)" }}>← 西ルート</div>
              <div style={{ position: "absolute", top: 6, left: 6, fontSize: 9, color: C.gold }}>🌬️{wind?.d} {wind?.s}m/s</div>
            </div>
          </Box>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <Btn onClick={() => { setCourse("north"); setCPh("launch"); }} color={C.blu}>🧭 北コース</Btn>
            <Btn onClick={() => { setCourse("west"); setCPh("launch"); }} color={C.grn}>🧭 西コース</Btn>
          </div>
          <div style={{ textAlign: "center", marginTop: 6, fontSize: 9, color: C.dim }}>
            {wind?.d?.includes("北") ? "💡 北風なら西コースが追い風に" : wind?.d?.includes("南") ? "💡 南風なら北コースが追い風に" : "💡 風が弱い。好みで選ぼう"}
          </div>
        </>}

        {cPh === "launch" && <Box title="🛫 プラットフォーム上">
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <AircraftSVG wing={dsn.w} prop={dsn.p} ride={dsn.r} airfoil={dsn.a} size={200} />
            <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.8, marginTop: 10 }}>
              {MEMBERS[0].name}「行くぞ！1年間の全てをぶつけろ！」<br />
              {pilot?.name}がコックピットに乗り込む。<br />
              {MEMBERS[2].name}たちが翼端を支える。風を待つ…<br /><br />
              <span style={{ color: C.gold }}>{course === "north" ? "北" : "西"}コース | {wind?.n}</span>
            </div>
            <div style={{ marginTop: 12 }}>
              <Btn onClick={() => { setCPh("flying"); setDist(0); setCRes(null); setRevealPhase(null); AudioSys.playSfx("takeoff"); }}>🚀 テイクオフ！！</Btn>
            </div>
          </div>
        </Box>}

        {cPh === "flying" && <>
          <div style={{ background: `linear-gradient(180deg,#5ba3d9 0%,#87ceeb 30%,#a8d8ea 50%,${C.lakeL} 55%,${C.lake} 100%)`, height: 200, borderRadius: 6, overflow: "hidden", position: "relative", border: "2px solid rgba(255,255,255,0.15)", marginBottom: 8 }}>
            {/* Clouds scrolling based on distance */}
            <div style={{ position: "absolute", top: 8, left: `${Math.max(-10, (1 - dist / maxD) * 80)}%`, transition: "left 1s", opacity: .45 }}>
              <svg width="50" height="20" viewBox="0 0 50 20"><ellipse cx="25" cy="13" rx="22" ry="8" fill="rgba(255,255,255,0.6)"/><ellipse cx="18" cy="10" rx="12" ry="7" fill="rgba(255,255,255,0.7)"/><ellipse cx="32" cy="9" rx="14" ry="8" fill="rgba(255,255,255,0.65)"/></svg>
            </div>
            <div style={{ position: "absolute", top: 22, left: `${Math.max(5, (1 - dist / maxD) * 55 + 25)}%`, transition: "left 1.2s", opacity: .3 }}>
              <svg width="35" height="14" viewBox="0 0 35 14"><ellipse cx="17" cy="9" rx="15" ry="6" fill="rgba(255,255,255,0.5)"/><ellipse cx="12" cy="7" rx="9" ry="5" fill="rgba(255,255,255,0.6)"/></svg>
            </div>
            {/* Distant shore appearing */}
            {dist > maxD * .5 && <div style={{ position: "absolute", top: 78, right: 0, width: 80, height: 20, background: "linear-gradient(90deg,transparent,rgba(100,140,100,0.2))", borderRadius: "4px 0 0 0", opacity: Math.min(1, (dist / maxD - .5) * 3), transition: "opacity 1s" }} />}
            {/* THE AIRCRAFT */}
            <div style={{ position: "absolute", top: 20, left: "15%", animation: "hpafloat 3s ease-in-out infinite", filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.25))" }}>
              <AircraftSVG wing={dsn.w} prop={dsn.p} ride={dsn.r} airfoil={dsn.a} size={140} animate={true} noBg={true} />
            </div>
            {/* Pilot speech bubble */}
            {flightMsg?.from === "pilot" && <div style={{ position: "absolute", top: 6, left: "8%", background: "rgba(255,255,255,0.9)", color: "#333", fontSize: 9, padding: "3px 8px", borderRadius: "8px 8px 8px 2px", maxWidth: 140, animation: "msgFade 3.5s ease-in-out", fontFamily: "'DotGothic16',monospace" }}>
              {pilot?.name?.split(" ")[1]}「{flightMsg.text}」
            </div>}
            {/* Lake surface detail */}
            <div style={{ position: "absolute", bottom: 58, left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.06)" }} />
            <div style={{ position: "absolute", bottom: 50, left: "10%", width: "30%", height: 1, background: "rgba(255,255,255,0.04)" }} />
            <div style={{ position: "absolute", bottom: 54, left: "55%", width: "20%", height: 1, background: "rgba(255,255,255,0.05)" }} />
            {/* Motor boat (designer chasing) */}
            <div style={{ position: "absolute", bottom: 32, left: "35%", transition: "left 1s" }}>
              <svg width="40" height="18" viewBox="0 0 40 18">
                <path d="M 5,12 Q 10,6 20,8 L 35,8 Q 38,10 35,12 Z" fill="#ddd" stroke="#999" strokeWidth="0.5"/>
                <circle cx="22" cy="6" r="3" fill="rgba(240,180,100,0.8)"/>{/* person */}
                <line x1="18" y1="12" x2="16" y2="15" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                <line x1="26" y1="12" x2="28" y2="15" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
              </svg>
            </div>
            {/* Designer speech bubble */}
            {flightMsg?.from === "designer" && <div style={{ position: "absolute", bottom: 50, left: "30%", background: "rgba(78,204,163,0.9)", color: "#fff", fontSize: 9, padding: "3px 8px", borderRadius: "8px 8px 2px 8px", maxWidth: 130, animation: "msgFade 3.5s ease-in-out", fontFamily: "'DotGothic16',monospace" }}>
              {MEMBERS[1].name.split(" ")[1]}「{flightMsg.text}」
            </div>}
            {/* Rescue boat (small, background) */}
            <div style={{ position: "absolute", bottom: 38, left: "70%", fontSize: 7, opacity: .2 }}>🚤</div>
            {/* Progress bar (no distance number) */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 20, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", padding: "0 10px" }}>
              <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.12)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${clamp(dist / maxD * 100, 0, 100)}%`, height: "100%", background: `linear-gradient(90deg,${C.grn},${C.gold})`, borderRadius: 3, transition: "width .4s" }} />
              </div>
            </div>
            {/* Wind indicator */}
            <div style={{ position: "absolute", top: 4, right: 6, fontSize: 9, color: "rgba(255,255,255,0.7)", background: "rgba(0,0,0,0.35)", padding: "2px 6px", borderRadius: 3, fontFamily: "'DotGothic16',monospace" }}>🌬️{wind?.n}</div>
            <style>{`@keyframes hpafloat{0%,100%{transform:translateY(0) rotate(-0.5deg)}50%{transform:translateY(-6px) rotate(0.5deg)}}@keyframes msgFade{0%{opacity:0;transform:translateY(4px)}10%{opacity:1;transform:translateY(0)}85%{opacity:1}100%{opacity:0}}`}</style>
          </div>
        </>}

        {cPh === "done" && cRes && <>
          {/* ── Reveal animation ── */}
          {revealPhase === "splash" && <div style={{ textAlign: "center", padding: 40, animation: "fadeIn .5s" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>💦</div>
            <div style={{ fontSize: 14, color: C.wht }}>🎙️「ここで着水！」</div>
          </div>}
          {revealPhase === "drumroll" && <div style={{ textAlign: "center", padding: 40, animation: "pulse 0.3s infinite" }}>
            <div style={{ fontSize: 16, color: C.gold }}>📺 記録は…</div>
            <div style={{ fontSize: 10, color: C.dim, marginTop: 8 }}>（会場が静まり返る…）</div>
          </div>}
          {revealPhase === "announce" && <div style={{ textAlign: "center", padding: 40, animation: "fadeIn .5s" }}>
            <div style={{ fontSize: 16, color: cRes.d >= maxD ? C.gold : cRes.d >= 12000 ? C.grn : C.wht, fontWeight: "bold" }}>
              {cRes.d >= maxD ? "🎙️「すばらしい記録が出たようです！」" : cRes.d >= 12000 ? "🎙️「いい記録が出ました！」" : "🎙️「記録が出ました！」"}
            </div>
          </div>}
          {revealPhase === "reveal" && <>
            <div style={{ textAlign: "center", padding: 16, background: cRes.d >= maxD ? `linear-gradient(180deg,${C.gold}18,${C.bg})` : C.bg, borderRadius: 8, border: cRes.d >= maxD ? `2px solid ${C.gold}` : "none", marginBottom: 10, animation: "revealPop .6s ease-out" }}>
              <div style={{ fontSize: 50, marginBottom: 6 }}>
                {cRes.d >= maxD ? "🏆" : cRes.d >= 12000 ? "🥈" : cRes.d >= 6000 ? "🥉" : cRes.d >= 1000 ? "✈️" : "💦"}
              </div>
              <div style={{ fontSize: 24, color: cRes.d >= maxD ? C.gold : C.wht, marginBottom: 6, fontWeight: "bold" }}>
                {(cRes.d / 1000).toFixed(2)} km
              </div>
              <div style={{ fontSize: 12, color: C.dim, marginBottom: 6 }}>{cRes.r}</div>
            </div>
            <Box title="📋 フライトデータ">
              <AircraftSVG wing={dsn.w} prop={dsn.p} ride={dsn.r} airfoil={dsn.a} size={160} />
              <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.8, marginTop: 8 }}>
                チーム: {team} | パイロット: {pilot?.name}<br />
                翼型: {AIRFOILS.find(x => x.id === dsn.a)?.name} | {WINGS.find(x => x.id === dsn.w)?.name}({WINGS.find(x => x.id === dsn.w)?.span})<br />
                プロペラ: {PROPS.find(x => x.id === dsn.p)?.name} | {RIDES.find(x => x.id === dsn.r)?.name}<br />
                コース: {course === "north" ? "北" : "西"} | 風: {wind?.n}<br />
                テスト飛行: {st.tf}回 | パイプ品質: {st.pipeQ >= 15 ? "A" : st.pipeQ >= 5 ? "B" : "C"}<br />
                💰 残金: {st.money.toLocaleString()}円 (ジュース代: {(3000 - st.money).toLocaleString()}円)
              </div>
            </Box>
            <Box title="🏅 総合評価">{(() => {
              const d = cRes.d;
              const r = d >= maxD ? "S" : d >= 18000 ? "A" : d >= 12000 ? "B" : d >= 6000 ? "C" : d >= 3000 ? "D" : d >= 1000 ? "E" : "F";
              const rc = { S: C.gold, A: C.grn, B: C.blu, C: C.org, D: C.acc, E: C.gryD, F: C.gry };
              const rm = { S: "伝説のフライト！鳥人間の歴史に名を刻んだ！", A: "素晴らしい記録！来年こそ完走を目指せ！", B: "立派な記録！チームの1年の努力が実った！", C: "まずまずの結果。次はもっと上を目指そう！", D: "悔しいが、飛んだことが何より大事だ", E: "短いフライトだったが来年につながる経験に", F: "離陸直後に着水…来年こそリベンジだ！" };
              return <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 56, color: rc[r], textShadow: `0 0 20px ${rc[r]}55`, marginBottom: 6 }}>{r}</div>
                <div style={{ fontSize: 11, color: C.txt }}>{rm[r]}</div>
              </div>;
            })()}</Box>
            {evLog.length > 0 && <Box title="📖 1年間の思い出">
              <div style={{ fontSize: 9, color: C.dim, lineHeight: 1.8 }}>{evLog.join(" → ")}</div>
            </Box>}
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <Btn onClick={resetGame} color={C.blu}>🔄 もう一度遊ぶ</Btn>
            </div>
          </>}
          <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}@keyframes revealPop{0%{transform:scale(0.5);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}`}</style>
        </>}
      </div>
      {msg && <Dlg text={msg.text} onClose={() => setMsg(null)} />}
    </div>
  );

  return null;
}
