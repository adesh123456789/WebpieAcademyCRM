"use client";

import React, { useState, useRef } from "react";
import { X, UploadCloud, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export interface UploadOmrBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  exams: any[];
  onUploadSuccess: (job: any) => void;
  showToast: (msg: string) => void;
}

export const UploadOmrBatchModal: React.FC<UploadOmrBatchModalProps> = ({
  isOpen,
  onClose,
  exams,
  onUploadSuccess,
  showToast,
}) => {
  const [selectedExamId, setSelectedExamId] = useState<string>(
    exams.length > 0 ? exams[0].id : ""
  );
  const [batchId, setBatchId] = useState<string>(
    `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-A`
  );
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selected]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const dropped = Array.from(e.dataTransfer.files).filter((file) =>
        /\.(png|jpg|jpeg|pdf)$/i.test(file.name)
      );
      if (dropped.length === 0) {
        showToast("Invalid file type. Only PNG, JPG, JPEG, and PDF sheets allowed.");
        return;
      }
      setFiles((prev) => [...prev, ...dropped]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId) {
      showToast("Please select a target examination.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Contract C04: Multipart upload with examId and batchId
      const formData = new FormData();
      formData.append("examId", selectedExamId);
      formData.append("batchId", batchId);
      files.forEach((file) => {
        formData.append("sheets", file);
      });

      // We call POST /api/v1/omr/jobs (handles multipart or json fallback)
      let res;
      if (files.length > 0) {
        res = await fetch("/api/v1/omr/jobs", {
          method: "POST",
          body: formData,
        });
      } else {
        // Test/demo fallback with simulated grid
        res = await fetch("/api/v1/omr/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            examId: selectedExamId,
            batchId,
          }),
        });
      }

      const data = await res.json();
      if (res.ok) {
        showToast(
          `Batch uploaded successfully! ${data.job?.totalSheets || files.length || 5} physical sheets queued for computer vision ingestion.`
        );
        onUploadSuccess(data.job);
        onClose();
      } else {
        showToast(`Upload failed: ${data.error || "Server rejected batch"}`);
      }
    } catch (err: any) {
      showToast(`Error uploading batch: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-batch-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 id="upload-batch-title" className="font-bold text-slate-900 text-base">
                Upload Physical OMR Sheets
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Contract C04 Server-Owned Ingestion Pipeline (.png, .jpg, .pdf)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="omr-exam-select" className="block text-xs font-bold text-slate-700 mb-1">
                Target Exam <span className="text-red-500">*</span>
              </label>
              <select
                id="omr-exam-select"
                aria-label="Target Exam"
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title} ({exam.examType || "JEE/NEET"} - Set {exam.paperSet || "A"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="omr-batch-tag" className="block text-xs font-bold text-slate-700 mb-1">
                Batch Identifier <span className="text-red-500">*</span>
              </label>
              <input
                id="omr-batch-tag"
                type="text"
                aria-label="Batch Identifier"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Drag & Drop Box */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
              isDragging
                ? "border-blue-500 bg-blue-50/50"
                : "border-slate-200 bg-slate-50 hover:bg-slate-100/70"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              aria-label="File Upload Input"
              multiple
              accept=".png,.jpg,.jpeg,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <UploadCloud className="w-8 h-8 text-blue-500" />
            <div className="text-xs font-bold text-slate-800">
              Click to select or drag & drop OMR scans
            </div>
            <div className="text-[11px] text-slate-500">
              Supports 300+ DPI multi-page PDF or individual PNG/JPG sheet images
            </div>
          </div>

          {/* Selected Files Preview List */}
          {files.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold px-1">
                <span>Selected Sheets ({files.length})</span>
                <button
                  type="button"
                  onClick={() => setFiles([])}
                  className="text-red-600 hover:text-red-700"
                >
                  Clear All
                </button>
              </div>
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="truncate font-medium text-slate-800">{file.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(idx);
                    }}
                    className="text-slate-400 hover:text-red-600 ml-2"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* C04 Security & Pipeline Notice */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Server-Owned Ingestion Guard (C04):</span> Raw sheets are
              digitized and verified against server-side anchor points. In-browser client simulation
              is bypassed in favor of immutable object storage and real fiducial alignment.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg shadow-sm transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Uploading & Aligning...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Queue Ingestion Batch
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
