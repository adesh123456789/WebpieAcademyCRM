"use client";

import React, { useState } from "react";
import {
  X,
  Users,
  UserPlus,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Trash2,
  MessageSquare,
  Bell,
  CreditCard,
  Check,
} from "lucide-react";

export interface ParentLinkData {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  relationship: "FATHER" | "MOTHER" | "GUARDIAN";
  occupation?: string;
  isPrimary: boolean;
  accessFlags: {
    reports: boolean;
    attendance: boolean;
    fees: boolean;
  };
}

interface StudentParentLinkModalProps {
  isOpen: boolean;
  student: {
    id: string;
    name: string;
    rollNumber: string;
    branch?: { name: string } | string;
    parentLinks?: any[];
  } | null;
  onClose: () => void;
  onSaveLinks?: (studentId: string, links: ParentLinkData[]) => void;
}

export function StudentParentLinkModal({
  isOpen,
  student,
  onClose,
  onSaveLinks,
}: StudentParentLinkModalProps) {
  // Parse existing parent links from student prop
  const initialLinks: ParentLinkData[] = React.useMemo(() => {
    if (!student?.parentLinks || student.parentLinks.length === 0) return [];
    return student.parentLinks.map((link: any, idx: number) => {
      let parsedFlags = { reports: true, attendance: true, fees: true };
      if (typeof link.accessFlags === "string") {
        try {
          parsedFlags = JSON.parse(link.accessFlags);
        } catch {
          // default
        }
      } else if (typeof link.accessFlags === "object" && link.accessFlags !== null) {
        parsedFlags = link.accessFlags;
      }

      return {
        id: link.id || `link-${idx}`,
        name: link.parent?.name || link.name || "Guardian",
        phone: link.parent?.phone || link.phone || "",
        email: link.parent?.email || link.email || "",
        relationship: (link.parent?.relationship || link.relationship || "FATHER") as
          | "FATHER"
          | "MOTHER"
          | "GUARDIAN",
        occupation: link.parent?.occupation || link.occupation || "",
        isPrimary: link.isPrimary ?? idx === 0,
        accessFlags: parsedFlags,
      };
    });
  }, [student]);

  const [links, setLinks] = useState<ParentLinkData[]>(initialLinks);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<ParentLinkData>({
    name: "",
    phone: "",
    email: "",
    relationship: "FATHER",
    occupation: "",
    isPrimary: initialLinks.length === 0,
    accessFlags: {
      reports: true,
      attendance: true,
      fees: true,
    },
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync state if student changes
  React.useEffect(() => {
    setLinks(initialLinks);
    setIsAdding(false);
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [initialLinks]);

  if (!isOpen || !student) return null;

  function handleAddParent(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrorMsg("Parent full name is required.");
      return;
    }
    if (!form.phone.trim() || form.phone.trim().length < 8) {
      setErrorMsg("Please enter a valid phone number (minimum 8 digits).");
      return;
    }

    const newLink: ParentLinkData = {
      ...form,
      id: `link-temp-${Date.now()}`,
    };

    let updatedLinks = [...links];
    // If marked as primary, reset other primary flags
    if (newLink.isPrimary) {
      updatedLinks = updatedLinks.map((l) => ({ ...l, isPrimary: false }));
    }
    updatedLinks.push(newLink);

    setLinks(updatedLinks);
    setIsAdding(false);
    setForm({
      name: "",
      phone: "",
      email: "",
      relationship: "MOTHER",
      occupation: "",
      isPrimary: false,
      accessFlags: { reports: true, attendance: true, fees: true },
    });
    setSuccessMsg(`Added ${newLink.name} as linked parent.`);
    setErrorMsg(null);
  }

  function handleRemoveLink(id?: string) {
    if (!id) return;
    const remaining = links.filter((l) => l.id !== id);
    if (remaining.length > 0 && !remaining.some((l) => l.isPrimary)) {
      remaining[0].isPrimary = true;
    }
    setLinks(remaining);
    setSuccessMsg("Parent linkage removed.");
  }

  function handleTogglePrimary(id?: string) {
    if (!id) return;
    setLinks((prev) =>
      prev.map((l) => ({
        ...l,
        isPrimary: l.id === id,
      }))
    );
  }

  function handleToggleFlag(id: string | undefined, flag: "reports" | "attendance" | "fees") {
    if (!id) return;
    setLinks((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        return {
          ...l,
          accessFlags: {
            ...l.accessFlags,
            [flag]: !l.accessFlags[flag],
          },
        };
      })
    );
  }

  async function handleSave() {
    setErrorMsg(null);
    try {
      if (onSaveLinks && student) {
        onSaveLinks(student.id, links);
      }
      setSuccessMsg("Parent details and WhatsApp dispatch settings saved successfully.");
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update parent links.");
    }
  }

  const branchDisplay =
    typeof student.branch === "string"
      ? student.branch
      : student.branch?.name || "Main Campus";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                Parent & Guardian Linkage
              </h3>
              <p className="text-xs text-slate-500">
                Manage contact points and automated WhatsApp dispatch permissions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student Context Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-slate-900 text-sm">{student.name}</div>
            <div className="text-slate-500 flex items-center gap-2 mt-0.5">
              <span>
                Roll: <strong className="text-blue-700 font-mono">{student.rollNumber}</strong>
              </span>
              <span>•</span>
              <span>Branch: {branchDisplay}</span>
            </div>
          </div>
          <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2.5 py-1 rounded-full">
            {links.length} {links.length === 1 ? "Parent Linked" : "Parents Linked"}
          </span>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-lg text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-lg text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Linked Parents List */}
        <div className="space-y-3 overflow-y-auto max-h-[40vh] pr-1">
          {links.length === 0 && !isAdding && (
            <div className="border border-dashed border-slate-300 rounded-xl p-6 text-center space-y-2">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-xs font-bold text-slate-700">No Parents or Guardians Linked</div>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Link parents to enable automated WhatsApp report cards, absence alerts, and fee notifications.
              </p>
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="mt-2 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Link First Parent
              </button>
            </div>
          )}

          {links.map((link) => (
            <div
              key={link.id}
              className={`border rounded-xl p-3.5 space-y-3 transition ${
                link.isPrimary
                  ? "border-blue-300 bg-blue-50/20 shadow-2xs"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-xs">{link.name}</span>
                  <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded">
                    {link.relationship}
                  </span>
                  {link.isPrimary && (
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Primary Guardian
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {!link.isPrimary && (
                    <button
                      type="button"
                      onClick={() => handleTogglePrimary(link.id)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-bold px-2 py-1 rounded hover:bg-blue-50 transition"
                    >
                      Make Primary
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(link.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                    title="Remove Link"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono text-slate-800 font-medium">{link.phone || "—"}</span>
                </div>
                {link.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{link.email}</span>
                  </div>
                )}
              </div>

              {/* Automated Dispatch Permissions */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-4 text-[11px]">
                <span className="text-slate-500 font-semibold">WhatsApp Alerts:</span>
                <button
                  type="button"
                  onClick={() => handleToggleFlag(link.id, "reports")}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded border transition ${
                    link.accessFlags.reports
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold"
                      : "bg-slate-50 text-slate-400 border-slate-200 line-through"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Reports
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleFlag(link.id, "attendance")}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded border transition ${
                    link.accessFlags.attendance
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold"
                      : "bg-slate-50 text-slate-400 border-slate-200 line-through"
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  Attendance
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleFlag(link.id, "fees")}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded border transition ${
                    link.accessFlags.fees
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold"
                      : "bg-slate-50 text-slate-400 border-slate-200 line-through"
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Fees
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Parent Form Collapse */}
        {isAdding ? (
          <form
            onSubmit={handleAddParent}
            className="border border-blue-200 bg-blue-50/20 rounded-xl p-4 space-y-3 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">New Parent / Guardian Form</span>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-700 font-bold">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kulkarni"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-700 font-bold">Relationship *</label>
                <select
                  value={form.relationship}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      relationship: e.target.value as "FATHER" | "MOTHER" | "GUARDIAN",
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="FATHER">Father</option>
                  <option value="MOTHER">Mother</option>
                  <option value="GUARDIAN">Legal Guardian</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-700 font-bold">Phone Number (WhatsApp) *</label>
                <input
                  type="tel"
                  required
                  placeholder="9823001100"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 font-mono focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-700 font-bold">Email Address</label>
                <input
                  type="email"
                  placeholder="parent@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium select-none">
                <input
                  type="checkbox"
                  checked={form.isPrimary}
                  onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Set as Primary Contact</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="bg-white text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition"
              >
                Add to Links
              </button>
            </div>
          </form>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-xs font-bold transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              + Link Another Parent or Guardian
            </button>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-100 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg border border-slate-200"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
