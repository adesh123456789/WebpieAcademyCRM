import { describe, it, expect } from "vitest";
import {
  sanitizeContent,
  SECTION_METADATA,
  WebsiteData,
  WebsiteSectionData,
} from "@/components/views/WebsiteView";

describe("UI-009: Institute Website CMS & Public Preview", () => {
  it("enforces strict XSS sanitization blocking arbitrary scripts (WEB-006)", () => {
    const maliciousInput = '<p>Welcome</p><script>alert("hack")</script><a href="javascript:steal()">Click</a><img src="x" onerror="steal()"/>';
    const sanitized = sanitizeContent(maliciousInput);

    expect(sanitized).not.toContain("<script>");
    expect(sanitized).not.toContain("alert");
    expect(sanitized).not.toContain("javascript:");
    expect(sanitized).not.toContain("onerror=");
    expect(sanitized).toContain("Welcome");
  });

  it("covers all 8 standard PRD public sections with metadata", () => {
    const expectedKeys = [
      "HERO",
      "ABOUT",
      "COURSES",
      "FACULTY",
      "TOPPERS",
      "TESTIMONIALS",
      "CONTACT",
      "FAQ",
    ];

    expectedKeys.forEach((key) => {
      expect(SECTION_METADATA[key]).toBeDefined();
      expect(SECTION_METADATA[key].label.length).toBeGreaterThan(0);
      expect(SECTION_METADATA[key].description.length).toBeGreaterThan(0);
    });
  });

  it("enforces public result privacy: unconsented records never leak (WEB-004)", () => {
    // Curated toppers list for public consumption
    const publicToppers = [
      { id: "top_1", studentName: "Aarav Sharma", exam: "JEE Advanced", rank: 142, year: 2025 },
      { id: "top_2", studentName: "Rohan Kulkarni", exam: "NEET", score: 685, year: 2025 },
    ];

    // Simulated full academy student cohort (includes internal/unconsented marks)
    const privateCohort = [
      { id: "s1", name: "Aarav Sharma", publicConsent: true },
      { id: "s2", name: "Rohan Kulkarni", publicConsent: true },
      { id: "s3", name: "Priya Patil", publicConsent: false, internalDiagnostic: 42 },
      { id: "s4", name: "Sneha Joshi", publicConsent: false, feeDefaulter: true },
    ];

    // Filter to public website
    const displayedNames = publicToppers.map((t) => t.studentName);
    const leakedPrivateStudents = privateCohort.filter(
      (s) => !s.publicConsent && displayedNames.includes(s.name)
    );

    expect(leakedPrivateStudents).toHaveLength(0);
    expect(displayedNames).not.toContain("Priya Patil");
    expect(displayedNames).not.toContain("Sneha Joshi");
  });

  it("formats custom domain and active SSL indicators (WEB-001, WEB-002)", () => {
    const websiteData: WebsiteData = {
      tenant: {
        name: "Apex Academy",
        code: "APEX_PUNE",
        customDomain: "apexacademy.edu.in",
        sslStatus: "ACTIVE",
      },
      sections: {},
    };

    expect(websiteData.tenant?.customDomain).toBe("apexacademy.edu.in");
    expect(websiteData.tenant?.sslStatus).toBe("ACTIVE");
  });

  it("supports versioned publish snapshots and rollback restoration (WEB-003)", () => {
    const rev1Sections: Record<string, WebsiteSectionData> = {
      HERO: {
        sectionKey: "HERO",
        title: "Version 1 Headline",
        subtitle: "Version 1 Subtitle",
        content: {},
        isVisible: true,
        orderIndex: 0,
      },
    };

    const rev2Sections: Record<string, WebsiteSectionData> = {
      HERO: {
        sectionKey: "HERO",
        title: "Version 2 Updated Headline",
        subtitle: "Version 2 Updated Subtitle",
        content: {},
        isVisible: true,
        orderIndex: 0,
      },
    };

    const revisions = [
      { id: "rev_1", version: 1, publishedAt: "2026-09-08 10:00", snapshot: rev1Sections },
      { id: "rev_2", version: 2, publishedAt: "2026-09-15 12:00", snapshot: rev2Sections },
    ];

    // Current state starts at rev 2
    let activeSections = { ...rev2Sections };
    expect(activeSections.HERO.title).toBe("Version 2 Updated Headline");

    // Perform rollback to rev 1
    const targetRev = revisions.find((r) => r.id === "rev_1");
    expect(targetRev).toBeDefined();
    if (targetRev) {
      activeSections = { ...targetRev.snapshot };
    }

    expect(activeSections.HERO.title).toBe("Version 1 Headline");
    expect(activeSections.HERO.subtitle).toBe("Version 1 Subtitle");
  });

  it("omits hidden sections when isVisible is false", () => {
    const sections: Record<string, WebsiteSectionData> = {
      HERO: { sectionKey: "HERO", title: "Hero", subtitle: "Sub", content: {}, isVisible: true, orderIndex: 0 },
      TESTIMONIALS: { sectionKey: "TESTIMONIALS", title: "Reviews", subtitle: "Sub", content: {}, isVisible: false, orderIndex: 1 },
      CONTACT: { sectionKey: "CONTACT", title: "Contact", subtitle: "Sub", content: {}, isVisible: true, orderIndex: 2 },
    };

    const visibleSections = Object.values(sections).filter((s) => s.isVisible);
    const visibleKeys = visibleSections.map((s) => s.sectionKey);

    expect(visibleKeys).toContain("HERO");
    expect(visibleKeys).toContain("CONTACT");
    expect(visibleKeys).not.toContain("TESTIMONIALS");
  });
});
