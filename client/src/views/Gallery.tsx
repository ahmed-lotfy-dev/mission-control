import { useState, useEffect } from "react";

interface R2File {
  key: string;
  filename: string;
  size: number;
  lastModified: string;
  serveUrl: string;
  modelSlug: string;
}

export default function Gallery() {
  const [selectedModel, setSelectedModel] = useState<string>("all");
  const [lightbox, setLightbox] = useState<R2File | null>(null);

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFiles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/r2/files");
      const json = await resp.json();
      setData(json);
    } catch (e: any) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchFiles(); }, []);

  const refetch = fetchFiles;

  const files: R2File[] = data?.files || [];
  const grouped: Record<string, R2File[]> = data?.grouped || {};
  const r2Enabled = data?.r2Enabled || false;

  const models = Object.keys(grouped);
  const filteredFiles = selectedModel === "all" ? files : (grouped[selectedModel] || []);

  // Sort by filename descending (newest first, since filename contains index)
  filteredFiles.sort((a, b) => b.filename.localeCompare(a.filename));

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const displayName = (modelSlug: string) => {
    if (modelSlug === "magick") return "ImageMagick (Local)";
    if (modelSlug.startsWith("openai")) return "GPT-5 Image Mini (OpenRouter)";
    if (modelSlug.startsWith("gemini")) return "Gemini Image (OpenRouter)";
    if (modelSlug.startsWith("flux")) return "FLUX.1 Schnell (Cloudflare)";
    if (modelSlug.startsWith("stability")) return "SDXL (Cloudflare)";
    if (modelSlug.startsWith("nvidia")) return "Nvidia NIM";
    if (modelSlug.startsWith("imagen")) return "Imagen (Google)";
    return modelSlug;
  };

  if (!r2Enabled) {
    return (
      <div className="card" style={{ padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>☁️</div>
        <h2>R2 Storage Not Configured</h2>
        <p style={{ color: "var(--text-dim)", marginTop: 8, maxWidth: 400, margin: "8px auto" }}>
          Add your Cloudflare R2 credentials to <code>.env</code> to enable image backup and gallery.
        </p>
        <div style={{ textAlign: "left", maxWidth: 500, margin: "16px auto", fontSize: 13, fontFamily: "monospace", background: "var(--bg-deep)", padding: 16, borderRadius: 8 }}>
          <div>R2_ACCOUNT_ID=your_account_id</div>
          <div>R2_ACCESS_KEY_ID=your_access_key</div>
          <div>R2_SECRET_ACCESS_KEY=your_secret_key</div>
          <div>R2_BUCKET_NAME=mission-control-images</div>
        </div>
        <p style={{ color: "var(--text-dim)", fontSize: 12, marginTop: 8 }}>
          After adding env vars, trigger a Dokply rebuild.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>🖼️ Generated Images</h2>
          <p style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 4 }}>
            {files.length} images backed up to Cloudflare R2 · {models.length} model{models.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button className="btn btn-sm" onClick={() => refetch()}>🔄 Refresh</button>
      </div>

      {/* Model filter pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button
          className={`filter-pill${selectedModel === "all" ? " active" : ""}`}
          onClick={() => setSelectedModel("all")}
        >
          All ({files.length})
        </button>
        {models.map((model) => (
          <button
            key={model}
            className={`filter-pill${selectedModel === model ? " active" : ""}`}
            onClick={() => setSelectedModel(model)}
          >
            {displayName(model)} ({grouped[model]?.length || 0})
          </button>
        ))}
      </div>

      {isLoading && <div className="card" style={{ padding: 32, textAlign: "center" }}>Loading...</div>}
      {error && <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--red)" }}>Error: {(error as Error).message}</div>}

      {/* Gallery grid */}
      {filteredFiles.length === 0 && !isLoading ? (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎨</div>
          <h3>No images yet</h3>
          <p style={{ color: "var(--text-dim)", marginTop: 8 }}>
            Generate some images in the Studio tab. They'll automatically be backed up here.
          </p>
        </div>
      ) : (
        <div className="gallery-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {filteredFiles.map((file, i) => (
            <div
              key={i}
              className="card overflow-hidden cursor-pointer"
              style={{ padding: 0, transition: "transform 0.15s, box-shadow 0.15s" }}
              onClick={() => setLightbox(file)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.02)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
            >
              <div style={{ aspectRatio: "1", background: "var(--bg-deep)", overflow: "hidden" }}>
                <img
                  src={`/api/r2/file?key=${encodeURIComponent(file.key)}`}
                  alt={file.filename}
                  className="w-full block"
                  style={{ height: "100%", objectFit: "cover" }}
                  loading="lazy"
                />
              </div>
              <div style={{ padding: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-bright)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {file.filename.replace(/\.\w+$/, "")}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: "var(--text-dim)" }}>{formatSize(file.size)}</span>
                  <span style={{ fontSize: 10, color: "var(--accent)", fontFamily: "monospace" }}>{displayName(file.modelSlug)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setLightbox(null)}
        >
          <div style={{ maxWidth: "90vw", maxHeight: "90vh", position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <img
              src={`/api/r2/file?key=${encodeURIComponent(lightbox.key)}`}
              alt={lightbox.filename}
              style={{ maxWidth: "100%", maxHeight: "85vh", objectFit: "contain", borderRadius: 8 }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, padding: "0 4px" }}>
              <div>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{lightbox.filename.replace(/\.\w+$/, "")}</div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 }}>
                  {displayName(lightbox.modelSlug)} · {formatSize(lightbox.size)}
                </div>
              </div>
              <a
                href={`/api/r2/file?key=${encodeURIComponent(lightbox.key)}&download=1`}
                download={lightbox.filename}
                className="btn btn-primary btn-sm"
                style={{ textDecoration: "none" }}
              >
                ⬇ Download
              </a>
            </div>
            <button
              onClick={() => setLightbox(null)}
              style={{ position: "absolute", top: -40, right: 0, background: "none", border: "none", color: "#fff", fontSize: 28, cursor: "pointer", lineHeight: 1 }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
