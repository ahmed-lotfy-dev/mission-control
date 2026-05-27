import { describe, it, expect } from "bun:test";
import { safeJson, timeAgoStr, formatSize } from "../src/lib/helpers";

// ── categorizeIssue (re-implemented from seo.ts for test) ──

function categorizeIssue(issue: string): "error" | "warning" | "notice" {
  const errors = [
    "missing <title>", "empty <title>", "missing meta description",
    "empty meta description", "noindex", "connection timed out",
    "failed to fetch", "critical",
  ];
  const warnings = [
    "too short", "too long", "no h1", "multiple h1", "no h2",
    "missing canonical", "missing viewport", "no gzip", "nofollow",
    "large page", "very few links", "limited links", "no h3",
    "no outgoing links", "5xx", "4xx", "3xx", "redirect",
  ];
  const lower = issue.toLowerCase();
  if (errors.some((e) => lower.includes(e))) return "error";
  if (warnings.some((w) => lower.includes(w))) return "warning";
  return "notice";
}

describe("categorizeIssue", () => {
  it("classifies error-level issues", () => {
    expect(categorizeIssue("Missing <title> tag — critical SEO issue")).toBe("error");
    expect(categorizeIssue("Empty <title> tag")).toBe("error");
    expect(categorizeIssue("Missing meta description tag")).toBe("error");
    expect(categorizeIssue("Page has 'noindex' directive")).toBe("error");
    expect(categorizeIssue("Connection timed out — server may be slow")).toBe("error");
    expect(categorizeIssue("Failed to fetch URL: ECONNREFUSED")).toBe("error");
    expect(categorizeIssue("Critical: no meta tags found")).toBe("error");
  });

  it("classifies warning-level issues", () => {
    expect(categorizeIssue("Title too short (25 chars)")).toBe("warning");
    expect(categorizeIssue("Title too long (80 chars)")).toBe("warning");
    expect(categorizeIssue("No H1 heading found")).toBe("warning");
    expect(categorizeIssue("Multiple H1 headings (3 found)")).toBe("warning");
    expect(categorizeIssue("No H2 headings on page")).toBe("warning");
    expect(categorizeIssue("Missing canonical URL tag")).toBe("warning");
    expect(categorizeIssue("Missing viewport meta tag")).toBe("warning");
    expect(categorizeIssue("No GZIP compression detected")).toBe("warning");
    expect(categorizeIssue("nofollow directive present")).toBe("warning");
    expect(categorizeIssue("Large page size (600KB)")).toBe("warning");
    expect(categorizeIssue("Very few links (3)")).toBe("warning");
    expect(categorizeIssue("Limited links (10)")).toBe("warning");
    expect(categorizeIssue("No H3 headings for a page this size")).toBe("warning");
    expect(categorizeIssue("Redirect detected — 301")).toBe("warning");
    expect(categorizeIssue("4xx client error")).toBe("warning");
    expect(categorizeIssue("5xx server error")).toBe("warning");
  });

  it("classifies notice-level issues", () => {
    expect(categorizeIssue("Image missing alt text")).toBe("notice");
    expect(categorizeIssue("Favicon not detected")).toBe("notice");
    expect(categorizeIssue("Low word count: 150 words")).toBe("notice");
    expect(categorizeIssue("Meta description could be more compelling")).toBe("notice");
    expect(categorizeIssue("No Twitter Card tags")).toBe("notice");
  });
});

describe("safeJson", () => {
  it("parses valid JSON", () => {
    expect(safeJson('{"a":1,"b":"hello"}')).toEqual({ a: 1, b: "hello" });
    expect(safeJson('[1,2,3]')).toEqual([1, 2, 3]);
    expect(safeJson('"plain string"')).toBe("plain string");
    expect(safeJson("42")).toBe(42);
  });

  it("returns empty object for invalid JSON", () => {
    expect(safeJson("")).toEqual({});
    expect(safeJson("{broken")).toEqual({});
    expect(safeJson("not json at all")).toEqual({});
    expect(safeJson("undefined")).toEqual({});
  });
});

describe("timeAgoStr", () => {
  it('returns "never" for falsy input', () => {
    expect(timeAgoStr("")).toBe("never");
    expect(timeAgoStr(null as any)).toBe("never");
    expect(timeAgoStr(undefined as any)).toBe("never");
  });

  it("formats recent times", () => {
    const now = new Date().toISOString();
    expect(timeAgoStr(now)).toMatch(/^\d+s ago$/);

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(timeAgoStr(fiveMinAgo)).toMatch(/^\d+m ago$/);
  });

  it("formats older times", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    expect(timeAgoStr(twoHoursAgo)).toMatch(/^\d+h ago$/);

    const threeDaysAgo = new Date(Date.now() - 3 * 86400 * 1000).toISOString();
    expect(timeAgoStr(threeDaysAgo)).toMatch(/^\d+d ago$/);
  });
});

describe("formatSize", () => {
  it("formats bytes", () => {
    expect(formatSize(0)).toBe("0 B");
    expect(formatSize(500)).toBe("500 B");
    expect(formatSize(1023)).toBe("1023 B");
  });

  it("formats KB", () => {
    expect(formatSize(1024)).toBe("1.0 KB");
    expect(formatSize(2048)).toBe("2.0 KB");
    expect(formatSize(153600)).toBe("150.0 KB");
  });

  it("formats MB", () => {
    expect(formatSize(1048576)).toBe("1.0 MB");
    expect(formatSize(5242880)).toBe("5.0 MB");
  });
});