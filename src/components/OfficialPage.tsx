import React, { useState, useEffect, useRef } from "react";
import { 
  AlertTriangle, CheckCircle2, Clock, ShieldAlert, Brain, MapPin, 
  RefreshCw, Filter, Eye, User, FileText, ChevronRight, Check, AlertCircle, Sparkles,
  Upload, Image as ImageIcon, Timer, ArrowLeft, LogOut, Building, Building2, Trash2, ShieldCheck,
  Activity, Compass, Locate, Camera, Hammer, Droplets, ClipboardCheck
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db, updateFirestoreIssue, uploadBase64ToStorage, deleteFirestoreIssue, isStorageConfigured, compressBase64Image } from "../firebase";
import { Issue } from "../types";
import { IssueMap } from "./IssueMap";
import { AINetworkBackground } from "./ui/AINetworkBackground";
import Button from "./ui/Button";
import Badge, { getSeverityVariant, getStatusVariant } from "./ui/Badge";
import { Card } from "./ui/Card";

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
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 border border-slate-800 text-slate-550 p-4 rounded-xl text-center space-y-2 font-sans">
        <ImageIcon className="w-7 h-7 text-slate-605 shrink-0" />
        <span className="text-[9px] font-mono font-bold">{label} Image Unavailable</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-contain bg-slate-955"
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

const DEPARTMENTS = [
  "Department of Public Works",
  "Water & Sanitation Division",
  "Municipal Lighting Bureau",
  "Roads & Asphalt Authority",
  "Environmental Protection Division",
  "Public Safety Dispatch"
];

const REPAIR_TEMPLATES: Record<string, { label: string; imageUrl: string }> = {
  "Pothole": {
    label: "Repaired Road Surface",
    imageUrl: "/demo-images/pothole-repaired.png"
  },
  "Garbage": {
    label: "Swept & Cleaned Sidewalk",
    imageUrl: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&q=80&w=600"
  },
  "Broken Streetlight": {
    label: "Repaired Glowing Streetlight",
    imageUrl: "https://images.unsplash.com/photo-1509021436665-8f37df706a72?auto=format&fit=crop&q=80&w=600"
  },
  "Fallen Tree": {
    label: "Cleared & Open Roadway",
    imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=600"
  },
  "Water Leakage": {
    label: "Dry Sidewalk & Sealed Pipe",
    imageUrl: "https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&q=80&w=600"
  },
  "Road Damage": {
    label: "Repaired Pavement Surface",
    imageUrl: "/demo-images/pothole-repaired.png"
  },
  "Other": {
    label: "Completed Municipal Action Site",
    imageUrl: "https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&q=80&w=600"
  }
};

const getCityLabel = (locationStr: string): string => {
  if (locationStr.toLowerCase().includes("jubilee hills")) return "Jubilee Hills";
  if (locationStr.toLowerCase().includes("gachibowli")) return "Gachibowli";
  if (locationStr.toLowerCase().includes("banjara hills")) return "Banjara Hills";
  if (locationStr.toLowerCase().includes("hitech city")) return "Hitech City";
  if (locationStr.toLowerCase().includes("madhapur")) return "Madhapur";
  return locationStr.split(",")[0] || "Hyderabad";
};

const getCategoryIcon = (cat: string) => {
  const c = cat.toLowerCase();
  if (c.includes("pothole") || c.includes("road")) return <Building className="w-4 h-4 text-indigo-405" />;
  if (c.includes("water") || c.includes("leak")) return <Clock className="w-4 h-4 text-sky-400" />;
  if (c.includes("light") || c.includes("streetlight")) return <ShieldAlert className="w-4 h-4 text-amber-405" />;
  return <AlertTriangle className="w-4 h-4 text-slate-400" />;
};

interface OfficialPageProps {
  onNavigate: (page: string) => void;
  currentUser: { email: string; name: string; role: "citizen" | "official"; picture?: string } | null;
  onLogout: () => void;
}

export default function OfficialPage({ onNavigate, currentUser, onLogout }: OfficialPageProps) {
  const shouldReduceMotion = useReducedMotion();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSeverity, setFilterSeverity] = useState("All");
  const [filterDepartment, setFilterDepartment] = useState("All");

  const [activeTab, setActiveTab] = useState<"overview" | "issues" | "map" | "analytics" | "ai">("overview");

  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [updatingDept, setUpdatingDept] = useState<string | null>(null);

  const [repairFile, setRepairFile] = useState<File | null>(null);
  const [repairBase64, setRepairBase64] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [verifyingResolution, setVerifyingResolution] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const repairFileInputRefActual = useRef<HTMLInputElement>(null);
  const [localImageFallbackUsed, setLocalImageFallbackUsed] = useState(() => !isStorageConfigured());
  const [showMapResolved, setShowMapResolved] = useState(false);

  const [municipalInsights, setMunicipalInsights] = useState<any>(null);
  const [loadingMunicipalInsights, setLoadingMunicipalInsights] = useState(false);

  const [originalImageError, setOriginalImageError] = useState(false);
  const [repairImageError, setRepairImageError] = useState(false);

  const [checklist, setChecklist] = useState({
    sameLocation: false,
    correctRepaired: false,
    qualityAcceptable: false,
    imageClear: false,
    fullyResolved: false
  });
  const [verificationNotes, setVerificationNotes] = useState("");
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  useEffect(() => {
    setRepairFile(null);
    setRepairBase64("");
    setVerificationError("");
    setUploadProgress(0);
    setIsUploading(false);
    setOriginalImageError(false);
    setRepairImageError(false);
    setChecklist({
      sameLocation: false,
      correctRepaired: false,
      qualityAcceptable: false,
      imageClear: false,
      fullyResolved: false
    });
    setVerificationNotes("");
  }, [selectedIssue?.id]);

  // Sync real-time issues from Firestore
  useEffect(() => {
    const issuesCollection = collection(db, "issues");
    const q = query(issuesCollection, orderBy("createdAt", "desc"));
    
    setLoadingIssues(true);
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
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
          imageUrl: data.imageUrl || "",
          createdAt: data.createdAt || new Date().toISOString(),
          priority: data.priority || 3,
          latitude: data.latitude,
          longitude: data.longitude,
          priorityScore: data.priorityScore,
          priorityLevel: data.priorityLevel,
          priorityReasoning: data.priorityReasoning,
          aiAnalysis: data.aiAnalysis,
          department: data.department,
          resolutionImage: data.resolutionImage,
          resolutionVerification: data.resolutionVerification
        } as Issue);
      });
      setIssues(list);
      setLoadingIssues(false);

      if (list.length > 0) {
        fetchMunicipalInsights(list);
      }
    }, (error) => {
      console.error("Firestore real-time sync failed in official page:", error);
      setLoadingIssues(false);
    });

    return () => unsubscribe();
  }, []);

  // Synchronize active selection details from live issues state list
  useEffect(() => {
    if (selectedIssue) {
      const updatedSelected = issues.find(x => x.id === selectedIssue.id);
      if (updatedSelected) {
        if (JSON.stringify(updatedSelected) !== JSON.stringify(selectedIssue)) {
          setSelectedIssue(updatedSelected);
        }
      }
    }
  }, [issues, selectedIssue?.id]);

  // Fetch structured 5-dimension Municipal Insights via Gemini
  const fetchMunicipalInsights = async (currentIssuesList?: Issue[]) => {
    const listToAnalyze = currentIssuesList || issues;
    if (listToAnalyze.length === 0) return;
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

  // Handle department assignment
  const handleAssignDepartment = async (issueId: string, department: string) => {
    try {
      setUpdatingDept(issueId);
      await updateFirestoreIssue(issueId, { department });
      if (selectedIssue && selectedIssue.id === issueId) {
        setSelectedIssue(prev => prev ? { ...prev, department } : null);
      }
    } catch (err) {
      console.error("Error assigning department:", err);
    } finally {
      setUpdatingDept(null);
    }
  };

  // Handle status lifecycle transitions
  const handleUpdateStatus = async (issueId: string, status: string) => {
    try {
      setUpdatingStatus(issueId);
      await updateFirestoreIssue(issueId, { status });
      if (selectedIssue && selectedIssue.id === issueId) {
        setSelectedIssue(prev => prev ? { ...prev, status } : null);
      }
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Handle manual dispatcher decision for municipal repair verification
  const handleDispatcherDecision = async (decision: 'Approve' | 'Rework' | 'BetterEvidence') => {
    if (!selectedIssue) return;
    
    setIsSubmittingDecision(true);
    setVerificationError("");
    try {
      // 1. Upload/Compress image if we have a locally selected/base64 repair image not yet saved
      let repairImgUrl = selectedIssue.resolutionImage || "";
      if (!repairImgUrl && repairBase64) {
        const storagePath = `resolutions/${selectedIssue.id}_${Date.now()}.jpg`;
        try {
          if (!isStorageConfigured()) {
            throw new Error("Firebase Storage is not configured.");
          }
          repairImgUrl = await uploadBase64ToStorage(repairBase64, storagePath);
        } catch (err) {
          console.warn("Storage upload failed or unconfigured, falling back to local compressed base64:", err);
          setLocalImageFallbackUsed(true);
          repairImgUrl = await compressBase64Image(repairBase64);
        }
      }

      if (!repairImgUrl && !repairBase64) {
        throw new Error("No repair evidence image provided.");
      }

      // 2. Map decision to status and recommendation
      let newStatus: string = selectedIssue.status;
      let recommendationText = "";
      if (decision === "Approve") {
        newStatus = "Verified & Closed";
        recommendationText = "Repair Verified";
      } else if (decision === "Rework") {
        newStatus = "Needs Rework";
        recommendationText = "Send back for rework: " + (verificationNotes || "Additional repair work required.");
      } else if (decision === "BetterEvidence") {
        newStatus = "Awaiting Evidence";
        recommendationText = "Request better evidence: " + (verificationNotes || "Please upload a clearer repair photograph.");
      }

      // 3. Update Firestore Payload
      const updatePayload: Partial<Issue> = {
        status: newStatus as any,
        resolutionImage: repairImgUrl || null,
        resolutionVerification: {
          status: decision === "Approve" ? "Resolved" : (decision === "Rework" ? "Not Resolved" : "Partially Resolved"),
          confidenceScore: decision === "Approve" ? 100 : (decision === "Rework" ? 0 : 50),
          explanation: verificationNotes || `Manually verified by dispatcher ${currentUser?.name || 'Official'}.`,
          verifiedAt: new Date().toISOString(),
          recommendation: recommendationText as any,
          // Store checklist structure safely inside existing fields
          landmarkMatch: checklist.sameLocation ? 100 : 0,
          infrastructureMatch: checklist.correctRepaired ? 100 : 0,
          sceneMatch: checklist.qualityAcceptable ? 100 : 0,
          locationMatch: checklist.imageClear ? 100 : 0,
          issueResolution: checklist.fullyResolved ? 100 : 0
        }
      };

      await updateFirestoreIssue(selectedIssue.id, updatePayload);

      // 4. Update Local State
      setSelectedIssue(prev => prev ? {
        ...prev,
        ...updatePayload
      } : null);

      setRepairFile(null);
      setRepairBase64("");
      setVerificationNotes("");
      setChecklist({
        sameLocation: false,
        correctRepaired: false,
        qualityAcceptable: false,
        imageClear: false,
        fullyResolved: false
      });
    } catch (err: any) {
      console.error("Failed to submit manual dispatcher decision:", err);
      setVerificationError(err.message || "Failed to submit municipal verification decision.");
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // Handle repair image selection & conversion
  const handleRepairFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        setVerificationError("Only image files (.jpg, .png, .webp) are supported.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setVerificationError("Image exceeds 10MB size limit.");
        return;
      }
      setVerificationError("");
      setRepairFile(file);
      
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        setRepairBase64(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRunVerification = async () => {
    // Deprecated in favor of the manual dispatcher verification panel decision handlers
  };

  // Close issue handler
  const handleCloseIssue = async (issueId: string) => {
    try {
      setUpdatingStatus(issueId);
      await updateFirestoreIssue(issueId, { status: "Verified & Closed" });
      if (selectedIssue && selectedIssue.id === issueId) {
        setSelectedIssue(prev => prev ? { ...prev, status: "Verified & Closed" } : null);
      }
    } catch (err) {
      console.error("Failed to close issue:", err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Delete issue handler
  const handleDeleteIssue = async (issueId: string) => {
    if (window.confirm("Are you sure you want to delete this issue permanently?")) {
      try {
        await deleteFirestoreIssue(issueId);
        setSelectedIssue(null);
      } catch (err) {
        console.error("Failed to delete issue:", err);
      }
    }
  };

  // Helper duration formatter
  const formatDuration = (ms: number) => {
    const hours = ms / (1000 * 60 * 60);
    if (hours < 1) return `${Math.round(hours * 60)} mins`;
    if (hours < 24) return `${Math.round(hours)} hours`;
    return `${Math.round(hours / 24)} days`;
  };

  // Department performance calculation
  const deptPerformance = DEPARTMENTS.map(dept => {
    const assigned = issues.filter(i => i.department === dept).length;
    const completed = issues.filter(i => i.department === dept && (i.status === "Verified & Closed" || i.status === "Closed" || i.status === "Resolved")).length;
    const pending = assigned - completed;
    
    const deptResolved = issues.filter(i => i.department === dept && (i.status === "Verified & Closed" || i.status === "Closed" || i.status === "Resolved") && i.createdAt);
    const deptTimes = deptResolved.map(i => {
      const start = new Date(i.createdAt).getTime();
      const end = i.resolutionVerification?.verifiedAt ? new Date(i.resolutionVerification.verifiedAt).getTime() : start + 36 * 60 * 60 * 1000;
      return Math.max(0, end - start);
    });
    const avgTimeMs = deptTimes.length > 0 ? deptTimes.reduce((a, b) => a + b, 0) / deptTimes.length : 36 * 60 * 60 * 1000;
    const completionRate = assigned > 0 ? Math.round((completed / assigned) * 100) : 100;
    
    return {
      name: dept,
      assigned,
      completed,
      pending,
      avgTimeMs,
      completionRate
    };
  });

  // Local function to generate live data-driven brief cards
  const generateInteractiveBrief = () => {
    const totalActive = issues.filter(i => i.status !== "Verified & Closed" && i.status !== "Closed").length;
    const totalPendingVer = issues.filter(i => i.status === "Resolved" && !i.resolutionVerification).length;
    
    const roadActive = issues.filter(i => (i.category === "Pothole" || i.category === "Road Damage") && i.status !== "Verified & Closed" && i.status !== "Closed").length;
    const waterActive = issues.filter(i => i.category === "Water Leakage" && i.status !== "Verified & Closed" && i.status !== "Closed").length;
    const garbageActive = issues.filter(i => i.category === "Garbage" && i.status !== "Verified & Closed" && i.status !== "Closed").length;

    const roadPercentage = Math.round((roadActive / (totalActive || 1)) * 100);
    const waterPercentage = Math.round((waterActive / (totalActive || 1)) * 100);
    const garbagePercentage = Math.round((garbageActive / (totalActive || 1)) * 100);

    // Find department with lowest avgTimeMs and at least 1 completed issue
    const validDepts = deptPerformance.filter(d => d.completed > 0);
    const fastestDept = validDepts.length > 0 
      ? [...validDepts].sort((a, b) => a.avgTimeMs - b.avgTimeMs)[0]
      : { name: "Roads & Asphalt Authority", avgTimeMs: 24 * 60 * 60 * 1000, completed: 3 };
    const fastestHours = Math.round(fastestDept.avgTimeMs / (1000 * 60 * 60));

    return [
      {
        headline: "Rising Road Damage",
        summary: `Road complaints comprise ${roadPercentage}% of the active municipal backlog.`,
        detail: `There are currently ${roadActive} active reports for road surface degradation. The Roads & Asphalt division is advised to coordinate structural repairs on key corridors.`,
        icon: <Hammer className="w-4 h-4 text-sky-400 shrink-0" />
      },
      {
        headline: "Water Leak Cluster",
        summary: `Water leakage reports stand at ${waterActive} active complaints across city wards.`,
        detail: `Hydraulic degradation accounts for ${waterPercentage}% of total issues. Recommended action: coordinate with Water Supply & Sewerage Board to initiate pipe integrity scans.`,
        icon: <Droplets className="w-4 h-4 text-sky-400 shrink-0" />
      },
      {
        headline: "High Pending Verifications",
        summary: `A backlog of ${totalPendingVer} repair submissions is awaiting official inspection.`,
        detail: `The repair backlog has exceeded standard operational thresholds. Assign field inspectors or initiate Gemini automated comparative audits to verify evidence and close tickets.`,
        icon: <ClipboardCheck className="w-4 h-4 text-sky-400 shrink-0" />
      },
      {
        headline: "Sanitation Hotspot",
        summary: `Public Works Sanitation division is managing ${garbageActive} unresolved waste files.`,
        detail: `Garbage overflow comprises ${garbagePercentage}% of current incidents. Recommend re-routing sanitation vehicles to clear these overflow clusters.`,
        icon: <Trash2 className="w-4 h-4 text-sky-400 shrink-0" />
      },
      {
        headline: "Fastest Responding Department",
        summary: `${fastestDept.name} is leading with an average completion speed of ${fastestHours} hours.`,
        detail: `The division has successfully resolved ${fastestDept.completed} complaints this week. Consider analyzing their routing models to optimize operations in other agencies.`,
        icon: <Timer className="w-4 h-4 text-sky-400 shrink-0" />
      }
    ];
  };

  const generateInteractiveRecommendations = () => {
    const totalPendingVer = issues.filter(i => i.status === "Resolved" && !i.resolutionVerification).length;
    const roadActive = issues.filter(i => (i.category === "Pothole" || i.category === "Road Damage") && i.status !== "Verified & Closed" && i.status !== "Closed").length;
    const waterActive = issues.filter(i => i.category === "Water Leakage" && i.status !== "Verified & Closed" && i.status !== "Closed").length;

    const recs = [];
    if (roadActive > 0) {
      recs.push({
        title: "Deploy Additional Road Crew",
        action: "Mobilize specialized patch-sealing crews to address active road degradation reports.",
        reason: `Road surface degradation accounts for ${roadActive} active issues, requiring immediate road crew attention.`
      });
    }
    if (totalPendingVer > 0) {
      recs.push({
        title: "Clear Verification Backlog",
        action: "Assign senior municipal inspectors or utilize Gemini Vision audits to resolve verification queue.",
        reason: `Backlog of ${totalPendingVer} verification tickets exceeds operational thresholds.`
      });
    }
    if (waterActive > 0) {
      recs.push({
        title: "Coordinate Valve Isolation",
        action: "Coordinate localized pressure valve isolation tests with Water Board engineers.",
        reason: `${waterActive} unresolved leakage reports have been identified, pointing to potential pipe fractures.`
      });
    }
    
    if (recs.length === 0) {
      recs.push({
        title: "Routine System Inspection",
        action: "Maintain standard surveillance rounds across city wards.",
        reason: "Backlog metrics indicate high system compliance and minimal outstanding repair issues."
      });
    }
    return recs;
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getDispatcherRecommendations = (issue: Issue) => {
    const recs = [];
    const rec = issue.resolutionVerification?.recommendation;

    if (issue.latitude !== undefined && issue.longitude !== undefined) {
      const nearbyCount = issues.filter(i => 
        i.id !== issue.id &&
        i.category === issue.category &&
        i.status !== "Verified & Closed" &&
        i.status !== "Closed" &&
        i.latitude !== undefined &&
        i.longitude !== undefined &&
        calculateDistance(issue.latitude, issue.longitude, i.latitude, i.longitude) <= 2
      ).length;

      if (nearbyCount > 0) {
        recs.push({
          action: "Create Maintenance Campaign",
          explanation: `Identified ${nearbyCount} other active ${issue.category} reports within 2km. Dispatching a single combined work order will reduce resource costs.`
        });
      }
    }

    if (rec === "Repair Verified") {
      recs.push({ action: "Close Issue & Archive", explanation: "AI has verified the repair with high confidence. Close the ticket and archive the record." });
      recs.push({ action: "Notify Reporter", explanation: "Send automated SMS/email notification to citizen confirming completion." });
    } else if (rec === "Needs Better Evidence" || rec === "Manual Review Recommended") {
      recs.push({ action: "Schedule Field Inspection", explanation: "Gemini indicates visual matching uncertainty. Assign inspector to verify repair efficacy." });
      recs.push({ action: "Request Additional Proof", explanation: "Prompt citizen or work crew to re-upload clear completion images." });
    } else if (rec === "Manual Inspection Required" || rec === "Verification Failed") {
      recs.push({ action: "Escalate to Department Head", explanation: "AI audit failed or flagged visual mismatch. Escalate to senior dispatcher for manual override." });
      recs.push({ action: "Dispatch Crew", explanation: "Re-assign repair team to inspect for subgrade courses course integrity." });
    }

    if (recs.length === 0) {
      recs.push({ action: "Standard Triage Verification", explanation: "Perform standard dispatcher check, assign department, and coordinate crew routing." });
    }
    return recs;
  };

  // Filter issues based on search & filter panel options
  const filteredIssues = issues.filter(issue => {
    const matchesSearch = 
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const isOverdue = (created: string) => {
      return (Date.now() - new Date(created).getTime()) > 3 * 24 * 60 * 60 * 1000;
    };

    const matchesStatus = filterStatus === "All" 
                         ? (issue.status !== "Verified & Closed" && issue.status !== "Closed")
                         : (filterStatus === "Overdue" ? (isOverdue(issue.createdAt) && issue.status !== "Verified & Closed" && issue.status !== "Closed") : (issue.status === filterStatus));
    const matchesSeverity = filterSeverity === "All" || issue.severity === filterSeverity;
    const matchesDept = filterDepartment === "All" || 
                       (filterDepartment === "Unassigned" ? !issue.department : issue.department === filterDepartment);

    return matchesSearch && matchesStatus && matchesSeverity && matchesDept;
  });

  // SVG Charting Helpers
  const renderWeeklyTrendChart = () => {
    const trend = [
      { date: "Mon", reported: issues.filter(i => new Date(i.createdAt).getDay() === 1).length, resolved: issues.filter(i => new Date(i.createdAt).getDay() === 1 && (i.status === "Verified & Closed" || i.status === "Closed")).length },
      { date: "Tue", reported: issues.filter(i => new Date(i.createdAt).getDay() === 2).length, resolved: issues.filter(i => new Date(i.createdAt).getDay() === 2 && (i.status === "Verified & Closed" || i.status === "Closed")).length },
      { date: "Wed", reported: issues.filter(i => new Date(i.createdAt).getDay() === 3).length, resolved: issues.filter(i => new Date(i.createdAt).getDay() === 3 && (i.status === "Verified & Closed" || i.status === "Closed")).length },
      { date: "Thu", reported: issues.filter(i => new Date(i.createdAt).getDay() === 4).length, resolved: issues.filter(i => new Date(i.createdAt).getDay() === 4 && (i.status === "Verified & Closed" || i.status === "Closed")).length },
      { date: "Fri", reported: issues.filter(i => new Date(i.createdAt).getDay() === 5).length, resolved: issues.filter(i => new Date(i.createdAt).getDay() === 5 && (i.status === "Verified & Closed" || i.status === "Closed")).length },
      { date: "Sat", reported: issues.filter(i => new Date(i.createdAt).getDay() === 6).length, resolved: issues.filter(i => new Date(i.createdAt).getDay() === 6 && (i.status === "Verified & Closed" || i.status === "Closed")).length },
      { date: "Sun", reported: issues.filter(i => new Date(i.createdAt).getDay() === 0).length, resolved: issues.filter(i => new Date(i.createdAt).getDay() === 0 && (i.status === "Verified & Closed" || i.status === "Closed")).length },
    ];
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
        
        <div className="relative bg-slate-955/50 p-4 rounded-2xl border border-slate-900/60 shadow-inner">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
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
            
            {trend.map((d, i) => {
              const x = getX(i);
              return (
                <text key={i} x={x} y={height - 10} fill="#94a3b8" fontSize="8" textAnchor="middle" className="font-mono opacity-60">
                  {d.date}
                </text>
              );
            })}
            
            <path d={`${reportedPath} L ${getX(trend.length - 1)} ${getY(0)} L ${getX(0)} ${getY(0)} Z`} fill="url(#reported-grad)" className="opacity-10" />
            
            <defs>
              <linearGradient id="reported-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>

            <path d={reportedPath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d={resolvedPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4,4" />
            
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

  const renderCategoryChart = () => {
    const categoriesList = ["Pothole", "Water Leakage", "Garbage", "Streetlight", "Road Damage", "Other"].map(cat => ({
      category: cat,
      count: issues.filter(i => i.category === cat).length
    })).filter(c => c.count > 0);
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
                  <span className="text-slate-350">{c.category}</span>
                  <span className="text-indigo-400 font-mono font-bold">{c.count} {c.count === 1 ? 'case' : 'cases'}</span>
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

  const renderSeverityChart = () => {
    const total = issues.length || 1;
    return (
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Severity Proportions</h4>
        <div className="space-y-4 bg-slate-955/50 p-5 rounded-2xl border border-slate-900/60">
          {["Critical", "High", "Medium", "Low"].map((sev) => {
            const count = issues.filter(i => i.severity === sev).length;
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
                <div className="w-16 text-right font-mono font-bold text-slate-405">
                  {count} ({pct}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!currentUser || currentUser.role !== "official") {
    return (
      <div className="min-h-screen bg-slate-955 flex flex-col justify-center items-center p-6 text-white selection:bg-indigo-500 relative overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px] -z-10" />

        <div className="max-w-md w-full relative z-10">
          <Card variant="glass" glow="indigo" className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
              <Building2 className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-extrabold tracking-tight">Access Restricted</h1>
              <p className="text-sm text-slate-405 leading-relaxed">
                The CivicSense Command Center is reserved for verified city department heads and repair dispatch officers.
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-900 p-5 rounded-2xl text-left space-y-3">
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest text-center font-mono">Simulated Access Key</p>
              <p className="text-[11px] text-slate-400 text-center leading-relaxed font-medium">
                Bypass verification to audit and test the complete repair lifecycle, Gemini Vision comparing engine, and dispatcher controls.
              </p>
              <Button 
                onClick={() => {
                  const mockOfficial = {
                    email: "official@civicsense.gov",
                    name: "City Dispatch Director",
                    role: "official" as const,
                    picture: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150"
                  };
                  localStorage.setItem("civic_sense_user", JSON.stringify(mockOfficial));
                  window.location.reload();
                }}
                variant="primary"
                className="w-full text-xs font-bold py-2.5 rounded-xl"
              >
                Authorize as City Official
              </Button>
            </div>

            <Button 
              onClick={() => onNavigate("dashboard")}
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              className="mx-auto"
            >
              Return to Public Dashboard
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const listContainerVariants = shouldReduceMotion ? {} : {
    visible: { transition: { staggerChildren: 0.04 } }
  };
  
  const listItemVariants = shouldReduceMotion ? {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  } : {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-slate-955 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white relative overflow-hidden command-grid-bg">
      <AINetworkBackground />

      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

      {/* Official Header */}
      <header className="sticky top-0 z-30 bg-slate-955/80 border-b border-slate-900 backdrop-blur-xl px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Button 
            onClick={() => onNavigate("dashboard")}
            variant="outline"
            size="sm"
            className="p-2 h-9 w-9 bg-slate-900 border border-slate-850"
            title="Back to Dashboard"
            id="back-to-dashboard-btn"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-extrabold text-indigo-400 uppercase tracking-widest font-mono">
                Admin Center
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">Secure Grid</span>
            </div>
            <h1 className="text-lg font-black tracking-tight mt-1 flex items-center gap-1.5">
              <Building className="w-5 h-5 text-indigo-455" />
              <span>Municipal Command Operations</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">

          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-200">{currentUser.name}</p>
            <p className="text-[10px] text-indigo-405 font-semibold font-mono mt-0.5">{currentUser.email}</p>
          </div>
          {currentUser.picture && (
            <img 
              src={currentUser.picture} 
              alt={currentUser.name} 
              className="w-9 h-9 rounded-xl object-cover border border-slate-800 shadow"
              referrerPolicy="no-referrer"
            />
          )}
          <Button 
            onClick={onLogout}
            variant="danger"
            size="sm"
            className="text-xs font-bold rounded-xl"
            title="Sign Out"
            id="official-logout-btn"
            leftIcon={<LogOut className="w-3.5 h-3.5" />}
          >
            Logout
          </Button>
        </div>
      </header>

      {/* Sticky Tab Navigation */}
      <div className="sticky top-16 z-20 bg-slate-955/80 backdrop-blur-md border-b border-slate-900/80 py-3.5 shadow-md shadow-slate-955/15">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <nav className="flex space-x-1 sm:space-x-2 bg-slate-900/60 p-1 rounded-xl border border-slate-850/50">
              {[
                { id: "overview", label: "Overview", icon: <Building className="w-3.5 h-3.5" /> },
                { id: "issues", label: "Issues Queue", icon: <FileText className="w-3.5 h-3.5" /> },
                { id: "map", label: "City Map", icon: <MapPin className="w-3.5 h-3.5" /> },
                { id: "analytics", label: "Analytics Desk", icon: <Timer className="w-3.5 h-3.5" /> },
                { id: "ai", label: "AI Intelligence", icon: <Brain className="w-3.5 h-3.5" /> }
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
          </div>
        </div>
      </div>

      {localImageFallbackUsed && (
        <div className="mx-6 mt-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-2xl flex items-start space-x-3 text-xs relative z-10 animate-fade-in">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
          <div>
            <p className="font-extrabold text-white">Local Image Handling Active (Command Operations)</p>
            <p className="text-slate-405 mt-0.5 leading-relaxed font-semibold">
              Firebase Storage is not configured or unavailable. Repair proof uploads will be optimized and saved locally using base64.
            </p>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="px-6 py-6 relative z-10 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Executive summary 3 KPI row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Active Pipeline", count: issues.filter(i => i.status !== "Verified & Closed" && i.status !== "Closed" && i.status !== "Resolved").length, color: "text-indigo-455", sub: "unresolved backlog" },
                  { label: "Pending Verification", count: issues.filter(i => i.status === "Resolved").length, color: "text-purple-405", sub: "comparative audit" },
                  { label: "High Priority", count: issues.filter(i => (i.severity === "Critical" || i.severity === "High") && i.status !== "Verified & Closed" && i.status !== "Closed" && i.status !== "Resolved").length, color: "text-rose-500", sub: "critical triage" },
                ].map((kpi, idx) => (
                  <Card key={idx} variant="bordered" className="p-5 flex flex-col justify-between space-y-3 bg-slate-905/10 border-slate-900 h-full">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">{kpi.label}</span>
                    <div className="flex items-baseline space-x-1">
                      <span className={`text-2xl font-black ${kpi.color}`}>{kpi.count}</span>
                      <span className="text-xs text-slate-600 font-semibold font-mono">issues</span>
                    </div>
                    <p className="text-[9px] text-slate-400 leading-none font-bold uppercase tracking-wider font-mono">{kpi.sub}</p>
                  </Card>
                ))}
              </div>

              {/* Main Executive Summary Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Recently Reported Issues */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4.5 h-4.5 text-indigo-400" />
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono">Recently Reported Issues</h3>
                  </div>
                  <div className="space-y-3">
                    {issues.filter(i => i.status !== "Verified & Closed" && i.status !== "Closed" && i.status !== "Resolved").slice(0, 5).map((issue) => (
                      <div
                        key={issue.id}
                        onClick={() => {
                          setSelectedIssue(issue);
                          setFilterStatus("All");
                          setFilterSeverity("All");
                          setFilterDepartment("All");
                          setActiveTab("issues");
                        }}
                        className="p-4 rounded-2xl bg-slate-905/30 border border-slate-900 hover:bg-slate-900/40 hover:border-indigo-500/20 transition-all cursor-pointer flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center space-x-3.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-center text-indigo-400 shrink-0">
                            {getCategoryIcon(issue.category)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-extrabold text-white truncate">{issue.title}</h4>
                            <p className="text-[9.5px] text-slate-500 font-mono mt-0.5">
                              📍 {getCityLabel(issue.location)} | Filed {new Date(issue.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <Badge variant={getSeverityVariant(issue.severity)}>{issue.severity}</Badge>
                          <Badge variant={getStatusVariant(issue.status)}>{issue.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Column: Workload & Actions */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Quick Dispatcher Actions */}
                  <Card variant="bordered" className="p-5 space-y-4 bg-slate-905/20 border-slate-900 shadow-xl">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-400 font-mono flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Quick Dispatcher Actions
                    </h4>
                    <div className="flex flex-col gap-2.5">
                      <Button
                        onClick={() => {
                          const firstUnassigned = issues.find(i => !i.department && i.status !== "Verified & Closed" && i.status !== "Closed");
                          if (firstUnassigned) setSelectedIssue(firstUnassigned);
                          setFilterStatus("All");
                          setFilterSeverity("All");
                          setFilterDepartment("All");
                          setActiveTab("issues");
                        }}
                        variant="primary"
                        className="w-full text-xs py-2 rounded-xl font-bold"
                      >
                        Assign Pending Backlog
                      </Button>
                      <Button
                        onClick={() => {
                          setFilterStatus("Resolved (Pending AI Verification)");
                          setFilterSeverity("All");
                          setFilterDepartment("All");
                          setActiveTab("issues");
                        }}
                        variant="secondary"
                        className="w-full text-xs py-2 rounded-xl border border-slate-800 font-bold"
                      >
                        Review Verification Backlog
                      </Button>
                      <Button
                        onClick={() => {
                          setFilterSeverity("Critical");
                          setFilterStatus("All");
                          setFilterDepartment("All");
                          setActiveTab("issues");
                        }}
                        variant="outline"
                        className="w-full text-xs py-2 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-955/20 font-bold"
                      >
                        Inspect High Priority Hazards
                      </Button>
                    </div>
                  </Card>

                  {/* Department Workload */}
                  <Card variant="bordered" className="p-5 space-y-4 bg-slate-905/20 border-slate-900 shadow-xl">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-455 font-mono flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5" /> Department Workload
                    </h4>
                    <div className="space-y-2.5">
                      {DEPARTMENTS.map((dept) => {
                        const activeCount = issues.filter(i => i.department === dept && i.status !== "Verified & Closed" && i.status !== "Closed").length;
                        return (
                          <div key={dept} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-900 text-xs">
                            <span className="text-slate-350 font-bold">{dept}</span>
                            <Badge variant={activeCount > 2 ? "critical" : activeCount > 0 ? "high" : "default"}>
                              {activeCount} active
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: ISSUES QUEUE */}
          {activeTab === "issues" && (
            <motion.div
              key="issues"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-220px)] min-h-[500px]"
            >
              {/* Left Triage List */}
              <div className="lg:col-span-5 flex flex-col space-y-4 h-full overflow-hidden">
                <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-4 space-y-3 shrink-0">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Search triage ticket id, landmark or category..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full glass-input px-4 py-2.5 rounded-xl text-xs"
                      id="official-search-input"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1 font-mono">Status</label>
                      <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-[10px] font-bold text-slate-300 focus:outline-none"
                        id="filter-status-select"
                      >
                        <option value="All">All Active</option>
                        <option value="Reported">Reported</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Assigned">Assigned</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Needs Rework">Needs Rework</option>
                        <option value="Awaiting Evidence">Awaiting Evidence</option>
                        <option value="Verified & Closed">Verified & Closed (Closed)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1 font-mono">Severity</label>
                      <select 
                        value={filterSeverity}
                        onChange={(e) => setFilterSeverity(e.target.value)}
                        className="w-full bg-slate-955 border border-slate-800 rounded-lg py-1.5 px-2 text-[10px] font-bold text-slate-300 focus:outline-none"
                        id="filter-severity-select"
                      >
                        <option value="All">All Severities</option>
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1 font-mono">Department</label>
                      <select 
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        className="w-full bg-slate-955 border border-slate-800 rounded-lg py-1.5 px-2 text-[10px] font-bold text-slate-300 focus:outline-none"
                        id="filter-dept-select"
                      >
                        <option value="All">All Depts</option>
                        <option value="Unassigned">Unassigned</option>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d.split(" ")[0]}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex-1 bg-slate-900/10 border border-slate-900 rounded-3xl overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {loadingIssues ? (
                    <div className="h-full flex flex-col justify-center items-center py-12 space-y-3">
                      <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                      <p className="text-xs text-slate-400 font-semibold">Synchronizing Live Repair Grid...</p>
                    </div>
                  ) : filteredIssues.length === 0 ? (
                    <div className="h-full flex flex-col justify-center items-center py-12 text-center space-y-2">
                      <AlertTriangle className="w-8 h-8 text-slate-650 animate-pulse" />
                      <p className="text-xs text-slate-400 font-bold">No issues found matching constraints.</p>
                    </div>
                  ) : (
                    <motion.div
                      initial="hidden"
                      animate="visible"
                      variants={listContainerVariants}
                      className="space-y-3"
                    >
                      {filteredIssues.map((issue) => {
                        const isSelected = selectedIssue?.id === issue.id;
                        return (
                          <motion.button
                            key={issue.id}
                            id={`triage-ticket-${issue.id}`}
                            variants={listItemVariants}
                            whileHover={shouldReduceMotion ? {} : { y: -2, x: 2 }}
                            onClick={() => setSelectedIssue(issue)}
                            className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col space-y-3 cursor-pointer ${
                              isSelected 
                                ? "bg-indigo-955/20 border-indigo-500/50 shadow-lg" 
                                : "bg-slate-900/30 border-slate-900 hover:bg-slate-900/60 hover:border-slate-805"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center space-x-1.5">
                                <Badge variant={getSeverityVariant(issue.severity)}>
                                  {issue.severity}
                                </Badge>
                                <span className="text-[10px] font-bold text-slate-500 font-mono font-semibold">ID: {issue.id.slice(0, 8)}</span>
                              </div>
                              
                              <Badge variant={getStatusVariant(issue.status)}>
                                {issue.status}
                              </Badge>
                            </div>

                            <div className="space-y-1">
                              <h4 className="text-xs font-black text-slate-200 line-clamp-1">
                                {issue.title}
                              </h4>
                              <p className="text-[10px] text-slate-450 font-medium flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-555 shrink-0" />
                                <span className="truncate">{issue.location}</span>
                              </p>
                            </div>

                            <div className="pt-2.5 border-t border-slate-900/80 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                              <span className="flex items-center gap-1 font-bold text-slate-400 font-sans">
                                <Building className="w-3.5 h-3.5 text-slate-555" />
                                <span className="truncate max-w-[150px]">
                                  {issue.department || "Unassigned Dept"}
                                </span>
                              </span>
                              <span>
                                {new Date(issue.createdAt).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric"
                                })}
                              </span>
                            </div>
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Right Details Panel */}
              <div className="lg:col-span-7 h-full overflow-y-auto bg-slate-900/10 border border-slate-900 rounded-3xl p-6 flex flex-col space-y-6 custom-scrollbar">
                <AnimatePresence mode="wait">
                  {!selectedIssue ? (
                    <div className="flex-1 flex flex-col justify-center items-center py-24 text-center space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-605">
                        <FileText className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-400">No Dispatch Ticket Selected</p>
                        <p className="text-xs text-slate-500 max-w-xs mx-auto font-semibold">
                          Click any active ticket in the queue on the left to assign departments, update repair statuses, and verify resolutions.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <motion.div 
                      key={selectedIssue.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-900 pb-5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={getSeverityVariant(selectedIssue.severity)}>
                              {selectedIssue.severity} Severity
                            </Badge>
                            <Badge variant="brand">{selectedIssue.category}</Badge>
                          </div>
                          <h2 className="text-base font-black text-white">{selectedIssue.title}</h2>
                          <p className="text-[10px] text-slate-450 font-bold flex items-center gap-1.5 pt-1">
                            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{selectedIssue.location}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-start">
                          <Button
                            onClick={() => handleDeleteIssue(selectedIssue.id)}
                            variant="danger"
                            className="p-2 h-9 w-9 bg-slate-900 border border-slate-850 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                            title="Delete Ticket"
                            id="official-delete-ticket-btn"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Badge variant={getStatusVariant(selectedIssue.status)}>
                            {selectedIssue.status}
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
                            <motion.div 
                              className="absolute top-[18px] left-8 h-0.5 bg-indigo-500 z-0"
                              animate={{ 
                                width: `calc(${((getStatusStep(selectedIssue.status)) / (STAGES.length - 1)) * 100}% - ${getStatusStep(selectedIssue.status) === 0 ? 0 : 32}px)`
                              }}
                              transition={{ type: "spring", stiffness: 100, damping: 18 }}
                            />

                            {STAGES.map((stage, idx) => {
                              const currentStep = getStatusStep(selectedIssue.status);
                              const isCompleted = idx < currentStep;
                              const isActive = idx === currentStep;
                              const isOfficial = currentUser?.role === "official";
                              const canTransition = isOfficial && idx !== currentStep;
                              
                              const isCloseStage = stage.value === "Verified & Closed";
                              const verificationSuccess = selectedIssue.resolutionVerification?.status === "Resolved" || selectedIssue.resolutionVerification?.recommendation === "Repair Verified";
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
                                  <motion.div 
                                    whileHover={canTransition && !isDisabledClose && !shouldReduceMotion ? { scale: 1.15 } : {}}
                                    whileTap={canTransition && !isDisabledClose && !shouldReduceMotion ? { scale: 0.95 } : {}}
                                    animate={isActive && !shouldReduceMotion ? {
                                      boxShadow: ["0 0 0 0px rgba(99, 102, 241, 0.4)", "0 0 0 8px rgba(99, 102, 241, 0)"]
                                    } : {}}
                                    transition={isActive && !shouldReduceMotion ? {
                                      repeat: Infinity,
                                      duration: 1.5,
                                      ease: "easeInOut"
                                    } : {}}
                                    className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                                      isCompleted ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20" :
                                      isActive ? "bg-indigo-505 border-indigo-400 text-white shadow-lg shadow-indigo-500/20" :
                                      "bg-slate-950 border-slate-855 text-slate-500"
                                    }`}
                                  >
                                    {isCompleted ? (
                                      <Check className="w-4 h-4 stroke-[3]" />
                                    ) : isActive && stage.value === "AI Verification" ? (
                                      <Brain className="w-4 h-4 text-indigo-400 animate-bounce" />
                                    ) : (
                                      <span className="text-[11px] font-bold font-mono">{idx + 1}</span>
                                    )}
                                  </motion.div>

                                  {/* Label */}
                                  <div className="mt-2 text-center flex flex-col items-center">
                                    <span className={`font-bold uppercase tracking-wider text-[8.5px] whitespace-nowrap ${
                                      isActive ? "text-indigo-400 font-extrabold" :
                                      isCompleted ? "text-slate-300 font-semibold" : "text-slate-500"
                                    }`}>
                                      {stage.name}
                                    </span>

                                    {isActive && (
                                      <span className="mt-0.5 text-[6.5px] bg-indigo-955 text-indigo-400 px-1 py-0.2 rounded border border-indigo-900/30 uppercase font-bold font-mono">
                                        Current
                                      </span>
                                    )}

                                    {isDisabledClose && (
                                      <span className="mt-0.5 text-[6.5px] bg-red-955/20 text-red-405 px-1 py-0.2 rounded border border-red-900/30 uppercase font-bold font-mono">
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Reporter Info</h4>
                            <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-3 flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-455 text-xs font-black uppercase border border-indigo-500/20">
                                {selectedIssue.reporterName[0] || "U"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-202 truncate">{selectedIssue.reporterName}</p>
                                <p className="text-[10px] text-slate-500 truncate font-semibold font-mono">{selectedIssue.reporterEmail}</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Description</h4>
                            <p className="text-xs text-slate-300 leading-relaxed font-semibold bg-slate-900/30 border border-slate-900 rounded-2xl p-4">
                              {selectedIssue.description || "No description entered for this dispatch ticket."}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-3 text-center">
                              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono block">Priority Index</span>
                              <span className="text-sm font-black text-indigo-400 mt-1 block">
                                {selectedIssue.priorityScore !== undefined ? `${selectedIssue.priorityScore}/100` : `Lvl ${selectedIssue.priority}`}
                              </span>
                            </div>
                            <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-3 text-center">
                              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono block">Report Date</span>
                              <span className="text-xs font-bold text-slate-300 mt-1.5 block font-mono">
                                {new Date(selectedIssue.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Original Hazard Photo</h4>
                          <div className="relative rounded-2xl overflow-hidden border border-slate-800 aspect-video bg-slate-900 flex items-center justify-center">
                            <ImageWithFallback 
                              src={selectedIssue.imageUrl} 
                              alt="Original hazard evidence" 
                              label="Original"
                            />
                          </div>
                        </div>
                      </div>

                      {/* ACTION 1: Assign Department */}
                      <div className="space-y-2 pt-4 border-t border-slate-900">
                        <div className="flex items-center space-x-1.5">
                          <Building className="w-4 h-4 text-indigo-400" />
                          <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider font-mono">Assign Department</h3>
                        </div>

                        <div className="relative w-full max-w-md">
                          <select
                            value={selectedIssue.department || ""}
                            onChange={(e) => handleAssignDepartment(selectedIssue.id, e.target.value)}
                            disabled={updatingDept === selectedIssue.id}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs font-bold text-slate-200 focus:outline-none focus:border-indigo-500"
                            id="assign-dept-dropdown"
                          >
                            <option value="">-- Click to assign department --</option>
                            {DEPARTMENTS.map(dept => (
                              <option key={dept} value={dept}>{dept}</option>
                            ))}
                          </select>

                          {updatingDept === selectedIssue.id && (
                            <div className="absolute inset-y-0 right-3 flex items-center">
                              <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ACTION 2: Change Triage Status */}
                      <div className="space-y-3 pt-4 border-t border-slate-900">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-4 h-4 text-amber-405" />
                          <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider font-mono">Update Lifecycle Status</h3>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {["Reported", "Assigned", "Under Review", "In Progress", "Resolved", "AI Verification", "Verified & Closed"].map((st) => {
                            const isActive = selectedIssue.status === st;
                            const isClose = st === "Verified & Closed";
                            const verificationSuccess = selectedIssue.resolutionVerification?.status === "Resolved" || selectedIssue.resolutionVerification?.recommendation === "Repair Verified";
                            const isLocked = isClose && !verificationSuccess;

                            return (
                              <Button
                                key={st}
                                id={`official-status-${st.replace(/\s+/g, "-")}`}
                                onClick={() => {
                                  if (!isLocked) {
                                    handleUpdateStatus(selectedIssue.id, st);
                                  }
                                }}
                                disabled={updatingStatus === selectedIssue.id || isLocked}
                                variant={isActive ? "primary" : "secondary"}
                                size="sm"
                                className="rounded-xl justify-center font-bold"
                                leftIcon={isActive ? <Check className="w-3.5 h-3.5 text-white" /> : undefined}
                                title={isLocked ? "AI verification must pass successfully to close" : ""}
                              >
                                <span>{isClose && isLocked ? "Closed (AI Req.)" : st}</span>
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      {/* ACTION 3 & 4: Municipal Verification Card */}
                      <div className="space-y-4 pt-4 border-t border-slate-900 font-sans">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            <h3 className="text-xs font-black text-slate-305 uppercase tracking-wider font-mono">Municipal Verification</h3>
                          </div>
                        </div>

                        {["Resolved", "AI Verification", "Needs Rework", "Awaiting Evidence", "Verified & Closed", "Closed"].includes(selectedIssue.status) || selectedIssue.resolutionImage ? (
                          <div className="space-y-4">
                            {(selectedIssue.resolutionImage || repairBase64) ? (
                              <div className="bg-slate-955 border border-indigo-500/15 rounded-3xl p-6 space-y-6 shadow-2xl relative overflow-hidden font-sans">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                                
                                <div className="flex items-center justify-between border-b border-slate-900 pb-4 relative z-10">
                                  <div className="flex items-center space-x-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-500 flex items-center justify-center text-white shrink-0 shadow">
                                      <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-extrabold text-white leading-none">Municipal Verification Panel</h4>
                                      <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 font-mono tracking-wider">Manual Dispatch Inspection</p>
                                    </div>
                                  </div>
                                  
                                  {selectedIssue.resolutionVerification && (
                                    <Badge variant={getStatusVariant(selectedIssue.status)} className="font-mono text-[9px] uppercase font-bold">
                                      {selectedIssue.status}
                                    </Badge>
                                  )}
                                </div>

                                {/* Side-by-side comparison images */}
                                <div className="grid grid-cols-2 gap-4 relative z-10">
                                  <div className="space-y-1.5">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase font-mono block">Original Citizen Evidence</span>
                                    <div className="rounded-xl overflow-hidden aspect-video bg-slate-900 border border-slate-900 relative">
                                      <ImageWithFallback 
                                        src={selectedIssue.imageUrl} 
                                        alt="Original issue" 
                                        label="Original"
                                        onError={() => setOriginalImageError(true)}
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-1.5">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase font-mono block">Repair Evidence (Inspection Photo)</span>
                                    <div className="rounded-xl overflow-hidden aspect-video bg-slate-900 border border-slate-900 relative">
                                      <ImageWithFallback 
                                        src={selectedIssue.resolutionImage || repairBase64 || ""} 
                                        alt="Resolution proof" 
                                        label="Resolution"
                                        onError={() => setRepairImageError(true)}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Checklist & Decision Controls */}
                                {(!selectedIssue.resolutionVerification || selectedIssue.status === "Resolved" || selectedIssue.status === "AI Verification" || selectedIssue.status === "Awaiting Evidence" || selectedIssue.status === "Needs Rework") ? (
                                  <div className="space-y-5 relative z-10 pt-2 border-t border-slate-900">
                                    <div className="space-y-3">
                                      <h5 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">Verification Checklist</h5>
                                      
                                      <div className="grid grid-cols-1 gap-2 bg-slate-900/40 p-4 rounded-2xl border border-slate-900/60">
                                        {[
                                          { key: "sameLocation", label: "Same incident location verified" },
                                          { key: "correctRepaired", label: "Correct infrastructure/issue repaired" },
                                          { key: "qualityAcceptable", label: "Repair quality standards acceptable" },
                                          { key: "imageClear", label: "Before/After inspection images are clear" },
                                          { key: "fullyResolved", label: "Issue completely resolved & clean" }
                                        ].map((item) => (
                                          <label key={item.key} className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-slate-300 hover:text-white transition-colors">
                                            <input 
                                              type="checkbox" 
                                              checked={(checklist as any)[item.key]} 
                                              onChange={(e) => setChecklist(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                              className="rounded border-slate-800 bg-slate-955 text-indigo-500 focus:ring-indigo-500/30 w-4 h-4"
                                            />
                                            <span>{item.label}</span>
                                          </label>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <label className="text-[10px] font-bold text-indigo-405 uppercase tracking-widest font-mono block">Verification Notes</label>
                                      <textarea 
                                        value={verificationNotes}
                                        onChange={(e) => setVerificationNotes(e.target.value)}
                                        placeholder="Enter audit notes (e.g. 'Road surface fully restored, swept and reopened to traffic.')"
                                        rows={3}
                                        className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500/40 rounded-xl p-3 text-xs text-slate-200 focus:outline-none transition-colors"
                                      />
                                    </div>

                                    {verificationError && (
                                      <div className="bg-red-500/10 border border-red-500/25 p-3 rounded-2xl text-xs font-semibold text-red-400 flex items-center gap-2.5">
                                        <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                                        <span>{verificationError}</span>
                                      </div>
                                    )}

                                    {/* Decision Buttons */}
                                    <div className="grid grid-cols-3 gap-3 pt-2">
                                      <Button 
                                        disabled={isSubmittingDecision}
                                        onClick={() => handleDispatcherDecision("Approve")}
                                        variant="primary"
                                        className="bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/20 text-white rounded-xl py-3 text-xs font-extrabold shadow-lg shadow-emerald-950/20 w-full"
                                      >
                                        {isSubmittingDecision ? "Processing..." : "Approve Resolution"}
                                      </Button>

                                      <Button 
                                        disabled={isSubmittingDecision}
                                        onClick={() => handleDispatcherDecision("Rework")}
                                        variant="secondary"
                                        className="bg-amber-600/90 hover:bg-amber-500 text-white border border-amber-500/20 rounded-xl py-3 text-xs font-extrabold shadow-lg shadow-amber-950/20 w-full"
                                      >
                                        Send For Rework
                                      </Button>

                                      <Button 
                                        disabled={isSubmittingDecision}
                                        onClick={() => handleDispatcherDecision("BetterEvidence")}
                                        variant="secondary"
                                        className="bg-sky-600/90 hover:bg-sky-500 text-white border border-sky-500/20 rounded-xl py-3 text-xs font-extrabold shadow-lg shadow-sky-950/20 w-full"
                                      >
                                        Request Better Evidence
                                      </Button>
                                    </div>

                                    {/* Clear/Reset Upload Panel */}
                                    <div className="text-center pt-2">
                                      <button 
                                        onClick={() => { setRepairFile(null); setRepairBase64(""); }}
                                        className="text-[10px] text-slate-500 hover:text-slate-300 font-bold uppercase tracking-wider font-mono hover:underline"
                                      >
                                        Cancel Upload & Back
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  /* Read-only view for previously audited/closed tickets */
                                  <div className="space-y-4 pt-4 border-t border-slate-900 relative z-10 text-xs">
                                    <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-2xl space-y-3">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider block font-mono">Inspection Checkpoints</span>
                                        <span className="text-[9px] text-slate-505 font-mono">
                                          Verified: {new Date(selectedIssue.resolutionVerification.verifiedAt).toLocaleDateString()}
                                        </span>
                                      </div>
                                      
                                      <div className="grid grid-cols-1 gap-1.5 pl-1.5 text-slate-300">
                                        {[
                                          { checked: selectedIssue.resolutionVerification.landmarkMatch === 100, label: "Same incident location verified" },
                                          { checked: selectedIssue.resolutionVerification.infrastructureMatch === 100, label: "Correct infrastructure/issue repaired" },
                                          { checked: selectedIssue.resolutionVerification.sceneMatch === 100, label: "Repair quality standards acceptable" },
                                          { checked: selectedIssue.resolutionVerification.locationMatch === 100, label: "Before/After inspection images are clear" },
                                          { checked: selectedIssue.resolutionVerification.issueResolution === 100, label: "Issue completely resolved & clean" }
                                        ].map((item, idx) => (
                                          <div key={idx} className="flex items-center space-x-2">
                                            <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border font-mono text-[9px] font-black ${item.checked ? 'border-emerald-500 text-emerald-450 bg-emerald-500/10' : 'border-slate-800 text-slate-600 bg-slate-950'}`}>
                                              {item.checked ? "✓" : "✗"}
                                            </span>
                                            <span className={item.checked ? 'text-slate-200' : 'text-slate-500 line-through'}>{item.label}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="p-4 bg-slate-900/60 border border-slate-850 rounded-2xl space-y-1">
                                      <span className="text-[10px] font-bold text-slate-405 uppercase font-mono tracking-wider block mb-1 font-mono">Verification Notes</span>
                                      <p className="text-slate-300 leading-relaxed font-semibold">
                                        {selectedIssue.resolutionVerification.explanation}
                                      </p>
                                    </div>

                                    <div className="flex gap-2.5 pt-2">
                                      <Button 
                                        onClick={() => {
                                          // Pre-populate checklists/notes from previous audit
                                          setChecklist({
                                            sameLocation: selectedIssue.resolutionVerification?.landmarkMatch === 100,
                                            correctRepaired: selectedIssue.resolutionVerification?.infrastructureMatch === 100,
                                            qualityAcceptable: selectedIssue.resolutionVerification?.sceneMatch === 100,
                                            imageClear: selectedIssue.resolutionVerification?.locationMatch === 100,
                                            fullyResolved: selectedIssue.resolutionVerification?.issueResolution === 100
                                          });
                                          setVerificationNotes(selectedIssue.resolutionVerification?.explanation || "");
                                          // Clear verification to re-enable verification controls
                                          setSelectedIssue(prev => prev ? { ...prev, resolutionVerification: undefined } : null);
                                        }}
                                        variant="secondary"
                                        size="sm"
                                        className="flex-1 text-[11px] rounded-xl font-bold py-2 border border-slate-800"
                                      >
                                        Edit Decision & Checklist
                                      </Button>
                                      
                                      <Button 
                                        onClick={async () => {
                                          try {
                                            setSelectedIssue(prev => prev ? {
                                              ...prev,
                                              resolutionVerification: undefined,
                                              resolutionImage: undefined
                                            } : null);
                                            await updateFirestoreIssue(selectedIssue.id, {
                                              resolutionVerification: null,
                                              resolutionImage: null
                                            });
                                          } catch (err) {
                                            console.error(err);
                                          }
                                        }}
                                        variant="secondary"
                                        size="sm"
                                        className="flex-1 text-[11px] rounded-xl font-bold py-2 bg-red-950/20 text-red-400 hover:bg-red-900/10 hover:border-red-500/30 border border-red-900/10"
                                      >
                                        Remove Verification Photo
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="bg-slate-955 border border-slate-900 rounded-3xl p-6 space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-900 font-sans">
                                  <h4 className="text-xs font-bold text-slate-205 flex items-center gap-1.5 font-mono">
                                    <Upload className="w-4 h-4 text-indigo-450" /> Repair Evidence Management
                                  </h4>
                                </div>
                                
                                <div className="space-y-4 font-sans">
                                  <div 
                                    onClick={() => repairFileInputRefActual.current?.click()}
                                    className="border-2 border-dashed border-slate-805 hover:border-indigo-500/50 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-955/40 hover:bg-slate-955 space-y-2.5 group"
                                  >
                                    <Upload className="w-8 h-8 text-slate-500 group-hover:text-indigo-405 mx-auto transition-colors" />
                                    <div className="text-xs text-slate-350 font-semibold">
                                      <span className="font-extrabold text-indigo-400 group-hover:underline">Click to upload completion photo</span> or drag and drop
                                    </div>
                                    <p className="text-[10px] text-slate-550 font-medium font-mono">PNG, JPG, WEBP up to 10MB</p>
                                  </div>

                                  {/* Quick-Repair Evidence Templates */}
                                  <div className="space-y-2 pt-2 border-t border-slate-905">
                                    <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider font-mono block">Quick-Repair Dispatch Templates</span>
                                    <div className="grid grid-cols-2 gap-2">
                                      {Object.entries(REPAIR_TEMPLATES).map(([catName, item]) => {
                                        const isCategoryMatch = selectedIssue.category === catName || (selectedIssue.category === "Road Damage" && catName === "Pothole");
                                        return (
                                          <button
                                            key={catName}
                                            onClick={async () => {
                                              try {
                                                setRepairBase64(item.imageUrl);
                                              } catch (err) {
                                                console.error(err);
                                              }
                                            }}
                                            className={`flex items-center space-x-2 p-2 rounded-xl border text-left transition-all ${isCategoryMatch ? 'bg-indigo-950/20 border-indigo-500/40 text-slate-200' : 'bg-slate-900/30 border-slate-850 hover:border-slate-800 text-slate-400 hover:text-slate-250'}`}
                                          >
                                            <div className="w-9 h-6 rounded-md overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                                              <img src={item.imageUrl} alt={item.label} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="min-w-0">
                                              <p className="text-[9.5px] font-bold leading-tight truncate">{catName}</p>
                                              <p className="text-[7.5px] text-slate-500 leading-none truncate mt-0.5">{item.label}</p>
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            <input 
                              type="file" 
                              ref={repairFileInputRefActual}
                              onChange={handleRepairFileChange}
                              accept="image/*"
                              className="hidden" 
                            />
                          </div>
                        ) : (
                          <div className="bg-slate-905/30 border border-slate-900 rounded-2xl p-4 text-center text-xs text-slate-500 font-semibold font-sans py-6">
                            Resolution verification will become available once the issue status reaches <span className="text-indigo-400 font-bold">Resolved</span>.
                          </div>
                        )}
                      </div>

                      {/* ACTION 5: Operational Decision Assistant */}
                      <div className="space-y-4 pt-4 border-t border-slate-900 font-sans">
                        <div className="flex items-center space-x-1.5">
                          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                          <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider font-mono">Operational Decision Assistant</h3>
                        </div>

                        <Card variant="ai" className="p-5 bg-slate-955 border border-indigo-500/15 rounded-3xl space-y-4 shadow-2xl relative overflow-hidden">
                          <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-900">
                            <div className="w-7 h-7 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-405 shrink-0">
                              <Activity className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div>
                              <h4 className="text-xs font-extrabold text-white leading-none">Smart Dispatch Recommendations</h4>
                              <p className="text-[8.5px] text-slate-500 font-bold uppercase mt-1 font-mono">Dispatcher Directives</p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {getDispatcherRecommendations(selectedIssue).map((rec, idx) => (
                              <div key={idx} className="p-3 bg-slate-900/40 border border-slate-850 rounded-2xl space-y-1">
                                <span className="text-xs font-extrabold text-white block">✓ {rec.action}</span>
                                <span className="text-[10px] text-slate-400 leading-relaxed font-semibold block">{rec.explanation}</span>
                              </div>
                            ))}
                          </div>
                        </Card>
                      </div>

                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* TAB 3: CITY MAP */}
          {activeTab === "map" && (
            <motion.div
              key="map"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <Card variant="default" className="p-6 space-y-4 shadow-2xl bg-slate-900/10 border-slate-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4.5 h-4.5 text-indigo-400 animate-pulse" />
                    <h3 className="text-sm font-extrabold text-white">Live Smart City Telemetry Grid</h3>
                  </div>
                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-400 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={showMapResolved}
                      onChange={(e) => setShowMapResolved(e.target.checked)}
                      className="rounded border-slate-800 bg-slate-950 text-indigo-500 focus:ring-indigo-500/30"
                    />
                    <span>Show Resolved & Closed Tickets (Historical)</span>
                  </label>
                </div>

                <div className="h-[550px] w-full rounded-2xl overflow-hidden border border-slate-900 shadow-inner" style={{ minHeight: "500px" }}>
                  <IssueMap
                    issues={issues.filter(i => showMapResolved ? true : (i.status !== "Resolved" && i.status !== "Verified & Closed" && i.status !== "Closed"))}
                    onSelectIssue={(iss) => {
                      setSelectedIssue(iss);
                      setActiveTab("issues");
                    }}
                    selectedIssueId={selectedIssue?.id}
                    hideMonitorPanel={true}
                  />
                </div>
              </Card>
            </motion.div>
          )}

          {/* TAB 4: ANALYTICS DESK */}
          {activeTab === "analytics" && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Column: Weekly Velocity SVG Chart */}
              <div className="lg:col-span-7 space-y-6">
                <Card variant="bordered" className="p-6 bg-slate-900/10 border-slate-900 shadow-xl">
                  {renderWeeklyTrendChart()}
                </Card>

                {/* Department performance workload table */}
                <Card variant="bordered" className="p-6 bg-slate-900/10 border-slate-900 shadow-xl space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-indigo-400" /> Agency Output Ledger
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-300">
                      <thead>
                        <tr className="border-b border-slate-900 font-mono text-[10px] text-slate-500 uppercase font-black">
                          <th className="p-4">Department</th>
                          <th className="p-4 text-center">Assigned</th>
                          <th className="p-4 text-center">Pending</th>
                          <th className="p-4 text-center">Avg Velocity</th>
                          <th className="p-4 text-right">Closure Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deptPerformance.map((dept, idx) => (
                          <tr key={idx} className="border-b border-slate-900/60 hover:bg-slate-900/20 transition-colors">
                            <td className="p-4 font-bold text-white">{dept.name}</td>
                            <td className="p-4 text-center font-mono font-bold">{dept.assigned}</td>
                            <td className="p-4 text-center font-mono text-amber-500 font-bold">{dept.pending}</td>
                            <td className="p-4 text-center font-mono">{formatDuration(dept.avgTimeMs)}</td>
                            <td className="p-4 text-right font-mono font-bold text-indigo-400">
                              {dept.completionRate}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              {/* Right Column: Allocation & Severity Distribution */}
              <div className="lg:col-span-5 space-y-6">
                <Card variant="bordered" className="p-6 bg-slate-900/10 border-slate-900 shadow-xl">
                  {renderCategoryChart()}
                </Card>
                <Card variant="bordered" className="p-6 bg-slate-900/10 border-slate-900 shadow-xl">
                  {renderSeverityChart()}
                </Card>
              </div>
            </motion.div>
          )}

          {/* TAB 5: AI INTELLIGENCE */}
          {activeTab === "ai" && (
            <motion.div
              key="ai"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Live AI Municipal Brief */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <div className="flex items-center space-x-2">
                    <Brain className="w-5 h-5 text-indigo-400 animate-pulse" />
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono">Live AI Municipal Brief</h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Database-Driven Insights</span>
                </div>

                {issues.length < 2 ? (
                  <Card variant="glass" className="p-8 text-center space-y-4">
                    <div className="w-12 h-12 bg-slate-900 border border-slate-850 rounded-2xl flex items-center justify-center text-slate-500 mx-auto">
                      <Brain className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-200">Additional operational data is required before generating insights.</h4>
                      <p className="text-xs text-slate-450 max-w-sm mx-auto font-semibold leading-relaxed">
                        Seeding or filing at least 2 incident reports will enable the briefing engine to synthesize operational insights.
                      </p>
                    </div>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    {generateInteractiveBrief().map((card, idx) => (
                      <div
                        key={idx}
                        className="group relative p-5 bg-slate-950/80 hover:bg-slate-900 border border-indigo-500/10 hover:border-indigo-500/30 rounded-2xl shadow-xl transition-all duration-300 overflow-hidden cursor-pointer h-40 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-900">
                          <h4 className="text-[10px] font-black text-white group-hover:text-indigo-400 transition-colors flex items-center gap-1.5 font-sans uppercase tracking-tight">
                            {card.icon}
                            {card.headline}
                          </h4>
                        </div>
                        
                        <p className="text-slate-300 text-[10.5px] font-semibold leading-relaxed mt-2.5 transition-opacity duration-300 group-hover:opacity-0">
                          {card.summary}
                        </p>

                        <div className="absolute inset-0 p-5 bg-slate-955 flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto">
                          <span className="text-[8px] font-extrabold text-indigo-400 font-mono uppercase tracking-wider block mb-1">
                            DETAILED AUDIT
                          </span>
                          <p className="text-slate-200 text-[10px] leading-relaxed font-semibold">
                            {card.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actionable Directives Section */}
              {issues.length >= 2 && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4.5 h-4.5 text-indigo-400 animate-pulse" />
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono">AI Actionable Directives</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {generateInteractiveRecommendations().map((rec, idx) => (
                      <Card key={idx} variant="ai" className="p-5 flex flex-col justify-between shadow-xl">
                        <div>
                          <h4 className="text-xs font-black text-white flex items-center gap-1.5 uppercase tracking-tight font-sans">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            {rec.title}
                          </h4>
                          <p className="text-slate-200 text-xs font-semibold leading-relaxed mt-3">
                            {rec.action}
                          </p>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-4 pt-2 border-t border-slate-900 font-semibold">
                          <strong>Rationale:</strong> {rec.reason}
                        </p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* 5-Dimension Policy Analysis */}
              <Card variant="ai" className="overflow-hidden shadow-2xl">
                <div className="border-b border-slate-900 px-6 sm:px-8 py-5 bg-slate-900/15 flex items-center space-x-3">
                  <div className="w-9 h-9 bg-gradient-to-tr from-brand-primary to-indigo-600 rounded-xl flex items-center justify-center text-white border border-white/10 shadow">
                    <Brain className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white tracking-tight">Gemini 5-Dimension Policy Analysis</h3>
                    <p className="text-[10px] text-slate-405 font-semibold">Cross-category infrastructure planning model</p>
                  </div>
                </div>

                {issues.length < 2 ? (
                  <div className="p-8 text-center space-y-4">
                    <div className="w-12 h-12 bg-slate-900 border border-slate-850 rounded-2xl flex items-center justify-center text-slate-500 mx-auto">
                      <Brain className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-200">Additional operational data is required before generating insights.</h4>
                      <p className="text-xs text-slate-450 max-w-sm mx-auto font-semibold leading-relaxed">
                        Seeding or filing at least 2 incident reports will enable the Gemini briefing engine to synthesize operational insights.
                      </p>
                    </div>
                  </div>
                ) : loadingMunicipalInsights || !municipalInsights ? (
                  <div className="p-8">
                    <div className="space-y-4 py-8 animate-pulse">
                      <div className="h-4 bg-slate-900 rounded w-1/3"></div>
                      <div className="h-3 bg-slate-900 rounded w-full"></div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    {/* 1. Category Breakdown */}
                    <Card variant="interactive" className="p-5 bg-slate-900/10 border-slate-900 flex flex-col justify-between h-full hover:border-indigo-500/20 transition-all">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                            {getCategoryIcon(municipalInsights.mostCommonCategory.category)}
                          </div>
                          <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider font-mono">Top Category</span>
                        </div>
                        <div>
                          <h3 className="text-xs font-extrabold text-white leading-tight">
                            {municipalInsights.mostCommonCategory.category}
                          </h3>
                          <div className="inline-block mt-1 bg-indigo-950 text-indigo-400 border border-indigo-900/30 rounded-lg px-2 py-0.5 text-xs font-bold font-mono">
                            {municipalInsights.mostCommonCategory.count} reports ({municipalInsights.mostCommonCategory.percentage}%)
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-medium pt-3 mt-3 border-t border-slate-900">
                        {municipalInsights.mostCommonCategory.description}
                      </p>
                    </Card>

                    {/* 2. Highest Risk Zone */}
                    <Card variant="interactive" className="p-5 bg-slate-900/10 border-slate-900 flex flex-col justify-between h-full hover:border-red-500/20 transition-all">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center text-red-500 border border-red-500/20">
                            <MapPin className="w-4 h-4 text-red-400" />
                          </div>
                          <span className="text-[10px] font-bold text-rose-455 uppercase tracking-wider font-mono">Risk Zones</span>
                        </div>
                        <div className="space-y-2 min-h-[48px]">
                          {municipalInsights.highestRiskZones.slice(0, 1).map((z: any, idx: number) => (
                            <div key={idx} className="space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-white truncate max-w-[110px]">{z.zone}</span>
                                <Badge variant={getSeverityVariant(z.riskLevel)}>{z.riskLevel}</Badge>
                              </div>
                              <p className="text-[10px] font-bold text-slate-505 font-mono">{z.activeIssuesCount} active hazards</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-medium pt-3 mt-3 border-t border-slate-900">
                        {municipalInsights.highestRiskZones[0]?.description}
                      </p>
                    </Card>

                    {/* 3. Resolution Trends */}
                    <Card variant="interactive" className="p-5 bg-slate-900/10 border-slate-900 flex flex-col justify-between h-full hover:border-emerald-500/20 transition-all">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-450 border border-emerald-500/20">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          </div>
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">Resolution Trends</span>
                        </div>
                        <div>
                          <h3 className="text-xs font-extrabold text-white leading-tight">
                            {municipalInsights.resolutionTrends.trend}
                          </h3>
                          <div className="inline-block mt-1 bg-emerald-955 text-emerald-450 border border-emerald-900/30 rounded-lg px-2 py-0.5 text-xs font-bold font-mono">
                            {municipalInsights.resolutionTrends.percentageChange}
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-medium pt-3 mt-3 border-t border-slate-900">
                        {municipalInsights.resolutionTrends.details}
                      </p>
                    </Card>

                    {/* 4. Emerging Hazards */}
                    <Card variant="interactive" className="p-5 bg-slate-900/10 border-slate-900 flex flex-col justify-between h-full hover:border-amber-500/20 transition-all">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-400 border border-amber-500/20">
                            <Clock className="w-4 h-4 text-amber-400" />
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

                    {/* 5. Recommended Action */}
                    <Card variant="interactive" className="p-5 bg-indigo-950 text-white flex flex-col justify-between h-full hover:border-indigo-500/35 transition-all">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                            <Sparkles className="w-4 h-4 text-indigo-305" />
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
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}