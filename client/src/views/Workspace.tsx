import { useEffect, useState, useRef, useCallback } from "react";
import { api, type WorkspaceFile, formatSize, formatDate } from "../lib/api";

type FilterType = "all" | "image" | "video" | "audio" | "document";

const FILTERS: Array<{ key: FilterType; label: string; icon: string }> = [
  { key: "all", label: "All", icon: "📁" },
  { key: "image", label: "Images", icon: "🖼️" },
  { key: "video", label: "Videos", icon: "🎬" },
  { key: "audio", label: "Audio", icon: "🔊" },
  { key: "document", label: "Documents", icon: "📄" },
];

const FILE_ICONS: Record<string, string> = {
  image: "🖼️", video: "🎬", audio: "🔊", document: "📄",
};

export default function Workspace() {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [counts, setCounts] = useState({ total: 0, image: 0, video: 0, audio: 0, document: 0 });
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [workspacePath, setWorkspacePath] = useState("");
  const refreshRef = useRef<ReturnType<typeof setInterval>>(undefined!);

  const load = useCallback(() => {
    api<{ files: WorkspaceFile[]; counts: typeof counts; workspacePath: string }>("/workspace/files")
      .then((data) => {
        setFiles(data.files);
        setCounts(data.counts);
        setWorkspacePath(data.workspacePath);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    refreshRef.current = setInterval(load, 30_000);
    return () => clearInterval(refreshRef.current);
  }, [load]);

  const filteredFiles = filter === "all" ? files : files.filter((f) => f.type === filter);
  const previewFile = previewIndex != null ? filteredFiles[previewIndex] : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Workspace</h1>
          <div className="subtitle">{workspacePath} · {counts.total} files</div>
        </div>
        <div className="flex gap-sm items-center">
          <span className="text-[11px] text-[var(--text-dim)]">auto-refresh 30s</span>
          <button className="btn btn-sm" onClick={load}>Refresh</button>
        </div>
      </div>

      <div className="card filter-bar mb-16">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`filter-pill${filter === f.key ? " active" : ""}`}
            onClick={() => { setFilter(f.key); setPreviewIndex(null); }}
          >
            {f.icon} {f.label}
            <span className={`badge badge-${f.key === "all" ? "medium" : "low"} text-[9px]`}>
              {f.key === "all" ? counts.total : (counts as any)[f.key]}
            </span>
          </button>
        ))}
        <span className="ml-auto text-[11px] text-[var(--text-dim)]">
          {filteredFiles.length} file{filteredFiles.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <div className="loading-state"><div className="loading-spinner" />Loading...</div>
      ) : (
        <div className="workspace-grid">
          {filteredFiles.length > 0
            ? filteredFiles.map((f, i) => {
                const isImage = f.type === "image" && [".png", ".jpg", ".jpeg", ".gif", ".webp"].some((ext) => f.name.toLowerCase().endsWith(ext));
                const isVideo = f.type === "video";
                return (
                  <div key={f.path} className="workspace-item" onClick={() => setPreviewIndex(i)}>
                    <div className={`workspace-thumb type-${f.type}`}>
                      {isImage
                        ? <img src={`/api/workspace/file?path=${encodeURIComponent(f.path)}`} alt={f.name} />
                        : isVideo
                          ? <video src={`/api/workspace/file?path=${encodeURIComponent(f.path)}`} muted preload="metadata" />
                          : <span>{FILE_ICONS[f.type] || "📄"}</span>
                      }
                    </div>
                    <div className="workspace-info">
                      <div className="file-name" title={f.name}>{f.name}</div>
                      <div className="file-meta">
                        <span>{f.sizeFormatted}</span>
                        <span>{formatDate(f.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            : (
              <div className="empty-state">
                <div className="icon">{filter === "all" ? "📁" : FILE_ICONS[filter]}</div>
                <p>No {filter !== "all" ? `${filter} ` : ""}files found</p>
                <p className="hint">Drop files into ~/agent-outputs/{filter === "all" ? "{images,videos,audio,documents}/" : `${filter}/`}</p>
              </div>
            )
          }
        </div>
      )}

      {previewFile && (
        <div className="preview-overlay" onClick={() => setPreviewIndex(null)}>
          <button className="preview-close" onClick={() => setPreviewIndex(null)}>✕</button>

          {previewIndex != null && previewIndex > 0 && (
            <button className="preview-nav prev" onClick={(e) => { e.stopPropagation(); setPreviewIndex(previewIndex - 1); }}>←</button>
          )}
          {previewIndex != null && previewIndex < filteredFiles.length - 1 && (
            <button className="preview-nav next" onClick={(e) => { e.stopPropagation(); setPreviewIndex(previewIndex + 1); }}>→</button>
          )}

          <div className="preview-footer">
            {previewFile.name} · {previewFile.sizeFormatted} · {(previewIndex ?? 0) + 1}/{filteredFiles.length}
          </div>

          <div className="preview-content" onClick={(e) => e.stopPropagation()}>
            {previewFile.type === "image" ? (
              <img src={`/api/workspace/file?path=${encodeURIComponent(previewFile.path)}`} alt={previewFile.name} />
            ) : previewFile.type === "video" ? (
              <video src={`/api/workspace/file?path=${encodeURIComponent(previewFile.path)}`} controls autoPlay />
            ) : previewFile.type === "audio" ? (
              <div className="card p-10 min-w-[400px] text-center">
                <div className="text-5xl mb-4">🔊</div>
                <div className="font-semibold text-base mb-2 text-[var(--text-bright)]">{previewFile.name}</div>
                <div className="text-xs mb-5 text-[var(--text-dim)]">{previewFile.sizeFormatted}</div>
                <audio src={`/api/workspace/file?path=${encodeURIComponent(previewFile.path)}`} controls autoPlay className="w-full" />
              </div>
            ) : (
              <div className="card p-10 min-w-[400px] max-w-[500px] text-center">
                <div className="text-5xl mb-4">📄</div>
                <div className="font-semibold text-base mb-2 text-[var(--text-bright)]">{previewFile.name}</div>
                <div className="text-sm text-[var(--text-dim)]">{previewFile.sizeFormatted} · {previewFile.mime}</div>
                <div className="text-xs mt-2 text-[var(--text-dim)]">
                  Created: {new Date(previewFile.createdAt).toLocaleString()}
                </div>
                <a
                  href={`/api/workspace/file?path=${encodeURIComponent(previewFile.path)}`}
                  download={previewFile.name}
                  className="btn btn-primary mt-4 no-underline inline-flex"
                >
                  ⬇ Download
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}