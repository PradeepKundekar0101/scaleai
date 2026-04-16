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
    live: "text-emerald-600 bg-emerald-50 border-emerald-200",
    draft: "text-[var(--text-primary)]/50 bg-[var(--bg-secondary)] border-[var(--border-primary)]",
    scanning: "text-[var(--accent-primary)] bg-[#cbb7fb]/15 border-[var(--lavender)]/40",
    configuring: "text-amber-600 bg-amber-50 border-amber-200",
  };
  return (
    <span
      data-testid={`status-badge-${status}`}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 border rounded-lg ${styles[status] || styles.draft}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === "live" ? "bg-emerald-600" :
        status === "scanning" ? "bg-[var(--accent-primary)] animate-pulse" :
        status === "configuring" ? "bg-amber-600 animate-pulse" :
        "bg-[#292827]/30"
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
      className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl p-6 hover:border-[var(--lavender)]/60 transition-all duration-200 cursor-pointer group hover:shadow-sm"
      onClick={() => {
        if (project.status === "configuring" || project.status === "live") {
          navigate(`/endpoints/${project.id}`);
        } else {
          navigate(`/connect?projectId=${project.id}`);
        }
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-[var(--text-primary)] font-semibold text-lg">{project.name}</h3>
        <StatusBadge status={project.status} />
      </div>
      <div className="flex items-center gap-4 text-xs text-[var(--text-primary)]/50 mb-4">
        <span>{project.exposedEndpointCount || project.endpointCount || 0} endpoints</span>
        {isLive && (
          <>
            <span className="flex items-center gap-1"><Activity className="w-3 h-3" />{(project.totalCalls || 0).toLocaleString()} calls</span>
            {project.avgLatency > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{project.avgLatency}ms</span>}
          </>
        )}
      </div>
      <p className="font-mono text-xs text-[var(--text-primary)]/40 truncate mb-4" data-testid={`project-slug-${project.id}`}>
        {isLive
          ? (process.env.REACT_APP_GATEWAY_DOMAIN
              ? `${project.slug}.${process.env.REACT_APP_GATEWAY_DOMAIN}`
              : `${process.env.REACT_APP_BACKEND_URL}/api/gateway/${project.slug}`)
          : `${project.slug}.${process.env.REACT_APP_GATEWAY_DOMAIN || 'gateway.usescale.ai'}`}
      </p>
      <div className="flex items-center text-[var(--accent-primary)] text-sm font-medium group-hover:gap-2 transition-all duration-150">
        Manage <ArrowRight className="w-3.5 h-3.5 ml-1" />
      </div>
    </div>
  );
}

function EmptyState({ onCreateClick }) {
  return (
    <div
      data-testid="empty-state"
      className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-[var(--border-primary)] rounded-2xl bg-[var(--bg-secondary)]/30"
    >
      <Box className="w-12 h-12 text-[var(--text-primary)]/20 mb-4" strokeWidth={1.5} />
      <h3 className="text-[var(--text-primary)] font-semibold text-lg mb-1">No projects yet</h3>
      <p className="text-[var(--text-primary)]/50 text-sm mb-6 text-center max-w-sm">
        Connect your first repository and turn your SaaS into a platform
      </p>
      <Button
        onClick={onCreateClick}
        data-testid="empty-state-create-btn"
        className="bg-[var(--bg-tertiary)] hover:bg-[#ddd8cf] text-[var(--text-primary)] rounded-lg text-sm font-semibold h-10 px-5"
      >
        Connect Repository <ArrowRight className="w-4 h-4 ml-1.5" />
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
          <h1 className="text-[var(--text-primary)] text-3xl font-semibold font-heading tracking-tight leading-[0.96]">Your Projects</h1>
          <p className="text-[var(--text-primary)]/50 text-sm mt-1.5">Manage your API gateways and platforms</p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          data-testid="new-project-btn"
          className="bg-[#292827] hover:bg-[var(--text-primary)] text-white rounded-lg text-sm font-semibold h-10 px-5"
        >
          <Plus className="w-4 h-4 mr-1.5" /> New Project
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="dashboard-skeleton">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl p-6 space-y-3">
              <div className="flex items-start justify-between">
                <div className="h-5 w-32 skeleton" />
                <div className="h-5 w-16 skeleton" />
              </div>
              <div className="h-3 w-48 skeleton" />
              <div className="h-3 w-full skeleton" />
              <div className="h-4 w-20 skeleton mt-2" />
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
        <DialogContent className="bg-[var(--bg-primary)] border-[var(--border-primary)] rounded-2xl shadow-xl max-w-md" data-testid="create-project-modal">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)] text-xl font-semibold">New Project</DialogTitle>
            <DialogDescription className="text-[var(--text-primary)]/50 text-sm">
              Connect a repository to create an API gateway
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-[var(--text-primary)] text-sm font-medium">Project Name</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="QuickBite API"
                data-testid="create-project-name-input"
                className="bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/30 focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--lavender)]/30 rounded-lg h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--text-primary)] text-sm font-medium">GitHub Repository URL</Label>
              <Input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/org/repo"
                data-testid="create-project-repo-input"
                className="bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/30 focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--lavender)]/30 rounded-lg h-11"
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                data-testid="create-project-cancel-btn"
                className="border-[var(--border-primary)] text-[var(--text-primary)]/60 hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] rounded-lg text-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating}
                data-testid="create-project-submit-btn"
                className="bg-[#292827] hover:bg-[var(--text-primary)] text-white rounded-lg text-sm font-semibold"
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
