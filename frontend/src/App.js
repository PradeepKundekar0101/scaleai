import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import ConnectPage from "@/pages/ConnectPage";
import EndpointsPage from "@/pages/EndpointsPage";
import KeysPage from "@/pages/KeysPage";
import DocsPage from "@/pages/DocsPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import PlaceholderPage from "@/pages/PlaceholderPage";
import ProjectSelectPage from "@/pages/ProjectSelectPage";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                borderRadius: "16px",
              },
            }}
          />
          <Routes>
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/connect" element={<ProtectedRoute><ConnectPage /></ProtectedRoute>} />
            <Route path="/endpoints/:projectId" element={<ProtectedRoute><EndpointsPage /></ProtectedRoute>} />
            <Route path="/keys/:projectId" element={<ProtectedRoute><KeysPage /></ProtectedRoute>} />
            <Route path="/keys" element={<ProtectedRoute><ProjectSelectPage title="API Keys" description="Select a project to manage its API keys" buildPath={(p) => `/keys/${p.id}`} /></ProtectedRoute>} />
            <Route path="/docs/:slug" element={<DocsPage />} />
            <Route path="/docs" element={<ProtectedRoute><ProjectSelectPage title="Documentation" description="Select a project to view its API documentation" buildPath={(p) => `/docs/${p.slug}`} /></ProtectedRoute>} />
            <Route path="/analytics/:projectId" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><ProjectSelectPage title="Analytics" description="Select a project to view its analytics" buildPath={(p) => `/analytics/${p.id}`} /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><PlaceholderPage /></ProtectedRoute>} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
