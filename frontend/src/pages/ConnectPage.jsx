import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, CheckCircle2, Loader2, Circle, ArrowRight } from "lucide-react";
import { toast } from "sonner";

function TypewriterText({ text, speed = 20 }) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  return <span>{displayedText}</span>;
}

function ReActMessage({ type, message, isLatest }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="text-[#71717A] text-sm shrink-0 select-none">
        {type === 'reason' ? '💭' : '⚡'}
      </span>
      <p className="text-sm text-[#A1A1AA] leading-relaxed">
        {isLatest ? <TypewriterText text={message} speed={15} /> : message}
      </p>
    </div>
  );
}

function StepIndicator({ agent, status, messages }) {
  const getIcon = () => {
    if (status === "complete") return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    if (status === "working") return <Loader2 className="w-5 h-5 text-[#2563EB] animate-spin" />;
    return <Circle className="w-5 h-5 text-[#3F3F46]" />;
  };

  const getStatusColor = () => {
    if (status === "complete") return "text-[#FAFAFA]";
    if (status === "working") return "text-[#FAFAFA]";
    return "text-[#52525B]";
  };

  return (
    <div className="py-3">
      <div className="flex items-center gap-3 mb-2">
        {getIcon()}
        <h3 className={`font-medium ${getStatusColor()}`}>
          {agent}
        </h3>
      </div>
      
      {messages.length > 0 && (
        <div className="ml-8 space-y-0.5">
          {messages.map((msg, i) => (
            <ReActMessage 
              key={i} 
              type={msg.type} 
              message={msg.message}
              isLatest={i === messages.length - 1 && status === "working"}
            />
          ))}
        </div>
      )}
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

  // Step statuses and streaming messages
  const [steps, setSteps] = useState({
    codeAnalyst: { status: "pending", messages: [] },
    securityAuditor: { status: "pending", messages: [] },
    riskAssessment: { status: "pending", messages: [] },
  });

  const scanStartedRef = useRef(false);
  const eventSourceRef = useRef(null);

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

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

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

      // Reset steps
      setSteps({
        codeAnalyst: { status: "pending", messages: [] },
        securityAuditor: { status: "pending", messages: [] },
        riskAssessment: { status: "pending", messages: [] },
      });

      // Use EventSource for streaming
      const token = localStorage.getItem("token");
      const baseUrl = process.env.REACT_APP_BACKEND_URL || "";
      const streamUrl = `${baseUrl}/api/projects/${currentProjectId}/scan/stream`;
      
      // Create EventSource with auth
      const eventSource = new EventSource(streamUrl);
      eventSourceRef.current = eventSource;

      // Set auth header via cookie or custom header workaround
      // Note: EventSource doesn't support custom headers, so we'll pass token in URL for now
      const authenticatedUrl = `${streamUrl}?token=${encodeURIComponent(token)}`;
      const authenticatedEventSource = new EventSource(authenticatedUrl);
      eventSourceRef.current = authenticatedEventSource;

      const agentMap = {
        "Code Analyst": "codeAnalyst",
        "Security Auditor": "securityAuditor",
        "Risk Assessment": "riskAssessment",
      };

      authenticatedEventSource.addEventListener("step", (event) => {
        const data = JSON.parse(event.data);
        const stepKey = agentMap[data.agent];
        
        if (stepKey) {
          setSteps((prev) => {
            const currentStep = prev[stepKey];
            const updatedMessages = [
              ...currentStep.messages,
              { type: data.type, message: data.message }
            ];

            // Mark current step as working
            const newSteps = { ...prev };
            newSteps[stepKey] = {
              status: "working",
              messages: updatedMessages
            };

            return newSteps;
          });
        }
      });

      authenticatedEventSource.addEventListener("complete", (event) => {
        const data = JSON.parse(event.data);
        
        // Mark all as complete
        setSteps((prev) => ({
          codeAnalyst: { ...prev.codeAnalyst, status: "complete" },
          securityAuditor: { ...prev.securityAuditor, status: "complete" },
          riskAssessment: { ...prev.riskAssessment, status: "complete" },
        }));

        setScanResult(data);
        
        // Close EventSource
        authenticatedEventSource.close();
        eventSourceRef.current = null;
        
        // Transition to complete
        setTimeout(() => setState("complete"), 800);
      });

      authenticatedEventSource.addEventListener("error", (event) => {
        console.error("EventSource error:", event);
        authenticatedEventSource.close();
        eventSourceRef.current = null;
        
        // Fallback to non-streaming endpoint
        api.post(`/projects/${currentProjectId}/scan`)
          .then(({ data }) => {
            setSteps({
              codeAnalyst: { status: "complete", messages: [{ type: "act", message: "Scan completed" }] },
              securityAuditor: { status: "complete", messages: [{ type: "act", message: "Audit completed" }] },
              riskAssessment: { status: "complete", messages: [{ type: "act", message: "Report generated" }] },
            });
            setScanResult(data);
            setTimeout(() => setState("complete"), 800);
          })
          .catch((e) => {
            toast.error(formatApiError(e.response?.data?.detail) || "Scan failed");
            setState("input");
            scanStartedRef.current = false;
          });
      });

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
          <p className="text-[var(--text-secondary)] text-sm mt-1.5">
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
                  className="bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--lavender)]/30 rounded-lg h-11"
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
                  className="bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--lavender)]/30 rounded-lg h-12 font-mono text-sm flex-1"
                />
                <Button
                  onClick={handleScan}
                  disabled={!repoUrl.trim()}
                  data-testid="connect-scan-btn"
                  className="bg-[var(--text-primary)] hover:bg-[var(--accent-hover)] text-white rounded-lg h-12 px-6 text-sm font-semibold shrink-0"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Scan Codebase
                </Button>
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">
                We read your code to discover API routes. We never store or modify your source code.
              </p>
            </div>
          </div>
        )}

        {/* State 2: Scanning with ReAct Streaming */}
        {state === "scanning" && (
          <div
            className="bg-[#0F0F12] border border-[#27272A] rounded-2xl p-6 shadow-sm"
            data-testid="connect-scanning-state"
          >
            <div className="mb-6">
              <h2 className="text-[#FAFAFA] font-semibold text-lg mb-1">
                Scanning <span className="font-mono text-purple-500">{repoName}</span>...
              </h2>
              <p className="text-[#71717A] text-sm">AI agents analyzing your codebase in real-time</p>
            </div>

            <div className="space-y-1">
              <StepIndicator
                agent="Code Analyst Agent"
                status={steps.codeAnalyst.status}
                messages={steps.codeAnalyst.messages}
              />
              <StepIndicator
                agent="Security Auditor Agent"
                status={steps.securityAuditor.status}
                messages={steps.securityAuditor.messages}
              />
              <StepIndicator
                agent="Risk Assessment"
                status={steps.riskAssessment.status}
                messages={steps.riskAssessment.messages}
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

            <p className="text-[var(--text-secondary)] text-sm mb-6">
              Discovered <span className="text-[var(--text-primary)] font-semibold">{scanResult.routeCount}</span> routes in{" "}
              <span className="font-mono text-[var(--accent-primary)]">{repoName}</span>
            </p>

            <div className="flex items-center gap-6 mb-8">
              <div className="flex items-center gap-2" data-testid="scan-green-count">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span className="text-sm text-[var(--text-primary)] font-medium">{scanResult.breakdown?.green || 0}</span>
                <span className="text-sm text-[var(--text-secondary)]">Safe</span>
              </div>
              <div className="flex items-center gap-2" data-testid="scan-yellow-count">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-sm text-[var(--text-primary)] font-medium">{scanResult.breakdown?.yellow || 0}</span>
                <span className="text-sm text-[var(--text-secondary)]">Need Review</span>
              </div>
              <div className="flex items-center gap-2" data-testid="scan-red-count">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-sm text-[var(--text-primary)] font-medium">{scanResult.breakdown?.red || 0}</span>
                <span className="text-sm text-[var(--text-secondary)]">Blocked</span>
              </div>
            </div>

            <Button
              onClick={() => navigate(`/endpoints/${projectId}`)}
              data-testid="configure-endpoints-btn"
              className="bg-[var(--text-primary)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-semibold h-10 px-5"
            >
              Configure Endpoints <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
