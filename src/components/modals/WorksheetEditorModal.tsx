"use client";

import React, { useState } from "react";
import {
  X,
  FileText,
  Download,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react";

export interface WorksheetQuestionItem {
  id: string;
  orderIndex: number;
  tier: "Foundation" | "Application" | "Exam-Level";
  body: string;
  options: { id: string; text: string }[];
}

export interface WorksheetEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  concept: string;
  onSaveAndExportPdf: (editedQuestions: WorksheetQuestionItem[]) => void;
}

export const WorksheetEditorModal: React.FC<WorksheetEditorModalProps> = ({
  isOpen,
  onClose,
  concept,
  onSaveAndExportPdf,
}) => {
  const [questions, setQuestions] = useState<WorksheetQuestionItem[]>([
    {
      id: "wq-1",
      orderIndex: 1,
      tier: "Foundation",
      body: "State the definition of limiting friction and write its formula in terms of normal reaction N.",
      options: [
        { id: "A", text: "f_L = mu_s * N" },
        { id: "B", text: "f_L = mu_k * N" },
        { id: "C", text: "f_L = N / mu_s" },
        { id: "D", text: "f_L = mu_s * N^2" },
      ],
    },
    {
      id: "wq-2",
      orderIndex: 2,
      tier: "Foundation",
      body: "Which type of friction is a self-adjusting force up to a limiting maximum value?",
      options: [
        { id: "A", text: "Static friction" },
        { id: "B", text: "Kinetic friction" },
        { id: "C", text: "Rolling friction" },
        { id: "D", text: "Viscous drag" },
      ],
    },
    {
      id: "wq-3",
      orderIndex: 3,
      tier: "Application",
      body: "A 5 kg block rests on a horizontal plane with coefficient of static friction 0.4. What minimum horizontal force moves it?",
      options: [
        { id: "A", text: "19.6 N" },
        { id: "B", text: "9.8 N" },
        { id: "C", text: "24.5 N" },
        { id: "D", text: "49.0 N" },
      ],
    },
    {
      id: "wq-4",
      orderIndex: 4,
      tier: "Application",
      body: "Calculate acceleration if a 25 N pull is applied to the block in the previous question (take kinetic mu = 0.3).",
      options: [
        { id: "A", text: "2.06 m/s^2" },
        { id: "B", text: "1.25 m/s^2" },
        { id: "C", text: "3.42 m/s^2" },
        { id: "D", text: "0.50 m/s^2" },
      ],
    },
    {
      id: "wq-5",
      orderIndex: 5,
      tier: "Exam-Level",
      body: "Two blocks of masses 2 kg and 4 kg are stacked. Find the maximum force applied to lower block so both move without slipping.",
      options: [
        { id: "A", text: "17.64 N" },
        { id: "B", text: "35.28 N" },
        { id: "C", text: "11.76 N" },
        { id: "D", text: "52.92 N" },
      ],
    },
  ]);

  const [activePreview, setActivePreview] = useState<boolean>(false);

  if (!isOpen) return null;

  const moveQuestion = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === questions.length - 1) return;

    const newIdx = direction === "up" ? index - 1 : index + 1;
    const updated = [...questions];
    const temp = updated[index];
    updated[index] = updated[newIdx];
    updated[newIdx] = temp;

    // Update orderIndices
    const reordered = updated.map((q, idx) => ({ ...q, orderIndex: idx + 1 }));
    setQuestions(reordered);
  };

  const removeQuestion = (id: string) => {
    const remaining = questions.filter((q) => q.id !== id).map((q, idx) => ({ ...q, orderIndex: idx + 1 }));
    setQuestions(remaining);
  };

  const handleUpdateBody = (id: string, newBody: string) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, body: newBody } : q)));
  };

  const handleUpdateTier = (id: string, newTier: "Foundation" | "Application" | "Exam-Level") => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, tier: newTier } : q)));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="worksheet-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 id="worksheet-modal-title" className="font-bold text-slate-900 text-base">
                Remedial Worksheet Practice Ladder Editor
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Concept Target: <strong className="text-amber-800">{concept}</strong> (Tiered Progression)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActivePreview(!activePreview)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
            >
              <Eye className="w-3.5 h-3.5" />
              {activePreview ? "Editor Mode" : "Preview PDF Layout"}
            </button>
            <button onClick={onClose} aria-label="Close modal" className="text-slate-400 hover:text-slate-700 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activePreview ? (
            /* Printable PDF Preview */
            <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-8 max-w-2xl mx-auto space-y-6 text-slate-900 font-serif">
              <div className="text-center border-b pb-4 space-y-1">
                <div className="text-xs uppercase tracking-widest text-slate-500 font-sans font-bold">
                  WebPie Academic OS Remedial Series
                </div>
                <h2 className="text-lg font-bold">Concept Practice Ladder: {concept}</h2>
                <div className="text-xs text-slate-500 font-sans">
                  Targeted Tier: Foundation → Application → Exam Mastery
                </div>
              </div>

              <div className="space-y-4 text-xs font-sans">
                {questions.map((q) => (
                  <div key={q.id} className="space-y-1.5 border-b border-slate-200 pb-3">
                    <div className="flex items-center justify-between font-bold">
                      <span>
                        Q{q.orderIndex}. {q.body}
                      </span>
                      <span className="text-[10px] text-blue-700 font-mono bg-blue-50 px-1.5 py-0.5 rounded">
                        [{q.tier}]
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pl-4 text-slate-700">
                      {q.options.map((opt) => (
                        <div key={opt.id} className="text-[11px]">
                          ({opt.id}) {opt.text}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Interactive Ladder Question Editor */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Configure ladder tier progression and reorder questions:</span>
                <span className="font-bold text-slate-800">{questions.length} Practice Items</span>
              </div>

              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm hover:border-slate-300 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-800 font-mono font-bold text-xs flex items-center justify-center">
                        Q{q.orderIndex}
                      </span>
                      <select
                        value={q.tier}
                        onChange={(e) => handleUpdateTier(q.id, e.target.value as any)}
                        className="text-xs font-bold bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-800"
                      >
                        <option value="Foundation">Foundation (Definition & Formula)</option>
                        <option value="Application">Application (Single-Step Calculation)</option>
                        <option value="Exam-Level">Exam-Level (Multi-Concept JEE/NEET)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveQuestion(idx, "up")}
                        disabled={idx === 0}
                        className="p-1 hover:bg-slate-100 disabled:opacity-30 rounded text-slate-600"
                        title="Move Up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveQuestion(idx, "down")}
                        disabled={idx === questions.length - 1}
                        className="p-1 hover:bg-slate-100 disabled:opacity-30 rounded text-slate-600"
                        title="Move Down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeQuestion(q.id)}
                        className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded ml-1"
                        title="Delete Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    value={q.body}
                    onChange={(e) => handleUpdateBody(q.id, e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Export generates PDF remedial worksheet with embedded student QR and marking rubric.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={() => onSaveAndExportPdf(questions)}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              Save & Export PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
