import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Key,
  Plus,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  ShieldOff,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function KeysPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState(null);
  const [copied, setCopied] = useState(false);

  // Revoke modal
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revoking, setRevoking] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [projRes, keysRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/keys`),
      ]);
      setProject(projRes.data);
      setKeys(keysRes.data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post(`/projects/${projectId}/keys`, {
        name: newKeyName.trim(),
      });
      setCreatedKey(data.apiKey);
      // Refresh keys list
      const keysRes = await api.get(`/projects/${projectId}/keys`);
      setKeys(keysRes.data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed to create key");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await api.delete(`/keys/${revokeTarget.id}`);
      toast.success("API key revoked");
      setRevokeTarget(null);
      const keysRes = await api.get(`/projects/${projectId}/keys`);
      setKeys(keysRes.data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed to revoke key");
    } finally {
      setRevoking(false);
    }
  };

  const copyKey = () => {
    if (!createdKey) return;
    navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard");
  };

  const closeCreateModal = () => {
    setShowCreate(false);
    setNewKeyName("");
    setCreatedKey(null);
    setCopied(false);
  };

  if (loading) {
    return (
      <AppLayout>
        <div data-testid="keys-loading" className="pb-12">
          <div className="h-4 w-20 bg-[#18181B] rounded-sm animate-pulse mb-4" />
          <div className="flex items-start justify-between mb-8">
            <div className="space-y-2">
              <div className="h-7 w-32 bg-[#18181B] rounded-sm animate-pulse" />
              <div className="h-4 w-24 bg-[#18181B] rounded-sm animate-pulse" />
            </div>
            <div className="h-9 w-36 bg-[#18181B] rounded-sm animate-pulse" />
          </div>
          <div className="bg-[#0F0F12] border border-[#27272A] rounded-sm overflow-hidden">
            <div className="bg-[#18181B] h-10 border-b border-[#27272A]" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-6 px-4 py-4 border-b border-[#27272A]">
                <div className="h-4 w-28 bg-[#18181B] rounded-sm animate-pulse" />
                <div className="h-4 w-32 bg-[#18181B] rounded-sm animate-pulse" />
                <div className="h-4 w-16 bg-[#18181B] rounded-sm animate-pulse" />
                <div className="h-4 w-24 bg-[#18181B] rounded-sm animate-pulse" />
                <div className="h-4 w-16 bg-[#18181B] rounded-sm animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div data-testid="keys-page" className="pb-12">
        {/* Back */}
        <button
          onClick={() => navigate(`/endpoints/${projectId}`)}
          data-testid="keys-back-btn"
          className="flex items-center gap-1.5 text-xs text-[#71717A] hover:text-[#FAFAFA] transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to project
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1
              className="text-[#FAFAFA] text-2xl font-semibold tracking-tight"
              data-testid="keys-title"
            >
              API Keys
            </h1>
            <p className="text-[#71717A] text-sm mt-1">{project?.name}</p>
            <p className="text-[#3F3F46] text-xs mt-0.5">
              Manage access to your public API.
            </p>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            data-testid="create-key-btn"
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-sm text-sm h-9 px-4"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create New Key
          </Button>
        </div>

        {/* Keys Table or Empty State */}
        {keys.length === 0 ? (
          <div
            className="bg-[#0F0F12] border border-[#27272A] rounded-sm flex flex-col items-center justify-center py-20"
            data-testid="keys-empty-state"
          >
            <Key className="w-10 h-10 text-[#3F3F46] mb-4" strokeWidth={1.5} />
            <h3 className="text-[#FAFAFA] font-medium text-base mb-1">
              No API keys yet
            </h3>
            <p className="text-[#71717A] text-sm mb-5">
              Create your first API key to start using the API
            </p>
            <Button
              onClick={() => setShowCreate(true)}
              data-testid="create-key-empty-btn"
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-sm text-sm h-9 px-5"
            >
              Create Key
            </Button>
          </div>
        ) : (
          <div
            className="bg-[#0F0F12] border border-[#27272A] rounded-sm overflow-hidden"
            data-testid="keys-table"
          >
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="bg-[#18181B] border-b border-[#27272A]">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">
                    Key Name
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">
                    Key
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">
                    Rate Limit
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr
                    key={k.id}
                    data-testid={`key-row-${k.id}`}
                    className={`border-b border-[#27272A] transition-colors ${
                      k.isActive ? "" : "opacity-50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm text-[#FAFAFA]">{k.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <code className="font-mono text-xs text-[#A1A1AA]">
                        {k.keyPrefix}...
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            k.isActive ? "bg-[#22C55E]" : "bg-[#71717A]"
                          }`}
                        />
                        {k.isActive ? (
                          <span className="text-[#22C55E]">Active</span>
                        ) : (
                          <span className="text-[#71717A]">Revoked</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[#71717A]">
                        {formatDate(k.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[#A1A1AA] font-mono">
                        {k.isActive ? `${k.rateLimit}/min` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {k.isActive && (
                        <button
                          onClick={() => setRevokeTarget(k)}
                          data-testid={`revoke-key-${k.id}`}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Key Modal */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) closeCreateModal(); }}>
        <DialogContent
          className="bg-[#0F0F12] border-[#27272A] text-[#FAFAFA] sm:max-w-md"
          data-testid="create-key-modal"
        >
          {!createdKey ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#FAFAFA]">Create New API Key</DialogTitle>
                <DialogDescription className="text-[#71717A]">
                  Give your key a descriptive name so you can identify it later.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production Key, Partner - Acme Corp"
                  data-testid="key-name-input"
                  className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#3F3F46] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] rounded-sm h-10 text-sm"
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={closeCreateModal}
                  className="border-[#27272A] text-[#A1A1AA] hover:bg-[#18181B] rounded-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={creating || !newKeyName.trim()}
                  data-testid="confirm-create-key-btn"
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-sm"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                  Create Key
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#FAFAFA]">API Key Created</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div
                  className="bg-[#18181B] border border-[#27272A] rounded-sm px-4 py-3 flex items-center gap-3"
                  data-testid="created-key-display"
                >
                  <code className="font-mono text-xs text-[#FAFAFA] flex-1 break-all select-all">
                    {createdKey}
                  </code>
                  <button
                    onClick={copyKey}
                    data-testid="copy-created-key-btn"
                    className="p-1.5 text-[#71717A] hover:text-[#FAFAFA] transition-colors shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-[#EAB308] flex items-center gap-1.5" data-testid="key-warning">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Copy this key now. You won't see it again.
                </p>
              </div>
              <DialogFooter>
                <Button
                  onClick={closeCreateModal}
                  data-testid="done-create-key-btn"
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-sm w-full"
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Modal */}
      <Dialog open={!!revokeTarget} onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}>
        <DialogContent
          className="bg-[#0F0F12] border-[#27272A] text-[#FAFAFA] sm:max-w-sm"
          data-testid="revoke-key-modal"
        >
          <DialogHeader>
            <DialogTitle className="text-[#FAFAFA] flex items-center gap-2">
              <ShieldOff className="w-5 h-5 text-red-400" />
              Revoke API Key
            </DialogTitle>
            <DialogDescription className="text-[#A1A1AA]">
              Revoke <strong className="text-[#FAFAFA]">{revokeTarget?.name}</strong>?
              API consumers using it will immediately lose access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setRevokeTarget(null)}
              className="border-[#27272A] text-[#A1A1AA] hover:bg-[#18181B] rounded-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRevoke}
              disabled={revoking}
              data-testid="confirm-revoke-key-btn"
              className="bg-red-600 hover:bg-red-700 text-white rounded-sm"
            >
              {revoking && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
