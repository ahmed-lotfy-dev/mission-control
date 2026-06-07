import { useEffect, useState } from "react";
import { api, type ScheduledTask, timeAgo } from "../lib/api";
import {
  Plus,
  Edit,
  Trash2,
  Play,
  Calendar as CalIcon,
  Clock,
  Check,
  Code,
  FileCode,
  Globe,
} from "lucide-react";

import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/PageHeader"
import { EmptyState } from "@/components/EmptyState"
import { LoadingState } from "@/components/LoadingState"
import { StatCard } from "@/components/StatCard"
import { cn } from "@/lib/utils"

type TaskType = "command" | "script" | "webhook"

const TYPE_ICONS: Record<TaskType, React.ReactNode> = {
  command: <Code className="h-3.5 w-3.5" />,
  script: <FileCode className="h-3.5 w-3.5" />,
  webhook: <Globe className="h-3.5 w-3.5" />,
}

interface ScheduleForm {
  name: string
  description: string
  schedule: string
  type: TaskType | string
  payload: string
}

export default function Scheduled() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ScheduleForm>({
    name: "", description: "", schedule: "", type: "command", payload: "",
  });

  const load = () => {
    setLoading(true);
    api<ScheduledTask[]>("/scheduled").then(setTasks).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => {
    setEditId(null);
    setForm({ name: "", description: "", schedule: "", type: "command", payload: "" });
    setShowModal(true);
  };

  const openEdit = (t: ScheduledTask) => {
    setEditId(t.id);
    setForm({
      name: t.name,
      description: t.description,
      schedule: t.schedule,
      type: t.type,
      payload: t.payload,
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.schedule.trim()) return;
    const body = JSON.stringify(form);
    if (editId) {
      await api(`/scheduled/${editId}`, { method: "PATCH", body });
    } else {
      await api("/scheduled", { method: "POST", body });
    }
    setShowModal(false);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this scheduled task?")) return;
    await api(`/scheduled/${id}`, { method: "DELETE" });
    load();
  };

  const toggle = async (id: number, enabled: boolean) => {
    await api(`/scheduled/${id}`, { method: "PATCH", body: JSON.stringify({ enabled }) });
    load();
  };

  const run = async (id: number) => {
    await api(`/scheduled/${id}/run`, { method: "POST" });
    load();
  };

  if (loading) return <LoadingState text="Loading scheduled tasks..." />;

  const active = tasks.filter((t) => t.enabled).length;
  const successCount = tasks.filter((t) => t.last_status === "success").length;

  return (
    <div className="main-content-inner page-enter">
      <PageHeader
        title="Scheduled Tasks"
        subtitle={`${active}/${tasks.length} active`}
        action={{
          label: "New Schedule",
          icon: <Plus className="h-4 w-4" />,
          onClick: openNew,
        }}
      />

      {/* Stats */}
      {tasks.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6 stagger">
          <StatCard value={tasks.length} label="Total Tasks" icon={<CalIcon className="h-5 w-5" />} />
          <StatCard value={active} label="Active" accent icon={<Clock className="h-5 w-5" />} />
          <StatCard
            value={successCount}
            label="Successful Runs"
            sublabel={tasks.length > 0 ? `${Math.round((successCount / tasks.length) * 100)}% success rate` : undefined}
            icon={<Check className="h-5 w-5" />}
          />
        </div>
      )}

      {tasks.length === 0 ? (
        <EmptyState
          icon="⏰"
          title="No scheduled tasks"
          description="Create a scheduled task to run commands, scripts, or webhooks on a cron schedule"
          action={{ label: "Create your first schedule", onClick: openNew }}
        />
      ) : (
        <div className="stagger">
          {tasks.map((t) => (
            <Card
              key={t.id}
              className="card-hoverable"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                      t.enabled
                        ? "bg-accent-surface text-accent"
                        : "bg-bg-raise text-text-dim"
                    )}
                  >
                    {TYPE_ICONS[t.type as TaskType] || <Code className="h-4 w-4" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-[14px] text-text-bright">
                        {t.name}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {t.type}
                      </Badge>
                      <Badge
                        variant={t.enabled ? "default" : "secondary"}
                        className={cn(
                          "text-[10px] font-semibold",
                          t.enabled
                            ? "bg-green/15 text-green border-green/30"
                            : "opacity-60"
                        )}
                      >
                        {t.enabled ? "Active" : "Paused"}
                      </Badge>
                      {t.last_status && (
                        <Badge
                          variant={t.last_status === "success" ? "default" : "destructive"}
                          className={cn(
                            "text-[9px] font-semibold",
                            t.last_status === "success"
                              ? "bg-green/15 text-green border-green/30"
                              : ""
                          )}
                        >
                          {t.last_status}
                        </Badge>
                      )}
                    </div>
                    {t.description && (
                      <div className="text-[12px] text-text-dim mb-2">{t.description}</div>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-dim">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        <code className="text-[11px] px-1.5 py-0.5 rounded bg-bg-deep text-accent">
                          {t.schedule}
                        </code>
                      </div>
                      {t.last_run && (
                        <span className="flex items-center gap-1">
                          <Check className="h-3 w-3" /> last run {timeAgo(t.last_run)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => run(t.id)}
                        title="Run now"
                      >
                        <Play className="h-3 w-3" /> Run
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => openEdit(t)}
                        title="Edit"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] text-destructive hover:text-destructive"
                        onClick={() => remove(t.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-[10px]">
                      <input
                        type="checkbox"
                        checked={!!t.enabled}
                        onChange={(e) => toggle(t.id, e.target.checked)}
                        className="accent-accent w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className={cn(
                        "font-medium",
                        t.enabled ? "text-green" : "text-text-dim"
                      )}>
                        {t.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Schedule" : "New Scheduled Task"}
            </DialogTitle>
            <DialogDescription>
              {editId
                ? "Update this scheduled task's configuration"
                : "Configure a task to run on a cron schedule"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-text-bright">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Daily backup"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-text-bright">Description</label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What does this do?"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-text-bright">Schedule (cron)</label>
                <Input
                  value={form.schedule}
                  onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                  placeholder="0 6 * * *"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-text-bright">Type</label>
                <Select
                  value={form.type}
                  onValueChange={(value) => setForm({ ...form, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="command">Command</SelectItem>
                    <SelectItem value="script">Script</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-text-bright">Payload</label>
              <Textarea
                value={form.payload}
                onChange={(e) => setForm({ ...form, payload: e.target.value })}
                placeholder="bun run backup.sh"
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.name.trim() || !form.schedule.trim()}>
              {editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
