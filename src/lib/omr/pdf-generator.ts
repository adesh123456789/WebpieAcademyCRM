import { jsPDF } from "jspdf";
import { STANDARD_75Q_GEOMETRY, questionBubbleUV, rollBubbleUV } from "./raster";

export interface PDFInstituteBranding {
  instituteName: string;
  subTitle?: string;
  logoUrl?: string;
  examTitle: string;
  examCode: string;
  durationMinutes: number;
  totalMarks: number;
  totalQuestions: number;
}

export class WebPiePDFGenerator {
  /**
   * Generates a print-ready 4-corner fiducial OMR sheet with student QR and roll bubbles (PRD Sec 26)
   */
  public static generateOMRSheet(branding: PDFInstituteBranding): jsPDF {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = 210;
    const pageHeight = 297;

    // 1. Four-Corner Fiducial Markers (Critical for CV anchor alignment)
    const geometry = STANDARD_75Q_GEOMETRY;
    const markerHalfWidth = geometry.layout.fiducialRadius * pageWidth;
    doc.setFillColor(0, 0, 0);
    for (const [u, v] of [[geometry.layout.fiducialInset, geometry.layout.fiducialInset], [1 - geometry.layout.fiducialInset, geometry.layout.fiducialInset], [1 - geometry.layout.fiducialInset, 1 - geometry.layout.fiducialInset], [geometry.layout.fiducialInset, 1 - geometry.layout.fiducialInset]]) {
      doc.rect(u * pageWidth - markerHalfWidth, v * pageHeight - markerHalfWidth, markerHalfWidth * 2, markerHalfWidth * 2, "F");
    }

    // 2. Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(branding.instituteName.toUpperCase(), pageWidth / 2, 22, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`${branding.examTitle} — OFFICIAL OMR RESPONSE SHEET`, pageWidth / 2, 28, { align: "center" });

    doc.setFontSize(8);
    doc.text(`EXAM CODE: ${branding.examCode}  |  MAX MARKS: ${branding.totalMarks}  |  QUESTIONS: ${branding.totalQuestions}`, pageWidth / 2, 33, { align: "center" });

    doc.setDrawColor(180, 180, 180);
    doc.line(25, 36, pageWidth - 25, 36);

    // 3. Roll Number & Candidate Info Block
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("CANDIDATE ROLL NUMBER", 25, 43);

    // Roll number boxes (6 digits)
    const startX = 25;
    const boxW = 7;
    const boxH = 7;
    for (let d = 0; d < 6; d++) {
      doc.rect(startX + d * (boxW + 2), 46, boxW, boxH);
    }

    // Roll number bubble grid (0 - 9)
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < geometry.rollNumberDigits; col++) {
        const uv = rollBubbleUV(geometry, col, row);
        const x = uv.x * pageWidth;
        const y = uv.y * pageHeight;
        doc.circle(x, y, 1.6);
        doc.text(String(row), x, y + 0.6, { align: "center" });
      }
    }

    // Candidate Instructions Box
    doc.rect(90, 42, 95, 48);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("INSTRUCTIONS FOR MARKING:", 93, 47);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("1. Use Blue or Black ball point pen only.", 93, 52);
    doc.text("2. Completely darken the circle corresponding to your answer.", 93, 57);
    doc.text("3. Do NOT make stray marks, tick marks, or half fills.", 93, 62);
    doc.text("4. Multiple markings or erasing may invalidate the response.", 93, 67);
    doc.text("5. Ensure corner black squares are not torn or defaced.", 93, 72);

    // Sample Correct / Incorrect Marking
    doc.setFillColor(0, 0, 0);
    doc.circle(96, 81, 2, "F");
    doc.text("Correct", 100, 82);

    doc.circle(120, 81, 2);
    doc.text("x", 119.2, 82);
    doc.text("Wrong", 124, 82);

    // 4. Questions Bubble Grid (3 Columns: Q1-25, Q26-50, Q51-75)
    doc.line(20, 96, pageWidth - 20, 96);
    const options = ["A", "B", "C", "D"];
    doc.setFont("helvetica", "normal");
    for (let q = 1; q <= Math.min(branding.totalQuestions, geometry.totalQuestions); q++) {
      const first = questionBubbleUV(geometry, q, 0);
      doc.setFontSize(7.5);
      doc.text(String(q).padStart(2, "0"), first.x * pageWidth - 8, first.y * pageHeight + 0.8);
      for (let o = 0; o < geometry.optionsPerQuestion; o++) {
          const uv = questionBubbleUV(geometry, q, o);
          const bubbleX = uv.x * pageWidth;
          const rowY = uv.y * pageHeight;
          doc.circle(bubbleX, rowY, geometry.layout.bubbleRadius * pageWidth);
          doc.setFontSize(5.5);
          doc.text(options[o], bubbleX, rowY + 0.6, { align: "center" });
      }
    }

    // 5. Footer signatures
    doc.line(20, 275, pageWidth - 20, 275);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Candidate's Signature", 30, 282);
    doc.text("Invigilator's Signature", pageWidth - 60, 282);

    return doc;
  }

  /**
   * Generates a complete Question Paper PDF with standard exam formatting
   */
  public static generateQuestionPaper(
    branding: PDFInstituteBranding,
    questions: {
      orderIndex: number;
      subject: string;
      sectionName: string;
      body: string;
      options: { id: string; text: string }[];
      marksCorrect: number;
      marksIncorrect: number;
    }[]
  ): jsPDF {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = 210;
    let y = 20;

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(branding.instituteName.toUpperCase(), pageWidth / 2, y, { align: "center" });
    y += 7;

    doc.setFontSize(12);
    doc.text(branding.examTitle, pageWidth / 2, y, { align: "center" });
    y += 6;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Time Allowed: ${branding.durationMinutes} Minutes  |  Maximum Marks: ${branding.totalMarks}`, pageWidth / 2, y, { align: "center" });
    y += 4;

    doc.setDrawColor(150, 150, 150);
    doc.line(15, y, pageWidth - 15, y);
    y += 8;

    let currentSubject = "";

    for (const q of questions) {
      // Check page overflow
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      // Subject separator
      if (q.subject !== currentSubject) {
        currentSubject = q.subject;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setFillColor(240, 244, 250);
        doc.rect(15, y - 3, pageWidth - 30, 7, "F");
        doc.text(`SECTION: ${currentSubject} (${q.sectionName || "Part I"})`, 18, y + 1.5);
        y += 9;
      }

      // Question body
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`Q.${q.orderIndex}`, 16, y);

      doc.setFont("helvetica", "normal");
      const splitBody = doc.splitTextToSize(q.body, 160);
      doc.text(splitBody, 25, y);
      y += splitBody.length * 4.5 + 2;

      // Question options
      for (const opt of q.options) {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.text(`(${opt.id})`, 28, y);
        doc.setFont("helvetica", "normal");
        const splitOpt = doc.splitTextToSize(opt.text, 145);
        doc.text(splitOpt, 35, y);
        y += splitOpt.length * 4.2;
      }

      // Question marks footer
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(`[Marks: +${q.marksCorrect} / ${q.marksIncorrect}]`, pageWidth - 45, y);
      doc.setTextColor(0, 0, 0);
      y += 6;
    }

    return doc;
  }

  /**
   * Generates a printable remedial worksheet for Intervention Workspace (PRD Sec 29)
   */
  public static generateRemedialWorksheet(
    branding: { instituteName: string; concept: string; studentName?: string },
    questions: {
      orderIndex: number;
      tier: "Foundation" | "Application" | "Exam-Level";
      body: string;
      options: { id: string; text: string }[];
    }[]
  ): jsPDF {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = 210;
    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(branding.instituteName.toUpperCase(), pageWidth / 2, y, { align: "center" });
    y += 6;

    doc.setFontSize(11);
    doc.text(`TARGETED REMEDIAL PRACTICE: ${branding.concept}`, pageWidth / 2, y, { align: "center" });
    y += 5;

    if (branding.studentName) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Assigned to: ${branding.studentName}`, 18, y);
    }
    y += 3;

    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, pageWidth - 15, y);
    y += 8;

    let currentTier = "";

    for (const q of questions) {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      if (q.tier !== currentTier) {
        currentTier = q.tier;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setFillColor(245, 245, 245);
        doc.rect(15, y - 2, pageWidth - 30, 6, "F");
        doc.text(`LEVEL: ${currentTier.toUpperCase()}`, 18, y + 2);
        y += 8;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`Q.${q.orderIndex}`, 16, y);

      doc.setFont("helvetica", "normal");
      const splitBody = doc.splitTextToSize(q.body, 160);
      doc.text(splitBody, 25, y);
      y += splitBody.length * 4.5 + 2;

      for (const opt of q.options) {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.text(`(${opt.id})`, 28, y);
        doc.setFont("helvetica", "normal");
        const splitOpt = doc.splitTextToSize(opt.text, 145);
        doc.text(splitOpt, 35, y);
        y += splitOpt.length * 4.2;
      }
      y += 5;
    }

    return doc;
  }
}
