import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, CheckCircle2, Loader2, Circle, ArrowRight, Shield, Eye } from "lucide-react";
import { toast } from "sonner";

function StepIndicator({ status, label, sublabel }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5">
        {status === "complete" && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
        {status === "working" && <Loader2 className="w-5 h-5 text-[#2563EB] animate-spin" />}
        {status === "pending" && <Circle className="w-5 h-5 text-[#3F3F46]" />}
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${status === "complete" ? "text-[#FAFAFA]" : status === "working" ? "text-[#FAFAFA]" : "text-[#71717A]"}`}>
          {label}
        </p>
        {sublabel && (
          <p className={`text-xs mt-0.5 ${status === "complete" ? "text-emerald-400" : status === "working" ? "text-[#2563EB]" : "text-[#3F3F46]"}`}>
            {sublabel}
          </p>
        )}
      </div>
      <span className={`text-xs font-mono mt-1 ${
        status === "complete" ? "text-emerald-400" : status === "working" ? "text-[#2563EB]" : "text-[#3F3F46]"
      }`}>
        {status === "complete" ? "Done" : status === "working" ? "Running" : "Queued"}
      </span>
    </div>
  );
}

export default function ConnectPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectIdParam = searchParams.get("projectId");

  const [repoUrl, setRepoUrl] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectId, setProjectId] = useState(projectIdParam || "");
  const [state, setState] = useState("input"); // input | scanning | complete
  const [scanResult, setScanResult] = useState(null);
  const [repoName, setRepoName] = useState("");

  // Step statuses for scanning animation
  const [steps, setSteps] = useState({
    codeAnalyst: "pending",
    securityAuditor: "pending",
    riskAssessment: "pending",
  });

  const scanStartedRef = useRef(false);

  // Load project if projectId given
  useEffect(() => {
    if (projectIdParam) {
      api.get(`/projects/${projectIdParam}`).then(({ data }) => {
        setRepoUrl(data.repoUrl || "");
        setProjectName(data.name || "");
        setProjectId(data.id);
        setRepoName(extractRepoName(data.repoUrl || ""));
      }).catch(() => {});
    }
  }, [projectIdParam]);

  const extractRepoName = (url) => {
    const match = url.match(/github\.com\/[^/]+\/([^/]+)/);
    return match ? match[1] : url;
  };

  const handleScan = useCallback(async () => {
    if (scanStartedRef.current) return;
    scanStartedRef.current = true;

    let currentProjectId = projectId;
    const name = repoName || extractRepoName(repoUrl);
    setRepoName(name);

    try {
      // Create project if needed
      if (!currentProjectId) {
        const pName = projectName.trim() || name || "New Project";
        const { data } = await api.post("/projects", { name: pName, repoUrl: repoUrl.trim() });
        currentProjectId = data.id;
        setProjectId(data.id);
      }

      setState("scanning");

      // Start animated step transitions
      setSteps({ codeAnalyst: "working", securityAuditor: "pending", riskAssessment: "pending" });

      const timer1 = setTimeout(() => {
        setSteps(s => ({ ...s, codeAnalyst: "complete", securityAuditor: "working" }));
      }, 3000);

      const timer2 = setTimeout(() => {
        setSteps(s => ({ ...s, securityAuditor: "complete", riskAssessment: "working" }));
      }, 6000);

      // Make the actual API call
      const { data } = await api.post(`/projects/${currentProjectId}/scan`);

      // Clear timers and mark all complete
      clearTimeout(timer1);
      clearTimeout(timer2);
      setSteps({ codeAnalyst: "complete", securityAuditor: "complete", riskAssessment: "complete" });
      setScanResult(data);

      // Short delay before transitioning to complete state
      setTimeout(() => setState("complete"), 800);

    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Scan failed");
      setState("input");
      scanStartedRef.current = false;
    }
  }, [projectId, projectName, repoUrl, repoName]);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto" data-testid="connect-page">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[var(--text-primary)] text-3xl font-semibold tracking-tight leading-[0.96]">Connect Your Repository</h1>
          <p className="text-[var(--text-primary)]/50 text-sm mt-1.5">
            Our AI agents will scan your codebase and discover every API route
          </p>
        </div>

        {/* State 1: Input */}
        {state === "input" && (
          <div className="space-y-6" data-testid="connect-input-state">
            {!projectIdParam && (
              <div className="space-y-2">
                <Label className="text-[var(--text-primary)] text-sm font-medium">Project Name</Label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="QuickBite API"
                  data-testid="connect-project-name-input"
                  className="bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/30 focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--lavender)]/30 rounded-lg h-11"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[var(--text-primary)] text-sm font-medium">GitHub Repository URL</Label>
              <div className="flex gap-3">
                <Input
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/your-org/your-repo"
                  data-testid="connect-repo-url-input"
                  className="bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/30 focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--lavender)]/30 rounded-lg h-12 font-mono text-sm flex-1"
                />
                <Button
                  onClick={handleScan}
                  disabled={!repoUrl.trim()}
                  data-testid="connect-scan-btn"
                  className="bg-[#292827] hover:bg-[var(--text-primary)] text-white rounded-lg h-12 px-6 text-sm font-semibold shrink-0"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Scan Codebase
                </Button>
              </div>
              <p className="text-xs text-[var(--text-primary)]/40">
                We read your code to discover API routes. We never store or modify your source code.
              </p>
            </div>
          </div>
        )}

        {/* State 2: Scanning */}
        {state === "scanning" && (
          <div
            className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl p-6 shadow-sm"
            data-testid="connect-scanning-state"
          >
            <div className="mb-4">
              <h2 className="text-[var(--text-primary)] font-semibold text-lg">
                Scanning <span className="font-mono text-[var(--accent-primary)]">{repoName}</span>...
              </h2>
            </div>

            <div className="divide-y divide-[#dcd7d3]">
              <StepIndicator
                status={steps.codeAnalyst}
                label="Code Analyst Agent"
                sublabel={steps.codeAnalyst === "complete" ? "Routes discovered" : steps.codeAnalyst === "working" ? "Scanning codebase, discovering routes..." : "Waiting..."}
              />
              <StepIndicator
                status={steps.securityAuditor}
                label="Security Auditor Agent"
                sublabel={steps.securityAuditor === "complete" ? "Risk assessment complete" : steps.securityAuditor === "working" ? "Reviewing routes for public exposure..." : "Waiting..."}
              />
              <StepIndicator
                status={steps.riskAssessment}
                label="Risk Assessment"
                sublabel={steps.riskAssessment === "complete" ? "Report generated" : steps.riskAssessment === "working" ? "Generating security report..." : "Waiting..."}
              />
            </div>
          </div>
        )}

        {/* State 3: Complete */}
        {state === "complete" && scanResult && (
          <div
            className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl p-6 shadow-sm"
            data-testid="connect-complete-state"
          >
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h2 className="text-[var(--text-primary)] font-semibold text-lg">Scan Complete</h2>
            </div>

            <p className="text-[var(--text-primary)]/60 text-sm mb-6">
              Discovered <span className="text-[var(--text-primary)] font-semibold">{scanResult.routeCount}</span> routes in{" "}
              <span className="font-mono text-[var(--accent-primary)]">{repoName}</span>
            </p>

            <div className="flex items-center gap-6 mb-8">
              <div className="flex items-center gap-2" data-testid="scan-green-count">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span className="text-sm text-[var(--text-primary)] font-medium">{scanResult.breakdown?.green || 0}</span>
                <span className="text-sm text-[var(--text-primary)]/50">Safe</span>
              </div>
              <div className="flex items-center gap-2" data-testid="scan-yellow-count">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-sm text-[var(--text-primary)] font-medium">{scanResult.breakdown?.yellow || 0}</span>
                <span className="text-sm text-[var(--text-primary)]/50">Need Review</span>
              </div>
              <div className="flex items-center gap-2" data-testid="scan-red-count">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-sm text-[var(--text-primary)] font-medium">{scanResult.breakdown?.red || 0}</span>
                <span className="text-sm text-[var(--text-primary)]/50">Blocked</span>
              </div>
            </div>

            <Button
              onClick={() => navigate(`/endpoints/${projectId}`)}
              data-testid="configure-endpoints-btn"
              className="bg-[#292827] hover:bg-[var(--text-primary)] text-white rounded-lg text-sm font-semibold h-10 px-5"
            >
              Configure Endpoints <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
