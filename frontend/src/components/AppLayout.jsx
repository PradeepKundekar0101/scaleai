import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#09090B]">
      <Sidebar />
      <main className="ml-64 min-h-screen" data-testid="main-content">
        <div className="max-w-6xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
