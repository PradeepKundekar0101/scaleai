import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Copy, Check, Play, Shield, ChevronRight, BookOpen, Code2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

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
      let cls = "text-blue-400"; // number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "text-[#FAFAFA]"; // key
          match = match.slice(0, -1); // remove colon for styling
          return `<span class="${cls}">${escapeHtml(match)}</span>:`;
        } else {
          cls = "text-emerald-400"; // string value
        }
      } else if (/true|false/.test(match)) {
        cls = "text-amber-400"; // boolean
      } else if (/null/.test(match)) {
        cls = "text-red-400"; // null
      }
      return `<span class="${cls}">${escapeHtml(match)}</span>`;
    }
  );
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

function EndpointCard({ ep, gatewayUrl, gatewayFallback, defaultApiKey, cardId }) {
  const [tryResult, setTryResult] = useState(null);
  const [trying, setTrying] = useState(false);
  const colors = METHOD_COLORS[ep.method] || METHOD_COLORS.GET;

  // Show subdomain URL in docs, but use fallback for actual "Try It" requests
  const displayUrl = gatewayUrl;
  const tryItUrl = gatewayFallback || `${BACKEND_URL}${gatewayUrl}`;

  const curlExample = `curl -X ${ep.method} \\
  ${displayUrl}${ep.path} \\
  -H "X-API-Key: YOUR_API_KEY"`;

  const handleTry = async () => {
    setTrying(true);
    setTryResult(null);
    const start = performance.now();
    try {
      const resp = await fetch(`${tryItUrl}${ep.path}`, {
        method: ep.method,
        headers: {
          "X-API-Key": defaultApiKey,
          "Content-Type": "application/json",
        },
      });
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
            <span className="text-[10px] uppercase tracking-wider text-[#71717A] block mb-1">Authentication</span>
            <span className="text-xs text-[#FAFAFA]">X-API-Key header required</span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#71717A] block mb-1">Rate Limit</span>
            <span className="text-xs text-[#FAFAFA]">{ep.rateLimit} requests / minute</span>
          </div>
        </div>

        {/* Example Request */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px bg-[#27272A] flex-1" />
            <span className="text-[10px] uppercase tracking-wider text-[#71717A]">Example Request</span>
            <div className="h-px bg-[#27272A] flex-1" />
          </div>
          <div className="relative">
            <pre className="bg-[#09090B] border border-[#27272A] rounded-sm px-4 py-3 font-mono text-xs text-[#A1A1AA] overflow-x-auto">
              {curlExample}
            </pre>
            <CopyButton text={curlExample} testId={`copy-curl-${cardId}`} />
          </div>
        </div>

        {/* Try It */}
        <div>
          <button
            onClick={handleTry}
            disabled={trying || !defaultApiKey}
            data-testid={`try-it-${cardId}`}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-colors border ${
              trying
                ? "border-[#27272A] bg-[#18181B] text-[#71717A] cursor-wait"
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
                {ep.fieldsToStrip.length} sensitive field{ep.fieldsToStrip.length !== 1 ? "s" : ""} auto-filtered from response:
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

export default function DocsPage() {
  const { slug } = useParams();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [activeTab, setActiveTab] = useState("api"); // "api" or "sdk"
  const mainRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/projects/${slug}/docs-config`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || `HTTP ${res.status}`);
        }
        setConfig(await res.json());
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

  // Track active section on scroll
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

      {/* TOC Sidebar - Only show for API tab */}
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
      <main ref={mainRef} className={`pt-26 min-h-screen ${activeTab === "api" ? "ml-56" : "ml-0"}`} data-testid="docs-main">
        {activeTab === "api" ? (
        <div className="max-w-3xl mx-auto px-8 py-8 space-y-6">
          {/* Intro */}
          <div className="mb-4">
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

          {/* Endpoint Cards */}
          {allCards.map((ep) => (
            <EndpointCard
              key={ep.cardId}
              ep={ep}
              gatewayUrl={config.gatewayUrl}
              gatewayFallback={config.gatewayFallback}
              defaultApiKey={config.defaultApiKey}
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
                  h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-[#FAFAFA] mb-4 mt-8" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-2xl font-semibold text-[#FAFAFA] mb-3 mt-6 border-b border-[#27272A] pb-2" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-xl font-medium text-[#FAFAFA] mb-2 mt-4" {...props} />,
                  p: ({node, ...props}) => <p className="text-[#A1A1AA] mb-4 leading-7" {...props} />,
                  code: ({node, inline, ...props}) => inline ? (
                    <code className="text-[#2563EB] bg-[#2563EB]/10 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                  ) : (
                    <code className="block bg-[#0d1117] text-[#c9d1d9] p-4 rounded-lg overflow-x-auto text-sm font-mono" {...props} />
                  ),
                  pre: ({node, ...props}) => <pre className="bg-[#0d1117] rounded-lg overflow-hidden mb-4" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc list-inside text-[#A1A1AA] mb-4 space-y-2" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal list-inside text-[#A1A1AA] mb-4 space-y-2" {...props} />,
                  li: ({node, ...props}) => <li className="text-[#A1A1AA] ml-4" {...props} />,
                  a: ({node, ...props}) => <a className="text-[#2563EB] hover:text-[#3B82F6] underline" {...props} />,
                  blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-[#27272A] pl-4 italic text-[#71717A] my-4" {...props} />,
                }}
              />
            ) : (
              <div className="text-center py-20">
                <Code2 className="w-12 h-12 text-[#3F3F46] mx-auto mb-4" />
                <p className="text-[#FAFAFA] font-medium mb-1">SDK Documentation Coming Soon</p>
                <p className="text-[#71717A] text-sm">SDK docs will be generated when you deploy this project.</p>
              </div>
            )}
          </div>
        </div>
        )}
      </main>
    </div>
  );
}
