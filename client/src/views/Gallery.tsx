import { useState, useEffect } from "react";

interface GalleryAsset {
  id: number;
  title: string;
  prompt: string;
  file_path: string;
  status: string;
  metadata: string;
  created_at: string;
}

export default function Gallery() {
  const [selectedModel, setSelectedModel] = useState<string>("all");
  const [lightbox, setLightbox] = useState<GalleryAsset | null>(null);

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFiles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/studio/history?type=image&limit=200");
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

  const assets: GalleryAsset[] = data || [];
  const files = assets;

  // Extract model from metadata for grouping
  const getModelSlug = (asset: GalleryAsset): string => {
    try {
      const meta = JSON.parse(asset.metadata || "{}");
      return (meta.method || meta.model || "unknown").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    } catch {
      return "unknown";
    }
  };

  // Group by model
  const grouped: Record<string, GalleryAsset[]> = {};
  for (const a of assets) {
    const model = getModelSlug(a);
    if (!grouped[model]) grouped[model] = [];
    grouped[model].push(a);
  }
  const models = Object.keys(grouped);

  const filteredFiles = selectedModel === "all" ? assets : (grouped[selectedModel] || []);

  // Sort by id descending (newest first)
  filteredFiles.sort((a, b) => b.id - a.id);

  const formatSize = () => "";

  const displayName = (modelSlug: string) => {
    if (modelSlug.includes("magick")) return "ImageMagick (Local)";
    if (modelSlug.includes("openai") || modelSlug.includes("gpt")) return "GPT-5 Image Mini (OpenRouter)";
    if (modelSlug.includes("gemini")) return "Gemini Image (OpenRouter)";
    if (modelSlug.includes("flux")) return "FLUX.1 Schnell (Cloudflare)";
    if (modelSlug.includes("stability") || modelSlug.includes("sdxl")) return "SDXL (Cloudflare)";
    if (modelSlug.includes("nvidia")) return "Nvidia NIM";
    if (modelSlug.includes("imagen")) return "Imagen (Google)";
    if (modelSlug.includes("cloudflare")) return "Cloudflare";
    if (modelSlug.includes("openrouter")) return "OpenRouter";
    return modelSlug;
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>🖼️ Generated Images</h2>
          <p style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 4 }}>
            {assets.length} images · {models.length} model{models.length !== 1 ? "s" : ""}
            <span style={{ marginLeft: 12, opacity: 0.6 }}>Images stored in DB for persistence</span>
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
          All ({assets.length})
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
            Generate some images in the Studio tab. They'll automatically be saved here.
          </p>
        </div>
      ) : (
        <div className="gallery-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {filteredFiles.map((asset) => (
            <div
              key={asset.id}
              className="card overflow-hidden cursor-pointer"
              style={{ padding: 0, transition: "transform 0.15s, box-shadow 0.15s" }}
              onClick={() => setLightbox(asset)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.02)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
            >
              <div style={{ aspectRatio: "1", background: "var(--bg-deep)", overflow: "hidden" }}>
                <img
                  src={`/api/content/asset/${asset.id}/image`}
                  alt={asset.title}
                  className="w-full block"
                  style={{ height: "100%", objectFit: "cover" }}
                  loading="lazy"
                />
              </div>
              <div style={{ padding: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-bright)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {asset.title.slice(0, 40)}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
                    {new Date(asset.created_at).toLocaleDateString()}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--accent)", fontFamily: "monospace" }}>
                    {displayName(getModelSlug(asset))}
                  </span>
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
              src={`/api/content/asset/${lightbox.id}/image`}
              alt={lightbox.title}
              style={{ maxWidth: "100%", maxHeight: "85vh", objectFit: "contain", borderRadius: 8 }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, padding: "0 4px" }}>
              <div>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{lightbox.title.slice(0, 60)}</div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 }}>
                  {displayName(getModelSlug(lightbox))} · {new Date(lightbox.created_at).toLocaleString()}
                </div>
              </div>
              <a
                href={`/api/content/asset/${lightbox.id}/image?download=1`}
                download
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
