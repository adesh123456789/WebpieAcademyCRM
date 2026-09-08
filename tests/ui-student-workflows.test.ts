import { describe, it, expect } from "vitest";

// CSV parsing and validation test suite mimicking StudentImportModal & Contract C02
export function parseCsvRows(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] || "";
    });
    rows.push(rowObj);
  }
  return rows;
}

export interface ValidatedRow {
  row: number;
  name: string;
  rollNumber: string;
  action: "CREATE" | "UPDATE" | "REJECT";
  errors: { code: string; message: string }[];
}

export function validateImportRows(
  rawRows: Record<string, any>[],
  existingStudents: { rollNumber: string }[]
): { rows: ValidatedRow[]; summary: { create: number; update: number; reject: number } } {
  const existingRolls = new Set(existingStudents.map((s) => s.rollNumber.toLowerCase()));
  const seenInFile = new Set<string>();

  let create = 0;
  let update = 0;
  let reject = 0;

  const rows: ValidatedRow[] = rawRows.map((r, idx) => {
    const rowNum = idx + 1;
    const name = r.name?.trim() || "";
    const rollNumber = r.rollNumber?.trim() || "";
    const email = r.email?.trim();
    const phone = r.phone?.trim();
    const errors: { code: string; message: string }[] = [];

    if (!name) {
      errors.push({ code: "VALIDATION_ERROR", message: "Student name is required" });
    }
    if (!rollNumber) {
      errors.push({ code: "VALIDATION_ERROR", message: "Roll number is required" });
    } else if (seenInFile.has(rollNumber.toLowerCase())) {
      errors.push({ code: "DUPLICATE_STUDENT", message: "Duplicate roll number in same CSV" });
    } else {
      seenInFile.add(rollNumber.toLowerCase());
    }

    if (email && !email.includes("@")) {
      errors.push({ code: "VALIDATION_ERROR", message: "Malformed email format" });
    }
    if (phone && phone.length < 8) {
      errors.push({ code: "VALIDATION_ERROR", message: "Phone number too short" });
    }

    let action: "CREATE" | "UPDATE" | "REJECT" = "CREATE";
    if (errors.length > 0) {
      action = "REJECT";
      reject++;
    } else if (existingRolls.has(rollNumber.toLowerCase())) {
      action = "UPDATE";
      update++;
    } else {
      action = "CREATE";
      create++;
    }

    return {
      row: rowNum,
      name,
      rollNumber,
      action,
      errors,
    };
  });

  return { rows, summary: { create, update, reject } };
}

describe("Student Directory & CSV Import Workflows (Contract C02 / UI-003)", () => {
  it("CSV-001: Parses valid CSV with headers and strips quoting cleanly", () => {
    const csvContent =
      'name,rollNumber,email,phone,targetExam\n"Aryan Deshpande","26001","aryan@test.com","9823001100","JEE_MAIN"\n"Tanvi Kulkarni","26002","tanvi@test.com","9823001101","NEET"';

    const parsed = parseCsvRows(csvContent);
    expect(parsed.length).toBe(2);
    expect(parsed[0].name).toBe("Aryan Deshpande");
    expect(parsed[0].rollNumber).toBe("26001");
    expect(parsed[0].targetExam).toBe("JEE_MAIN");
    expect(parsed[1].name).toBe("Tanvi Kulkarni");
    expect(parsed[1].rollNumber).toBe("26002");
  });

  it("CSV-002: Rejects empty or header-only CSV content", () => {
    expect(parseCsvRows("").length).toBe(0);
    expect(parseCsvRows("name,rollNumber,email").length).toBe(0);
  });

  it("VAL-001: Identifies CREATE vs UPDATE actions based on existing roster", () => {
    const raw = [
      { name: "Existing Student", rollNumber: "26001" },
      { name: "Brand New Student", rollNumber: "26099" },
    ];
    const existing = [{ rollNumber: "26001" }];

    const result = validateImportRows(raw, existing);
    expect(result.summary.create).toBe(1);
    expect(result.summary.update).toBe(1);
    expect(result.summary.reject).toBe(0);

    expect(result.rows[0].action).toBe("UPDATE");
    expect(result.rows[1].action).toBe("CREATE");
  });

  it("VAL-002: Rejects missing names, missing roll numbers, and in-file duplicate roll numbers", () => {
    const raw = [
      { name: "", rollNumber: "26001" }, // missing name
      { name: "John Doe", rollNumber: "" }, // missing roll
      { name: "Student Alpha", rollNumber: "26005" }, // valid
      { name: "Student Alpha Dup", rollNumber: "26005" }, // duplicate roll in same file
      { name: "Student Beta", rollNumber: "26006", email: "invalid-email" }, // bad email
      { name: "Student Gamma", rollNumber: "26007", phone: "123" }, // bad phone
    ];

    const result = validateImportRows(raw, []);
    expect(result.summary.create).toBe(1); // Only Student Alpha is valid
    expect(result.summary.reject).toBe(5);

    // Verify specific error codes
    expect(result.rows[0].errors[0].message).toContain("Student name is required");
    expect(result.rows[1].errors[0].message).toContain("Roll number is required");
    expect(result.rows[3].errors[0].code).toBe("DUPLICATE_STUDENT");
    expect(result.rows[4].errors[0].message).toContain("Malformed email format");
    expect(result.rows[5].errors[0].message).toContain("Phone number too short");
  });

  it("PAR-001: Correctly parses parent linkages and WhatsApp report flags", () => {
    const linkWithJsonFlags = {
      isPrimary: true,
      accessFlags: JSON.stringify({ reports: true, attendance: false, fees: true }),
      parent: {
        name: "Sanjay Deshpande",
        phone: "9823001100",
        relationship: "FATHER",
      },
    };

    let flags = { reports: true, attendance: true, fees: true };
    try {
      flags = JSON.parse(linkWithJsonFlags.accessFlags);
    } catch {}

    expect(flags.reports).toBe(true);
    expect(flags.attendance).toBe(false);
    expect(flags.fees).toBe(true);
  });

  it("DIR-001: Filters student directory by search query, target exam, and batch", () => {
    const mockStudents = [
      {
        id: "1",
        name: "Aryan Deshpande",
        rollNumber: "26001",
        targetExam: "JEE_MAIN",
        enrollments: [{ batch: { name: "Batch A" } }],
      },
      {
        id: "2",
        name: "Tanvi Kulkarni",
        rollNumber: "26002",
        targetExam: "NEET",
        enrollments: [{ batch: { name: "Batch B" } }],
      },
      {
        id: "3",
        name: "Pratik Shinde",
        rollNumber: "26003",
        targetExam: "JEE_MAIN",
        enrollments: [{ batch: { name: "Batch B" } }],
      },
    ];

    // Filter by search
    const searchMatch = mockStudents.filter(
      (s) => s.name.toLowerCase().includes("tanvi") || s.rollNumber.includes("tanvi")
    );
    expect(searchMatch.length).toBe(1);
    expect(searchMatch[0].id).toBe("2");

    // Filter by exam
    const jeeStudents = mockStudents.filter((s) => s.targetExam === "JEE_MAIN");
    expect(jeeStudents.length).toBe(2);

    // Filter by batch
    const batchBStudents = mockStudents.filter((s) =>
      s.enrollments.some((e) => e.batch.name === "Batch B")
    );
    expect(batchBStudents.length).toBe(2);
  });

  it("PAG-001: Computes pagination slices accurately", () => {
    const items = Array.from({ length: 35 }, (_, idx) => ({ id: `id-${idx + 1}` }));
    const pageSize = 15;

    function getSlice(page: number) {
      const startIndex = (page - 1) * pageSize;
      return items.slice(startIndex, startIndex + pageSize);
    }

    const page1 = getSlice(1);
    expect(page1.length).toBe(15);
    expect(page1[0].id).toBe("id-1");
    expect(page1[14].id).toBe("id-15");

    const page3 = getSlice(3);
    expect(page3.length).toBe(5);
    expect(page3[0].id).toBe("id-31");
    expect(page3[4].id).toBe("id-35");
  });
});
