"use client";

import React from "react";
import {
  Laptop,
  X,
  HardDrive,
  Cpu,
  RefreshCw,
  Plus,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

interface NodeSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodesList: any[];
  currentTenant: string;
  syncingNodeId: string | null;
  onRefreshNodes: () => void;
  onOpenPairModal: () => void;
  onForceSync: (node: any) => void;
}

export function NodeSyncModal({
  isOpen,
  onClose,
  nodesList,
  currentTenant,
  syncingNodeId,
  onRefreshNodes,
  onOpenPairModal,
  onForceSync,
}: NodeSyncModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/30 border border-blue-500/50 text-blue-400">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Windows Academic Node & Offline Sync Hub</h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-mono font-bold">
                  PRD Sec 33-35 Beta
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Resilient Edge Telemetry, Local SQLite Caching, and Two-Way Delta Sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Architecture Overview Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-xl">
              <div className="flex items-center gap-2 text-blue-800 font-bold text-xs mb-1">
                <HardDrive className="w-4 h-4 text-blue-600" />
                Local SQLite Cache
              </div>
              <p className="text-[11px] text-blue-900 leading-relaxed">
                Cached question bank, active exams, and student rosters stored encrypted on local node disk for 100% offline exam scanning.
              </p>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-xl">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-1">
                <Cpu className="w-4 h-4 text-emerald-600" />
                Edge Deterministic Eval
              </div>
              <p className="text-[11px] text-emerald-900 leading-relaxed">
                Autonomous OMR bubble decoding and grading engine operates on node with zero cloud latency and instant rank preview.
              </p>
            </div>

            <div className="bg-purple-50/70 border border-purple-200 p-3.5 rounded-xl">
              <div className="flex items-center gap-2 text-purple-800 font-bold text-xs mb-1">
                <RefreshCw className="w-4 h-4 text-purple-600" />
                Authoritative Sync
              </div>
              <p className="text-[11px] text-purple-900 leading-relaxed">
                Background delta queue automatically synchronizes scan matrices, attendance, and mastery logs upon network restoration.
              </p>
            </div>
          </div>

          {/* Fleet Controls Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Connected Terminal Fleet</h3>
              <p className="text-xs text-slate-500">
                Tenant: <strong className="text-slate-800">{currentTenant}</strong> • Nodes active: {nodesList.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRefreshNodes}
                className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-lg border border-slate-300 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
              <button
                type="button"
                onClick={onOpenPairModal}
                className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-lg shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Pair Windows Node
              </button>
            </div>
          </div>

          {/* Node Fleet Listing */}
          {nodesList.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center space-y-3 bg-slate-50/50">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                <Laptop className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">No Academic Nodes Paired for this Academy</div>
                <div className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Pair an offline Windows workstation in your branch computer lab to enable zero-latency OMR scanning and offline CBT testing.
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenPairModal}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                Pair First Windows Terminal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {nodesList.map((node) => (
                <div
                  key={node.id}
                  className="border border-slate-200 rounded-xl p-4 bg-white hover:border-blue-300 hover:shadow-xs transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                        <Laptop className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{node.name}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-300 px-1.5 py-0.5 rounded font-mono font-semibold">
                            {node.nodeCode}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              node.status === "ACTIVE" || node.status === "ONLINE"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                node.status === "ACTIVE" || node.status === "ONLINE"
                                  ? "bg-emerald-500 animate-pulse"
                                  : "bg-amber-500"
                              }`}
                            />
                            {node.status === "ACTIVE" || node.status === "ONLINE"
                              ? "ONLINE & PAIRED"
                              : node.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                          <span>
                            Hardware:{" "}
                            <strong className="text-slate-700 font-mono">
                              {node.machineFingerprint}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>OS: {node.osVersion || "Windows 11 Pro"}</span>
                          <span>•</span>
                          <span>IP: {node.ipAddress || "127.0.0.1"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Force Pull Delta Sync Button */}
                    <button
                      type="button"
                      disabled={syncingNodeId === node.id}
                      onClick={() => onForceSync(node)}
                      className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-60 transition self-start sm:self-center"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${
                          syncingNodeId === node.id ? "animate-spin text-blue-700" : ""
                        }`}
                      />
                      {syncingNodeId === node.id ? "Pulling Delta..." : "Sync Delta Now"}
                    </button>
                  </div>

                  {/* Telemetry Counters */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Offline Scans</div>
                      <div className="text-sm font-black text-slate-900">{node.offlineScansCount || 0} sheets</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Engine State</div>
                      <div className="text-xs font-bold text-blue-700">{node.syncEngineState || "IDLE"}</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Last Seen</div>
                      <div className="text-xs font-semibold text-slate-700">
                        {node.lastSeenAt ? new Date(node.lastSeenAt).toLocaleTimeString() : "Recent"}
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Sync Status</div>
                      <div className="text-xs font-semibold text-emerald-700 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Delta Up-to-date
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>End-to-End Encrypted Handshake with SHA-256 Token Authorization</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-white border border-slate-300 text-slate-700 font-bold px-4 py-1.5 rounded-lg hover:bg-slate-50 transition"
          >
            Close Hub
          </button>
        </div>
      </div>
    </div>
  );
}
