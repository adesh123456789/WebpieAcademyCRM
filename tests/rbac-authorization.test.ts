import { describe, it, expect } from "vitest";
import { checkApiPermission, API_ROLE_PERMISSIONS, ROLE_NAVIGATION_CONFIG, UserRole } from "../src/lib/permissions";
import { signToken, verifyToken } from "../src/lib/auth";

describe("Role-Based Access Control (RBAC) & Endpoint Authorization (PRD Sec 5.2)", () => {
  it("RBAC-001: Ensures Individual Teacher has access to all job roles in their cockpit", () => {
    // PRD & User Spec: Individual Teacher means a small independent institute with all job roles
    expect(checkApiPermission("INDIVIDUAL_TEACHER", "fees")).toBe(true);
    expect(checkApiPermission("INDIVIDUAL_TEACHER", "attendance_manage")).toBe(true);
    expect(checkApiPermission("INDIVIDUAL_TEACHER", "omr")).toBe(true);
    expect(checkApiPermission("INDIVIDUAL_TEACHER", "exams_manage")).toBe(true);
    expect(checkApiPermission("INDIVIDUAL_TEACHER", "crm")).toBe(true);
    expect(checkApiPermission("INDIVIDUAL_TEACHER", "students_manage")).toBe(true);
    expect(checkApiPermission("INDIVIDUAL_TEACHER", "interventions_manage")).toBe(true);
    // But Individual Teacher cannot provision new tenants across the whole SaaS
    expect(checkApiPermission("INDIVIDUAL_TEACHER", "admin_tenants")).toBe(false);
  });

  it("RBAC-002: Denies Teacher access to Fees, CRM, and Platform Admin", () => {
    expect(checkApiPermission("TEACHER", "fees")).toBe(false);
    expect(checkApiPermission("TEACHER", "crm")).toBe(false);
    expect(checkApiPermission("TEACHER", "website_manage")).toBe(false);
    expect(checkApiPermission("TEACHER", "admin_tenants")).toBe(false);

    // Permitted academic tools
    expect(checkApiPermission("TEACHER", "omr")).toBe(true);
    expect(checkApiPermission("TEACHER", "exams_manage")).toBe(true);
    expect(checkApiPermission("TEACHER", "interventions_manage")).toBe(true);
  });

  it("RBAC-003: Denies Student & Parent access to all staff administrative endpoints", () => {
    const restrictedEndpoints: (keyof typeof API_ROLE_PERMISSIONS)[] = [
      "fees",
      "crm",
      "omr",
      "exams_manage",
      "website_manage",
      "students_manage",
      "attendance_manage",
      "interventions_manage",
      "admin_tenants",
    ];

    for (const endpoint of restrictedEndpoints) {
      expect(checkApiPermission("STUDENT", endpoint)).toBe(false);
      expect(checkApiPermission("PARENT", endpoint)).toBe(false);
    }
  });

  it("RBAC-004: Restricts Counsellor strictly to CRM and Students Read", () => {
    expect(checkApiPermission("COUNSELLOR", "crm")).toBe(true);
    expect(checkApiPermission("COUNSELLOR", "students_manage")).toBe(true);

    // Blocked from Exams, OMR, Fees, Website
    expect(checkApiPermission("COUNSELLOR", "omr")).toBe(false);
    expect(checkApiPermission("COUNSELLOR", "exams_manage")).toBe(false);
    expect(checkApiPermission("COUNSELLOR", "fees")).toBe(false);
    expect(checkApiPermission("COUNSELLOR", "website_manage")).toBe(false);
  });

  it("RBAC-005: Restricts Accountant strictly to Fees and Students Directory", () => {
    expect(checkApiPermission("ACCOUNTANT", "fees")).toBe(true);
    expect(checkApiPermission("ACCOUNTANT", "students_manage")).toBe(true);

    // Blocked from Exams, OMR, CRM, Website
    expect(checkApiPermission("ACCOUNTANT", "omr")).toBe(false);
    expect(checkApiPermission("ACCOUNTANT", "exams_manage")).toBe(false);
    expect(checkApiPermission("ACCOUNTANT", "crm")).toBe(false);
    expect(checkApiPermission("ACCOUNTANT", "website_manage")).toBe(false);
  });

  it("RBAC-006: WebPie Super Admin has universal platform oversight", () => {
    const allScopes = Object.keys(API_ROLE_PERMISSIONS) as (keyof typeof API_ROLE_PERMISSIONS)[];
    for (const scope of allScopes) {
      expect(checkApiPermission("WEBPIE_ADMIN", scope)).toBe(true);
    }
  });

  it("RBAC-007: Validates Navigation Menu isolation per role (Zero UI Leakage)", () => {
    const roles: UserRole[] = [
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

    for (const role of roles) {
      const config = ROLE_NAVIGATION_CONFIG[role];
      expect(config).toBeDefined();
      expect(config.title).toBeDefined();
      expect(config.navItems.length).toBeGreaterThan(0);

      const navIds = config.navItems.map((item) => item.id);

      // Verify strict isolation guarantees
      if (role === "TEACHER") {
        expect(navIds).not.toContain("fees");
        expect(navIds).not.toContain("crm");
        expect(navIds).not.toContain("website");
        expect(navIds).not.toContain("superadmin_tenants");
      }
      if (role === "STUDENT") {
        expect(navIds).not.toContain("omr");
        expect(navIds).not.toContain("exams");
        expect(navIds).not.toContain("fees");
        expect(navIds).not.toContain("crm");
      }
      if (role === "WEBPIE_ADMIN") {
        expect(navIds).toContain("superadmin_tenants");
        expect(navIds).not.toContain("fees"); // Super Admin sees platform overview and tenants, not single coaching fee counters
      }
    }
  });

  it("RBAC-008: Verifies JWT token signing and payload identity integrity", () => {
    const token = signToken({
      userId: "user-123",
      tenantId: "tenant-apex",
      branchId: "branch-kothrud",
      role: "TEACHER",
      name: "Dr. Kulkarni",
      email: "kulkarni@apex.in",
    });

    const verified = verifyToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe("user-123");
    expect(verified?.tenantId).toBe("tenant-apex");
    expect(verified?.branchId).toBe("branch-kothrud");
    expect(verified?.role).toBe("TEACHER");
  });
});
