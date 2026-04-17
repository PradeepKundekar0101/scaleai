import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  Loader2,
  Copy,
  Check,
  Play,
  Shield,
  BookOpen,
  Code2,
  Key,
  Eye,
  EyeOff,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const METHOD_COLORS = {
  GET: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
  POST: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
  PUT: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
  DELETE: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30" },
  PATCH: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30" },
};

const STATUS_COLORS = {
  2: "text-emerald-400",
  3: "text-blue-400",
  4: "text-amber-400",
  5: "text-red-400",
};

const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH"]);

function getStatusColor(code) {
  return STATUS_COLORS[Math.floor(code / 100)] || "text-[#A1A1AA]";
}

function groupEndpoints(endpoints) {
  const groups = {};
  for (const ep of endpoints) {
    const parts = ep.path.split("/").filter((p) => p && p !== "api" && !p.startsWith(":"));
    const resource = parts[0] || "General";
    const key = resource.charAt(0).toUpperCase() + resource.slice(1);
    if (!groups[key]) groups[key] = [];
    groups[key].push(ep);
  }
  return groups;
}

function syntaxHighlight(json) {
  if (typeof json !== "string") json = JSON.stringify(json, null, 2);
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "text-blue-400";
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "text-[#FAFAFA]";
          match = match.slice(0, -1);
          return `<span class="${cls}">${escapeHtml(match)}</span>:`;
        } else {
          cls = "text-emerald-400";
        }
      } else if (/true|false/.test(match)) {
        cls = "text-amber-400";
      } else if (/null/.test(match)) {
        cls = "text-red-400";
      }
      return `<span class="${cls}">${escapeHtml(match)}</span>`;
    }
  );
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Extract :param names from a path like /api/users/:id/posts/:postId
function extractPathParams(path) {
  const matches = path.match(/:(\w+)/g) || [];
  return matches.map((m) => m.slice(1));
}

// Replace :param with values from the params object
function buildPath(path, params) {
  return path.replace(/:(\w+)/g, (_, name) => {
    const v = params[name];
    return v ? encodeURIComponent(v) : `:${name}`;
  });
}

// Walk an OpenAPI schema and produce a JSON example
function schemaToExample(schema, depth = 0) {
  if (!schema || depth > 4) return null;
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum && schema.enum.length) return schema.enum[0];

  switch (schema.type) {
    case "string":
      if (schema.format === "email") return "user@example.com";
      if (schema.format === "date") return "2025-01-01";
      if (schema.format === "date-time") return new Date().toISOString();
      if (schema.format === "uuid") return "00000000-0000-0000-0000-000000000000";
      return "string";
    case "integer":
    case "number":
      return 0;
    case "boolean":
      return false;
    case "array":
      return [schemaToExample(schema.items, depth + 1)].filter((v) => v !== null);
    case "object":
    default: {
      const out = {};
      const props = schema.properties || {};
      for (const [k, v] of Object.entries(props)) {
        const ex = schemaToExample(v, depth + 1);
        if (ex !== null) out[k] = ex;
      }
      return Object.keys(out).length ? out : null;
    }
  }
}

// Look up an example body from the OpenAPI spec for a given method+path
function getBodyExample(spec, method, path) {
  try {
    const op = spec?.paths?.[path]?.[method.toLowerCase()];
    if (!op?.requestBody) return null;
    const json = op.requestBody.content?.["application/json"];
    if (!json) return null;
    if (json.example !== undefined) return json.example;
    if (json.examples) {
      const first = Object.values(json.examples)[0];
      if (first?.value !== undefined) return first.value;
    }
    if (json.schema) return schemaToExample(json.schema);
    return null;
  } catch {
    return null;
  }
}

function CopyButton({ text, testId }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      data-testid={testId}
      className="absolute top-2 right-2 p-1.5 text-[#71717A] hover:text-[#FAFAFA] bg-[#18181B]/80 hover:bg-[#27272A] rounded-sm transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function EndpointCard({ ep, gatewayUrl, gatewayFallback, apiKey, spec, cardId }) {
  const [tryResult, setTryResult] = useState(null);
  const [trying, setTrying] = useState(false);
  const colors = METHOD_COLORS[ep.method] || METHOD_COLORS.GET;

  const pathParamNames = useMemo(() => extractPathParams(ep.path), [ep.path]);
  const hasBody = METHODS_WITH_BODY.has(ep.method);

  const [pathParams, setPathParams] = useState(() =>
    Object.fromEntries(pathParamNames.map((n) => [n, ""]))
  );
  const [queryString, setQueryString] = useState("");
  const initialBody = useMemo(() => {
    if (!hasBody) return "";
    const example = getBodyExample(spec, ep.method, ep.path);
    return example ? JSON.stringify(example, null, 2) : "{\n  \n}";
  }, [hasBody, spec, ep.method, ep.path]);
  const [bodyText, setBodyText] = useState(initialBody);
  const [bodyError, setBodyError] = useState(null);

  const displayUrl = gatewayUrl;
  const tryItUrl = gatewayFallback || `${BACKEND_URL}${gatewayUrl}`;

  const builtPath = buildPath(ep.path, pathParams);
  const fullDisplayUrl = `${displayUrl}${builtPath}${queryString ? `?${queryString.replace(/^\?/, "")}` : ""}`;

  const curlExample = useMemo(() => {
    const lines = [`curl -X ${ep.method} \\`];
    lines.push(`  '${fullDisplayUrl}' \\`);
    lines.push(`  -H 'X-API-Key: ${apiKey || "YOUR_API_KEY"}'`);
    if (hasBody) {
      lines[lines.length - 1] += " \\";
      lines.push(`  -H 'Content-Type: application/json' \\`);
      const compact = (() => {
        try {
          return JSON.stringify(JSON.parse(bodyText));
        } catch {
          return bodyText.replace(/\n\s*/g, "");
        }
      })();
      lines.push(`  -d '${compact}'`);
    }
    return lines.join("\n");
  }, [ep.method, fullDisplayUrl, apiKey, hasBody, bodyText]);

  const handleTry = async () => {
    setTrying(true);
    setTryResult(null);
    setBodyError(null);

    let parsedBody = null;
    if (hasBody && bodyText.trim()) {
      try {
        parsedBody = JSON.parse(bodyText);
      } catch (err) {
        setBodyError(`Invalid JSON: ${err.message}`);
        setTrying(false);
        return;
      }
    }

    const start = performance.now();
    try {
      const qs = queryString.replace(/^\?/, "");
      const url = `${tryItUrl}${builtPath}${qs ? `?${qs}` : ""}`;
      const init = {
        method: ep.method,
        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        },
      };
      if (parsedBody !== null) init.body = JSON.stringify(parsedBody);
      const resp = await fetch(url, init);
      const elapsed = Math.round(performance.now() - start);
      let body;
      try {
        body = await resp.json();
      } catch {
        body = { raw: await resp.text() };
      }
      setTryResult({ status: resp.status, time: elapsed, body });
    } catch (err) {
      const elapsed = Math.round(performance.now() - start);
      setTryResult({ status: 0, time: elapsed, body: { error: err.message } });
    } finally {
      setTrying(false);
    }
  };

  const formatBody = () => {
    try {
      const parsed = JSON.parse(bodyText);
      setBodyText(JSON.stringify(parsed, null, 2));
      setBodyError(null);
    } catch (err) {
      setBodyError(`Invalid JSON: ${err.message}`);
    }
  };

  const missingPathParam = pathParamNames.some((n) => !pathParams[n]);
  const tryDisabled = trying || !apiKey || missingPathParam;

  return (
    <div
      id={cardId}
      className="bg-[#0F0F12] border border-[#27272A] rounded-sm overflow-hidden scroll-mt-20"
      data-testid={`endpoint-card-${ep.method}-${ep.path.replace(/\//g, "-")}`}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#27272A] flex items-center gap-3">
        <span
          className={`inline-flex items-center justify-center text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-sm border ${colors.bg} ${colors.text} ${colors.border}`}
        >
          {ep.method}
        </span>
        <code className="font-mono text-sm text-[#FAFAFA]">{ep.path}</code>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Description */}
        {ep.description && (
          <p className="text-sm text-[#A1A1AA] leading-relaxed">{ep.description}</p>
        )}

        {/* Metadata */}
        <div className="flex gap-8">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#71717A] block mb-1">
              Authentication
            </span>
            <span className="text-xs text-[#FAFAFA]">X-API-Key header required</span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#71717A] block mb-1">
              Rate Limit
            </span>
            <span className="text-xs text-[#FAFAFA]">{ep.rateLimit} requests / minute</span>
          </div>
        </div>

        {/* Path Parameters */}
        {pathParamNames.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px bg-[#27272A] flex-1" />
              <span className="text-[10px] uppercase tracking-wider text-[#71717A]">
                Path Parameters
              </span>
              <div className="h-px bg-[#27272A] flex-1" />
            </div>
            <div className="space-y-2">
              {pathParamNames.map((name) => (
                <div key={name} className="flex items-center gap-3">
                  <code className="font-mono text-xs text-amber-400 w-32 shrink-0">:{name}</code>
                  <input
                    type="text"
                    value={pathParams[name] || ""}
                    onChange={(e) =>
                      setPathParams((prev) => ({ ...prev, [name]: e.target.value }))
                    }
                    placeholder={`Enter ${name}…`}
                    data-testid={`path-param-${cardId}-${name}`}
                    className="flex-1 bg-[#09090B] border border-[#27272A] focus:border-[#2563EB] focus:outline-none rounded-sm px-3 py-1.5 text-xs font-mono text-[#FAFAFA] placeholder-[#52525B] transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Query String (GET only) */}
        {ep.method === "GET" && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px bg-[#27272A] flex-1" />
              <span className="text-[10px] uppercase tracking-wider text-[#71717A]">
                Query String
                <span className="text-[#52525B] normal-case ml-1.5">(optional)</span>
              </span>
              <div className="h-px bg-[#27272A] flex-1" />
            </div>
            <input
              type="text"
              value={queryString}
              onChange={(e) => setQueryString(e.target.value)}
              placeholder="limit=10&offset=0"
              data-testid={`query-string-${cardId}`}
              className="w-full bg-[#09090B] border border-[#27272A] focus:border-[#2563EB] focus:outline-none rounded-sm px-3 py-1.5 text-xs font-mono text-[#FAFAFA] placeholder-[#52525B] transition-colors"
            />
          </div>
        )}

        {/* Request Body (POST / PUT / PATCH) */}
        {hasBody && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px bg-[#27272A] flex-1" />
              <span className="text-[10px] uppercase tracking-wider text-[#71717A]">
                Request Body
                <span className="text-[#52525B] normal-case ml-1.5">application/json</span>
              </span>
              <button
                onClick={formatBody}
                className="text-[10px] uppercase tracking-wider text-[#71717A] hover:text-[#2563EB] transition-colors"
                data-testid={`format-body-${cardId}`}
              >
                Format
              </button>
              <div className="h-px bg-[#27272A] flex-1" />
            </div>
            <textarea
              value={bodyText}
              onChange={(e) => {
                setBodyText(e.target.value);
                setBodyError(null);
              }}
              spellCheck={false}
              data-testid={`body-${cardId}`}
              rows={Math.min(12, Math.max(4, bodyText.split("\n").length + 1))}
              className={`w-full bg-[#09090B] border ${
                bodyError ? "border-red-500/60" : "border-[#27272A] focus:border-[#2563EB]"
              } focus:outline-none rounded-sm px-3 py-2.5 text-xs font-mono text-[#FAFAFA] placeholder-[#52525B] transition-colors resize-y leading-relaxed`}
              placeholder="{}"
            />
            {bodyError && (
              <p className="text-[11px] text-red-400 mt-1.5 font-mono">{bodyError}</p>
            )}
          </div>
        )}

        {/* Example Request (cURL) */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px bg-[#27272A] flex-1" />
            <span className="text-[10px] uppercase tracking-wider text-[#71717A]">
              Example Request
            </span>
            <div className="h-px bg-[#27272A] flex-1" />
          </div>
          <div className="relative">
            <pre className="bg-[#09090B] border border-[#27272A] rounded-sm px-4 py-3 font-mono text-xs text-[#A1A1AA] overflow-x-auto whitespace-pre">
              {curlExample}
            </pre>
            <CopyButton text={curlExample} testId={`copy-curl-${cardId}`} />
          </div>
        </div>

        {/* Try It */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTry}
            disabled={tryDisabled}
            data-testid={`try-it-${cardId}`}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-colors border ${
              trying
                ? "border-[#27272A] bg-[#18181B] text-[#71717A] cursor-wait"
                : tryDisabled
                ? "border-[#27272A] bg-[#18181B] text-[#52525B] cursor-not-allowed"
                : "border-[#2563EB]/40 bg-[#2563EB]/10 text-[#2563EB] hover:bg-[#2563EB]/20"
            }`}
          >
            {trying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Try It
          </button>
          {!apiKey && (
            <span className="text-[11px] text-amber-400">
              Enter an API key at the top to send requests.
            </span>
          )}
          {apiKey && missingPathParam && (
            <span className="text-[11px] text-amber-400">
              Fill in path parameters to send the request.
            </span>
          )}
        </div>

        {/* Try It Result */}
        {tryResult && (
          <div data-testid={`try-result-${cardId}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px bg-[#27272A] flex-1" />
              <span className="text-[10px] uppercase tracking-wider text-[#71717A]">
                Response{" "}
                <span className={`font-bold ${getStatusColor(tryResult.status)}`}>
                  ({tryResult.status || "ERR"})
                </span>
              </span>
              <span className="text-[10px] text-[#71717A]">{tryResult.time}ms</span>
              <div className="h-px bg-[#27272A] flex-1" />
            </div>
            <div className="relative">
              <pre
                className="bg-[#09090B] border border-[#27272A] rounded-sm px-4 py-3 font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto"
                dangerouslySetInnerHTML={{
                  __html: syntaxHighlight(JSON.stringify(tryResult.body, null, 2)),
                }}
              />
              <CopyButton
                text={JSON.stringify(tryResult.body, null, 2)}
                testId={`copy-result-${cardId}`}
              />
            </div>
          </div>
        )}

        {/* Sensitive Fields Notice */}
        {ep.fieldsToStrip && ep.fieldsToStrip.length > 0 && (
          <div
            className="flex items-start gap-2 px-4 py-3 bg-[#18181B]/60 border border-[#27272A] rounded-sm"
            data-testid={`sensitive-fields-${cardId}`}
          >
            <Shield className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-xs text-amber-400 font-medium">
                {ep.fieldsToStrip.length} sensitive field
                {ep.fieldsToStrip.length !== 1 ? "s" : ""} auto-filtered from response:
              </span>
              <span className="text-xs text-[#71717A] ml-2">
                {ep.fieldsToStrip.join(" · ")}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ApiKeyBar({ apiKey, setApiKey, defaultApiKey }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="bg-[#0F0F12] border border-[#27272A] rounded-sm px-4 py-3 flex items-center gap-3"
      data-testid="api-key-bar"
    >
      <div className="flex items-center gap-2 shrink-0">
        <Key className="w-4 h-4 text-[#2563EB]" />
        <span className="text-xs uppercase tracking-wider text-[#71717A] font-medium">
          API Key
        </span>
      </div>
      <input
        type={show ? "text" : "password"}
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="sk_live_…"
        data-testid="api-key-input"
        className="flex-1 bg-[#09090B] border border-[#27272A] focus:border-[#2563EB] focus:outline-none rounded-sm px-3 py-1.5 text-xs font-mono text-[#FAFAFA] placeholder-[#52525B] transition-colors"
      />
      <button
        onClick={() => setShow((s) => !s)}
        title={show ? "Hide key" : "Show key"}
        data-testid="api-key-toggle"
        className="p-1.5 text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#18181B] rounded-sm transition-colors"
      >
        {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
      <button
        onClick={handleCopy}
        disabled={!apiKey}
        title="Copy key"
        data-testid="api-key-copy"
        className="p-1.5 text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#18181B] disabled:opacity-40 disabled:hover:bg-transparent rounded-sm transition-colors"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
      {defaultApiKey && apiKey !== defaultApiKey && (
        <button
          onClick={() => setApiKey(defaultApiKey)}
          data-testid="api-key-reset"
          className="text-[11px] uppercase tracking-wider text-[#71717A] hover:text-[#2563EB] transition-colors px-2 py-1"
        >
          Reset
        </button>
      )}
    </div>
  );
}

export default function DocsPage() {
  const { slug } = useParams();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [activeTab, setActiveTab] = useState("api");
  const [apiKey, setApiKey] = useState("");
  const mainRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/projects/${slug}/docs-config`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setConfig(data);
        setApiKey(data.defaultApiKey || "");
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const groups = config ? groupEndpoints(config.endpoints) : {};
  const allCards = useMemo(
    () =>
      config
        ? config.endpoints.map((ep) => ({
            ...ep,
            cardId: `${ep.method}-${ep.path.replace(/\//g, "_")}`,
          }))
        : [],
    [config]
  );

  const scrollTo = useCallback((cardId) => {
    const el = document.getElementById(cardId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(cardId);
    }
  }, []);

  useEffect(() => {
    if (!allCards.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0.1 }
    );
    for (const card of allCards) {
      const el = document.getElementById(card.cardId);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [allCards]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#2563EB] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center gap-3">
        <p className="text-red-400 text-sm">{error}</p>
        <p className="text-[#71717A] text-xs">Make sure the project has been deployed.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B]" data-testid="docs-page">
      {/* Top Bar */}
      <header
        className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#09090B] border-b border-[#27272A] flex items-center justify-between px-6"
        data-testid="docs-top-bar"
      >
        <span className="text-[#FAFAFA] font-semibold text-base tracking-tight">
          {config.projectName} <span className="text-[#71717A] font-normal">API</span>
        </span>
        <span className="text-xs text-[#71717A]">
          Powered by <span className="text-[#2563EB] font-medium">Scalable</span>
        </span>
      </header>

      {/* Tab Navigation */}
      <div className="fixed top-14 left-0 right-0 z-40 h-12 bg-[#09090B] border-b border-[#27272A] flex items-center px-6 gap-4">
        <button
          onClick={() => setActiveTab("api")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === "api"
              ? "bg-[#27272A] text-[#FAFAFA]"
              : "text-[#71717A] hover:text-[#A1A1AA] hover:bg-[#18181B]"
          }`}
          data-testid="tab-api"
        >
          <BookOpen className="w-4 h-4" />
          API Reference
        </button>
        <button
          onClick={() => setActiveTab("sdk")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === "sdk"
              ? "bg-[#27272A] text-[#FAFAFA]"
              : "text-[#71717A] hover:text-[#A1A1AA] hover:bg-[#18181B]"
          }`}
          data-testid="tab-sdk"
        >
          <Code2 className="w-4 h-4" />
          SDK Guide
        </button>
      </div>

      {/* TOC Sidebar */}
      {activeTab === "api" && (
        <aside
          className="fixed left-0 top-26 bottom-0 w-56 bg-[#09090B] border-r border-[#27272A] overflow-y-auto py-4 px-3 z-40"
          data-testid="docs-toc"
        >
          {Object.entries(groups).map(([group, eps]) => (
            <div key={group} className="mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#71717A] px-2 mb-2">
                {group}
              </p>
              {eps.map((ep) => {
                const cardId = `${ep.method}-${ep.path.replace(/\//g, "_")}`;
                const isActive = activeId === cardId;
                const mc = METHOD_COLORS[ep.method] || METHOD_COLORS.GET;
                return (
                  <button
                    key={cardId}
                    onClick={() => scrollTo(cardId)}
                    data-testid={`toc-${cardId}`}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-sm transition-colors text-xs ${
                      isActive
                        ? "bg-[#2563EB]/10 text-[#2563EB]"
                        : "text-[#A1A1AA] hover:bg-[#18181B] hover:text-[#FAFAFA]"
                    }`}
                  >
                    <span className={`font-mono font-bold text-[10px] ${mc.text} w-9 shrink-0`}>
                      {ep.method}
                    </span>
                    <span className="font-mono truncate text-[11px]">{ep.path}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </aside>
      )}

      {/* Main content */}
      <main
        ref={mainRef}
        className={`pt-26 min-h-screen ${activeTab === "api" ? "ml-56" : "ml-0"}`}
        data-testid="docs-main"
      >
        {activeTab === "api" ? (
          <div className="max-w-3xl mx-auto px-8 py-8 space-y-6">
            {/* Intro */}
            <div className="mb-4 pt-20">
              <h1 className="text-[#FAFAFA] text-2xl font-semibold tracking-tight mb-1">
                {config.projectName} API Reference
              </h1>
              <p className="text-[#71717A] text-sm">
                Base URL:{" "}
                <code className="font-mono text-[#2563EB] text-xs bg-[#2563EB]/10 px-1.5 py-0.5 rounded-sm">
                  {config.gatewayUrl}
                </code>
              </p>
              {config.gatewayFallback && config.gatewayDomain && (
                <p className="text-[#52525B] text-xs mt-1">
                  Fallback: <code className="font-mono">{config.gatewayFallback}</code>
                </p>
              )}
            </div>

            {/* Sticky API key bar — used by every Try It */}
            <div className="sticky top-26 z-30 -mx-2 px-2 py-2 bg-[#09090B]/95 backdrop-blur-sm">
              <ApiKeyBar
                apiKey={apiKey}
                setApiKey={setApiKey}
                defaultApiKey={config.defaultApiKey}
              />
            </div>

            {/* Endpoint Cards */}
            {allCards.map((ep) => (
              <EndpointCard
                key={ep.cardId}
                ep={ep}
                gatewayUrl={config.gatewayUrl}
                gatewayFallback={config.gatewayFallback}
                apiKey={apiKey}
                spec={config.spec}
                cardId={ep.cardId}
              />
            ))}

            {allCards.length === 0 && (
              <div className="text-center py-20">
                <p className="text-[#71717A] text-sm">No endpoints documented yet.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-8 py-8">
            <div className="prose prose-invert prose-sm max-w-none">
              {config.sdkDocs ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    h1: ({ node, ...props }) => (
                      <h1 className="text-3xl font-bold text-[#FAFAFA] mb-4 mt-8" {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2
                        className="text-2xl font-semibold text-[#FAFAFA] mb-3 mt-6 border-b border-[#27272A] pb-2"
                        {...props}
                      />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3 className="text-xl font-medium text-[#FAFAFA] mb-2 mt-4" {...props} />
                    ),
                    p: ({ node, ...props }) => (
                      <p className="text-[#A1A1AA] mb-4 leading-7" {...props} />
                    ),
                    code: ({ node, inline, ...props }) =>
                      inline ? (
                        <code
                          className="text-[#2563EB] bg-[#2563EB]/10 px-1.5 py-0.5 rounded text-sm font-mono"
                          {...props}
                        />
                      ) : (
                        <code
                          className="block bg-[#0d1117] text-[#c9d1d9] p-4 rounded-lg overflow-x-auto text-sm font-mono"
                          {...props}
                        />
                      ),
                    pre: ({ node, ...props }) => (
                      <pre className="bg-[#0d1117] rounded-lg overflow-hidden mb-4" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul className="list-disc list-inside text-[#A1A1AA] mb-4 space-y-2" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol
                        className="list-decimal list-inside text-[#A1A1AA] mb-4 space-y-2"
                        {...props}
                      />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="text-[#A1A1AA] ml-4" {...props} />
                    ),
                    a: ({ node, ...props }) => (
                      <a className="text-[#2563EB] hover:text-[#3B82F6] underline" {...props} />
                    ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote
                        className="border-l-4 border-[#27272A] pl-4 italic text-[#71717A] my-4"
                        {...props}
                      />
                    ),
                  }}
                >
                  {config.sdkDocs}
                </ReactMarkdown>
              ) : (
                <div className="text-center py-20">
                  <Code2 className="w-12 h-12 text-[#3F3F46] mx-auto mb-4" />
                  <p className="text-[#FAFAFA] font-medium mb-1">
                    SDK Documentation Coming Soon
                  </p>
                  <p className="text-[#71717A] text-sm">
                    SDK docs will be generated when you deploy this project.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
