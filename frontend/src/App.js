import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import ConnectPage from "@/pages/ConnectPage";
import EndpointsPage from "@/pages/EndpointsPage";
import KeysPage from "@/pages/KeysPage";
import DocsPage from "@/pages/DocsPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import PlaceholderPage from "@/pages/PlaceholderPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: "#0F0F12",
              border: "1px solid #27272A",
              color: "#FAFAFA",
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/connect" element={<ProtectedRoute><ConnectPage /></ProtectedRoute>} />
          <Route path="/endpoints/:projectId" element={<ProtectedRoute><EndpointsPage /></ProtectedRoute>} />
          <Route path="/keys/:projectId" element={<ProtectedRoute><KeysPage /></ProtectedRoute>} />
          <Route path="/docs/:slug" element={<DocsPage />} />
          <Route path="/analytics/:projectId" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><PlaceholderPage /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
