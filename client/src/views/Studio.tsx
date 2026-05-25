import { useEffect, useState, useRef, useCallback } from "react";
import { api, formatDate, timeAgo } from "../lib/api";

type StudioTab = "tts" | "image" | "video";
type JobStatus = "queued" | "processing" | "done" | "error";

interface StudioJob {
  id: string;
  type: "tts" | "image" | "video";
  status: JobStatus;
  prompt: string;
  voice?: string;
  filePath?: string;
  error?: string;
  progress: number;
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, any>;
}

const TABS: Array<{ key: StudioTab; label: string; icon: string }> = [
  { key: "tts", label: "Text-to-Speech", icon: "🔊" },
  { key: "image", label: "Image Generation", icon: "🎨" },
  { key: "video", label: "Video Generation", icon: "🎬" },
];

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
  const [history, setHistory] = useState<StudioJob[]>([]);
  const [loading, setLoading] = useState(true);

  // TTS state
  const [ttsText, setTtsText] = useState("");
  const [ttsVoice, setTtsVoice] = useState("en-US-GuyNeural");
  const [ttsGenerating, setTtsGenerating] = useState(false);
  const [ttsResult, setTtsResult] = useState<StudioJob | null>(null);

  // Image state
  const [imgPrompt, setImgPrompt] = useState("");
  const [imgModel, setImgModel] = useState("default");
  const [imgGenerating, setImgGenerating] = useState(false);
  const [imgResult, setImgResult] = useState<StudioJob | null>(null);

  // Video state
  const [vidPrompt, setVidPrompt] = useState("");
  const [vidGenerating, setVidGenerating] = useState(false);
  const [vidResult, setVidResult] = useState<StudioJob | null>(null);

  // Job polling
  const [polling, setPolling] = useState<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const h = await api<StudioJob[]>("/studio/history");
      setHistory(h);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Poll active jobs
  useEffect(() => {
    if (polling.size === 0) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }

    pollRef.current = setInterval(async () => {
      const ids = Array.from(polling);
      const updated = new Set(polling);

      for (const id of ids) {
        try {
          const job = await api<StudioJob>(`/studio/job/${id}`);
          // Update in-place results
          if (job.type === "tts") setTtsResult(job);
          else if (job.type === "image") setImgResult(job);
          else if (job.type === "video") setVidResult(job);

          if (job.status === "done" || job.status === "error") {
            updated.delete(id);
            loadHistory();
          }
        } catch {}
      }

      setPolling(updated);
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [polling, loadHistory]);

  // ── TTS ──
  const generateTTS = async () => {
    if (!ttsText.trim()) return;
    setTtsGenerating(true);
    setTtsResult(null);
    try {
      const result = await api<{ id: string }>("/studio/tts", {
        method: "POST",
        body: JSON.stringify({ text: ttsText, voice: ttsVoice }),
      });
      setPolling((prev) => new Set(prev).add(result.id));
      // Also add to history immediately
      loadHistory();
    } catch (e: any) {
      setTtsResult({ id: "error", type: "tts", status: "error", prompt: ttsText, progress: 0, error: e.message, createdAt: new Date().toISOString() });
    } finally {
      setTtsGenerating(false);
    }
  };

  // ── Image ──
  const generateImage = async () => {
    if (!imgPrompt.trim()) return;
    setImgGenerating(true);
    setImgResult(null);
    try {
      const result = await api<{ id: string }>("/studio/image", {
        method: "POST",
        body: JSON.stringify({ prompt: imgPrompt, model: imgModel }),
      });
      setPolling((prev) => new Set(prev).add(result.id));
      loadHistory();
    } catch (e: any) {
      setImgResult({ id: "error", type: "image", status: "error", prompt: imgPrompt, progress: 0, error: e.message, createdAt: new Date().toISOString() });
    } finally {
      setImgGenerating(false);
    }
  };

  // ── Video ──
  const generateVideo = async () => {
    if (!vidPrompt.trim()) return;
    setVidGenerating(true);
    setVidResult(null);
    try {
      const result = await api<{ id: string }>("/studio/video", {
        method: "POST",
        body: JSON.stringify({ prompt: vidPrompt }),
      });
      setPolling((prev) => new Set(prev).add(result.id));
      loadHistory();
    } catch (e: any) {
      setVidResult({ id: "error", type: "video", status: "error", prompt: vidPrompt, progress: 0, error: e.message, createdAt: new Date().toISOString() });
    } finally {
      setVidGenerating(false);
    }
  };

  if (loading) return <div className="loading-state"><div className="loading-spinner" />Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>🎬 Studio</h1>
          <div className="subtitle">Generate audio, images, and video — saved to ~/agent-outputs/</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={loadHistory}>Refresh</button>
      </div>

      {/* Tab Bar */}
      <div className="card filter-bar mb-24">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`filter-pill${tab === t.key ? " active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* TTS Tab */}
      {tab === "tts" && (
        <div className="grid-2">
          <div className="card">
            <h3>Text Input</h3>
            <textarea
              className="mt-12"
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
              placeholder="Enter text to convert to speech..."
              style={{ minHeight: 160 }}
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

            {ttsResult && (
              <div className="mt-16" style={{ animation: "statEnter 0.3s var(--ease-out)" }}>
                <div className={`card-raise ${ttsResult.status === "error" ? "" : ""}`}>
                  {ttsResult.status === "processing" && (
                    <div className="loading-state" style={{ padding: 20 }}>
                      <div className="loading-spinner" />
                      <span>Generating audio...</span>
                    </div>
                  )}
                  {ttsResult.status === "done" && ttsResult.filePath?.match(/\.(mp3|wav|ogg|flac)$/i) && (
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Generated Audio</div>
                      <audio src={`/api/workspace/file?path=${encodeURIComponent(ttsResult.filePath)}`} controls style={{ width: "100%" }} />
                    </div>
                  )}
                  {ttsResult.status === "done" && !ttsResult.filePath?.match(/\.(mp3|wav|ogg|flac)$/i) && (
                    <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
                      File saved: <code>{ttsResult.filePath}</code>
                    </div>
                  )}
                  {ttsResult.status === "error" && (
                    <div style={{ color: "var(--red)", fontSize: 13 }}>Error: {ttsResult.error}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="card">
              <h3>Recent TTS</h3>
              {history.filter((j) => j.type === "tts").slice(0, 5).length > 0
                ? history.filter((j) => j.type === "tts").slice(0, 5).map((j) => (
                    <div key={j.id} className="vault-note">
                      <span className="note-icon">🔊</span>
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <div className="note-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {j.prompt.slice(0, 60)}
                        </div>
                        <div className="note-path">
                          {j.voice ? `${j.voice} · ` : ""}{formatDate(j.createdAt)}
                        </div>
                      </div>
                      <span className={`badge badge-${j.status === "done" ? "low" : j.status === "error" ? "urgent" : "medium"}`}>
                        {j.status}
                      </span>
                    </div>
                  ))
                : <div style={{ fontSize: 13, color: "var(--text-dim)", padding: "12px 0" }}>No TTS generations yet.</div>
              }
            </div>
          </div>
        </div>
      )}

      {/* Image Tab */}
      {tab === "image" && (
        <div className="grid-2">
          <div className="card">
            <h3>Prompt</h3>
            <textarea
              className="mt-12"
              value={imgPrompt}
              onChange={(e) => setImgPrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              style={{ minHeight: 120 }}
            />
            <div className="form-row mt-16">
              <div className="form-group">
                <label>Model</label>
                <select value={imgModel} onChange={(e) => setImgModel(e.target.value)}>
                  <option value="default">Default (placeholder)</option>
                  <option value="comfyui">ComfyUI (if configured)</option>
                  <option value="dall-e">DALL-E (API key needed)</option>
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

            {imgResult && (
              <div className="mt-16" style={{ animation: "statEnter 0.3s var(--ease-out)" }}>
                {imgResult.status === "processing" && (
                  <div className="loading-state" style={{ padding: 20 }}>
                    <div className="loading-spinner" />
                    <span>Generating image...</span>
                  </div>
                )}
                {imgResult.status === "done" && imgResult.filePath?.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i) && (
                  <div className="card-raise" style={{ padding: 8 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Result</div>
                    <img
                      src={`/api/workspace/file?path=${encodeURIComponent(imgResult.filePath)}`}
                      alt={imgResult.prompt}
                      style={{ width: "100%", borderRadius: 8, background: "var(--bg-deep)" }}
                    />
                    <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 8 }}>
                      {imgResult.filePath.split("/").pop()} · {imgResult.metadata?.model || "default"}
                    </div>
                  </div>
                )}
                {imgResult.status === "error" && (
                  <div className="card-raise" style={{ color: "var(--red)", fontSize: 13 }}>Error: {imgResult.error}</div>
                )}
              </div>
            )}
          </div>

          <div className="card" style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            <h3>Recent Images</h3>
            {history.filter((j) => j.type === "image").slice(0, 10).length > 0
              ? history.filter((j) => j.type === "image").slice(0, 10).map((j) => (
                  <div key={j.id} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 6, background: "var(--bg-deep)", overflow: "hidden", flexShrink: 0 }}>
                      {j.filePath?.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)
                        ? <img src={`/api/workspace/file?path=${encodeURIComponent(j.filePath)}`} alt="" style={{ width: 48, height: 48, objectFit: "cover" }} />
                        : <div style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>🎨</div>
                      }
                    </div>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={{ fontWeight: 600, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {j.prompt.slice(0, 50)}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{formatDate(j.createdAt)}</div>
                    </div>
                    <span className={`badge badge-${j.status === "done" ? "low" : j.status === "error" ? "urgent" : "medium"}`}>{j.status}</span>
                  </div>
                ))
              : <div style={{ fontSize: 13, color: "var(--text-dim)", padding: "12px 0" }}>No images generated yet.</div>
            }
          </div>
        </div>
      )}

      {/* Video Tab */}
      {tab === "video" && (
        <div className="grid-2">
          <div className="card">
            <h3>Prompt</h3>
            <textarea
              className="mt-12"
              value={vidPrompt}
              onChange={(e) => setVidPrompt(e.target.value)}
              placeholder="Describe the video you want to generate..."
              style={{ minHeight: 120 }}
            />
            <button
              className="btn btn-primary mt-16"
              onClick={generateVideo}
              disabled={vidGenerating || !vidPrompt.trim()}
            >
              {vidGenerating ? "⏳ Generating..." : "🎬 Generate Video"}
            </button>

            {vidResult && (
              <div className="mt-16">
                {(vidResult.status === "queued" || vidResult.status === "processing") && (
                  <div className="card-raise">
                    <div className="flex-between mb-8">
                      <span style={{ fontWeight: 600, fontSize: 13 }}>Video Generation</span>
                      <span className={`badge badge-${vidResult.status === "processing" ? "medium" : "medium"}`}>
                        {vidResult.status}
                      </span>
                    </div>
                    <div style={{ background: "var(--bg-deep)", borderRadius: 10, height: 8, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${vidResult.progress}%`,
                          height: "100%",
                          background: "var(--accent)",
                          borderRadius: 10,
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4, textAlign: "right" }}>
                      {vidResult.progress}%
                    </div>
                  </div>
                )}
                {vidResult.status === "done" && (
                  <div className="card-raise">
                    <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13, color: "var(--green)" }}>✅ Complete</div>
                    {vidResult.filePath && (
                      <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                        Saved: <code>{vidResult.filePath}</code>
                      </div>
                    )}
                  </div>
                )}
                {vidResult.status === "error" && (
                  <div className="card-raise" style={{ color: "var(--red)", fontSize: 13 }}>Error: {vidResult.error}</div>
                )}
              </div>
            )}
          </div>

          <div className="card" style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            <h3>Recent Videos</h3>
            {history.filter((j) => j.type === "video").slice(0, 10).length > 0
              ? history.filter((j) => j.type === "video").slice(0, 10).map((j) => (
                  <div key={j.id} className="vault-note">
                    <span className="note-icon">🎬</span>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div className="note-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {j.prompt.slice(0, 60)}
                      </div>
                      <div className="note-path">
                        {formatDate(j.createdAt)} · {j.progress}%
                      </div>
                    </div>
                    <div className="flex gap-xs" style={{ alignItems: "center" }}>
                      {j.status === "processing" && <div className="loading-spinner" style={{ width: 12, height: 12, margin: 0 }} />}
                      <span className={`badge badge-${j.status === "done" ? "low" : j.status === "error" ? "urgent" : "medium"}`}>
                        {j.status}
                      </span>
                    </div>
                  </div>
                ))
              : <div style={{ fontSize: 13, color: "var(--text-dim)", padding: "12px 0" }}>No videos generated yet.</div>
            }
          </div>
        </div>
      )}
    </div>
  );
}