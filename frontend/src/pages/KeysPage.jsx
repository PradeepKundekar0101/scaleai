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
          <div className="h-4 w-20 skeleton mb-4" />
          <div className="flex items-start justify-between mb-8">
            <div className="space-y-2">
              <div className="h-7 w-32 skeleton" />
              <div className="h-4 w-24 skeleton" />
            </div>
            <div className="h-9 w-36 skeleton" />
          </div>
          <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
            <div className="bg-[var(--bg-secondary)] h-10 border-b border-[var(--border-primary)]" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-6 px-4 py-4 border-b border-[var(--border-primary)]">
                <div className="h-4 w-28 skeleton" />
                <div className="h-4 w-32 skeleton" />
                <div className="h-4 w-16 skeleton" />
                <div className="h-4 w-24 skeleton" />
                <div className="h-4 w-16 skeleton" />
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
          className="flex items-center gap-1.5 text-xs text-[var(--text-primary)]/50 hover:text-[var(--text-primary)] transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to project
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1
              className="text-[var(--text-primary)] text-3xl font-semibold tracking-tight leading-[0.96]"
              data-testid="keys-title"
            >
              API Keys
            </h1>
            <p className="text-[var(--text-primary)]/50 text-sm mt-1.5">{project?.name}</p>
            <p className="text-[var(--text-primary)]/30 text-xs mt-0.5">
              Manage access to your public API.
            </p>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            data-testid="create-key-btn"
            className="bg-[#292827] hover:bg-[var(--text-primary)] text-white rounded-lg text-sm font-semibold h-10 px-5"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create New Key
          </Button>
        </div>

        {/* Keys Table or Empty State */}
        {keys.length === 0 ? (
          <div
            className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl flex flex-col items-center justify-center py-20 shadow-sm"
            data-testid="keys-empty-state"
          >
            <Key className="w-10 h-10 text-[var(--text-primary)]/20 mb-4" strokeWidth={1.5} />
            <h3 className="text-[var(--text-primary)] font-semibold text-lg mb-1">
              No API keys yet
            </h3>
            <p className="text-[var(--text-primary)]/50 text-sm mb-5">
              Create your first API key to start using the API
            </p>
            <Button
              onClick={() => setShowCreate(true)}
              data-testid="create-key-empty-btn"
              className="bg-[#292827] hover:bg-[var(--text-primary)] text-white rounded-lg text-sm font-semibold h-10 px-5"
            >
              Create Key
            </Button>
          </div>
        ) : (
          <div
            className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden shadow-sm"
            data-testid="keys-table"
          >
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider uppercase text-[var(--text-primary)]/50">
                    Key Name
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider uppercase text-[var(--text-primary)]/50">
                    Key
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider uppercase text-[var(--text-primary)]/50">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider uppercase text-[var(--text-primary)]/50">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider uppercase text-[var(--text-primary)]/50">
                    Rate Limit
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold tracking-wider uppercase text-[var(--text-primary)]/50">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr
                    key={k.id}
                    data-testid={`key-row-${k.id}`}
                    className={`border-b border-[var(--border-primary)] transition-colors ${
                      k.isActive ? "" : "opacity-50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm text-[var(--text-primary)] font-medium">{k.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <code className="font-mono text-xs text-[var(--text-primary)]/60">
                        {k.keyPrefix}...
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            k.isActive ? "bg-emerald-600" : "bg-[#292827]/30"
                          }`}
                        />
                        {k.isActive ? (
                          <span className="text-emerald-700 font-medium">Active</span>
                        ) : (
                          <span className="text-[var(--text-primary)]/40">Revoked</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--text-primary)]/50">
                        {formatDate(k.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--text-primary)]/50 font-mono">
                        {k.isActive ? `${k.rateLimit}/min` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {k.isActive && (
                        <button
                          onClick={() => setRevokeTarget(k)}
                          data-testid={`revoke-key-${k.id}`}
                          className="text-xs text-red-600 hover:text-red-700 transition-colors font-medium"
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
          className="bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-primary)] sm:max-w-md rounded-2xl"
          data-testid="create-key-modal"
        >
          {!createdKey ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-[var(--text-primary)] text-xl font-semibold">Create New API Key</DialogTitle>
                <DialogDescription className="text-[var(--text-primary)]/50 text-sm">
                  Give your key a descriptive name so you can identify it later.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production Key, Partner - Acme Corp"
                  data-testid="key-name-input"
                  className="bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/30 focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--lavender)]/30 rounded-lg h-11 text-sm"
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={closeCreateModal}
                  className="border-[var(--border-primary)] text-[var(--text-primary)]/60 hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={creating || !newKeyName.trim()}
                  data-testid="confirm-create-key-btn"
                  className="bg-[#292827] hover:bg-[var(--text-primary)] text-white rounded-lg font-semibold"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                  Create Key
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-[var(--text-primary)] text-xl font-semibold">API Key Created</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div
                  className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg px-4 py-3 flex items-center gap-3"
                  data-testid="created-key-display"
                >
                  <code className="font-mono text-xs text-[var(--text-primary)] flex-1 break-all select-all">
                    {createdKey}
                  </code>
                  <button
                    onClick={copyKey}
                    data-testid="copy-created-key-btn"
                    className="p-1.5 text-[var(--text-primary)]/40 hover:text-[var(--text-primary)] transition-colors shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-amber-600 flex items-center gap-1.5" data-testid="key-warning">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Copy this key now. You won't see it again.
                </p>
              </div>
              <DialogFooter>
                <Button
                  onClick={closeCreateModal}
                  data-testid="done-create-key-btn"
                  className="bg-[#292827] hover:bg-[var(--text-primary)] text-white rounded-lg font-semibold w-full"
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
          className="bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-primary)] sm:max-w-sm rounded-2xl"
          data-testid="revoke-key-modal"
        >
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)] flex items-center gap-2 text-xl font-semibold">
              <ShieldOff className="w-5 h-5 text-red-600" />
              Revoke API Key
            </DialogTitle>
            <DialogDescription className="text-[var(--text-primary)]/60 text-sm">
              Revoke <strong className="text-[var(--text-primary)]">{revokeTarget?.name}</strong>?
              API consumers using it will immediately lose access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setRevokeTarget(null)}
              className="border-[var(--border-primary)] text-[var(--text-primary)]/60 hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRevoke}
              disabled={revoking}
              data-testid="confirm-revoke-key-btn"
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
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
