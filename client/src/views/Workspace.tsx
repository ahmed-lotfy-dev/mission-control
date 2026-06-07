import { useEffect, useState, useRef, useCallback } from "react";
import {
  RefreshCw,
  Folder,
  Image as ImageIcon,
  Video as VideoIcon,
  Volume2,
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  List,
  Grid3x3,
} from "lucide-react";
import { api, type WorkspaceFile, formatDate } from "../lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { cn } from "@/lib/utils";

type FilterType = "all" | "image" | "video" | "audio" | "document";

const FILTERS: Array<{
  key: FilterType;
  label: string;
  icon: React.ReactNode;
}> = [
  { key: "all", label: "All", icon: <Folder className="h-3.5 w-3.5" /> },
  { key: "image", label: "Images", icon: <ImageIcon className="h-3.5 w-3.5" /> },
  { key: "video", label: "Videos", icon: <VideoIcon className="h-3.5 w-3.5" /> },
  { key: "audio", label: "Audio", icon: <Volume2 className="h-3.5 w-3.5" /> },
  { key: "document", label: "Documents", icon: <FileText className="h-3.5 w-3.5" /> },
];

const FILTER_BADGE: Record<FilterType, "secondary" | "default" | "outline"> = {
  all: "secondary",
  image: "default",
  video: "default",
  audio: "default",
  document: "outline",
};

const EMPTY_ICONS: Record<FilterType, string> = {
  all: "📁",
  image: "🖼️",
  video: "🎬",
  audio: "🔊",
  document: "📄",
};

export default function Workspace() {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    image: 0,
    video: 0,
    audio: 0,
    document: 0,
  });
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [workspacePath, setWorkspacePath] = useState("");
  const refreshRef = useRef<ReturnType<typeof setInterval>>(undefined!);

  const load = useCallback(() => {
    api<{
      files: WorkspaceFile[];
      counts: typeof counts;
      workspacePath: string;
    }>("/workspace/files")
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

  const filteredFiles =
    filter === "all" ? files : files.filter((f) => f.type === filter);
  const previewFile =
    previewIndex != null ? filteredFiles[previewIndex] : null;

  return (
    <div className="main-content-inner page-enter">
      <PageHeader
        title="Workspace"
        subtitle={`${workspacePath} · ${counts.total} files`}
        action={
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-dim hidden sm:inline">
              auto-refresh 30s
            </span>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        }
      />

      {/* Filter bar */}
      <Card className="mb-4">
        <CardContent className="p-2 flex items-center gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setFilter(f.key);
                setPreviewIndex(null);
              }}
              className="flex-shrink-0"
            >
              {f.icon}
              {f.label}
              <Badge
                variant={FILTER_BADGE[f.key]}
                className="ml-1.5 text-[9px] px-1.5 py-0 h-4"
              >
                {f.key === "all" ? counts.total : (counts as any)[f.key]}
              </Badge>
            </Button>
          ))}
          <span className="ml-auto text-[11px] text-text-dim whitespace-nowrap">
            {filteredFiles.length} file{filteredFiles.length !== 1 ? "s" : ""}
          </span>
        </CardContent>
      </Card>

      {loading ? (
        <LoadingState text="Loading workspace..." />
      ) : (
        <div
          className="grid gap-3 stagger"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          }}
        >
          {filteredFiles.length > 0
            ? filteredFiles.map((f, i) => {
                const isImage =
                  f.type === "image" &&
                  [".png", ".jpg", ".jpeg", ".gif", ".webp"].some((ext) =>
                    f.name.toLowerCase().endsWith(ext)
                  );
                const isVideo = f.type === "video";
                return (
                  <Card
                    key={f.path}
                    className={cn(
                      "overflow-hidden cursor-pointer p-0 card-hoverable",
                      "transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/20"
                    )}
                    style={{ animationDelay: `${i * 0.04}s` }}
                    onClick={() => setPreviewIndex(i)}
                  >
                    <div
                      className={cn(
                        "w-full aspect-square bg-bg-deep flex items-center justify-center text-3xl overflow-hidden",
                        `workspace-thumb type-${f.type}`
                      )}
                    >
                      {isImage ? (
                        <img
                          src={`/api/workspace/file?path=${encodeURIComponent(f.path)}`}
                          alt={f.name}
                          className="w-full h-full object-cover"
                        />
                      ) : isVideo ? (
                        <video
                          src={`/api/workspace/file?path=${encodeURIComponent(f.path)}`}
                          muted
                          preload="metadata"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{f.type === "audio" ? "🔊" : f.type === "document" ? "📄" : "📁"}</span>
                      )}
                    </div>
                    <div className="p-3">
                      <div
                        className="text-[12px] font-semibold text-text-bright truncate"
                        title={f.name}
                      >
                        {f.name}
                      </div>
                      <div className="text-[10px] text-text-dim flex justify-between mt-1">
                        <span>{f.sizeFormatted}</span>
                        <span>{formatDate(f.createdAt)}</span>
                      </div>
                    </div>
                  </Card>
                );
              })
            : (
              <div className="col-span-full">
                <Card>
                  <CardContent className="p-0">
                    <EmptyState
                      icon={EMPTY_ICONS[filter]}
                      title={`No ${filter !== "all" ? `${filter} ` : ""}files found`}
                      description={`Drop files into ~/agent-outputs/${
                        filter === "all"
                          ? "{images,videos,audio,documents}/"
                          : `${filter}/`
                      }`}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={previewFile !== null}
        onOpenChange={(o) => !o && setPreviewIndex(null)}
      >
        <DialogContent
          className="sm:max-w-[90vw] max-w-[1100px] bg-black/90 border-border p-0 gap-0"
        >
          <DialogTitle className="sr-only">
            {previewFile?.name || "File preview"}
          </DialogTitle>
          {previewFile && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setPreviewIndex(null)}
              >
                <X className="h-5 w-5" />
              </Button>

              {previewIndex != null && previewIndex > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white/60 hover:text-white hover:bg-white/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewIndex(previewIndex - 1);
                  }}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              )}
              {previewIndex != null &&
                previewIndex < filteredFiles.length - 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white/60 hover:text-white hover:bg-white/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewIndex(previewIndex + 1);
                    }}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                )}

              <div className="flex flex-col items-center justify-center p-6 min-h-[60vh]">
                {previewFile.type === "image" ? (
                  <img
                    src={`/api/workspace/file?path=${encodeURIComponent(previewFile.path)}`}
                    alt={previewFile.name}
                    className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                  />
                ) : previewFile.type === "video" ? (
                  <video
                    src={`/api/workspace/file?path=${encodeURIComponent(previewFile.path)}`}
                    controls
                    autoPlay
                    className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
                  />
                ) : previewFile.type === "audio" ? (
                  <Card className="p-8 min-w-[400px] max-w-[500px] text-center">
                    <div className="text-5xl mb-4">🔊</div>
                    <div className="font-semibold text-base mb-2 text-text-bright">
                      {previewFile.name}
                    </div>
                    <div className="text-xs mb-5 text-text-dim">
                      {previewFile.sizeFormatted}
                    </div>
                    <audio
                      src={`/api/workspace/file?path=${encodeURIComponent(previewFile.path)}`}
                      controls
                      autoPlay
                      className="w-full"
                    />
                  </Card>
                ) : (
                  <Card className="p-8 min-w-[400px] max-w-[500px] text-center">
                    <div className="text-5xl mb-4">📄</div>
                    <div className="font-semibold text-base mb-2 text-text-bright">
                      {previewFile.name}
                    </div>
                    <div className="text-sm text-text-dim">
                      {previewFile.sizeFormatted} · {previewFile.mime}
                    </div>
                    <div className="text-xs mt-2 text-text-dim">
                      Created: {new Date(previewFile.createdAt).toLocaleString()}
                    </div>
                    <Button className="mt-4" asChild>
                      <a
                        href={`/api/workspace/file?path=${encodeURIComponent(previewFile.path)}`}
                        download={previewFile.name}
                      >
                        <Download className="h-4 w-4 mr-1" /> Download
                      </a>
                    </Button>
                  </Card>
                )}
              </div>

              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/70 text-[12px] bg-black/60 px-4 py-1.5 rounded-full">
                {previewFile.name} · {previewFile.sizeFormatted} ·{" "}
                {(previewIndex ?? 0) + 1}/{filteredFiles.length}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
