import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2,
  Loader2,
  Lock,
  ChevronDown,
  ChevronRight,
  Rocket,
  Link2,
  ShieldCheck,
  Info,
  Copy,
  Check,
  ExternalLink,
  Key,
  BarChart3,
  BookOpen,
  ArrowLeft,
  Database,
  FileText,
  Code2,
  Package,
  Zap,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

// ── Deployment step metadata (titles, copy, icons, ETAs) ─────────────────
const DEPLOY_STEPS = [
  {
    key: "saveEndpoints",
    icon: Database,
    title: "Locking in endpoint configuration",
    description: "Persisting selected routes with field-filtering rules",
    activeMessage: "Writing security policies to the gateway…",
    estSeconds: 1,
  },
  {
    key: "verifyConnection",
    icon: Link2,
    title: "Verifying backend handshake",
    description: "Re-authenticating with your service account",
    activeMessage: "Exchanging credentials and caching the JWT…",
    estSeconds: 2,
  },
  {
    key: "generateSpec",
    icon: FileText,
    title: "Designing your OpenAPI 3.0 spec",
    description: "AI is documenting every endpoint with examples & schemas",
    activeMessage: "Claude is reading your routes and inventing example payloads…",
    estSeconds: 18,
  },
  {
    key: "generateSdk",
    icon: Code2,
    title: "Crafting type-safe TypeScript SDK",
    description: "Resource-grouped methods with full IDE autocomplete",
    activeMessage: "Compiling typed interfaces from your API surface…",
    estSeconds: 25,
  },
  {
    key: "createKey",
    icon: Key,
    title: "Minting your first API key",
    description: "Scoped to your selected endpoints, hashed at rest",
    activeMessage: "Generating a cryptographic secret…",
    estSeconds: 1,
  },
  {
    key: "publishNpm",
    icon: Package,
    title: "Publishing SDK to the npm registry",
    description: "So anyone can install it with one command",
    activeMessage: "Pushing tarball to npmjs.com…",
    estSeconds: 10,
  },
  {
    key: "activateGateway",
    icon: Zap,
    title: "Activating the production gateway",
    description: "Spinning up the rate-limited proxy on the edge",
    activeMessage: "Flipping the switch — almost live…",
    estSeconds: 2,
  },
];

const TOTAL_EST_SECONDS = DEPLOY_STEPS.reduce((sum, s) => sum + s.estSeconds, 0);

function formatElapsed(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
}

const METHOD_COLORS = {
  GET: "bg-emerald-50 text-emerald-700 border-emerald-200",
  POST: "bg-blue-50 text-blue-700 border-blue-200",
  PUT: "bg-amber-50 text-amber-700 border-amber-200",
  DELETE: "bg-red-50 text-red-700 border-red-200",
  PATCH: "bg-purple-50 text-purple-700 border-purple-200",
};

const RISK_COLORS = {
  green: "bg-emerald-600",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

const RISK_BORDER = {
  green: "border-l-emerald-500",
  yellow: "border-l-amber-500",
  red: "border-l-red-500",
};

function MethodBadge({ method }) {
  return (
    <span
      data-testid={`method-badge-${method}`}
      className={`inline-flex items-center justify-center text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-lg border ${METHOD_COLORS[method] || METHOD_COLORS.GET}`}
    >
      {method}
    </span>
  );
}

// Inline keyframes & gradients for the deploy overlay
function DeployProgressStyles() {
  return (
    <style>{`
      @keyframes deploy-shimmer-slide {
        0% { background-position: -160% 0; }
        100% { background-position: 260% 0; }
      }
      .deploy-progress-shimmer {
        background-size: 200% 100%;
        background-image: linear-gradient(
          90deg,
          rgba(203,183,251,1) 0%,
          rgba(113,76,182,1) 35%,
          rgba(255,255,255,0.55) 50%,
          rgba(113,76,182,1) 65%,
          rgba(166,133,226,1) 100%
        );
        animation: deploy-shimmer-slide 2.4s ease-in-out infinite;
      }
      @keyframes deploy-text-shimmer {
        0% { background-position: -150% 0; }
        100% { background-position: 250% 0; }
      }
      .deploy-text-shimmer {
        background: linear-gradient(
          90deg,
          rgba(113,76,182,0.55) 0%,
          rgba(113,76,182,1) 50%,
          rgba(113,76,182,0.55) 100%
        );
        background-size: 200% 100%;
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        animation: deploy-text-shimmer 2.2s linear infinite;
      }
      @keyframes deploy-pulse-ring {
        0%   { transform: scale(0.92); opacity: 0.55; }
        70%  { transform: scale(1.45); opacity: 0; }
        100% { transform: scale(1.45); opacity: 0; }
      }
      .deploy-pulse-ring {
        animation: deploy-pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
      .deploy-header-gradient {
        background:
          radial-gradient(circle at 15% 0%, rgba(203,183,251,0.35), transparent 55%),
          radial-gradient(circle at 95% 100%, rgba(113,76,182,0.18), transparent 55%);
      }
      @keyframes deploy-step-enter {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .deploy-step-enter {
        animation: deploy-step-enter 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
      }
      @keyframes deploy-check-pop {
        0%   { transform: scale(0.4); opacity: 0; }
        60%  { transform: scale(1.15); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      .deploy-check-pop {
        animation: deploy-check-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      }
      .deploy-line-fill {
        transition: background-color 0.6s ease, height 0.6s ease;
      }
    `}</style>
  );
}

function DeployStepItem({ step, status, isLast }) {
  const Icon = step.icon;
  const isComplete = status === "complete";
  const isWorking = status === "working";
  const isPending = status === "pending";

  const ringClasses = isComplete
    ? "bg-emerald-50 border-emerald-200 text-emerald-600"
    : isWorking
    ? "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/40 text-[var(--accent-primary)]"
    : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)]/30";

  return (
    <li
      className="relative flex gap-4 pb-5 deploy-step-enter"
      data-testid={`deploy-step-${step.key}`}
      data-status={status}
    >
      {/* Connector line */}
      {!isLast && (
        <span
          aria-hidden="true"
          className={`absolute left-[19px] top-10 bottom-0 w-px deploy-line-fill ${
            isComplete ? "bg-emerald-300" : "bg-[var(--border-primary)]"
          }`}
        />
      )}

      {/* Icon node */}
      <div className="relative shrink-0">
        {isWorking && (
          <span className="absolute inset-0 rounded-xl bg-[var(--accent-primary)]/25 deploy-pulse-ring" />
        )}
        <div
          className={`relative w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-300 ${ringClasses}`}
        >
          {isComplete ? (
            <CheckCircle2 className="w-5 h-5 deploy-check-pop" strokeWidth={2.25} />
          ) : isWorking ? (
            <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
          ) : (
            <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-baseline gap-2">
          <h3
            className={`text-sm font-medium leading-snug transition-colors ${
              isComplete
                ? "text-[var(--text-primary)]"
                : isWorking
                ? "deploy-text-shimmer font-semibold"
                : "text-[var(--text-primary)]/45"
            }`}
          >
            {step.title}
          </h3>
          {isComplete && (
            <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">
              Done
            </span>
          )}
          {isPending && step.estSeconds > 0 && (
            <span className="text-[10px] text-[var(--text-primary)]/30 font-mono">
              ~{step.estSeconds}s
            </span>
          )}
        </div>
        <p
          className={`text-xs leading-relaxed mt-0.5 transition-colors ${
            isPending ? "text-[var(--text-primary)]/30" : "text-[var(--text-primary)]/55"
          }`}
        >
          {step.description}
        </p>

        {isWorking && (
          <div className="mt-2.5 flex items-center gap-2 text-xs text-[var(--accent-primary)]/85">
            <Loader2 className="w-3 h-3 animate-spin shrink-0" />
            <span className="italic">{step.activeMessage}</span>
          </div>
        )}
      </div>
    </li>
  );
}

function EndpointRow({ route, index, selected, onToggle, expanded, onExpand, rateLimit, onRateLimitChange }) {
  const isRed = route.risk === "red";
  const isYellow = route.risk === "yellow";
  const hasStrip = (route.fields_to_strip || []).length > 0;
  const canExpand = isYellow && hasStrip;

  return (
    <>
      <tr
        data-testid={`endpoint-row-${index}`}
        className={`border-b border-[var(--border-primary)] transition-colors duration-150 group
          ${isRed ? "opacity-50" : "hover:bg-[var(--bg-secondary)] cursor-pointer"}
          border-l-[3px] ${RISK_BORDER[route.risk] || "border-l-[#dcd7d3]"}`}
        onClick={() => {
          if (canExpand) onExpand(index);
          else if (!isRed) onToggle(index);
        }}
      >
        {/* Checkbox */}
        <td className="w-10 px-3 py-3 text-center">
          {isRed ? (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span><Lock className="w-3.5 h-3.5 text-[var(--text-primary)]/20 mx-auto" /></span>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-[#292827] border-[#292827] text-white text-xs max-w-xs">
                  {route.risk_reason || "This endpoint cannot be exposed publicly"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => { e.stopPropagation(); onToggle(index); }}
              data-testid={`endpoint-checkbox-${index}`}
              className="w-4 h-4 rounded border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--accent-primary)] focus:ring-[var(--lavender)] focus:ring-offset-0 cursor-pointer accent-[#714cb6]"
            />
          )}
        </td>

        {/* Method */}
        <td className="w-[70px] px-2 py-3">
          <MethodBadge method={route.method} />
        </td>

        {/* Path */}
        <td className="w-[250px] px-2 py-3">
          <code className="font-mono text-xs text-[var(--text-primary)]" data-testid={`endpoint-path-${index}`}>
            {route.path}
          </code>
        </td>

        {/* Description */}
        <td className="px-2 py-3">
          <span className="text-xs text-[var(--text-primary)]/50 line-clamp-1">{route.description}</span>
        </td>

        {/* Risk */}
        <td className="w-20 px-2 py-3 text-center">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`inline-block w-2 h-2 rounded-full ${RISK_COLORS[route.risk] || RISK_COLORS.yellow}`} />
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-[#292827] border-[#292827] text-white text-xs max-w-xs">
                {route.risk_reason || route.recommendation || "No details"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </td>

        {/* Rate Limit */}
        <td className="w-[100px] px-2 py-3">
          {!isRed && (
            <Input
              type="number"
              value={rateLimit}
              onChange={(e) => { e.stopPropagation(); onRateLimitChange(index, parseInt(e.target.value) || 0); }}
              onClick={(e) => e.stopPropagation()}
              data-testid={`endpoint-rate-limit-${index}`}
              className="w-20 h-7 bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-primary)] text-xs font-mono rounded-lg px-2 focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--lavender)]/30"
            />
          )}
        </td>

        {/* Expand arrow for yellow */}
        <td className="w-8 px-1 py-3">
          {canExpand && (
            expanded
              ? <ChevronDown className="w-3.5 h-3.5 text-[var(--text-primary)]/40" />
              : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-primary)]/40" />
          )}
        </td>
      </tr>

      {/* Expanded fields-to-strip row */}
      {canExpand && expanded && (
        <tr data-testid={`endpoint-expand-${index}`} className={`border-b border-[var(--border-primary)] border-l-[3px] ${RISK_BORDER.yellow}`}>
          <td colSpan={7} className="px-6 py-3 bg-amber-50/50">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-amber-700 font-medium mb-1.5">Response filtering will be applied</p>
                <p className="text-xs text-[var(--text-primary)]/50 mb-1">Fields stripped from public response:</p>
                <div className="flex flex-wrap gap-1.5">
                  {(route.fields_to_strip || []).map((f, i) => (
                    <code key={i} className="font-mono text-xs text-red-600 line-through bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                      {f}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function EndpointsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selection state
  const [selected, setSelected] = useState({});
  const [expanded, setExpanded] = useState({});
  const [rateLimits, setRateLimits] = useState({});

  // Auth config
  const [backendUrl, setBackendUrl] = useState("");
  const [loginEndpoint, setLoginEndpoint] = useState("");
  const [saEmail, setSaEmail] = useState("");
  const [saPassword, setSaPassword] = useState("");
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState(null);

  // Deploy
  const [saving, setSaving] = useState(false);
  const [deployState, setDeployState] = useState("idle"); // idle | deploying | success
  const [deployResult, setDeployResult] = useState(null);
  const [deploySteps, setDeploySteps] = useState({
    saveEndpoints: "pending",
    verifyConnection: "pending",
    generateSpec: "pending",
    generateSdk: "pending",
    createKey: "pending",
    publishNpm: "pending",
    activateGateway: "pending",
  });
  const [elapsedMs, setElapsedMs] = useState(0);
  const deployStartRef = useRef(null);
  const [copied, setCopied] = useState({});

  // Tick elapsed time while deploying
  useEffect(() => {
    if (deployState !== "deploying") {
      setElapsedMs(0);
      deployStartRef.current = null;
      return;
    }
    deployStartRef.current = Date.now();
    setElapsedMs(0);
    const interval = setInterval(() => {
      if (deployStartRef.current) {
        setElapsedMs(Date.now() - deployStartRef.current);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [deployState]);

  const fetchData = useCallback(async () => {
    try {
      const [projRes, routesRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/routes`),
      ]);
      setProject(projRes.data);
      setRoutes(routesRes.data);

      // Pre-fill login endpoint from project data
      if (projRes.data.loginEndpoint) {
        setLoginEndpoint(projRes.data.loginEndpoint);
      }
      if (projRes.data.targetBackendUrl) {
        setBackendUrl(projRes.data.targetBackendUrl);
      }
      if (projRes.data.serviceAccountEmail) {
        setSaEmail(projRes.data.serviceAccountEmail);
      }
      if (projRes.data.connectionTested) {
        setConnectionResult({ success: true, mock: true, testResult: "Previously connected" });
      }

      // Pre-fill rate limits
      const limits = {};
      routesRes.data.forEach((r, i) => {
        limits[i] = r.suggested_rate_limit || 100;
      });
      setRateLimits(limits);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Counts
  const greenCount = routes.filter(r => r.risk === "green").length;
  const yellowCount = routes.filter(r => r.risk === "yellow").length;
  const redCount = routes.filter(r => r.risk === "red").length;
  const selectedCount = Object.values(selected).filter(Boolean).length;

  const selectAllSafe = () => {
    const next = { ...selected };
    routes.forEach((r, i) => {
      if (r.risk === "green") next[i] = true;
    });
    setSelected(next);
  };

  const toggleSelect = (idx) => {
    if (routes[idx]?.risk === "red") return;
    setSelected(s => ({ ...s, [idx]: !s[idx] }));
  };

  const toggleExpand = (idx) => {
    setExpanded(s => ({ ...s, [idx]: !s[idx] }));
  };

  const handleRateLimitChange = (idx, val) => {
    setRateLimits(s => ({ ...s, [idx]: val }));
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const { data } = await api.post(`/projects/${projectId}/test-connection`, {
        targetBackendUrl: backendUrl,
        loginEndpoint,
        serviceAccountEmail: saEmail,
        serviceAccountPassword: saPassword,
      });
      setConnectionResult(data);
      if (data.success) toast.success("Connection successful");
      else toast.error(data.error || "Connection failed");
    } catch (e) {
      setConnectionResult({ success: false, error: formatApiError(e.response?.data?.detail) || "Connection failed" });
      toast.error("Connection test failed");
    } finally {
      setTestingConnection(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(s => ({ ...s, [key]: true }));
    setTimeout(() => setCopied(s => ({ ...s, [key]: false })), 2000);
    toast.success("Copied to clipboard");
  };

  const handleDeploy = async () => {
    const selectedEndpoints = routes
      .map((r, i) => ({ ...r, idx: i }))
      .filter((_, i) => selected[i])
      .map((r) => ({
        method: r.method,
        path: r.path,
        description: r.description,
        fieldsToStrip: r.fields_to_strip || [],
        rateLimit: rateLimits[r.idx] || 100,
      }));

    if (selectedEndpoints.length === 0) return;

    setDeployState("deploying");
    setDeploySteps({
      saveEndpoints: "working",
      verifyConnection: "pending",
      generateSpec: "pending",
      generateSdk: "pending",
      createKey: "pending",
      publishNpm: "pending",
      activateGateway: "pending",
    });

    try {
      // Step 1: Save endpoints
      await api.post(`/projects/${projectId}/endpoints`, { endpoints: selectedEndpoints });
      setDeploySteps(s => ({ ...s, saveEndpoints: "complete", verifyConnection: "working" }));
      await new Promise(r => setTimeout(r, 600));

      setDeploySteps(s => ({ ...s, verifyConnection: "complete", generateSpec: "working" }));

      // Step 2: Kick off deploy (returns immediately — runs in background)
      await api.post(`/projects/${projectId}/deploy`);

      // Step 3: Poll for deploy progress
      const stepOrder = ["generateSpec", "generateSdk", "createKey", "publishNpm", "activateGateway"];
      const stepMap = { generateSpec: 0, generateSdk: 1, createKey: 2, publishNpm: 3, activateGateway: 4, complete: 5 };

      let attempts = 0;
      const maxAttempts = 120; // 120 * 2s = 4 minutes max

      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 2000));
        attempts++;

        try {
          const { data: status } = await api.get(`/projects/${projectId}/deploy-status`);

          if (status.status === "live") {
            // All steps complete
            setDeploySteps({
              saveEndpoints: "complete",
              verifyConnection: "complete",
              generateSpec: "complete",
              generateSdk: "complete",
              createKey: "complete",
              publishNpm: "complete",
              activateGateway: "complete",
            });
            setDeployResult(status);
            await new Promise(r => setTimeout(r, 600));
            setDeployState("success");
            return;
          }

          if (status.error) {
            toast.error(status.error);
            setDeployState("idle");
            return;
          }

          // Update step indicators based on current backend step
          const currentStep = status.deployStep;
          const currentIdx = stepMap[currentStep] ?? -1;

          const newSteps = {
            saveEndpoints: "complete",
            verifyConnection: "complete",
          };
          for (let i = 0; i < stepOrder.length; i++) {
            if (i < currentIdx) {
              newSteps[stepOrder[i]] = "complete";
            } else if (i === currentIdx) {
              newSteps[stepOrder[i]] = "working";
            } else {
              newSteps[stepOrder[i]] = "pending";
            }
          }
          setDeploySteps(newSteps);

        } catch (pollErr) {
          // Polling error — just retry
          console.warn("Poll error:", pollErr);
        }
      }

      // Timeout
      toast.error("Deploy is taking too long. Check the dashboard for status.");
      setDeployState("idle");

    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Deploy failed");
      setDeployState("idle");
    }
  };

  const canDeploy = selectedCount > 0 && connectionResult?.success;

  if (loading) {
    return (
      <AppLayout>
        <div data-testid="endpoints-loading" className="pb-24">
          <div className="h-4 w-20 skeleton mb-4" />
          <div className="space-y-2 mb-6">
            <div className="h-7 w-48 skeleton" />
            <div className="h-4 w-24 skeleton" />
          </div>
          <div className="flex gap-3 mb-6">
            {[80, 100, 70].map((w, i) => <div key={i} className="h-7 rounded-lg skeleton" style={{ width: w }} />)}
          </div>
          <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
            <div className="bg-[var(--bg-secondary)] h-10 border-b border-[var(--border-primary)]" />
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-[var(--border-primary)]">
                <div className="h-4 w-4 skeleton" />
                <div className="h-5 w-14 skeleton" />
                <div className="h-4 w-36 skeleton" />
                <div className="h-4 flex-1 skeleton" />
                <div className="h-4 w-8 rounded-full skeleton" />
                <div className="h-7 w-16 skeleton" />
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Deploy progress overlay
  if (deployState === "deploying") {
    const completedCount = DEPLOY_STEPS.filter((s) => deploySteps[s.key] === "complete").length;
    const totalCount = DEPLOY_STEPS.length;
    const progressPct = (completedCount / totalCount) * 100;
    const activeStep = DEPLOY_STEPS.find((s) => deploySteps[s.key] === "working");
    const remainingSeconds = DEPLOY_STEPS.filter(
      (s) => deploySteps[s.key] !== "complete"
    ).reduce((sum, s) => sum + s.estSeconds, 0);

    return (
      <AppLayout>
        <DeployProgressStyles />
        <div className="max-w-xl mx-auto mt-12 mb-12" data-testid="deploy-progress">
          <div className="relative bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-3xl shadow-[0_8px_40px_-12px_rgba(113,76,182,0.18)] overflow-hidden">
            {/* Header */}
            <div className="relative px-8 pt-8 pb-6 border-b border-[var(--border-primary)] overflow-hidden">
              <div className="absolute inset-0 deploy-header-gradient opacity-60 pointer-events-none" />
              <div className="relative flex items-start gap-4">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-2xl bg-[var(--accent-primary)]/30 deploy-pulse-ring" />
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-[#cbb7fb] to-[var(--accent-primary)] flex items-center justify-center shadow-lg shadow-[var(--accent-primary)]/20">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[var(--accent-primary)] mb-1">
                    Going Live
                  </p>
                  <h2 className="text-[var(--text-primary)] font-semibold font-heading text-2xl leading-[1.05] tracking-tight truncate">
                    Shipping <span className="text-[var(--accent-primary)]">{project?.name || "your API"}</span>
                  </h2>
                  <p className="text-[var(--text-primary)]/55 text-sm mt-1.5 leading-relaxed">
                    Sit tight — we're turning your internal endpoints into a production-grade public platform.
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative mt-6">
                <div className="flex items-center justify-between text-[11px] font-medium tracking-wide text-[var(--text-primary)]/60 mb-2">
                  <span data-testid="deploy-progress-count">
                    <span className="text-[var(--text-primary)] font-semibold">{completedCount}</span>
                    <span className="text-[var(--text-primary)]/40"> / {totalCount} steps</span>
                  </span>
                  <span className="font-mono text-[var(--text-primary)]/50">
                    {formatElapsed(elapsedMs)}
                    {remainingSeconds > 0 && (
                      <span className="text-[var(--text-primary)]/30"> · ~{remainingSeconds}s left</span>
                    )}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#cbb7fb] via-[var(--accent-primary)] to-[#a685e2] deploy-progress-shimmer transition-all duration-700 ease-out"
                    style={{ width: `${Math.max(4, progressPct)}%` }}
                    data-testid="deploy-progress-bar"
                  />
                </div>
              </div>
            </div>

            {/* Steps timeline */}
            <div className="px-8 py-6">
              <ol className="relative space-y-1">
                {DEPLOY_STEPS.map((step, idx) => {
                  const status = deploySteps[step.key];
                  const isLast = idx === DEPLOY_STEPS.length - 1;
                  return (
                    <DeployStepItem
                      key={step.key}
                      step={step}
                      status={status}
                      isLast={isLast}
                    />
                  );
                })}
              </ol>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 bg-[var(--bg-secondary)]/40 border-t border-[var(--border-primary)] flex items-center justify-between">
              <p className="text-xs text-[var(--text-primary)]/50 flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                Encrypted in transit · Idempotent deploy
              </p>
              {activeStep ? (
                <p className="text-xs text-[var(--accent-primary)] flex items-center gap-1.5 font-medium">
                  <span className="relative flex w-1.5 h-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--accent-primary)] opacity-60 animate-ping" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--accent-primary)]" />
                  </span>
                  In progress
                </p>
              ) : (
                <p className="text-xs text-[var(--text-primary)]/40">Queued</p>
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Deploy success screen
  if (deployState === "success" && deployResult) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto mt-12" data-testid="deploy-success">
          <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl p-8 shadow-sm">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-[#cbb7fb]/20 rounded-xl flex items-center justify-center">
                <Rocket className="w-5 h-5 text-[var(--accent-primary)]" />
              </div>
              <div>
                <h2 className="text-[var(--text-primary)] font-semibold font-heading text-2xl leading-[0.96]">Your SaaS is Now a Platform</h2>
                <p className="text-[var(--text-primary)]/50 text-sm mt-1">{project?.name} is live</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Gateway URL (Subdomain) */}
              <div>
                <label className="text-[var(--text-primary)]/60 text-xs font-medium uppercase tracking-wider block mb-1.5">API Base URL</label>
                <div className="flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg px-3 py-2.5">
                  <code className="font-mono text-sm text-[var(--text-primary)] flex-1 truncate" data-testid="deploy-gateway-url">{deployResult.gatewaySubdomain || deployResult.gatewayUrl}</code>
                  <button onClick={() => copyToClipboard(deployResult.gatewaySubdomain || deployResult.gatewayUrl, "gateway")} className="p-1 text-[var(--text-primary)]/40 hover:text-[var(--text-primary)] transition-colors" data-testid="copy-gateway-url">
                    {copied.gateway ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                {deployResult.gatewayFallback && deployResult.gatewaySubdomain && (
                  <p className="text-xs text-[var(--text-primary)]/40 mt-1.5">
                    Fallback: <code className="font-mono text-[var(--text-primary)]/50">{deployResult.gatewayFallback}</code>
                  </p>
                )}
              </div>

              {/* Docs URL */}
              <div>
                <label className="text-[var(--text-primary)]/60 text-xs font-medium uppercase tracking-wider block mb-1.5">Documentation</label>
                <div className="flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg px-3 py-2.5">
                  <code className="font-mono text-sm text-[var(--text-primary)] flex-1 truncate" data-testid="deploy-docs-url">{deployResult.docsUrl}</code>
                  <button onClick={() => navigate(`/docs/${project?.slug}`)} className="p-1 text-[var(--text-primary)]/40 hover:text-[var(--text-primary)] transition-colors" data-testid="open-docs-link">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* SDK Install */}
              <div>
                <label className="text-[var(--text-primary)]/60 text-xs font-medium uppercase tracking-wider block mb-1.5">Install SDK</label>
                <div className="flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg px-3 py-2.5">
                  <code className="font-mono text-sm text-[var(--text-primary)] flex-1 truncate" data-testid="deploy-sdk-install">{deployResult.sdkInstall}</code>
                  <button onClick={() => copyToClipboard(deployResult.sdkInstall, "sdk")} className="p-1 text-[var(--text-primary)]/40 hover:text-[var(--text-primary)] transition-colors" data-testid="copy-sdk-install">
                    {copied.sdk ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                {deployResult.npmPublished ? (
                  <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" /> Published to npm as <span className="font-mono">{deployResult.npmPackage}@{deployResult.npmVersion}</span>
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5">
                    <Info className="w-3 h-3" /> SDK generated but npm publish pending
                  </p>
                )}
              </div>

              {/* API Key */}
              <div>
                <label className="text-[var(--text-primary)]/60 text-xs font-medium uppercase tracking-wider block mb-1.5">Your First API Key</label>
                <div className="flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg px-3 py-2.5">
                  <code className="font-mono text-xs text-[var(--text-primary)] flex-1 truncate" data-testid="deploy-api-key">{deployResult.apiKey}</code>
                  <button onClick={() => copyToClipboard(deployResult.apiKey, "key")} className="p-1 text-[var(--text-primary)]/40 hover:text-[var(--text-primary)] transition-colors" data-testid="copy-api-key">
                    {copied.key ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5">
                  <Info className="w-3 h-3" /> Save this key now. You won't see it again.
                </p>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 pt-2 text-sm text-[var(--text-primary)]/50" data-testid="deploy-stats">
                <span><strong className="text-[var(--text-primary)]">{deployResult.endpointsExposed}</strong> endpoints exposed</span>
                <span className="text-[#dcd7d3]">|</span>
                <span>Rate limiting active</span>
                {deployResult.fieldsFiltered > 0 && (
                  <>
                    <span className="text-[#dcd7d3]">|</span>
                    <span><strong className="text-[var(--text-primary)]">{deployResult.fieldsFiltered}</strong> sensitive fields auto-filtered</span>
                  </>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-primary)]">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/docs/${project?.slug}`)}
                  data-testid="deploy-view-docs-btn"
                  className="border-[var(--border-primary)] text-[var(--text-primary)]/60 hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] rounded-lg text-sm"
                >
                  <BookOpen className="w-4 h-4 mr-1.5" /> View Docs
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/keys/${projectId}`)}
                  data-testid="deploy-manage-keys-btn"
                  className="border-[var(--border-primary)] text-[var(--text-primary)]/60 hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] rounded-lg text-sm"
                >
                  <Key className="w-4 h-4 mr-1.5" /> Manage Keys
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/analytics/${projectId}`)}
                  data-testid="deploy-view-analytics-btn"
                  className="border-[var(--border-primary)] text-[var(--text-primary)]/60 hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] rounded-lg text-sm"
                >
                  <BarChart3 className="w-4 h-4 mr-1.5" /> View Analytics
                </Button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div data-testid="endpoints-page" className="pb-24">
        {/* Back */}
        <button
          onClick={() => navigate("/")}
          data-testid="endpoints-back-btn"
          className="flex items-center gap-1.5 text-xs text-[var(--text-primary)]/50 hover:text-[var(--text-primary)] transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[var(--text-primary)] text-3xl font-semibold font-heading tracking-tight leading-[0.96]" data-testid="endpoints-title">
            Configure Public API
          </h1>
          <p className="text-[var(--text-primary)]/50 text-sm mt-1.5">{project?.name || "Project"}</p>
        </div>

        {/* Summary Bar */}
        <div className="flex items-center gap-3 mb-6" data-testid="endpoints-summary">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            {greenCount} Safe
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {yellowCount} Need Review
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            {redCount} Blocked
          </span>
          <div className="flex-1" />
          <Button
            variant="outline"
            onClick={selectAllSafe}
            data-testid="select-all-safe-btn"
            className="border-[var(--border-primary)] text-[var(--text-primary)]/60 hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] rounded-lg text-xs h-8"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            Select All Safe
          </Button>
        </div>

        {/* Endpoint Table */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden mb-8 shadow-sm" data-testid="endpoints-table">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
                <th className="w-10 px-3 py-2.5 text-left"></th>
                <th className="w-[70px] px-2 py-2.5 text-left text-[10px] font-semibold tracking-wider uppercase text-[var(--text-primary)]/50">Method</th>
                <th className="w-[250px] px-2 py-2.5 text-left text-[10px] font-semibold tracking-wider uppercase text-[var(--text-primary)]/50">Path</th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold tracking-wider uppercase text-[var(--text-primary)]/50">Description</th>
                <th className="w-20 px-2 py-2.5 text-center text-[10px] font-semibold tracking-wider uppercase text-[var(--text-primary)]/50">Risk</th>
                <th className="w-[100px] px-2 py-2.5 text-left text-[10px] font-semibold tracking-wider uppercase text-[var(--text-primary)]/50">Req/min</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {routes.map((route, i) => (
                <EndpointRow
                  key={i}
                  route={route}
                  index={i}
                  selected={!!selected[i]}
                  onToggle={toggleSelect}
                  expanded={!!expanded[i]}
                  onExpand={toggleExpand}
                  rateLimit={rateLimits[i] || 100}
                  onRateLimitChange={handleRateLimitChange}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Auth Configuration */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl p-6 mb-8 shadow-sm" data-testid="auth-config-section">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="w-4 h-4 text-[var(--accent-primary)]" />
            <h2 className="text-[var(--text-primary)] text-lg font-semibold">Connect Your Backend</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label className="text-[var(--text-primary)] text-sm font-medium">Your Backend URL</Label>
              <Input
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="https://your-api.railway.app"
                data-testid="auth-backend-url-input"
                className="bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/30 focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--lavender)]/30 rounded-lg h-11 font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--text-primary)] text-sm font-medium">Login Endpoint</Label>
              <Input
                value={loginEndpoint}
                onChange={(e) => setLoginEndpoint(e.target.value)}
                placeholder="/api/auth/login"
                data-testid="auth-login-endpoint-input"
                className="bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/30 focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--lavender)]/30 rounded-lg h-11 font-mono text-sm"
              />
            </div>
          </div>

          <p className="text-xs text-[var(--text-primary)]/40 mb-4 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--text-primary)]/30" />
            Create a service account in your app for API access. This account will be used for all public API requests.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label className="text-[var(--text-primary)] text-sm font-medium">Service Account Email</Label>
              <Input
                value={saEmail}
                onChange={(e) => setSaEmail(e.target.value)}
                placeholder="api-service@yourapp.com"
                data-testid="auth-sa-email-input"
                className="bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/30 focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--lavender)]/30 rounded-lg h-11 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--text-primary)] text-sm font-medium">Service Account Password</Label>
              <Input
                type="password"
                value={saPassword}
                onChange={(e) => setSaPassword(e.target.value)}
                placeholder="••••••••"
                data-testid="auth-sa-password-input"
                className="bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/30 focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--lavender)]/30 rounded-lg h-11 text-sm"
              />
            </div>
          </div>

          <p className="text-xs text-[var(--text-primary)]/30 mb-5 flex items-center gap-1.5">
            <Lock className="w-3 h-3" /> Credentials are encrypted and never exposed via API.
          </p>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testingConnection || !backendUrl}
              data-testid="test-connection-btn"
              className="border-[var(--border-primary)] text-[var(--text-primary)]/60 hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] rounded-lg text-sm h-9"
            >
              {testingConnection ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Link2 className="w-4 h-4 mr-1.5" />
              )}
              Test Connection
            </Button>

            {connectionResult && (
              <div data-testid="connection-result" className="flex-1">
                {connectionResult.success ? (
                  <div className="space-y-0.5">
                    <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Connected! Token valid for {connectionResult.tokenValidFor}.
                    </p>
                    <p className="text-xs text-[var(--text-primary)]/40 font-mono pl-5">
                      {connectionResult.testResult}
                    </p>
                    {connectionResult.mock && (
                      <p className="text-xs text-[var(--text-primary)]/40 pl-5 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Simulated connection (backend not reachable). Will work with a live backend.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-red-600" data-testid="connection-error">
                    {connectionResult.error}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Deploy Bar */}
      <div className="fixed bottom-0 left-64 right-0 bg-[var(--bg-primary)] border-t border-[var(--border-primary)] px-8 py-4 z-30 shadow-lg" data-testid="deploy-bar">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-sm text-[var(--text-primary)]/50">
            {selectedCount > 0
              ? <><span className="text-[var(--text-primary)] font-semibold">{selectedCount}</span> endpoint{selectedCount !== 1 ? "s" : ""} selected</>
              : "Select endpoints to expose in your public API"
            }
          </p>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={handleDeploy}
                    disabled={!canDeploy || deployState !== "idle"}
                    data-testid="deploy-btn"
                    className={`rounded-lg text-sm h-10 px-6 font-semibold ${
                      canDeploy
                        ? "bg-[#292827] hover:bg-[var(--text-primary)] text-white"
                        : "bg-[var(--bg-secondary)] text-[var(--text-primary)]/30 cursor-not-allowed"
                    }`}
                  >
                    {deployState !== "idle" ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Rocket className="w-4 h-4 mr-1.5" />}
                    Deploy Public API
                  </Button>
                </span>
              </TooltipTrigger>
              {!canDeploy && (
                <TooltipContent side="top" className="bg-[#292827] border-[#292827] text-white text-xs">
                  {selectedCount === 0 ? "Select at least one endpoint" : "Test your connection first"}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </AppLayout>
  );
}
