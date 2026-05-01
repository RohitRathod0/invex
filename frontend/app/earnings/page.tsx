"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, Bell, FileText, Loader2, Mic, Sparkles, Trash2, TrendingDown, TrendingUp, UploadCloud } from "lucide-react";

type SectionAnalysis = {
  overall_sentiment: string;
  confidence: number;
  key_positive_points: string[];
  key_concerns: string[];
  key_themes: string[];
  tone_summary: string;
  finbert_signal?: {
    available: boolean;
    label?: string;
    confidence?: number;
    sentence_count?: number;
  };
};

type EarningsResult = {
  analysis_id?: string;
  created_at?: string | null;
  company: string;
  quarter: string;
  source_type: string;
  analysis_mode: string;
  sentiment_analysis: {
    management_discussion: SectionAnalysis;
    qa_session: SectionAnalysis;
  };
  financial_guidance: {
    revenue_guidance: string;
    profit_guidance: string;
    margin_outlook: string;
    demand_outlook: string;
    capex_signal: string;
    guidance_summary: string;
  };
  vs_previous_quarter: {
    comparison_available: boolean;
    sentiment_improving: boolean | null;
    current_sentiment_score?: number;
    previous_sentiment_score?: number;
    delta?: number;
    summary: string;
  };
  section_dynamics?: {
    management_discussion?: {
      early_sentiment: string;
      late_sentiment: string;
      shift: string;
    };
    qa_session?: {
      early_sentiment: string;
      late_sentiment: string;
      shift: string;
    };
    overall_call_shift?: string;
  };
  keyword_intelligence?: {
    bullish_mentions: Record<string, number>;
    caution_mentions: Record<string, number>;
    operational_mentions: Record<string, number>;
    net_keyword_bias: number;
  };
  voice_tone_signals?: {
    available: boolean;
    summary: string;
    duration_seconds?: number;
    words_per_minute?: number | null;
    silence_ratio?: number;
    hesitation_count?: number;
    confidence_tone?: string;
    stress_signal?: string;
  };
  market_tone: {
    stance: string;
    confidence: number;
    summary: string;
  };
  confidence_score: number;
  key_takeaways: {
    positives: string[];
    concerns: string[];
    themes: string[];
    guidance_summary: string;
  };
  limitations: string[];
};

type EarningsHistoryItem = {
  id: string;
  company: string;
  quarter: string;
  source_type: string;
  market_tone: string | null;
  confidence_score: number | null;
  transcript_excerpt: string | null;
  created_at: string | null;
};

type EarningsAlertItem = {
  id: string;
  user_id: string;
  symbol: string;
  earnings_date: string | null;
  notify_before_hours: number;
  note?: string | null;
  is_active: boolean;
  latest_analysis_id?: string | null;
  created_at?: string | null;
};

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "20px",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#111111",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: "14px",
  padding: "12px 14px",
  color: "#fff",
  fontSize: "14px",
  outline: "none",
};

const textAreaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: "170px",
  resize: "vertical",
  lineHeight: 1.6,
};

function pillColor(value: string) {
  const normalized = value.toUpperCase();
  if (["POSITIVE", "RAISED", "EXPANDING", "STRONG", "POSITIVE_EARNINGS_TONE"].includes(normalized)) {
    return {
      border: "1px solid rgba(16,185,129,0.28)",
      background: "rgba(16,185,129,0.10)",
      color: "#34D399",
    };
  }
  if (["NEGATIVE", "LOWERED", "PRESSURED", "SOFTENING", "CAUTIOUS_EARNINGS_TONE"].includes(normalized)) {
    return {
      border: "1px solid rgba(239,68,68,0.28)",
      background: "rgba(239,68,68,0.10)",
      color: "#F87171",
    };
  }
  return {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
    color: "#D1D5DB",
  };
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
      <span style={{ color: "#9CA3AF", fontSize: "13px" }}>{label}</span>
      <span style={{ ...pillColor(value), fontSize: "11px", fontWeight: 700, padding: "5px 10px", borderRadius: "999px" }}>
        {value.replaceAll("_", " ")}
      </span>
    </div>
  );
}

function FileHint({ file }: { file: File | null }) {
  return (
    <div style={{ fontSize: "12px", color: file ? "#C8F135" : "#6B7280", marginTop: "8px" }}>
      {file ? `Selected: ${file.name}` : "Upload a transcript PDF if you don't want to paste the text."}
    </div>
  );
}

export default function EarningsPage() {
  const userId = "0000-user";
  const [symbol, setSymbol] = useState("INFY");
  const [quarter, setQuarter] = useState("Q4 FY2025");
  const [alertDate, setAlertDate] = useState("");
  const [alertNote, setAlertNote] = useState("");
  const [transcriptText, setTranscriptText] = useState("");
  const [previousTranscriptText, setPreviousTranscriptText] = useState("");
  const [transcriptPdf, setTranscriptPdf] = useState<File | null>(null);
  const [transcriptAudio, setTranscriptAudio] = useState<File | null>(null);
  const [previousTranscriptPdf, setPreviousTranscriptPdf] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EarningsResult | null>(null);
  const [history, setHistory] = useState<EarningsHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<EarningsAlertItem[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  const loadHistory = React.useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch("/api/v1/earnings/history?limit=12");
      if (!response.ok) {
        throw new Error(`History failed with status ${response.status}`);
      }
      const data = await response.json();
      setHistory(data.items || []);
    } catch (err: any) {
      setHistoryError(err.message || "Unable to load recent analyses.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const loadAlerts = React.useCallback(async () => {
    setAlertsLoading(true);
    try {
      const response = await fetch(`/api/v1/earnings/alerts/${userId}`);
      if (!response.ok) {
        throw new Error("Unable to load alerts");
      }
      const data = await response.json();
      setAlerts(data.items || []);
    } catch {
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const canAnalyze = useMemo(() => {
    return Boolean(symbol.trim() && quarter.trim() && (transcriptText.trim() || transcriptPdf || transcriptAudio));
  }, [quarter, symbol, transcriptAudio, transcriptPdf, transcriptText]);

  const handleAnalyze = async () => {
    if (!canAnalyze) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const form = new FormData();
      form.append("symbol", symbol.trim().toUpperCase());
      form.append("quarter", quarter.trim());
      form.append("source_type", transcriptPdf ? "pdf_upload" : "manual");

      if (transcriptText.trim()) {
        form.append("transcript_text", transcriptText.trim());
      }
      if (previousTranscriptText.trim()) {
        form.append("previous_transcript_text", previousTranscriptText.trim());
      }
      if (transcriptPdf) {
        form.append("transcript_pdf", transcriptPdf);
      }
      if (transcriptAudio) {
        form.append("transcript_audio", transcriptAudio);
      }
      if (previousTranscriptPdf) {
        form.append("previous_transcript_pdf", previousTranscriptPdf);
      }

      const response = await fetch("/api/v1/earnings/analyze-upload", {
        method: "POST",
        body: form,
      });

      if (!response.ok) {
        throw new Error(`Analysis failed with status ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
      await loadHistory();
      await loadAlerts();
    } catch (err: any) {
      setError(err.message || "Unable to analyze this earnings call right now.");
    } finally {
      setLoading(false);
    }
  };

  const openHistoryItem = async (analysisId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/earnings/history/${analysisId}`);
      if (!response.ok) {
        throw new Error(`History fetch failed with status ${response.status}`);
      }
      const data = await response.json();
      setResult(data);
      setSymbol(data.company || symbol);
      setQuarter(data.quarter || quarter);
    } catch (err: any) {
      setError(err.message || "Unable to open this saved analysis.");
    } finally {
      setLoading(false);
    }
  };

  const createAlert = async () => {
    if (!symbol.trim() || !alertDate) return;
    try {
      const response = await fetch("/api/v1/earnings/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          symbol: symbol.trim().toUpperCase(),
          earnings_date: new Date(alertDate).toISOString(),
          notify_before_hours: 24,
          note: alertNote.trim() || null,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to create alert");
      }
      setAlertDate("");
      setAlertNote("");
      await loadAlerts();
    } catch (err: any) {
      setError(err.message || "Unable to create earnings alert.");
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/v1/earnings/alerts/${alertId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete alert");
      }
      await loadAlerts();
    } catch (err: any) {
      setError(err.message || "Unable to delete earnings alert.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", color: "#fff" }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "20px", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: "30px", fontWeight: 700, display: "flex", alignItems: "center", gap: "12px" }}>
              <Mic color="#C8F135" size={30} />
              Earnings Call Analyzer
            </h1>
            <p style={{ color: "#9CA3AF", marginTop: "10px", fontSize: "16px", maxWidth: "760px", lineHeight: 1.6 }}>
              Analyze pasted transcripts or uploaded PDF earnings-call notes, compare tone versus the previous quarter,
              and surface guidance shifts without pretending the output is direct buy or sell advice.
            </p>
          </div>
          <div style={{ ...cardStyle, padding: "14px 18px", minWidth: "240px" }}>
            <div style={{ color: "#6B7280", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
              Phase 1
            </div>
            <div style={{ color: "#fff", fontWeight: 600, marginBottom: "6px" }}>Transcript-Led Analysis</div>
            <div style={{ color: "#9CA3AF", fontSize: "13px", lineHeight: 1.5 }}>
              Manual transcript text, PDF uploads, and audio-led transcript extraction are supported here.
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: "20px", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div style={{ ...cardStyle, padding: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                <div>
                  <label style={{ color: "#6B7280", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "8px" }}>Symbol</label>
                  <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="INFY" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: "#6B7280", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "8px" }}>Quarter</label>
                  <input value={quarter} onChange={(e) => setQuarter(e.target.value)} placeholder="Q4 FY2025" style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: "18px" }}>
                <label style={{ color: "#6B7280", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "8px" }}>Current Quarter Transcript</label>
                <textarea
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                  placeholder="Paste the earnings transcript here. If the text includes a Q&A marker, the backend will try to split management remarks and analyst Q&A automatically."
                  style={textAreaStyle}
                />
                <div style={{ marginTop: "12px" }}>
                  <label style={{ ...cardStyle, display: "flex", alignItems: "center", gap: "10px", padding: "14px 16px", cursor: "pointer" }}>
                    <UploadCloud size={18} color="#C8F135" />
                    <span style={{ color: "#fff", fontSize: "14px" }}>Upload current-quarter transcript PDF</span>
                    <input type="file" accept="application/pdf" style={{ display: "none" }} onChange={(e) => setTranscriptPdf(e.target.files?.[0] || null)} />
                  </label>
                  <FileHint file={transcriptPdf} />
                </div>
                <div style={{ marginTop: "12px" }}>
                  <label style={{ ...cardStyle, display: "flex", alignItems: "center", gap: "10px", padding: "14px 16px", cursor: "pointer" }}>
                    <Mic size={18} color="#F59E0B" />
                    <span style={{ color: "#fff", fontSize: "14px" }}>Upload earnings-call audio</span>
                    <input type="file" accept="audio/*,.mp3,.wav,.m4a,.webm" style={{ display: "none" }} onChange={(e) => setTranscriptAudio(e.target.files?.[0] || null)} />
                  </label>
                  <div style={{ fontSize: "12px", color: transcriptAudio ? "#F59E0B" : "#6B7280", marginTop: "8px" }}>
                    {transcriptAudio ? `Selected audio: ${transcriptAudio.name}` : "Optional: upload audio for transcript extraction and voice-tone proxies."}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ color: "#6B7280", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "8px" }}>Previous Quarter Transcript Optional</label>
                <textarea
                  value={previousTranscriptText}
                  onChange={(e) => setPreviousTranscriptText(e.target.value)}
                  placeholder="Paste the previous quarter transcript if you want quarter-over-quarter tone comparison."
                  style={{ ...textAreaStyle, minHeight: "130px" }}
                />
                <div style={{ marginTop: "12px" }}>
                  <label style={{ ...cardStyle, display: "flex", alignItems: "center", gap: "10px", padding: "14px 16px", cursor: "pointer" }}>
                    <UploadCloud size={18} color="#60A5FA" />
                    <span style={{ color: "#fff", fontSize: "14px" }}>Upload previous-quarter transcript PDF</span>
                    <input type="file" accept="application/pdf" style={{ display: "none" }} onChange={(e) => setPreviousTranscriptPdf(e.target.files?.[0] || null)} />
                  </label>
                  <FileHint file={previousTranscriptPdf} />
                </div>
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading || !canAnalyze}
              style={{
                width: "100%",
                background: loading || !canAnalyze ? "rgba(200,241,53,0.16)" : "#C8F135",
                color: loading || !canAnalyze ? "#D1D5DB" : "#000",
                border: "none",
                borderRadius: "16px",
                padding: "15px 18px",
                fontSize: "15px",
                fontWeight: 700,
                cursor: loading || !canAnalyze ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                boxShadow: "0 0 30px rgba(200,241,53,0.18)",
              }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {loading ? "Analyzing Transcript..." : "Analyze Earnings Call"}
            </button>

            {error && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: "16px", padding: "16px 18px", display: "flex", gap: "10px" }}>
                <AlertTriangle size={16} color="#F87171" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div style={{ color: "#FCA5A5", fontSize: "14px", lineHeight: 1.6 }}>{error}</div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div style={{ ...cardStyle, padding: "22px" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Bell size={15} color="#C8F135" />
                Earnings Watch Alerts
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                <input type="datetime-local" value={alertDate} onChange={(e) => setAlertDate(e.target.value)} style={inputStyle} />
                <input value={alertNote} onChange={(e) => setAlertNote(e.target.value)} placeholder="Optional note" style={inputStyle} />
              </div>
              <button
                onClick={createAlert}
                style={{
                  width: "100%",
                  border: "1px solid rgba(200,241,53,0.18)",
                  background: "rgba(200,241,53,0.08)",
                  color: "#C8F135",
                  borderRadius: "12px",
                  padding: "10px 12px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  marginBottom: "14px",
                }}
              >
                Create 24h Earnings Alert for {symbol || "Symbol"}
              </button>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {alertsLoading ? (
                  <div style={{ color: "#6B7280", fontSize: "13px" }}>Loading alerts...</div>
                ) : alerts.length === 0 ? (
                  <div style={{ color: "#6B7280", fontSize: "13px" }}>No earnings alerts set yet.</div>
                ) : (
                  alerts.map((alert) => (
                    <div key={alert.id} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "14px", padding: "12px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", marginBottom: "6px" }}>
                        <div style={{ fontWeight: 700, fontSize: "13px" }}>{alert.symbol}</div>
                        <button onClick={() => deleteAlert(alert.id)} style={{ background: "transparent", border: "none", color: "#F87171", cursor: "pointer" }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div style={{ color: "#9CA3AF", fontSize: "12px", lineHeight: 1.5 }}>
                        Earnings date: {alert.earnings_date ? new Date(alert.earnings_date).toLocaleString("en-IN") : "n/a"}
                      </div>
                      {alert.note && <div style={{ color: "#6B7280", fontSize: "12px", marginTop: "6px" }}>{alert.note}</div>}
                      {alert.latest_analysis_id && (
                        <button
                          onClick={() => openHistoryItem(alert.latest_analysis_id!)}
                          style={{
                            marginTop: "8px",
                            border: "1px solid rgba(255,255,255,0.08)",
                            background: "rgba(255,255,255,0.04)",
                            color: "#D1D5DB",
                            borderRadius: "10px",
                            padding: "6px 10px",
                            fontSize: "11px",
                            cursor: "pointer",
                          }}
                        >
                          Open Latest Analysis
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ ...cardStyle, padding: "22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ fontSize: "14px", fontWeight: 700 }}>Recent Analyses</div>
                <button
                  onClick={loadHistory}
                  disabled={historyLoading}
                  style={{
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#D1D5DB",
                    borderRadius: "10px",
                    padding: "6px 10px",
                    fontSize: "12px",
                    cursor: historyLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {historyLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
              {historyError ? (
                <div style={{ color: "#FCA5A5", fontSize: "13px" }}>{historyError}</div>
              ) : history.length === 0 ? (
                <div style={{ color: "#6B7280", fontSize: "13px", lineHeight: 1.6 }}>
                  No saved earnings analyses yet. Run your first transcript analysis to build history here.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "340px", overflowY: "auto" }}>
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => openHistoryItem(item.id)}
                      style={{
                        textAlign: "left",
                        width: "100%",
                        background: result?.analysis_id === item.id ? "rgba(200,241,53,0.08)" : "rgba(255,255,255,0.03)",
                        border: result?.analysis_id === item.id ? "1px solid rgba(200,241,53,0.20)" : "1px solid rgba(255,255,255,0.06)",
                        borderRadius: "14px",
                        padding: "14px",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", marginBottom: "6px" }}>
                        <div style={{ fontWeight: 700, color: "#fff", fontSize: "14px" }}>{item.company} · {item.quarter}</div>
                        <span style={{ ...pillColor(item.market_tone || "MIXED"), padding: "5px 8px", borderRadius: "999px", fontSize: "10px", fontWeight: 800 }}>
                          {(item.market_tone || "UNKNOWN").replaceAll("_", " ")}
                        </span>
                      </div>
                      <div style={{ color: "#9CA3AF", fontSize: "12px", lineHeight: 1.5, marginBottom: "8px" }}>
                        {item.transcript_excerpt || "Saved earnings analysis"}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", color: "#6B7280", fontSize: "11px" }}>
                        <span>{item.source_type.replaceAll("_", " ")}</span>
                        <span>{item.created_at ? new Date(item.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : ""}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {result ? (
              <>
                <div style={{ ...cardStyle, padding: "22px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start", marginBottom: "18px" }}>
                    <div>
                      <div style={{ color: "#6B7280", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
                        Earnings Tone
                      </div>
                      <div style={{ fontSize: "24px", fontWeight: 700 }}>{result.company} · {result.quarter}</div>
                      <div style={{ color: "#9CA3AF", fontSize: "13px", marginTop: "6px" }}>{result.market_tone.summary}</div>
                      {result.created_at && (
                        <div style={{ color: "#6B7280", fontSize: "11px", marginTop: "8px" }}>
                          Saved {new Date(result.created_at).toLocaleString("en-IN")}
                        </div>
                      )}
                    </div>
                    <div style={{ ...pillColor(result.market_tone.stance), padding: "8px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: 800 }}>
                      {result.market_tone.stance.replaceAll("_", " ")}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "14px", padding: "14px 16px" }}>
                      <div style={{ color: "#6B7280", fontSize: "11px", textTransform: "uppercase", marginBottom: "6px" }}>Confidence</div>
                      <div style={{ fontSize: "26px", fontWeight: 700, color: "#C8F135" }}>{result.confidence_score}/100</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "14px", padding: "14px 16px" }}>
                      <div style={{ color: "#6B7280", fontSize: "11px", textTransform: "uppercase", marginBottom: "6px" }}>Source</div>
                      <div style={{ fontSize: "15px", fontWeight: 600, color: "#fff" }}>{result.source_type.replaceAll("_", " ")}</div>
                    </div>
                  </div>
                </div>

                <div style={{ ...cardStyle, padding: "22px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "14px" }}>Section Sentiment</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    {[
                      ["Management Discussion", result.sentiment_analysis.management_discussion],
                      ["Q&A Session", result.sentiment_analysis.qa_session],
                    ].map(([label, section]) => (
                      <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "16px", padding: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", marginBottom: "8px" }}>
                          <div style={{ fontWeight: 600 }}>{label}</div>
                          <span style={{ ...pillColor(section.overall_sentiment), fontSize: "11px", fontWeight: 800, padding: "6px 10px", borderRadius: "999px" }}>
                            {section.overall_sentiment}
                          </span>
                        </div>
                        <div style={{ color: "#9CA3AF", fontSize: "13px", lineHeight: 1.6, marginBottom: "8px" }}>{section.tone_summary}</div>
                        <div style={{ color: "#6B7280", fontSize: "12px" }}>Section confidence: {Math.round(section.confidence * 100)}%</div>
                        {section.finbert_signal?.label && (
                          <div style={{ color: "#6B7280", fontSize: "12px", marginTop: "6px" }}>
                            FinBERT support: {section.finbert_signal.label} {section.finbert_signal.confidence ? `(${Math.round(section.finbert_signal.confidence * 100)}%)` : ""}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ ...cardStyle, padding: "22px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "14px" }}>Guidance Signals</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <MetricPill label="Revenue Guidance" value={result.financial_guidance.revenue_guidance} />
                    <MetricPill label="Profit Guidance" value={result.financial_guidance.profit_guidance} />
                    <MetricPill label="Margin Outlook" value={result.financial_guidance.margin_outlook} />
                    <MetricPill label="Demand Outlook" value={result.financial_guidance.demand_outlook} />
                    <MetricPill label="Capex Signal" value={result.financial_guidance.capex_signal} />
                  </div>
                  <div style={{ marginTop: "14px", color: "#9CA3AF", fontSize: "13px", lineHeight: 1.6 }}>
                    {result.financial_guidance.guidance_summary}
                  </div>
                </div>

                {result.section_dynamics && (
                  <div style={{ ...cardStyle, padding: "22px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "14px" }}>Sentiment Shift Detection</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      {[
                        ["Management", result.section_dynamics.management_discussion],
                        ["Q&A", result.section_dynamics.qa_session],
                      ].map(([label, data]) => (
                        <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "14px", padding: "14px" }}>
                          <div style={{ fontWeight: 600, marginBottom: "10px" }}>{label}</div>
                          <MetricPill label="Early Tone" value={data?.early_sentiment || "UNKNOWN"} />
                          <div style={{ height: "8px" }} />
                          <MetricPill label="Late Tone" value={data?.late_sentiment || "UNKNOWN"} />
                          <div style={{ height: "8px" }} />
                          <MetricPill label="Shift" value={data?.shift || "STABLE"} />
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: "12px" }}>
                      <MetricPill label="Overall Call Shift" value={result.section_dynamics.overall_call_shift || "STABLE"} />
                    </div>
                  </div>
                )}

                {result.keyword_intelligence && (
                  <div style={{ ...cardStyle, padding: "22px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "14px" }}>Keyword Intelligence</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
                      <div>
                        <div style={{ color: "#34D399", fontWeight: 600, marginBottom: "10px", fontSize: "13px" }}>Bullish Phrases</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {Object.keys(result.keyword_intelligence.bullish_mentions || {}).length > 0 ? Object.entries(result.keyword_intelligence.bullish_mentions).map(([term, count]) => (
                            <div key={term} style={{ color: "#D1D5DB", fontSize: "13px" }}>{term} · {count}</div>
                          )) : <div style={{ color: "#6B7280", fontSize: "13px" }}>No strong bullish phrases detected.</div>}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: "#F87171", fontWeight: 600, marginBottom: "10px", fontSize: "13px" }}>Caution Phrases</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {Object.keys(result.keyword_intelligence.caution_mentions || {}).length > 0 ? Object.entries(result.keyword_intelligence.caution_mentions).map(([term, count]) => (
                            <div key={term} style={{ color: "#D1D5DB", fontSize: "13px" }}>{term} · {count}</div>
                          )) : <div style={{ color: "#6B7280", fontSize: "13px" }}>No major caution phrases detected.</div>}
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: "14px" }}>
                      <MetricPill label="Net Keyword Bias" value={String(result.keyword_intelligence.net_keyword_bias)} />
                    </div>
                  </div>
                )}

                <div style={{ ...cardStyle, padding: "22px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "14px" }}>Key Takeaways</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", color: "#34D399", fontWeight: 600 }}>
                        <TrendingUp size={15} />
                        Positives
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {result.key_takeaways.positives.map((item, index) => (
                          <div key={index} style={{ color: "#D1D5DB", fontSize: "13px", lineHeight: 1.6 }}>• {item}</div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", color: "#F87171", fontWeight: 600 }}>
                        <TrendingDown size={15} />
                        Concerns
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {result.key_takeaways.concerns.map((item, index) => (
                          <div key={index} style={{ color: "#D1D5DB", fontSize: "13px", lineHeight: 1.6 }}>• {item}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {result.key_takeaways.themes.length > 0 && (
                    <div style={{ marginTop: "16px" }}>
                      <div style={{ color: "#6B7280", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Themes</div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {result.key_takeaways.themes.map((theme, index) => (
                          <span key={index} style={{ padding: "6px 10px", borderRadius: "999px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#E5E7EB", fontSize: "12px" }}>
                            {theme}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ ...cardStyle, padding: "22px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>Previous Quarter Comparison</div>
                  <div style={{ color: "#D1D5DB", fontSize: "13px", lineHeight: 1.7 }}>{result.vs_previous_quarter.summary}</div>
                  {result.vs_previous_quarter.comparison_available && (
                    <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "12px" }}>
                        <div style={{ color: "#6B7280", fontSize: "11px", marginBottom: "4px" }}>Current Score</div>
                        <div style={{ fontWeight: 700 }}>{result.vs_previous_quarter.current_sentiment_score}</div>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "12px" }}>
                        <div style={{ color: "#6B7280", fontSize: "11px", marginBottom: "4px" }}>Previous Score</div>
                        <div style={{ fontWeight: 700 }}>{result.vs_previous_quarter.previous_sentiment_score}</div>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "12px" }}>
                        <div style={{ color: "#6B7280", fontSize: "11px", marginBottom: "4px" }}>Delta</div>
                        <div style={{ fontWeight: 700, color: (result.vs_previous_quarter.delta || 0) >= 0 ? "#34D399" : "#F87171" }}>
                          {result.vs_previous_quarter.delta}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {result.voice_tone_signals && (
                  <div style={{ ...cardStyle, padding: "22px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>Voice Tone Signals</div>
                    <div style={{ color: "#9CA3AF", fontSize: "13px", lineHeight: 1.6, marginBottom: "12px" }}>
                      {result.voice_tone_signals.summary}
                    </div>
                    {result.voice_tone_signals.available && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <MetricPill label="Confidence Tone" value={result.voice_tone_signals.confidence_tone || "STEADY"} />
                        <MetricPill label="Stress Signal" value={result.voice_tone_signals.stress_signal || "NORMAL"} />
                        <div style={{ color: "#6B7280", fontSize: "12px" }}>
                          Duration: {result.voice_tone_signals.duration_seconds}s · WPM: {result.voice_tone_signals.words_per_minute ?? "n/a"} · Hesitations: {result.voice_tone_signals.hesitation_count ?? 0}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ ...cardStyle, padding: "22px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>Limitations</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {result.limitations.map((item, index) => (
                      <div key={index} style={{ color: "#9CA3AF", fontSize: "13px", lineHeight: 1.6 }}>• {item}</div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ ...cardStyle, padding: "30px", textAlign: "center" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "18px", background: "rgba(200,241,53,0.08)", border: "1px solid rgba(200,241,53,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                  <FileText size={28} color="rgba(200,241,53,0.5)" />
                </div>
                <div style={{ fontSize: "17px", fontWeight: 600, marginBottom: "8px" }}>Earnings results will appear here</div>
                <div style={{ color: "#6B7280", fontSize: "14px", lineHeight: 1.7, maxWidth: "400px", margin: "0 auto" }}>
                  Paste the transcript or upload a PDF, then analyze the call to see section sentiment, guidance extraction, and quarter-over-quarter tone changes.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
