"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AnalyticsData = {
  totals: {
    reviews: number;
    findings: number;
    highPriority: number;
    verify: number;
    accepted: number;
    rejected: number;
    edited: number;
    pending: number;
    averageCompliance: number | null;
    scoredReviews: number;
  };
  recentActivity?: {
    date: string;
    count: number;
  }[];
};

const COLORS = ["#10b981", "#ef4444", "#6366f1", "#f59e0b"];

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/analytics", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to load analytics.");
      }

      setData(result as AnalyticsData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load analytics."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const totals = data?.totals;

  const statistics = [
    {
      label: "Total Reviews",
      value: totals?.reviews ?? 0,
      description: "Reviews saved in Supabase",
      icon: "▤",
      color: "blue",
    },
    {
      label: "Total Findings",
      value: totals?.findings ?? 0,
      description: "Issues identified by AI",
      icon: "⚑",
      color: "purple",
    },
    {
      label: "High Priority",
      value: totals?.highPriority ?? 0,
      description: "Findings requiring attention",
      icon: "!",
      color: "red",
    },
    {
      label: "Needs Verification",
      value: totals?.verify ?? 0,
      description: "Claims requiring evidence",
      icon: "✓",
      color: "orange",
    },
  ];

  const statuses = [
    { label: "Accepted", value: totals?.accepted ?? 0 },
    { label: "Rejected", value: totals?.rejected ?? 0 },
    { label: "Edited", value: totals?.edited ?? 0 },
    { label: "Pending", value: totals?.pending ?? 0 },
  ];

  const activityData = (data?.recentActivity ?? []).map((item) => ({
    date: item.date,
    reviews: item.count,
  }));

  const decisionData = statuses.filter((item) => item.value > 0);

  if (loading && !data) {
    return (
      <section className="analytics-dashboard">
        <h1>Advanced Analytics</h1>
        <p>Loading analytics from Supabase...</p>
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="analytics-dashboard">
        <h1>Advanced Analytics</h1>
        <p role="alert">{error}</p>
        <button onClick={() => void loadAnalytics()}>Try again</button>
      </section>
    );
  }

  if (!data || !totals) return null;

  return (
    <section className="analytics-dashboard">
      <header className="analytics-heading">
        <div>
          <div className="analytics-eyebrow">
            <span className="analytics-dot" />
            BRANDSENTINEL AI WORKSPACE
          </div>

          <h1>Advanced Analytics</h1>

          <p>
            Monitor brand reviews, findings, activity trends, and review
            decisions using your saved data.
          </p>
        </div>

        <button
          type="button"
          className="analytics-refresh"
          onClick={() => void loadAnalytics()}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </header>

      {error && (
        <div className="analytics-error" role="alert">
          {error}
        </div>
      )}

      <div className="analytics-stat-grid">
        {statistics.map((stat) => (
          <article className="analytics-stat-card" key={stat.label}>
            <div className={`analytics-stat-icon ${stat.color}`}>
              {stat.icon}
            </div>

            <div>
              <p>{stat.label}</p>
              <strong>{stat.value.toLocaleString()}</strong>
              <span>{stat.description}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="analytics-chart-grid">
        <article className="analytics-panel analytics-chart-panel">
          <div className="analytics-panel-heading">
            <div>
              <h2>Review Activity</h2>
              <p>Saved reviews over time</p>
            </div>
          </div>

          {activityData.length > 0 ? (
            <div className="analytics-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData}>
                  <defs>
                    <linearGradient
                      id="reviewGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#6366f1"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="100%"
                        stopColor="#6366f1"
                        stopOpacity={0.03}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />

                  <Area
                    type="monotone"
                    dataKey="reviews"
                    name="Reviews"
                    stroke="#6366f1"
                    strokeWidth={3}
                    fill="url(#reviewGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="analytics-chart-empty">
              No dated review activity is available yet.
            </p>
          )}
        </article>

        <article className="analytics-panel analytics-chart-panel">
          <div className="analytics-panel-heading">
            <div>
              <h2>Decision Distribution</h2>
              <p>Current status of saved findings</p>
            </div>
          </div>

          {decisionData.length > 0 ? (
            <>
              <div className="analytics-donut-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={decisionData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius="58%"
                      outerRadius="82%"
                      paddingAngle={3}
                    >
                      {decisionData.map((item) => (
                        <Cell
                          key={item.label}
                          fill={
                            COLORS[
                              statuses.findIndex(
                                (status) => status.label === item.label
                              )
                            ]
                          }
                        />
                      ))}
                    </Pie>

                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="analytics-donut-center">
                  <strong>{totals.findings}</strong>
                  <span>Findings</span>
                </div>
              </div>

              <div className="analytics-chart-legend">
                {statuses.map((status, index) => (
                  <div key={status.label}>
                    <span
                      className="analytics-legend-dot"
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <span>{status.label}</span>
                    <strong>{status.value}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="analytics-chart-empty">
              No findings have been recorded yet.
            </p>
          )}
        </article>
      </div>

      <div className="analytics-content-grid">
        <article className="analytics-panel">
          <div className="analytics-panel-heading">
            <div>
              <h2>Review Decisions</h2>
              <p>Progress across all findings</p>
            </div>
          </div>

          <div className="analytics-status-list">
            {statuses.map((status, index) => {
              const percentage =
                totals.findings > 0
                  ? Math.round((status.value / totals.findings) * 100)
                  : 0;

              return (
                <div className="analytics-status-item" key={status.label}>
                  <div className="analytics-status-top">
                    <span>
                      <span
                        className="analytics-status-dot"
                        style={{ backgroundColor: COLORS[index] }}
                      />
                      {status.label}
                    </span>

                    <strong>{status.value}</strong>
                  </div>

                  <div className="analytics-progress-track">
                    <div
                      className="analytics-progress-fill"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: COLORS[index],
                      }}
                    />
                  </div>

                  <span className="analytics-percentage">
                    {percentage}% of all findings
                  </span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="analytics-panel">
          <div className="analytics-panel-heading">
            <div>
              <h2>Compliance Overview</h2>
              <p>Based on recorded compliance scores</p>
            </div>
          </div>

          <div className="analytics-compliance">
            <div className="analytics-compliance-icon">✓</div>

            {totals.averageCompliance !== null ? (
              <>
                <strong>
                  {Math.round(totals.averageCompliance)}/100
                </strong>
                <p>Average compliance score</p>
                <span>
                  Based on {totals.scoredReviews} scored reviews.
                </span>
              </>
            ) : (
              <>
                <strong>Not available</strong>
                <p>No compliance scores have been recorded.</p>
                <span>
                  Scores will appear when they are available in your data.
                </span>
              </>
            )}
          </div>

          <div className="analytics-note">
            <strong>Important</strong>
            <p>
              AI findings are recommendations, not proof that a claim is
              false. Verify factual claims before publishing.
            </p>
          </div>
        </article>
      </div>

      <article className="analytics-panel analytics-summary-panel">
        <h2>Review Summary</h2>

        <div className="analytics-summary-grid">
          <div>
            <span>Reviews saved</span>
            <strong>{totals.reviews}</strong>
          </div>

          <div>
            <span>Findings reviewed</span>
            <strong>
              {totals.accepted + totals.rejected + totals.edited}
            </strong>
          </div>

          <div>
            <span>Awaiting a decision</span>
            <strong>{totals.pending}</strong>
          </div>

          <div>
            <span>Verification needed</span>
            <strong>{totals.verify}</strong>
          </div>
        </div>
      </article>

      <p className="analytics-footer">
        Data is retrieved from your Supabase analytics API.
      </p>
    </section>
  );
}