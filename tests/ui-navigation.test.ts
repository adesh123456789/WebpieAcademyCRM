import { describe, it, expect } from "vitest";
import { ROLE_NAVIGATION_CONFIG, UserRole } from "../src/lib/permissions";

describe("UI Navigation Authorization & Scope Guards (PRD UI-002)", () => {
  it("NAV-001: All 9 roles have explicit, non-empty navigation menus", () => {
    const allRoles: UserRole[] = [
      "WEBPIE_ADMIN",
      "OWNER",
      "BRANCH_ADMIN",
      "TEACHER",
      "COUNSELLOR",
      "ACCOUNTANT",
      "STUDENT",
      "PARENT",
      "INDIVIDUAL_TEACHER",
    ];

    for (const role of allRoles) {
      const config = ROLE_NAVIGATION_CONFIG[role];
      expect(config).toBeDefined();
      expect(config.title.length).toBeGreaterThan(0);
      expect(config.subtitle.length).toBeGreaterThan(0);
      expect(config.navItems.length).toBeGreaterThan(0);

      // Verify each nav item has required fields
      for (const item of config.navItems) {
        expect(item.id).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(item.icon).toBeTruthy();
      }
    }
  });

  it("NAV-002: Enforces 403 boundaries - unauthorized views are excluded from role navigation", () => {
    function isTabAllowed(role: UserRole, tabId: string): boolean {
      const config = ROLE_NAVIGATION_CONFIG[role];
      return config.navItems.some((item) => item.id === tabId);
    }

    // Student should be barred from administrative tabs
    expect(isTabAllowed("STUDENT", "fees")).toBe(false);
    expect(isTabAllowed("STUDENT", "omr")).toBe(false);
    expect(isTabAllowed("STUDENT", "exams")).toBe(false);
    expect(isTabAllowed("STUDENT", "crm")).toBe(false);
    expect(isTabAllowed("STUDENT", "superadmin_tenants")).toBe(false);
    // Student allowed views
    expect(isTabAllowed("STUDENT", "student_radar")).toBe(true);
    expect(isTabAllowed("STUDENT", "cbt")).toBe(true);

    // Teacher barred from financial & tenant management
    expect(isTabAllowed("TEACHER", "fees")).toBe(false);
    expect(isTabAllowed("TEACHER", "crm")).toBe(false);
    expect(isTabAllowed("TEACHER", "superadmin_tenants")).toBe(false);
    // Teacher allowed views
    expect(isTabAllowed("TEACHER", "questions")).toBe(true);
    expect(isTabAllowed("TEACHER", "exams")).toBe(true);
    expect(isTabAllowed("TEACHER", "omr")).toBe(true);

    // Parent restricted strictly to student visibility & attendance
    expect(isTabAllowed("PARENT", "omr")).toBe(false);
    expect(isTabAllowed("PARENT", "questions")).toBe(false);
    expect(isTabAllowed("PARENT", "crm")).toBe(false);
    expect(isTabAllowed("PARENT", "parent")).toBe(true);

    // Individual Teacher has all operational tabs in one unified cockpit
    expect(isTabAllowed("INDIVIDUAL_TEACHER", "dashboard")).toBe(true);
    expect(isTabAllowed("INDIVIDUAL_TEACHER", "students")).toBe(true);
    expect(isTabAllowed("INDIVIDUAL_TEACHER", "exams")).toBe(true);
    expect(isTabAllowed("INDIVIDUAL_TEACHER", "omr")).toBe(true);
    expect(isTabAllowed("INDIVIDUAL_TEACHER", "analytics")).toBe(true);
    expect(isTabAllowed("INDIVIDUAL_TEACHER", "interventions")).toBe(true);
    expect(isTabAllowed("INDIVIDUAL_TEACHER", "attendance")).toBe(true);
    expect(isTabAllowed("INDIVIDUAL_TEACHER", "fees")).toBe(true);
    // But barred from platform HQ
    expect(isTabAllowed("INDIVIDUAL_TEACHER", "superadmin_tenants")).toBe(false);

    // Super Admin restricted to platform operations, not single academy attendance
    expect(isTabAllowed("WEBPIE_ADMIN", "superadmin_overview")).toBe(true);
    expect(isTabAllowed("WEBPIE_ADMIN", "superadmin_tenants")).toBe(true);
    expect(isTabAllowed("WEBPIE_ADMIN", "superadmin_nodes")).toBe(true);
    expect(isTabAllowed("WEBPIE_ADMIN", "fees")).toBe(false);
  });
});
