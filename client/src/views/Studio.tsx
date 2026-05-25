import { useEffect, useState } from "react";
import { api, formatDate, timeAgo } from "../lib/api";

type StudioTab = "tts" | "image";
const TABS: Array<{ key: StudioTab; label: string; icon: string }> = [
  { key: "tts", label: "Text-to-Speech", icon: "🔊" },
  { key: "image", label: "Image Generation", icon: "🎨" },
];

interface AssetItem {
  name: string;
  path: string;
  type: string;
  sizeFormatted: string;
  createdAt: string;
  mime: string;
}

const DEFAULT_VOICES = [
  { name: "en-US-GuyNeural", gender: "Male", locale: "en-US" },
  { name: "en-US-JennyNeural", gender: "Female", locale: "en-US" },
  { name: "en-GB-RyanNeural", gender: "Male", locale: "en-GB" },
  { name: "en-GB-SoniaNeural", gender: "Female", locale: "en-GB" },
  { name: "ar-EG-ShakirNeural", gender: "Male", locale: "ar-EG" },
  { name: "ar-SA-HamedNeural", gender: "Male", locale: "ar-SA" },
];

export default function Studio() {
  const [tab, setTab] = useState<StudioTab>("tts");

  // Real recent assets from agent-outputs
  const [recentAudio, setRecentAudio] = useState<AssetItem[]>([]);
  const [recentImages, setRecentImages] = useState<AssetItem[]>([]);

  // TTS state
  const [ttsText, setTtsText] = useState("");
  const [ttsVoice, setTtsVoice] = useState("en-US-GuyNeural");
  const [ttsGenerating, setTtsGenerating] = useState(false);
  const [ttsResult, setTtsResult] = useState<string | null>(null);
  const [ttsError, setTtsError] = useState("");

  // Image state
  const [imgPrompt, setImgPrompt] = useState("");
  const [imgModel, setImgModel] = useState("default");
  const [imgGenerating, setImgGenerating] = useState(false);
  const [imgResult, setImgResult] = useState<string | null>(null);
  const [imgMethod, setImgMethod] = useState("");
  const [imgError, setImgError] = useState("");

  // Load recent assets
  const loadRecent = async () => {
    try {
      const data = await api<{ audio: AssetItem[]; image: AssetItem[] }>("/studio/recent");
      setRecentAudio(data.audio);
      setRecentImages(data.image);
    } catch {}
  };

  useEffect(() => { loadRecent(); }, []);

  // Refresh after generation
  const refresh = () => {
    loadRecent();
  };

  // ── TTS ──
  const generateTTS = async () => {
    if (!ttsText.trim()) return;
    setTtsGenerating(true);
    setTtsResult(null);
    setTtsError("");
    try {
      const result = await api<{ ok: boolean; filePath?: string; error?: string }>("/studio/tts", {
        method: "POST",
        body: JSON.stringify({ text: ttsText, voice: ttsVoice }),
      });
      if (result.ok && result.filePath) {
        setTtsResult(result.filePath);
        refresh();
      } else {
        setTtsError(result.error || "Generation failed");
      }
    } catch (e: any) {
      setTtsError(e.message);
    } finally {
      setTtsGenerating(false);
    }
  };

  // ── Image ──
  const generateImage = async () => {
    if (!imgPrompt.trim()) return;
    setImgGenerating(true);
    setImgResult(null);
    setImgMethod("");
    setImgError("");
    try {
      const result = await api<{ ok: boolean; filePath?: string; method?: string; error?: string }>("/studio/image", {
        method: "POST",
        body: JSON.stringify({ prompt: imgPrompt, model: imgModel }),
      });
      if (result.ok && result.filePath) {
        setImgResult(result.filePath);
        setImgMethod(result.method || "");
        refresh();
      } else {
        setImgError(result.error || "Generation failed");
      }
    } catch (e: any) {
      setImgError(e.message);
    } finally {
      setImgGenerating(false);
    }
  };

  const isAudioFile = (path: string) => path.match(/\.(mp3|wav|ogg|flac|m4a)$/i);
  const isImageFile = (path: string) => path.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>🎬 Studio</h1>
          <div className="subtitle">Real TTS via edge-tts · Real images via ImageMagick · All saved to ~/agent-outputs/</div>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={refresh}>Refresh</button>
      </div>

      <div className="card filter-bar mb-24">
        {TABS.map((t) => (
          <button key={t.key} className={`filter-pill${tab === t.key ? " active" : ""}`} onClick={() => setTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ══════ TTS TAB ══════ */}
      {tab === "tts" && (
        <div className="grid-2">
          <div className="card">
            <h3>Generate Speech</h3>
            <textarea
              className="mt-12"
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
              placeholder="Enter text to convert to speech..."
              style={{ minHeight: 140 }}
            />
            <div className="form-row mt-16">
              <div className="form-group">
                <label>Voice</label>
                <select value={ttsVoice} onChange={(e) => setTtsVoice(e.target.value)}>
                  {DEFAULT_VOICES.map((v) => (
                    <option key={v.name} value={v.name}>{v.name} ({v.gender}, {v.locale})</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ justifyContent: "flex-end", display: "flex", flexDirection: "column" }}>
                <button
                  className="btn btn-primary"
                  onClick={generateTTS}
                  disabled={ttsGenerating || !ttsText.trim()}
                  style={{ marginTop: "auto" }}
                >
                  {ttsGenerating ? "⏳ Generating..." : "🔊 Generate Speech"}
                </button>
              </div>
            </div>

            {ttsError && (
              <div className="card-raise mt-16" style={{ color: "var(--red)", fontSize: 13 }}>
                Error: {ttsError}
              </div>
            )}

            {ttsResult && (
              <div className="card-raise mt-16" style={{ animation: "statEnter 0.3s var(--ease-out)" }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13, color: "var(--green)" }}>
                  ✅ Generated — {ttsResult.split("/").pop()}
                </div>
                {isAudioFile(ttsResult) ? (
                  <audio src={`/api/workspace/file?path=${encodeURIComponent(ttsResult)}`} controls style={{ width: "100%" }} />
                ) : (
                  <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                    Saved: <code>{ttsResult}</code>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent TTS assets */}
          <div className="card" style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            <h3>Recent Audio Files</h3>
            {recentAudio.length > 0 ? recentAudio.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
                <span style={{ fontSize: 20 }}>🔊</span>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontWeight: 600, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                    {a.sizeFormatted} · {timeAgo(a.createdAt)}
                  </div>
                </div>
                {isAudioFile(a.path) && (
                  <audio src={`/api/workspace/file?path=${encodeURIComponent(a.path)}`} controls style={{ height: 32, width: 160 }} />
                )}
              </div>
            )) : (
              <div style={{ fontSize: 13, color: "var(--text-dim)", padding: "12px 0", textAlign: "center" }}>
                No audio files yet. Generate speech above.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════ IMAGE TAB ══════ */}
      {tab === "image" && (
        <div className="grid-2">
          <div className="card">
            <h3>Generate Image</h3>
            <textarea
              className="mt-12"
              value={imgPrompt}
              onChange={(e) => setImgPrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              style={{ minHeight: 120 }}
            />
            <div className="form-row mt-16">
              <div className="form-group">
                <label>Method</label>
                <select value={imgModel} onChange={(e) => setImgModel(e.target.value)}>
                  <option value="default">ImageMagick (built-in)</option>
                  <option value="comfyui">ComfyUI (if running)</option>
                </select>
              </div>
              <div className="form-group" style={{ justifyContent: "flex-end", display: "flex", flexDirection: "column" }}>
                <button
                  className="btn btn-primary"
                  onClick={generateImage}
                  disabled={imgGenerating || !imgPrompt.trim()}
                  style={{ marginTop: "auto" }}
                >
                  {imgGenerating ? "⏳ Generating..." : "🎨 Generate Image"}
                </button>
              </div>
            </div>

            {imgError && (
              <div className="card-raise mt-16" style={{ color: "var(--red)", fontSize: 13 }}>Error: {imgError}</div>
            )}

            {imgResult && isImageFile(imgResult) && (
              <div className="card-raise mt-16" style={{ animation: "statEnter 0.3s var(--ease-out)" }}>
                <div className="flex-between mb-8">
                  <span style={{ fontWeight: 600, fontSize: 13, color: "var(--green)" }}>
                    ✅ Generated via {imgMethod}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                    {imgResult.split("/").pop()}
                  </span>
                </div>
                <img
                  src={`/api/workspace/file?path=${encodeURIComponent(imgResult)}`}
                  alt={imgPrompt}
                  style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-deep)" }}
                />
              </div>
            )}
          </div>

          {/* Recent image assets */}
          <div className="card" style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            <h3>Recent Images</h3>
            {recentImages.length > 0 ? (
              <div className="grid-auto" style={{ gap: 8, marginTop: 8 }}>
                {recentImages.map((a, i) => (
                  <div key={i} style={{ borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)", background: "var(--bg)" }}>
                    {isImageFile(a.path) ? (
                      <img
                        src={`/api/workspace/file?path=${encodeURIComponent(a.path)}`}
                        alt={a.name}
                        style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: 100, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                        🎨
                      </div>
                    )}
                    <div style={{ padding: "6px 8px" }}>
                      <div style={{ fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600, color: "var(--text-bright)" }}>
                        {a.name}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-dim)" }}>
                        {a.sizeFormatted}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text-dim)", padding: "12px 0", textAlign: "center" }}>
                No images yet. Generate one above.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}