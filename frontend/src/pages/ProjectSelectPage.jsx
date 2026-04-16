import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { ArrowRight, Activity, Clock } from "lucide-react";
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
        <h1 className="text-[#FAFAFA] text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-[#71717A] text-sm mt-1">{description}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-[#0F0F12] border border-[#27272A] rounded-sm p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="h-5 w-32 bg-[#18181B] rounded-sm animate-pulse" />
                <div className="h-5 w-16 bg-[#18181B] rounded-sm animate-pulse" />
              </div>
              <div className="h-3 w-48 bg-[#18181B] rounded-sm animate-pulse" />
              <div className="h-3 w-full bg-[#18181B] rounded-sm animate-pulse" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 border border-dashed border-[#27272A] rounded-sm">
          <p className="text-[#71717A] text-sm">No projects yet. Create one from the Dashboard.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project) => {
            const isLive = project.status === "live";
            return (
              <div
                key={project.id}
                className="bg-[#0F0F12] border border-[#27272A] rounded-sm p-5 hover:border-[#3F3F46] transition-colors duration-200 cursor-pointer group"
                onClick={() => navigate(buildPath(project))}
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
                <p className="font-mono text-xs text-[#3F3F46] truncate mb-4">
                  {isLive ? `${process.env.REACT_APP_BACKEND_URL}/api/gateway/${project.slug}` : `gateway.scalable.dev/${project.slug}`}
                </p>
                <div className="flex items-center text-[#2563EB] text-sm font-medium group-hover:gap-2 transition-all duration-150">
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
