import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import { Button } from "./button";
import { Trash2, AlertTriangle } from "lucide-react";

interface DeleteConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  trigger: React.ReactNode;
  onConfirm: () => void;
  onOpenChange?: (open: boolean) => void;
}

export function DeleteConfirmDialog({
  title,
  description,
  confirmLabel = "Delete",
  loading = false,
  trigger,
  onConfirm,
  onOpenChange,
}: DeleteConfirmDialogProps) {
  const [open, setOpen] = useState(false);

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    onOpenChange?.(v);
  };

  const handleConfirm = () => {
    onConfirm();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px] bg-bg-raise border-border">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
              <AlertTriangle className="w-5 h-5" style={{ color: "var(--red)" }} />
            </div>
            <DialogTitle className="text-lg text-text-bright">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-text-dim leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deleting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5" />
                {confirmLabel}
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
