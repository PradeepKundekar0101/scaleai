import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      navigate("/");
    } else {
      toast.error(result.error || "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left: Form */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-sm">
          <Link to="/landing" className="flex items-center gap-2.5 mb-12">
            <div className="w-8 h-8 bg-[#1b1938] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">S</span>
            </div>
            <span className="text-[#292827] font-semibold text-xl tracking-tight">Scalable</span>
          </Link>

          <h1 className="text-3xl font-semibold text-[#292827] leading-[0.96] tracking-tight mb-2">Welcome back</h1>
          <p className="text-[#292827]/50 text-sm mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#292827] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                data-testid="login-email"
                className="w-full h-11 px-3.5 border border-[#dcd7d3] rounded-lg text-[#292827] text-sm placeholder:text-[#292827]/30 focus:outline-none focus:border-[#714cb6] focus:ring-1 focus:ring-[#cbb7fb]/30 transition-colors bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#292827] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                data-testid="login-password"
                className="w-full h-11 px-3.5 border border-[#dcd7d3] rounded-lg text-[#292827] text-sm placeholder:text-[#292827]/30 focus:outline-none focus:border-[#714cb6] focus:ring-1 focus:ring-[#cbb7fb]/30 transition-colors bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit"
              className="w-full h-11 bg-[#292827] text-white rounded-lg text-sm font-semibold hover:bg-[#1a1918] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Sign In</span><ArrowRight className="w-3.5 h-3.5" /></>}
            </button>
          </form>

          <p className="text-sm text-[#292827]/50 text-center mt-8">
            Don't have an account?{" "}
            <Link to="/register" className="text-[#714cb6] underline underline-offset-2 font-medium hover:text-[#5c3d99]">Create one</Link>
          </p>
        </div>
      </div>

      {/* Right: Decorative */}
      <div className="hidden lg:flex flex-1 bg-[#1b1938] items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-[#cbb7fb]/25 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 w-56 h-56 bg-[#714cb6]/20 rounded-full blur-3xl" />
        </div>
        <div className="relative text-center px-12">
          <h2 className="text-4xl font-semibold text-white/95 leading-[0.96] tracking-tight mb-4">
            Turn any SaaS<br />into a Platform
          </h2>
          <p className="text-white/60 text-base max-w-sm mx-auto leading-relaxed">
            API gateway, docs, and SDKs — generated in minutes
          </p>
        </div>
      </div>
    </div>
  );
}
