import { useState, useRef, useCallback, useMemo, useEffect } from "react";

// ==================== Parser ====================
function parse(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const msgs = [], parts = new Set();
  let gn = "", cd = "", ord = 0;
  for (const l of lines) {
    let m;
    if ((m = l.match(/^\[LINE\]\s*(.+)$/))) { gn = m[1].replace("のトーク履歴", ""); continue; }
    if ((m = l.match(/^(\d{4})\/(\d{2})\/(\d{2})\((.)\)$/))) { cd = `${m[1]}/${m[2]}/${m[3]}(${m[4]})`; continue; }
    if ((m = l.match(/^(\d{1,2}):(\d{2})\t(.+?)\t(.*)$/))) {
      const sp = { "[スタンプ]": "sticker", "[写真]": "photo", "[動画]": "video", "[ファイル]": "file", "[ボイスメッセージ]": "voice" };
      parts.add(m[3].trim());
      msgs.push({ id: `m${ord}`, date: cd, time: `${m[1].padStart(2, "0")}:${m[2].padStart(2, "0")}`, userName: m[3].trim(), text: m[4], type: sp[m[4]] || "text", order: ord++ });
    }
  }
  return { groupName: gn || "トーク", messages: msgs, participants: [...parts] };
}

// ==================== Color Palette (craft/warm) ====================
const C = {
  bg: "#F5F0E8",        // craft paper bg
  bgDark: "#EDE7DB",    // slightly darker craft
  card: "#FFFDF8",      // warm white card
  accent: "#8B6B4A",    // warm brown accent
  accentLight: "#C4A97D", // lighter brown
  accentBg: "#F0E6D6",  // accent background
  text: "#3D3225",       // dark brown text
  textSub: "#8C7B6B",   // sub text
  textLight: "#B5A898",  // light text
  border: "#E0D5C5",    // border
  danger: "#C44D3E",    // red/danger
  dangerBg: "#FDE8E5",  // danger background
  green: "#06C755",     // LINE official green
};

// ==================== Background presets ====================
const BG_PRESETS = [
  { id: "white", label: "ホワイト", bg: "#F7F8FA", text: "#222", sub: "#888", dateBg: "#ECEEF2", wmk: "#bbb", border: "#E0E0E0" },
  { id: "green", label: "グリーン", bg: "#D9EFD2", text: "#1A3A15", sub: "#5C8055", dateBg: "#C5E3BC", wmk: "#8CB883", border: "#B0D4A6" },
  { id: "craft", label: "クラフト", bg: "#F5F0E8", text: "#3D3225", sub: "#8C7B6B", dateBg: "#EDE7DB", wmk: "#C4A97D", border: "#E0D5C5" },
  { id: "dark", label: "ダーク", bg: "#1A1A2E", text: "#F0F0F0", sub: "#999", dateBg: "#2A2A3E", wmk: "#555", border: "#333" },
  { id: "sky", label: "スカイ", bg: "#E3EEF8", text: "#1A2A3E", sub: "#7799AA", dateBg: "#D4E4F0", wmk: "#99BBDD", border: "#B0CCE0" },
];

// ==================== Default bubble colors ====================
const BUBBLE_PRESETS = ["#FFFFFF", "#DCF8C6", "#BDE0FE", "#FFD6A5", "#E8D5F5", "#FFB3C1", "#C5E8D0", "#F0E68C", "#D4E7F1"];

// ==================== Name Colors ====================
const NC = ["#5A7A3E", "#3E6A7A", "#8B5A3A", "#6A3E7A", "#7A6A3E", "#3E7A6A"];
function gnc(name, parts) { return NC[parts.indexOf(name) % NC.length]; }

// default bubble color per participant
function defaultBubbleColor(name, parts) { return BUBBLE_PRESETS[parts.indexOf(name) % BUBBLE_PRESETS.length]; }

// ==================== Helpers ====================
function Hi({ text, q }) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return <>{text.slice(0, i)}<span style={{ backgroundColor: "#F0E68C", borderRadius: 2, padding: "0 1px" }}>{text.slice(i, i + q.length)}</span>{text.slice(i + q.length)}</>;
}

function MT({ msg, q, mFull, mPart }) {
  const ic = { "sticker": "🎫 スタンプ", "photo": "📷 写真", "video": "🎬 動画", "file": "📎 ファイル", "voice": "🎤 ボイス" };
  if (ic[msg.type]) return ic[msg.type];
  if (mFull && mFull.has(msg.id)) {
    return <span style={{ filter: "blur(5px)", userSelect: "none", color: "#aaa" }}>{msg.text.replace(/./g, "●")}</span>;
  }
  const ranges = mPart && mPart[msg.id];
  if (ranges && ranges.length > 0) {
    const chars = [...msg.text];
    const sorted = [...ranges].sort((a, b) => a.start - b.start);
    const result = [];
    let pos = 0;
    sorted.forEach((r, ri) => {
      if (pos < r.start) result.push(<span key={`t${ri}`}>{chars.slice(pos, r.start).join("")}</span>);
      result.push(<span key={`m${ri}`} style={{ filter: "blur(5px)", userSelect: "none", color: "#aaa" }}>{chars.slice(r.start, r.end).map(() => "●").join("")}</span>);
      pos = r.end;
    });
    if (pos < chars.length) result.push(<span key="e">{chars.slice(pos).join("")}</span>);
    return <>{result}</>;
  }
  if (q) return <Hi text={msg.text} q={q} />;
  return msg.text;
}

// ==================== Logo (PNG) ====================
function Logo({ height, width }) {
  return <img src="/logo.png" alt="チャットカット" style={{ height, width, display: "block", margin: "0 auto", objectFit: "contain", mixBlendMode: "multiply" }} />;
}

// ==================== Demo Data ====================
const demo = `[LINE] 大学同期のトーク履歴
保存日時：2025/02/10 18:30

2025/02/08(土)
14:23\tたくや\tなあ聞いてくれ
14:23\tたくや\tさっきコンビニ行ったんだけど
14:24\tゆうこ\tうん
14:24\tたくや\tレジで「温めますか？」って聞かれて
14:24\tたくや\t「大丈夫です」って言おうとしたら
14:25\tたくや\t「愛してます」って言っちゃった
14:25\tゆうこ\tえ
14:25\tゆうこ\tええええ
14:25\tけんた\tは？？？
14:26\tゆうこ\t嘘でしょ笑笑笑笑
14:26\tけんた\tなんでそうなるんだよ
14:26\tたくや\t自分でもわからない
14:27\tたくや\t店員さんめちゃくちゃ困ってた
14:27\tゆうこ\tそりゃそうだろ笑笑
14:27\tけんた\t店員さんかわいそう
14:28\tたくや\tしかも後ろに5人くらい並んでた
14:28\tゆうこ\t地獄じゃん
14:28\tけんた\t二度とその店行けないな
14:29\tたくや\tもう引っ越す
14:29\tゆうこ\t大げさ笑笑笑
14:30\tけんた\tていうかそのお弁当は温まったの？
14:30\tたくや\t...温まってない
14:30\tゆうこ\tダメじゃん笑笑笑笑笑
14:31\tけんた\t愛は伝わったけど弁当は冷たいまま
14:31\tゆうこ\t名言出た
14:31\tたくや\tやめてくれ

2025/02/09(日)
10:15\tゆうこ\tたくやまだコンビニ行けてる？
10:20\tたくや\t行けてない
10:20\tたくや\t今ウーバーで生きてる
10:21\tけんた\tウーバーの配達員に愛を告白しないようにな
10:21\tたくや\tさすがにしない
10:22\tゆうこ\tまあでもさ、いい話じゃん
10:22\tゆうこ\t世の中にもっと愛を伝えていこう
10:23\tたくや\tポジティブすぎる
10:23\tけんた\tコンビニ愛の伝道師
10:24\tたくや\tその肩書きいらない`;

// ======================================================================
//  HOME PAGE
// ======================================================================
function Home({ onLoad, onDemo }) {
  const fr = useRef(null);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState("");
  const h = useCallback(f => {
    if (!f) return;
    if (!f.name.endsWith(".txt")) { setErr(".txt ファイルを選択してください"); return; }
    setErr("");
    const r = new FileReader();
    r.onload = e => {
      try { const res = parse(e.target.result); if (!res.messages.length) { setErr("メッセージが見つかりません"); return; } onLoad(res); }
      catch (x) { setErr("読み込み失敗: " + x.message); }
    };
    r.readAsText(f, "UTF-8");
  }, [onLoad]);

  return (
    <div style={S.homePage}><div style={S.homeContent}>
      <div style={{ textAlign: "center", marginBottom: 28, marginTop: 24 }}>
        <Logo width="75%" />
        <p style={{ fontSize: 15, color: C.textSub, margin: "10px 0 0", fontWeight: 500 }}>ほしいとこだけ、切り抜いてシェア</p>
      </div>
      <div style={{ ...S.uploadArea, ...(drag ? { borderColor: C.accent, backgroundColor: C.accentBg } : {}) }}
        onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); h(e.dataTransfer.files[0]); }}
        onClick={() => fr.current?.click()}>
        <input ref={fr} type="file" accept=".txt" style={{ display: "none" }} onChange={e => h(e.target.files[0])} />
        <div style={{ fontSize: 30, marginBottom: 8 }}>📁</div>
        <p style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: "0 0 4px" }}>LINEトーク履歴をアップロード</p>
        <p style={{ fontSize: 13, color: C.textSub, margin: 0 }}>.txt ファイルをタップして選択</p>
      </div>
      {err && <div style={S.errBox}>{err}</div>}
      <div style={S.divider}><span style={S.divLine} /><span style={{ color: C.textLight, fontSize: 13 }}>または</span><span style={S.divLine} /></div>
      <button style={S.demoBtn} onClick={onDemo}>🎭 デモデータで試す</button>
      <div style={S.howTo}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: "0 0 10px" }}>📱 LINE履歴の出し方</h3>
        {["LINEでトーク画面を開く", "右上 ≡ → 設定", "「トーク履歴を送信」", ".txt を保存"].map((t, i) =>
          <div key={i} style={S.step}><span style={S.stepN}>{i + 1}</span><span>{t}</span></div>)}
      </div>
    </div></div>
  );
}

// ======================================================================
//  STEP 1: SELECT
// ======================================================================
function SelectPage({ conv, onBack, onEdit }) {
  const [sel, setSel] = useState(new Set());
  const [q, setQ] = useState("");
  const [self, setSelf] = useState("");
  const [pick, setPick] = useState(true);
  const [view, setView] = useState("all");
  const [ctxT, setCtxT] = useState(null);

  const results = useMemo(() => {
    if (!q) return [];
    const lq = q.toLowerCase();
    return conv.messages.filter(m => m.text.toLowerCase().includes(lq) || m.userName.toLowerCase().includes(lq));
  }, [conv.messages, q]);

  const toggle = useCallback(id => setSel(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }), []);
  const groups = useMemo(() => { const g = []; let d = ""; for (const m of conv.messages) { if (m.date !== d) { d = m.date; g.push({ t: "d", date: d, id: `d-${d}` }); } g.push({ t: "m", msg: m, id: m.id }); } return g; }, [conv.messages]);
  const doSearch = v => { setQ(v); setView(v ? "search" : "all"); setCtxT(null); };

  if (pick) return (
    <div style={S.page}><div style={S.header}><button style={S.back} onClick={onBack}>←</button><h2 style={S.hT}>自分の名前を選択</h2><div style={{ width: 40 }} /></div>
      <div style={S.picker}>
        <p style={{ fontSize: 15, color: C.textSub, textAlign: "center", marginBottom: 12 }}>自分の名前を選んでください<br /><span style={{ fontSize: 13, color: C.textLight }}>右側に表示されます</span></p>
        {conv.participants.map(p => <button key={p} style={S.pickBtn} onClick={() => { setSelf(p); setPick(false); }}>{p}</button>)}
        <button style={{ ...S.pickBtn, backgroundColor: C.bgDark, color: C.textLight }} onClick={() => { setSelf(""); setPick(false); }}>スキップ</button>
      </div></div>
  );

  const Bubble = ({ msg, idx }) => {
    const prev = groups[idx - 1]; const isF = !prev || prev.t === "d" || prev.msg?.userName !== msg.userName;
    const isSelf = msg.userName === self;
    const nc = gnc(msg.userName, conv.participants);
    return (
      <div onClick={() => toggle(msg.id)} style={{
        padding: "2px 12px", cursor: "pointer", display: "flex", flexDirection: isSelf ? "row-reverse" : "row", alignItems: "flex-start",
        backgroundColor: sel.has(msg.id) ? C.accentBg : "transparent",
        borderLeft: !isSelf && sel.has(msg.id) ? `3px solid ${C.accent}` : "3px solid transparent",
        borderRight: isSelf && sel.has(msg.id) ? `3px solid ${C.accent}` : "3px solid transparent", transition: "background-color 0.15s"
      }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: isSelf ? "flex-end" : "flex-start" }}>
          {isF && <div style={{ fontSize: 11, fontWeight: 600, color: nc, marginBottom: 1, padding: isSelf ? "0 4px 0 0" : "0 0 0 4px" }}>{msg.userName}</div>}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 5, flexDirection: isSelf ? "row-reverse" : "row" }}>
            <div style={{ padding: "7px 12px", borderRadius: isSelf ? "14px 14px 4px 14px" : "14px 14px 14px 4px", backgroundColor: isSelf ? "#DCF8C6" : "#FFF", maxWidth: "78%", fontSize: 14, lineHeight: 1.45, wordBreak: "break-word" }}>
              {msg.text}
            </div>
            <span style={{ fontSize: 10, color: C.textLight, flexShrink: 0 }}>{msg.time}</span>
          </div>
        </div>
        {sel.has(msg.id) && <div style={{ color: C.accent, fontWeight: 700, fontSize: 16, marginTop: 14 }}>✓</div>}
      </div>
    );
  };

  const CtxView = () => {
    const R = 8, si = Math.max(0, ctxT.order - R), ei = Math.min(conv.messages.length - 1, ctxT.order + R);
    const ctx = conv.messages.slice(si, ei + 1);
    const tRef = useRef(null);
    useEffect(() => { tRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, [ctxT]);
    let ld = "", lu = "";
    return (
      <div style={{ flex: 1, overflowY: "auto", backgroundColor: C.bg }}>
        <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.border}`, backgroundColor: C.card }}>
          <button onClick={() => { setView("search"); setCtxT(null); }} style={{ background: "none", border: "none", fontSize: 14, color: C.accent, cursor: "pointer" }}>← 検索結果</button>
          <span style={{ fontSize: 12, color: C.textSub }}>前後の会話（タップで選択可）</span>
        </div>
        {si > 0 && <div style={{ textAlign: "center", padding: 8, fontSize: 12, color: C.textLight }}>…前</div>}
        {ctx.map(msg => {
          const sd = msg.date !== ld, su = msg.userName !== lu || sd; ld = msg.date; lu = msg.userName;
          const isT = msg.id === ctxT.id; const isSelf = msg.userName === self;
          const nc = gnc(msg.userName, conv.participants);
          return (<div key={msg.id} ref={isT ? tRef : null}>
            {sd && <div style={S.dateSep}><span style={S.dateL}>{msg.date}</span></div>}
            <div onClick={() => toggle(msg.id)} style={{
              padding: "2px 12px", cursor: "pointer", display: "flex", flexDirection: isSelf ? "row-reverse" : "row",
              backgroundColor: isT ? "#FFF8E1" : sel.has(msg.id) ? C.accentBg : "transparent",
              borderLeft: !isSelf && sel.has(msg.id) ? `3px solid ${C.accent}` : "3px solid transparent",
              borderRight: isSelf && sel.has(msg.id) ? `3px solid ${C.accent}` : "3px solid transparent"
            }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: isSelf ? "flex-end" : "flex-start" }}>
                {su && <div style={{ fontSize: 11, fontWeight: 600, color: nc, marginBottom: 1 }}>{msg.userName}</div>}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 5, flexDirection: isSelf ? "row-reverse" : "row" }}>
                  <div style={{ padding: "7px 12px", borderRadius: isSelf ? "14px 14px 4px 14px" : "14px 14px 14px 4px", backgroundColor: isSelf ? "#DCF8C6" : "#FFF", maxWidth: "78%", fontSize: 14, lineHeight: 1.45, wordBreak: "break-word" }}>
                    <Hi text={msg.text} q={isT ? q : ""} />
                  </div>
                  <span style={{ fontSize: 10, color: C.textLight }}>{msg.time}</span>
                </div>
              </div>
              {sel.has(msg.id) && <div style={{ color: C.accent, fontWeight: 700, fontSize: 16, marginTop: 14 }}>✓</div>}
            </div>
          </div>);
        })}
        {ei < conv.messages.length - 1 && <div style={{ textAlign: "center", padding: 8, fontSize: 12, color: C.textLight }}>…後</div>}
      </div>
    );
  };

  return (
    <div style={S.page}>
      <div style={S.header}><button style={S.back} onClick={onBack}>←</button>
        <div style={{ textAlign: "center", flex: 1 }}><h2 style={S.hT}>{conv.groupName}</h2><span style={{ fontSize: 11, color: C.textLight }}>STEP 1: 選択</span></div>
        <div style={{ width: 40 }} /></div>
      <div style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ position: "relative" }}>
          <input type="text" placeholder="🔍 検索..." value={q} onChange={e => doSearch(e.target.value)} style={S.searchIn} />
          {q && <button onClick={() => doSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", fontSize: 14, color: C.textLight, cursor: "pointer" }}>✕</button>}
        </div>
      </div>
      {view === "all" && <div style={S.hint}>💡 タップで選択 → 「次へ」で編集画面</div>}
      {view === "search" && (
        !results.length ? <div style={{ padding: 24, textAlign: "center", color: C.textLight }}>「{q}」の一致なし</div> :
          <div style={{ flex: 1, overflowY: "auto", paddingBottom: 16 }}>
            <div style={{ padding: "8px 16px", fontSize: 12, color: C.textSub }}>{results.length}件ヒット — タップで前後を表示</div>
            {results.map(msg => {
              const bi = Math.max(0, msg.order - 1), ai = Math.min(conv.messages.length - 1, msg.order + 1);
              const bf = conv.messages[bi], af = conv.messages[ai];
              return (<div key={msg.id} onClick={() => { setCtxT(msg); setView("ctx"); }} style={S.sResult}>
                {bf && bf.id !== msg.id && <div style={S.sCtx}><span style={S.sCtxU}>{bf.userName}</span><span style={S.sCtxT}>{bf.text.slice(0, 30)}</span></div>}
                <div style={S.sMatch}><span style={{ fontWeight: 600, marginRight: 6, color: C.text }}>{msg.userName}</span><Hi text={msg.text} q={q} /></div>
                {af && af.id !== msg.id && <div style={S.sCtx}><span style={S.sCtxU}>{af.userName}</span><span style={S.sCtxT}>{af.text.slice(0, 30)}</span></div>}
                <div style={{ fontSize: 11, color: C.textLight, marginTop: 4 }}>{msg.date} {msg.time}</div>
              </div>);
            })}
          </div>
      )}
      {view === "ctx" && ctxT && <CtxView />}
      {view === "all" && (
        <div style={S.msgList}>
          {groups.map((item, i) => {
            if (item.t === "d") return <div key={item.id} style={S.dateSep}><span style={S.dateL}>{item.date}</span></div>;
            return <Bubble key={item.id} msg={item.msg} idx={i} />;
          })}
        </div>
      )}
      {sel.size > 0 && (
        <div style={S.botBar}><div style={S.botIn}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.accent }}>✂️ {sel.size}件選択</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={S.clearBtn} onClick={() => setSel(new Set())}>クリア</button>
            <button style={S.priBtn} onClick={() => { const s = conv.messages.filter(m => sel.has(m.id)); onEdit(s, self); }}>次へ：編集 →</button>
          </div>
        </div></div>
      )}
    </div>
  );
}

// ======================================================================
//  PARTIAL MASK MODAL
// ======================================================================
function PartialMaskModal({ msg, existing, onSave, onClose }) {
  const chars = [...msg.text];
  const [ranges, setRanges] = useState(existing || []);
  const [startIdx, setStartIdx] = useState(null);
  const isInRange = (idx) => ranges.some(r => idx >= r.start && idx < r.end);
  const handleTap = (idx) => {
    const hit = ranges.find(r => idx >= r.start && idx < r.end);
    if (hit) { setRanges(prev => prev.filter(r => r !== hit)); setStartIdx(null); return; }
    if (startIdx === null) { setStartIdx(idx); }
    else { const s = Math.min(startIdx, idx), e = Math.max(startIdx, idx) + 1; setRanges(prev => [...prev, { start: s, end: e }]); setStartIdx(null); }
  };
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: C.text }}>🔒 部分モザイク</h3>
        <p style={{ fontSize: 12, color: C.textSub, margin: "0 0 4px" }}>
          {startIdx !== null ? "終点をタップしてください" : "始点をタップ → 終点をタップ"}
        </p>
        <p style={{ fontSize: 11, color: C.textLight, margin: "0 0 10px" }}>💡 赤い文字タップで解除</p>
        <div style={{ padding: "12px 8px", backgroundColor: C.bg, borderRadius: 10, marginBottom: 14, lineHeight: 2.4, minHeight: 60 }}>
          {chars.map((c, i) => {
            const masked = isInRange(i); const isStart = i === startIdx;
            let bg = "transparent";
            if (masked) bg = C.dangerBg; else if (isStart) bg = "#FFF8E1";
            return (<span key={i} onClick={() => handleTap(i)} style={{
              display: "inline-block", padding: "2px 1px", cursor: "pointer", borderRadius: 3,
              backgroundColor: bg, filter: masked ? "blur(3px)" : "none",
              borderBottom: isStart ? "2px solid #E6A817" : "none", fontSize: 16, transition: "background-color 0.15s"
            }}>{c}</span>);
          })}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...S.clearBtn, flex: 1 }} onClick={() => { setRanges([]); setStartIdx(null); }}>リセット</button>
          <button style={{ ...S.priBtn, flex: 1 }} onClick={() => onSave(ranges)}>確定</button>
        </div>
      </div>
    </div>
  );
}

// ======================================================================
//  TEXT EDIT MODAL
// ======================================================================
function TextEditModal({ msg, editedTexts, onSave, onClose }) {
  const [text, setText] = useState(editedTexts[msg.id] !== undefined ? editedTexts[msg.id] : msg.text);
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: C.text }}>✏️ テキスト編集</h3>
        <p style={{ fontSize: 12, color: C.textSub, margin: "0 0 12px" }}>メッセージ内容を変更</p>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={4}
          style={{ ...S.editInput, resize: "vertical", minHeight: 80, fontFamily: "inherit", lineHeight: 1.5 }} autoFocus />
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button style={{ ...S.clearBtn, flex: 1 }} onClick={onClose}>キャンセル</button>
          <button style={{ ...S.priBtn, flex: 1 }} onClick={() => { onSave(msg.id, text); onClose(); }}>保存</button>
        </div>
      </div>
    </div>
  );
}

// ======================================================================
//  ACTION SHEET (LINE-style bottom sheet for message actions)
// ======================================================================
function ActionSheet({ msg, mFull, mPart, onEdit, onFullMask, onPartialMask, onUnmask, onClose }) {
  const isMF = mFull.has(msg.id);
  const isMP = mPart[msg.id] && mPart[msg.id].length > 0;
  const isMasked = isMF || isMP;

  const actions = [
    { icon: "✏️", label: "編集する", sub: "テキストを変更", action: () => { onEdit(msg); onClose(); } },
  ];
  if (isMasked) {
    actions.push({ icon: "🔓", label: "モザイク解除", sub: "元に戻す", action: () => { onUnmask(msg.id); onClose(); }, danger: true });
  } else {
    actions.push({ icon: "🔒", label: "全文隠す", sub: "メッセージ全体をモザイク", action: () => { onFullMask(msg.id); onClose(); } });
    actions.push({ icon: "🔒", label: "部分的に隠す", sub: "一部分だけモザイク", action: () => { onPartialMask(msg); onClose(); } });
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100 }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.3)" }} />
      <div style={{
        position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480,
        backgroundColor: C.card, borderRadius: "20px 20px 0 0", padding: "8px 0 20px",
        animation: "slideUp 0.25s ease-out"
      }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, margin: "0 auto 12px" }} />
        <div style={{ padding: "0 16px 8px", borderBottom: `1px solid ${C.border}`, marginBottom: 4 }}>
          <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {msg.text.slice(0, 40)}{msg.text.length > 40 ? "..." : ""}
          </div>
        </div>
        {actions.map((a, i) => (
          <button key={i} onClick={a.action} style={{
            display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 20px",
            background: "none", border: "none", cursor: "pointer", textAlign: "left",
            transition: "background-color 0.1s"
          }}>
            <span style={{ fontSize: 20 }}>{a.icon}</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: a.danger ? C.danger : C.text }}>{a.label}</div>
              <div style={{ fontSize: 12, color: C.textSub, marginTop: 1 }}>{a.sub}</div>
            </div>
          </button>
        ))}
        <button onClick={onClose} style={{
          display: "block", width: "calc(100% - 32px)", margin: "8px 16px 0", padding: "12px",
          backgroundColor: C.bgDark, border: `1px solid ${C.border}`, borderRadius: 12,
          fontSize: 14, fontWeight: 600, color: C.textSub, cursor: "pointer", textAlign: "center"
        }}>キャンセル</button>
      </div>
    </div>
  );
}

// ======================================================================
//  STYLE BOTTOM SHEET
// ======================================================================
function StyleSheet({ bgPreset, setBgPreset, bubbleColors, setBubbleColors, showTs, setShowTs, participants, nameMap, onClose }) {
  const dn = n => nameMap[n] || n;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.3)" }} />
      <div style={{
        position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480,
        maxHeight: "60vh", backgroundColor: C.card, borderRadius: "20px 20px 0 0", padding: "8px 0 24px",
        overflowY: "auto", animation: "slideUp 0.25s ease-out"
      }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, margin: "0 auto 14px" }} />
        <div style={{ padding: "0 16px" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: "0 0 14px" }}>🎨 スタイル設定</h3>

          {/* Background color */}
          <div style={{ marginBottom: 18 }}>
            <label style={S.editLabel}>背景色</label>
            <div style={{ display: "flex", gap: 6 }}>
              {BG_PRESETS.map(b => (
                <button key={b.id} onClick={() => setBgPreset(b)} style={{
                  flex: 1, padding: "10px 4px", borderRadius: 10, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  backgroundColor: b.bg, border: bgPreset.id === b.id ? `3px solid ${C.accent}` : `2px solid ${C.border}`,
                  color: b.text
                }}>{b.label}</button>
              ))}
            </div>
          </div>

          {/* Bubble color per participant */}
          <div style={{ marginBottom: 18 }}>
            <label style={S.editLabel}>💬 吹き出しの色</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {participants.map(p => (
                <div key={p} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", backgroundColor: C.bg, borderRadius: 10, border: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text, flex: 1 }}>{dn(p)}</span>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {BUBBLE_PRESETS.map(color => (
                      <button key={color} onClick={() => setBubbleColors(prev => ({ ...prev, [p]: color }))} style={{
                        width: 24, height: 24, borderRadius: "50%", backgroundColor: color,
                        border: bubbleColors[p] === color ? `2px solid ${C.accent}` : color === "#FFFFFF" ? `1px solid ${C.border}` : "2px solid transparent",
                        cursor: "pointer", padding: 0
                      }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timestamp */}
          <label style={{ ...S.editLabel, cursor: "pointer", marginBottom: 10 }}>
            <input type="checkbox" checked={showTs} onChange={e => setShowTs(e.target.checked)} style={{ marginRight: 8, accentColor: C.accent }} />
            ⏰ タイムスタンプを表示
          </label>
        </div>
      </div>
    </div>
  );
}

// ======================================================================
//  STEP 2: EDIT
// ======================================================================
function EditPage({ messages, selfName, participants, onBack, onPreview }) {
  const [nameMap, setNameMap] = useState(() => { const m = {}; participants.forEach(p => { m[p] = p; }); return m; });
  const [currentSelf, setCurrentSelf] = useState(selfName);
  const [mFull, setMFull] = useState(new Set());
  const [mPart, setMPart] = useState({});
  const [photos, setPhotos] = useState({});
  const [bgPreset, setBgPreset] = useState(BG_PRESETS.find(b => b.id === "craft") || BG_PRESETS[0]);
  const [bubbleColors, setBubbleColors] = useState(() => {
    const m = {}; participants.forEach(p => { m[p] = p === selfName ? "#DCF8C6" : "#FFFFFF"; }); return m;
  });
  const [showTs, setShowTs] = useState(true);
  const [editingName, setEditingName] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [editedTexts, setEditedTexts] = useState({});
  const [editingMsg, setEditingMsg] = useState(null);
  const [partialTarget, setPartialTarget] = useState(null);
  const [styleSheetOpen, setStyleSheetOpen] = useState(false);
  const photoRef = useRef(null);
  const [photoTarget, setPhotoTarget] = useState(null);

  const dn = n => nameMap[n] || n;

  const toggleFullMask = id => {
    setMPart(p => { const n = { ...p }; delete n[id]; return n; });
    setMFull(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const unmask = id => {
    setMFull(p => { const n = new Set(p); n.delete(id); return n; });
    setMPart(p => { const n = { ...p }; delete n[id]; return n; });
  };
  const handlePhotoSelect = e => {
    const f = e.target.files[0]; if (!f || !photoTarget) return;
    const r = new FileReader();
    r.onload = ev => { setPhotos(p => ({ ...p, [photoTarget]: ev.target.result })); setPhotoTarget(null); };
    r.readAsDataURL(f);
  };
  const savePartialMask = ranges => {
    if (!partialTarget) return;
    setMFull(p => { const n = new Set(p); n.delete(partialTarget.id); return n; });
    if (ranges.length > 0) setMPart(p => ({ ...p, [partialTarget.id]: ranges }));
    else setMPart(p => { const n = { ...p }; delete n[partialTarget.id]; return n; });
    setPartialTarget(null);
  };
  const saveEditedText = (msgId, text) => {
    const orig = messages.find(m => m.id === msgId);
    if (orig && text === orig.text) {
      setEditedTexts(p => { const n = { ...p }; delete n[msgId]; return n; });
    } else {
      setEditedTexts(p => ({ ...p, [msgId]: text }));
    }
  };

  // Long press / double tap for name edit
  const nameTimerRef = useRef(null);
  const handleNameDown = (p) => {
    nameTimerRef.current = setTimeout(() => { setEditingName(p); setNameInput(nameMap[p] || p); }, 500);
  };
  const handleNameUp = () => { clearTimeout(nameTimerRef.current); };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}><button style={S.back} onClick={onBack}>←</button>
        <div style={{ textAlign: "center", flex: 1 }}><h2 style={S.hT}>編集</h2><span style={{ fontSize: 11, color: C.textLight }}>STEP 2</span></div>
        <div style={{ width: 40 }} /></div>

      {/* 表示名セクション */}
      <div style={{ padding: "10px 14px", backgroundColor: C.bgDark, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 6 }}>✏️ 表示名 <span style={{ fontWeight: 400, fontSize: 11, color: C.textLight }}>タップ：自分切替 ／ 長押し：名前変更</span></div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {participants.map(p => (
            <button key={p}
              onClick={() => setCurrentSelf(prev => prev === p ? "" : p)}
              onPointerDown={() => handleNameDown(p)}
              onPointerUp={handleNameUp}
              onPointerLeave={handleNameUp}
              style={{
                padding: "5px 10px", borderRadius: 8,
                border: currentSelf === p ? `2px solid ${C.green}` : `1px solid ${C.border}`,
                backgroundColor: nameMap[p] !== p ? C.accentBg : C.card,
                fontSize: 12, cursor: "pointer", color: C.text, position: "relative"
              }}>
              {nameMap[p] !== p ? `${nameMap[p]} ← ${p}` : dn(p)}
              {currentSelf === p && <span style={{
                position: "absolute", top: -8, right: -4, fontSize: 9, fontWeight: 700,
                backgroundColor: C.green, color: "#fff", padding: "1px 5px", borderRadius: 8,
                lineHeight: "14px"
              }}>あなた</span>}
            </button>
          ))}
        </div>
      </div>

      {/* 本文エリア */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 110, backgroundColor: bgPreset.bg, transition: "background-color 0.3s" }}>
        <div style={{ fontSize: 11, color: bgPreset.sub || C.textLight, textAlign: "center", padding: "6px 12px" }}>
          💡 メッセージをタップして編集・モザイク
        </div>
        {(() => { let ld = "", lu = ""; return messages.map(msg => {
          const sd = msg.date !== ld, su = msg.userName !== lu || sd; ld = msg.date; lu = msg.userName;
          const isSelf = msg.userName === currentSelf;
          const isMF = mFull.has(msg.id), isMP = mPart[msg.id] && mPart[msg.id].length > 0, isMasked = isMF || isMP;
          const isEdited = editedTexts[msg.id] !== undefined;
          const nc = gnc(msg.userName, participants); const photo = photos[msg.id];
          const displayMsg = isEdited ? { ...msg, text: editedTexts[msg.id] } : msg;
          return (<div key={msg.id}>
            {sd && <div style={S.dateSep}><span style={{ ...S.dateL, backgroundColor: bgPreset.dateBg, color: bgPreset.sub }}>{msg.date}</span></div>}
            <div style={{ padding: "2px 12px", display: "flex", flexDirection: isSelf ? "row-reverse" : "row", alignItems: "flex-start",
              backgroundColor: isMasked ? "rgba(196,77,62,0.08)" : "transparent",
              borderLeft: !isSelf && isMasked ? `3px solid ${C.danger}` : "3px solid transparent",
              borderRight: isSelf && isMasked ? `3px solid ${C.danger}` : "3px solid transparent",
              cursor: "pointer", transition: "background-color 0.15s" }}
              onClick={() => setSelectedMsg(msg)}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: isSelf ? "flex-end" : "flex-start" }}>
                {su && <div style={{ fontSize: 11, fontWeight: 600, color: nc, marginBottom: 1 }}>
                  {dn(msg.userName)}{isMasked && " 🔒"}{isEdited && " ✏️"}
                </div>}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 5, flexDirection: isSelf ? "row-reverse" : "row" }}>
                  <div style={{ padding: "7px 12px", borderRadius: isSelf ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    backgroundColor: isMasked ? "#eee" : (bubbleColors[msg.userName] || defaultBubbleColor(msg.userName, participants)),
                    maxWidth: "78%", fontSize: 14, lineHeight: 1.45, wordBreak: "break-word", color: "#333" }}>
                    <MT msg={displayMsg} mFull={mFull} mPart={mPart} />
                  </div>
                  <span style={{ fontSize: 10, color: bgPreset.sub || C.textLight }}>{msg.time}</span>
                </div>
                {photo && <img src={photo} style={{ maxWidth: "70%", borderRadius: 12, marginTop: 4, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }} />}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: isSelf ? "flex-end" : "flex-start", padding: "2px 16px" }}>
              <button onClick={ev => { ev.stopPropagation(); setPhotoTarget(msg.id); photoRef.current?.click(); }}
                style={{ backgroundColor: photo ? C.accentBg : C.card, border: `1px solid ${photo ? C.accent : C.border}`, borderRadius: 20, fontSize: 11, fontWeight: 600, color: photo ? C.accent : C.textSub, cursor: "pointer", padding: "3px 10px" }}>
                {photo ? "画像変更" : "＋画像"}
              </button>
              {photo && <button onClick={ev => { ev.stopPropagation(); setPhotos(p => { const n = { ...p }; delete n[msg.id]; return n; }); }}
                style={{ backgroundColor: C.dangerBg, border: `1px solid ${C.danger}`, borderRadius: 20, fontSize: 11, color: C.danger, cursor: "pointer", padding: "3px 10px" }}>削除</button>}
            </div>
          </div>); }); })()}
      </div>

      <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoSelect} />

      {/* スタイルボタン + 次へボタン */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480,
        backgroundColor: C.card, borderTop: `1px solid ${C.border}`, zIndex: 20, boxSizing: "border-box"
      }}>
        <div style={{ display: "flex", alignItems: "center", padding: "8px 16px", gap: 8, borderBottom: `1px solid ${C.border}` }}>
          <button onClick={() => setStyleSheetOpen(true)} style={{
            flex: 1, padding: "8px 12px", backgroundColor: C.accentBg, border: `1px solid ${C.accentLight}`,
            borderRadius: 10, fontSize: 13, fontWeight: 600, color: C.accent, cursor: "pointer", textAlign: "center"
          }}>🎨 スタイル</button>
          <div style={{ display: "flex", gap: 6, fontSize: 12 }}>
            {(mFull.size + Object.keys(mPart).length) > 0 && <span style={{ color: C.danger, fontWeight: 600 }}>🔒 {mFull.size + Object.keys(mPart).length}</span>}
            {Object.keys(editedTexts).length > 0 && <span style={{ color: C.accent, fontWeight: 600 }}>✏️ {Object.keys(editedTexts).length}</span>}
            {Object.keys(photos).length > 0 && <span style={{ color: C.accent, fontWeight: 600 }}>🖼 {Object.keys(photos).length}</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px" }}>
          <span style={{ fontSize: 12, color: C.textLight }}>{messages.length}件のメッセージ</span>
          <button style={S.priBtn} onClick={() => onPreview({ nameMap, mFull, mPart, photos, bgPreset, bubbleColors, showTs, editedTexts, currentSelf })}>次へ：プレビュー →</button>
        </div>
      </div>

      {/* Action Sheet */}
      {selectedMsg && <ActionSheet msg={selectedMsg} mFull={mFull} mPart={mPart}
        onEdit={msg => setEditingMsg(msg)}
        onFullMask={id => toggleFullMask(id)}
        onPartialMask={msg => setPartialTarget(msg)}
        onUnmask={id => unmask(id)}
        onClose={() => setSelectedMsg(null)} />}

      {/* Text Edit Modal */}
      {editingMsg && <TextEditModal msg={editingMsg} editedTexts={editedTexts}
        onSave={saveEditedText} onClose={() => setEditingMsg(null)} />}

      {/* Name Edit Modal */}
      {editingName && (
        <div style={S.overlay} onClick={() => setEditingName(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: C.text }}>✏️ 名前を変更</h3>
            <p style={{ fontSize: 12, color: C.textSub, margin: "0 0 12px" }}>「{editingName}」の表示名</p>
            <input value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder={editingName} style={S.editInput} autoFocus />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button style={{ ...S.clearBtn, flex: 1 }} onClick={() => { setNameMap(m => ({ ...m, [editingName]: editingName })); setEditingName(null); }}>リセット</button>
              <button style={{ ...S.priBtn, flex: 1 }} onClick={() => { setNameMap(m => ({ ...m, [editingName]: nameInput || editingName })); setEditingName(null); }}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* Style Bottom Sheet */}
      {styleSheetOpen && <StyleSheet
        bgPreset={bgPreset} setBgPreset={setBgPreset}
        bubbleColors={bubbleColors} setBubbleColors={setBubbleColors}
        showTs={showTs} setShowTs={setShowTs}
        participants={participants} nameMap={nameMap}
        onClose={() => setStyleSheetOpen(false)} />}

      {/* Partial Mask Modal */}
      {partialTarget && <PartialMaskModal msg={partialTarget} existing={mPart[partialTarget.id]} onSave={savePartialMask} onClose={() => setPartialTarget(null)} />}
    </div>
  );
}

// ======================================================================
//  STEP 3: PREVIEW
// ======================================================================
function Preview({ messages, groupName, selfName, participants, editState, onBack, onShare }) {
  const [title, setTitle] = useState("");
  const ref = useRef(null);
  const { nameMap, mFull, mPart, photos, bgPreset: bg, bubbleColors, showTs, editedTexts = {}, currentSelf } = editState;
  const dn = n => nameMap[n] || n;
  const effectiveSelf = currentSelf || selfName;

  return (
    <div style={S.page}>
      <div style={S.header}><button style={S.back} onClick={onBack}>←</button>
        <div style={{ textAlign: "center", flex: 1 }}><h2 style={S.hT}>プレビュー</h2><span style={{ fontSize: 11, color: C.textLight }}>STEP 3: 確認</span></div>
        <button style={{ ...S.back, color: C.accent, fontWeight: 600, fontSize: 14 }} onClick={() => onShare(ref, title)}>保存</button></div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, paddingBottom: 100, backgroundColor: C.bgDark }}>
        <div style={{ marginBottom: 14 }}>
          <label style={S.editLabel}>📝 タイトル（任意）</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="例: コンビニで愛の告白事件" style={S.editInput} maxLength={40} />
        </div>
        <div ref={ref} style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", backgroundColor: bg.bg }}>
          {title && <div style={{ padding: "14px 16px 6px", fontSize: 18, fontWeight: 800, color: bg.text }}>{title}</div>}
          <div style={{ padding: "4px 12px 12px" }}>
            {(() => { let ld = "", lu = ""; return messages.map(msg => {
              const sd = msg.date !== ld, su = msg.userName !== lu || sd; ld = msg.date; lu = msg.userName;
              const isSelf = msg.userName === effectiveSelf;
              const nc = gnc(msg.userName, participants);
              const isMF = mFull.has(msg.id), isMP = mPart[msg.id] && mPart[msg.id].length > 0, isMasked = isMF || isMP;
              const photo = photos[msg.id];
              const bColor = bubbleColors[msg.userName] || defaultBubbleColor(msg.userName, participants);
              const displayMsg = editedTexts[msg.id] !== undefined ? { ...msg, text: editedTexts[msg.id] } : msg;
              return (<div key={msg.id}>
                {sd && <div style={{ textAlign: "center", fontSize: 11, padding: "4px 0", margin: "8px 0", borderRadius: 8, backgroundColor: bg.dateBg, color: bg.sub }}>{msg.date}</div>}
                <div style={{ display: "flex", marginBottom: 5, flexDirection: isSelf ? "row-reverse" : "row" }}>
                  <div style={{ maxWidth: "78%", display: "flex", flexDirection: "column", alignItems: isSelf ? "flex-end" : "flex-start" }}>
                    {su && !isSelf && <div style={{ fontSize: 11, fontWeight: 600, color: nc, marginBottom: 1, paddingLeft: 4 }}>{dn(msg.userName)}</div>}
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, flexDirection: isSelf ? "row-reverse" : "row" }}>
                      <div style={{
                        padding: "7px 12px", fontSize: 14, lineHeight: 1.4, wordBreak: "break-word",
                        boxShadow: bColor === "#FFFFFF" ? "0 1px 3px rgba(0,0,0,0.1)" : "0 1px 2px rgba(0,0,0,0.04)", color: "#333",
                        backgroundColor: isMasked ? (bg.id === "dark" ? "#1a1a1a" : "#e8e8e8") : bColor,
                        borderRadius: isSelf ? "16px 16px 4px 16px" : "16px 16px 16px 4px"
                      }}>
                        <MT msg={displayMsg} mFull={mFull} mPart={mPart} />
                      </div>
                      {showTs && <span style={{ fontSize: 10, color: bg.sub, flexShrink: 0 }}>{msg.time}</span>}
                    </div>
                    {photo && <img src={photo} style={{ maxWidth: "90%", borderRadius: 10, marginTop: 4, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }} />}
                  </div>
                </div>
              </div>); }); })()}
          </div>
          <div style={{ textAlign: "center", fontSize: 11, padding: "10px 16px", borderTop: `1px solid ${bg.border}`, color: bg.wmk }}>
            Cut with Chat Cut ✂️
          </div>
        </div>
      </div>
      <div style={S.botBar}><div style={S.botIn}>
        <button style={S.clearBtn} onClick={onBack}>← 編集に戻る</button>
        <button style={{ ...S.priBtn, flex: 1, marginLeft: 8 }} onClick={() => onShare(ref, title)}>📥 画像を保存</button>
      </div></div>
    </div>
  );
}

// ======================================================================
//  STEP 4: SHARE
// ======================================================================
function Share({ previewRef, onBack, onHome }) {
  const [img, setImg] = useState(""); const [loading, setLoading] = useState(true);
  useEffect(() => { gen(); }, []);
  const gen = async () => {
    setLoading(true);
    try {
      if (!previewRef?.current) { setLoading(false); return; }
      const el = previewRef.current, c = document.createElement("canvas"), s = 2;
      c.width = el.offsetWidth * s; c.height = el.offsetHeight * s;
      const x = c.getContext("2d"); x.scale(s, s);
      x.fillStyle = window.getComputedStyle(el).backgroundColor || "#F5F0E8";
      x.fillRect(0, 0, c.width, c.height);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${el.offsetWidth}" height="${el.offsetHeight}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${el.outerHTML}</div></foreignObject></svg>`;
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const u = URL.createObjectURL(blob), im = new Image();
      im.onload = () => { x.drawImage(im, 0, 0); URL.revokeObjectURL(u); setImg(c.toDataURL("image/png")); setLoading(false); };
      im.onerror = () => setLoading(false); im.src = u;
    } catch { setLoading(false); }
  };

  return (
    <div style={S.page}>
      <div style={S.header}><button style={S.back} onClick={onBack}>←</button><h2 style={S.hT}>保存</h2><div style={{ width: 40 }} /></div>
      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", alignItems: "center", backgroundColor: C.bg }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.green, marginBottom: 20 }}>✅ 切り抜き完成！</div>
        {loading ? (
          <div style={{ padding: 40, color: C.textSub, textAlign: "center" }}>
            <div style={{ width: 32, height: 32, border: `3px solid ${C.border}`, borderTopColor: C.accent, borderRadius: "50%", margin: "0 auto 12px", animation: "spin 0.8s linear infinite" }} />
            <p>画像を生成中...</p>
          </div>
        ) : (
          <>
            {img && <div style={{ width: "100%", maxWidth: 320, marginBottom: 20, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}><img src={img} alt="" style={{ width: "100%", display: "block" }} /></div>}
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
              <button style={S.shareRow} onClick={() => {
                if (!img) return;
                const a = document.createElement("a"); a.href = img; a.download = `chatcut-${Date.now()}.png`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
              }}>
                <span style={{ fontSize: 28 }}>🖼️</span>
                <div><div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>画像として保存</div><div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>LINE・SNSでそのままシェア</div></div>
              </button>
            </div>
          </>
        )}
        <button style={{ marginTop: 24, padding: "12px 24px", backgroundColor: C.bgDark, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 14, color: C.textSub, cursor: "pointer" }} onClick={onHome}>🏠 ホームに戻る</button>
      </div>
    </div>
  );
}

// ======================================================================
//  MAIN APP
// ======================================================================
export default function App() {
  const [page, setPage] = useState("home");
  const [conv, setConv] = useState(null);
  const [clip, setClip] = useState([]);
  const [self, setSelf] = useState("");
  const [editState, setEditState] = useState(null);
  const pRef = useRef(null);

  return (
    <div style={S.app}>
      {page === "home" && <Home onLoad={c => { setConv(c); setPage("select"); }} onDemo={() => { setConv(parse(demo)); setPage("select"); }} />}
      {page === "select" && conv && <SelectPage conv={conv} onBack={() => setPage("home")}
        onEdit={(msgs, s) => { setClip(msgs); setSelf(s); setPage("edit"); }} />}
      {page === "edit" && <EditPage messages={clip} selfName={self} participants={conv?.participants || []}
        onBack={() => setPage("select")}
        onPreview={es => { setEditState(es); setPage("preview"); }} />}
      {page === "preview" && <Preview messages={clip} groupName={conv?.groupName || ""} selfName={self}
        participants={conv?.participants || []} editState={editState}
        onBack={() => setPage("edit")} onShare={(r, title) => { pRef.current = r; setPage("share"); }} />}
      {page === "share" && <Share previewRef={pRef.current} onBack={() => setPage("preview")} onHome={() => setPage("home")} />}
    </div>
  );
}

// ======================================================================
//  STYLES
// ======================================================================
const S = {
  app: { maxWidth: 480, margin: "0 auto", minHeight: "100vh", backgroundColor: C.bg, fontFamily: '-apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP","Yu Gothic",sans-serif', position: "relative", overflow: "hidden" },
  homePage: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 16px 40px", background: `linear-gradient(180deg, ${C.bg} 0%, ${C.bgDark} 100%)`, overflowY: "auto" },
  homeContent: { width: "100%", maxWidth: 400 },
  uploadArea: { border: `2px dashed ${C.accentLight}`, borderRadius: 16, padding: "18px 16px", textAlign: "center", cursor: "pointer", transition: "all 0.2s", backgroundColor: C.card },
  errBox: { marginTop: 12, padding: "10px 16px", backgroundColor: C.dangerBg, color: C.danger, borderRadius: 8, fontSize: 13 },
  divider: { display: "flex", alignItems: "center", margin: "20px 0", gap: 10 },
  divLine: { flex: 1, height: 1, backgroundColor: C.border },
  demoBtn: { width: "100%", padding: "14px 20px", backgroundColor: C.accentBg, border: `1px solid ${C.accentLight}`, borderRadius: 12, fontSize: 15, fontWeight: 600, color: C.accent, cursor: "pointer" },
  howTo: { marginTop: 28, padding: 18, backgroundColor: C.card, borderRadius: 12, border: `1px solid ${C.border}` },
  step: { display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: C.textSub, marginBottom: 6 },
  stepN: { width: 21, height: 21, borderRadius: "50%", backgroundColor: C.green, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 },
  page: { display: "flex", flexDirection: "column", height: "100vh" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${C.border}`, backgroundColor: C.card, position: "sticky", top: 0, zIndex: 10 },
  back: { background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: "4px 8px", color: C.accent },
  hT: { fontSize: 16, fontWeight: 700, color: C.text, margin: 0 },
  picker: { padding: 24, display: "flex", flexDirection: "column", gap: 10, alignItems: "center" },
  pickBtn: { width: "100%", maxWidth: 280, padding: "14px 20px", backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 16, fontWeight: 600, color: C.text, cursor: "pointer" },
  searchIn: { width: "100%", padding: "7px 12px", paddingRight: 28, border: `1px solid ${C.border}`, borderRadius: 16, fontSize: 13, outline: "none", backgroundColor: C.bgDark, boxSizing: "border-box", color: C.text },
  sResult: { padding: "12px 16px", borderBottom: `1px solid ${C.border}`, cursor: "pointer" },
  sCtx: { fontSize: 12, color: C.textLight, padding: "2px 0", display: "flex", gap: 6 },
  sCtxU: { fontWeight: 600, color: C.textLight, flexShrink: 0 },
  sCtxT: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  sMatch: { fontSize: 14, padding: "4px", backgroundColor: "#FFF8E1", borderRadius: 4 },
  hint: { padding: "7px 16px", backgroundColor: C.accentBg, fontSize: 12, color: C.accent, textAlign: "center" },
  msgList: { flex: 1, overflowY: "auto", paddingBottom: 80, backgroundColor: C.bg },
  dateSep: { textAlign: "center", padding: "10px 0 6px" },
  dateL: { fontSize: 12, color: C.textLight, backgroundColor: C.bgDark, padding: "3px 12px", borderRadius: 10 },
  botBar: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, backgroundColor: C.card, borderTop: `1px solid ${C.border}`, padding: "10px 16px", zIndex: 20, boxSizing: "border-box" },
  botIn: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  clearBtn: { padding: "8px 14px", backgroundColor: C.bgDark, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.textSub, cursor: "pointer" },
  priBtn: { padding: "10px 18px", backgroundColor: C.accent, border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#FFF", cursor: "pointer" },
  editLabel: { fontSize: 13, fontWeight: 600, color: C.textSub, display: "flex", alignItems: "center", marginBottom: 6 },
  editInput: { width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", backgroundColor: C.card, color: C.text },
  shareRow: { display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 12, cursor: "pointer", textAlign: "left" },
  overlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 100 },
  modal: { backgroundColor: C.card, borderRadius: 16, padding: 24, width: "100%", maxWidth: 340, maxHeight: "80vh", overflowY: "auto" },
  tabBtn: { flex: 1, padding: "10px 8px", background: "none", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" },
  modeBtn: { flex: 1, padding: "8px 8px", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" },
};
