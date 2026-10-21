/**
 * Social Hub — Full social media management
 * Accounts, Composer, Calendar, Analytics, Automations
 * Inspired by NumoAI's social features
 */

import { useEffect, useState, useRef } from "react";
import gsap from "gsap";
import { api } from "../lib/api";

type SocialTab = "accounts" | "compose" | "calendar" | "analytics" | "automations";

const TABS: Array<{ key: SocialTab; label: string; icon: string }> = [
  { key: "accounts", label: "Accounts", icon: "🔗" },
  { key: "compose", label: "Compose", icon: "✍️" },
  { key: "calendar", label: "Calendar", icon: "📅" },
  { key: "analytics", label: "Analytics", icon: "📊" },
  { key: "automations", label: "Automations", icon: "🤖" },
];

const PLATFORM_COLORS: Record<string, string> = {
  facebook: "#1877F2",
  instagram: "#E4405F",
  twitter: "#000000",
  tiktok: "#000000",
  threads: "#000000",
  snapchat: "#FFFC00",
};

const PLATFORM_ICONS: Record<string, string> = {
  facebook: "📘",
  instagram: "📸",
  twitter: "🐦",
  tiktok: "🎵",
  threads: "🧵",
  snapchat: "👻",
};

interface SocialAccount {
  id: number;
  platform: string;
  display_name: string;
  username: string;
  avatar_url: string;
  status: string;
  followers: number;
  following: number;
  media_count: number;
  last_synced_at: string;
}

interface SocialPost {
  id: number;
  account_id: number;
  platform: string;
  content_type: string;
  title: string;
  caption: string;
  hashtags: string[];
  media_urls: string[];
  status: string;
  scheduled_at: string;
  engagement: Record<string, number>;
  created_at: string;
}

interface AutomationRule {
  id: number;
  account_id: number;
  name: string;
  platform: string;
  trigger_type: string;
  status: string;
  priority: number;
}

export default function SocialHub() {
  const [tab, setTab] = useState<SocialTab>("accounts");
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const gridRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const [accData, postData, autoData, overviewData] = await Promise.all([
        api("/social/accounts"),
        api("/social/posts?limit=50"),
        api("/social/automations"),
        api("/social/overview"),
      ]);
      setAccounts(accData || []);
      setPosts(postData || []);
      setAutomations(autoData || []);
      setOverview(overviewData);
    } catch (e) {
      console.error("[SocialHub] Load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (gridRef.current && !loading) {
      gsap.fromTo(
        gridRef.current.querySelectorAll(".social-card"),
        { opacity: 0, y: 20, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.06, ease: "back.out(1.4)" }
      );
    }
  }, [tab, loading]);

  if (loading) return (
    <div className="loading-state">
      <div className="loading-spinner" />
      <span>Loading social hub...</span>
    </div>
  );

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Social Hub</h1>
          <div className="subtitle">
            {overview ? `${overview.accounts} accounts · ${overview.scheduled || 0} scheduled · ${overview.queueSize || 0} in queue` : "Manage all your social media"}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="filter-bar mb-24">
        {TABS.map((t) => (
          <button key={t.key} className={`filter-pill${tab === t.key ? " active" : ""}`} onClick={() => setTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ═══ ACCOUNTS TAB ═══ */}
      {tab === "accounts" && (
        <div ref={gridRef}>
          {accounts.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🔗</div>
              <p>No social accounts connected</p>
              <div className="hint">Connect your social media accounts to start publishing and tracking</div>
              <button className="btn btn-primary mt-16" onClick={() => setTab("accounts")}>
                + Connect Account
              </button>
            </div>
          ) : (
            <div className="grid-3 stagger">
              {accounts.map((acc) => (
                <div key={acc.id} className="card card-hover social-card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                      style={{ background: `${PLATFORM_COLORS[acc.platform] || "#333"}20` }}>
                      {PLATFORM_ICONS[acc.platform] || "📱"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{acc.display_name || acc.platform}</div>
                      <div className="text-xs text-text-dim">@{acc.username || acc.platform}</div>
                    </div>
                    <span className={`status-dot ${acc.status === "active" ? "online" : "offline"}`} />
                  </div>
                  <div className="grid-3 gap-2 text-center">
                    <div>
                      <div className="font-bold text-sm">{acc.followers.toLocaleString()}</div>
                      <div className="text-[10px] text-text-dim uppercase">Followers</div>
                    </div>
                    <div>
                      <div className="font-bold text-sm">{acc.following.toLocaleString()}</div>
                      <div className="text-[10px] text-text-dim uppercase">Following</div>
                    </div>
                    <div>
                      <div className="font-bold text-sm">{acc.media_count.toLocaleString()}</div>
                      <div className="text-[10px] text-text-dim uppercase">Posts</div>
                    </div>
                  </div>
                  {acc.last_synced_at && (
                    <div className="text-[10px] text-text-dim mt-2 text-center">
                      Synced {new Date(acc.last_synced_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ COMPOSE TAB ═══ */}
      {tab === "compose" && (
        <ComposeView accounts={accounts} onPostCreated={load} />
      )}

      {/* ═══ CALENDAR TAB ═══ */}
      {tab === "calendar" && (
        <CalendarView posts={posts} accounts={accounts} />
      )}

      {/* ═══ ANALYTICS TAB ═══ */}
      {tab === "analytics" && (
        <AnalyticsView posts={posts} accounts={accounts} />
      )}

      {/* ═══ AUTOMATIONS TAB ═══ */}
      {tab === "automations" && (
        <AutomationsView automations={automations} accounts={accounts} onUpdate={load} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COMPOSE — Create and schedule posts
// ═══════════════════════════════════════════════════════════

function ComposeView({ accounts, onPostCreated }: { accounts: SocialAccount[]; onPostCreated: () => void }) {
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [publishMode, setPublishMode] = useState<"direct" | "schedule" | "draft">("draft");
  const [saving, setSaving] = useState(false);

  const toggleAccount = (id: number) => {
    setSelectedAccounts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!caption.trim() || selectedAccounts.length === 0) return;
    setSaving(true);
    try {
      for (const accountId of selectedAccounts) {
        const account = accounts.find((a) => a.id === accountId);
        await api("/social/posts", {
          method: "POST",
          body: JSON.stringify({
            account_id: accountId,
            platform: account?.platform || "twitter",
            caption,
            hashtags: hashtags.split(",").map((h) => h.trim()).filter(Boolean),
            publish_mode: publishMode === "schedule" ? "schedule" : "direct",
            scheduled_at: publishMode === "schedule" && scheduledAt ? new Date(scheduledAt).toISOString() : "",
            status: publishMode === "schedule" ? "scheduled" : publishMode === "draft" ? "draft" : "published",
          }),
        });
      }
      setCaption("");
      setHashtags("");
      setSelectedAccounts([]);
      onPostCreated();
    } catch (e) {
      console.error("[Compose] Error:", e);
    } finally {
      setSaving(false);
    }
  };

  const charCount = caption.length;
  const maxChars = 280;

  return (
    <div className="grid-2">
      {/* Composer */}
      <div className="card">
        <h3>Compose Post</h3>

        {/* Account selector */}
        <div className="form-group">
          <label>Post to</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                className={`btn btn-sm ${selectedAccounts.includes(acc.id) ? "btn-primary" : "btn-ghost"}`}
                onClick={() => toggleAccount(acc.id)}
              >
                {PLATFORM_ICONS[acc.platform]} {acc.display_name || acc.platform}
              </button>
            ))}
            {accounts.length === 0 && (
              <div className="text-sm text-text-dim">No accounts connected. Go to Accounts tab first.</div>
            )}
          </div>
        </div>

        {/* Caption */}
        <div className="form-group">
          <label>Caption</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What's on your mind?"
            style={{ minHeight: 120 }}
          />
          <div className="text-[10px] text-text-dim text-right mt-1">
            {charCount}/{maxChars} {charCount > maxChars && <span className="text-red">(over limit)</span>}
          </div>
        </div>

        {/* Hashtags */}
        <div className="form-group">
          <label>Hashtags (comma-separated)</label>
          <input
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="marketing, social, growth"
          />
        </div>

        {/* Publish mode */}
        <div className="form-group">
          <label>Publish mode</label>
          <div className="flex gap-2">
            {(["draft", "schedule", "direct"] as const).map((mode) => (
              <button
                key={mode}
                className={`btn btn-sm ${publishMode === mode ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setPublishMode(mode)}
              >
                {mode === "draft" ? "📝 Draft" : mode === "schedule" ? "⏰ Schedule" : "🚀 Publish Now"}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule picker */}
        {publishMode === "schedule" && (
          <div className="form-group">
            <label>Schedule for</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
        )}

        <div className="form-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !caption.trim() || selectedAccounts.length === 0}>
            {saving ? "⏳ Saving..." : publishMode === "draft" ? "💾 Save Draft" : publishMode === "schedule" ? "📅 Schedule" : "🚀 Publish"}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="card">
        <h3>Preview</h3>
        {selectedAccounts.length === 0 ? (
          <div className="empty-state py-8">
            <div className="icon">👁️</div>
            <p className="text-xs">Select accounts to preview</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {selectedAccounts.map((id) => {
              const acc = accounts.find((a) => a.id === id);
              if (!acc) return null;
              return (
                <div key={id} className="card-raise">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{PLATFORM_ICONS[acc.platform]}</span>
                    <span className="font-semibold text-sm">{acc.display_name}</span>
                    <span className="text-xs text-text-dim">@{acc.username}</span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{caption || "Your post content..."}</div>
                  {hashtags && (
                    <div className="text-xs text-accent mt-2">
                      {hashtags.split(",").map((h) => h.trim()).filter(Boolean).map((h, i) => (
                        <span key={i}>#{h} </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CALENDAR — Scheduled posts view
// ═══════════════════════════════════════════════════════════

function CalendarView({ posts, accounts }: { posts: SocialPost[]; accounts: SocialAccount[] }) {
  const scheduled = posts.filter((p) => p.status === "scheduled" || p.status === "draft");
  const published = posts.filter((p) => p.status === "published");

  return (
    <div className="grid-2">
      <div className="card">
        <h3>Scheduled ({scheduled.length})</h3>
        {scheduled.length === 0 ? (
          <div className="empty-state py-8">
            <div className="icon">📅</div>
            <p className="text-xs">No scheduled posts</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-3">
            {scheduled.map((post) => {
              const acc = accounts.find((a) => a.id === post.account_id);
              return (
                <div key={post.id} className="card-raise flex items-start gap-3">
                  <span className="text-lg">{PLATFORM_ICONS[post.platform] || "📱"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{acc?.display_name || post.platform}</div>
                    <div className="text-xs text-text-dim truncate">{post.caption}</div>
                    {post.scheduled_at && (
                      <div className="text-[10px] text-accent mt-1">
                        ⏰ {new Date(post.scheduled_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <span className={`badge badge-${post.status === "scheduled" ? "medium" : "low"}`}>
                    {post.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Published ({published.length})</h3>
        {published.length === 0 ? (
          <div className="empty-state py-8">
            <div className="icon">📤</div>
            <p className="text-xs">No published posts yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-3">
            {published.map((post) => {
              const acc = accounts.find((a) => a.id === post.account_id);
              const engagement = post.engagement || {};
              return (
                <div key={post.id} className="card-raise flex items-start gap-3">
                  <span className="text-lg">{PLATFORM_ICONS[post.platform] || "📱"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{acc?.display_name || post.platform}</div>
                    <div className="text-xs text-text-dim truncate">{post.caption}</div>
                    <div className="flex gap-3 mt-1 text-[10px] text-text-dim">
                      {engagement.likes && <span>❤️ {engagement.likes}</span>}
                      {engagement.comments && <span>💬 {engagement.comments}</span>}
                      {engagement.shares && <span>🔄 {engagement.shares}</span>}
                      {engagement.views && <span>👁️ {engagement.views}</span>}
                    </div>
                  </div>
                  <span className="badge badge-low">published</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ANALYTICS — Engagement tracking
// ═══════════════════════════════════════════════════════════

function AnalyticsView({ posts, accounts }: { posts: SocialPost[]; accounts: SocialAccount[] }) {
  const platformStats = accounts.map((acc) => {
    const accPosts = posts.filter((p) => p.account_id === acc.id);
    const totalEngagement = accPosts.reduce((sum, p) => {
      const e = p.engagement || {};
      return sum + (e.likes || 0) + (e.comments || 0) + (e.shares || 0) + (e.saves || 0);
    }, 0);
    return { ...acc, postCount: accPosts.length, totalEngagement };
  });

  return (
    <div>
      {/* Platform stats */}
      <div className="grid-3 mb-24 stagger">
        {platformStats.map((stat) => (
          <div key={stat.id} className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{PLATFORM_ICONS[stat.platform]}</span>
              <span className="font-semibold text-sm">{stat.display_name || stat.platform}</span>
            </div>
            <div className="stat-value">{stat.postCount}</div>
            <div className="stat-label">Posts</div>
            <div className="text-xs text-accent mt-1">
              {stat.totalEngagement.toLocaleString()} total engagements
            </div>
          </div>
        ))}
        {platformStats.length === 0 && (
          <div className="empty-state col-span-3">
            <div className="icon">📊</div>
            <p>Connect accounts and publish posts to see analytics</p>
          </div>
        )}
      </div>

      {/* Recent posts performance */}
      <div className="card">
        <h3>Recent Posts Performance</h3>
        {posts.length === 0 ? (
          <div className="empty-state py-8">
            <div className="icon">📈</div>
            <p className="text-xs">No posts to analyze yet</p>
          </div>
        ) : (
          <div className="table-wrap mt-3">
            <table>
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Caption</th>
                  <th>Status</th>
                  <th>Engagement</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {posts.slice(0, 20).map((post) => {
                  const engagement = post.engagement || {};
                  const total = (engagement.likes || 0) + (engagement.comments || 0) + (engagement.shares || 0);
                  return (
                    <tr key={post.id}>
                      <td>{PLATFORM_ICONS[post.platform]} {post.platform}</td>
                      <td className="max-w-[200px] truncate">{post.caption || "—"}</td>
                      <td><span className={`badge badge-${post.status === "published" ? "low" : post.status === "scheduled" ? "medium" : "urgent"}`}>{post.status}</span></td>
                      <td className="text-xs">{total.toLocaleString()}</td>
                      <td className="text-xs text-text-dim">{new Date(post.created_at).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// AUTOMATIONS — Auto-reply rules
// ═══════════════════════════════════════════════════════════

function AutomationsView({ automations, accounts, onUpdate }: { automations: AutomationRule[]; accounts: SocialAccount[]; onUpdate: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPlatform, setFormPlatform] = useState("twitter");
  const [formTrigger, setFormTrigger] = useState("mention");
  const [formAccountId, setFormAccountId] = useState(0);

  const createRule = async () => {
    if (!formName.trim() || !formAccountId) return;
    await api("/social/automations", {
      method: "POST",
      body: JSON.stringify({
        account_id: formAccountId,
        name: formName,
        platform: formPlatform,
        trigger_type: formTrigger,
      }),
    });
    setFormName("");
    setShowForm(false);
    onUpdate();
  };

  const toggleRule = async (id: number) => {
    await api(`/social/automations/${id}/toggle`, { method: "PATCH" });
    onUpdate();
  };

  const deleteRule = async (id: number) => {
    await api(`/social/automations/${id}`, { method: "DELETE" });
    onUpdate();
  };

  return (
    <div>
      <div className="flex-between mb-16">
        <h3 className="text-sm font-semibold">Automation Rules ({automations.length})</h3>
        <button className="btn btn-sm btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ New Rule"}
        </button>
      </div>

      {showForm && (
        <div className="card mb-16 page-enter-fast">
          <h3>Create Automation Rule</h3>
          <div className="grid-2 gap-3 mt-3">
            <div className="form-group">
              <label>Rule Name</label>
              <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Auto-reply to mentions" />
            </div>
            <div className="form-group">
              <label>Account</label>
              <select value={formAccountId} onChange={(e) => setFormAccountId(Number(e.target.value))}>
                <option value={0}>Select account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{PLATFORM_ICONS[acc.platform]} {acc.display_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Platform</label>
              <select value={formPlatform} onChange={(e) => setFormPlatform(e.target.value)}>
                {Object.keys(PLATFORM_ICONS).map((p) => (
                  <option key={p} value={p}>{PLATFORM_ICONS[p]} {p}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Trigger</label>
              <select value={formTrigger} onChange={(e) => setFormTrigger(e.target.value)}>
                <option value="mention">Mention</option>
                <option value="keyword">Keyword</option>
                <option value="dm">Direct Message</option>
                <option value="comment">Comment</option>
                <option value="follow">New Follower</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={createRule}>Create Rule</button>
          </div>
        </div>
      )}

      {automations.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🤖</div>
          <p>No automation rules</p>
          <div className="hint">Create rules to auto-reply to mentions, DMs, and more</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {automations.map((rule) => {
            const acc = accounts.find((a) => a.id === rule.account_id);
            return (
              <div key={rule.id} className="card-raise flex items-center gap-3">
                <span className="text-lg">{PLATFORM_ICONS[rule.platform] || "📱"}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{rule.name}</div>
                  <div className="text-xs text-text-dim">
                    {acc?.display_name || rule.platform} · Trigger: {rule.trigger_type}
                  </div>
                </div>
                <span className={`badge badge-${rule.status === "active" ? "low" : "medium"}`}>
                  {rule.status}
                </span>
                <button className="btn btn-sm btn-ghost" onClick={() => toggleRule(rule.id)}>
                  {rule.status === "active" ? "⏸ Pause" : "▶ Resume"}
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => deleteRule(rule.id)}>✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
