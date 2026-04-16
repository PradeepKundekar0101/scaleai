import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Box, ArrowRight, Loader2, Activity, Clock } from "lucide-react";
import { toast } from "sonner";

function StatusBadge({ status }) {
  const styles = {
    live: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    draft: "text-[#A1A1AA] bg-[#18181B] border-[#27272A]",
    scanning: "text-[#2563EB] bg-blue-500/10 border-[#2563EB]/30",
    configuring: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  };
  return (
    <span
      data-testid={`status-badge-${status}`}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 border rounded-sm ${styles[status] || styles.draft}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === "live" ? "bg-emerald-400" :
        status === "scanning" ? "bg-[#2563EB] animate-pulse" :
        status === "configuring" ? "bg-amber-400 animate-pulse" :
        "bg-[#71717A]"
      }`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ProjectCard({ project }) {
  const navigate = useNavigate();
  const isLive = project.status === "live";
  return (
    <div
      data-testid={`project-card-${project.id}`}
      className="bg-[#0F0F12] border border-[#27272A] rounded-sm p-5 hover:border-[#3F3F46] transition-colors duration-200 cursor-pointer group"
      onClick={() => {
        if (project.status === "configuring" || project.status === "live") {
          navigate(`/endpoints/${project.id}`);
        } else {
          navigate(`/connect?projectId=${project.id}`);
        }
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-[#FAFAFA] font-medium text-base">{project.name}</h3>
        <StatusBadge status={project.status} />
      </div>
      <div className="flex items-center gap-4 text-xs text-[#71717A] mb-4">
        <span>{project.exposedEndpointCount || project.endpointCount || 0} endpoints</span>
        {isLive && (
          <>
            <span className="flex items-center gap-1"><Activity className="w-3 h-3" />{(project.totalCalls || 0).toLocaleString()} calls</span>
            {project.avgLatency > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{project.avgLatency}ms</span>}
          </>
        )}
      </div>
      <p className="font-mono text-xs text-[#3F3F46] truncate mb-4" data-testid={`project-slug-${project.id}`}>
        {isLive ? `${process.env.REACT_APP_BACKEND_URL}/api/gateway/${project.slug}` : `gateway.scalable.dev/${project.slug}`}
      </p>
      <div className="flex items-center text-[#2563EB] text-sm font-medium group-hover:gap-2 transition-all duration-150">
        Manage <ArrowRight className="w-3.5 h-3.5 ml-1" />
      </div>
    </div>
  );
}

function EmptyState({ onCreateClick }) {
  return (
    <div
      data-testid="empty-state"
      className="flex flex-col items-center justify-center py-24 border border-dashed border-[#27272A] rounded-sm"
    >
      <Box className="w-12 h-12 text-[#3F3F46] mb-4" strokeWidth={1} />
      <h3 className="text-[#FAFAFA] font-medium text-lg mb-1">No projects yet</h3>
      <p className="text-[#71717A] text-sm mb-6 text-center max-w-sm">
        Connect your first repository and turn your SaaS into a platform
      </p>
      <Button
        onClick={onCreateClick}
        data-testid="empty-state-create-btn"
        className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-sm text-sm"
      >
        Connect Repository <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}

export default function DashboardPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const { data } = await api.get("/projects");
      setProjects(data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!projectName.trim() || !repoUrl.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post("/projects", { name: projectName, repoUrl });
      setProjects((prev) => [data, ...prev]);
      setModalOpen(false);
      setProjectName("");
      setRepoUrl("");
      toast.success("Project created");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8" data-testid="dashboard-header">
        <div>
          <h1 className="text-[#FAFAFA] text-2xl font-semibold tracking-tight">Your Projects</h1>
          <p className="text-[#71717A] text-sm mt-1">Manage your API gateways and platforms</p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          data-testid="new-project-btn"
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-sm text-sm h-9"
        >
          <Plus className="w-4 h-4 mr-1.5" /> New Project
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="dashboard-skeleton">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#0F0F12] border border-[#27272A] rounded-sm p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="h-5 w-32 bg-[#18181B] rounded-sm animate-pulse" />
                <div className="h-5 w-16 bg-[#18181B] rounded-sm animate-pulse" />
              </div>
              <div className="h-3 w-48 bg-[#18181B] rounded-sm animate-pulse" />
              <div className="h-3 w-full bg-[#18181B] rounded-sm animate-pulse" />
              <div className="h-4 w-20 bg-[#18181B] rounded-sm animate-pulse mt-2" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState onCreateClick={() => setModalOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="projects-grid">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#0F0F12] border-[#27272A] rounded-sm shadow-none max-w-md" data-testid="create-project-modal">
          <DialogHeader>
            <DialogTitle className="text-[#FAFAFA] text-lg font-semibold">New Project</DialogTitle>
            <DialogDescription className="text-[#71717A] text-sm">
              Connect a repository to create an API gateway
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Project Name</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="QuickBite API"
                data-testid="create-project-name-input"
                className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#3F3F46] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded-sm h-10"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">GitHub Repository URL</Label>
              <Input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/org/repo"
                data-testid="create-project-repo-input"
                className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#3F3F46] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded-sm h-10"
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                data-testid="create-project-cancel-btn"
                className="border-[#27272A] text-[#A1A1AA] hover:bg-[#18181B] rounded-sm text-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating}
                data-testid="create-project-submit-btn"
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-sm text-sm"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Project"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
