"use client";

import { useEffect, useMemo, useState } from "react";
import AnalyticsDashboard from "./analytics-dashboard";

type Severity = "High" | "Medium" | "Verify";
type Status = "Pending" | "Accepted" | "Rejected" | "Edited";

type Finding = {
  id: number;
  dbId?: string;
  title: string;
  severity: Severity;
  phrase: string;
  suggestion: string;
  explanation: string;
  status: Status;
};

type SavedReview = {
  id: string;
  content: string;
  summary: string | null;
  analysis_type: string | null;
  status: string | null;
  created_at: string;
};

const SAMPLE_CONTENT =
  "Our new product is the best in the world and guarantees perfect results. It will completely change your life. Join now and get amazing benefits with no risk at all.";

const NAV_ITEMS = [
  { label: "Dashboard", icon: "⌂" },
  { label: "New Review", icon: "▤" },
  { label: "Brand Guidelines", icon: "◇" },
  { label: "Review History", icon: "◷" },
  { label: "Analytics", icon: "▥" },
  { label: "Settings", icon: "⚙" },
];

export default function Home() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [content, setContent] = useState("");
  const [analyzed, setAnalyzed] = useState(false);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisSummary, setAnalysisSummary] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [search, setSearch] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [savedReviews, setSavedReviews] = useState<SavedReview[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [historyError, setHistoryError] = useState("");

  async function loadSavedReviews() {
    setIsLoadingReviews(true);
    setHistoryError("");
    try {
      const response = await fetch("/api/reviews", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not load review history.");
      }
      const rows = Array.isArray(data.reviews) ? data.reviews : [];
      setSavedReviews(rows.filter((item: unknown): item is SavedReview =>
        typeof item === "object" && item !== null &&
        typeof (item as Record<string, unknown>).id === "string" &&
        typeof (item as Record<string, unknown>).content === "string"
      ));
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Could not load review history.");
    } finally {
      setIsLoadingReviews(false);
    }
  }

  useEffect(() => {
    void loadSavedReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openSavedReview(review: SavedReview) {
    setContent(review.content);
    setAnalysisSummary(review.summary
      ? `Previously saved review summary: ${review.summary} Re-analyze this content to load its current findings.`
      : "This saved review's content is loaded. Select Analyze Content to run a fresh analysis.");
    setFindings([]);
    setAnalyzed(false);
    setAnalysisError("");
    setEditingId(null);
    setActivePage("New Review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function formatReviewDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date unavailable";
    return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }

  function reviewTitle(review: SavedReview) {
    const firstLine = review.content.trim().split(/\r?\n/)[0] ?? "";
    return firstLine.length > 58 ? `${firstLine.slice(0, 58)}…` : firstLine || "Untitled review";
  }

  const pendingCount = findings.filter(
    (finding) => finding.status === "Pending",
  ).length;

  const highCount = findings.filter(
    (finding) =>
      finding.severity === "High" && finding.status === "Pending",
  ).length;

  const verifyCount = findings.filter(
    (finding) =>
      finding.severity === "Verify" && finding.status === "Pending",
  ).length;

  const complianceScore = analyzed
    ? Math.max(
        0,
        100 -
          findings.reduce((total, finding) => {
            if (finding.status === "Rejected") return total;
            if (finding.severity === "High") return total + 15;
            if (finding.severity === "Medium") return total + 8;
            return total + 5;
          }, 0),
      )
    : null;

  const visibleFindings = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return findings;

    return findings.filter(
      (finding) =>
        finding.title.toLowerCase().includes(query) ||
        finding.phrase.toLowerCase().includes(query),
    );
  }, [findings, search]);

  async function analyzeContent() {
    if (!content.trim()) {
      setAnalysisError("Please enter some content before analyzing.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError("");
    setAnalysisSummary("");
    setAnalyzed(false);
    setFindings([]);
    setEditingId(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Unable to analyze content.",
        );
      }

      if (!Array.isArray(data.findings)) {
        throw new Error("The analysis response has an invalid format.");
      }

      const allowedSeverities = ["High", "Medium", "Verify"];

      const normalizedFindings: Finding[] = data.findings.map(
        (item: Record<string, unknown>, index: number) => ({
          // `id` is only for stable React/UI actions. `dbId` must be the
          // UUID returned by the API for the matching row in review_findings.
          id: index + 1,
          dbId:
            typeof item.dbId === "string"
              ? item.dbId
              : typeof item.id === "string"
                ? item.id
                : typeof item.finding_id === "string"
                  ? item.finding_id
                  : undefined,
          title:
            typeof item.title === "string"
              ? item.title
              : "Content review finding",
          severity: allowedSeverities.includes(String(item.severity))
            ? (String(item.severity) as Severity)
            : "Verify",
          phrase: typeof item.phrase === "string" ? item.phrase : "",
          suggestion:
            typeof item.suggestion === "string" ? item.suggestion : "",
          explanation:
            typeof item.explanation === "string"
              ? item.explanation
              : "Review this wording before publication.",
          status:
            item.status === "Accepted" ||
            item.status === "Rejected" ||
            item.status === "Edited"
              ? item.status
              : "Pending",
        }),
      );

      setFindings(normalizedFindings);
      setAnalysisSummary(
        typeof data.summary === "string" ? data.summary : "",
      );
      setAnalyzed(true);
      setActivePage("Dashboard");
      void loadSavedReviews();
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Something went wrong during analysis.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  function clearContent() {
    setContent("");
    setFindings([]);
    setAnalyzed(false);
    setAnalysisError("");
    setAnalysisSummary("");
    setEditingId(null);
  }

  function loadSample() {
    setContent(SAMPLE_CONTENT);
    setFindings([]);
    setAnalyzed(false);
    setAnalysisError("");
    setAnalysisSummary("");
    setActivePage("Dashboard");
  }
function startNewReview() {
  setContent("");
  setSearch("");
  setFindings([]);
  setAnalyzed(false);
  setAnalysisError("");
  setAnalysisSummary("");
  setEditingId(null);
  setActivePage("New Review");

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

  async function updateStatus(id: number, status: Status) {
    const finding = findings.find((item) => item.id === id);

    if (!finding) {
      setAnalysisError("Finding not found. Please analyze the content again.");
      return;
    }

    if (!finding.dbId) {
      setAnalysisError(
        "This finding has no database ID. Update /api/analyze to return the inserted review_findings UUID, then analyze the content again.",
      );
      return;
    }

    setAnalysisError("");

    try {
      const response = await fetch("/api/findings/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: finding.dbId, status }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Could not save the finding status.",
        );
      }

      setFindings((current) =>
        current.map((item) =>
          item.id === id ? { ...item, status } : item,
        ),
      );
      setEditingId(null);
    } catch (error) {
      setAnalysisError(
        error instanceof Error ? error.message : "Could not save the finding status.",
      );
    }
  }

  async function saveEdit(finding: Finding) {
    const suggestion = editText.trim();
    if (!suggestion) {
      setAnalysisError("Enter a suggested correction before saving.");
      return;
    }

    if (!finding.dbId) {
      setAnalysisError(
        "This finding has no database ID. Update /api/analyze to return the inserted review_findings UUID, then analyze the content again.",
      );
      return;
    }

    setAnalysisError("");

    try {
      const response = await fetch("/api/findings/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: finding.dbId,
          status: "Edited",
          suggested_correction: suggestion,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Could not save the edited correction.",
        );
      }

      setFindings((current) =>
        current.map((item) =>
          item.id === finding.id
            ? { ...item, suggestion, status: "Edited" }
            : item,
        ),
      );
      setEditingId(null);
    } catch (error) {
      setAnalysisError(
        error instanceof Error ? error.message : "Could not save the edited correction.",
      );
    }
  }

  return (
    <main className={`app-shell ${darkMode ? "dark-mode" : ""}`}>
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-logo">
            B<span>✦</span>
          </div>

          <div className="brand-name">
            <strong>
              Brand<span>Sentinel</span> AI
            </strong>
            <small>Protecting Brand Identity.</small>
            <small>Ensuring Content Integrity.</small>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <div className="workspace-card">
          <div className="workspace-avatar">S</div>
          <div className="workspace-details">
            <strong>Sample Brand</strong>
            <span>Example workspace</span>
          </div>
          <span className="workspace-arrow">⌄</span>
        </div>

        <nav className="navigation">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              className={`nav-item ${
                activePage === item.label ? "active" : ""
              }`}
              onClick={() => {
                if (item.label === "New Review") {
                  startNewReview();
                } else {
                  setActivePage(item.label);
                }
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.label === "New Review" && (
                <span className="nav-plus">+</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-sparkle">✦</div>

          <div className="sidebar-emblem" aria-label="SOLONEX logo">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <path
                d="M18 12H49C70 12 81 22 81 38C81 48 75 54 66 58C80 61 88 70 88 82C88 98 75 105 53 105H18V12ZM39 29V48H49C58 48 62 45 62 38C62 32 57 29 49 29H39ZM39 64V86H53C63 86 69 83 69 75C69 67 63 64 53 64H39Z"
                fill="currentColor"
                transform="translate(0 -7)"
              />
              <path
                d="M77 9L80 17L88 20L80 23L77 31L74 23L66 20L74 17Z"
                fill="#8C80FF"
              />
            </svg>
          </div>

          <div className="sidebar-solonex">SOLONEX</div>
          <p>Better Content.</p>
          <p>Stronger Brands.</p>
          <span>Independent innovation by SOLONEX</span>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <button
            className="icon-button menu-button"
            onClick={() =>
              setActivePage(
                activePage === "Dashboard" ? "New Review" : "Dashboard",
              )
            }
            aria-label="Switch workspace view"
          >
            ☰
          </button>

          <div className="search-box">
            <span>⌕</span>
            <input
              aria-label="Search findings"
              placeholder="Search reviews, guidelines, or anything..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <kbd>Ctrl K</kbd>
          </div>

          <div className="topbar-spacer" />

          <button
            className="icon-button theme-button"
            onClick={() => setDarkMode((current) => !current)}
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {darkMode ? "☾" : "☼"}
          </button>

          <button
            className="icon-button notification-button"
            aria-label="Notifications"
            title="Notifications"
            onClick={() =>
              alert(
                pendingCount
                  ? `${pendingCount} findings are awaiting review.`
                  : "You have no pending review notifications.",
              )
            }
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>
            <span className="notification-dot" />
          </button>

          <button
            className="user-profile"
            onClick={() => setShowProfile((current) => !current)}
          >
            <span className="user-avatar">H</span>
            <span className="user-details">
              <strong>Maddula Hemanth</strong>
              <small>SOLONEX</small>
            </span>
            <span>⌄</span>
          </button>

          {showProfile && (
            <div className="profile-popover">
              <strong>Maddula Hemanth</strong>
              <span>Individual participant</span>
              <span>SOLONEX · BrandSentinel AI</span>
              <button onClick={() => setShowProfile(false)}>Close</button>
            </div>
          )}
        </header>

        <div className="page-content">
          {activePage === "Dashboard" || activePage === "New Review" ? (
            <>
              <section className="hero-section">
                <div className="hero-copy">
                  <div className="eyebrow">
                    <span className="eyebrow-dot" />
                    AI-POWERED BRAND CONTENT REVIEW
                  </div>

                  <h1>
                    Create Confident Content.
                    <br />
                    <span>Stay On Brand.</span>
                  </h1>

                  <p>
                    Analyze your marketing content against brand guidelines,
                    approved terms, and factual accuracy with clear,
                    explainable insights.
                  </p>
                </div>

                <div className="hero-illustration" aria-hidden="true">
                  <span className="hero-sparkle sparkle-one">✦</span>
                  <span className="hero-sparkle sparkle-two">✧</span>
                  <span className="hero-sparkle sparkle-three">✦</span>
                  <div className="illustration-orbit" />

                  <div className="illustration-document">
                    <div className="document-line long" />
                    <div className="document-line" />
                    <div className="document-line medium" />
                    <div className="document-line short" />
                  </div>

                  <div className="illustration-logo">B</div>

                  <div className="floating-tag compliant">
                    <span>✓</span> Compliant
                  </div>
                  <div className="floating-tag issues">
                    <span>!</span> Issues Found
                  </div>
                  <div className="floating-tag suggestions">
                    ✦ Suggestions
                  </div>
                </div>
              </section>

              <section className="stats-grid">
                <article className="stat-card">
                  <div className="stat-icon red">⚠</div>
                  <div>
                    <strong className="stat-number red-text">
                      {analyzed ? findings.length : "—"}
                    </strong>
                    <b>Issues Detected</b>
                    <span>In this review</span>
                  </div>
                </article>

                <article className="stat-card">
                  <div className="stat-icon orange">!</div>
                  <div>
                    <strong className="stat-number red-text">
                      {analyzed ? highCount : "—"}
                    </strong>
                    <b>High Priority</b>
                    <span>Needs attention</span>
                  </div>
                </article>

                <article className="stat-card">
                  <div className="stat-icon blue">▤</div>
                  <div>
                    <strong className="stat-number blue-text">
                      {analyzed ? verifyCount : "—"}
                    </strong>
                    <b>Needs Verification</b>
                    <span>Factual claims</span>
                  </div>
                </article>

                <article className="stat-card">
                  <div className="stat-icon green">◉</div>
                  <div>
                    <strong className="stat-number">
                      {complianceScore === null
                        ? "—"
                        : `${complianceScore}%`}
                    </strong>
                    <b>Brand Compliance</b>
                    <span>Illustrative score</span>
                  </div>
                </article>
              </section>

              <div className="dashboard-grid">
                <div className="left-column">
                  <section className="panel-card content-editor">
                    <div className="section-heading">
                      <div className="heading-icon purple">↗</div>
                      <h2>Content to Review</h2>

                      <div className="heading-actions">
                        <button
                          className="secondary-button"
                          onClick={loadSample}
                        >
                          ✨ Try Sample Content
                        </button>
                        <button
                          className="clear-button"
                          onClick={clearContent}
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <textarea
                      value={content}
                      onChange={(event) => {
                        setContent(event.target.value);
                        setAnalyzed(false);
                        setAnalysisError("");
                        setAnalysisSummary("");
                      }}
                      placeholder="Paste your advertisement, social media caption, product description, or campaign message here..."
                      aria-label="Content to review"
                    />

                    <div className="editor-meta">
                      <span>Characters: {content.length}</span>
                      <span>
                        Supported: Text marketing content, social posts, ads
                      </span>
                    </div>

                    <button
                      className="analyze-button"
                      onClick={analyzeContent}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing
                        ? "Analyzing with Gemini..."
                        : "✨ Analyze Content"}
                    </button>

                    <div className="prototype-note">
                      <span>●</span> Gemini AI analysis provides suggestions.
                      Verify factual claims before publication.
                    </div>

                    {analysisError && (
                      <div className="analysis-error" role="alert">
                        {analysisError}
                      </div>
                    )}
                  </section>

                  <section className="panel-card results-panel">
                    <div className="results-heading">
                      <div>
                        <div className="section-heading compact">
                          <div className="heading-icon purple">▥</div>
                          <h2>Analysis Results</h2>
                        </div>
                        <p>
                          {isAnalyzing
                            ? "Gemini is reviewing your content..."
                            : analyzed
                              ? "Gemini AI analysis completed. Review every suggestion before using it."
                              : "Your findings will appear here after you analyze content."}
                        </p>
                      </div>

                      {complianceScore !== null && (
                        <div className="compliance-badge">
                          <strong>✓ {complianceScore}/100</strong>
                          <span>Illustrative score</span>
                        </div>
                      )}
                    </div>

                    {analysisSummary && (
                      <p className="analysis-summary">{analysisSummary}</p>
                    )}

                    {analyzed && findings.length > 0 && (
                      <div className="filter-pills">
                        <span className="filter-pill all">
                          ◈ All Issues ({findings.length})
                        </span>
                        <span className="filter-pill high">
                          ⬇ High (
                          {
                            findings.filter((f) => f.severity === "High")
                              .length
                          }
                          )
                        </span>
                        <span className="filter-pill medium">
                          ⚠ Medium (
                          {
                            findings.filter((f) => f.severity === "Medium")
                              .length
                          }
                          )
                        </span>
                        <span className="filter-pill verify">
                          ◉ Verify (
                          {
                            findings.filter((f) => f.severity === "Verify")
                              .length
                          }
                          )
                        </span>
                      </div>
                    )}

                    {isAnalyzing ? (
                      <div className="empty-state">
                        <div className="empty-icon">✧</div>
                        <strong>Analyzing your content</strong>
                        <p>
                          Please wait while Gemini reviews the wording and
                          identifies potential issues.
                        </p>
                      </div>
                    ) : !analyzed ? (
                      <div className="empty-state">
                        <div className="empty-icon">✧</div>
                        <strong>Ready when you are</strong>
                        <p>
                          Paste your content above and select Analyze Content
                          to identify wording that may need attention.
                        </p>
                      </div>
                    ) : visibleFindings.length === 0 ? (
                      <div className="empty-state success-state">
                        <div className="empty-icon">✓</div>
                        <strong>
                          {findings.length === 0
                            ? "No configured issues identified"
                            : "No findings match your search"}
                        </strong>
                        <p>
                          This result does not guarantee compliance or factual
                          accuracy. Review content before publication.
                        </p>
                      </div>
                    ) : (
                      <div className="findings-list">
                        {visibleFindings.map((finding) => (
                          <article
                            key={finding.id}
                            className={`finding-card ${finding.severity.toLowerCase()}`}
                          >
                            <div className="finding-severity">
                              <span>
                                {finding.severity === "High"
                                  ? "!"
                                  : finding.severity === "Medium"
                                    ? "⚠"
                                    : "◉"}
                              </span>
                              <small>{finding.severity}</small>
                            </div>

                            <div className="finding-description">
                              <strong>{finding.title}</strong>
                              <p>{finding.explanation}</p>
                              <span className="finding-status">
                                Status: {finding.status}
                              </span>
                            </div>

                            <div className="finding-copy">
                              <small>Original Text</small>
                              <p>&quot;{finding.phrase}&quot;</p>
                              <small>Suggested Correction</small>

                              {editingId === finding.id ? (
                                <div className="edit-area">
                                  <textarea
                                    value={editText}
                                    onChange={(event) =>
                                      setEditText(event.target.value)
                                    }
                                    aria-label="Edit suggested correction"
                                  />
                                  <button
                                    className="mini-button accept"
                                    onClick={() => saveEdit(finding)}
                                  >
                                    Save
                                  </button>
                                  <button
                                    className="mini-button reject"
                                    onClick={() => setEditingId(null)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <p>&quot;{finding.suggestion}&quot;</p>
                              )}
                            </div>

                            <div className="finding-actions">
                              <button
                                className="action-button accept"
                                onClick={() =>
                                  updateStatus(finding.id, "Accepted")
                                }
                                disabled={finding.status === "Accepted"}
                              >
                                ✓ Accept
                              </button>

                              <button
                                className="action-button edit"
                                onClick={() => {
                                  setEditingId(finding.id);
                                  setEditText(finding.suggestion);
                                }}
                              >
                                ✎ Edit
                              </button>

                              <button
                                className="action-button reject"
                                onClick={() =>
                                  updateStatus(finding.id, "Rejected")
                                }
                                disabled={finding.status === "Rejected"}
                              >
                                × Reject
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}

                    {analyzed && (
                      <button
                        className="secondary-button rerun-button"
                        onClick={analyzeContent}
                        disabled={isAnalyzing}
                      >
                        ↻ Re-analyze Content
                      </button>
                    )}
                  </section>
                </div>

                <aside className="right-column">
                  <section className="panel-card brand-profile-card">
                    <div className="right-card-heading">
                      <h3>Active Brand Profile</h3>
                      <span className="demo-badge">DEMO</span>
                    </div>

                    <div className="brand-profile-intro">
                      <div className="brand-round-logo">B</div>
                      <div>
                        <strong>Sample Brand</strong>
                        <span>Tech &amp; Productivity</span>
                      </div>
                    </div>

                    <div className="profile-detail">
                      <div className="detail-icon">☏</div>
                      <div>
                        <strong>Professional &amp; Trustworthy</strong>
                        <span>Brand Tone</span>
                      </div>
                      <span>›</span>
                    </div>

                    <div className="profile-detail">
                      <div className="detail-icon">♧</div>
                      <div>
                        <strong>Clear and Honest</strong>
                        <span>Communication Style</span>
                      </div>
                      <span>›</span>
                    </div>

                    <div className="profile-detail">
                      <div className="detail-icon">ϟ</div>
                      <div>
                        <strong>Innovation, Simplicity, User Focus</strong>
                        <span>Key Values</span>
                      </div>
                      <span>›</span>
                    </div>
                  </section>

                  <section className="panel-card rules-card">
                    <div className="right-card-heading">
                      <h3>Brand Rules Summary</h3>
                      <button
                        className="text-button"
                        onClick={() => setActivePage("Brand Guidelines")}
                      >
                        View All
                      </button>
                    </div>

                    <div className="rule-summary-row">
                      <span className="rule-icon approved">✓</span>
                      <span>12 Approved Terms</span>
                    </div>
                    <div className="rule-summary-row">
                      <span className="rule-icon prohibited">⊘</span>
                      <span>8 Prohibited Terms</span>
                    </div>
                    <div className="rule-summary-row">
                      <span className="rule-icon required">▤</span>
                      <span>5 Required Phrases</span>
                    </div>
                    <div className="rule-summary-row">
                      <span className="rule-icon verify-icon">!</span>
                      <span>Guidelines for Factual Claims</span>
                    </div>
                    <p className="demo-caption">
                      Example counts for the prototype.
                    </p>
                  </section>

                  <section className="panel-card recent-card">
                    <div className="right-card-heading">
                      <h3>Recent Reviews</h3>
                      <button
                        className="text-button"
                        onClick={() => setActivePage("Review History")}
                      >
                        View All
                      </button>
                    </div>

                    {isLoadingReviews ? (
                      <p className="demo-caption">Loading saved reviews…</p>
                    ) : savedReviews.length > 0 ? (
                      savedReviews.slice(0, 4).map((review) => (
                        <button
                          className="recent-review recent-review-button"
                          key={review.id}
                          onClick={() => openSavedReview(review)}
                          title="Load this saved review's content"
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", border: 0, borderBottom: "1px solid var(--border, #e7ebf3)", background: "transparent", color: "inherit", textAlign: "left", cursor: "pointer", font: "inherit" }}
                        >
                          <div className="recent-icon">▤</div>
                          <div className="recent-copy">
                            <strong>{reviewTitle(review)}</strong>
                            <span>{review.analysis_type ?? "Content review"} · {review.status ?? "Pending"}</span>
                          </div>
                          <small>{formatReviewDate(review.created_at)}</small>
                        </button>
                      ))
                    ) : (
                      <p className="demo-caption">No saved reviews yet. Analyze content to create your first review.</p>
                    )}
                    {historyError && <p className="analysis-error" role="alert">{historyError}</p>}
                  </section>
                </aside>
              </div>
            </>
          ) : (
            <section className="subpage panel-card">
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                BRANDSENTINEL AI WORKSPACE
              </div>

              <h1>{activePage}</h1>

              {activePage === "Brand Guidelines" ? (
                <>
                  <p>
                    Example guidelines for the Sample Brand workspace.
                  </p>

                  <div className="guideline-row">
                    <span className="rule-icon approved">✓</span>
                    <div>
                      <strong>Preferred voice</strong>
                      <p>Professional, trustworthy, clear, and honest.</p>
                    </div>
                  </div>

                  <div className="guideline-row">
                    <span className="rule-icon prohibited">⊘</span>
                    <div>
                      <strong>Avoid absolute claims</strong>
                      <p>
                        Verify guarantees, zero-risk statements, and universal
                        superiority claims.
                      </p>
                    </div>
                  </div>

                  <div className="guideline-row">
                    <span className="rule-icon verify-icon">!</span>
                    <div>
                      <strong>Evidence and verification</strong>
                      <p>
                        Support factual claims with reliable evidence before
                        publication.
                      </p>
                    </div>
                  </div>

                  <p className="demo-caption">
                    These are example rules, not a saved or verified brand
                    policy.
                  </p>
                </>
              ) : activePage === "Review History" ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
                    <p>Saved reviews from your Supabase database.</p>
                    <button className="secondary-button" onClick={() => void loadSavedReviews()} disabled={isLoadingReviews}>
                      {isLoadingReviews ? "Refreshing…" : "↻ Refresh"}
                    </button>
                  </div>
                  {historyError && <div className="analysis-error" role="alert">{historyError}</div>}
                  {isLoadingReviews && savedReviews.length === 0 ? (
                    <div className="empty-state"><div className="empty-icon">◷</div><strong>Loading review history</strong><p>Please wait while saved reviews are retrieved.</p></div>
                  ) : savedReviews.length > 0 ? (
                    <div style={{ display: "grid", gap: "12px" }}>
                {savedReviews
  .filter((review) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    const text = [
      review.content,
      review.summary,
      review.analysis_type,
      review.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return text.includes(query);
  })
  .map((review) => (
                        <article key={review.id} style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", padding: "18px", border: "1px solid var(--border, #e7ebf3)", borderRadius: "14px" }}>
                          <div className="recent-icon">▤</div>
                          <div style={{ flex: "1 1 280px", minWidth: 0 }}>
                            <strong>{reviewTitle(review)}</strong>
                            <p style={{ margin: "6px 0", overflowWrap: "anywhere" }}>{review.summary || "No summary was saved for this review."}</p>
                            <span style={{ fontSize: "12px", opacity: 0.75 }}>{formatReviewDate(review.created_at)} · {review.analysis_type ?? "Content review"} · {review.status ?? "Pending"}</span>
                          </div>
                          <button className="secondary-button" onClick={() => openSavedReview(review)}>Load content</button>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon">◷</div><strong>No saved reviews yet</strong>
                      <p>Go to New Review, enter your content, and select Analyze Content. Your saved reviews will appear here.</p>
                      <button className="analyze-button subpage-button" onClick={startNewReview}>+ Create your first review</button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p>
                    This section is part of the dashboard prototype. Persistent
                    functionality has not been implemented yet.
                  </p>

                  {activePage === "Analytics" && (
  <AnalyticsDashboard />
)}

                  {activePage === "Settings" && (
                    <div className="guideline-row">
                      <div>
                        <strong>Appearance</strong>
                        <p>Switch between light and dark themes.</p>
                      </div>
                      <button
                        className="secondary-button"
                        onClick={() => setDarkMode((current) => !current)}
                      >
                        {darkMode ? "Use light theme" : "Use dark theme"}
                      </button>
                    </div>
                  )}

                  <button
                    className="analyze-button subpage-button"
                    onClick={startNewReview}
                  >
                    + Start a New Review
                  </button>
                </>
              )}
            </section>
          )}
        </div>
      </section>
    </main>
  );
}