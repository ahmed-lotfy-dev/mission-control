import { useEffect, useState } from "react";
import { api, timeAgo } from "../lib/api";

const PLATFORMS = [
  { key: "x", label: "X / Twitter", icon: "𝕏", color: "#1d9bf0", charLimit: 280 },
  { key: "instagram", label: "Instagram", icon: "📷", color: "#e1306c", charLimit: 2200 },
  { key: "linkedin", label: "LinkedIn", icon: "💼", color: "#0077b5", charLimit: 3000 },
  { key: "tiktok", label: "TikTok", icon: "🎵", color: "#ff0050", charLimit: 150 },
  { key: "facebook", label: "Facebook", icon: "📘", color: "#1877f2", charLimit: 63206 },
];

interface SocialPost {
  id: number; platform: string; content: string;
  image_url: string; status: string; scheduled_at: string;
  posted_at: string; engagement: string; created_at: string;
}

export default function Social() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [showCompose, setShowCompose] = useState(false);

  // Compose form
  const [composePlatform, setComposePlatform] = useState("x");
  const [composeContent, setComposeContent] = useState("");
  const [composeImage, setComposeImage] = useState("");
  const [composeSchedule, setComposeSchedule] = useState("");
  const [composing, setComposing] = useState(false);

  // AI assist
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  const load = () => {
    setLoading(true);
    api<SocialPost[]>("/content-gen/social").then(setPosts).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const compose = async () => {
    if (!composeContent.trim()) return;
    setComposing(true);
    try {
      await api("/content-gen/social", {
        method: "POST",
        body: JSON.stringify({
          platform: composePlatform,
          content: composeContent,
          imageUrl: composeImage || undefined,
          scheduledAt: composeSchedule || undefined,
          status: composeSchedule ? "scheduled" : "draft",
        }),
      });
      setShowCompose(false);
      setComposeContent(""); setComposeImage(""); setComposeSchedule("");
      load();
    } catch {} finally { setComposing(false); }
  };

  const aiAssist = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    try {
      const result = await api<any>("/content-gen/generate", {
        method: "POST",
        body: JSON.stringify({
          type: "social",
          prompt: aiPrompt,
          platform: composePlatform,
          tone: composePlatform === "linkedin" ? "professional" : "casual",
        }),
      });
      if (result.body) setComposeContent(result.body);
    } catch {} finally { setAiGenerating(false); }
  };

  const updateStatus = async (id: number, status: string) => {
    await api(`/content-gen/social/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  };

  const deletePost = async (id: number) => {
    await api(`/content-gen/social/${id}`, { method: "DELETE" });
    load();
  };

  const filteredPosts = selectedPlatform === "all" ? posts : posts.filter(p => p.platform === selectedPlatform);
  const platform = PLATFORMS.find(p => p.key === composePlatform);
  const charCount = composeContent.length;
  const charLimit = platform?.charLimit || 280;

  const statusCounts = {
    draft: posts.filter(p => p.status === "draft").length,
    scheduled: posts.filter(p => p.status === "scheduled").length,
    published: posts.filter(p => p.status === "published").length,
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>📱 Social Hub</h1>
          <div className="subtitle">Create, schedule, and manage social media posts across all platforms</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCompose(true)}>+ Compose</button>
      </div>

      {/* Platform Cards */}
      <div className="grid-5 mb-24">
        {PLATFORMS.map(p => {
          const count = posts.filter(post => post.platform === p.key).length;
          return (
            <div
              key={p.key}
              className={`card card-hover cursor-pointer ${selectedPlatform === p.key ? "border-[var(--accent)]" : ""}`}
              onClick={() => setSelectedPlatform(selectedPlatform === p.key ? "all" : p.key)}
            >
              <div className="text-[28px] mb-2" style={{ color: p.color }}>{p.icon}</div>
              <div className="font-semibold text-[13px]">{p.label}</div>
              <div className="text-[10px] text-text-dim mt-1">{count} posts</div>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div className="grid-3 mb-24">
        <div className="stat-card accent-gold">
          <span className="value">{posts.length}</span>
          <div className="label">Total Posts</div>
        </div>
        <div className="stat-card accent-purple">
          <span className="value">{statusCounts.scheduled}</span>
          <div className="label">Scheduled</div>
        </div>
        <div className="stat-card accent-green">
          <span className="value">{statusCounts.published}</span>
          <div className="label">Published</div>
        </div>
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="loading-state"><div className="loading-spinner" />Loading...</div>
      ) : filteredPosts.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📱</div>
          <p>No posts yet</p>
          <div className="hint">Click "+ Compose" to create your first social media post</div>
        </div>
      ) : (
        <div className="card">
          <div className="flex items-center justify-between mb-12">
            <h3>{selectedPlatform === "all" ? "All Posts" : PLATFORMS.find(p => p.key === selectedPlatform)?.label + " Posts"}</h3>
            <div className="flex gap-2">
              <button className={`btn btn-sm ${selectedPlatform === "all" ? "btn-primary" : "btn-ghost"}`} onClick={() => setSelectedPlatform("all")}>All</button>
              {PLATFORMS.slice(0, 3).map(p => (
                <button key={p.key} className={`btn btn-sm ${selectedPlatform === p.key ? "btn-primary" : "btn-ghost"}`} onClick={() => setSelectedPlatform(p.key)}>
                  {p.icon}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {filteredPosts.map(post => {
              const plat = PLATFORMS.find(p => p.key === post.platform);
              const engagement = (() => { try { return JSON.parse(post.engagement || "{}"); } catch { return {}; } })();
              return (
                <div key={post.id} className="card-raise flex gap-3 items-start">
                  <div className="text-xl flex-shrink-0 mt-1" style={{ color: plat?.color }}>{plat?.icon || "📌"}</div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-[13px] leading-[1.5] whitespace-pre-wrap">{post.content}</div>
                    <div className="text-[10px] text-text-dim flex gap-2 mt-2">
                      <span>{plat?.label || post.platform}</span>
                      <span>·</span>
                      <span>{timeAgo(post.created_at)}</span>
                      {engagement.likes && <><span>·</span><span>❤️ {engagement.likes}</span></>}
                      {engagement.views && <><span>·</span><span>👁 {engagement.views}</span></>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {post.status === "draft" && (
                      <button className="btn btn-sm btn-primary text-[10px]" onClick={() => updateStatus(post.id, "scheduled")}>Schedule</button>
                    )}
                    {post.status === "scheduled" && (
                      <button className="btn btn-sm btn-primary text-[10px]" onClick={() => updateStatus(post.id, "published")}>Publish</button>
                    )}
                    <button className="btn btn-sm btn-danger text-[10px]" onClick={() => deletePost(post.id)}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <div className="modal-overlay" onClick={() => setShowCompose(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <h2>📱 Compose Post</h2>

            {/* Platform Selector */}
            <div className="form-group">
              <label>Platform</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => (
                  <button
                    key={p.key}
                    className={`btn btn-sm ${composePlatform === p.key ? "btn-primary" : "btn-ghost"}`}
                    style={composePlatform === p.key ? { background: p.color, borderColor: p.color } : {}}
                    onClick={() => setComposePlatform(p.key)}
                  >
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Assist */}
            <div className="form-group">
              <label>✨ AI Assist <span className="text-[9px] text-text-dim font-normal">(describe what you want to post about)</span></label>
              <div className="flex gap-2">
                <input
                  className="flex-1"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Share a tip about React performance optimization"
                />
                <button className="btn btn-sm btn-ghost" onClick={aiAssist} disabled={aiGenerating || !aiPrompt.trim()}>
                  {aiGenerating ? "⏳" : "✨"}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="form-group">
              <label>Content</label>
              <textarea
                value={composeContent}
                onChange={(e) => setComposeContent(e.target.value)}
                placeholder={`Write your ${platform?.label || "social"} post...`}
                style={{ minHeight: 120 }}
              />
              <div className={`text-[10px] mt-1 flex justify-between ${charCount > charLimit ? "text-red" : "text-text-dim"}`}>
                <span>{charCount} / {charLimit} characters</span>
                {charCount > charLimit && <span>Exceeds limit!</span>}
              </div>
            </div>

            {/* Image URL */}
            <div className="form-group">
              <label>Image URL <span className="text-[9px] text-text-dim font-normal">(optional)</span></label>
              <input value={composeImage} onChange={(e) => setComposeImage(e.target.value)} placeholder="https://..." />
            </div>

            {/* Schedule */}
            <div className="form-group">
              <label>Schedule <span className="text-[9px] text-text-dim font-normal">(leave empty for draft)</span></label>
              <input type="datetime-local" value={composeSchedule} onChange={(e) => setComposeSchedule(e.target.value)} />
            </div>

            <div className="form-actions">
              <button className="btn" onClick={() => setShowCompose(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={compose} disabled={composing || !composeContent.trim()}>
                {composing ? "⏳ Saving..." : composeSchedule ? "📅 Schedule" : "💾 Save Draft"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
