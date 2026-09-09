"use client";

import React, { useState, useMemo } from "react";
import {
  Award,
  Users,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Download,
  Filter,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  PieChart,
  BarChart3,
  ExternalLink,
} from "lucide-react";

export interface AnalyticsViewProps {
  students: any[];
  exams?: any[];
  resultsData?: {
    exam?: any;
    analytics?: {
      totalStudents: number;
      highestScore: number;
      lowestScore: number;
      averageScore: number;
      subjectStats: { subject: string; averagePercentage: number }[];
    };
    leaderboard?: any[];
  } | null;
  onSelectExam?: (examId: string) => void;
  onOpenDrilldown?: (studentResult: any) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  students,
  exams = [],
  resultsData,
  onSelectExam,
  onOpenDrilldown,
}) => {
  const [selectedExamId, setSelectedExamId] = useState<string>(
    resultsData?.exam?.id || (exams.length > 0 ? exams[0].id : "")
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortField, setSortField] = useState<"rank" | "score" | "accuracyPercentage">("rank");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const exam = resultsData?.exam || exams.find((e) => e.id === selectedExamId);
  const analytics = resultsData?.analytics;
  const rawLeaderboard = resultsData?.leaderboard || [];

  // Filter & Sort Leaderboard
  const leaderboard = useMemo(() => {
    let list = [...rawLeaderboard];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          (item.studentName || "").toLowerCase().includes(q) ||
          (item.rollNumber || "").toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      const valA = a[sortField] ?? 0;
      const valB = b[sortField] ?? 0;
      return sortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [rawLeaderboard, searchQuery, sortField, sortAsc]);

  const handleExamChange = (newExamId: string) => {
    setSelectedExamId(newExamId);
    if (onSelectExam) {
      onSelectExam(newExamId);
    }
  };

  const toggleSort = (field: "rank" | "score" | "accuracyPercentage") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === "rank"); // default ascending for rank, descending for score
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Assessment Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Cohort Scoring & Rank Leaderboard</h1>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200">
              Contract C05 Authoritative
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic evaluation percentiles, negative marking impact, and student-level concept evidence.
          </p>
        </div>

        {exams.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Active Exam:</span>
            <select
              aria-label="Select Examination Assessment"
              value={selectedExamId}
              onChange={(e) => handleExamChange(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title || ex.code} ({ex.examType || "JEE"})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Overview Metric Strip */}
      {analytics ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="text-xs text-slate-500 font-medium">Cohort Size</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {analytics.totalStudents}{" "}
              <span className="text-xs font-medium text-slate-400">Students Evaluated</span>
            </div>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="text-xs text-slate-500 font-medium">Average Cohort Score</div>
            <div className="text-2xl font-black text-blue-700 mt-1">
              {analytics.averageScore}{" "}
              <span className="text-xs font-medium text-slate-400">/ {exam?.totalMarks || 300}</span>
            </div>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="text-xs text-slate-500 font-medium">Highest Benchmark Score</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {analytics.highestScore}{" "}
              <span className="text-xs font-medium text-slate-400">Top Rank</span>
            </div>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="text-xs text-slate-500 font-medium">Lowest Benchmark Score</div>
            <div className="text-2xl font-black text-rose-600 mt-1">
              {analytics.lowestScore}{" "}
              <span className="text-xs font-medium text-slate-400">Triage Queue</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Subject Aggregates Strip */}
      {analytics?.subjectStats && analytics.subjectStats.length > 0 && (
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            Subject Proficiency Benchmark
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {analytics.subjectStats.map((st) => (
              <div key={st.subject} className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700">{st.subject}</span>
                  <span className="text-slate-900 font-mono">{st.averagePercentage}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      st.averagePercentage >= 70
                        ? "bg-emerald-500"
                        : st.averagePercentage >= 50
                        ? "bg-blue-500"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${st.averagePercentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Leaderboard Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">Deterministic Cohort Leaderboard</h3>
            <span className="text-xs text-slate-400 font-mono">({leaderboard.length} Ranked)</span>
          </div>

          <div className="w-full sm:w-64">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search student or roll..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {leaderboard.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200 font-semibold">
                <tr>
                  <th
                    className="px-4 py-3 cursor-pointer hover:text-slate-900"
                    onClick={() => toggleSort("rank")}
                  >
                    Cohort Rank {sortField === "rank" ? (sortAsc ? "▲" : "▼") : ""}
                  </th>
                  <th className="px-4 py-3">Roll Number</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th
                    className="px-4 py-3 cursor-pointer hover:text-slate-900"
                    onClick={() => toggleSort("score")}
                  >
                    Evaluated Score {sortField === "score" ? (sortAsc ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className="px-4 py-3 cursor-pointer hover:text-slate-900"
                    onClick={() => toggleSort("accuracyPercentage")}
                  >
                    Accuracy {sortField === "accuracyPercentage" ? (sortAsc ? "▲" : "▼") : ""}
                  </th>
                  <th className="px-4 py-3">Percentile</th>
                  <th className="px-4 py-3">Negative Penalty</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {leaderboard.map((item, idx) => (
                  <tr
                    key={item.studentId || idx}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                    onClick={() => onOpenDrilldown && onOpenDrilldown(item)}
                  >
                    <td className="px-4 py-3 font-bold text-slate-900">
                      <span
                        className={`w-6 h-6 rounded-full text-xs font-black inline-flex items-center justify-center ${
                          item.rank === 1
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : item.rank === 2
                            ? "bg-slate-200 text-slate-800 border border-slate-300"
                            : item.rank === 3
                            ? "bg-amber-50 text-amber-900 border border-amber-200"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {item.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-blue-700">{item.rollNumber}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{item.studentName}</td>
                    <td className="px-4 py-3 font-black text-slate-900 text-sm">
                      {item.score}{" "}
                      <span className="text-[11px] font-normal text-slate-400">
                        / {exam?.totalMarks || 300}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-600">
                      {item.accuracyPercentage}%
                    </td>
                    <td className="px-4 py-3 font-bold text-indigo-600">
                      {(item.percentile || 0).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 font-bold text-rose-600">
                      -{item.negativeMarksDeducted || 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenDrilldown) onOpenDrilldown(item);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition"
                      >
                        Inspect Evidence
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
            <Award className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-xs font-bold text-slate-700">No Evaluated Results for Active Assessment</div>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Cohort evaluation is triggered once an OMR batch is finalized or CBT assessment submissions close.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
