import { useEffect, useState } from "react";
import { api, timeAgo } from "../lib/api";

type ContentType = "blog" | "social" | "ad" | "email" | "product";
type ToneType = "professional" | "casual" | "witty" | "inspirational" | "educational" | "urgent";

const CONTENT_TYPES: Array<{ key: ContentType; label: string; icon: string; desc: string }> = [
  { key: "blog", label: "Blog Post", icon: "📝", desc: "SEO-optimized long-form articles with headings and structure" },
  { key: "social", label: "Social Post", icon: "📱", desc: "Platform-optimized captions with hashtags and emojis" },
  { key: "ad", label: "Ad Copy", icon: "🎯", desc: "Compelling ads with clear CTA using AIDA framework" },
  { key: "email", label: "Email", icon: "✉️", desc: "Marketing emails with subject line and preview text" },
  { key: "product", label: "Product Desc", icon: "🛍️", desc: "SEO product descriptions that drive conversions" },
];

const TONES: Array<{ key: ToneType; label: string; icon: string }> = [
  { key: "professional", label: "Professional", icon: "💼" },
  { key: "casual", label: "Casual", icon: "😊" },
  { key: "witty", label: "Witty", icon: "😄" },
  { key: "inspirational", label: "Inspirational", icon: "✨" },
  { key: "educational", label: "Educational", icon: "📚" },
  { key: "urgent", label: "Urgent", icon: "🔥" },
];

const PLATFORMS = ["blog", "x", "instagram", "linkedin", "tiktok", "facebook", "email"];

interface AIContentItem {
  id: number; type: string; title: string; body: string;
  prompt: string; tone: string; platform: string;
  keywords: string; status: string; word_count: number;
  created_at: string; updated_at: string;
}

export default function ContentWriter() {
  const [items, setItems] = useState<AIContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AIContentItem | null>(null);

  // Generator form
  const [genType, setGenType] = useState<ContentType>("blog");
  const [genTone, setGenTone] = useState<ToneType>("professional");
  const [genPlatform, setGenPlatform] = useState("blog");
  const [genPrompt, setGenPrompt] = useState("");
  const [genTitle, setGenTitle] = useState("");
  const [genKeywords, setGenKeywords] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  const load = () => {
    setLoading(true);
    api<AIContentItem[]>("/content-gen").then(setItems).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const generate = async () => {
    if (!genPrompt.trim()) return;
    setGenerating(true);
    setGenError("");
    try {
      const keywords = genKeywords.split(",").map(k => k.trim()).filter(Boolean);
      const result = await api<any>("/content-gen/generate", {
        method: "POST",
        body: JSON.stringify({
          type: genType,
          prompt: genPrompt,
          title: genTitle || undefined,
          tone: genTone,
          platform: genPlatform,
          keywords,
        }),
      });
      if (result.error) {
        setGenError(result.error);
      } else {
        setShowGenerator(false);
        load();
        // Auto-open the generated item
        if (result.id) {
          api<AIContentItem>("/content-gen/" + result.id).then(setSelectedItem);
        }
      }
    } catch (e: any) {
      setGenError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    await api(`/content-gen/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  };

  const deleteItem = async (id: number) => {
    await api(`/content-gen/${id}`, { method: "DELETE" });
    if (selectedItem?.id === id) setSelectedItem(null);
    load();
  };

  const typeIcon = (t: string) => CONTENT_TYPES.find(c => c.key === t)?.icon || "📄";

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>✍️ Content Writer</h1>
          <div className="subtitle">AI-powered content generation — blog posts, social media, ad copy, emails & more</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowGenerator(true)}>+ New Content</button>
      </div>

      {/* Content Type Cards */}
      <div className="grid-5 mb-24">
        {CONTENT_TYPES.map((ct) => {
          const count = items.filter(i => i.type === ct.key).length;
          return (
            <div
              key={ct.key}
              className="card card-hover cursor-pointer"
              onClick={() => { setGenType(ct.key); setShowGenerator(true); }}
            >
              <div className="text-[28px] mb-2">{ct.icon}</div>
              <div className="font-semibold text-[13px]">{ct.label}</div>
              <div className="text-[10px] text-text-dim mt-1">{count} items</div>
            </div>
          );
        })}
      </div>

      {/* Content List */}
      {loading ? (
        <div className="loading-state"><div className="loading-spinner" />Loading...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="icon">✍️</div>
          <p>No content yet</p>
          <div className="hint">Click a card above or "+ New Content" to generate your first piece</div>
        </div>
      ) : (
        <div className="grid-2">
          <div className="card" style={{ maxHeight: "calc(100vh - 260px)", overflowY: "auto" }}>
            <h3>Content Library</h3>
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex gap-3 py-[10px] px-3 rounded-lg cursor-pointer border border-transparent hover:border-[var(--border)] ${selectedItem?.id === item.id ? "bg-bg-raise border-[var(--border)]" : ""}`}
                onClick={() => setSelectedItem(item)}
              >
                <span className="text-xl flex-shrink-0">{typeIcon(item.type)}</span>
                <div className="flex-1 overflow-hidden">
                  <div className="font-semibold text-xs truncate">{item.title}</div>
                  <div className="text-[10px] text-text-dim flex gap-2 mt-[2px]">
                    <span>{item.type}</span>
                    <span>·</span>
                    <span>{item.word_count} words</span>
                    <span>·</span>
                    <span>{timeAgo(item.created_at)}</span>
                  </div>
                </div>
                <span className={`badge badge-${item.status === "published" ? "low" : item.status === "draft" ? "medium" : "urgent"} text-[9px] flex-shrink-0`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>

          {/* Preview Panel */}
          <div className="card" style={{ maxHeight: "calc(100vh - 260px)", overflowY: "auto" }}>
            {selectedItem ? (
              <>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3>{selectedItem.title}</h3>
                    <div className="text-[11px] text-text-dim flex gap-2 mt-1">
                      <span>{typeIcon(selectedItem.type)} {selectedItem.type}</span>
                      <span>·</span>
                      <span>Tone: {selectedItem.tone}</span>
                      {selectedItem.platform && <><span>·</span><span>{selectedItem.platform}</span></>}
                      <span>·</span>
                      <span>{selectedItem.word_count} words</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {selectedItem.status === "draft" && (
                      <button className="btn btn-sm btn-primary" onClick={() => updateStatus(selectedItem.id, "published")}>Publish</button>
                    )}
                    <button className="btn btn-sm btn-danger" onClick={() => deleteItem(selectedItem.id)}>Delete</button>
                  </div>
                </div>
                <div className="card-raise p-4 text-[13px] leading-[1.7] whitespace-pre-wrap" style={{ minHeight: 200 }}>
                  {selectedItem.body}
                </div>
                {selectedItem.keywords && (() => {
                  try {
                    const kw = JSON.parse(selectedItem.keywords);
                    return kw.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {kw.map((k: string, i: number) => (
                          <span key={i} className="badge badge-medium text-[10px]">{k}</span>
                        ))}
                      </div>
                    ) : null;
                  } catch { return null; }
                })()}
              </>
            ) : (
              <div className="empty-state py-spacing-xl">
                <div className="icon text-[32px]">📖</div>
                <p className="text-xs">Select content to preview</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generator Modal */}
      {showGenerator && (
        <div className="modal-overlay" onClick={() => setShowGenerator(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <h2>✍️ Generate Content</h2>

            {/* Content Type Selector */}
            <div className="form-group">
              <label>Content Type</label>
              <div className="grid-3 gap-2">
                {CONTENT_TYPES.map((ct) => (
                  <button
                    key={ct.key}
                    className={`btn btn-sm ${genType === ct.key ? "btn-primary" : "btn-ghost"} flex-col items-center py-3`}
                    onClick={() => setGenType(ct.key)}
                  >
                    <span className="text-lg">{ct.icon}</span>
                    <span className="text-[10px]">{ct.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div className="form-group">
              <label>Tone</label>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.key}
                    className={`btn btn-sm ${genTone === t.key ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setGenTone(t.key)}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform */}
            <div className="form-group">
              <label>Platform</label>
              <select value={genPlatform} onChange={(e) => setGenPlatform(e.target.value)}>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div className="form-group">
              <label>Title <span className="text-[9px] text-text-dim font-normal">(optional)</span></label>
              <input value={genTitle} onChange={(e) => setGenTitle(e.target.value)} placeholder="e.g. 10 Tips for Better SEO" />
            </div>

            {/* Prompt */}
            <div className="form-group">
              <label>What should the content be about?</label>
              <textarea
                value={genPrompt}
                onChange={(e) => setGenPrompt(e.target.value)}
                placeholder="e.g. Write a beginner's guide to React hooks, covering useState, useEffect, and custom hooks with practical examples..."
                style={{ minHeight: 120 }}
              />
            </div>

            {/* Keywords */}
            <div className="form-group">
              <label>Target Keywords <span className="text-[9px] text-text-dim font-normal">(comma-separated)</span></label>
              <input value={genKeywords} onChange={(e) => setGenKeywords(e.target.value)} placeholder="react hooks, useState, useEffect, custom hooks" />
            </div>

            {genError && <div className="card-raise mt-16 text-red text-[13px]">Error: {genError}</div>}

            <div className="form-actions">
              <button className="btn" onClick={() => setShowGenerator(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={generate} disabled={generating || !genPrompt.trim()}>
                {generating ? "⏳ Generating..." : `✨ Generate ${CONTENT_TYPES.find(c => c.key === genType)?.label || "Content"}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
