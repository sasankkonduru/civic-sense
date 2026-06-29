import React, { useState, useEffect, useRef } from "react";
import { 
  AlertTriangle, CheckCircle2, Clock, ShieldAlert, Brain, MapPin, 
  RefreshCw, TrendingUp, Filter, Eye, User, FileText, ChevronRight, Check, AlertCircle, Sparkles,
  Upload, Timer, ClipboardCheck, Building, Calendar, Activity, Trash2, Droplets, Lightbulb, Hammer, ShieldCheck, Image as ImageIcon, Info
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db, updateFirestoreIssue, uploadBase64ToStorage, seedDemoIssuesIfEmpty, isStorageConfigured, compressBase64Image } from "../firebase";
import { Issue, AIInsight, DashboardStats, MunicipalInsights, MunicipalDailyBrief } from "../types";
import { IssueMap } from "./IssueMap";
import { AINetworkBackground } from "./ui/AINetworkBackground";
const STAGES = [
  { name: "Reported", value: "Reported" },
  { name: "Assigned", value: "Assigned" },
  { name: "Under Review", value: "Under Review" },
  { name: "In Progress", value: "In Progress" },
  { name: "Resolved", value: "Resolved" },
  { name: "Verified by Municipal Official", value: "AI Verification" },
  { name: "Closed", value: "Verified & Closed" }
];

const ImageWithFallback = ({ src, alt, label, onError }: { src: string; alt: string; label: string; onError?: () => void }) => {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 border border-slate-800 text-slate-555 p-4 rounded-xl text-center space-y-2 font-sans">
        <ImageIcon className="w-7 h-7 text-slate-600 shrink-0" />
        <span className="text-[9px] font-mono font-bold">{label} Image Unavailable</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-contain bg-slate-950"
      referrerPolicy="no-referrer"
      onError={() => {
        setError(true);
        if (onError) onError();
      }}
    />
  );
};


const getStatusStep = (status: string | undefined): number => {
  if (!status) return 0;
  const s = status.toLowerCase();
  if (s === "submitted" || s === "reported") return 0;
  if (s === "assigned") return 1;
  if (s === "under review") return 2;
  if (s === "in progress" || s === "needs rework") return 3;
  if (s === "resolved" || s === "awaiting evidence") return 4;
  if (s === "ai verification" || s === "resolved (pending verification)" || s === "resolved (pending ai verification)") return 5;
  if (s === "verified & closed" || s === "closed") return 6;
  return 0;
};

// Design System Components
import Button from "./ui/Button";
import Badge, { getSeverityVariant, getStatusVariant } from "./ui/Badge";
import { Card } from "./ui/Card";
import { LoadingSpinner, SkeletonList, AILoader, SkeletonStats, SkeletonInsights } from "./ui/Loading";
import EmptyState from "./ui/EmptyState";

// Viewport-aware Animated Number Counter
function AnimatedNumber({ value, postfix = "" }: { value: number; postfix?: string }) {
  const [displayValue, setDisplayValue] = React.useState(0);
  const [hasEntered, setHasEntered] = React.useState(false);
  const spanRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setHasEntered(true);
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    
    if (spanRef.current) {
      observer.observe(spanRef.current);
    }
    
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!hasEntered) return;
    let start = 0;
    const end = value;
    if (start === end) {
      setDisplayValue(end);
      return;
    }

    const duration = 1500; // 1.5 seconds
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(easeProgress * end));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(end);
      }
    };

    const animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [value, hasEntered]);

  return (
    <span ref={spanRef} className="tabular-nums">
      {displayValue}
      {postfix}
    </span>
  );
}

interface DashboardPageProps {
  onNavigate: (page: string) => void;
  currentUser: { email: string; name: string; role: "citizen" | "official"; picture?: string } | null;
  onLogout: () => void;
}

// Category Icons Helper
function getCategoryIcon(category: string) {
  switch (category) {
    case "Pothole":
      return <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />;
    case "Garbage":
      return <Trash2 className="w-4 h-4 text-amber-400 shrink-0" />;
    case "Water Leakage":
      return <Droplets className="w-4 h-4 text-sky-400 shrink-0" />;
    case "Broken Streetlight":
      return <Lightbulb className="w-4 h-4 text-indigo-405 shrink-0" />;
    case "Road Damage":
      return <Hammer className="w-4 h-4 text-orange-400 shrink-0" />;
    default:
      return <FileText className="w-4 h-4 text-slate-400 shrink-0" />;
  }
}

// Get City Name Label from address
function getCityLabel(location: string): string {
  if (!location) return "National Grid";
  const parts = location.split(",").map(p => p.trim());
  if (parts.length >= 2) {
    return parts[parts.length - 2] || "National Grid";
  }
  return parts[0] || "National Grid";
}

export default function DashboardPage({ onNavigate, currentUser, onLogout }: DashboardPageProps) {
  const shouldReduceMotion = useReducedMotion();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [municipalInsights, setMunicipalInsights] = useState<MunicipalInsights | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const isSeedingRef = useRef(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingMunicipalInsights, setLoadingMunicipalInsights] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [hasFetchedInsights, setHasFetchedInsights] = useState(false);
  const [isCalculatingPriority, setIsCalculatingPriority] = useState(false);
  const [dailyBrief, setDailyBrief] = useState<MunicipalDailyBrief | null>(null);
  const [loadingDailyBrief, setLoadingDailyBrief] = useState(false);

  const [resolutionFile, setResolutionFile] = useState<File | null>(null);
  const [resolutionBase64, setResolutionBase64] = useState<string>("");
  const [verifyingResolution, setVerifyingResolution] = useState(false);
  const [resolutionError, setResolutionError] = useState("");
  const resolutionFileInputRef = useRef<HTMLInputElement>(null);
  const [localImageFallbackUsed, setLocalImageFallbackUsed] = useState(() => !isStorageConfigured());
  const [activeTab, setActiveTab] = useState<"overview" | "reports" | "nearby">(() => {
    const saved = localStorage.getItem("civic_sense_active_tab");
    if (saved && ["overview", "reports", "nearby"].includes(saved)) {
      localStorage.removeItem("civic_sense_active_tab");
      return saved as any;
    }
    return "overview";
  });
  const [originalImageError, setOriginalImageError] = useState(false);
  const [repairImageError, setRepairImageError] = useState(false);
  const [personalFilterStatus, setPersonalFilterStatus] = useState<string>("All");
  const [showMapResolved, setShowMapResolved] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setOriginalImageError(false);
    setRepairImageError(false);
  }, [selectedIssue?.id]);

  // Clear verification state on selection change
  useEffect(() => {
    setResolutionFile(null);
    setResolutionBase64("");
    setResolutionError("");
  }, [selectedIssue?.id]);

  const handleResolutionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        setResolutionError("Only image files (.jpg, .png, .webp) are supported.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setResolutionError("Image exceeds 5MB size limit.");
        return;
      }
      setResolutionError("");
      setResolutionFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setResolutionBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVerifyResolution = async () => {
    // Deprecated in favor of the manual dispatcher verification panel decision workflow
  };

  // Run AI Priority Agent for selected issue based on category, severity, and calculated age
  const runPriorityAgent = async (issue: Issue) => {
    try {
      setIsCalculatingPriority(true);
      const res = await fetch("/api/priority-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: issue.category,
          severity: issue.severity,
          createdAt: issue.createdAt,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const { priorityScore, priorityLevel, reasoning } = data;
        
        await updateFirestoreIssue(issue.id, {
          priorityScore,
          priorityLevel,
          priorityReasoning: reasoning,
        });

        setSelectedIssue((prev) => 
          prev && prev.id === issue.id 
            ? { ...prev, priorityScore, priorityLevel, priorityReasoning: reasoning } 
            : prev
        );
      } else {
        const errData = await res.json();
        console.error("AI Priority Agent calculation failed:", errData);
      }
    } catch (err) {
      console.error("Failed to run AI Priority Agent:", err);
    } finally {
      setIsCalculatingPriority(false);
    }
  };

  const getCitizenAIInsight = () => {
    if (personalIssues.length === 0) {
      return "More operational data is required before meaningful insights can be generated.";
    }

    // Check if user has an issue that is assigned
    const assignedIssue = personalIssues.find(i => i.status === "Assigned" && i.department);
    if (assignedIssue) {
      if (assignedIssue.category.toLowerCase().includes("drain") || assignedIssue.title.toLowerCase().includes("drain")) {
        return "Your drainage issue has been assigned to the Water Department.";
      }
      return `Your reported ${assignedIssue.category.toLowerCase()} ("${assignedIssue.title}") has been assigned to the ${assignedIssue.department} division.`;
    }

    // Check if user has an issue awaiting verification
    const awaitingVerIssue = personalIssues.find(i => i.status === "Resolved" && !i.resolutionVerification);
    if (awaitingVerIssue) {
      return "Repair work is scheduled after the current verification queue.";
    }

    // Check if user has a pothole report
    const potholeIssue = personalIssues.find(i => i.category.toLowerCase().includes("pothole") || i.category.toLowerCase().includes("road"));
    if (potholeIssue) {
      return "Road repairs in your area are typically completed within 2–3 days. We are tracking your reported pavement defect.";
    }

    // Check water leak increase
    const waterLeaksInLocality = issues.filter(i => 
      i.category.toLowerCase().includes("water") && 
      (Date.now() - new Date(i.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000
    ).length;
    if (waterLeaksInLocality > 2) {
      return `Water leakage reports in your locality have increased this week, with ${waterLeaksInLocality} active cases under review.`;
    }

    // Default return
    const newestIssue = personalIssues[0];
    return `Your reported issue ("${newestIssue.title}") is currently being monitored in the triage queue. Dispatch time is estimated at 24 hours.`;
  };

  // Fetch AI-powered insights from the Express API
  const fetchAIInsights = async (currentIssuesList?: Issue[]) => {
    try {
      setLoadingInsights(true);
      const listToAnalyze = currentIssuesList || issues;
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issues: listToAnalyze })
      });
      if (res.ok) {
        const data = await res.json();
        setInsights(data);
      } else {
        throw new Error("Insights endpoint non-ok response");
      }
    } catch (err) {
      console.error("Error fetching insights, generating local fallback insights:", err);
      // Graceful fallback insights card generator if server fails
      setInsights([
        {
          id: "fallback-ins-1",
          title: "Corridor Drainage Clusters",
          summary: "Localized cluster analysis detected high leakage logs. Subgrade erosion rates projected to accelerate near heavy transit roads.",
          severity: "Warning",
          suggestedAction: "Schedule preventative inspection of primary stormwater conduits.",
          affectedCategory: "Water Leakage",
          timestamp: new Date().toISOString(),
          confidenceScore: 89
        }
      ]);
    } finally {
      setLoadingInsights(false);
    }
  };

  // Fetch structured 5-dimension Municipal Insights via Gemini
  const fetchMunicipalInsights = async (currentIssuesList?: Issue[]) => {
    const listToAnalyze = currentIssuesList || issues;
    try {
      setLoadingMunicipalInsights(true);
      const res = await fetch("/api/municipal-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issues: listToAnalyze })
      });
      if (res.ok) {
        const data = await res.json();
        setMunicipalInsights(data);
      } else {
        throw new Error("Municipal insights endpoint failed");
      }
    } catch (err) {
      console.error("Error fetching municipal insights, utilizing local fallback:", err);
      setMunicipalInsights({
        mostCommonCategory: {
          category: "Pothole",
          count: listToAnalyze.filter(i => i.category === "Pothole").length || 3,
          percentage: 45,
          description: "Roadway subgrade cracks represent the majority of active tickets cataloged."
        },
        highestRiskZones: [
          {
            zone: listToAnalyze[0]?.location || "Jubilee Hills, Hyderabad",
            riskLevel: "High",
            activeIssuesCount: 3,
            description: "High traffic corridor with multiple unrepaired defects."
          }
        ],
        resolutionTrends: {
          trend: "Improving",
          percentageChange: "+15% velocity",
          details: "Average ticket closure rates reduced from 42h to 36h."
        },
        emergingIssues: [
          {
            title: "Structural Asphalt Failure",
            description: "Repeated pothole reports suggest subgrade wearing course defects.",
            severity: "High"
          }
        ],
        recommendedActions: [
          {
            action: "Pre-deploy hot-mix trucks to high priority zones",
            priority: "High",
            timeframe: "24h",
            impact: "Reduces road hazard claims by 25%"
          }
        ]
      });
    } finally {
      setLoadingMunicipalInsights(false);
    }
  };

  // Local fallback brief compiler if API fails
  const generateLocalDailyBrief = (issuesList: Issue[]): MunicipalDailyBrief => {
    const reportsToday = issuesList.filter(i => {
      const created = new Date(i.createdAt).getTime();
      return (Date.now() - created) < 24 * 60 * 60 * 1000;
    }).length;

    const criticalCount = issuesList.filter(i => i.severity === "Critical" && i.status !== "Resolved" && i.status !== "Verified & Closed").length;
    const highCount = issuesList.filter(i => i.severity === "High" && i.status !== "Resolved" && i.status !== "Verified & Closed").length;
    const riskLevel = criticalCount > 0 ? "Critical" : highCount > 0 ? "High" : "Medium";
    
    const unassignedCount = issuesList.filter(i => !i.department).length;
    const potholesCount = issuesList.filter(i => i.category === "Pothole").length;
    const leakageCount = issuesList.filter(i => i.category === "Water Leakage").length;
    
    return {
      totalReportsToday: reportsToday || 3,
      riskForecast: {
        level: riskLevel,
        description: `Risk index is evaluated as ${riskLevel.toLowerCase()} due to active infrastructure backlogs. Action recommended.`,
        vulnerableSectors: ["Road Safety", "Water Grids"]
      },
      highestPriorityArea: {
        locationName: issuesList[0]?.location || "Connaught Place, New Delhi",
        activeIssuesCount: criticalCount || 2,
        primaryRisk: "Subgrade failure and traffic bottlenecks on active arterial roads."
      },
      emergingTrends: [
        { trend: "Asphalt Structural Fatigue", impactLevel: "High", description: `${potholesCount} pothole logs logged citywide.` },
        { trend: "Pipeline Pressure Surges", impactLevel: "Medium", description: `${leakageCount} pipeline leak reports active.` }
      ],
      urgentDepartments: [
        { department: "Roads & Asphalt Authority", urgency: "High", reason: "Asphalt repairs backlog requires hot-mix deployment." },
        { department: "Water & Sanitation Division", urgency: "Medium", reason: `${unassignedCount} water logs pending assignment.` }
      ],
      recommendedActions: [
        {
          action: "Deploy Emergency Asphalt Patching",
          timeline: "Immediate (0-2h)",
          rationale: "Secure open craters in high-traffic sectors.",
          impact: "Reduces local collision index by ~25%"
        },
        {
          action: "Isolate Active Valve Leakages",
          timeline: "Short-term (12h)",
          rationale: "Mitigate subgrade erosion risk from leaking mains.",
          impact: "Conserves fresh water reservoirs"
        }
      ],
      predictedIssues7Days: [
        { category: "Pothole", expectedCount: potholesCount + 3, probability: 85, factors: "Logistic freight transit loads." },
        { category: "Water Leakage", expectedCount: leakageCount + 1, probability: 70, factors: "Underground main line valve shifts." }
      ]
    };
  };

  // Fetch AI Municipal Daily Brief with cache and local fallback
  const fetchDailyBrief = async (currentIssuesList?: Issue[], forceRefresh = false) => {
    try {
      const listToAnalyze = currentIssuesList || issues;
      if (listToAnalyze.length === 0) return;

      const fingerprint = listToAnalyze
        .map((i) => `${i.id}-${i.status}-${i.severity}-${i.category}`)
        .sort()
        .join("|");

      const cachedData = localStorage.getItem("civicsense_daily_brief_data");
      const cachedFingerprint = localStorage.getItem("civicsense_daily_brief_fingerprint");
      const cachedTimestamp = localStorage.getItem("civicsense_daily_brief_timestamp");

      const isCacheValid = 
        cachedFingerprint === fingerprint && 
        cachedTimestamp && 
        (Date.now() - parseInt(cachedTimestamp) < 30 * 60 * 1050);

      if (isCacheValid && !forceRefresh && cachedData) {
        try {
          setDailyBrief(JSON.parse(cachedData));
          return;
        } catch (cacheError) {
          console.error("Failed to parse cached daily brief, fetching fresh:", cacheError);
        }
      }

      setLoadingDailyBrief(true);
      const res = await fetch("/api/daily-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issues: listToAnalyze })
      });

      if (res.ok) {
        const data = await res.json();
        setDailyBrief(data);
        localStorage.setItem("civicsense_daily_brief_data", JSON.stringify(data));
        localStorage.setItem("civicsense_daily_brief_fingerprint", fingerprint);
        localStorage.setItem("civicsense_daily_brief_timestamp", Date.now().toString());
      } else {
        throw new Error("API daily brief request returned non-ok status.");
      }
    } catch (err) {
      console.error("Error fetching AI daily brief, generating local fallback:", err);
      const fallback = generateLocalDailyBrief(currentIssuesList || issues);
      setDailyBrief(fallback);
    } finally {
      setLoadingDailyBrief(false);
    }
  };

  const issuesFingerprint = issues
    .map((i) => `${i.id}-${i.status}-${i.severity}-${i.category}`)
    .sort()
    .join("|");

  useEffect(() => {
    if (issues.length > 0) {
      fetchDailyBrief(issues);
    }
  }, [issuesFingerprint]);

  // Real-time listener for issues from Firestore
  useEffect(() => {
    const issuesCollection = collection(db, "issues");
    const q = query(issuesCollection, orderBy("createdAt", "desc"));
    
    setLoadingIssues(true);
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      if (querySnapshot.empty) {
        setIssues([]);
        setLoadingIssues(false);
        return;
      }

      const list: Issue[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          title: data.title || "Untitled Issue",
          description: data.description || "",
          location: data.location || "Unknown Location",
          category: data.category || "Other",
          severity: data.severity || "Medium",
          status: data.status || "Submitted",
          reporterName: data.reporterName || "Anonymous Citizen",
          reporterEmail: data.reporterEmail || "anonymous@example.com",
          imageUrl: data.imageUrl || "https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&q=80&w=600",
          createdAt: data.createdAt || new Date().toISOString(),
          priority: data.priority || 3,
          latitude: data.latitude,
          longitude: data.longitude,
          priorityScore: data.priorityScore,
          priorityLevel: data.priorityLevel,
          priorityReasoning: data.priorityReasoning,
          aiAnalysis: data.aiAnalysis,
          resolutionImage: data.resolutionImage,
          resolutionVerification: data.resolutionVerification
        } as Issue);
      });
      setIssues(list);
      setLoadingIssues(false);

      // Compute statistics locally
      const totalCount = list.length;
      const resolvedCount = list.filter((i) => i.status === "Verified & Closed" || i.status === "Closed").length;
      const openCount = list.filter((i) => i.status !== "Verified & Closed" && i.status !== "Closed" && i.status !== "Resolved").length;
      const criticalCount = list.filter((i) => i.severity === "Critical" && i.status !== "Verified & Closed" && i.status !== "Closed" && i.status !== "Resolved").length;
      const pendingVerificationCount = list.filter((i) => i.status === "Resolved").length;

      const resolvedIssuesList = list.filter((i) => i.status === "Verified & Closed" || i.status === "Closed");
      let totalResolutionTimeMs = 0;
      let resolvedWithTimeCount = 0;
      resolvedIssuesList.forEach((i) => {
        const start = new Date(i.createdAt).getTime();
        let end = i.resolutionVerification?.verifiedAt ? new Date(i.resolutionVerification.verifiedAt).getTime() : null;
        if (!end && (i.status === "Resolved" || i.status === "Verified & Closed" || i.status === "Verified")) {
          const seedDiffDays = 1.5 + (parseInt(i.id.replace(/\D/g, "") || "0") % 4);
          end = start + seedDiffDays * 24 * 60 * 60 * 1000;
        }
        if (start && end && end > start) {
          totalResolutionTimeMs += (end - start);
          resolvedWithTimeCount++;
        }
      });
      const avgResolutionTime = resolvedWithTimeCount > 0 
        ? Math.round((totalResolutionTimeMs / resolvedWithTimeCount) / (1000 * 60 * 60)) 
        : 36;

      const catMap: { [key: string]: number } = {};
      const sevMap: { [key: string]: number } = {};

      list.forEach((iss) => {
        catMap[iss.category] = (catMap[iss.category] || 0) + 1;
        sevMap[iss.severity] = (sevMap[iss.severity] || 0) + 1;
      });

      const categoryBreakdown = Object.keys(catMap).map((cat) => ({
        category: cat,
        count: catMap[cat],
      }));

      const severityBreakdown = Object.keys(sevMap).map((sev) => ({
        severity: sev,
        count: sevMap[sev],
      }));

      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const trendMap: Record<string, { reported: number; resolved: number }> = {
        Mon: { reported: 0, resolved: 0 },
        Tue: { reported: 0, resolved: 0 },
        Wed: { reported: 0, resolved: 0 },
        Thu: { reported: 0, resolved: 0 },
        Fri: { reported: 0, resolved: 0 },
        Sat: { reported: 0, resolved: 0 },
        Sun: { reported: 0, resolved: 0 },
      };

      list.forEach((iss) => {
        try {
          const date = new Date(iss.createdAt);
          if (!isNaN(date.getTime())) {
            const dayName = days[date.getDay()];
            if (trendMap[dayName]) {
              trendMap[dayName].reported += 1;
              if (iss.status === "Resolved" || iss.status === "Verified & Closed" || iss.status === "Verified") {
                trendMap[dayName].resolved += 1;
              }
            }
          }
        } catch (e) {
          console.error("Error parsing issue date:", e);
        }
      });

      const weeklyTrend = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
        date: day,
        reported: trendMap[day].reported,
        resolved: trendMap[day].resolved,
      }));

      setStats({
        totalCount,
        resolvedCount,
        inProgressCount: list.filter((i) => i.status === "In Progress" || i.status === "Needs Rework" || i.status === "Awaiting Evidence").length,
        pendingCount: list.filter((i) => i.status === "Submitted" || i.status === "Verified" || i.status === "Reported" || i.status === "Under Review" || i.status === "Assigned").length,
        openCount,
        criticalCount,
        avgResolutionTime,
        pendingVerificationCount,
        categoryBreakdown,
        severityBreakdown,
        weeklyTrend,
      });

      if (!hasFetchedInsights && list.length > 0) {
        setHasFetchedInsights(true);
        fetchAIInsights(list);
        fetchMunicipalInsights(list);
      }
    }, (error) => {
      console.error("Firestore real-time sync failed:", error);
      setLoadingIssues(false);
    });

    return () => unsubscribe();
  }, [hasFetchedInsights]);

  // Listen for developer tools custom events
  useEffect(() => {
    const handleDevAction = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { type } = customEvent.detail || {};
      if (type === "refresh-dashboard") {
        fetchDailyBrief(issues, true);
        fetchMunicipalInsights(issues);
        fetchAIInsights(issues);
      } else if (type === "regenerate-brief") {
        fetchDailyBrief(issues, true);
      } else if (type === "recalculate-analytics") {
        fetchMunicipalInsights(issues);
      } else if (type === "rebuild-insights") {
        fetchAIInsights(issues);
      }
    };

    window.addEventListener("dev-action", handleDevAction);
    return () => window.removeEventListener("dev-action", handleDevAction);
  }, [issues]);

  // Handle status updates (City Official action)
  const handleUpdateStatus = async (issueId: string, newStatus: string) => {
    try {
      setUpdatingStatus(issueId);
      await updateFirestoreIssue(issueId, { status: newStatus as any });
      if (selectedIssue && selectedIssue.id === issueId) {
        setSelectedIssue(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const categories = ["All", "Pothole", "Garbage", "Water Leakage", "Broken Streetlight", "Road Damage"];
  const statuses = ["All", "Reported", "Under Review", "Assigned", "In Progress", "Resolved", "Verified & Closed"];

  const filteredIssues = issues.filter(iss => {
    const matchCategory = filterCategory === "All" || iss.category === filterCategory;
    const matchStatus = filterStatus === "All" || iss.status === filterStatus;
    return matchCategory && matchStatus;
  });

  const listContainerVariants = shouldReduceMotion ? {} : {
    visible: { transition: { staggerChildren: 0.04 } }
  };
  
  const listItemVariants = shouldReduceMotion ? {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  } : {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0 },
    hover: { x: 3 }
  };

  // Render function for weekly activity trend SVG line chart
  const renderWeeklyTrendChart = () => {
    if (!stats || !stats.weeklyTrend || stats.weeklyTrend.length === 0) {
      return <div className="text-xs text-slate-500 font-semibold p-4">Trend calculations pending...</div>;
    }
    
    const trend = stats.weeklyTrend;
    const maxVal = Math.max(...trend.map(d => Math.max(d.reported, d.resolved)), 4);
    
    const width = 500;
    const height = 200;
    const padding = 30;
    
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const getX = (index: number) => padding + (index * chartWidth) / (trend.length - 1);
    const getY = (value: number) => padding + chartHeight - (value * chartHeight) / maxVal;
    
    let reportedPath = "";
    let resolvedPath = "";
    
    trend.forEach((d, i) => {
      const x = getX(i);
      const yRep = getY(d.reported);
      const yRes = getY(d.resolved);
      
      if (i === 0) {
        reportedPath = `M ${x} ${yRep}`;
        resolvedPath = `M ${x} ${yRes}`;
      } else {
        reportedPath += ` L ${x} ${yRep}`;
        resolvedPath += ` L ${x} ${yRes}`;
      }
    });
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Weekly Incident Velocity</h4>
          <div className="flex items-center space-x-3 text-[10px] font-mono font-bold">
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 block"></span>
              <span className="text-indigo-400">Reported</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
              <span className="text-emerald-450">Resolved</span>
            </div>
          </div>
        </div>
        
        <div className="relative bg-slate-950/50 p-4 rounded-2xl border border-slate-900/60 shadow-inner">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
            {/* Y Axis Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
              const val = Math.round(maxVal * p);
              const y = getY(val);
              return (
                <g key={idx} className="opacity-20">
                  <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#475569" strokeDasharray="3,3" />
                  <text x={padding - 5} y={y + 3} fill="#94a3b8" fontSize="8" textAnchor="end" className="font-mono">{val}</text>
                </g>
              );
            })}
            
            {/* X Axis Labels */}
            {trend.map((d, i) => {
              const x = getX(i);
              return (
                <text key={i} x={x} y={height - 10} fill="#94a3b8" fontSize="8" textAnchor="middle" className="font-mono opacity-60">
                  {d.date}
                </text>
              );
            })}
            
            {/* Area Fill for reported */}
            <path d={`${reportedPath} L ${getX(trend.length - 1)} ${getY(0)} L ${getX(0)} ${getY(0)} Z`} fill="url(#reported-grad)" className="opacity-10" />
            
            <defs>
              <linearGradient id="reported-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Reported Path */}
            <path d={reportedPath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Resolved Path */}
            <path d={resolvedPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4,4" />
            
            {/* Dots on points */}
            {trend.map((d, i) => {
              const x = getX(i);
              const yRep = getY(d.reported);
              const yRes = getY(d.resolved);
              return (
                <g key={i}>
                  <circle cx={x} cy={yRep} r="3.5" fill="#6366f1" stroke="#0f172a" strokeWidth="1.5" />
                  <circle cx={x} cy={yRes} r="3.5" fill="#10b981" stroke="#0f172a" strokeWidth="1.5" />
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  // Render function for category distribution progress bars
  const renderCategoryChart = () => {
    if (!stats || !stats.categoryBreakdown || stats.categoryBreakdown.length === 0) {
      return <div className="text-xs text-slate-500 font-semibold p-4">Category allocation pending...</div>;
    }
    const categoriesList = stats.categoryBreakdown;
    const maxVal = Math.max(...categoriesList.map(c => c.count), 1);
    
    return (
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Category Allocation</h4>
        <div className="space-y-4 bg-slate-955/50 p-5 rounded-2xl border border-slate-900/60">
          {categoriesList.map((c) => {
            const pct = (c.count / maxVal) * 100;
            return (
              <div key={c.category} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">{c.category}</span>
                  <span className="text-indigo-405 font-mono font-bold">{c.count} {c.count === 1 ? 'case' : 'cases'}</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-850/50">
                  <motion.div 
                    className="bg-indigo-500 h-full rounded-full" 
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render function for severity distribution progress lines
  const renderSeverityChart = () => {
    if (!stats || !stats.severityBreakdown || stats.severityBreakdown.length === 0) {
      return <div className="text-xs text-slate-500 font-semibold p-4">Severity breakdown pending...</div>;
    }
    const severities = stats.severityBreakdown;
    const total = stats.totalCount || 1;
    
    return (
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Severity Proportions</h4>
        <div className="space-y-4 bg-slate-955/50 p-5 rounded-2xl border border-slate-900/60">
          {["Critical", "High", "Medium", "Low"].map((sev) => {
            const found = severities.find(s => s.severity === sev);
            const count = found ? found.count : 0;
            const pct = Math.round((count / total) * 100);
            
            let barColor = "bg-emerald-500";
            if (sev === "Critical") {
              barColor = "bg-rose-500";
            } else if (sev === "High") {
              barColor = "bg-orange-500";
            } else if (sev === "Medium") {
              barColor = "bg-amber-500";
            }
            
            return (
              <div key={sev} className="flex items-center justify-between gap-4 text-xs">
                <div className="w-20 font-bold text-slate-350">{sev}</div>
                <div className="flex-1 bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-850/50">
                  <motion.div 
                    className={`h-full rounded-full ${barColor}`} 
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
                <div className="w-16 text-right font-mono font-bold text-slate-400">
                  {count} ({pct}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const personalIssues = issues.filter(
    (i) => i.reporterEmail === currentUser?.email
  );

  const filteredPersonalIssues = personalIssues.filter((i) => {
    if (personalFilterStatus === "All") {
      return i.status !== "Verified & Closed" && i.status !== "Closed";
    }
    if (personalFilterStatus === "Submitted") {
      return i.status === "Submitted" || i.status === "Reported";
    }
    if (personalFilterStatus === "Verified & Closed") {
      return i.status === "Verified & Closed" || i.status === "Closed";
    }
    return i.status === personalFilterStatus;
  });

  return (
    <div id="dashboard-page" className="min-h-screen bg-slate-955 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-white pb-12 relative overflow-hidden">
      
      {/* Smart City Network Animation Background */}
      <AINetworkBackground />

      {/* Visual background glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px] -z-10 pointer-events-none" />

      {/* Modern Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-955/70 backdrop-blur-xl border-b border-slate-900/85 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => onNavigate("landing")}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-indigo-600/35 group-hover:scale-105 transition-all">
              C
            </div>
            <span className="text-xl font-black tracking-tight text-white">
              Civic<span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Sense</span>
            </span>
          </div>

          <div className="flex items-center space-x-4">

            {currentUser ? (
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-slate-200 leading-none">{currentUser.name}</p>
                  <p className="text-[10px] font-extrabold text-brand-primary uppercase tracking-wider mt-1">
                    {currentUser.role === "official" ? "City Official" : "Verified Citizen"}
                  </p>
                </div>
                <img
                  src={currentUser.picture}
                  alt={currentUser.name}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full border border-slate-800 shadow-sm"
                />
                <Button
                  id="sign-out-btn"
                  onClick={onLogout}
                  variant="ghost"
                  size="sm"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => onNavigate("login")}
                variant="primary"
                size="sm"
              >
                Sign In to Platform
              </Button>
            )}
          </div>
        </div>
      </header>

      {localImageFallbackUsed && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-2xl flex items-start space-x-3 text-xs animate-fade-in">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
            <div>
              <p className="font-extrabold text-white">Local Image Handling Active (Dashboard)</p>
              <p className="text-slate-400 mt-0.5 leading-relaxed font-semibold">
                Firebase Storage is not configured or unavailable. Resolution proof uploads will be optimized and saved locally using base64.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Tab Navigation */}
      <div className="sticky top-16 z-30 bg-slate-955/80 backdrop-blur-md border-b border-slate-900/80 py-3.5 shadow-md shadow-slate-950/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <nav className="flex space-x-1 sm:space-x-2 bg-slate-900/60 p-1 rounded-xl border border-slate-850/50">
              {[
                { id: "overview", label: "Overview", icon: <Activity className="w-3.5 h-3.5" /> },
                { id: "reports", label: "My Reports", icon: <FileText className="w-3.5 h-3.5" /> },
                { id: "nearby", label: "Nearby Map", icon: <MapPin className="w-3.5 h-3.5" /> }
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-indigo-650 text-white shadow-md shadow-indigo-600/20 animate-fade-in"
                        : "text-slate-400 hover:text-slate-250 hover:bg-slate-800/40"
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
            
            <div className="flex items-center gap-3">
              {currentUser?.role === "official" && (
                <Button
                  id="dash-official-btn"
                  onClick={() => onNavigate("official")}
                  variant="glass"
                  size="sm"
                  className="font-bold rounded-xl text-xs py-1.5 px-3"
                  leftIcon={<Building className="w-3.5 h-3.5 text-indigo-400" />}
                >
                  Official Command
                </Button>
              )}
              <Button
                id="dash-report-btn"
                onClick={() => onNavigate("report")}
                variant="primary"
                size="sm"
                className="font-bold rounded-xl text-xs py-1.5 px-3 shadow-md shadow-indigo-600/10"
                leftIcon={<Sparkles className="w-3 h-3" />}
              >
                Report Issue
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Welcome Section */}
              <div className="bg-slate-955 border border-slate-900 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden bg-gradient-to-r from-slate-950 to-slate-900/40">
                <div className="absolute top-0 right-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-650/5 rounded-full blur-[80px] pointer-events-none" />
                <div className="space-y-2 flex-1 text-center md:text-left">
                  <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center md:justify-start gap-2">
                    Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">{currentUser?.name || "Citizen"}</span>!
                  </h1>
                  <p className="text-slate-405 text-xs font-semibold leading-relaxed max-w-xl">
                    Review your reported issues, audit live geocoded safety grids, and let Gemini Vision catalog community defects instantly.
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button
                    id="citizen-overview-report-btn"
                    onClick={() => onNavigate("report")}
                    variant="primary"
                    size="md"
                    className="font-bold rounded-2xl text-xs py-3 px-6 shadow-lg shadow-indigo-600/15"
                    leftIcon={<Sparkles className="w-4.5 h-4.5" />}
                  >
                    Report a New Issue
                  </Button>
                </div>
              </div>

              {/* Personal Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "My Reported Issues", value: personalIssues.length, icon: <FileText className="w-4 h-4" />, color: "text-indigo-405", bg: "from-indigo-955/40" },
                  { label: "Resolved by City", value: personalIssues.filter(i => i.status === "Verified & Closed" || i.status === "Closed" || i.status === "Resolved").length, icon: <CheckCircle2 className="w-4 h-4" />, color: "text-emerald-450", bg: "from-emerald-950/40" },
                  { label: "Active Repairs", value: personalIssues.filter(i => i.status === "In Progress" || i.status === "Assigned" || i.status === "Under Review").length, icon: <Clock className="w-4 h-4" />, color: "text-amber-405", bg: "from-amber-955/40" },
                  { label: "Critical Incidents", value: personalIssues.filter(i => i.severity === "Critical").length, icon: <AlertTriangle className="w-4 h-4" />, color: "text-rose-455", bg: "from-red-955/40" }
                ].map((item, idx) => (
                  <Card key={idx} variant="bordered" className={`p-4 bg-gradient-to-br ${item.bg} to-slate-900/15 border-slate-900/80`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">{item.label}</span>
                      <span className={`p-1.5 rounded-lg bg-slate-900 ${item.color} border border-slate-850/50`}>
                        {item.icon}
                      </span>
                    </div>
                    <span className="text-2xl font-black text-white tracking-tight">
                      <AnimatedNumber value={item.value} />
                    </span>
                  </Card>
                ))}
              </div>

              {/* Split Content */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* My Active Reports (Left, 7 columns) */}
                <div className="lg:col-span-7 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">My Active Reports</h3>
                  {personalIssues.filter(i => i.status !== "Verified & Closed" && i.status !== "Closed" && i.status !== "Resolved").length === 0 ? (
                    <Card variant="glass" className="p-8 text-center space-y-4">
                      <p className="text-xs text-slate-455 font-semibold leading-relaxed">
                        No active reported issues. If you notice structural or safety defects in the city, report them to alert city officials.
                      </p>
                      <Button
                        onClick={() => onNavigate("report")}
                        variant="secondary"
                        size="sm"
                        className="mx-auto"
                      >
                        File a Report
                      </Button>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {personalIssues
                        .filter(i => i.status !== "Verified & Closed" && i.status !== "Closed" && i.status !== "Resolved")
                        .slice(0, 3)
                        .map((issue) => (
                          <Card
                            key={issue.id}
                            variant="interactive"
                            onClick={() => setSelectedIssue(issue)}
                            className="p-5 hover:translate-y-[-2px] transition-all hover:border-indigo-500/20 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start space-x-3.5">
                                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-850 flex items-center justify-center text-indigo-400 shrink-0">
                                  {getCategoryIcon(issue.category)}
                                </div>
                                <div>
                                  <h3 className="font-extrabold text-sm text-white tracking-tight leading-tight">
                                    {issue.title}
                                  </h3>
                                  <div className="flex items-center space-x-2 mt-1.5 flex-wrap gap-y-1">
                                    <Badge>{issue.category}</Badge>
                                    <Badge variant={getSeverityVariant(issue.severity)}>
                                      {issue.severity}
                                    </Badge>
                                    <span className="text-[10px] text-slate-505 font-mono">
                                      Filed: {new Date(issue.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <Badge variant={getStatusVariant(issue.status)}>
                                {issue.status}
                              </Badge>
                            </div>

                            {/* Timeline display */}
                            <div className="pt-2.5 mt-2.5 border-t border-slate-900/60 space-y-1.5">
                              <div className="flex items-center justify-between text-[8px] text-slate-500 font-mono uppercase tracking-wider">
                                <span>Timeline Progress</span>
                                <span className="text-indigo-400 font-bold">{issue.status}</span>
                              </div>
                              <div className="relative w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                                <div 
                                  className="absolute top-0 bottom-0 left-0 bg-indigo-500 rounded-full transition-all duration-300"
                                  style={{ width: `${((getStatusStep(issue.status) + 1) / 7) * 100}%` }}
                                />
                              </div>
                            </div>
                          </Card>
                        ))}
                    </div>
                  )}
                </div>

                {/* Right Side Column (Right, 5 columns) */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Personal AI Analysis card */}
                  <Card variant="ai" className="p-6 space-y-4 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 translate-x-4 -translate-y-4 opacity-5 pointer-events-none">
                      <Brain className="w-20 h-20 text-indigo-400" />
                    </div>
                    <div className="flex items-center space-x-2 pb-1 border-b border-slate-900/85">
                      <Brain className="w-4.5 h-4.5 text-indigo-455" />
                      <span className="text-xs font-bold text-white uppercase tracking-widest font-mono">Personal AI Insights</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-semibold">
                      {getCitizenAIInsight()}
                    </p>
                    <div className="bg-indigo-955/20 border border-indigo-900/30 p-3 rounded-2xl text-[10px] text-indigo-305 font-mono flex items-center space-x-2">
                      <Sparkles className="w-3.5 h-3.5 shrink-0 animate-pulse" />
                      <span>Support existing nearby reports to amplify community impact!</span>
                    </div>
                  </Card>

                  {/* Recent activity list */}
                  <Card variant="glass" className="p-6 space-y-4 shadow-xl">
                    <div className="flex items-center space-x-2 pb-1 border-b border-slate-900/85">
                      <Activity className="w-4.5 h-4.5 text-indigo-405" />
                      <span className="text-xs font-bold text-white uppercase tracking-widest font-mono">Recent telemetry Activity</span>
                    </div>
                    <div className="space-y-3">
                      {issues.filter(i => i.status !== "Verified & Closed" && i.status !== "Closed" && i.status !== "Resolved").slice(0, 3).map((issue) => {
                        const city = getCityLabel(issue.location);
                        return (
                          <div 
                            key={issue.id} 
                            onClick={() => setSelectedIssue(issue)}
                            className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-905/30 hover:bg-slate-900 border border-slate-900/80 hover:border-slate-850 transition-colors cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-955 border border-slate-850 flex items-center justify-center shrink-0">
                              {getCategoryIcon(issue.category)}
                            </div>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <p className="text-xs font-bold text-white truncate">{issue.title}</p>
                              <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                                <span>📍 {city}</span>
                                <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: MY REPORTS */}
          {activeTab === "reports" && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  My Filed Incident Reports
                </h1>
                <p className="text-slate-400 text-xs font-semibold">
                  Track and monitor the status lifecycle of your submitted reports.
                </p>
              </div>

              <Card variant="default" className="shadow-2xl">
                {/* Search & Filter Header */}
                <div className="p-6 border-b border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/15 rounded-t-3xl">
                  <span className="text-[10px] font-bold text-slate-405 uppercase tracking-widest font-mono">
                    Filter by Status
                  </span>
                  
                  <div className="flex flex-wrap gap-1.5 bg-slate-955 p-1 rounded-2xl border border-slate-900">
                    {["All", "Submitted", "Assigned", "In Progress", "Resolved", "Needs Rework", "Awaiting Evidence", "Verified & Closed"].map(st => {
                      const isActive = personalFilterStatus === st;
                      return (
                        <button
                          key={st}
                          onClick={() => setPersonalFilterStatus(st)}
                          className={`px-3 py-1.5 text-[10px] font-bold rounded-xl transition-all cursor-pointer font-mono ${
                            isActive 
                              ? "bg-slate-800 text-white shadow-sm"
                              : "text-slate-500 hover:text-slate-350"
                          }`}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-6 divide-y divide-slate-900/60 bg-slate-950/20 rounded-b-3xl">
                  {filteredPersonalIssues.length === 0 ? (
                    <div className="p-12 text-center text-xs text-slate-500 font-semibold leading-relaxed">
                      No reports found matching this status filter.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredPersonalIssues.map(issue => (
                        <Card
                          key={issue.id}
                          variant="interactive"
                          onClick={() => setSelectedIssue(issue)}
                          className="p-5 space-y-4 hover:translate-y-[-2px] transition-all hover:border-indigo-500/20"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start space-x-3.5">
                              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-400 shrink-0">
                                {getCategoryIcon(issue.category)}
                              </div>
                              <div>
                                <h3 className="font-extrabold text-sm text-white tracking-tight leading-tight">
                                  {issue.title}
                                </h3>
                                <div className="flex items-center space-x-2 mt-1.5 flex-wrap gap-y-1">
                                  <Badge>{issue.category}</Badge>
                                  <Badge variant={getSeverityVariant(issue.severity)}>
                                    {issue.severity}
                                  </Badge>
                                  <span className="text-[10px] text-slate-505 font-mono">
                                    Filed: {new Date(issue.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Badge variant={getStatusVariant(issue.status)}>
                              {issue.status}
                            </Badge>
                          </div>

                          {/* Prominent Status Timeline */}
                          <div className="pt-3.5 border-t border-slate-900/60 space-y-2">
                            <div className="flex items-center justify-between text-[9px] text-slate-405 font-mono uppercase tracking-wider">
                              <span>Status Timeline</span>
                              <span className="text-indigo-405 font-extrabold">{issue.status}</span>
                            </div>
                            
                            <div className="relative w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                              <div 
                                className="absolute top-0 bottom-0 left-0 bg-indigo-500 rounded-full transition-all duration-300"
                                style={{ width: `${((getStatusStep(issue.status) + 1) / 7) * 100}%` }}
                              />
                            </div>
                            
                            <div className="flex justify-between text-[8px] font-extrabold text-slate-500 uppercase tracking-widest font-mono pt-1">
                              <span>Reported</span>
                              <span>In Progress</span>
                              <span>Resolved</span>
                              <span>Closed</span>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}

          {/* TAB 3: NEARBY MAP */}
          {activeTab === "nearby" && (
            <motion.div
              key="nearby"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  Nearby Incident Telemetry
                </h1>
                <p className="text-slate-400 text-xs font-semibold">
                  Inspect geocoded incident reports logged across your municipal sectors.
                </p>
              </div>

              <Card variant="default" className="p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4.5 h-4.5 text-indigo-405 animate-pulse" />
                    <h3 className="text-sm font-extrabold text-white">Live Smart City Telemetry Grid</h3>
                  </div>
                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-400 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={showMapResolved}
                      onChange={(e) => setShowMapResolved(e.target.checked)}
                      className="rounded border-slate-800 bg-slate-955 text-indigo-505 focus:ring-indigo-500/30"
                    />
                    <span>Show Resolved & Closed Tickets (Historical)</span>
                  </label>
                </div>

                <div className="h-[550px] w-full rounded-2xl overflow-hidden border border-slate-900 shadow-inner" style={{ minHeight: "500px" }}>
                  <IssueMap
                    issues={issues.filter(i => showMapResolved ? true : (i.status !== "Resolved" && i.status !== "Verified & Closed" && i.status !== "Closed"))}
                    onSelectIssue={(iss) => setSelectedIssue(iss)}
                    selectedIssueId={selectedIssue?.id}
                  />
                </div>

                <p className="text-[10px] text-slate-500 leading-relaxed text-center font-medium font-mono">
                  Coordinates map sync telemetry updates dynamically. Markers connect to local resolution proof databases.
                </p>
              </Card>
            </motion.div>
          )}

        </AnimatePresence>
      {/* Side Slide-Over Modal for viewing issue details, AI analysis, and dispatch actions */}
      <AnimatePresence>
        {selectedIssue && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedIssue(null)}
              className="fixed inset-0 bg-slate-955/85 backdrop-blur-sm z-50 cursor-pointer"
            />

            {/* Slide over */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:max-w-lg bg-slate-950 shadow-2xl z-50 border-l border-slate-900 overflow-y-auto flex flex-col custom-scrollbar"
            >
              {/* Slide-over header */}
              <div className="p-6 border-b border-slate-900 flex justify-between items-center bg-slate-900/40">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-550 font-bold">Issue Inspector</span>
                  <h3 className="text-md font-extrabold text-white tracking-tight mt-0.5 font-mono">
                    ID: {selectedIssue.id.slice(0, 12)}
                  </h3>
                </div>
                <Button
                  onClick={() => setSelectedIssue(null)}
                  variant="outline"
                  size="sm"
                  className="px-2 py-2 h-8 w-8"
                >
                  ✕
                </Button>
              </div>

              {/* Side over content */}
              <div className="p-6 space-y-6 flex-1">
                {/* Photo and general overview */}
                {selectedIssue.imageUrl && (
                  <div className="relative h-48 w-full rounded-2xl overflow-hidden border border-slate-900 shadow-sm bg-slate-900">
                    <img
                      src={selectedIssue.imageUrl}
                      alt={selectedIssue.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-3 left-3 bg-slate-955/90 backdrop-blur-sm border border-slate-900 text-[10px] font-bold text-slate-205 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{selectedIssue.location}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h2 className="text-xl font-black text-white tracking-tight leading-tight">
                    {selectedIssue.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>
                      Category: {selectedIssue.category}
                    </Badge>
                    <Badge variant={getSeverityVariant(selectedIssue.severity)}>
                      Severity: {selectedIssue.severity}
                    </Badge>
                    <Badge variant="info">
                      Priority Code: {selectedIssue.priority}
                    </Badge>
                  </div>
                </div>

                {/* Interactive Triage Progress Timeline */}
                <div className="bg-slate-900/10 border border-slate-900 rounded-3xl p-5 space-y-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Triage Progress Timeline</span>
                  <div className="relative w-full overflow-x-auto no-scrollbar py-4 px-2 bg-slate-955/45 rounded-2xl border border-slate-900/80">
                    <div className="flex items-center justify-between min-w-[640px] relative px-4">
                      {/* Connector Line Background */}
                      <div className="absolute top-[18px] left-8 right-8 h-0.5 bg-slate-800/80 z-0" />
                      
                      {/* Active Progress Connector Line */}
                      <div 
                        className="absolute top-[18px] left-8 h-0.5 bg-indigo-500 transition-all duration-300 z-0"
                        style={{ 
                          width: `calc(${((getStatusStep(selectedIssue.status)) / (STAGES.length - 1)) * 100}% - ${getStatusStep(selectedIssue.status) === 0 ? 0 : 32}px)`
                        }}
                      />

                      {STAGES.map((stage, idx) => {
                        const currentStep = getStatusStep(selectedIssue.status);
                        const isCompleted = idx < currentStep;
                        const isActive = idx === currentStep;
                        const isOfficial = currentUser?.role === "official";
                        const canTransition = isOfficial && idx !== currentStep;
                        
                        const isCloseStage = stage.value === "Verified & Closed";
                        const verificationSuccess = selectedIssue.resolutionVerification?.status === "Resolved";
                        const isDisabledClose = isCloseStage && !verificationSuccess;

                        return (
                          <div 
                            key={idx} 
                            onClick={() => {
                              if (canTransition && !isDisabledClose) {
                                handleUpdateStatus(selectedIssue.id, stage.value);
                              }
                            }}
                            className={`relative flex flex-col items-center flex-1 z-10 select-none ${
                              canTransition && !isDisabledClose ? "cursor-pointer hover:scale-105" : "cursor-default"
                            }`}
                            title={isDisabledClose ? "Successful AI verification is required to Close this ticket." : ""}
                          >
                            {/* Circle Dot indicator */}
                            <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                              isCompleted ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20" :
                              isActive ? "bg-indigo-500 border-indigo-400 text-white animate-pulse shadow-lg shadow-indigo-500/20" :
                              "bg-slate-950 border-slate-850 text-slate-500"
                            }`}>
                              {isCompleted ? (
                                <Check className="w-4 h-4 stroke-[3]" />
                              ) : isActive && stage.value === "AI Verification" ? (
                                <Brain className="w-4 h-4 text-indigo-405 animate-bounce" />
                              ) : (
                                <span className="text-[11px] font-bold font-mono">{idx + 1}</span>
                              )}
                            </div>

                            {/* Label */}
                            <div className="mt-2 text-center flex flex-col items-center">
                              <span className={`font-bold uppercase tracking-wider text-[8.5px] whitespace-nowrap ${
                                isActive ? "text-indigo-400 font-extrabold" :
                                isCompleted ? "text-slate-300 font-semibold" : "text-slate-500"
                              }`}>
                                {stage.name}
                              </span>

                              {isActive && (
                                <span className="mt-0.5 text-[6.5px] bg-indigo-950 text-indigo-400 px-1 py-0.2 rounded border border-indigo-900/30 uppercase font-bold font-mono">
                                  Current
                                </span>
                              )}

                              {isDisabledClose && (
                                <span className="mt-0.5 text-[6.5px] bg-red-955/20 text-red-400 px-1 py-0.2 rounded border border-red-900/30 uppercase font-bold font-mono">
                                  Locked
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-555 uppercase tracking-wider block font-mono">Description</span>
                  <p className="text-sm text-slate-305 bg-slate-900/40 border border-slate-900 p-4 rounded-2xl leading-relaxed">
                    {selectedIssue.description}
                  </p>
                </div>

                {/* Citizens Support & Duplicate Status */}
                {(selectedIssue.supportCount !== undefined || selectedIssue.isDuplicate) && (
                  <Card variant="bordered" className="p-4 space-y-3 bg-slate-900/10 border-slate-900">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-slate-305">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-bold uppercase tracking-wider font-mono">Citizen Endorsements</span>
                      </div>
                      <Badge variant="brand" className="animate-pulse">
                        {selectedIssue.supportCount || 0} Supports
                      </Badge>
                    </div>

                    {selectedIssue.isDuplicate && (
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200 space-y-1 font-semibold leading-relaxed">
                        <div className="flex items-center space-x-1.5 font-bold text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Flagged as AI Duplicate ({selectedIssue.duplicateProbability}%)</span>
                        </div>
                        <p className="text-slate-405">
                          This issue has been identified as a likely duplicate. System recommends consolidating repairs under the original claim.
                        </p>
                      </div>
                    )}
                  </Card>
                )}

                {/* Reporter information */}
                <Card variant="bordered" className="p-4 space-y-3 bg-slate-900/10 border-slate-900">
                  <div className="flex items-center space-x-2 text-slate-400">
                    <User className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold uppercase tracking-wider font-mono">Reporter Details</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-500 font-mono text-[10px] uppercase">Submitted By</p>
                      <p className="font-semibold text-slate-202 mt-0.5">{selectedIssue.reporterName}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-mono text-[10px] uppercase">Email Address</p>
                      <p className="font-semibold text-slate-202 mt-0.5 truncate">{selectedIssue.reporterEmail}</p>
                    </div>
                  </div>
                </Card>

                {/* AI Dispatch Assessment Card */}
                {selectedIssue.aiAnalysis && (
                  <div className="bg-slate-955 border border-indigo-500/15 rounded-2xl p-5 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <Brain className="w-4 h-4 animate-pulse" />
                        </div>
                        <span className="text-xs font-extrabold text-white tracking-tight">Gemini Dispatch Assessment</span>
                      </div>
                      <Badge variant="brand" className="font-mono text-[9px]">
                        Accuracy: {selectedIssue.aiAnalysis.confidenceScore || 88}%
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                      <div className="bg-slate-900/60 border border-slate-900 p-2.5 rounded-xl">
                        <span className="text-slate-505 block uppercase font-bold">Category</span>
                        <span className="font-bold text-white mt-0.5 block">{selectedIssue.aiAnalysis.category}</span>
                      </div>
                      <div className="bg-slate-900/60 border border-slate-900 p-2.5 rounded-xl">
                        <span className="text-slate-505 block uppercase font-bold">Severity</span>
                        <span className="font-bold text-white mt-0.5 block">{selectedIssue.severity}</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-slate-300 font-semibold leading-relaxed text-xs">
                      <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-wide font-mono block">Analysis Reasoning</span>
                      <p>{selectedIssue.aiAnalysis.explanation}</p>
                    </div>

                    <div className="bg-indigo-955/20 border border-indigo-900/30 p-3 rounded-xl space-y-2">
                      <span className="text-[9px] font-extrabold text-indigo-350 uppercase tracking-wider font-mono block">Recommended Action</span>
                      <p className="text-slate-100 font-bold text-xs leading-normal">
                        {selectedIssue.aiAnalysis.recommendedAction}
                      </p>
                    </div>

                    <div className="flex justify-between items-center text-[9px] text-slate-500 border-t border-slate-900/80 pt-2.5 font-mono">
                      <span>Verification: Automated Triage Completed</span>
                      <span>{new Date(selectedIssue.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}

                {/* AI Resolution Verification Block Assistant Card */}
                <div className="space-y-4 pt-4 border-t border-slate-900">
                  <span className="text-xs font-bold text-slate-555 uppercase tracking-wider block font-mono">Municipal Repair Verification</span>

                  {selectedIssue.resolutionVerification ? (
                    <div className="bg-slate-955 border border-indigo-500/15 rounded-2xl p-5 space-y-4 shadow-xl font-sans relative overflow-hidden">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-emerald-450">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-extrabold text-white tracking-tight">Municipal Verification</span>
                        </div>
                        <Badge variant={getStatusVariant(selectedIssue.status)} className="font-mono text-[9px] uppercase font-bold">
                          {selectedIssue.status === "Verified & Closed" ? "Verified" : selectedIssue.status}
                        </Badge>
                      </div>

                      {/* Before / After comparative thumbnails */}
                      {selectedIssue.imageUrl && selectedIssue.resolutionImage && (
                        <div className="grid grid-cols-2 gap-3.5">
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono block">Original Evidence</span>
                            <div className="relative rounded-lg overflow-hidden border border-slate-900 aspect-video bg-slate-900">
                              <ImageWithFallback 
                                src={selectedIssue.imageUrl} 
                                alt="Before" 
                                label="Original" 
                                onError={() => setOriginalImageError(true)}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono block">Repair Evidence</span>
                            <div className="relative rounded-lg overflow-hidden border border-slate-900 aspect-video bg-slate-900">
                              <ImageWithFallback 
                                src={selectedIssue.resolutionImage || ""} 
                                alt="After" 
                                label="Repair" 
                                onError={() => setRepairImageError(true)}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Verification checklists */}
                      <div className="p-3.5 bg-slate-900/40 border border-slate-900 rounded-xl space-y-2 text-[10px] text-slate-300 font-semibold leading-relaxed">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block font-mono">Official Checkpoints</span>
                        <div className="grid grid-cols-1 gap-1 pl-1">
                          {[
                            { checked: selectedIssue.resolutionVerification.landmarkMatch === 100, label: "Same incident location verified" },
                            { checked: selectedIssue.resolutionVerification.infrastructureMatch === 100, label: "Correct infrastructure/issue repaired" },
                            { checked: selectedIssue.resolutionVerification.sceneMatch === 100, label: "Repair quality standards acceptable" },
                            { checked: selectedIssue.resolutionVerification.locationMatch === 100, label: "Before/After inspection images are clear" },
                            { checked: selectedIssue.resolutionVerification.issueResolution === 100, label: "Issue completely resolved & clean" }
                          ].map((item, idx) => (
                            <div key={idx} className="flex items-center space-x-2">
                              <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border font-mono text-[8px] font-black ${item.checked ? 'border-emerald-500 text-emerald-450 bg-emerald-500/10' : 'border-slate-800 text-slate-600 bg-slate-950'}`}>
                                {item.checked ? "✓" : "✗"}
                              </span>
                              <span className={item.checked ? 'text-slate-200' : 'text-slate-500 line-through'}>{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1 text-slate-300 leading-relaxed text-xs pt-2 border-t border-slate-900/60">
                        <span className="text-[9px] font-bold text-indigo-305 uppercase tracking-wide font-mono block font-mono">Verification Notes</span>
                        <p className="italic bg-slate-900/20 p-2.5 rounded-xl border border-slate-900/45 text-slate-300 font-semibold">
                          "{selectedIssue.resolutionVerification.explanation || 'No notes provided by official.'}"
                        </p>
                      </div>

                      {/* Citizen status experiences */}
                      <div className="p-3 bg-indigo-950/20 border border-indigo-500/15 text-indigo-300 text-xs font-semibold rounded-xl flex items-center gap-2">
                        <ShieldCheck className="w-4.5 h-4.5 text-indigo-400 shrink-0" />
                        <span>
                          {selectedIssue.status === "Verified & Closed" ? "Verified by Municipal Official" :
                           selectedIssue.status === "Needs Rework" ? "Additional repair work is required." :
                           selectedIssue.status === "Awaiting Evidence" ? "Municipal team is uploading updated repair documentation." :
                           "Verification workflow active."}
                        </span>
                      </div>
                    </div>
                  ) : selectedIssue.status === "Resolved" ? (
                    <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-5 text-center space-y-3 font-sans">
                      <Clock className="w-8 h-8 text-indigo-405 mx-auto animate-pulse" />
                      <h5 className="text-xs font-extrabold text-white">Pending Dispatch Review</h5>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                        The municipal crew has completed the repair work. The ticket is currently awaiting manual review and verification by an authorized Municipal Official.
                      </p>
                    </div>
                  ) : selectedIssue.status === "Needs Rework" ? (
                    <div className="bg-amber-950/10 border border-amber-900/20 rounded-2xl p-5 text-center space-y-3 font-sans">
                      <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                      <h5 className="text-xs font-extrabold text-white">Additional Work Required</h5>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                        Additional repair work is required. The repair has been sent back for rework by the Municipal Official.
                      </p>
                    </div>
                  ) : selectedIssue.status === "Awaiting Evidence" ? (
                    <div className="bg-sky-950/10 border border-sky-900/20 rounded-2xl p-5 text-center space-y-3 font-sans">
                      <Info className="w-8 h-8 text-sky-400 mx-auto" />
                      <h5 className="text-xs font-extrabold text-white">Awaiting Updated Evidence</h5>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                        The municipal team is uploading updated repair documentation for verification.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-905/30 border border-slate-900 rounded-2xl p-4 text-center text-xs text-slate-505 font-semibold font-sans py-6">
                      Resolution verification will become available once the issue status reaches <span className="text-indigo-405 font-bold">Resolved</span>.
                    </div>
                  )}
                </div>

                {/* Dispatch Triage Operations for Officials */}
                <div className="space-y-3 pt-4 border-t border-slate-900">
                  <span className="text-xs font-bold text-slate-555 uppercase tracking-wider block font-mono">Claim Status</span>
                  
                  {currentUser?.role === "official" ? (
                    <div className="space-y-2">
                      <p className="text-[11px] text-indigo-405 font-bold mb-1 uppercase font-mono">
                        Update Pipeline Status:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {["Reported", "Assigned", "Under Review", "In Progress", "Resolved", "AI Verification", "Verified & Closed"].map((status) => {
                          const isClose = status === "Verified & Closed";
                          const verificationSuccess = selectedIssue.resolutionVerification?.status === "Resolved";
                          const isLocked = isClose && !verificationSuccess;

                          return (
                            <Button
                              key={status}
                              id={`status-update-${status.replace(/\s+/g, "-")}`}
                              onClick={() => {
                                if (!isLocked) {
                                  handleUpdateStatus(selectedIssue.id, status);
                                }
                              }}
                              disabled={updatingStatus === selectedIssue.id || isLocked}
                              variant={selectedIssue.status === status ? "primary" : "secondary"}
                              size="sm"
                              className={`rounded-xl justify-center ${status === "Verified & Closed" ? "col-span-2" : ""}`}
                              leftIcon={selectedIssue.status === status ? <Check className="w-3.5 h-3.5 text-white" /> : undefined}
                              title={isLocked ? "AI verification must pass successfully to close" : ""}
                            >
                              <span>{isClose && isLocked ? "Closed (AI Req.)" : status}</span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 bg-slate-900/40 border border-slate-900 p-3.5 rounded-2xl text-slate-455 text-xs font-semibold leading-relaxed">
                      <AlertCircle className="w-4.5 h-4.5 text-slate-500 shrink-0" />
                      <span>Citizen viewing mode. Sign in as <b>City Official</b> to authorize status updates.</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </main>
    </div>
  );
}