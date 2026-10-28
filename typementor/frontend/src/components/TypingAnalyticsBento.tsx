import * as React from "react";
import AnalyticsBento, { AnalyticsBentoProps } from "./AnalyticsBento";
import { useAuthStore } from "../store/AuthStore";
import { useTypingStore } from "../store/TypingStore";

interface TypingAnalyticsBentoProps {
  sessionHistory?: any[];
  completedLessonsCount?: number;
  className?: string;
}

export default function TypingAnalyticsBento({
  sessionHistory = [],
  completedLessonsCount = 0,
  className = "",
}: TypingAnalyticsBentoProps) {
  const { user } = useAuthStore();
  const { wpm: storeWpm, accuracy: storeAcc } = useTypingStore();

  // Compute live or fallback data
  const data: AnalyticsBentoProps = React.useMemo(() => {
    // 1. Velocity Card (WPM Progression)
    const hasHistory = sessionHistory.length > 0;
    const chronoSessions = [...sessionHistory].reverse();
    const currentWpm = Math.round(
      user?.lifetimeWpm ||
      (hasHistory ? sessionHistory[0].wpm : 0) ||
      storeWpm ||
      68
    );

    let wpmDelta = "+14.2%";
    if (chronoSessions.length >= 2) {
      const first = chronoSessions[0].wpm;
      const latest = chronoSessions[chronoSessions.length - 1].wpm;
      const diff = latest - first;
      const pct = first > 0 ? Math.round((diff / first) * 100) : 0;
      wpmDelta = `${pct >= 0 ? "+" : ""}${pct}%`;
    }

    const series = hasHistory
      ? chronoSessions.slice(-10).map((s, idx) => ({
          label: `Session ${idx + 1}`,
          value: Math.round(s.wpm),
        }))
      : [
          { label: "Day 1", value: 42 },
          { label: "Day 3", value: 48 },
          { label: "Day 7", value: 55 },
          { label: "Day 10", value: 59 },
          { label: "Day 14", value: 65 },
          { label: "Day 18", value: 68 },
          { label: "Today", value: 74 },
        ];

    // 2. Keystroke Cadence Waves (Correct vs Mistakes per hour/bucket)
    const desktopHours = hasHistory
      ? [
          Array.from({ length: 24 }, (_, i) => {
            const bucket = sessionHistory.filter((s) => new Date(s.createdAt).getHours() === i);
            return bucket.length > 0 ? bucket.reduce((acc, s) => acc + (s._count?.keystrokes || 120), 0) : Math.max(10, Math.sin(i * 0.3) * 60 + 50);
          }),
        ]
      : [
          [12, 10, 8, 5, 4, 15, 45, 95, 140, 180, 210, 190, 160, 205, 230, 215, 180, 150, 175, 160, 130, 95, 60, 25],
          [10, 8, 6, 4, 3, 10, 35, 80, 120, 150, 175, 160, 140, 170, 190, 180, 155, 130, 140, 120, 90, 70, 45, 20],
        ];

    const mobileMistakes = hasHistory
      ? [
          Array.from({ length: 24 }, (_, i) => {
            const bucket = sessionHistory.filter((s) => new Date(s.createdAt).getHours() === i);
            return bucket.length > 0
              ? Math.round(bucket.reduce((acc, s) => acc + (100 - s.accuracy) * 2, 0))
              : Math.max(2, Math.round(Math.cos(i * 0.4) * 12 + 10));
          }),
        ]
      : [
          [2, 1, 1, 0, 0, 3, 8, 14, 18, 22, 20, 18, 14, 19, 24, 21, 17, 12, 15, 14, 10, 7, 4, 2],
          [3, 2, 1, 1, 0, 2, 7, 12, 15, 19, 18, 15, 12, 16, 20, 18, 14, 11, 13, 11, 8, 6, 3, 2],
        ];

    const totalChars = hasHistory
      ? sessionHistory.reduce((acc, s) => acc + (s._count?.keystrokes || Math.round(s.wpm * 5)), 0)
      : 14820;

    // 3. Domain Categories (Treemap)
    const academyLessons = completedLessonsCount || 18;
    const categories = {
      title: "Typing Practice Balance",
      groups: [
        { id: "academy", name: "Typing Academy", color: "#6366f1", ink: "light" as const },
        { id: "arena", name: "Arena 1v1", color: "#22d3ee", ink: "dark" as const },
        { id: "conquest", name: "Word Conquest", color: "#f59e0b", ink: "dark" as const },
        { id: "code", name: "Code Syntax", color: "#10b981", ink: "dark" as const },
        { id: "home", name: "Home Row Drills", color: "#ec4899", ink: "light" as const },
      ],
      periods: [
        { label: "Last 7 Days", total: 420, delta: "+18%", compare: "vs previous week" },
        { label: "Last 30 Days", total: 1680, delta: "+32%", compare: "vs previous month" },
        { label: "All Time", total: 5420, delta: "+54%", compare: "lifetime progression" },
      ],
      items: [
        { name: "Academy Lessons", group: "academy", values: [academyLessons * 12, academyLessons * 45, academyLessons * 110] },
        { name: "Arena Duels", group: "arena", values: [48, 190, 580] },
        { name: "Word Conquest", group: "conquest", values: [65, 240, 720] },
        { name: "Python / JS Code", group: "code", values: [82, 310, 940] },
        { name: "Home Row Muscle Memory", group: "home", values: [55, 210, 680] },
      ],
      table: {
        columns: ["Practice Domain", "7 Days", "30 Days", "All Time"],
        rows: [
          { label: "Typing Academy (Lessons)", values: [`${academyLessons * 12} min`, `${academyLessons * 45} min`, `${academyLessons * 110} min`] },
          { label: "Realtime Arena Duels", values: ["48 matches", "190 matches", "580 matches"] },
          { label: "Word Conquest Strategy", values: ["65 rounds", "240 rounds", "720 rounds"] },
          { label: "Developer Code Syntax", values: ["82 drills", "310 drills", "940 drills"] },
        ],
      },
    };

    // 4. Ergonomic Finger Balance Radar
    const seasonality = {
      title: "10-Finger Load & Ergonomics",
      axis: ["L-Pinky", "L-Ring", "L-Mid", "L-Index", "L-Thumb", "R-Thumb", "R-Index", "R-Mid", "R-Ring", "R-Pinky"],
      years: [
        {
          label: "Active Load",
          values: [48, 62, 85, 94, 75, 78, 98, 88, 68, 52],
          stats: [
            { label: "Left Hand Share", value: 48, delta: "+1.2%", note: "Target 50%" },
            { label: "Right Hand Share", value: 52, delta: "-1.2%", note: "Target 50%" },
          ],
          rows: [
            { label: "Dominant Finger", value: "Right Index (J, U, M, N)" },
            { label: "Lightest Finger", value: "Left Pinky (A, Q, Z, Shift)" },
            { label: "Ergonomic Symmetry", value: "96.4% · Exceptional" },
          ],
        },
        {
          label: "Consistency",
          values: [55, 68, 82, 90, 70, 75, 92, 85, 72, 58],
          stats: [
            { label: "Accuracy Index", value: Math.round(user?.lifetimeAccuracy || storeAcc || 97), delta: "+0.8%", note: "Consistency" },
            { label: "Error Burden", value: 3, delta: "-1.5%", note: "Low fatigue" },
          ],
          rows: [
            { label: "Fatigue Risk Rating", value: "Low (Even distribution)" },
            { label: "Home-Row Return Rate", value: "98.2%" },
            { label: "Recommended Drill", value: "Left Pinky Anchor Drills" },
          ],
        },
      ],
    };

    return {
      currency: "",
      suffix: " WPM",
      revenue: {
        label: "Velocity & Peak Speed",
        value: currentWpm,
        delta: wpmDelta,
        note: "Continuous keystroke speed tracking",
        caption: "Raw WPM Trend",
        series,
      },
      sessions: {
        label: "Keystroke Volume & Rhythm",
        value: totalChars,
        delta: "+8.4%",
        note: "Cadence of typed characters vs mistake bursts",
        desktop: desktopHours,
        mobile: mobileMistakes,
        labels: { desktop: "Correct Keystrokes", mobile: "Mistakes", prior: "Prior Day", current: "Today" },
      },
      categories,
      seasonality,
      colors: {
        revenue: ["#22D3EE", "#10B981"],
        desktop: ["#22D3EE", "#6366F1"],
        mobile: ["#F59E0B", "#EF4444"],
        radar: "#6366F1",
      },
      credit: false,
    };
  }, [sessionHistory, completedLessonsCount, user, storeWpm, storeAcc]);

  return <AnalyticsBento {...data} className={className} />;
}
