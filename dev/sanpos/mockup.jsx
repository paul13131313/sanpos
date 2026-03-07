import { useState } from "react";

const walks = [
  {
    id: 1,
    user: "Hiroshi",
    avatar: "🧑",
    location: "代々木公園 → 原宿",
    distance: "3.2km",
    duration: "48分",
    photos: ["🌸", "🌿", "☕"],
    comment: "桜がもう少しで満開。来週が見頃かも。",
    likes: 24,
    time: "今日 8:32",
    tag: "🌸 桜",
    color: "#f9a8a8",
  },
  {
    id: 2,
    user: "Mika",
    avatar: "👩",
    location: "等々力渓谷",
    distance: "2.1km",
    duration: "35分",
    photos: ["🌲", "💧"],
    comment: "都内とは思えない静けさ。犬連れにも最高でした。",
    likes: 41,
    time: "昨日",
    tag: "🐶 犬連れOK",
    color: "#a8d5a8",
  },
  {
    id: 3,
    user: "Kenji",
    avatar: "🧔",
    location: "谷中 → 根津",
    distance: "4.5km",
    duration: "1時間12分",
    photos: ["🏠", "🐱", "🍜"],
    comment: "猫が多すぎてなかなか進めなかった。",
    likes: 88,
    time: "2日前",
    tag: "🐱 猫スポット",
    color: "#f5d6a8",
  },
];

const mapPins = [
  { x: 30, y: 40, user: "🌸", color: "#f9a8a8" },
  { x: 55, y: 25, user: "🌲", color: "#a8d5a8" },
  { x: 70, y: 60, user: "🐱", color: "#f5d6a8" },
  { x: 20, y: 65, user: "☕", color: "#d4b896" },
  { x: 45, y: 75, user: "🌿", color: "#a8d5a8" },
  { x: 82, y: 35, user: "🌸", color: "#f9a8a8" },
];

export default function Sanpos() {
  const [tab, setTab] = useState("home");
  const [liked, setLiked] = useState({});

  const toggleLike = (id) => {
    setLiked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "#e8e4de",
        fontFamily: "'Hiragino Maru Gothic ProN', 'Rounded Mplus 1c', sans-serif",
        padding: "20px",
      }}
    >
      {/* Phone frame */}
      <div
        style={{
          width: 375,
          height: 812,
          background: "#faf8f5",
          borderRadius: 44,
          overflow: "hidden",
          boxShadow: "0 40px 80px rgba(0,0,0,0.18), 0 0 0 10px #1a1a1a, 0 0 0 12px #333",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Status bar */}
        <div style={{ height: 44, background: "#faf8f5", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#3a3530" }}>9:41</span>
          <div style={{ width: 120, height: 28, background: "#1a1a1a", borderRadius: 20, position: "absolute", left: "50%", transform: "translateX(-50%)" }} />
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#3a3530" }}>●●●</span>
          </div>
        </div>

        {/* Header */}
        <div style={{ padding: "8px 20px 12px", background: "#faf8f5", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#3a3530", letterSpacing: "-0.5px" }}>sanpos</div>
            <div style={{ fontSize: 11, color: "#9a9088", marginTop: 1 }}>みんなの散歩、見つけよう。</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>🔔</button>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e8e0d8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🧑</div>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", padding: "0 20px", gap: 6, flexShrink: 0, marginBottom: 12 }}>
          {[
            { id: "home", label: "タイムライン" },
            { id: "map", label: "マップ" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "6px 16px",
                borderRadius: 20,
                border: "none",
                background: tab === t.id ? "#3a3530" : "#ede9e3",
                color: tab === t.id ? "#faf8f5" : "#7a7068",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 0 80px" }}>
          {tab === "home" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 16px" }}>
              {/* Season banner */}
              <div style={{
                background: "linear-gradient(135deg, #fde8e8 0%, #fdf0e8 100%)",
                borderRadius: 20,
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}>
                <span style={{ fontSize: 28 }}>🌸</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#c4786a" }}>桜シーズン到来</div>
                  <div style={{ fontSize: 11, color: "#b08878", marginTop: 2 }}>今週の桜スポット投稿 142件</div>
                </div>
              </div>

              {/* Walk cards */}
              {walks.map((walk) => (
                <div
                  key={walk.id}
                  style={{
                    background: "#fff",
                    borderRadius: 20,
                    overflow: "hidden",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                  }}
                >
                  {/* Card header */}
                  <div style={{ padding: "14px 16px 10px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#f0ebe4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                      {walk.avatar}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#3a3530" }}>{walk.user}</div>
                      <div style={{ fontSize: 11, color: "#9a9088" }}>{walk.time}</div>
                    </div>
                    <div style={{
                      background: walk.color + "44",
                      color: "#6a5a48",
                      fontSize: 11,
                      padding: "4px 10px",
                      borderRadius: 12,
                      fontWeight: 600,
                    }}>
                      {walk.tag}
                    </div>
                  </div>

                  {/* Photo strip */}
                  <div style={{ display: "flex", gap: 3, padding: "0 16px 12px" }}>
                    {walk.photos.map((p, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: 80,
                          background: walk.color + "33",
                          borderRadius: 12,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 28,
                        }}
                      >
                        {p}
                      </div>
                    ))}
                  </div>

                  {/* Route info */}
                  <div style={{ padding: "0 16px 10px", display: "flex", gap: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 11, color: "#9a9088" }}>📍</span>
                      <span style={{ fontSize: 12, color: "#5a5048", fontWeight: 600 }}>{walk.location}</span>
                    </div>
                  </div>
                  <div style={{ padding: "0 16px 10px", display: "flex", gap: 16 }}>
                    <span style={{ fontSize: 12, color: "#9a9088" }}>🚶 {walk.distance}</span>
                    <span style={{ fontSize: 12, color: "#9a9088" }}>⏱ {walk.duration}</span>
                  </div>

                  {/* Comment */}
                  <div style={{ padding: "0 16px 12px" }}>
                    <p style={{ fontSize: 13, color: "#4a4038", lineHeight: 1.6, margin: 0 }}>{walk.comment}</p>
                  </div>

                  {/* Actions */}
                  <div style={{ padding: "10px 16px 14px", borderTop: "1px solid #f0ebe4", display: "flex", alignItems: "center", gap: 16 }}>
                    <button
                      onClick={() => toggleLike(walk.id)}
                      style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: 0 }}
                    >
                      <span style={{ fontSize: 16 }}>{liked[walk.id] ? "❤️" : "🤍"}</span>
                      <span style={{ fontSize: 12, color: "#9a9088" }}>{walk.likes + (liked[walk.id] ? 1 : 0)}</span>
                    </button>
                    <button style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: 0 }}>
                      <span style={{ fontSize: 16 }}>💬</span>
                      <span style={{ fontSize: 12, color: "#9a9088" }}>返信</span>
                    </button>
                    <button style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: 0, marginLeft: "auto" }}>
                      <span style={{ fontSize: 16 }}>🗺️</span>
                      <span style={{ fontSize: 12, color: "#9a9088" }}>このルートを歩く</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Map tab */
            <div style={{ padding: "0 16px" }}>
              {/* Map area */}
              <div style={{
                height: 420,
                background: "linear-gradient(135deg, #e8f0e8 0%, #f0ece4 50%, #e4ece8 100%)",
                borderRadius: 24,
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              }}>
                {/* Fake roads */}
                <svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0, opacity: 0.3 }}>
                  <path d="M0,200 Q180,180 343,220" stroke="#b0a898" strokeWidth="8" fill="none"/>
                  <path d="M170,0 Q175,210 180,420" stroke="#b0a898" strokeWidth="6" fill="none"/>
                  <path d="M0,300 Q120,280 343,320" stroke="#c8c0b4" strokeWidth="4" fill="none"/>
                  <path d="M80,0 Q90,200 100,420" stroke="#c8c0b4" strokeWidth="3" fill="none"/>
                  <path d="M240,0 Q245,200 250,420" stroke="#c8c0b4" strokeWidth="3" fill="none"/>
                  <rect x="100" y="80" width="140" height="100" rx="8" fill="#d8d0c4" opacity="0.5"/>
                  <rect x="180" y="240" width="80" height="120" rx="8" fill="#d8d0c4" opacity="0.5"/>
                  <rect x="20" y="200" width="60" height="80" rx="8" fill="#d8d0c4" opacity="0.5"/>
                </svg>

                {/* Walk route overlay */}
                <svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0 }}>
                  <path d="M60,350 Q80,300 120,250 Q160,200 200,180 Q240,160 280,140" stroke="#c4786a" strokeWidth="3" fill="none" strokeDasharray="6,3" opacity="0.7"/>
                </svg>

                {/* Map pins */}
                {mapPins.map((pin, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: `${pin.x}%`,
                      top: `${pin.y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50% 50% 50% 0",
                      transform: "rotate(-45deg)",
                      background: "#fff",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `2px solid ${pin.color}`,
                    }}>
                      <span style={{ transform: "rotate(45deg)", fontSize: 16 }}>{pin.user}</span>
                    </div>
                  </div>
                ))}

                {/* Map overlay label */}
                <div style={{
                  position: "absolute",
                  top: 14,
                  left: 14,
                  background: "rgba(255,255,255,0.9)",
                  borderRadius: 12,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#5a5048",
                  backdropFilter: "blur(4px)",
                }}>
                  📍 東京 · 今日の散歩
                </div>

                <div style={{
                  position: "absolute",
                  bottom: 14,
                  right: 14,
                  background: "rgba(255,255,255,0.9)",
                  borderRadius: 12,
                  padding: "6px 12px",
                  fontSize: 12,
                  color: "#5a5048",
                  backdropFilter: "blur(4px)",
                }}>
                  🚶 23人が散歩中
                </div>
              </div>

              {/* Filter tags */}
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                {["すべて", "🌸 桜", "🐶 犬連れ", "🐱 猫スポット", "☕ カフェ"].map((tag, i) => (
                  <button
                    key={tag}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 16,
                      border: "none",
                      background: i === 0 ? "#3a3530" : "#ede9e3",
                      color: i === 0 ? "#faf8f5" : "#7a7068",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 80,
          background: "#faf8f5",
          borderTop: "1px solid #ede9e3",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          paddingBottom: 16,
        }}>
          {[
            { icon: "🏠", label: "ホーム" },
            { icon: "🗺️", label: "マップ" },
          ].map((item) => (
            <button key={item.label} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer" }}>
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <span style={{ fontSize: 10, color: "#9a9088" }}>{item.label}</span>
            </button>
          ))}

          {/* Start walk button */}
          <button style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#3a3530",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(58,53,48,0.3)",
            marginTop: -20,
          }}>
            🚶
          </button>

          {[
            { icon: "🏅", label: "バッジ" },
            { icon: "👤", label: "マイページ" },
          ].map((item) => (
            <button key={item.label} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer" }}>
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <span style={{ fontSize: 10, color: "#9a9088" }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
