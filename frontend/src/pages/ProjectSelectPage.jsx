import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { ArrowRight, Activity, Clock } from "lucide-react";
import { toast } from "sonner";

function StatusBadge({ status }) {
  const styles = {
    live: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950 dark:border-emerald-800",
    draft: "text-[var(--text-tertiary)] bg-[var(--bg-secondary)] border-[var(--border-primary)]",
    scanning: "text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950 dark:border-purple-800",
    configuring: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950 dark:border-amber-800",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 border rounded-2xl ${styles[status] || styles.draft}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === "live" ? "bg-emerald-600 dark:bg-emerald-400" :
        status === "scanning" ? "bg-purple-600 dark:bg-purple-400 animate-pulse" :
        status === "configuring" ? "bg-amber-600 dark:bg-amber-400 animate-pulse" :
        "bg-[var(--text-tertiary)]"
      }`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function ProjectSelectPage({ title, description, buildPath }) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-[var(--text-primary)] text-3xl font-semibold tracking-tight leading-[0.96]">{title}</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1.5">{description}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-3xl p-6 space-y-3">
              <div className="flex items-start justify-between">
                <div className="h-5 w-32 skeleton" />
                <div className="h-5 w-16 skeleton" />
              </div>
              <div className="h-3 w-48 skeleton" />
              <div className="h-3 w-full skeleton" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-[var(--border-primary)] rounded-3xl bg-[var(--bg-secondary)]/30">
          <p className="text-[var(--text-secondary)] text-sm">No projects yet. Create one from the Dashboard.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project) => {
            const isLive = project.status === "live";
            return (
              <div
                key={project.id}
                className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-3xl p-6 hover:border-[var(--accent-primary)]/60 hover:shadow-sm transition-all duration-200 cursor-pointer group"
                onClick={() => navigate(buildPath(project))}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-[var(--text-primary)] font-semibold text-lg">{project.name}</h3>
                  <StatusBadge status={project.status} />
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] mb-4">
                  <span>{project.exposedEndpointCount || project.endpointCount || 0} endpoints</span>
                  {isLive && (
                    <>
                      <span className="flex items-center gap-1"><Activity className="w-3 h-3" />{(project.totalCalls || 0).toLocaleString()} calls</span>
                      {project.avgLatency > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{project.avgLatency}ms</span>}
                    </>
                  )}
                </div>
                <p className="font-mono text-xs text-[var(--text-tertiary)] truncate mb-4">
                  {isLive ? `${process.env.REACT_APP_BACKEND_URL}/api/gateway/${project.slug}` : `gateway.scalable.dev/${project.slug}`}
                </p>
                <div className="flex items-center text-[var(--accent-primary)] text-sm font-medium group-hover:gap-2 transition-all duration-150">
                  Select <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
