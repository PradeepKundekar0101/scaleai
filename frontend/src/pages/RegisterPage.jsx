import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Github, Loader2 } from "lucide-react";
import { toast } from "sonner";

const AUTH_BG = "https://static.prod-images.emergentagent.com/jobs/667b9152-5f4f-4a8b-9879-e37549147a68/images/95258b6860400655d16c62e09d214a8dcd9aa398c084933ca6ea3caf50b5220d.png";

export default function RegisterPage() {
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (authLoading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const result = await register(name, email, password);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
    }
  };

  const handleGithub = () => {
    toast.info("GitHub OAuth coming soon");
  };

  return (
    <div className="min-h-screen flex bg-[#09090B]" data-testid="register-page">
      {/* Left: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div>
            <h1 className="text-[#2563EB] font-semibold text-2xl tracking-tight" data-testid="register-logo">Scalable</h1>
            <p className="text-[#A1A1AA] text-sm mt-1">Create your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">
            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2 rounded-sm" data-testid="register-error">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-[#A1A1AA] text-xs uppercase tracking-wider">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                data-testid="register-name-input"
                className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#3F3F46] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded-sm h-10"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#A1A1AA] text-xs uppercase tracking-wider">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                data-testid="register-email-input"
                className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#3F3F46] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded-sm h-10"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#A1A1AA] text-xs uppercase tracking-wider">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                data-testid="register-password-input"
                className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#3F3F46] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded-sm h-10"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="register-submit-btn"
              className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-sm h-10 text-sm font-medium"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#27272A]" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-[#09090B] px-2 text-[#71717A]">or</span></div>
          </div>

          <Button
            variant="outline"
            onClick={handleGithub}
            data-testid="register-github-btn"
            className="w-full border-[#27272A] text-[#A1A1AA] hover:bg-[#18181B] hover:text-[#FAFAFA] rounded-sm h-10 text-sm"
          >
            <Github className="w-4 h-4 mr-2" />
            Continue with GitHub
          </Button>

          <p className="text-center text-sm text-[#71717A]">
            Already have an account?{" "}
            <Link to="/login" data-testid="register-login-link" className="text-[#2563EB] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right: Visual */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden border-l border-[#27272A]">
        <img src={AUTH_BG} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-transparent to-transparent" />
        <div className="absolute bottom-12 left-12 right-12">
          <p className="text-[#FAFAFA] text-xl font-medium tracking-tight">Ship your API platform faster.</p>
          <p className="text-[#71717A] text-sm mt-2">Automated route discovery, security scanning, and SDK generation.</p>
        </div>
      </div>
    </div>
  );
}
