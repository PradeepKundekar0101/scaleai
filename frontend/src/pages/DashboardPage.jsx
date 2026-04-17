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
import { Plus, Box, ArrowRight, Loader2, Activity, Clock, Globe, Layers, ExternalLink, Copy, Check } from "lucide-react";
import { toast } from "sonner";

function StatusBadge({ status }) {
  const config = {
    live: { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-500/20" },
    draft: { dot: "bg-[var(--text-tertiary)]", text: "text-[var(--text-secondary)]", bg: "bg-[var(--bg-secondary)]", border: "border-[var(--border-primary)]" },
    scanning: { dot: "bg-[var(--accent-primary)] animate-pulse", text: "text-[var(--accent-primary)]", bg: "bg-[#cbb7fb]/10", border: "border-[var(--lavender)]/30" },
    configuring: { dot: "bg-amber-500 animate-pulse", text: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-200 dark:border-amber-500/20" },
  };
  const s = config[status] || config.draft;
  return (
    <span
      data-testid={`status-badge-${status}`}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 border rounded-full ${s.text} ${s.bg} ${s.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ProjectCard({ project }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const isLive = project.status === "live";
  const isConfiguring = project.status === "configuring";
  const endpointCount = project.exposedEndpointCount || project.endpointCount || 0;
  const gatewayUrl = `${project.slug}.usescalableai.com/api`;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`https://${gatewayUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClick = () => {
    if (isConfiguring || isLive) {
      navigate(`/endpoints/${project.id}`);
    } else {
      navigate(`/connect?projectId=${project.id}`);
    }
  };

  // Accent color based on status
  const accentGradient = isLive
    ? "from-emerald-500/20 via-teal-500/10 to-transparent"
    : project.status === "configuring"
    ? "from-amber-500/20 via-orange-500/10 to-transparent"
    : project.status === "scanning"
    ? "from-violet-500/20 via-purple-500/10 to-transparent"
    : "from-gray-500/10 via-gray-400/5 to-transparent";

  return (
    <div
      data-testid={`project-card-${project.id}`}
      className="relative bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden hover:border-[var(--accent-primary)]/40 transition-all duration-300 cursor-pointer group hover:shadow-lg hover:shadow-[var(--accent-primary)]/5"
      onClick={handleClick}
    >
      {/* Top gradient accent */}
      <div className={`absolute top-0 left-0 right-0 h-24 bg-gradient-to-b ${accentGradient} pointer-events-none`} />

      <div className="relative p-6">
        {/* Header row */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isLive ? "bg-emerald-100 dark:bg-emerald-500/15" :
              isConfiguring ? "bg-amber-100 dark:bg-amber-500/15" :
              "bg-[var(--bg-tertiary)]"
            }`}>
              <Globe className={`w-5 h-5 ${
                isLive ? "text-emerald-600 dark:text-emerald-400" :
                isConfiguring ? "text-amber-600 dark:text-amber-400" :
                "text-[var(--text-tertiary)]"
              }`} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-[var(--text-primary)] font-semibold text-lg leading-tight">{project.name}</h3>
              <p className="text-[var(--text-tertiary)] text-xs mt-0.5">{project.slug}</p>
            </div>
          </div>
          <StatusBadge status={project.status} />
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-5 mb-5">
          <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
            <Layers className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            <span className="font-medium text-[var(--text-primary)]">{endpointCount}</span>
            <span>endpoints</span>
          </div>
          {(isLive || isConfiguring) && (
            <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
              <Activity className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              <span className="font-medium text-[var(--text-primary)]">{(project.totalCalls || 0).toLocaleString()}</span>
              <span>calls</span>
            </div>
          )}
          {project.avgLatency > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
              <Clock className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              <span className="font-medium text-[var(--text-primary)]">{project.avgLatency}</span>
              <span>ms</span>
            </div>
          )}
        </div>

        {/* Gateway URL */}
        <div className="flex items-center gap-2 bg-[var(--bg-secondary)] rounded-lg px-3 py-2 mb-5 group/url">
          <span className="font-mono text-xs text-[var(--text-secondary)] truncate flex-1" data-testid={`project-slug-${project.id}`}>
            https://{gatewayUrl}
          </span>
          <button
            onClick={handleCopy}
            className="shrink-0 p-1 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            title="Copy URL"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[var(--accent-primary)] text-sm font-medium group-hover:gap-2.5 transition-all duration-200">
            <span>Manage</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
          {isLive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(`https://${gatewayUrl}`, '_blank');
              }}
              className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Open API</span>
            </button>
          )}
        </div>
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
      <div className="w-16 h-16 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center mb-5">
        <Box className="w-8 h-8 text-[var(--text-tertiary)]" strokeWidth={1.5} />
      </div>
      <h3 className="text-[var(--text-primary)] font-semibold font-heading text-xl mb-1.5">No projects yet</h3>
      <p className="text-[var(--text-secondary)] text-sm mb-6 text-center max-w-sm">
        Connect your first repository and turn your SaaS into a platform
      </p>
      <Button
        onClick={onCreateClick}
        data-testid="empty-state-create-btn"
        className="bg-[var(--text-primary)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-semibold h-10 px-5"
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
          <p className="text-[var(--text-secondary)] text-sm mt-1.5">Manage your API gateways and platforms</p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          data-testid="new-project-btn"
          className="bg-[var(--text-primary)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-semibold h-10 px-5"
        >
          <Plus className="w-4 h-4 mr-1.5" /> New Project
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="dashboard-skeleton">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 skeleton rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 skeleton" />
                  <div className="h-3 w-20 skeleton" />
                </div>
                <div className="h-6 w-16 skeleton rounded-full" />
              </div>
              <div className="h-3 w-48 skeleton" />
              <div className="h-9 w-full skeleton rounded-lg" />
              <div className="h-4 w-20 skeleton" />
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
            <DialogTitle className="text-[var(--text-primary)] text-xl font-semibold font-heading">New Project</DialogTitle>
            <DialogDescription className="text-[var(--text-secondary)] text-sm">
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
                className="bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--lavender)]/30 rounded-lg h-11"
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
                className="bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--lavender)]/30 rounded-lg h-11"
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                data-testid="create-project-cancel-btn"
                className="border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] rounded-lg text-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating}
                data-testid="create-project-submit-btn"
                className="bg-[var(--text-primary)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-semibold"
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
