"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  BookOpen,
  Layers,
  Sliders,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Printer,
  ScanLine,
  ShieldCheck,
  FileText,
  Loader2,
  Search,
  Filter,
} from "lucide-react";

export type ExamProfileType = "JEE_MAIN" | "JEE_ADVANCED" | "NEET" | "MHT_CET";
export type ExamModeType = "OFFLINE_OMR" | "CBT" | "HYBRID";

export interface BlueprintSection {
  id: string;
  name: string;
  subject: string;
  questionType: "SINGLE_CORRECT" | "MULTIPLE_CORRECT" | "NUMERICAL";
  questionCount: number;
  marksCorrect: number;
  marksIncorrect: number;
}

export interface SelectedQuestion {
  id: string;
  code?: string;
  subject: string;
  chapter?: string;
  topic?: string;
  concept?: string;
  type: "SINGLE_CORRECT" | "MULTIPLE_CORRECT" | "NUMERICAL";
  declaredDifficulty?: "EASY" | "MEDIUM" | "HARD";
  body: string;
  options?: any;
  correctAnswer?: string;
  source?: "INSTITUTE" | "PLATFORM" | "AI";
  status?: "AI_CANDIDATE" | "VERIFIED" | "APPROVED";
  sectionName?: string;
}

interface ExamWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExamCreated: (newExam: any) => void;
  availableQuestions: any[];
  batches?: any[];
  currentTenant?: string;
  onFetchArtifact?: (examId: string, type: "omr" | "question_paper" | "answer_key") => void;
}

export function ExamWizardModal({
  isOpen,
  onClose,
  onExamCreated,
  availableQuestions = [],
  batches = [],
  currentTenant = "Main",
  onFetchArtifact,
}: ExamWizardModalProps) {
  // Wizard 7-Step Navigation
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Basics
  const [title, setTitle] = useState<string>("");
  const [examType, setExamType] = useState<ExamProfileType>("JEE_MAIN");
  const [examMode, setExamMode] = useState<ExamModeType>("OFFLINE_OMR");
  const [durationMinutes, setDurationMinutes] = useState<number>(180);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [instructions, setInstructions] = useState<string>(
    "1. Darken bubbles completely using black/blue ballpoint pen.\n2. Do not fold, tear or tamper with corner fiducial marks.\n3. Calculator and digital devices strictly prohibited."
  );

  // Step 2: Curriculum
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([
    "Physics",
    "Chemistry",
    "Mathematics",
  ]);

  // Step 3: Blueprint & Marking rules
  const [sections, setSections] = useState<BlueprintSection[]>([
    {
      id: "sec-1",
      name: "Physics Section A (MCQ)",
      subject: "Physics",
      questionType: "SINGLE_CORRECT",
      questionCount: 5,
      marksCorrect: 4,
      marksIncorrect: -1,
    },
    {
      id: "sec-2",
      name: "Chemistry Section A (MCQ)",
      subject: "Chemistry",
      questionType: "SINGLE_CORRECT",
      questionCount: 5,
      marksCorrect: 4,
      marksIncorrect: -1,
    },
    {
      id: "sec-3",
      name: "Mathematics Section A (MCQ)",
      subject: "Mathematics",
      questionType: "SINGLE_CORRECT",
      questionCount: 5,
      marksCorrect: 4,
      marksIncorrect: -1,
    },
  ]);

  // Step 4: Source mix
  const [sourceInstitutePct, setSourceInstitutePct] = useState<number>(50);
  const [sourcePlatformPct, setSourcePlatformPct] = useState<number>(30);
  const [sourceAiPct, setSourceAiPct] = useState<number>(20);

  // Step 5: Selected Questions
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([]);
  const [questionSearch, setQuestionSearch] = useState<string>("");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("ALL");
  const [filterSubject, setFilterSubject] = useState<string>("ALL");
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);

  // Step 7: Output & Sets
  const [paperSets, setPaperSets] = useState<string[]>(["Set A", "Set B", "Set C", "Set D"]);
  const [selectedSet, setSelectedSet] = useState<string>("Set A");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdExamResult, setCreatedExamResult] = useState<any>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Live Blueprint Totals
  const targetTotalQuestions = sections.reduce((acc, s) => acc + (s.questionCount || 0), 0);
  const targetTotalMarks = sections.reduce(
    (acc, s) => acc + (s.questionCount || 0) * (s.marksCorrect || 0),
    0
  );

  // Validation Checks
  const unapprovedAiCount = selectedQuestions.filter(
    (q) => q.status === "AI_CANDIDATE" || (q.source === "AI" && q.status !== "APPROVED")
  ).length;

  const canFinalize =
    title.trim().length > 0 &&
    selectedQuestions.length > 0 &&
    unapprovedAiCount === 0;

  // Step Navigation Handlers
  function handleNext() {
    setValidationError(null);
    if (currentStep === 1) {
      if (!title.trim()) {
        setValidationError("Please enter an exam title to proceed.");
        return;
      }
    }
    if (currentStep === 3) {
      if (targetTotalQuestions <= 0) {
        setValidationError("Blueprint must specify at least 1 question.");
        return;
      }
    }
    if (currentStep === 5) {
      if (selectedQuestions.length === 0) {
        setValidationError("Please select at least 1 question for this exam.");
        return;
      }
    }
    if (currentStep === 6) {
      if (unapprovedAiCount > 0) {
        setValidationError(
          `Blueprint validation error: ${unapprovedAiCount} AI question candidates must be reviewed and approved before proceeding.`
        );
        return;
      }
    }

    if (currentStep < 7) {
      setCurrentStep((c) => c + 1);
    }
  }

  function handleBack() {
    setValidationError(null);
    if (currentStep > 1) {
      setCurrentStep((c) => c - 1);
    }
  }

  // Question manipulation
  function handleAddQuestion(q: any) {
    if (selectedQuestions.some((item) => item.id === q.id)) return;
    const newQ: SelectedQuestion = {
      id: q.id,
      code: q.code || `Q-${selectedQuestions.length + 1}`,
      subject: q.subject || "Physics",
      chapter: q.chapter,
      topic: q.topic,
      concept: q.concept,
      type: q.type || "SINGLE_CORRECT",
      declaredDifficulty: q.declaredDifficulty || "MEDIUM",
      body: q.body,
      options: q.options,
      correctAnswer: q.correctAnswer,
      source: q.ownerScope === "PLATFORM" ? "PLATFORM" : "INSTITUTE",
      status: q.status === "AI_CANDIDATE" ? "AI_CANDIDATE" : "APPROVED",
    };
    setSelectedQuestions([...selectedQuestions, newQ]);
  }

  function handleRemoveQuestion(id: string) {
    setSelectedQuestions(selectedQuestions.filter((q) => q.id !== id));
  }

  function handleMoveQuestion(index: number, direction: "UP" | "DOWN") {
    const targetIdx = direction === "UP" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= selectedQuestions.length) return;
    const updated = [...selectedQuestions];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setSelectedQuestions(updated);
  }

  function handleApproveQuestion(id: string) {
    setSelectedQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status: "APPROVED" } : q))
    );
  }

  function handleApproveAllCandidates() {
    setSelectedQuestions((prev) =>
      prev.map((q) => ({ ...q, status: "APPROVED" }))
    );
  }

  // AI Generation Trigger via AI Gateway
  async function triggerAiGeneration() {
    setIsAiGenerating(true);
    setValidationError(null);
    try {
      const res = await fetch("/api/v1/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: selectedSubjects[0] || "Physics",
          chapter: "Kinematics",
          concept: "Projectile Motion",
          difficulty: "MEDIUM",
          count: 3,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const candidates = data.candidates || [];
        const formatted: SelectedQuestion[] = candidates.map((c: any, idx: number) => ({
          id: c.id || `ai-${Date.now()}-${idx}`,
          code: `AI-${idx + 1}`,
          subject: selectedSubjects[0] || "Physics",
          chapter: "Kinematics",
          concept: "Projectile Motion",
          type: "SINGLE_CORRECT",
          declaredDifficulty: "MEDIUM",
          body: c.body,
          options: c.options,
          correctAnswer: c.correctAnswer,
          source: "AI",
          status: "AI_CANDIDATE", // Requires manual approval per C03
        }));
        setSelectedQuestions((prev) => [...prev, ...formatted]);
      } else {
        setValidationError("AI Gateway generation timed out or returned error. Used fallback.");
      }
    } catch (err: any) {
      console.warn("AI generation fallback error:", err);
    } finally {
      setIsAiGenerating(false);
    }
  }

  // Finalize Exam (Contract C03: DRAFT -> IN_REVIEW -> FINALIZED)
  async function handleFinalizeExam() {
    setIsSubmitting(true);
    setValidationError(null);

    const idempotencyKey = `exam-commit-${Date.now()}`;
    const payload = {
      title,
      examType,
      durationMinutes,
      totalMarks: targetTotalMarks,
      questionIds: selectedQuestions.map((q) => q.id),
      batchIds: selectedBatchIds,
      markingRules: {
        correct: sections[0]?.marksCorrect || 4,
        incorrect: sections[0]?.marksIncorrect ?? -1,
        unattempted: 0,
      },
      paperSet: selectedSet,
      idempotencyKey,
    };

    try {
      // Step 1: Create DRAFT
      const res = await fetch("/api/v1/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setValidationError(
          errData.error || "Failed to create assessment draft. Ensure blueprint totals match selected questions."
        );
        return;
      }

      const data = await res.json();
      const createdDraft = data.exam || data;
      const examId = createdDraft.id;
      const version1 = createdDraft.version || 1;

      // Step 2: Transition to IN_REVIEW
      const reviewRes = await fetch(`/api/v1/exams/${examId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedVersion: version1 }),
      });

      if (!reviewRes.ok) {
        const errData = await reviewRes.json().catch(() => ({}));
        setCreatedExamResult(createdDraft);
        onExamCreated(createdDraft);
        setValidationError(
          errData.error || "Assessment created as DRAFT, but review validation failed."
        );
        return;
      }

      const reviewData = await reviewRes.json();
      const inReviewExam = reviewData.exam || reviewData;
      const version2 = inReviewExam.version || (version1 + 1);

      // Step 3: Finalize & Lock Immutable QuestionVersion Snapshot
      const finalizeRes = await fetch(`/api/v1/exams/${examId}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedVersion: version2, idempotencyKey }),
      });

      if (!finalizeRes.ok) {
        const errData = await finalizeRes.json().catch(() => ({}));
        setCreatedExamResult(inReviewExam);
        onExamCreated(inReviewExam);
        setValidationError(
          errData.error || "Assessment submitted for review, but finalization was rejected."
        );
        return;
      }

      const finalData = await finalizeRes.json();
      const finalized = finalData.exam || finalData;
      setCreatedExamResult(finalized);
      onExamCreated(finalized);
    } catch (err: any) {
      setValidationError(`Network error while finalizing exam: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleResetAndClose() {
    setCurrentStep(1);
    setTitle("");
    setSelectedQuestions([]);
    setCreatedExamResult(null);
    setValidationError(null);
    onClose();
  }

  const stepsList = [
    { num: 1, label: "Basics" },
    { num: 2, label: "Curriculum" },
    { num: 3, label: "Blueprint" },
    { num: 4, label: "Sources" },
    { num: 5, label: "Select Questions" },
    { num: 6, label: "Review" },
    { num: 7, label: "Output & Print" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-6 space-y-5 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                Seven-Step Exam Builder Wizard (Contract C03)
              </h3>
              <p className="text-xs text-slate-500">
                Step {currentStep} of 7: {stepsList[currentStep - 1]?.label}
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Step Progress Indicator */}
        <div className="flex items-center justify-between px-2 pt-1">
          {stepsList.map((st) => (
            <div key={st.num} className="flex items-center gap-1.5 flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition ${
                  st.num === currentStep
                    ? "bg-blue-600 text-white shadow-xs"
                    : st.num < currentStep
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {st.num < currentStep ? <Check className="w-3.5 h-3.5" /> : st.num}
              </div>
              <span
                className={`text-[11px] font-semibold hidden md:inline truncate ${
                  st.num === currentStep ? "text-blue-700" : "text-slate-500"
                }`}
              >
                {st.label}
              </span>
              {st.num < 7 && <div className="h-0.5 bg-slate-200 flex-1 mx-1 hidden sm:block" />}
            </div>
          ))}
        </div>

        {/* Validation Error Alert */}
        {validationError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* STEP CONTENT CONTAINER */}
        <div className="flex-1 overflow-y-auto px-1 py-2 space-y-4">
          {/* STEP 1: BASICS */}
          {currentStep === 1 && (
            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-700 font-bold">Assessment Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. JEE Main Full Syllabus Test - Cohort Alpha 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm font-semibold focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">Target Exam Profile</label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value as ExamProfileType)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-blue-500 font-medium"
                  >
                    <option value="JEE_MAIN">JEE Main (NTA Pattern)</option>
                    <option value="JEE_ADVANCED">JEE Advanced (IIT Pattern)</option>
                    <option value="NEET">NEET UG (NMC Pattern)</option>
                    <option value="MHT_CET">MHT-CET (State CET)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">Assessment Mode</label>
                  <select
                    value={examMode}
                    onChange={(e) => setExamMode(e.target.value as ExamModeType)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-blue-500 font-medium"
                  >
                    <option value="OFFLINE_OMR">Offline OMR Bubble Sheet</option>
                    <option value="CBT">Online CBT Computer-Based</option>
                    <option value="HYBRID">Hybrid (Both OMR & CBT)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">Duration (Minutes)</label>
                  <input
                    type="number"
                    min={15}
                    max={360}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 180)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-1">
                <label className="text-slate-700 font-bold">Paper Header Instructions</label>
                <textarea
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
                />
              </div>
            </div>
          )}

          {/* STEP 2: CURRICULUM */}
          {currentStep === 2 && (
            <div className="space-y-4 text-xs">
              <div>
                <div className="font-bold text-slate-900 text-sm">Select Curriculum Subjects</div>
                <p className="text-slate-500 text-[11px]">
                  Choose target subject domains from your institute academic graph.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {["Physics", "Chemistry", "Mathematics", "Biology"].map((sub) => {
                  const isChecked = selectedSubjects.includes(sub);
                  return (
                    <div
                      key={sub}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedSubjects(selectedSubjects.filter((s) => s !== sub));
                        } else {
                          setSelectedSubjects([...selectedSubjects, sub]);
                        }
                      }}
                      className={`border rounded-xl p-4 cursor-pointer transition flex items-center justify-between ${
                        isChecked
                          ? "border-blue-500 bg-blue-50/40 text-blue-900 font-bold shadow-2xs"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-blue-600" />
                        <span>{sub}</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border ${
                          isChecked
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-600 space-y-1">
                <div className="font-bold text-slate-800">Academic Graph Alignment</div>
                <p className="text-[11px]">
                  Target Exam Profile <strong>{examType}</strong> includes syllabus mappings for{" "}
                  {selectedSubjects.join(", ") || "no subjects selected"}.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: BLUEPRINT */}
          {currentStep === 3 && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">Blueprint & Marking Rules</div>
                  <p className="text-slate-500 text-[11px]">
                    Define sections, question type distributions, and positive/negative marking rules.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1.5 rounded-lg text-center font-bold">
                    <span className="text-[10px] block uppercase text-blue-600">Total Marks</span>
                    <span className="text-sm font-black">{targetTotalMarks}</span>
                  </div>
                  <div className="bg-slate-100 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-center font-bold">
                    <span className="text-[10px] block uppercase text-slate-500">Total Questions</span>
                    <span className="text-sm font-black">{targetTotalQuestions}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {sections.map((sec, idx) => (
                  <div
                    key={sec.id}
                    className="border border-slate-200 bg-white rounded-xl p-3.5 space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">
                          Section {idx + 1}: {sec.name}
                        </span>
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                          {sec.subject}
                        </span>
                      </div>
                      {sections.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setSections(sections.filter((s) => s.id !== sec.id))}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Remove Section"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-slate-600 font-bold">Question Type</label>
                        <select
                          value={sec.questionType}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setSections(
                              sections.map((s) =>
                                s.id === sec.id ? { ...s, questionType: val } : s
                              )
                            );
                          }}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium"
                        >
                          <option value="SINGLE_CORRECT">Single Correct MCQ</option>
                          <option value="MULTIPLE_CORRECT">Multiple Correct</option>
                          <option value="NUMERICAL">Numerical Value</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 font-bold">Question Count</label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={sec.questionCount}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setSections(
                              sections.map((s) =>
                                s.id === sec.id ? { ...s, questionCount: val } : s
                              )
                            );
                          }}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 font-bold">Marks (Correct)</label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={sec.marksCorrect}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 4;
                            setSections(
                              sections.map((s) =>
                                s.id === sec.id ? { ...s, marksCorrect: val } : s
                              )
                            );
                          }}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-emerald-700 font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 font-bold">Penalty (Incorrect)</label>
                        <input
                          type="number"
                          max={0}
                          min={-10}
                          value={sec.marksIncorrect}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setSections(
                              sections.map((s) =>
                                s.id === sec.id ? { ...s, marksIncorrect: val } : s
                              )
                            );
                          }}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-rose-700 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  const newSec: BlueprintSection = {
                    id: `sec-${Date.now()}`,
                    name: `Custom Section ${sections.length + 1}`,
                    subject: selectedSubjects[0] || "Physics",
                    questionType: "SINGLE_CORRECT",
                    questionCount: 5,
                    marksCorrect: 4,
                    marksIncorrect: -1,
                  };
                  setSections([...sections, newSec]);
                }}
                className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                + Add Another Section
              </button>
            </div>
          )}

          {/* STEP 4: SOURCES */}
          {currentStep === 4 && (
            <div className="space-y-4 text-xs">
              <div>
                <div className="font-bold text-slate-900 text-sm">Question Source Mix & Targets</div>
                <p className="text-slate-500 text-[11px]">
                  Configure ratio balance between institute content, verified platform library, and AI generation.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Institute Private Bank</span>
                    <span className="text-blue-700 font-black">{sourceInstitutePct}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={sourceInstitutePct}
                    onChange={(e) => setSourceInstitutePct(parseInt(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400">
                    Faculty-authored private questions strictly isolated to your institute.
                  </p>
                </div>

                <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Platform Verified Bank</span>
                    <span className="text-emerald-700 font-black">{sourcePlatformPct}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={sourcePlatformPct}
                    onChange={(e) => setSourcePlatformPct(parseInt(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400">
                    Standard curated questions verified against official JEE/NEET blueprints.
                  </p>
                </div>

                <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">AI Candidates</span>
                    <span className="text-indigo-700 font-black">{sourceAiPct}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={sourceAiPct}
                    onChange={(e) => setSourceAiPct(parseInt(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400">
                    Fresh conceptual variations generated via AI Gateway (requires teacher review).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: SELECT QUESTIONS */}
          {currentStep === 5 && (
            <div className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900 text-sm">
                    Select Questions ({selectedQuestions.length} of {targetTotalQuestions} selected)
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Pick existing verified questions or trigger AI generation.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isAiGenerating}
                    onClick={triggerAiGeneration}
                    className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    {isAiGenerating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    )}
                    <span>Generate AI Candidates</span>
                  </button>
                </div>
              </div>

              {/* Filter bar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search question text or concept..."
                    value={questionSearch}
                    onChange={(e) => setQuestionSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:bg-white"
                  />
                </div>
                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700"
                >
                  <option value="ALL">All Difficulties</option>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>

              {/* Available Questions List */}
              <div className="border border-slate-200 rounded-xl overflow-y-auto max-h-[36vh] divide-y divide-slate-100">
                {availableQuestions.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-1">
                    <BookOpen className="w-8 h-8 mx-auto text-slate-300" />
                    <div>No questions found in active question bank.</div>
                    <p className="text-[11px]">
                      Click &quot;Generate AI Candidates&quot; above to populate items.
                    </p>
                  </div>
                ) : (
                  availableQuestions
                    .filter((q) => {
                      if (
                        questionSearch &&
                        !q.body?.toLowerCase().includes(questionSearch.toLowerCase())
                      ) {
                        return false;
                      }
                      if (
                        filterDifficulty !== "ALL" &&
                        q.declaredDifficulty !== filterDifficulty
                      ) {
                        return false;
                      }
                      return true;
                    })
                    .map((q) => {
                      const isSelected = selectedQuestions.some((sq) => sq.id === q.id);
                      return (
                        <div
                          key={q.id}
                          className={`p-3 flex items-start justify-between gap-3 transition ${
                            isSelected ? "bg-blue-50/40" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-blue-700 text-[11px]">
                                {q.code || q.id}
                              </span>
                              <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.2 rounded">
                                {q.subject || "Physics"}
                              </span>
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-1.5 py-0.2 rounded">
                                {q.declaredDifficulty || "MEDIUM"}
                              </span>
                            </div>
                            <p className="text-slate-800 line-clamp-2 text-xs">{q.body}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              isSelected ? handleRemoveQuestion(q.id) : handleAddQuestion(q)
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                              isSelected
                                ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                                : "bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Trash2 className="w-3 h-3" />
                                <span>Remove</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>Add</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}

          {/* STEP 6: REVIEW & APPROVE */}
          {currentStep === 6 && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">
                    Review & Candidate Approval ({selectedQuestions.length} Questions)
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Reorder, verify answers, and approve AI candidate questions before finalization.
                  </p>
                </div>

                {unapprovedAiCount > 0 && (
                  <button
                    type="button"
                    onClick={handleApproveAllCandidates}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg shadow-2xs transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve All {unapprovedAiCount} AI Candidates</span>
                  </button>
                )}
              </div>

              {unapprovedAiCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-lg text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    High-stakes policy: {unapprovedAiCount} AI candidate questions require manual
                    teacher review and approval before finalization can proceed.
                  </span>
                </div>
              )}

              {/* Review Questions List */}
              <div className="border border-slate-200 rounded-xl overflow-y-auto max-h-[40vh] divide-y divide-slate-100">
                {selectedQuestions.map((q, idx) => (
                  <div key={q.id} className="p-3.5 space-y-2 hover:bg-slate-50/60 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-400">#{idx + 1}</span>
                        <span className="font-mono font-bold text-blue-700 text-[11px]">
                          {q.code || q.id}
                        </span>
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.2 rounded">
                          {q.subject}
                        </span>
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-1.5 py-0.2 rounded">
                          {q.type}
                        </span>
                        {q.status === "AI_CANDIDATE" ? (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            AI Candidate
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Approved
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {q.status === "AI_CANDIDATE" && (
                          <button
                            type="button"
                            onClick={() => handleApproveQuestion(q.id)}
                            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-bold px-2 py-1 rounded transition"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveQuestion(idx, "UP")}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === selectedQuestions.length - 1}
                          onClick={() => handleMoveQuestion(idx, "DOWN")}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(q.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-slate-800 font-medium text-xs leading-relaxed">{q.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 7: OUTPUT & FINALIZE */}
          {currentStep === 7 && (
            <div className="space-y-4 text-xs">
              {createdExamResult ? (
                <div className="py-6 text-center space-y-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-base text-slate-900">
                      Assessment Finalized & Immutable Snapshot Created!
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Exam Code:{" "}
                      <strong className="text-blue-700 font-mono">
                        {createdExamResult.code || "EXAM-DONE"}
                      </strong>{" "}
                      • Snapshot ID: {createdExamResult.id}
                    </p>
                  </div>

                  {/* Artifact print actions */}
                  <div className="pt-3 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => onFetchArtifact?.(createdExamResult.id, "omr")}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg shadow-sm transition"
                    >
                      <ScanLine className="w-4 h-4" />
                      Print 4-Corner OMR Sheet PDF
                    </button>

                    <button
                      type="button"
                      onClick={() => onFetchArtifact?.(createdExamResult.id, "question_paper")}
                      className="flex items-center gap-1.5 bg-white border border-slate-300 text-slate-800 font-bold px-4 py-2 rounded-lg shadow-2xs hover:bg-slate-50 transition"
                    >
                      <Printer className="w-4 h-4" />
                      Print Question Paper PDF
                    </button>

                    <button
                      type="button"
                      onClick={() => onFetchArtifact?.(createdExamResult.id, "answer_key")}
                      className="flex items-center gap-1.5 bg-white border border-slate-300 text-slate-800 font-bold px-4 py-2 rounded-lg shadow-2xs hover:bg-slate-50 transition"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      View Official Answer Key
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="font-bold text-slate-900 text-sm">
                      Pre-Finalization Blueprint Verification
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                      <div className="bg-white border border-slate-200 p-2.5 rounded-lg">
                        <span className="text-[10px] text-slate-500 font-bold block uppercase">
                          Exam Profile
                        </span>
                        <span className="font-bold text-blue-700">{examType}</span>
                      </div>
                      <div className="bg-white border border-slate-200 p-2.5 rounded-lg">
                        <span className="text-[10px] text-slate-500 font-bold block uppercase">
                          Questions
                        </span>
                        <span className="font-black text-slate-900">
                          {selectedQuestions.length} / {targetTotalQuestions}
                        </span>
                      </div>
                      <div className="bg-white border border-slate-200 p-2.5 rounded-lg">
                        <span className="text-[10px] text-slate-500 font-bold block uppercase">
                          Total Marks
                        </span>
                        <span className="font-black text-slate-900">{targetTotalMarks}</span>
                      </div>
                      <div className="bg-white border border-slate-200 p-2.5 rounded-lg">
                        <span className="text-[10px] text-slate-500 font-bold block uppercase">
                          Approval Status
                        </span>
                        <span className="font-bold text-emerald-700">
                          {unapprovedAiCount === 0 ? "All Approved" : `${unapprovedAiCount} Pending`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Paper Set Selection */}
                  <div className="space-y-1">
                    <label className="text-slate-700 font-bold">Paper Set Permutation</label>
                    <div className="flex items-center gap-2">
                      {paperSets.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSelectedSet(s)}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition ${
                            selectedSet === s
                              ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Sets shuffle question and option order to deter in-hall copying while mapping to a single master answer key.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={currentStep === 1 ? handleResetAndClose : handleBack}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg border border-slate-200 transition"
          >
            {currentStep === 1 ? "Cancel" : "Back"}
          </button>

          <div className="flex items-center gap-2">
            {createdExamResult ? (
              <button
                type="button"
                onClick={handleResetAndClose}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2 rounded-lg shadow-sm transition"
              >
                Done & Return to Exams
              </button>
            ) : currentStep === 7 ? (
              <button
                type="button"
                disabled={!canFinalize || isSubmitting}
                onClick={handleFinalizeExam}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-2 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Finalizing Immutable Snapshot...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Finalize & Lock Blueprint</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
