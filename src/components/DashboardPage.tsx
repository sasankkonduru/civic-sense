import React, { useState, useEffect, useRef } from "react";
import { 
  AlertTriangle, CheckCircle2, Clock, ShieldAlert, Brain, MapPin, 
  RefreshCw, TrendingUp, Filter, Eye, User, FileText, ChevronRight, Check, AlertCircle, Sparkles,
  Upload, Timer, ClipboardCheck, Building, Calendar, Activity, Trash2, Droplets, Lightbulb, Hammer, ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db, updateFirestoreIssue, uploadBase64ToStorage, seedDemoIssuesIfEmpty } from "../firebase";
import { Issue, AIInsight, DashboardStats, MunicipalInsights, MunicipalDailyBrief } from "../types";
import { IssueMap } from "./IssueMap";

// Design System Components
import Button from "./ui/Button";
import Badge, { getSeverityVariant, getStatusVariant } from "./ui/Badge";
import { Card } from "./ui/Card";
import { LoadingSpinner, SkeletonList, AILoader } from "./ui/Loading";
import EmptyState from "./ui/EmptyState";

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
    if (!selectedIssue || !resolutionBase64) return;
    try {
      setVerifyingResolution(true);
      setResolutionError("");

      const response = await fetch("/api/verify-resolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: selectedIssue.title,
          description: selectedIssue.description,
          originalImageUrl: selectedIssue.imageUrl,
          resolutionImageBase64: resolutionBase64,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to verify resolution.");
      }

      const verificationResult = await response.json();
      const storagePath = `resolutions/${selectedIssue.id}_${Date.now()}.jpg`;
      const uploadedUrl = await uploadBase64ToStorage(resolutionBase64, storagePath);

      const updatePayload: Partial<Issue> = {
        resolutionImage: uploadedUrl,
        resolutionVerification: {
          status: verificationResult.status,
          confidenceScore: verificationResult.confidenceScore,
          explanation: verificationResult.explanation,
          verifiedAt: new Date().toISOString(),
        },
      };

      if (verificationResult.status === "Resolved") {
        updatePayload.status = "Resolved";
      } else if (verificationResult.status === "Partially Resolved") {
        updatePayload.status = "In Progress";
      }

      await updateFirestoreIssue(selectedIssue.id, updatePayload);

      const updatedIssue = {
        ...selectedIssue,
        ...updatePayload,
      };
      setSelectedIssue(updatedIssue);
      setResolutionFile(null);
      setResolutionBase64("");
    } catch (err: any) {
      console.error("Verification failed:", err);
      setResolutionError(err.message || "An error occurred during verification.");
    } finally {
      setVerifyingResolution(false);
    }
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
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      if (querySnapshot.empty) {
        if (isSeedingRef.current) return;
        isSeedingRef.current = true;
        setIsSeeding(true);
        try {
          await seedDemoIssuesIfEmpty();
        } catch (err) {
          console.error("Auto seeding failed:", err);
        } finally {
          setIsSeeding(false);
          isSeedingRef.current = false;
        }
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
      const resolvedCount = list.filter((i) => i.status === "Resolved" || i.status === "Verified & Closed" || i.status === "Verified").length;
      const openCount = list.filter((i) => i.status !== "Resolved" && i.status !== "Verified & Closed" && i.status !== "Verified").length;
      const criticalCount = list.filter((i) => i.severity === "Critical").length;
      const pendingVerificationCount = list.filter((i) => i.status === "Reported" || i.status === "Under Review" || i.status === "Submitted").length;

      const resolvedIssuesList = list.filter((i) => i.status === "Resolved" || i.status === "Verified & Closed" || i.status === "Verified");
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
        inProgressCount: list.filter((i) => i.status === "In Progress").length,
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

  return (
    <div id="dashboard-page" className="min-h-screen bg-slate-955 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-white pb-12 relative overflow-hidden">
      
      {/* Visual background glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px] -z-10 pointer-events-none" />

      {/* Modern Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-950/70 backdrop-blur-xl border-b border-slate-900/85 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
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

      {/* Main Grid Desk */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        
        {/* Welcome titles */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Civic Intelligence Command Desk
            </h1>
            <p className="text-slate-400 text-xs font-medium">
              Enterprise-grade municipal tracking grid powered by Gemini Vision & live telemetry synchronization.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {currentUser?.role === "official" && (
              <Button
                id="dash-official-btn"
                onClick={() => onNavigate("official")}
                variant="glass"
                size="sm"
                className="font-bold rounded-xl"
                leftIcon={<Building className="w-3.5 h-3.5 text-indigo-400" />}
              >
                Official Command
              </Button>
            )}
            <Button
              onClick={() => {
                fetchAIInsights(issues);
                fetchMunicipalInsights(issues);
              }}
              variant="secondary"
              size="sm"
              className="font-bold rounded-xl border border-slate-850"
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh AI Insights
            </Button>
            <Button
              id="dash-report-btn"
              onClick={() => onNavigate("report")}
              variant="primary"
              size="sm"
              className="font-bold rounded-xl shadow-lg"
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Report Hazard
            </Button>
          </div>
        </div>

        {/* AI Municipal Daily Brief (Daily Brief at the Top) */}
        <div id="ai-municipal-daily-brief" className="w-full">
          {loadingDailyBrief && !dailyBrief ? (
            <Card variant="glass" glow="indigo" className="p-8">
              {/* Sleek chat loading skeleton details */}
              <div className="space-y-4 py-8 max-w-xl mx-auto animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-850"></div>
                  <div className="h-4 bg-slate-850 rounded w-1/3"></div>
                </div>
                <div className="h-3 bg-slate-850 rounded w-full"></div>
                <div className="h-3 bg-slate-850 rounded w-5/6"></div>
                <div className="h-3 bg-slate-850 rounded w-4/5"></div>
              </div>
            </Card>
          ) : dailyBrief ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card variant="glass" glow="indigo">
                {/* Daily Brief header */}
                <div className="border-b border-slate-900 px-6 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center text-white shadow-lg border border-white/10">
                      <Brain className="w-5.5 h-5.5 animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                        AI Municipal Daily Brief
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      </h2>
                      <p className="text-slate-400 text-[11px] font-semibold">
                        Executive operational overview powered by Gemini
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl flex items-center space-x-2">
                      <Activity className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[11px] font-bold text-slate-350 font-mono">Today:</span>
                      <span className="bg-indigo-950 text-indigo-400 text-[10px] px-2 py-0.5 rounded-md font-extrabold border border-indigo-900/30 font-mono">
                        {dailyBrief.totalReportsToday} {dailyBrief.totalReportsToday === 1 ? 'Report' : 'Reports'}
                      </span>
                    </div>

                    <Button
                      onClick={() => fetchDailyBrief(issues, true)}
                      loading={loadingDailyBrief}
                      variant="outline"
                      size="sm"
                      className="px-2.5 py-2.5 h-9"
                    >
                      {!loadingDailyBrief && <RefreshCw className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>

                {/* Bento Grid Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 sm:p-8">
                  
                  {/* Risks & Highest Priority Area */}
                  <div className="space-y-6">
                    <Card variant="bordered" className="p-5 space-y-4 bg-slate-900/10 border-slate-900">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-455 flex items-center gap-1.5 font-mono">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Risk Forecast
                        </h4>
                        <Badge variant={getSeverityVariant(dailyBrief.riskForecast.level)}>
                          {dailyBrief.riskForecast.level} Risk
                        </Badge>
                      </div>
                      <p className="text-slate-305 text-xs leading-relaxed font-medium">
                        {dailyBrief.riskForecast.description}
                      </p>
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-mono">Vulnerable Sectors</p>
                        <div className="flex flex-wrap gap-1.5">
                          {dailyBrief.riskForecast.vulnerableSectors.map((sector, idx) => (
                            <Badge key={idx}>{sector}</Badge>
                          ))}
                        </div>
                      </div>
                    </Card>

                    <Card variant="bordered" className="p-5 space-y-3 bg-slate-900/10 border-slate-900">
                      <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-455 flex items-center gap-1.5 font-mono">
                        <MapPin className="w-3.5 h-3.5" />
                        Highest Priority Area
                      </h4>
                      <div className="space-y-1">
                        <p className="text-white text-xs font-bold">{dailyBrief.highestPriorityArea.locationName}</p>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] text-slate-400">Active reports count:</span>
                          <Badge variant="critical">{dailyBrief.highestPriorityArea.activeIssuesCount} cases</Badge>
                        </div>
                      </div>
                      <p className="text-slate-305 text-xs leading-relaxed font-medium">
                        {dailyBrief.highestPriorityArea.primaryRisk}
                      </p>
                    </Card>
                  </div>

                  {/* Emerging Trends & Departments */}
                  <div className="space-y-6">
                    <Card variant="bordered" className="p-5 space-y-4 bg-slate-900/10 border-slate-900">
                      <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-455 flex items-center gap-1.5 font-mono">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Emerging Trends
                      </h4>
                      <div className="space-y-4">
                        {dailyBrief.emergingTrends.map((trendItem, idx) => (
                          <div key={idx} className="border-l border-indigo-500/50 pl-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-white text-xs font-bold leading-tight">{trendItem.trend}</p>
                              <Badge variant={getSeverityVariant(trendItem.impactLevel)}>
                                {trendItem.impactLevel}
                              </Badge>
                            </div>
                            <p className="text-slate-405 text-[10px] leading-relaxed font-medium">
                              {trendItem.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card variant="bordered" className="p-5 space-y-3.5 bg-slate-900/10 border-slate-900">
                      <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-455 flex items-center gap-1.5 font-mono">
                        <Building className="w-3.5 h-3.5" />
                        Attention Required
                      </h4>
                      <div className="space-y-3">
                        {dailyBrief.urgentDepartments.map((dept, idx) => (
                          <div key={idx} className="bg-slate-950/40 rounded-xl p-3 border border-slate-900 flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <span className="text-white text-xs font-bold">{dept.department}</span>
                              <Badge variant={getSeverityVariant(dept.urgency)}>
                                {dept.urgency}
                              </Badge>
                            </div>
                            <p className="text-slate-405 text-[10px] leading-relaxed font-medium">
                              {dept.reason}
                            </p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>

                  {/* Actions & Predictive Load */}
                  <div className="space-y-6">
                    <Card variant="bordered" className="p-5 space-y-4 bg-slate-900/10 border-slate-900">
                      <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-455 flex items-center gap-1.5 font-mono">
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        AI Recommendations
                      </h4>
                      <div className="space-y-3">
                        {dailyBrief.recommendedActions.map((rec, idx) => (
                          <div key={idx} className="bg-slate-950/40 border border-slate-900 rounded-xl p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wide font-mono">{rec.timeline}</span>
                            </div>
                            <p className="text-white text-xs font-bold leading-tight">{rec.action}</p>
                            <p className="text-slate-405 text-[10px] leading-relaxed font-medium">
                              <strong className="text-slate-350">Rationale:</strong> {rec.rationale}
                            </p>
                            <p className="text-[9px] text-emerald-450 font-semibold bg-emerald-950/10 border border-emerald-900/20 p-2 rounded-xl">
                              Impact: {rec.impact}
                            </p>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card variant="bordered" className="p-5 space-y-3.5 bg-slate-900/10 border-slate-900">
                      <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-455 flex items-center gap-1.5 font-mono">
                        <Calendar className="w-3.5 h-3.5" />
                        7-Day Predictive Load
                      </h4>
                      <div className="space-y-2.5">
                        {dailyBrief.predictedIssues7Days.map((pred, idx) => (
                          <div key={idx} className="flex flex-col gap-1 bg-slate-950/40 p-2.5 rounded-xl border border-slate-900">
                            <div className="flex items-center justify-between">
                              <span className="text-white text-xs font-bold">{pred.category}</span>
                              <div className="flex items-center space-x-2">
                                <Badge variant={pred.probability >= 80 ? "critical" : "high"}>
                                  ~{pred.expectedCount} est ({pred.probability}%)
                                </Badge>
                              </div>
                            </div>
                            <p className="text-slate-405 text-[9.5px] leading-relaxed font-semibold">
                              {pred.factors}
                            </p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>

                </div>
              </Card>
            </motion.div>
          ) : null}
        </div>

        {/* Enhanced KPI Cards */}
        {!stats || loadingIssues || isSeeding ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-slate-900/40 p-6 rounded-3xl border border-slate-900 space-y-3 animate-pulse relative overflow-hidden min-h-[120px]">
                <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                <div className="h-8 bg-slate-800 rounded w-1/3 mt-3"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <motion.div whileHover={{ y: -5 }}>
              <Card variant="interactive" className="p-6 h-full relative group overflow-hidden bg-gradient-to-br from-indigo-950/40 to-slate-900/20 border-indigo-900/40 shadow-lg shadow-indigo-950/5">
                <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 transition-transform duration-300">
                  <FileText className="w-24 h-24 text-indigo-400" />
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest font-mono">Total Issues</span>
                  <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <FileText className="w-4 h-4" />
                  </span>
                </div>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-3xl font-black text-white tracking-tight">{stats.totalCount}</span>
                  <span className="text-[10px] font-extrabold text-indigo-405 font-mono tracking-wider uppercase bg-indigo-955/35 px-1.5 py-0.5 rounded border border-indigo-900/25">
                    +12% Last Wk
                  </span>
                </div>
              </Card>
            </motion.div>

            <motion.div whileHover={{ y: -5 }}>
              <Card variant="interactive" className="p-6 h-full relative group overflow-hidden bg-gradient-to-br from-red-950/40 to-slate-900/20 border-red-900/30 shadow-lg shadow-red-950/5" glow={stats.criticalCount && stats.criticalCount > 0 ? "indigo" : "none"}>
                <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 transition-transform duration-300">
                  <ShieldAlert className="w-24 h-24 text-red-400" />
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-red-300 uppercase tracking-widest font-mono">Critical Backlog</span>
                  <span className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                    <ShieldAlert className="w-4 h-4 animate-pulse" />
                  </span>
                </div>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-3xl font-black text-white tracking-tight">{stats.criticalCount ?? 0}</span>
                  <span className="text-[10px] font-extrabold text-red-405 font-mono tracking-wider uppercase bg-red-955/35 px-1.5 py-0.5 rounded border border-red-900/25">
                    Emergency Priority
                  </span>
                </div>
              </Card>
            </motion.div>

            <motion.div whileHover={{ y: -5 }}>
              <Card variant="interactive" className="p-6 h-full relative group overflow-hidden bg-gradient-to-br from-orange-950/40 to-slate-900/20 border-orange-900/30 shadow-lg shadow-orange-955/5">
                <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 transition-transform duration-300">
                  <Clock className="w-24 h-24 text-orange-400" />
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-orange-300 uppercase tracking-widest font-mono">Open Pipeline</span>
                  <span className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    <Clock className="w-4 h-4" />
                  </span>
                </div>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-3xl font-black text-white tracking-tight">{stats.openCount ?? (stats.totalCount - stats.resolvedCount)}</span>
                  <span className="text-[10px] font-extrabold text-orange-405 font-mono tracking-wider uppercase bg-orange-955/35 px-1.5 py-0.5 rounded border border-orange-900/25">
                    Triage Dispatch
                  </span>
                </div>
              </Card>
            </motion.div>

            <motion.div whileHover={{ y: -5 }}>
              <Card variant="interactive" className="p-6 h-full relative group overflow-hidden bg-gradient-to-br from-emerald-950/40 to-slate-900/20 border-emerald-900/30 shadow-lg shadow-emerald-950/5">
                <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle2 className="w-24 h-24 text-emerald-400" />
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest font-mono">Resolved Claims</span>
                  <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                </div>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-3xl font-black text-white tracking-tight">{stats.resolvedCount}</span>
                  <span className="text-[10px] font-extrabold text-emerald-405 font-mono tracking-wider uppercase bg-emerald-955/35 px-1.5 py-0.5 rounded border border-emerald-900/25">
                    {stats.totalCount > 0 ? Math.round((stats.resolvedCount / stats.totalCount) * 100) : 0}% Close Rate
                  </span>
                </div>
              </Card>
            </motion.div>

          </div>
        )}

        {/* Executive Analytics Indicators Panel */}
        <Card variant="glass" className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-400 animate-pulse" />
                <span>Municipal Insights Dashboard</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Comprehensive 5-dimension analytics synthesized in real-time using Gemini Vision & Reasoning.
              </p>
            </div>
            
            {loadingMunicipalInsights && (
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-455 bg-indigo-950/40 border border-indigo-900/30 px-3 py-1.5 rounded-xl animate-pulse font-mono">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Generating insights...</span>
              </div>
            )}
          </div>

          {loadingMunicipalInsights ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-slate-900/20 p-5 rounded-2xl border border-slate-900 shadow-sm animate-pulse space-y-3">
                  <div className="w-8 h-8 bg-slate-800 rounded-lg"></div>
                  <div className="h-4 bg-slate-800 rounded w-2/3"></div>
                  <div className="h-8 bg-slate-800 rounded w-1/2"></div>
                  <div className="h-12 bg-slate-800 rounded"></div>
                </div>
              ))}
            </div>
          ) : !municipalInsights ? (
            <div className="rounded-2xl border border-slate-900 p-8 text-center space-y-3 bg-slate-900/10">
              <p className="text-xs text-slate-400">No municipal analytics generated yet. Click to analyze all issue databases.</p>
              <Button
                onClick={() => fetchMunicipalInsights(issues)}
                variant="primary"
                size="sm"
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                className="mx-auto"
              >
                Generate Municipal Analytics
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              
              {/* 1. Most Common Category */}
              <Card variant="interactive" className="p-5 bg-slate-900/10 border-slate-900 flex flex-col justify-between h-full">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider font-mono">Common Category</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white leading-tight">
                      {municipalInsights.mostCommonCategory.category}
                    </h3>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-2xl font-black text-white">
                        {municipalInsights.mostCommonCategory.percentage}%
                      </span>
                      <span className="text-[10px] font-bold text-slate-505 font-mono">
                        ({municipalInsights.mostCommonCategory.count} cases)
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium pt-3 mt-3 border-t border-slate-900">
                  {municipalInsights.mostCommonCategory.description}
                </p>
              </Card>

              {/* 2. Highest Risk Zones */}
              <Card variant="interactive" className="p-5 bg-slate-900/10 border-slate-900 flex flex-col justify-between h-full">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 bg-rose-500/10 rounded-lg flex items-center justify-center text-rose-400 border border-rose-500/20">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider font-mono">Risk Zones</span>
                  </div>
                  <div className="space-y-2 min-h-[48px]">
                    {municipalInsights.highestRiskZones.slice(0, 1).map((z, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-white truncate max-w-[110px]">{z.zone}</span>
                          <Badge variant={getSeverityVariant(z.riskLevel)}>{z.riskLevel}</Badge>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 font-mono">{z.activeIssuesCount} active hazards</p>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium pt-3 mt-3 border-t border-slate-900">
                  {municipalInsights.highestRiskZones[0]?.description}
                </p>
              </Card>

              {/* 3. Resolution Trends */}
              <Card variant="interactive" className="p-5 bg-slate-900/10 border-slate-900 flex flex-col justify-between h-full">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">Resolution Trends</span>
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-white leading-tight">
                      {municipalInsights.resolutionTrends.trend}
                    </h3>
                    <div className="inline-block mt-1 bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 rounded-lg px-2 py-0.5 text-xs font-bold font-mono">
                      {municipalInsights.resolutionTrends.percentageChange}
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium pt-3 mt-3 border-t border-slate-900">
                  {municipalInsights.resolutionTrends.details}
                </p>
              </Card>

              {/* 4. Emerging Infrastructure Issues */}
              <Card variant="interactive" className="p-5 bg-slate-900/10 border-slate-900 flex flex-col justify-between h-full">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-400 border border-amber-500/20">
                      <Clock className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono">Emerging Hazards</span>
                  </div>
                  <div className="min-h-[48px]">
                    <h3 className="text-xs font-extrabold text-white leading-tight">
                      {municipalInsights.emergingIssues[0]?.title}
                    </h3>
                    <Badge variant={getSeverityVariant(municipalInsights.emergingIssues[0]?.severity)} className="mt-1">
                      {municipalInsights.emergingIssues[0]?.severity} Severity
                    </Badge>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium pt-3 mt-3 border-t border-slate-900">
                  {municipalInsights.emergingIssues[0]?.description}
                </p>
              </Card>

              {/* 5. Recommended Actions */}
              <Card variant="interactive" className="p-5 bg-indigo-950/20 border-indigo-900/40 text-white flex flex-col justify-between h-full">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 bg-indigo-500/25 rounded-lg flex items-center justify-center text-indigo-300 border border-indigo-500/20">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider font-mono">Recommended Action</span>
                  </div>
                  <div className="min-h-[48px]">
                    <h3 className="text-[11px] font-bold text-slate-200 leading-normal line-clamp-2">
                      {municipalInsights.recommendedActions[0]?.action}
                    </h3>
                    <div className="flex gap-1.5 mt-1.5">
                      <Badge variant={getSeverityVariant(municipalInsights.recommendedActions[0]?.priority)}>
                        {municipalInsights.recommendedActions[0]?.priority}
                      </Badge>
                      <span className="px-1.5 py-0.5 bg-slate-900 text-slate-400 rounded text-[8px] font-bold border border-slate-800">
                        {municipalInsights.recommendedActions[0]?.timeframe}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-indigo-200/90 leading-relaxed font-medium pt-3 mt-3 border-t border-indigo-800/30">
                  <span className="font-bold text-white">Impact:</span> {municipalInsights.recommendedActions[0]?.impact}
                </p>
              </Card>

            </div>
          )}
        </Card>

        {/* Dashboard split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: Map overlay and Reported incidents list */}
          <div className="lg:col-span-8 space-y-6">
            
            <Card variant="default" className="p-6 space-y-4">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4.5 h-4.5 text-indigo-400 animate-pulse" />
                <h3 className="text-sm font-extrabold text-white">Infrastructure Map Overlay</h3>
              </div>

              <div className="h-96 w-full rounded-2xl overflow-hidden border border-slate-900 shadow-sm" style={{ minHeight: "380px" }}>
                <IssueMap
                  issues={issues}
                  onSelectIssue={(iss) => setSelectedIssue(iss)}
                  selectedIssueId={selectedIssue?.id}
                />
              </div>

              <p className="text-[10px] text-slate-500 leading-relaxed text-center font-medium font-mono">
                Real-time active maps sync geocoded telemetry points straight from citizens to dispatcher queues.
              </p>
            </Card>

            <Card variant="default">
              
              <div className="p-6 border-b border-slate-900 space-y-4 bg-slate-900/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                    <Filter className="w-4 h-4 text-brand-primary" />
                    <span>Reported Incident Logs</span>
                  </h2>

                  <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-900">
                    {statuses.map(st => (
                      <button
                        key={st}
                        onClick={() => setFilterStatus(st)}
                        className={`px-3 py-1.5 text-[10px] font-bold rounded-xl transition-all cursor-pointer font-mono ${
                          filterStatus === st 
                            ? "bg-slate-800 text-white shadow-sm"
                            : "text-slate-500 hover:text-slate-350"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-900">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-2 font-mono">Category:</span>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all border cursor-pointer ${
                        filterCategory === cat 
                          ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" 
                          : "bg-slate-900 border-slate-855 text-slate-450 hover:border-slate-800 hover:text-slate-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-slate-900">
                {isSeeding ? (
                  <div className="p-12 text-center space-y-4">
                    <LoadingSpinner className="mx-auto" size="lg" />
                    <p className="text-sm font-bold text-brand-primary animate-pulse">Syncing Municipal Databases...</p>
                  </div>
                ) : loadingIssues ? (
                  <div className="p-12">
                    <SkeletonList count={3} />
                  </div>
                ) : filteredIssues.length === 0 ? (
                  <div className="p-12">
                    <EmptyState
                      title="All Clean & Verified!"
                      description="There are no active municipal hazards or issues matching your selected filters."
                      onReset={() => {
                        setFilterStatus("All");
                        setFilterCategory("All");
                      }}
                    />
                  </div>
                ) : (
                  filteredIssues.map((iss) => {
                    const isSelected = selectedIssue?.id === iss.id;
                    const cityLabel = getCityLabel(iss.location);
                    return (
                      <div
                        key={iss.id}
                        id={`issue-${iss.id}`}
                        onClick={() => setSelectedIssue(iss)}
                        className={`p-6 flex items-start space-x-4 cursor-pointer transition-all border-l-4 ${
                          isSelected 
                            ? "bg-indigo-950/20 border-l-brand-primary" 
                            : "hover:bg-slate-900/30 border-l-transparent bg-slate-900/10"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-center shrink-0">
                          {getCategoryIcon(iss.category)}
                        </div>

                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant={getSeverityVariant(iss.severity)}>
                              {iss.severity}
                            </Badge>
                            <Badge variant={getStatusVariant(iss.status)}>
                              {iss.status}
                            </Badge>
                            {iss.priorityScore !== undefined && (
                              <Badge variant="brand">
                                <Sparkles className="w-2.5 h-2.5 shrink-0 text-brand-primary animate-pulse" />
                                P{iss.priorityScore}
                              </Badge>
                            )}
                            <span className="text-[10px] font-bold text-sky-400 bg-sky-950/20 border border-sky-900/30 px-1.5 py-0.5 rounded font-mono">
                              📍 {cityLabel}
                            </span>
                          </div>

                          <h3 className="font-extrabold text-white tracking-tight truncate text-sm">
                            {iss.title}
                          </h3>

                          <p className="text-xs text-slate-400 line-clamp-1">
                            {iss.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-550 pt-1 font-mono">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                              <span className="truncate max-w-[150px] sm:max-w-[250px]">{iss.location}</span>
                            </span>
                            <span>•</span>
                            <span>{new Date(iss.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>

                        <ChevronRight className="w-5 h-5 text-slate-600 self-center shrink-0" />
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

          </div>

          {/* RIGHT: Resolution Progress, AI Civic Insights cards, and Activity */}
          <div className="lg:col-span-4 space-y-6">
            
            <Card variant="glass" glow="emerald" className="p-6 space-y-5">
              <div className="flex items-center space-x-2">
                <Timer className="w-4.5 h-4.5 text-emerald-450" />
                <h3 className="text-sm font-extrabold text-white">Resolution Progress</h3>
              </div>

              {stats ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider font-mono">Task Completion</span>
                    <span className="text-2xl font-black text-emerald-400 font-mono">
                      {stats.totalCount > 0 ? Math.round((stats.resolvedCount / stats.totalCount) * 100) : 0}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-900">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${stats.totalCount > 0 ? (stats.resolvedCount / stats.totalCount) * 100 : 0}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs pt-1">
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block font-mono">Resolved Claims</span>
                      <span className="text-sm font-extrabold text-white mt-1 block font-mono">{stats.resolvedCount}</span>
                    </div>
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block font-mono">Active Pipeline</span>
                      <span className="text-sm font-extrabold text-white mt-1 block font-mono">{stats.openCount}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-medium">Progress telemetry calculating...</p>
              )}
            </Card>

            {/* AI Civic Insights Overhauled as ChatGPT-style Assistant Response Card */}
            <Card variant="glass" glow="purple" className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                    <Brain className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold tracking-tight text-white">AI Civic Insights</h2>
                    <p className="text-[10px] text-indigo-300 font-bold tracking-wider uppercase font-mono">Assistant Advisory</p>
                  </div>
                </div>

                <Button
                  onClick={() => fetchAIInsights()}
                  loading={loadingInsights}
                  variant="outline"
                  size="sm"
                  className="px-2.5 py-2.5 h-8 w-8"
                >
                  {!loadingInsights && <RefreshCw className="w-3.5 h-3.5" />}
                </Button>
              </div>

              <div className="space-y-4">
                {/* Modern loading skeletons for insights loading state */}
                {loadingInsights ? (
                  <div className="space-y-4 py-2">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="bg-slate-900/30 border border-slate-900 rounded-2xl p-4 space-y-3 animate-pulse">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-slate-800 rounded-lg"></div>
                          <div className="h-3.5 bg-slate-800 rounded w-1/3"></div>
                          <div className="h-3 bg-slate-800 rounded w-12 ml-auto"></div>
                        </div>
                        <div className="h-3 bg-slate-800 rounded w-5/6"></div>
                        <div className="h-3 bg-slate-800 rounded w-2/3"></div>
                      </div>
                    ))}
                  </div>
                ) : insights.length === 0 ? (
                  <p className="text-xs text-indigo-300 text-center py-4">No structural insights available.</p>
                ) : (
                  insights.slice(0, 2).map((ins) => {
                    const confidence = ins.confidenceScore || 92;
                    return (
                      <div 
                        key={ins.id}
                        className="bg-slate-950/70 border border-indigo-500/15 rounded-2xl p-4.5 space-y-4 shadow-xl hover:border-indigo-500/30 transition-all text-xs"
                      >
                        {/* ChatGPT message avatar and confidence details line */}
                        <div className="flex items-center justify-between border-b border-slate-900/80 pb-3">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-6 h-6 rounded bg-gradient-to-tr from-brand-primary to-indigo-500 flex items-center justify-center text-white shrink-0 shadow">
                              <Sparkles className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[10.5px] font-extrabold text-slate-100 tracking-tight">{ins.title}</span>
                          </div>
                          
                          <Badge variant="brand" className="text-[8.5px] font-bold font-mono">
                            Accuracy: {confidence}%
                          </Badge>
                        </div>

                        {/* Summary description block */}
                        <div className="space-y-1 leading-relaxed text-slate-300 font-semibold font-sans">
                          <p>{ins.summary}</p>
                        </div>

                        {/* Action parameters block */}
                        <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-3 space-y-2">
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-indigo-300 block font-mono">Recommended Action</span>
                          <p className="text-slate-200 leading-normal font-bold">
                            {ins.suggestedAction}
                          </p>
                        </div>

                        {/* Timestamp line */}
                        <div className="flex justify-between items-center text-[9px] text-slate-550 border-t border-slate-900/80 pt-2.5 font-mono">
                          <span>Sector: {ins.affectedCategory}</span>
                          <span>Triage: {new Date(ins.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            <Card variant="glass" className="p-6 space-y-5">
              <div className="flex items-center space-x-2">
                <Activity className="w-4.5 h-4.5 text-indigo-400" />
                <h3 className="text-sm font-extrabold text-white">Recent Activity</h3>
              </div>

              <div className="space-y-3.5">
                {issues.slice(0, 4).map((issue) => {
                  const city = getCityLabel(issue.location);
                  return (
                    <div 
                      key={issue.id} 
                      onClick={() => setSelectedIssue(issue)}
                      className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-900/10 hover:bg-slate-900/30 border border-slate-900/80 hover:border-slate-800 transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-center shrink-0">
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
      </main>

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
              className="fixed inset-0 bg-slate-955/80 backdrop-blur-sm z-50 cursor-pointer"
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
                    <div className="absolute bottom-3 left-3 bg-slate-950/90 backdrop-blur-sm border border-slate-900 text-[10px] font-bold text-slate-205 px-2.5 py-1 rounded-full flex items-center gap-1">
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

                {/* Description */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-550 uppercase tracking-wider block font-mono">Description</span>
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
                        <p className="text-slate-400">
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

                {/* AI Dispatch Assessment Overhauled as ChatGPT-style Assistant Card */}
                {selectedIssue.aiAnalysis && (
                  <div className="bg-slate-950 border border-indigo-500/15 rounded-2xl p-5 space-y-4 shadow-xl">
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
                        <span className="text-slate-500 block uppercase font-bold">Category</span>
                        <span className="font-bold text-white mt-0.5 block">{selectedIssue.aiAnalysis.category}</span>
                      </div>
                      <div className="bg-slate-900/60 border border-slate-900 p-2.5 rounded-xl">
                        <span className="text-slate-500 block uppercase font-bold">Estimated Cost</span>
                        <span className="font-bold text-white mt-0.5 block">{selectedIssue.aiAnalysis.estimatedCost}</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-slate-300 font-semibold leading-relaxed text-xs">
                      <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-wide font-mono block">Analysis Reasoning</span>
                      <p>{selectedIssue.aiAnalysis.explanation}</p>
                    </div>

                    <div className="bg-indigo-950/20 border border-indigo-900/30 p-3 rounded-xl space-y-2">
                      <span className="text-[9px] font-extrabold text-indigo-350 uppercase tracking-wider font-mono block">Recommended Action</span>
                      <p className="text-slate-100 font-bold text-xs leading-normal">
                        {selectedIssue.aiAnalysis.recommendedAction}
                      </p>
                    </div>

                    <div className="flex justify-between items-center text-[9px] text-slate-500 border-t border-slate-900/80 pt-2.5 font-mono">
                      <span>Triage: Priority Code {selectedIssue.aiAnalysis.priority}</span>
                      <span>{new Date(selectedIssue.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}

                {/* AI Priority Agent Block Overhauled as ChatGPT-style Assistant Card */}
                <div className="bg-slate-950 border border-indigo-500/15 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-extrabold text-white tracking-tight">AI Priority Agent</span>
                    </div>
                    <Button
                      onClick={() => runPriorityAgent(selectedIssue)}
                      loading={isCalculatingPriority}
                      variant="outline"
                      size="sm"
                      className="px-2.5 py-1 h-7 text-[10px] font-bold"
                    >
                      {selectedIssue.priorityScore !== undefined ? "Re-evaluate" : "Calculate"}
                    </Button>
                  </div>

                  {/* Skeletons loader if priority agent is running */}
                  {isCalculatingPriority ? (
                    <div className="space-y-3 animate-pulse py-1">
                      <div className="h-8 bg-slate-900 rounded"></div>
                      <div className="h-3 bg-slate-900 rounded w-5/6"></div>
                      <div className="h-3 bg-slate-900 rounded w-2/3"></div>
                    </div>
                  ) : selectedIssue.priorityScore !== undefined ? (
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between bg-slate-900/60 border border-slate-900 p-3 rounded-xl font-mono">
                        <div>
                          <span className="text-[9px] text-indigo-305 font-bold uppercase block">Priority Level</span>
                          <span className={`text-xs font-black flex items-center gap-1 mt-0.5 ${
                            selectedIssue.priorityLevel === "Critical" ? "text-red-400" :
                            selectedIssue.priorityLevel === "High" ? "text-orange-400" :
                            selectedIssue.priorityLevel === "Medium" ? "text-amber-400" : "text-emerald-400"
                          }`}>
                            {selectedIssue.priorityLevel}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-indigo-305 font-bold uppercase block">Triage Score</span>
                          <span className="text-sm font-black text-indigo-100 block mt-0.5">
                            {selectedIssue.priorityScore} / 100
                          </span>
                        </div>
                      </div>

                      {/* Score Bar */}
                      <div className="space-y-1">
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              selectedIssue.priorityScore >= 81 ? "bg-red-500" :
                              selectedIssue.priorityScore >= 61 ? "bg-orange-500" :
                              selectedIssue.priorityScore >= 41 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${selectedIssue.priorityScore}%` }}
                          />
                        </div>
                      </div>

                      {selectedIssue.priorityReasoning && (
                        <div className="space-y-1 pt-1.5 leading-relaxed text-slate-300 font-semibold italic">
                          <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider font-mono not-italic block">Dispatch Rationale</span>
                          <p>"{selectedIssue.priorityReasoning}"</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-slate-900/30 border border-slate-900 rounded-2xl space-y-2">
                      <p className="text-xs text-slate-400">No AI Priority assigned yet.</p>
                      <p className="text-[9.5px] text-slate-500 max-w-[285px] mx-auto font-semibold leading-normal font-mono">
                        Evaluate Defect class, Severity, and Issue age with Gemini to assign priority.
                      </p>
                    </div>
                  )}
                </div>

                {/* AI Resolution Verification Block Overhauled as ChatGPT-style Assistant Card */}
                <div className="space-y-4 pt-4 border-t border-slate-900">
                  <span className="text-xs font-bold text-slate-550 uppercase tracking-wider block font-mono">AI Resolution Verification</span>

                  {selectedIssue.resolutionVerification ? (
                    <div className="bg-slate-950 border border-indigo-500/15 rounded-2xl p-5 space-y-4 shadow-xl">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-emerald-450">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-extrabold text-white tracking-tight">Gemini Vision Verification</span>
                        </div>
                        <Badge variant="brand" className="font-mono text-[9px]">
                          Match Rate: {selectedIssue.resolutionVerification.confidenceScore}%
                        </Badge>
                      </div>

                      <div className="space-y-1 text-slate-350 font-semibold leading-relaxed text-xs">
                        <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-wide font-mono block">Verification Audit Explanation</span>
                        <p>{selectedIssue.resolutionVerification.explanation}</p>
                      </div>

                      {selectedIssue.resolutionImage && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-bold text-slate-500 uppercase font-mono block">Post-Repair Evidence</span>
                          <div className="relative rounded-xl overflow-hidden border border-slate-900 aspect-video bg-slate-900">
                            <img 
                              src={selectedIssue.resolutionImage} 
                              alt="Resolution proof" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        </div>
                      )}

                      <div className="text-[9px] text-slate-500 font-mono flex justify-between items-center pt-2.5 border-t border-slate-900/80">
                        <span>Outcome: <b className="text-slate-300">{selectedIssue.resolutionVerification.status}</b></span>
                        <button 
                          onClick={() => {
                            updateFirestoreIssue(selectedIssue.id, {
                              resolutionVerification: undefined,
                              resolutionImage: undefined
                            }).then(() => {
                              setSelectedIssue({
                                ...selectedIssue,
                                resolutionVerification: undefined,
                                resolutionImage: undefined
                              });
                            });
                          }}
                          className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline cursor-pointer"
                        >
                          Re-Verify
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900/10 border border-slate-900 rounded-2xl p-4 space-y-3">
                      <p className="text-xs text-slate-450 text-center leading-relaxed font-medium">
                        Upload a post-repair verification image to let Gemini Vision confirm the resolution status.
                      </p>

                      {resolutionBase64 ? (
                        <div className="space-y-3">
                          <div className="relative rounded-xl overflow-hidden border border-slate-900 aspect-video bg-slate-900">
                            <img 
                              src={resolutionBase64} 
                              alt="Resolution preview" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              onClick={() => {
                                setResolutionFile(null);
                                setResolutionBase64("");
                              }}
                              className="absolute top-2 right-2 bg-slate-950/80 hover:bg-slate-950 text-white p-1 rounded-full text-[10px] w-6 h-6 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>

                          {resolutionError && (
                            <p className="text-xs text-red-400 font-semibold text-center">{resolutionError}</p>
                          )}

                          <Button
                            onClick={handleVerifyResolution}
                            loading={verifyingResolution}
                            variant="primary"
                            className="w-full py-2.5 text-xs rounded-xl"
                          >
                            Run AI Verification
                          </Button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => resolutionFileInputRef.current?.click()}
                          className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 text-center cursor-pointer transition-colors space-y-2 bg-slate-950/30 hover:bg-slate-950/50"
                        >
                          <Upload className="w-6 h-6 text-slate-500 mx-auto" />
                          <div className="text-xs text-slate-300">
                            <span className="font-bold text-indigo-400 hover:underline">Click to upload</span> or drag and drop
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono">PNG, JPG, WEBP up to 5MB</p>
                          <input 
                            type="file" 
                            ref={resolutionFileInputRef}
                            onChange={handleResolutionFileChange}
                            accept="image/*"
                            className="hidden" 
                          />
                        </div>
                      )}
                      
                      {resolutionError && !resolutionBase64 && (
                        <p className="text-xs text-red-400 font-semibold text-center">{resolutionError}</p>
                      )}
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
                        {["Under Review", "Assigned", "In Progress", "Resolved", "Verified & Closed"].map((status) => (
                          <Button
                            key={status}
                            id={`status-update-${status.replace(/\s+/g, "-")}`}
                            onClick={() => handleUpdateStatus(selectedIssue.id, status)}
                            disabled={updatingStatus === selectedIssue.id}
                            variant={selectedIssue.status === status ? "primary" : "secondary"}
                            size="sm"
                            className={`rounded-xl justify-center ${status === "Verified & Closed" ? "col-span-2" : ""}`}
                            leftIcon={selectedIssue.status === status ? <Check className="w-3.5 h-3.5 text-white" /> : undefined}
                          >
                            <span>{status}</span>
                          </Button>
                        ))}
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
    </div>
  );
}
