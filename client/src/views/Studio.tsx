import { useEffect, useState } from "react";
import { api, formatDate, timeAgo } from "../lib/api";

type StudioTab = "tts" | "image" | "video" | "history";

const TABS: Array<{ key: StudioTab; label: string; icon: string }> = [
  { key: "tts", label: "Text-to-Speech", icon: "🔊" },
  { key: "image", label: "Images", icon: "🎨" },
  { key: "video", label: "Video", icon: "🎬" },
  { key: "history", label: "History", icon: "📚" },
];

interface AssetItem {
  name: string; path: string; type: string; sizeFormatted: string; createdAt: string; mime: string;
}

interface ImageModel {
  id: string; name: string; provider: string; description: string;
  speed: "fast" | "medium" | "slow"; recommendedFor: string;
}

interface HistoryItem {
  id: number; type: string; title: string; prompt: string;
  file_path: string; status: string; metadata: string; created_at: string;
}

const DEFAULT_VOICES = [
  { name: "en-US-GuyNeural", gender: "Male", locale: "en-US" },
  { name: "en-US-JennyNeural", gender: "Female", locale: "en-US" },
  { name: "en-GB-RyanNeural", gender: "Male", locale: "en-GB" },
  { name: "en-GB-SoniaNeural", gender: "Female", locale: "en-GB" },
  { name: "ar-EG-ShakirNeural", gender: "Male", locale: "ar-EG" },
  { name: "ar-SA-HamedNeural", gender: "Male", locale: "ar-SA" },
];

const ASPECT_RATIOS = [
  { label: "Square 1:1", w: 1024, h: 1024 },
  { label: "Portrait 3:4", w: 768, h: 1024 },
  { label: "Landscape 4:3", w: 1024, h: 768 },
  { label: "Landscape 16:9", w: 1024, h: 576 },
  { label: "Portrait 9:16", w: 576, h: 1024 },
];

const SPEED_ICONS: Record<string, string> = { fast: "⚡", medium: "🔶", slow: "🐢" };

export default function Studio() {
  const [tab, setTab] = useState<StudioTab>("image");
  const [imageModels, setImageModels] = useState<ImageModel[]>([]);
  const [recentAudio, setRecentAudio] = useState<AssetItem[]>([]);
  const [recentImages, setRecentImages] = useState<AssetItem[]>([]);

  // TTS
  const [ttsText, setTtsText] = useState("");
  const [ttsVoice, setTtsVoice] = useState("en-US-GuyNeural");
  const [ttsGenerating, setTtsGenerating] = useState(false);
  const [ttsResult, setTtsResult] = useState<string | null>(null);
  const [ttsError, setTtsError] = useState("");

  // Image
  const [imgPrompt, setImgPrompt] = useState("");
  const [imgNegative, setImgNegative] = useState("");
  const [imgModel, setImgModel] = useState("stabilityai/stable-diffusion-xl-base-1.0");
  const [imgCount, setImgCount] = useState(1);
  const [imgAspect, setImgAspect] = useState(0);
  const [imgGenerating, setImgGenerating] = useState(false);
  const [imgResults, setImgResults] = useState<string[]>([]);
  const [imgError, setImgError] = useState("");

  // Video
  const [vidPrompt, setVidPrompt] = useState("");
  const [vidGenerating, setVidGenerating] = useState(false);
  const [vidResult, setVidResult] = useState<any>(null);
  const [vidError, setVidError] = useState("");

  // History
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [historyExpanded, setHistoryExpanded] = useState<Record<number, boolean>>({});

  const loadModels = async () => { try { const data = await api<{ image: ImageModel[] }>("/studio/models"); setImageModels(data.image); } catch {} };
  const loadRecent = async () => { try { const data = await api<{ audio: AssetItem[]; image: AssetItem[] }>("/studio/recent"); setRecentAudio(data.audio); setRecentImages(data.image); } catch {} };
  const loadHistory = async () => { try { const filter = historyFilter !== "all" ? `?type=${historyFilter}` : ""; const data = await api<HistoryItem[]>(`/studio/history${filter}`); setHistory(data); } catch {} };

  useEffect(() => { loadModels(); loadRecent(); loadHistory(); }, []);
  useEffect(() => { if (tab === "history") loadHistory(); }, [tab, historyFilter]);

  const refresh = () => { loadRecent(); loadHistory(); };

  const generateTTS = async () => {
    if (!ttsText.trim()) return;
    setTtsGenerating(true); setTtsResult(null); setTtsError("");
    try {
      const result = await api<any>("/studio/tts", { method: "POST", body: JSON.stringify({ text: ttsText, voice: ttsVoice }) });
      if (result.status === "done") { setTtsResult(result.file); refresh(); } else { setTtsError(result.error || "Generation failed"); }
    } catch (e: any) { setTtsError(e.message); } finally { setTtsGenerating(false); }
  };

  const generateImage = async () => {
    if (!imgPrompt.trim()) return;
    setImgGenerating(true); setImgResults([]); setImgError("");
    try {
      const ar = ASPECT_RATIOS[imgAspect];
      const result = await api<any>("/studio/image", { method: "POST", body: JSON.stringify({ prompt: imgPrompt, model: imgModel, numImages: imgCount, negativePrompt: imgNegative || undefined, width: ar.w, height: ar.h }) });
      if (result.status === "done") { setImgResults(result.images?.map((i: any) => i.file) || []); refresh(); } else { setImgError(result.error || "Generation failed"); }
    } catch (e: any) { setImgError(e.message); } finally { setImgGenerating(false); }
  };

  const generateVideo = async () => {
    if (!vidPrompt.trim()) return;
    setVidGenerating(true); setVidResult(null); setVidError("");
    try {
      const result = await api<any>("/studio/video", { method: "POST", body: JSON.stringify({ prompt: vidPrompt, duration: 4 }) });
      if (result.status === "done" || result.status === "pending") { setVidResult(result); refresh(); } else { setVidError(result.error || "Generation failed"); }
    } catch (e: any) { setVidError(e.message); } finally { setVidGenerating(false); }
  };

  const deleteHistory = async (id: number) => { await api(`/studio/history/${id}`, { method: "DELETE" }); loadHistory(); };
  const isAudioFile = (path: string) => path?.match(/\.(mp3|wav|ogg|flac|m4a)$/i);
  const isImageFile = (path: string) => path?.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i);
  const selectedModel = imageModels.find((m) => m.id === imgModel);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>🎬 Studio</h1>
          <div className="subtitle">TTS via edge-tts · Images via OpenRouter AI + ImageMagick · Generation history · ~/agent-outputs/</div>
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

      {/* ═══ TTS TAB ═══ */}
      {tab === "tts" && (
        <div className="grid-2">
          <div className="card">
            <h3>Generate Speech</h3>
            <small className="text-text-dim">Powered by edge-tts — 100+ voices across 15+ languages</small>
            <textarea className="mt-12" value={ttsText} onChange={(e) => setTtsText(e.target.value)} placeholder="Enter text to convert to speech..." style={{ minHeight: 140 }} />
            <div className="form-row mt-16">
              <div className="form-group">
                <label>Voice</label>
                <select value={ttsVoice} onChange={(e) => setTtsVoice(e.target.value)}>
                  {DEFAULT_VOICES.map((v) => (<option key={v.name} value={v.name}>{v.name} ({v.gender}, {v.locale})</option>))}
                </select>
              </div>
              <div className="form-group justify-end flex flex-col">
                <button className="btn btn-primary mt-auto" onClick={generateTTS} disabled={ttsGenerating || !ttsText.trim()}>
                  {ttsGenerating ? "⏳ Generating..." : "🔊 Generate Speech"}
                </button>
              </div>
            </div>
            {ttsError && (<div className="card-raise mt-16 text-red text-[13px]">Error: {ttsError}</div>)}
            {ttsResult && (
              <div className="card-raise mt-16" style={{ animation: "statEnter 0.3s var(--ease-out)" }}>
                <div className="font-semibold mb-2 text-[13px] text-green">✅ Generated — {ttsResult.split("/").pop()}</div>
                {isAudioFile(ttsResult) ? (
                  <audio src={`/api/workspace/file?path=${encodeURIComponent(ttsResult)}`} controls className="w-full" />
                ) : (
                  <div className="text-xs text-text-dim">Saved: <code>{ttsResult}</code></div>
                )}
              </div>
            )}
          </div>
          <div className="card" style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            <h3>Recent Audio Files</h3>
            {recentAudio.length > 0 ? recentAudio.map((a, i) => (
              <div key={i} className="flex gap-3 py-[10px] items-center border-b border-border">
                <span className="text-xl">🔊</span>
                <div className="flex-1 overflow-hidden">
                  <div className="font-semibold text-xs truncate">{a.name}</div>
                  <div className="text-[11px] text-text-dim">{a.sizeFormatted} · {timeAgo(a.createdAt)}</div>
                </div>
                {isAudioFile(a.path) && (<audio src={`/api/workspace/file?path=${encodeURIComponent(a.path)}`} controls style={{ height: 32, width: 140 }} />)}
              </div>
            )) : (
              <div className="text-[13px] text-text-dim py-3 text-center">No audio files yet.</div>
            )}
          </div>
        </div>
      )}

      {/* ═══ IMAGE TAB ═══ */}
      {tab === "image" && (
        <div className="grid-2">
          <div className="card">
            <h3>Generate Image</h3>
            <small className="text-text-dim">
              Powered by OpenRouter AI + ImageMagick 7.
              {selectedModel?.provider === "Local" ? " Using local ImageMagick (no API key)." : ` Using ${selectedModel?.name || "AI"} via OpenRouter.`}
            </small>
            <textarea className="mt-12" value={imgPrompt} onChange={(e) => setImgPrompt(e.target.value)} placeholder="Describe the image you want to generate..." style={{ minHeight: 100 }} />
            {imageModels.length > 1 && (
              <div className="form-row mt-12">
                <div className="form-group flex-1">
                  <label>Model</label>
                  <select value={imgModel} onChange={(e) => setImgModel(e.target.value)}>
                    {imageModels.map((m) => (<option key={m.id} value={m.id}>{SPEED_ICONS[m.speed] || "⚡"} {m.name} ({m.provider})</option>))}
                  </select>
                  {selectedModel && (<div className="text-[10px] text-text-dim mt-1">{selectedModel.description}</div>)}
                </div>
              </div>
            )}
            <div className="form-row mt-12">
              <div className="form-group flex-1">
                <label>Negative Prompt <span className="text-[9px] text-text-dim font-normal">(optional, AI models only)</span></label>
                <input type="text" value={imgNegative} onChange={(e) => setImgNegative(e.target.value)} placeholder="Things to avoid: blurry, low quality, ugly..." />
              </div>
            </div>
            <div className="form-row mt-12">
              <div className="form-group">
                <label>Count</label>
                <select value={imgCount} onChange={(e) => setImgCount(Number(e.target.value))}>
                  {[1, 2, 4].map((n) => (<option key={n} value={n}>{n} image{n > 1 ? "s" : ""}</option>))}
                </select>
              </div>
              <div className="form-group justify-end flex flex-col">
                <button className="btn btn-primary mt-auto" onClick={generateImage} disabled={imgGenerating || !imgPrompt.trim()}>
                  {imgGenerating ? "⏳ Generating..." : "🎨 Generate"}
                </button>
              </div>
            </div>
            {imgError && (<div className="card-raise mt-16 text-red text-[13px]">Error: {imgError}</div>)}
            {imgResults.length > 0 && (
              <div className="mt-12" style={{ animation: "statEnter 0.3s var(--ease-out)" }}>
                <div className="font-semibold text-[13px] text-green mb-2">
                  ✅ {imgResults.length} image{imgResults.length > 1 ? "s" : ""} generated
                  <span className="text-text-dim font-normal"> · {selectedModel?.name || "ImageMagick"}</span>
                </div>
                <div className={imgResults.length > 1 ? "grid-2" : ""} style={{ gap: 8 }}>
                  {imgResults.map((path, i) => (
                    <div key={i} className="rounded-lg overflow-hidden border border-border">
                      {isImageFile(path) ? (
                        <img src={`/api/workspace/file?path=${encodeURIComponent(path)}`} alt={`Generated ${i + 1}`} className="w-full block bg-bg-deep" />
                      ) : null}
                      <div className="py-[6px] px-2 text-[10px] text-text-dim">{path.split("/").pop()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="card" style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            <h3>Recent Images</h3>
            {recentImages.length > 0 ? (
              <div className="grid-auto gap-2 mt-2">
                {recentImages.map((a, i) => (
                  <div key={i} className="rounded-md overflow-hidden border border-border bg-bg">
                    {isImageFile(a.path) ? (
                      <img src={`/api/workspace/file?path=${encodeURIComponent(a.path)}`} alt={a.name} className="w-full block" style={{ height: 100, objectFit: "cover" }} />
                    ) : (
                      <div className="w-full flex items-center justify-center text-2xl" style={{ height: 100 }}>🎨</div>
                    )}
                    <div className="py-[6px] px-2">
                      <div className="text-[10px] truncate font-semibold text-text-bright">{a.name}</div>
                      <div className="text-[10px] text-text-dim">{a.sizeFormatted}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[13px] text-text-dim py-3 text-center">No images yet.</div>
            )}
          </div>
        </div>
      )}

      {/* ═══ VIDEO TAB ═══ */}
      {tab === "video" && (
        <div className="grid-2">
          <div className="card">
            <h3>Generate Video</h3>
            <small className="text-text-dim">NVIDIA Cosmos video generation · ~4-8 second clips</small>
            <textarea className="mt-12" value={vidPrompt} onChange={(e) => setVidPrompt(e.target.value)} placeholder="Describe the video scene you want to generate..." style={{ minHeight: 120 }} />
            <div className="form-row mt-16">
              <div className="form-group justify-end flex flex-col">
                <button className="btn btn-primary mt-auto" onClick={generateVideo} disabled={vidGenerating || !vidPrompt.trim()}>
                  {vidGenerating ? "⏳ Generating..." : "🎬 Generate Video"}
                </button>
              </div>
            </div>
            {vidError && (<div className="card-raise mt-16 text-red text-[13px]">Error: {vidError}</div>)}
            {vidResult && (
              <div className="card-raise mt-16" style={{ animation: "statEnter 0.3s var(--ease-out)" }}>
                <div className="font-semibold text-[13px]" style={{ color: vidResult.status === "done" ? "var(--green)" : "var(--yellow)" }}>
                  {vidResult.status === "done" ? "✅ Generated" : "⏳ Queued"}
                </div>
                <div className="text-xs text-text-dim mt-1">{vidResult.message || "Video saved to ~/agent-outputs/videos/"}</div>
                {vidResult.file && (<div className="text-[11px] text-text-dim mt-2">File: <code>{vidResult.filename}</code></div>)}
              </div>
            )}
          </div>
          <div className="card">
            <h3>Video Models</h3>
            <div className="mt-12">
              {[
                { name: "Cosmos Predict1", icon: "🌌", desc: "NVIDIA world model for video generation", status: "Preview" },
                { name: "Stable Video Diffusion", icon: "🎥", desc: "Image-to-video from Stability AI", status: "Preview" },
              ].map((vm, i) => (
                <div key={i} className="py-3 flex gap-3 items-start border-b border-border">
                  <span className="text-xl">{vm.icon}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-[13px] text-text-bright">{vm.name}</div>
                    <div className="text-xs text-text-dim">{vm.desc}</div>
                  </div>
                  <span className="badge badge-medium text-[9px]">{vm.status}</span>
                </div>
              ))}
            </div>
            <div className="mt-12 text-xs text-text-dim p-3 rounded-md border border-border bg-bg-deep">
              Video generation via NVIDIA Cosmos NIM. The NVIDIA API endpoint is called when available;
              otherwise a placeholder is created with metadata for future generation.
            </div>
          </div>
        </div>
      )}

      {/* ═══ HISTORY TAB ═══ */}
      {tab === "history" && (
        <div>
          <div className="card filter-bar mb-16 flex gap-[6px] p-2">
            {["all", "image", "audio", "video"].map((f) => (
              <button key={f} className={`filter-pill${historyFilter === f ? " active" : ""}`} onClick={() => setHistoryFilter(f)}>
                {f === "all" ? "📋 All" : f === "image" ? "🎨 Images" : f === "audio" ? "🔊 Audio" : "🎬 Video"}
              </button>
            ))}
          </div>
          {history.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📚</div>
              <p>No generation history yet</p>
              <div className="hint">Generate images or audio in the tabs above</div>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="w-10">Type</th>
                      <th>Title / Prompt</th>
                      <th className="w-[100px]">Status</th>
                      <th className="w-[120px]">Created</th>
                      <th className="w-[60px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => {
                      const meta = (() => { try { return JSON.parse(h.metadata || "{}"); } catch { return {}; } })();
                      const icon = h.type === "image" ? "🎨" : h.type === "audio" ? "🔊" : h.type === "video" ? "🎬" : "📄";
                      const isExpanded = historyExpanded[h.id];
                      return (
                        <tr key={h.id}>
                          <td className="text-center text-lg">{icon}</td>
                          <td>
                            <div className="font-semibold text-xs text-text-bright">{h.title}</div>
                            <div className="text-[11px] text-text-dim cursor-pointer" onClick={() => setHistoryExpanded((p) => ({ ...p, [h.id]: !isExpanded }))}>
                              {isExpanded ? h.prompt?.slice(0, 200) : h.prompt?.slice(0, 60)}{h.prompt?.length > 60 ? "..." : ""}
                              {h.prompt?.length > 60 && (<span className="text-accent ml-1">{isExpanded ? "▲ less" : "▼ more"}</span>)}
                            </div>
                            {isExpanded && meta.model && (<div className="text-[10px] text-text-dim mt-1">Model: {meta.model}{meta.method ? ` · ${meta.method}` : ""}</div>)}
                          </td>
                          <td><span className={`agent-s-badge ${h.status === "done" ? "online" : h.status === "pending" ? "idle" : "offline"}`}>{h.status}</span></td>
                          <td className="text-[11px] text-text-dim whitespace-nowrap">{timeAgo(h.created_at)}</td>
                          <td><button className="btn btn-sm btn-ghost text-[10px] py-[3px] px-2" onClick={() => deleteHistory(h.id)}>✕</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
