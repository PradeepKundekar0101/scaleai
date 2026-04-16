import AppLayout from "@/components/AppLayout";
import { useLocation } from "react-router-dom";
import { Construction } from "lucide-react";

export default function PlaceholderPage() {
  const { pathname } = useLocation();
  const pageName = pathname.replace("/", "").charAt(0).toUpperCase() + pathname.slice(2);

  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center py-32" data-testid="placeholder-page">
        <Construction className="w-12 h-12 text-[#3F3F46] mb-4" strokeWidth={1} />
        <h2 className="text-[#FAFAFA] font-medium text-lg mb-1">{pageName || "Page"}</h2>
        <p className="text-[#71717A] text-sm">Coming in Phase 2</p>
      </div>
    </AppLayout>
  );
}
