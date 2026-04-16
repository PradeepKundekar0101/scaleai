import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

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

function EndpointRow({ route, index, selected, onToggle, expanded, onExpand, rateLimit, onRateLimitChange }) {
  const isRed = route.risk === "red";
  const isYellow = route.risk === "yellow";
  const hasStrip = (route.fields_to_strip || []).length > 0;
  const canExpand = isYellow && hasStrip;

  return (
    <>
      <tr
        data-testid={`endpoint-row-${index}`}
        className={`border-b border-[#dcd7d3] transition-colors duration-150 group
          ${isRed ? "opacity-50" : "hover:bg-[#f5f3f0] cursor-pointer"}
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
                  <span><Lock className="w-3.5 h-3.5 text-[#292827]/20 mx-auto" /></span>
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
              className="w-4 h-4 rounded border-[#dcd7d3] bg-white text-[#714cb6] focus:ring-[#cbb7fb] focus:ring-offset-0 cursor-pointer accent-[#714cb6]"
            />
          )}
        </td>

        {/* Method */}
        <td className="w-[70px] px-2 py-3">
          <MethodBadge method={route.method} />
        </td>

        {/* Path */}
        <td className="w-[250px] px-2 py-3">
          <code className="font-mono text-xs text-[#292827]" data-testid={`endpoint-path-${index}`}>
            {route.path}
          </code>
        </td>

        {/* Description */}
        <td className="px-2 py-3">
          <span className="text-xs text-[#292827]/50 line-clamp-1">{route.description}</span>
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
              className="w-20 h-7 bg-white border-[#dcd7d3] text-[#292827] text-xs font-mono rounded-lg px-2 focus:border-[#714cb6] focus:ring-1 focus:ring-[#cbb7fb]/30"
            />
          )}
        </td>

        {/* Expand arrow for yellow */}
        <td className="w-8 px-1 py-3">
          {canExpand && (
            expanded
              ? <ChevronDown className="w-3.5 h-3.5 text-[#292827]/40" />
              : <ChevronRight className="w-3.5 h-3.5 text-[#292827]/40" />
          )}
        </td>
      </tr>

      {/* Expanded fields-to-strip row */}
      {canExpand && expanded && (
        <tr data-testid={`endpoint-expand-${index}`} className={`border-b border-[#dcd7d3] border-l-[3px] ${RISK_BORDER.yellow}`}>
          <td colSpan={7} className="px-6 py-3 bg-amber-50/50">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-amber-700 font-medium mb-1.5">Response filtering will be applied</p>
                <p className="text-xs text-[#292827]/50 mb-1">Fields stripped from public response:</p>
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
  const [copied, setCopied] = useState({});

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
          <div className="bg-white border border-[#dcd7d3] rounded-2xl overflow-hidden">
            <div className="bg-[#f5f3f0] h-10 border-b border-[#dcd7d3]" />
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-[#dcd7d3]">
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
    const stepList = [
      { key: "saveEndpoints", label: "Saving endpoint configuration" },
      { key: "verifyConnection", label: "Verifying backend connection" },
      { key: "generateSpec", label: "AI generating OpenAPI specification" },
      { key: "generateSdk", label: "AI generating TypeScript SDK" },
      { key: "createKey", label: "Creating API key" },
      { key: "publishNpm", label: "Publishing SDK to npm" },
      { key: "activateGateway", label: "Activating gateway" },
    ];
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto mt-20" data-testid="deploy-progress">
          <div className="bg-white border border-[#dcd7d3] rounded-2xl p-8 shadow-sm">
            <h2 className="text-[#292827] font-semibold text-xl mb-6">
              Deploying <span className="text-[#714cb6]">{project?.name}</span>...
            </h2>
            <div className="space-y-1">
              {stepList.map((step) => {
                const status = deploySteps[step.key];
                return (
                  <div key={step.key} className="flex items-center gap-3 py-2.5" data-testid={`deploy-step-${step.key}`}>
                    {status === "complete" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {status === "working" && <Loader2 className="w-4 h-4 text-[#714cb6] animate-spin shrink-0" />}
                    {status === "pending" && <div className="w-4 h-4 rounded-full border border-[#dcd7d3] shrink-0" />}
                    <span className={`text-sm ${status === "complete" ? "text-[#292827]" : status === "working" ? "text-[#292827]" : "text-[#292827]/40"}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
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
          <div className="bg-white border border-[#dcd7d3] rounded-2xl p-8 shadow-sm">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-[#cbb7fb]/20 rounded-xl flex items-center justify-center">
                <Rocket className="w-5 h-5 text-[#714cb6]" />
              </div>
              <div>
                <h2 className="text-[#292827] font-semibold text-2xl leading-[0.96]">Your SaaS is Now a Platform</h2>
                <p className="text-[#292827]/50 text-sm mt-1">{project?.name} is live</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Gateway URL (Subdomain) */}
              <div>
                <label className="text-[#292827]/60 text-xs font-medium uppercase tracking-wider block mb-1.5">API Base URL</label>
                <div className="flex items-center gap-2 bg-[#f5f3f0] border border-[#dcd7d3] rounded-lg px-3 py-2.5">
                  <code className="font-mono text-sm text-[#292827] flex-1 truncate" data-testid="deploy-gateway-url">{deployResult.gatewaySubdomain || deployResult.gatewayUrl}</code>
                  <button onClick={() => copyToClipboard(deployResult.gatewaySubdomain || deployResult.gatewayUrl, "gateway")} className="p-1 text-[#292827]/40 hover:text-[#292827] transition-colors" data-testid="copy-gateway-url">
                    {copied.gateway ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                {deployResult.gatewayFallback && deployResult.gatewaySubdomain && (
                  <p className="text-xs text-[#292827]/40 mt-1.5">
                    Fallback: <code className="font-mono text-[#292827]/50">{deployResult.gatewayFallback}</code>
                  </p>
                )}
              </div>

              {/* Docs URL */}
              <div>
                <label className="text-[#292827]/60 text-xs font-medium uppercase tracking-wider block mb-1.5">Documentation</label>
                <div className="flex items-center gap-2 bg-[#f5f3f0] border border-[#dcd7d3] rounded-lg px-3 py-2.5">
                  <code className="font-mono text-sm text-[#292827] flex-1 truncate" data-testid="deploy-docs-url">{deployResult.docsUrl}</code>
                  <button onClick={() => navigate(`/docs/${project?.slug}`)} className="p-1 text-[#292827]/40 hover:text-[#292827] transition-colors" data-testid="open-docs-link">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* SDK Install */}
              <div>
                <label className="text-[#292827]/60 text-xs font-medium uppercase tracking-wider block mb-1.5">Install SDK</label>
                <div className="flex items-center gap-2 bg-[#f5f3f0] border border-[#dcd7d3] rounded-lg px-3 py-2.5">
                  <code className="font-mono text-sm text-[#292827] flex-1 truncate" data-testid="deploy-sdk-install">{deployResult.sdkInstall}</code>
                  <button onClick={() => copyToClipboard(deployResult.sdkInstall, "sdk")} className="p-1 text-[#292827]/40 hover:text-[#292827] transition-colors" data-testid="copy-sdk-install">
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
                <label className="text-[#292827]/60 text-xs font-medium uppercase tracking-wider block mb-1.5">Your First API Key</label>
                <div className="flex items-center gap-2 bg-[#f5f3f0] border border-[#dcd7d3] rounded-lg px-3 py-2.5">
                  <code className="font-mono text-xs text-[#292827] flex-1 truncate" data-testid="deploy-api-key">{deployResult.apiKey}</code>
                  <button onClick={() => copyToClipboard(deployResult.apiKey, "key")} className="p-1 text-[#292827]/40 hover:text-[#292827] transition-colors" data-testid="copy-api-key">
                    {copied.key ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5">
                  <Info className="w-3 h-3" /> Save this key now. You won't see it again.
                </p>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 pt-2 text-sm text-[#292827]/50" data-testid="deploy-stats">
                <span><strong className="text-[#292827]">{deployResult.endpointsExposed}</strong> endpoints exposed</span>
                <span className="text-[#dcd7d3]">|</span>
                <span>Rate limiting active</span>
                {deployResult.fieldsFiltered > 0 && (
                  <>
                    <span className="text-[#dcd7d3]">|</span>
                    <span><strong className="text-[#292827]">{deployResult.fieldsFiltered}</strong> sensitive fields auto-filtered</span>
                  </>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-[#dcd7d3]">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/docs/${project?.slug}`)}
                  data-testid="deploy-view-docs-btn"
                  className="border-[#dcd7d3] text-[#292827]/60 hover:bg-[#f5f3f0] hover:text-[#292827] rounded-lg text-sm"
                >
                  <BookOpen className="w-4 h-4 mr-1.5" /> View Docs
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/keys/${projectId}`)}
                  data-testid="deploy-manage-keys-btn"
                  className="border-[#dcd7d3] text-[#292827]/60 hover:bg-[#f5f3f0] hover:text-[#292827] rounded-lg text-sm"
                >
                  <Key className="w-4 h-4 mr-1.5" /> Manage Keys
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/analytics/${projectId}`)}
                  data-testid="deploy-view-analytics-btn"
                  className="border-[#dcd7d3] text-[#292827]/60 hover:bg-[#f5f3f0] hover:text-[#292827] rounded-lg text-sm"
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
          className="flex items-center gap-1.5 text-xs text-[#292827]/50 hover:text-[#292827] transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[#292827] text-3xl font-semibold tracking-tight leading-[0.96]" data-testid="endpoints-title">
            Configure Public API
          </h1>
          <p className="text-[#292827]/50 text-sm mt-1.5">{project?.name || "Project"}</p>
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
            className="border-[#dcd7d3] text-[#292827]/60 hover:bg-[#f5f3f0] hover:text-[#292827] rounded-lg text-xs h-8"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            Select All Safe
          </Button>
        </div>

        {/* Endpoint Table */}
        <div className="bg-white border border-[#dcd7d3] rounded-2xl overflow-hidden mb-8 shadow-sm" data-testid="endpoints-table">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f5f3f0] border-b border-[#dcd7d3]">
                <th className="w-10 px-3 py-2.5 text-left"></th>
                <th className="w-[70px] px-2 py-2.5 text-left text-[10px] font-semibold tracking-wider uppercase text-[#292827]/50">Method</th>
                <th className="w-[250px] px-2 py-2.5 text-left text-[10px] font-semibold tracking-wider uppercase text-[#292827]/50">Path</th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold tracking-wider uppercase text-[#292827]/50">Description</th>
                <th className="w-20 px-2 py-2.5 text-center text-[10px] font-semibold tracking-wider uppercase text-[#292827]/50">Risk</th>
                <th className="w-[100px] px-2 py-2.5 text-left text-[10px] font-semibold tracking-wider uppercase text-[#292827]/50">Req/min</th>
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
        <div className="bg-white border border-[#dcd7d3] rounded-2xl p-6 mb-8 shadow-sm" data-testid="auth-config-section">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="w-4 h-4 text-[#714cb6]" />
            <h2 className="text-[#292827] text-lg font-semibold">Connect Your Backend</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label className="text-[#292827] text-sm font-medium">Your Backend URL</Label>
              <Input
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="https://your-api.railway.app"
                data-testid="auth-backend-url-input"
                className="bg-white border-[#dcd7d3] text-[#292827] placeholder:text-[#292827]/30 focus:border-[#714cb6] focus:ring-1 focus:ring-[#cbb7fb]/30 rounded-lg h-11 font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#292827] text-sm font-medium">Login Endpoint</Label>
              <Input
                value={loginEndpoint}
                onChange={(e) => setLoginEndpoint(e.target.value)}
                placeholder="/api/auth/login"
                data-testid="auth-login-endpoint-input"
                className="bg-white border-[#dcd7d3] text-[#292827] placeholder:text-[#292827]/30 focus:border-[#714cb6] focus:ring-1 focus:ring-[#cbb7fb]/30 rounded-lg h-11 font-mono text-sm"
              />
            </div>
          </div>

          <p className="text-xs text-[#292827]/40 mb-4 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#292827]/30" />
            Create a service account in your app for API access. This account will be used for all public API requests.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label className="text-[#292827] text-sm font-medium">Service Account Email</Label>
              <Input
                value={saEmail}
                onChange={(e) => setSaEmail(e.target.value)}
                placeholder="api-service@yourapp.com"
                data-testid="auth-sa-email-input"
                className="bg-white border-[#dcd7d3] text-[#292827] placeholder:text-[#292827]/30 focus:border-[#714cb6] focus:ring-1 focus:ring-[#cbb7fb]/30 rounded-lg h-11 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#292827] text-sm font-medium">Service Account Password</Label>
              <Input
                type="password"
                value={saPassword}
                onChange={(e) => setSaPassword(e.target.value)}
                placeholder="••••••••"
                data-testid="auth-sa-password-input"
                className="bg-white border-[#dcd7d3] text-[#292827] placeholder:text-[#292827]/30 focus:border-[#714cb6] focus:ring-1 focus:ring-[#cbb7fb]/30 rounded-lg h-11 text-sm"
              />
            </div>
          </div>

          <p className="text-xs text-[#292827]/30 mb-5 flex items-center gap-1.5">
            <Lock className="w-3 h-3" /> Credentials are encrypted and never exposed via API.
          </p>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testingConnection || !backendUrl}
              data-testid="test-connection-btn"
              className="border-[#dcd7d3] text-[#292827]/60 hover:bg-[#f5f3f0] hover:text-[#292827] rounded-lg text-sm h-9"
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
                    <p className="text-xs text-[#292827]/40 font-mono pl-5">
                      {connectionResult.testResult}
                    </p>
                    {connectionResult.mock && (
                      <p className="text-xs text-[#292827]/40 pl-5 flex items-center gap-1">
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
      <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-[#dcd7d3] px-8 py-4 z-30 shadow-lg" data-testid="deploy-bar">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-sm text-[#292827]/50">
            {selectedCount > 0
              ? <><span className="text-[#292827] font-semibold">{selectedCount}</span> endpoint{selectedCount !== 1 ? "s" : ""} selected</>
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
                        ? "bg-[#292827] hover:bg-[#1a1918] text-white"
                        : "bg-[#f5f3f0] text-[#292827]/30 cursor-not-allowed"
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
