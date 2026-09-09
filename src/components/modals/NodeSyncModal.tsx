"use client";

import React, { useState, useMemo } from "react";
import {
  Laptop,
  X,
  HardDrive,
  Cpu,
  RefreshCw,
  Plus,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Key,
  Copy,
  Check,
  Ban,
  RotateCw,
  Search,
  Filter,
  Layers,
  ChevronRight,
  ShieldAlert,
  GitCommit,
  Database,
} from "lucide-react";

export type NodeOperationalStatus =
  | "ONLINE"
  | "OFFLINE"
  | "TOKEN_EXPIRING_SOON"
  | "TOKEN_EXPIRED"
  | "REVOKED";

export interface AcademicNodeRecord {
  id: string;
  nodeCode: string;
  name: string;
  machineFingerprint: string;
  ipAddress?: string;
  osVersion?: string;
  pairingToken?: string;
  tokenExpiresAt?: string | Date;
  revokedAt?: string | Date | null;
  status: string; // ACTIVE | ONLINE | OFFLINE | REVOKED
  lastSeenAt?: string | Date;
  pullCursor?: string;
  offlineScansCount?: number;
  syncEngineState?: string;
  tenant?: { name: string; code: string };
  branch?: { name: string; code: string; city?: string };
  tenantId?: string;
  branchId?: string | null;
}

export interface SyncEventEnvelope {
  eventId: string;
  nodeId?: string;
  nodeCode?: string;
  entityType: "OMR_SCAN" | "EXAM_RESULT" | "ATTENDANCE_RECORD" | "ENROLLMENT" | "STUDENT_PROFILE_FIELD";
  entityId: string;
  entityVersion: number;
  op: "UPSERT" | "DELETE" | "APPEND";
  occurredAt: string;
  status: "APPLIED" | "DUPLICATE" | "CONFLICT" | "REJECTED" | "PENDING";
  conflictReason?: string | null;
  payload?: any;
}

// ---------------------------------------------------------------------------
// Pure helper functions (exported for UI unit testing)
// ---------------------------------------------------------------------------

/**
 * Calculates how many whole days remain before a token expires.
 * Returns negative numbers if already expired.
 */
export function getTokenRemainingDays(
  tokenExpiresAt?: string | Date,
  now: Date = new Date()
): number {
  if (!tokenExpiresAt) return 90; // Default 90-day window per C06
  const expiry = new Date(tokenExpiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Derives operational status from node fields per C06 & PRD Sec 33-35.
 */
export function getNodeOperationalStatus(
  node: AcademicNodeRecord,
  now: Date = new Date()
): NodeOperationalStatus {
  if (node.revokedAt) return "REVOKED";

  if (node.tokenExpiresAt) {
    const days = getTokenRemainingDays(node.tokenExpiresAt, now);
    if (days <= 0) return "TOKEN_EXPIRED";
    if (days <= 14) return "TOKEN_EXPIRING_SOON";
  }

  if (node.lastSeenAt) {
    const lastSeen = new Date(node.lastSeenAt);
    const diffMin = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
    if (diffMin <= 10) return "ONLINE";
  }

  if (node.status === "ONLINE" || node.status === "ACTIVE") {
    return "ONLINE";
  }

  return "OFFLINE";
}

/**
 * Filter event queue by entity type and status.
 */
export function filterSyncEvents(
  events: SyncEventEnvelope[],
  filters: { entityType?: string; status?: string; search?: string }
): SyncEventEnvelope[] {
  return events.filter((ev) => {
    if (filters.entityType && filters.entityType !== "ALL" && ev.entityType !== filters.entityType) {
      return false;
    }
    if (filters.status && filters.status !== "ALL" && ev.status !== filters.status) {
      return false;
    }
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      const matchId = ev.eventId.toLowerCase().includes(q);
      const matchEntity = ev.entityId.toLowerCase().includes(q);
      const matchNode = ev.nodeCode?.toLowerCase().includes(q) ?? false;
      if (!matchId && !matchEntity && !matchNode) return false;
    }
    return true;
  });
}

/**
 * Validates whether an event status indicates a conflict requiring review.
 */
export function isConflictEvent(ev: SyncEventEnvelope): boolean {
  return ev.status === "CONFLICT" || ev.status === "REJECTED";
}

// ---------------------------------------------------------------------------
// Component Props
// ---------------------------------------------------------------------------

interface NodeSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodesList: AcademicNodeRecord[];
  currentTenant: string;
  syncingNodeId: string | null;
  onRefreshNodes: () => void;
  onOpenPairModal: () => void;
  onForceSync: (node: any) => void;
  onRotateToken?: (nodeId: string) => void;
  onRevokeNode?: (nodeId: string, isRevoking: boolean) => void;
  initialEvents?: SyncEventEnvelope[];
}

export function NodeSyncModal({
  isOpen,
  onClose,
  nodesList = [],
  currentTenant,
  syncingNodeId,
  onRefreshNodes,
  onOpenPairModal,
  onForceSync,
  onRotateToken,
  onRevokeNode,
  initialEvents,
}: NodeSyncModalProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"fleet" | "queue" | "conflicts">("fleet");

  // Filter & search states
  const [fleetSearch, setFleetSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [eventSearch, setEventSearch] = useState<string>("");
  const [eventEntityType, setEventEntityType] = useState<string>("ALL");
  const [eventStatusFilter, setEventStatusFilter] = useState<string>("ALL");

  // Interaction feedback states
  const [copiedNodeId, setCopiedNodeId] = useState<string | null>(null);
  const [inspectedEvent, setInspectedEvent] = useState<SyncEventEnvelope | null>(null);
  const [localRevokedMap, setLocalRevokedMap] = useState<Record<string, boolean>>({});

  // Seed baseline events for queue inspection if none passed
  const events: SyncEventEnvelope[] = useMemo(() => {
    if (initialEvents && initialEvents.length > 0) return initialEvents;
    return [
      {
        eventId: "evt_01j7a8e99z3m1k4b2d8v6q7w",
        nodeCode: "NODE-PUNE-01",
        entityType: "OMR_SCAN",
        entityId: "scan_8821a_roll_104",
        entityVersion: 14,
        op: "APPEND",
        occurredAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
        status: "APPLIED",
        payload: { examCode: "JM-2025-04", rollNumber: "104", totalMarks: 240 },
      },
      {
        eventId: "evt_01j7a8fa11x9p3c7y5n2m0r8",
        nodeCode: "NODE-PUNE-01",
        entityType: "EXAM_RESULT",
        entityId: "res_99120_roll_108",
        entityVersion: 3,
        op: "APPEND",
        occurredAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        status: "CONFLICT",
        conflictReason: "STALE_VERSION: Cannot overwrite finalized ExamResult version 4 with older version 3 (C06 Invariant)",
        payload: { examId: "ex_pune_01", studentId: "st_108", score: 185 },
      },
      {
        eventId: "evt_01j7a8fb44k2w8t9m1c3x4z5",
        nodeCode: "NODE-PUNE-02",
        entityType: "ATTENDANCE_RECORD",
        entityId: "att_batch_jee_b1_20260909",
        entityVersion: 1,
        op: "UPSERT",
        occurredAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
        status: "APPLIED",
        payload: { batchId: "b_jee_1", presentCount: 42, absentCount: 3 },
      },
      {
        eventId: "evt_01j7a8fc77m9v4n1p6r8t0w2",
        nodeCode: "NODE-PUNE-01",
        entityType: "ENROLLMENT",
        entityId: "enr_student_402_batch_b2",
        entityVersion: 2,
        op: "UPSERT",
        occurredAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
        status: "DUPLICATE",
        payload: { studentId: "st_402", batchId: "b_jee_2" },
      },
    ];
  }, [initialEvents]);

  if (!isOpen) return null;

  // Filtered nodes
  const filteredNodes = nodesList.filter((node) => {
    const isRevoked = localRevokedMap[node.id] !== undefined ? localRevokedMap[node.id] : !!node.revokedAt;
    const effectiveNode = { ...node, revokedAt: isRevoked ? (node.revokedAt || new Date()) : null };
    const opStatus = getNodeOperationalStatus(effectiveNode);

    if (statusFilter !== "ALL" && opStatus !== statusFilter) return false;
    if (fleetSearch.trim()) {
      const q = fleetSearch.toLowerCase().trim();
      const matchCode = node.nodeCode.toLowerCase().includes(q);
      const matchName = node.name.toLowerCase().includes(q);
      const matchFingerprint = node.machineFingerprint.toLowerCase().includes(q);
      if (!matchCode && !matchName && !matchFingerprint) return false;
    }
    return true;
  });

  // Filtered events for Queue Tab
  const filteredEvents = filterSyncEvents(events, {
    entityType: eventEntityType,
    status: eventStatusFilter,
    search: eventSearch,
  });

  // Conflicts list
  const conflictEvents = events.filter(isConflictEvent);

  // Status counters
  const totalNodes = nodesList.length;
  const onlineCount = nodesList.filter((n) => getNodeOperationalStatus(n) === "ONLINE").length;
  const expiringSoonCount = nodesList.filter((n) => getNodeOperationalStatus(n) === "TOKEN_EXPIRING_SOON").length;
  const revokedCount = nodesList.filter((n) => {
    const isRev = localRevokedMap[n.id] !== undefined ? localRevokedMap[n.id] : !!n.revokedAt;
    return isRev;
  }).length;

  const handleCopyToken = (nodeId: string, token?: string) => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedNodeId(nodeId);
    setTimeout(() => setCopiedNodeId(null), 2000);
  };

  const handleToggleRevoke = (nodeId: string, currentRevoked: boolean) => {
    const nextRevoked = !currentRevoked;
    setLocalRevokedMap((prev) => ({ ...prev, [nodeId]: nextRevoked }));
    if (onRevokeNode) {
      onRevokeNode(nodeId, nextRevoked);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/30 border border-blue-500/50 text-blue-400">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Academic Node & Edge Sync Hub</h2>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded font-mono font-bold">
                  Contract C06
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-mono font-bold">
                  PRD Sec 32-35
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Offline OMR Grading, Local SQLite Caching, 90-Day Token Lifecycle, and Conflict Invariant Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Summary Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Terminals:</span>
            <strong className="text-slate-900 font-bold">{totalNodes}</strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-500 font-medium">Online & Synced:</span>
            <strong className="text-emerald-700 font-bold">{onlineCount}</strong>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-slate-500 font-medium">Expiring Tokens (&le;14d):</span>
            <strong className="text-amber-700 font-bold">{expiringSoonCount}</strong>
          </div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-slate-500 font-medium">Conflicts / Revoked:</span>
            <strong className="text-rose-700 font-bold">
              {conflictEvents.length} / {revokedCount}
            </strong>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between px-6 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("fleet")}
              className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
                activeTab === "fleet"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Laptop className="w-4 h-4" />
              Terminal Fleet ({nodesList.length})
            </button>
            <button
              onClick={() => setActiveTab("queue")}
              className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
                activeTab === "queue"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-4 h-4" />
              Outbox Event Queue ({events.length})
            </button>
            <button
              onClick={() => setActiveTab("conflicts")}
              className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
                activeTab === "conflicts"
                  ? "border-rose-600 text-rose-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <AlertOctagon className="w-4 h-4 text-rose-500" />
              Conflicts & Rejections ({conflictEvents.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshNodes}
              className="flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition"
              title="Refresh nodes from server"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            <button
              onClick={onOpenPairModal}
              className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-lg shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Pair Terminal
            </button>
          </div>
        </div>

        {/* Tab 1: Terminal Fleet */}
        {activeTab === "fleet" && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Filter Controls Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by node code, terminal name, machine UUID..."
                  value={fleetSearch}
                  onChange={(e) => setFleetSearch(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Operational Statuses</option>
                  <option value="ONLINE">Online & Synced</option>
                  <option value="OFFLINE">Offline / Dormant</option>
                  <option value="TOKEN_EXPIRING_SOON">Token Expiring Soon (&le;14d)</option>
                  <option value="TOKEN_EXPIRED">Token Expired (401)</option>
                  <option value="REVOKED">Revoked Access (403)</option>
                </select>
              </div>
            </div>

            {/* Nodes Listing */}
            {filteredNodes.length === 0 ? (
              <div className="p-10 border-2 border-dashed border-slate-200 rounded-xl text-center space-y-3 bg-slate-50/50">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                  <Laptop className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800">No Terminals Matched Filter</div>
                  <div className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    {nodesList.length === 0
                      ? "Pair an offline Windows PC in your institute computer lab for offline OMR scanning."
                      : "No nodes match your current search or status filter."}
                  </div>
                </div>
                {nodesList.length === 0 && (
                  <button
                    type="button"
                    onClick={onOpenPairModal}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-xs transition"
                  >
                    <Plus className="w-4 h-4" />
                    Pair First Windows Terminal
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNodes.map((node) => {
                  const isRevoked =
                    localRevokedMap[node.id] !== undefined
                      ? localRevokedMap[node.id]
                      : !!node.revokedAt;
                  const effectiveNode = {
                    ...node,
                    revokedAt: isRevoked ? node.revokedAt || new Date() : null,
                  };
                  const opStatus = getNodeOperationalStatus(effectiveNode);
                  const remainingDays = getTokenRemainingDays(node.tokenExpiresAt);

                  return (
                    <div
                      key={node.id}
                      className={`border rounded-xl p-5 bg-white transition space-y-4 shadow-xs ${
                        isRevoked
                          ? "border-rose-300 bg-rose-50/30"
                          : opStatus === "TOKEN_EXPIRING_SOON"
                          ? "border-amber-300 bg-amber-50/20"
                          : "border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      {/* Node Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2.5 rounded-xl border ${
                              isRevoked
                                ? "bg-rose-100 border-rose-200 text-rose-700"
                                : "bg-slate-100 border-slate-200 text-blue-600"
                            }`}
                          >
                            <Laptop className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">{node.name}</span>
                              <span className="text-[11px] bg-slate-100 text-slate-700 border border-slate-300 px-2 py-0.5 rounded font-mono font-bold">
                                {node.nodeCode}
                              </span>

                              {/* Branch Scope Badge (C06 Section 4) */}
                              <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-medium">
                                Branch: {node.branch?.name || "Main Campus"}
                              </span>

                              {/* Operational Status Pill */}
                              {opStatus === "ONLINE" && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  ONLINE & SYNCED
                                </span>
                              )}
                              {opStatus === "OFFLINE" && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                                  OFFLINE / DORMANT
                                </span>
                              )}
                              {opStatus === "TOKEN_EXPIRING_SOON" && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  TOKEN EXPIRING ({remainingDays}d)
                                </span>
                              )}
                              {opStatus === "TOKEN_EXPIRED" && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                                  <AlertOctagon className="w-3 h-3" />
                                  TOKEN EXPIRED (401)
                                </span>
                              )}
                              {opStatus === "REVOKED" && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white flex items-center gap-1">
                                  <Ban className="w-3 h-3" />
                                  REVOKED ACCESS (403)
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3 mt-1 font-mono">
                              <span>
                                UUID: <strong className="text-slate-700">{node.machineFingerprint}</strong>
                              </span>
                              <span>•</span>
                              <span className="font-sans">OS: {node.osVersion || "Windows 11 (64-bit)"}</span>
                              <span>•</span>
                              <span>IP: {node.ipAddress || "127.0.0.1"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Force Pull Delta Sync Button */}
                        <button
                          type="button"
                          disabled={syncingNodeId === node.id || isRevoked || opStatus === "TOKEN_EXPIRED"}
                          onClick={() => onForceSync(node)}
                          className="inline-flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:pointer-events-none transition self-start sm:self-center shrink-0 shadow-2xs"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${
                              syncingNodeId === node.id ? "animate-spin text-blue-700" : ""
                            }`}
                          />
                          {syncingNodeId === node.id ? "Pulling Branch Delta..." : "Sync Branch Delta"}
                        </button>
                      </div>

                      {/* Security, Token & Revocation Action Strip */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Key className="w-3.5 h-3.5 text-amber-600" />
                            <span>Pairing Token:</span>
                            <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                              {node.pairingToken ? `${node.pairingToken.substring(0, 10)}...` : "node_paired_secret"}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopyToken(node.id, node.pairingToken || "node_paired_secret")}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded hover:bg-slate-100 transition"
                          >
                            {copiedNodeId === node.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Token</span>
                              </>
                            )}
                          </button>

                          {/* 90-Day Token TTL Indicator */}
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              Expires in:{" "}
                              <strong className={remainingDays <= 14 ? "text-amber-700 font-bold" : "text-slate-700 font-semibold"}>
                                {remainingDays > 0 ? `${remainingDays} days` : "Expired"}
                              </strong>
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons: Rotate Token & Revocation Toggle */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isRevoked}
                            onClick={() => {
                              if (onRotateToken) onRotateToken(node.id);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold bg-white text-slate-700 border border-slate-300 px-2.5 py-1 rounded hover:bg-slate-100 disabled:opacity-50 transition"
                            title="Rotate pairing token per C06 90-day rotation protocol"
                          >
                            <RotateCw className="w-3 h-3 text-blue-600" />
                            Rotate Token
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleRevoke(node.id, isRevoked)}
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded border transition ${
                              isRevoked
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                                : "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100"
                            }`}
                          >
                            {isRevoked ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Reinstate Terminal
                              </>
                            ) : (
                              <>
                                <Ban className="w-3 h-3 text-rose-600" />
                                Revoke Access (403)
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Telemetry Counters Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Offline Scans</div>
                          <div className="text-sm font-black text-slate-900">{node.offlineScansCount || 0} sheets</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Engine State</div>
                          <div className="text-xs font-bold text-blue-700">{node.syncEngineState || "IDLE"}</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Pull Cursor (C06)</div>
                          <div className="text-xs font-mono font-bold text-slate-800 truncate" title={node.pullCursor || "cur_01j7a8_init"}>
                            {node.pullCursor || "cur_01j7a8_init"}
                          </div>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Last Seen</div>
                          <div className="text-xs font-semibold text-slate-700">
                            {node.lastSeenAt ? new Date(node.lastSeenAt).toLocaleTimeString() : "Recent"}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Outbox & Event Queue */}
        {activeTab === "queue" && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* C06 Queue Information Banner */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
              <Database className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold text-blue-900">Contract C06 Causal Event Pipeline</div>
                <p className="text-blue-800 leading-relaxed">
                  Academic Nodes buffer offline scans and attendance records into durable client envelopes with unique{" "}
                  <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-blue-900 font-bold">eventId</code> and monotonic{" "}
                  <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-blue-900 font-bold">entityVersion</code>. The server applies each event exactly once with zero duplicate score computations.
                </p>
              </div>
            </div>

            {/* Filter Bar for Events */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter events by eventId or entityId..."
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <select
                  value={eventEntityType}
                  onChange={(e) => setEventEntityType(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Entity Types</option>
                  <option value="OMR_SCAN">OMR_SCAN</option>
                  <option value="EXAM_RESULT">EXAM_RESULT</option>
                  <option value="ATTENDANCE_RECORD">ATTENDANCE_RECORD</option>
                  <option value="ENROLLMENT">ENROLLMENT</option>
                </select>

                <select
                  value={eventStatusFilter}
                  onChange={(e) => setEventStatusFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Event Statuses</option>
                  <option value="APPLIED">Applied (Success)</option>
                  <option value="DUPLICATE">Duplicate (No-op)</option>
                  <option value="CONFLICT">Conflict (Attention)</option>
                </select>
              </div>
            </div>

            {/* Events Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-2.5 px-3">Event ID</th>
                      <th className="py-2.5 px-3">Entity Type</th>
                      <th className="py-2.5 px-3">Entity ID</th>
                      <th className="py-2.5 px-3">Version</th>
                      <th className="py-2.5 px-3">Op</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Occurred At</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEvents.map((ev) => (
                      <tr key={ev.eventId} className="hover:bg-slate-50/70 transition">
                        <td className="py-2 px-3 font-mono text-[11px] text-blue-700 font-bold">
                          {ev.eventId.substring(0, 14)}...
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-mono text-[10px] font-bold border border-slate-200">
                            {ev.entityType}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-800 font-medium">
                          {ev.entityId}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-700">
                          v{ev.entityVersion}
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-[10px] font-bold text-slate-600 uppercase">
                            {ev.op}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {ev.status === "APPLIED" && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold flex items-center gap-1 w-fit">
                              <Check className="w-3 h-3" /> APPLIED
                            </span>
                          )}
                          {ev.status === "DUPLICATE" && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold flex items-center gap-1 w-fit">
                              <GitCommit className="w-3 h-3" /> DUPLICATE
                            </span>
                          )}
                          {ev.status === "CONFLICT" && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold flex items-center gap-1 w-fit">
                              <AlertOctagon className="w-3 h-3" /> CONFLICT
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">
                          {new Date(ev.occurredAt).toLocaleTimeString()}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setInspectedEvent(ev)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Conflicts & Invariant Resolution */}
        {activeTab === "conflicts" && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold text-rose-900">Contract C06 Immutable Finalize Guard</div>
                <p className="text-rose-800 leading-relaxed">
                  Finalized exam results and fee ledger payments can never be overwritten by older node versions (last-write-wins is forbidden). Any stale offline write generates a formal conflict task to preserve historical scoring truth.
                </p>
              </div>
            </div>

            {conflictEvents.length === 0 ? (
              <div className="p-10 border-2 border-dashed border-emerald-200 rounded-xl text-center space-y-2 bg-emerald-50/40">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <div className="text-sm font-bold text-emerald-900">Zero Fleet Conflicts Detected</div>
                <p className="text-xs text-emerald-700 max-w-sm mx-auto">
                  All offline sync events applied cleanly without stale version collisions or unauthorized mutations.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {conflictEvents.map((conf) => (
                  <div
                    key={conf.eventId}
                    className="border border-rose-300 rounded-xl p-4 bg-white space-y-3 shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-mono text-[10px] font-bold border border-rose-200">
                          {conf.entityType}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-800">{conf.entityId}</span>
                        <span className="text-xs text-slate-500 font-mono">v{conf.entityVersion}</span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        Event: {conf.eventId}
                      </span>
                    </div>

                    <div className="p-3 bg-rose-50/60 rounded-lg text-xs space-y-1">
                      <div className="font-bold text-rose-900">Conflict Explanation:</div>
                      <div className="text-rose-800 leading-relaxed font-mono text-[11px]">
                        {conf.conflictReason || "STALE_VERSION: In-place mutation rejected for finalized record."}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => setInspectedEvent(conf)}
                        className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        Inspect Full Conflict Payload <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            alert(`Conflict ${conf.eventId} marked for administrative audit.`);
                          }}
                          className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3 py-1.5 rounded-lg transition"
                        >
                          Mark for Audit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            alert(`Creating formal revision request for entity ${conf.entityId}.`);
                          }}
                          className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition shadow-xs"
                        >
                          Create Revision Request
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Inspected Event Modal Drawer */}
        {inspectedEvent && (
          <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  Event Payload Inspector
                </h4>
                <button
                  onClick={() => setInspectedEvent(null)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2 text-slate-600 font-mono text-[11px]">
                  <div>
                    Event ID: <strong className="text-slate-900">{inspectedEvent.eventId}</strong>
                  </div>
                  <div>
                    Version: <strong className="text-slate-900">v{inspectedEvent.entityVersion}</strong>
                  </div>
                  <div>
                    Entity Type: <strong className="text-slate-900">{inspectedEvent.entityType}</strong>
                  </div>
                  <div>
                    Status: <strong className="text-slate-900">{inspectedEvent.status}</strong>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-slate-700">JSON Payload:</span>
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg font-mono text-[11px] max-h-48 overflow-y-auto">
                    {JSON.stringify(inspectedEvent.payload || {}, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  onClick={() => setInspectedEvent(null)}
                  className="bg-slate-100 text-slate-700 font-bold text-xs px-4 py-1.5 rounded-lg hover:bg-slate-200 transition"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              End-to-End Encrypted Terminal Handshake with 90-Day Token TTL & Resumable Branch Delta
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-white border border-slate-300 text-slate-700 font-bold px-4 py-1.5 rounded-lg hover:bg-slate-50 transition shadow-2xs"
          >
            Close Hub
          </button>
        </div>
      </div>
    </div>
  );
}
