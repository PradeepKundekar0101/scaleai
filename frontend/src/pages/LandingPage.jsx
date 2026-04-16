import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Zap, Shield, Package, BarChart3, Code2, Globe } from "lucide-react";

const features = [
  {
    icon: Code2,
    title: "AI-Powered Discovery",
    desc: "Our AI agents scan your codebase, follow import chains, and discover every API route with security risk assessment.",
  },
  {
    icon: Shield,
    title: "Security-First Gateway",
    desc: "API key authentication, rate limiting, and automatic response filtering strip sensitive fields before they leave your backend.",
  },
  {
    icon: Package,
    title: "Auto-Published SDK",
    desc: "A typed TypeScript SDK is generated and published to npm automatically. Your customers install and start building in minutes.",
  },
  {
    icon: Globe,
    title: "Subdomain Routing",
    desc: "Each project gets its own subdomain gateway. Clean, professional API endpoints your customers will love.",
  },
  {
    icon: BarChart3,
    title: "Usage Analytics",
    desc: "Monitor every request through your gateway. Track usage by endpoint, API key, and time — all in real-time.",
  },
  {
    icon: Zap,
    title: "Zero Code Changes",
    desc: "Scalable sits as a managed reverse proxy in front of your backend. Your codebase is never touched or modified.",
  },
];

const steps = [
  { num: "01", title: "Connect", desc: "Paste your GitHub repo URL. AI agents scan your codebase and discover all API routes." },
  { num: "02", title: "Select", desc: "Review discovered endpoints with AI risk scores. Choose which to expose publicly." },
  { num: "03", title: "Deploy", desc: "One click deploys an API gateway, generates docs, publishes a typed SDK to npm." },
  { num: "04", title: "Manage", desc: "Create API keys, monitor analytics, and manage endpoints through the dashboard." },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-[#1b1938]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo-light-small.png" alt="Scalable" className="w-7 h-7 object-contain" />
            <span className="text-white font-semibold text-lg tracking-tight">Scalable</span>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/" className="bg-[#e9e5dd] text-[#292827] px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#ddd8cf] transition-colors">
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-white/80 text-sm font-medium hover:text-white transition-colors px-3 py-2">
                  Sign In
                </Link>
                <Link to="/register" className="bg-[#e9e5dd] text-[#292827] px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#ddd8cf] transition-colors">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-[#1b1938] pt-32 pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1b1938] via-[#241f4a] to-[#1b1938]" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#cbb7fb]/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-[#714cb6]/15 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 px-4 py-1.5 rounded-lg mb-8">
            <Zap className="w-3.5 h-3.5 text-[#cbb7fb]" />
            <span className="text-white/80 text-sm font-medium">AI-Powered Platform Conversion</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-semibold text-white/95 leading-[0.96] tracking-tight mb-6">
            Turn any SaaS<br />into a Platform
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            API gateway, interactive documentation, and typed SDKs — generated and deployed in minutes, not months.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to={isAuthenticated ? "/" : "/register"}
              className="inline-flex items-center gap-2 bg-[#e9e5dd] text-[#292827] px-7 py-3 rounded-lg text-base font-semibold hover:bg-[#ddd8cf] transition-colors"
            >
              {isAuthenticated ? "Go to Dashboard" : "Get Started"}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/docs/quickbite"
              className="inline-flex items-center gap-2 text-white/80 border border-white/20 px-7 py-3 rounded-lg text-base font-medium hover:bg-white/5 transition-colors"
            >
              See Demo Docs
            </Link>
          </div>
        </div>
      </section>

      {/* Transition gradient */}
      <div className="h-24 bg-gradient-to-b from-[#1b1938] to-white" />

      {/* How it Works */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-semibold text-[#292827] leading-[0.96] tracking-tight text-center mb-4">
            How it works
          </h2>
          <p className="text-center text-[#292827]/60 text-lg mb-16 max-w-xl mx-auto">
            Four steps from internal API to public platform
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s) => (
              <div key={s.num} className="group">
                <div className="text-5xl font-bold text-[#cbb7fb]/40 mb-3 leading-none">{s.num}</div>
                <h3 className="text-xl font-semibold text-[#292827] mb-2">{s.title}</h3>
                <p className="text-sm text-[#292827]/60 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Screenshot Placeholder */}
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-[#f5f3f0] border border-[#dcd7d3] rounded-2xl h-[420px] flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#e9e5dd] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Code2 className="w-7 h-7 text-[#292827]/50" />
              </div>
              <p className="text-[#292827]/40 text-sm font-medium">Product Screenshot Placeholder</p>
              <p className="text-[#292827]/30 text-xs mt-1">Dashboard / Endpoint Selection View</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-semibold text-[#292827] leading-[0.96] tracking-tight text-center mb-4">
            Everything you need
          </h2>
          <p className="text-center text-[#292827]/60 text-lg mb-16 max-w-xl mx-auto">
            A complete platform-as-a-service toolkit, powered by AI
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="border border-[#dcd7d3] rounded-2xl p-7 hover:border-[#cbb7fb]/40 transition-colors"
              >
                <div className="w-10 h-10 bg-[#cbb7fb]/15 rounded-xl flex items-center justify-center mb-5">
                  <f.icon className="w-5 h-5 text-[#714cb6]" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-[#292827] mb-2">{f.title}</h3>
                <p className="text-sm text-[#292827]/60 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-semibold text-[#292827] leading-[0.96] tracking-tight mb-5">
            Ready to become a platform?
          </h2>
          <p className="text-[#292827]/60 text-lg mb-8">
            Connect your repo and deploy your public API in minutes.
          </p>
          <Link
            to={isAuthenticated ? "/" : "/register"}
            className="inline-flex items-center gap-2 bg-[#292827] text-white px-8 py-3.5 rounded-lg text-base font-semibold hover:bg-[#1a1918] transition-colors"
          >
            {isAuthenticated ? "Go to Dashboard" : "Get Started for Free"}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#dcd7d3] py-10 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo-light-small.png" alt="Scalable" className="w-6 h-6 object-contain" />
            <span className="text-[#292827]/60 text-sm">Scalable</span>
          </div>
          <p className="text-[#292827]/40 text-sm">Turn any SaaS into a PaaS</p>
        </div>
      </footer>
    </div>
  );
}
