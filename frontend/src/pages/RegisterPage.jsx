import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    setLoading(true);
    const result = await register(name, email, password);
    setLoading(false);
    if (result.success) {
      navigate("/");
    } else {
      toast.error(result.error || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left: Image */}
      <div className="hidden lg:block flex-1 relative overflow-hidden">
        <img
          src="/img1.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#1b1938]/40 via-transparent to-[#1b1938]/30" />
        <div className="absolute bottom-0 left-0 right-0 p-10">
          <div className="backdrop-blur-md bg-black/20 border border-white/10 rounded-2xl p-6 max-w-sm">
            <h2 className="text-2xl font-semibold text-white leading-tight tracking-tight mb-2">
              Start building<br />your platform
            </h2>
            <p className="text-white/70 text-sm leading-relaxed">
              Connect, configure, deploy — all in minutes
            </p>
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-sm">
          <Link to="/landing" className="flex items-center gap-2.5 mb-12">
            <img src="/logo-small.png" alt="Scalable" className="w-8 h-8 object-contain" />
            <span className="text-[#292827] font-semibold text-xl tracking-tight">Scalable</span>
          </Link>

          <h1 className="text-3xl font-semibold text-[#292827] leading-[0.96] tracking-tight mb-2">Create your account</h1>
          <p className="text-[#292827]/50 text-sm mb-8">Get started with Scalable in seconds</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#292827] mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                data-testid="register-name"
                className="w-full h-11 px-3.5 border border-[#dcd7d3] rounded-lg text-[#292827] text-sm placeholder:text-[#292827]/30 focus:outline-none focus:border-[#714cb6] focus:ring-1 focus:ring-[#cbb7fb]/30 transition-colors bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#292827] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                data-testid="register-email"
                className="w-full h-11 px-3.5 border border-[#dcd7d3] rounded-lg text-[#292827] text-sm placeholder:text-[#292827]/30 focus:outline-none focus:border-[#714cb6] focus:ring-1 focus:ring-[#cbb7fb]/30 transition-colors bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#292827] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                data-testid="register-password"
                className="w-full h-11 px-3.5 border border-[#dcd7d3] rounded-lg text-[#292827] text-sm placeholder:text-[#292827]/30 focus:outline-none focus:border-[#714cb6] focus:ring-1 focus:ring-[#cbb7fb]/30 transition-colors bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              data-testid="register-submit"
              className="w-full h-11 bg-[#292827] text-white rounded-lg text-sm font-semibold hover:bg-[#1a1918] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Create Account</span><ArrowRight className="w-3.5 h-3.5" /></>}
            </button>
          </form>

          <p className="text-sm text-[#292827]/50 text-center mt-8">
            Already have an account?{" "}
            <Link to="/login" className="text-[#714cb6] underline underline-offset-2 font-medium hover:text-[#5c3d99]">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
