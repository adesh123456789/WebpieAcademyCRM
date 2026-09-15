"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Send,
  Wifi,
  WifiOff,
  Layers,
  HelpCircle,
  Hash,
  ListChecks,
  CheckSquare,
  Radio,
  FileCheck2,
} from "lucide-react";

export interface CbtQuestion {
  orderIndex: number;
  questionId: string;
  subject: string;
  sectionName?: string;
  body: string;
  options?: Array<{ id: string; text: string }> | string[];
  type?: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "NUMERICAL" | string;
  marksCorrect: number;
  marksIncorrect: number;
}

export interface CbtState {
  inExam: boolean;
  attemptId?: string;
  examId?: string;
  examTitle?: string;
  currentQIdx: number;
  questions: CbtQuestion[];
  responses: Record<string, any>;
  markedForReview: string[];
  startTime?: string;
  serverTime?: string;
  expiresAt?: string;
  durationMinutes?: number;
  timeLeft?: number;
  submitted: boolean;
  result?: any;
  isSyncing?: boolean;
  lastSavedAt?: string;
}

export interface CbtViewProps {
  cbtState: CbtState;
  setCbtState: React.Dispatch<React.SetStateAction<CbtState>>;
  onStartCbtSimulation: (examId?: string) => Promise<void>;
  onSubmitCbtSimulation: () => Promise<void>;
  onHeartbeat?: (responses: Record<string, any>, markedForReview: string[]) => Promise<void>;
  exams?: any[];
}

export const CbtView: React.FC<CbtViewProps> = ({
  cbtState,
  setCbtState,
  onStartCbtSimulation,
  onSubmitCbtSimulation,
  onHeartbeat,
  exams = [],
}) => {
  const [selectedExamId, setSelectedExamId] = useState<string>(
    exams.length > 0 ? exams[0].id : ""
  );
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [serverOffset, setServerOffset] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Calculate server time offset on start or reconnect
  useEffect(() => {
    if (cbtState.serverTime) {
      const serverMs = new Date(cbtState.serverTime).getTime();
      const localMs = Date.now();
      setServerOffset(serverMs - localMs);
    }
  }, [cbtState.serverTime]);

  // Server-authoritative countdown timer
  useEffect(() => {
    if (!cbtState.inExam || cbtState.submitted) return;

    function updateTimer() {
      if (cbtState.expiresAt) {
        const deadlineMs = new Date(cbtState.expiresAt).getTime();
        const currentServerNowMs = Date.now() + serverOffset;
        const diffSec = Math.max(0, Math.floor((deadlineMs - currentServerNowMs) / 1000));
        setRemainingSeconds(diffSec);

        if (diffSec <= 0) {
          // Auto submit when server-derived time expires
          handleAutoSubmit();
        }
      } else if (cbtState.timeLeft !== undefined) {
        setRemainingSeconds(cbtState.timeLeft);
      }
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [cbtState.inExam, cbtState.submitted, cbtState.expiresAt, serverOffset]);

  // Periodic heartbeat autosave (every 25 seconds)
  useEffect(() => {
    if (!cbtState.inExam || cbtState.submitted || !onHeartbeat || !cbtState.attemptId) return;

    const interval = setInterval(() => {
      onHeartbeat(cbtState.responses, cbtState.markedForReview);
    }, 25000);

    return () => clearInterval(interval);
  }, [cbtState.inExam, cbtState.submitted, cbtState.responses, cbtState.markedForReview, cbtState.attemptId, onHeartbeat]);

  const handleAutoSubmit = async () => {
    if (isSubmitting || cbtState.submitted) return;
    setIsSubmitting(true);
    try {
      await onSubmitCbtSimulation();
    } finally {
      setIsSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  const currentQ: CbtQuestion | undefined = cbtState.questions[cbtState.currentQIdx];

  // Distinct sections for subject tabs
  const sections = useMemo(() => {
    const set = new Set<string>();
    cbtState.questions.forEach((q) => {
      if (q.subject) set.add(q.subject);
      else if (q.sectionName) set.add(q.sectionName);
    });
    return Array.from(set);
  }, [cbtState.questions]);

  // Filtered questions based on selected section tab
  const filteredQuestions = useMemo(() => {
    if (selectedSection === "ALL") return cbtState.questions;
    return cbtState.questions.filter(
      (q) => q.subject === selectedSection || q.sectionName === selectedSection
    );
  }, [cbtState.questions, selectedSection]);

  // Format seconds to HH:MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return [
      h > 0 ? String(h).padStart(2, "0") : null,
      String(m).padStart(2, "0"),
      String(s).padStart(2, "0"),
    ]
      .filter(Boolean)
      .join(":");
  };

  // Palette status categorization
  const getQuestionStatus = (q: CbtQuestion) => {
    const qId = q.questionId;
    const isAnswered =
      cbtState.responses[qId] !== undefined &&
      cbtState.responses[qId] !== null &&
      cbtState.responses[qId] !== "" &&
      (!Array.isArray(cbtState.responses[qId]) || cbtState.responses[qId].length > 0);
    const isMarked = cbtState.markedForReview.includes(qId);

    if (isAnswered && isMarked) return "ANSWERED_AND_MARKED";
    if (isMarked) return "MARKED_FOR_REVIEW";
    if (isAnswered) return "ANSWERED";
    return "NOT_ANSWERED";
  };

  // Summary counts for palette and submit modal
  const summaryCounts = useMemo(() => {
    let answered = 0;
    let marked = 0;
    let answeredAndMarked = 0;
    let notAnswered = 0;

    cbtState.questions.forEach((q) => {
      const status = getQuestionStatus(q);
      if (status === "ANSWERED") answered++;
      else if (status === "MARKED_FOR_REVIEW") marked++;
      else if (status === "ANSWERED_AND_MARKED") answeredAndMarked++;
      else notAnswered++;
    });

    return {
      total: cbtState.questions.length,
      answered,
      marked,
      answeredAndMarked,
      notAnswered,
      totalAnswered: answered + answeredAndMarked,
    };
  }, [cbtState.questions, cbtState.responses, cbtState.markedForReview]);

  // Response updater
  const handleSelectSingleChoice = (qId: string, optId: string) => {
    setCbtState((prev) => ({
      ...prev,
      responses: {
        ...prev.responses,
        [qId]: optId,
      },
    }));
  };

  const handleToggleMultipleChoice = (qId: string, optId: string) => {
    setCbtState((prev) => {
      const existing = (prev.responses[qId] as string[]) || [];
      const updated = existing.includes(optId)
        ? existing.filter((id) => id !== optId)
        : [...existing, optId];
      return {
        ...prev,
        responses: {
          ...prev.responses,
          [qId]: updated,
        },
      };
    });
  };

  const handleSetNumerical = (qId: string, val: string) => {
    setCbtState((prev) => ({
      ...prev,
      responses: {
        ...prev.responses,
        [qId]: val,
      },
    }));
  };

  const handleClearResponse = () => {
    if (!currentQ) return;
    setCbtState((prev) => {
      const nextResponses = { ...prev.responses };
      delete nextResponses[currentQ.questionId];
      return {
        ...prev,
        responses: nextResponses,
      };
    });
  };

  const handleToggleMarkForReview = () => {
    if (!currentQ) return;
    const qId = currentQ.questionId;
    setCbtState((prev) => {
      const isMarked = prev.markedForReview.includes(qId);
      return {
        ...prev,
        markedForReview: isMarked
          ? prev.markedForReview.filter((id) => id !== qId)
          : [...prev.markedForReview, qId],
      };
    });
  };

  const handleNext = () => {
    setCbtState((prev) => ({
      ...prev,
      currentQIdx: Math.min(prev.questions.length - 1, prev.currentQIdx + 1),
    }));
  };

  const handleMarkAndNext = () => {
    handleToggleMarkForReview();
    handleNext();
  };

  const handlePrevious = () => {
    setCbtState((prev) => ({
      ...prev,
      currentQIdx: Math.max(0, prev.currentQIdx - 1),
    }));
  };

  // Normalization for question options
  const normalizedOptions = useMemo(() => {
    if (!currentQ || !currentQ.options) return [];
    if (Array.isArray(currentQ.options)) {
      return currentQ.options.map((opt: any, idx: number) => {
        if (typeof opt === "string") {
          const letter = String.fromCharCode(65 + idx);
          return { id: letter, text: opt };
        }
        return opt;
      });
    }
    return [];
  }, [currentQ]);

  // 1. Initial State: Exam Selection & Launch
  if (!cbtState.inExam) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center max-w-2xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center shadow-inner">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
              Contract CBT-001 Engine
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              NTA-Style Computer Based Test (CBT)
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed max-w-lg mx-auto">
              Server-authoritative clock synchronization, NTA question palette, resilient heartbeat autosave, and deterministic scoring.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-left space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Select Finalized Target Examination
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {exams.length === 0 && <option value="">No Finalized CBT Exams Found</option>}
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} ({ex.code}) — {ex.durationMinutes || 180} min
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-slate-600 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Authoritative Server Clock</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Periodic Heartbeat Autosave</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Mark for Review & Palette</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Deterministic Instant Scoring</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onStartCbtSimulation(selectedExamId)}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm py-3.5 px-6 rounded-xl transition shadow-sm flex items-center justify-center gap-2"
          >
            Launch CBT Examination
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // 2. Post-Submission Result State
  if (cbtState.submitted) {
    const result = cbtState.result;
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <h3 className="text-2xl font-black text-slate-900">CBT Examination Submitted!</h3>
            <p className="text-xs text-slate-500">
              Your responses have been processed through the deterministic academic evaluation pipeline.
            </p>
          </div>

          {result ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-left">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Total Score
                </span>
                <div className="text-2xl font-black text-slate-900">
                  {result.totalMarks ?? 0}
                  <span className="text-xs font-normal text-slate-500 ml-1">
                    / {result.maxMarks || result.questionDetails?.length * 4 || 100}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Accuracy
                </span>
                <div className="text-2xl font-black text-emerald-600">
                  {result.accuracyPercentage !== undefined
                    ? `${Math.round(result.accuracyPercentage)}%`
                    : "N/A"}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Correct / Incorrect
                </span>
                <div className="text-2xl font-black text-slate-900">
                  <span className="text-emerald-600">{result.correctCount ?? 0}</span>
                  <span className="text-slate-400 mx-1">/</span>
                  <span className="text-rose-600">{result.incorrectCount ?? 0}</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Cohort Percentile
                </span>
                <div className="text-2xl font-black text-blue-600">
                  {result.percentileRank !== undefined
                    ? `${result.percentileRank.toFixed(1)}%`
                    : "Recorded"}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-semibold text-slate-700">
              Exam successfully closed and archived in the immutable result store.
            </div>
          )}

          <div className="pt-4 flex justify-center gap-3">
            <button
              onClick={() =>
                setCbtState((prev) => ({
                  ...prev,
                  inExam: false,
                  submitted: false,
                  result: null,
                }))
              }
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-6 py-2.5 rounded-lg shadow-sm"
            >
              Return to Examination Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Active Examination Live Interface
  const isTimeCritical = remainingSeconds <= 300 && remainingSeconds > 0;
  const isExpired = remainingSeconds <= 0 && !!cbtState.expiresAt;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Top Header Bar */}
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-3.5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-black text-sm">
            CBT
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900">
              {cbtState.examTitle || "Competitive Examination CBT"}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>Candidate Roll: ONLINE</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                <Wifi className="w-3.5 h-3.5" />
                {cbtState.isSyncing ? "Syncing..." : "Server Heartbeat Active"}
              </span>
            </div>
          </div>
        </div>

        {/* Server Authoritative Timer & Submit */}
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono font-bold text-sm shadow-inner transition-colors ${
              isExpired
                ? "bg-rose-100 text-rose-800 border-rose-300"
                : isTimeCritical
                ? "bg-amber-50 text-amber-700 border-amber-300 animate-pulse"
                : "bg-slate-50 text-slate-800 border-slate-300"
            }`}
          >
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Time Left: {isExpired ? "00:00:00" : formatTime(remainingSeconds)}</span>
          </div>

          <button
            onClick={() => setShowConfirmModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Submit Exam
          </button>
        </div>
      </div>

      {/* Section Filter Tabs */}
      {sections.length > 1 && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setSelectedSection("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              selectedSection === "ALL"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            All Sections ({cbtState.questions.length})
          </button>
          {sections.map((sec) => (
            <button
              key={sec}
              onClick={() => setSelectedSection(sec)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedSection === sec
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {sec}
            </button>
          ))}
        </div>
      )}

      {/* Main Examination Workspace: Question Body (Left) + Palette (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Panel */}
        <div className="lg:col-span-3 space-y-4">
          {currentQ ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
              {/* Question Metadata Strip */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black px-2.5 py-1 rounded bg-blue-50 text-blue-700">
                    Question {cbtState.currentQIdx + 1} of {cbtState.questions.length}
                  </span>
                  {currentQ.subject && (
                    <span className="text-xs font-bold text-slate-600">
                      Subject: {currentQ.subject}
                    </span>
                  )}
                  {currentQ.type && (
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {currentQ.type.replace(/_/g, " ")}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    +{currentQ.marksCorrect ?? 4}
                  </span>
                  <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                    -{Math.abs(currentQ.marksIncorrect ?? 1)}
                  </span>
                </div>
              </div>

              {/* Question Body */}
              <div className="space-y-4">
                <div className="text-sm font-semibold text-slate-900 leading-relaxed whitespace-pre-line">
                  {currentQ.body}
                </div>

                {/* Options / Input Form */}
                <div className="pt-2">
                  {currentQ.type === "NUMERICAL" ? (
                    <div className="space-y-2 max-w-md">
                      <label className="block text-xs font-bold text-slate-600">
                        Enter Numerical Value:
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={cbtState.responses[currentQ.questionId] ?? ""}
                        onChange={(e) =>
                          handleSetNumerical(currentQ.questionId, e.target.value)
                        }
                        placeholder="e.g. 4.25 or -10"
                        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ) : currentQ.type === "MULTIPLE_CHOICE" ? (
                    <div className="space-y-2.5">
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        Multiple options may be correct
                      </span>
                      {normalizedOptions.map((opt: any) => {
                        const selectedList: string[] =
                          (cbtState.responses[currentQ.questionId] as string[]) || [];
                        const isChecked = selectedList.includes(opt.id);
                        return (
                          <label
                            key={opt.id}
                            className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition text-xs font-medium ${
                              isChecked
                                ? "bg-blue-50 border-blue-500 text-blue-900 font-bold"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() =>
                                handleToggleMultipleChoice(currentQ.questionId, opt.id)
                              }
                              className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            />
                            <span className="font-bold mr-1">({opt.id})</span>
                            <span className="flex-1">{opt.text}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    // Default SINGLE_CHOICE
                    <div className="space-y-2.5">
                      {normalizedOptions.map((opt: any) => {
                        const isSelected =
                          cbtState.responses[currentQ.questionId] === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              handleSelectSingleChoice(currentQ.questionId, opt.id)
                            }
                            className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition text-xs font-medium ${
                              isSelected
                                ? "bg-blue-50 border-blue-500 text-blue-900 font-bold shadow-sm"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${
                                isSelected
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : "border-slate-400 bg-white"
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <span className="font-bold">({opt.id})</span>
                            <span className="flex-1">{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    disabled={cbtState.currentQIdx === 0}
                    className="bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-lg transition flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={handleClearResponse}
                    className="bg-white border border-slate-300 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-bold px-3 py-2.5 rounded-lg transition flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Clear Response
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMarkAndNext}
                    className={`border text-xs font-bold px-4 py-2.5 rounded-lg transition flex items-center gap-1.5 ${
                      cbtState.markedForReview.includes(currentQ.questionId)
                        ? "bg-purple-100 border-purple-300 text-purple-900"
                        : "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    Mark for Review & Next
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2.5 rounded-lg transition shadow-sm flex items-center gap-1"
                  >
                    Save & Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
              No questions found for this section.
            </div>
          )}
        </div>

        {/* Question Palette (Right Column) */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
              Question Palette
            </h3>

            {/* Legend with live counts */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-600 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-emerald-600 text-white text-[9px] flex items-center justify-center font-bold">
                  {summaryCounts.answered}
                </span>
                <span>Answered</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-slate-200 text-slate-700 text-[9px] flex items-center justify-center font-bold">
                  {summaryCounts.notAnswered}
                </span>
                <span>Not Answered</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-purple-600 text-white text-[9px] flex items-center justify-center font-bold">
                  {summaryCounts.marked}
                </span>
                <span>Review</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-amber-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {summaryCounts.answeredAndMarked}
                </span>
                <span>Ans & Review</span>
              </div>
            </div>

            {/* Question Grid Buttons */}
            <div className="max-h-80 overflow-y-auto pr-1">
              <div className="grid grid-cols-5 gap-2">
                {cbtState.questions.map((q, idx) => {
                  const status = getQuestionStatus(q);
                  const isCurrent = idx === cbtState.currentQIdx;

                  let btnBg = "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200";
                  if (status === "ANSWERED") {
                    btnBg = "bg-emerald-600 border-emerald-700 text-white";
                  } else if (status === "MARKED_FOR_REVIEW") {
                    btnBg = "bg-purple-600 border-purple-700 text-white";
                  } else if (status === "ANSWERED_AND_MARKED") {
                    btnBg = "bg-amber-500 border-purple-600 text-white font-black ring-2 ring-purple-300";
                  }

                  return (
                    <button
                      key={q.questionId}
                      type="button"
                      onClick={() => setCbtState((prev) => ({ ...prev, currentQIdx: idx }))}
                      className={`w-9 h-9 rounded-lg border text-xs font-bold transition flex items-center justify-center relative ${btnBg} ${
                        isCurrent ? "ring-2 ring-blue-600 ring-offset-2" : ""
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Exam Drawer Action */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-lg transition shadow-sm"
              >
                Submit Examination
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-w-lg w-full space-y-6">
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">
                Confirm Examination Submission
              </h3>
              <p className="text-xs text-slate-500">
                Please review your question attempt summary before final submission. Once submitted, your answers will be finalized.
              </p>
            </div>

            {/* Stats Summary Table */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 divide-y divide-slate-200 text-xs">
              <div className="flex justify-between py-2">
                <span className="text-slate-600 font-semibold">Total Questions</span>
                <span className="font-bold text-slate-900">{summaryCounts.total}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-emerald-700 font-semibold">Answered</span>
                <span className="font-bold text-emerald-700">{summaryCounts.answered}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500 font-semibold">Not Answered</span>
                <span className="font-bold text-slate-700">{summaryCounts.notAnswered}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-purple-700 font-semibold">Marked for Review</span>
                <span className="font-bold text-purple-700">{summaryCounts.marked}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-amber-700 font-semibold">Answered & Marked for Review</span>
                <span className="font-bold text-amber-700">{summaryCounts.answeredAndMarked}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-lg transition"
              >
                Back to Exam
              </button>
              <button
                type="button"
                onClick={handleAutoSubmit}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-lg transition shadow-sm flex items-center gap-2"
              >
                {isSubmitting ? "Submitting..." : "Yes, Submit Final Exam"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
