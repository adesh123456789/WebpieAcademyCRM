"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Database,
  Cpu,
  Layers,
  Filter,
  Search,
  BookOpen,
  ArrowRight,
  Info,
  Check,
} from "lucide-react";

export interface QuestionOption {
  id: string;
  text: string;
}

export interface QuestionCandidate {
  body: string;
  options: QuestionOption[];
  correctAnswer: string;
  solution: string;
  declaredDifficulty: "EASY" | "MEDIUM" | "HARD";
  concept: string;
  subject: string;
  status: "AI_CANDIDATE";
  source: "MODEL" | "BANK";
  provenance?: {
    provider: string;
    model: string;
    promptTemplateId: string;
    promptTemplateVersion: string;
    aiRequestId: string;
  };
}

interface QuestionsViewProps {
  questions: any[];
  aiCandidates: QuestionCandidate[];
  aiPrompting: boolean;
  aiShortfall?: number;
  aiOutcome?: string;
  onTriggerAiGeneration: () => void;
  onApproveCandidate: (index: number) => void;
  onRejectCandidate?: (index: number) => void;
  onOpenCopilotPreview?: () => void;
}

export const QuestionsView: React.FC<QuestionsViewProps> = ({
  questions,
  aiCandidates,
  aiPrompting,
  aiShortfall,
  aiOutcome,
  onTriggerAiGeneration,
  onApproveCandidate,
  onRejectCandidate,
  onOpenCopilotPreview,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("ALL");
  const [selectedDifficulty, setSelectedDifficulty] = useState("ALL");

  const filteredQuestions = questions.filter((q) => {
    if (selectedSubject !== "ALL" && q.subject !== selectedSubject) return false;
    if (selectedDifficulty !== "ALL" && q.declaredDifficulty !== selectedDifficulty) return false;
    if (!searchQuery.trim()) return true;
    const s = searchQuery.toLowerCase();
    return (
      (q.body || "").toLowerCase().includes(s) ||
      (q.concept || "").toLowerCase().includes(s) ||
      (q.code || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Question Bank & AI Candidate Studio</h1>
            <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
              Contract AI-001 Gateway
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Peer-reviewed question bank with audited AI candidate review, LaTeX support, and safe bank fallback.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenCopilotPreview && (
            <button
              onClick={onOpenCopilotPreview}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-indigo-700 text-xs font-bold px-3.5 py-2 rounded-lg border border-indigo-200 shadow-sm transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Teacher Copilot
            </button>
          )}

          <button
            onClick={onTriggerAiGeneration}
            disabled={aiPrompting}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {aiPrompting ? "Generating via AI Gateway..." : "Generate AI Candidates"}
          </button>
        </div>
      </div>

      {/* Shortfall Alert (Contract AI-001) */}
      {typeof aiShortfall === "number" && aiShortfall > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 text-xs text-amber-900 shadow-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold">Bank Fallback Shortfall ({aiShortfall} Question{aiShortfall > 1 ? "s" : ""} Missing)</div>
            <div className="text-amber-800 text-[11px] leading-relaxed">
              The AI model was unavailable or timed out, and the verified Question Bank contained fewer pre-approved items matching the requested criteria. Only {aiCandidates.length} candidate(s) could be retrieved without synthesizing unverified questions (AC-007).
            </div>
          </div>
        </div>
      )}

      {/* AI Candidates Review Drawer */}
      {aiCandidates.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-50/70 via-blue-50/50 to-white border border-indigo-200 p-5 rounded-2xl space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-indigo-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-indigo-950 flex items-center gap-2">
                  <span>Candidate Review Queue ({aiCandidates.length})</span>
                  <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-200 font-mono px-2 py-0.2 rounded-full font-bold">
                    AI_CANDIDATE
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Must be approved by educator before entering active assessment bank (PRD Section 30).
                </div>
              </div>
            </div>

            {aiCandidates[0]?.provenance && (
              <div className="flex items-center gap-3 text-[11px] font-mono text-indigo-800 bg-white/80 px-3 py-1.5 rounded-lg border border-indigo-100">
                <span>Provider: <strong>{aiCandidates[0].provenance.provider}</strong></span>
                <span>•</span>
                <span>Model: <strong>{aiCandidates[0].provenance.model}</strong></span>
                <span>•</span>
                <span>Tmpl: <strong>{aiCandidates[0].provenance.promptTemplateId} v{aiCandidates[0].provenance.promptTemplateVersion}</strong></span>
              </div>
            )}
          </div>

          {/* Candidate Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiCandidates.map((cand, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm hover:border-indigo-300 transition text-xs"
              >
                {/* Meta Badges */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {cand.source === "MODEL" ? (
                      <span className="flex items-center gap-1 bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                        <Cpu className="w-3 h-3" /> Model Output
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                        <Database className="w-3 h-3" /> Bank Fallback
                      </span>
                    )}
                    <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                      {cand.declaredDifficulty}
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono">
                    ID: {cand.provenance?.aiRequestId?.slice(0, 8) || `cand-${idx + 1}`}
                  </span>
                </div>

                {/* Question Body */}
                <div className="font-semibold text-slate-900 leading-snug">
                  {cand.body}
                </div>

                {/* Options */}
                <div className="grid grid-cols-2 gap-1.5">
                  {cand.options?.map((opt) => (
                    <div
                      key={opt.id}
                      className={`p-2 rounded-lg border text-[11px] ${
                        opt.id === cand.correctAnswer
                          ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <span className="font-bold mr-1 text-indigo-600">({opt.id})</span> {opt.text}
                    </div>
                  ))}
                </div>

                {/* Solution / Rationale */}
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-[11px] space-y-1">
                  <div className="font-bold text-emerald-700">Answer: Option {cand.correctAnswer}</div>
                  <div className="text-slate-600 leading-relaxed">{cand.solution}</div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400">
                    Subject: <strong>{cand.subject}</strong> • {cand.concept}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {onRejectCandidate && (
                      <button
                        onClick={() => onRejectCandidate(idx)}
                        className="flex items-center gap-1 text-slate-500 hover:text-rose-600 text-xs px-2.5 py-1 rounded hover:bg-rose-50 transition"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    )}
                    <button
                      onClick={() => onApproveCandidate(idx)}
                      className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1 rounded font-bold transition shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve Question
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verified Questions Bank */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Filters */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Verified Question Bank ({filteredQuestions.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search concepts or text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs w-48 sm:w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Subjects</option>
              <option value="PHYSICS">Physics</option>
              <option value="CHEMISTRY">Chemistry</option>
              <option value="MATHEMATICS">Mathematics</option>
            </select>

            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
        </div>

        {/* Questions List */}
        <div className="divide-y divide-slate-100">
          {filteredQuestions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No verified questions match the current filter.
            </div>
          ) : (
            filteredQuestions.map((q) => (
              <div key={q.id} className="p-5 space-y-3 hover:bg-slate-50/50 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                      {q.code || `Q-${q.id.slice(0, 6)}`}
                    </span>
                    <span className="text-xs text-slate-600 font-semibold">
                      {q.subject} • {q.chapter}
                    </span>
                    {q.concept && (
                      <span className="text-[11px] text-slate-400">({q.concept})</span>
                    )}
                  </div>
                  <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold">
                    {q.declaredDifficulty}
                  </span>
                </div>

                <p className="text-sm font-semibold text-slate-900 leading-snug">{q.body}</p>

                {q.options && q.options.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {q.options.map((opt: any) => (
                      <div
                        key={opt.id}
                        className={`p-2.5 rounded-lg border ${
                          opt.id === q.correctAnswer
                            ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <span className="font-bold mr-2">({opt.id})</span> {opt.text}
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs space-y-1">
                  <div className="font-bold text-emerald-700">Verified Answer: Option {q.correctAnswer}</div>
                  <div className="text-slate-600 text-[11px]">{q.solution}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
