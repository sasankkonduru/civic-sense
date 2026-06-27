import React, { useState, useEffect, useRef } from "react";
import { 
  AlertTriangle, CheckCircle2, Clock, ShieldAlert, Brain, MapPin, 
  RefreshCw, Filter, Eye, User, FileText, ChevronRight, Check, AlertCircle, Sparkles,
  Upload, Image as ImageIcon, Timer, ArrowLeft, LogOut, Building, Building2, Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db, updateFirestoreIssue, uploadBase64ToStorage, deleteFirestoreIssue } from "../firebase";
import { Issue } from "../types";

interface OfficialPageProps {
  onNavigate: (page: string) => void;
  currentUser: { email: string; name: string; role: "citizen" | "official"; picture?: string } | null;
  onLogout: () => void;
}

const DEPARTMENTS = [
  "Department of Public Works",
  "Water & Sanitation Division",
  "Municipal Lighting Bureau",
  "Roads & Asphalt Authority",
  "Environmental Protection Division",
  "Public Safety Dispatch"
];

export default function OfficialPage({ onNavigate, currentUser, onLogout }: OfficialPageProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSeverity, setFilterSeverity] = useState("All");
  const [filterDepartment, setFilterDepartment] = useState("All");

  // Status and Dept Action States
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [updatingDept, setUpdatingDept] = useState<string | null>(null);

  // Upload/Verification States
  const [repairFile, setRepairFile] = useState<File | null>(null);
  const [repairBase64, setRepairBase64] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [verifyingResolution, setVerifyingResolution] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const repairFileInputRef = useRef<HTMLInputElement>(null);

  // Clear verification state when selected issue changes
  useEffect(() => {
    setRepairFile(null);
    setRepairBase64("");
    setVerificationError("");
    setUploadProgress(0);
    setIsUploading(false);
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

      // Auto-update selected issue object if it gets modified remotely
      if (selectedIssue) {
        const updatedSelected = list.find(x => x.id === selectedIssue.id);
        if (updatedSelected) {
          setSelectedIssue(updatedSelected);
        }
      }
    }, (error) => {
      console.error("Firestore real-time sync failed in official page:", error);
      setLoadingIssues(false);
    });

    return () => unsubscribe();
  }, [selectedIssue?.id]);

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
        setRepairBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload repair image and run Gemini comparative verification
  const handleRunVerification = async () => {
    if (!selectedIssue || !repairBase64) return;
    try {
      setVerifyingResolution(true);
      setVerificationError("");
      setUploadProgress(20);

      // 1. Send base64 images to server for Gemini comparative analysis
      const response = await fetch("/api/verify-resolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: selectedIssue.title,
          description: selectedIssue.description,
          originalImageUrl: selectedIssue.imageUrl,
          resolutionImageBase64: repairBase64,
        }),
      });

      setUploadProgress(60);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to analyze resolution with Gemini.");
      }

      const verificationResult = await response.json();
      setUploadProgress(80);

      // 2. Upload file to Firebase Storage
      const storagePath = `resolutions/${selectedIssue.id}_${Date.now()}.jpg`;
      const uploadedUrl = await uploadBase64ToStorage(repairBase64, storagePath);
      setUploadProgress(100);

      // 3. Update issue record in Firestore
      const updatePayload: Partial<Issue> = {
        resolutionImage: uploadedUrl,
        resolutionVerification: {
          status: verificationResult.status,
          confidenceScore: verificationResult.confidenceScore,
          explanation: verificationResult.explanation,
          verifiedAt: new Date().toISOString(),
        }
      };

      // Auto-transition status based on verification outcome
      if (verificationResult.status === "Resolved") {
        updatePayload.status = "Resolved (Pending AI Verification)";
      }

      await updateFirestoreIssue(selectedIssue.id, updatePayload);

      // Update local state
      setSelectedIssue(prev => prev ? {
        ...prev,
        ...updatePayload
      } : null);

      setRepairFile(null);
      setRepairBase64("");
    } catch (err: any) {
      console.error("AI verification failed:", err);
      setVerificationError(err.message || "An error occurred during AI verification.");
    } finally {
      setVerifyingResolution(false);
      setUploadProgress(0);
    }
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

  // Delete issue handler (Cleanup convenience)
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

  // Filter issues based on search and selected tags
  const filteredIssues = issues.filter(issue => {
    const matchesSearch = 
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "All" || issue.status === filterStatus;
    const matchesSeverity = filterSeverity === "All" || issue.severity === filterSeverity;
    const matchesDept = filterDepartment === "All" || issue.department === filterDepartment;

    return matchesSearch && matchesStatus && matchesSeverity && matchesDept;
  });

  // Calculate stats for current live issues list
  const totalInTriage = issues.length;
  const reportedCount = issues.filter(i => i.status === "Reported" || i.status === "Submitted").length;
  const inProgressCount = issues.filter(i => i.status === "In Progress" || i.status === "Assigned" || i.status === "Under Review").length;
  const pendingVerificationCount = issues.filter(i => i.status === "Resolved (Pending AI Verification)" || i.status === "Resolved").length;
  const closedCount = issues.filter(i => i.status === "Verified & Closed").length;

  // Protect view: If not logged in as an official, show a polished mock credential wall
  if (!currentUser || currentUser.role !== "official") {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-6 text-white selection:bg-indigo-500">
        <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-extrabold tracking-tight">Access Restricted</h1>
            <p className="text-sm text-slate-400">
              The CivicSense Municipal Command Center is reserved for verified city department heads and repair dispatch officers.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl text-left space-y-3">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest text-center">Simulated Access Key</p>
            <p className="text-xs text-slate-400 text-center leading-relaxed">
              Bypass verification to audit and test the complete repair lifecycle, Gemini Vision comparing engine, and citizen updates.
            </p>
            <button 
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
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20"
            >
              Authorize as City Official
            </button>
          </div>

          <button 
            onClick={() => onNavigate("dashboard")}
            className="text-xs font-bold text-slate-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Official Header */}
      <header className="sticky top-0 z-30 bg-slate-950/95 border-b border-slate-900 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => onNavigate("dashboard")}
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
            title="Back to Dashboard"
            id="back-to-dashboard-btn"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                Admin Center
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Secure Grid</span>
            </div>
            <h1 className="text-lg font-black tracking-tight mt-1 flex items-center gap-1.5">
              <Building className="w-5 h-5 text-indigo-400" />
              <span>Municipal Command Operations</span>
            </h1>
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-200">{currentUser.name}</p>
            <p className="text-[10px] text-indigo-400 font-semibold mt-0.5">{currentUser.email}</p>
          </div>
          {currentUser.picture && (
            <img 
              src={currentUser.picture} 
              alt={currentUser.name} 
              className="w-9 h-9 rounded-xl object-cover border border-slate-800"
              referrerPolicy="no-referrer"
            />
          )}
          <button 
            onClick={onLogout}
            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            title="Sign Out"
            id="official-logout-btn"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Operations Dashboard Metrics */}
      <section className="p-6 grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Active Pipeline", count: totalInTriage, color: "border-slate-800 text-indigo-400", sub: "unresolved backlog" },
          { label: "Backlog / Reported", count: reportedCount, color: "border-slate-800 text-sky-400", sub: "triage assessment" },
          { label: "In Active Repair", count: inProgressCount, color: "border-slate-800 text-amber-400", sub: "department active" },
          { label: "AI Verification", count: pendingVerificationCount, color: "border-slate-800 text-purple-400", sub: "comparative audit" },
          { label: "Verified & Closed", count: closedCount, color: "border-slate-800 text-emerald-400", sub: "completed archive" },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 flex flex-col justify-between space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">{kpi.label}</span>
            <div className="flex items-baseline space-x-1">
              <span className={`text-2xl font-black ${kpi.color}`}>{kpi.count}</span>
              <span className="text-xs text-slate-600 font-semibold">issues</span>
            </div>
            <p className="text-[9px] text-slate-400 leading-none font-medium uppercase tracking-wider">{kpi.sub}</p>
          </div>
        ))}
      </section>

      {/* Main Command Split Pane */}
      <main className="px-6 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-190px)] min-h-[500px]">
        {/* Left Side: Filter and Issue Lists (5cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4 h-full overflow-hidden">
          {/* Controls Bar */}
          <div className="bg-slate-900/60 border border-slate-900 rounded-2xl p-4 space-y-3 shrink-0">
            {/* Search Input */}
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search triage ticket id, landmark or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
                id="official-search-input"
              />
            </div>

            {/* Quick Filters Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Status</label>
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-[10px] font-bold text-slate-300 focus:outline-none"
                  id="filter-status-select"
                >
                  <option value="All">All Statuses</option>
                  <option value="Reported">Reported</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved (Pending AI Verification)">AI Verification</option>
                  <option value="Verified & Closed">Verified & Closed</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Severity</label>
                <select 
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-[10px] font-bold text-slate-300 focus:outline-none"
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
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Department</label>
                <select 
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-[10px] font-bold text-slate-300 focus:outline-none"
                  id="filter-dept-select"
                >
                  <option value="All">All Depts</option>
                  <option value="Unassigned">Unassigned</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d.split(" ")[0]}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Active List Panel */}
          <div className="flex-1 bg-slate-900/30 border border-slate-900 rounded-3xl overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {loadingIssues ? (
              <div className="h-full flex flex-col justify-center items-center py-12 space-y-3">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-xs text-slate-400 font-semibold">Synchronizing Live Repair Grid...</p>
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center py-12 text-center space-y-2">
                <AlertTriangle className="w-8 h-8 text-slate-600" />
                <p className="text-xs text-slate-400 font-bold">No issues found matching search constraints.</p>
                <p className="text-[10px] text-slate-500 max-w-xs mx-auto">Verify that you have created issues or clear filter parameters to view the complete active queue.</p>
              </div>
            ) : (
              filteredIssues.map((issue) => {
                const isSelected = selectedIssue?.id === issue.id;
                return (
                  <button
                    key={issue.id}
                    id={`triage-ticket-${issue.id}`}
                    onClick={() => setSelectedIssue(issue)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col space-y-3 ${
                      isSelected 
                        ? "bg-slate-900 border-indigo-500/60 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/20" 
                        : "bg-slate-900/50 border-slate-900 hover:bg-slate-900/80 hover:border-slate-800"
                    }`}
                  >
                    {/* Severity and Status Tag Line */}
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-1.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          issue.severity === "Critical" 
                            ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                            : issue.severity === "High" 
                            ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                            : issue.severity === "Medium"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}>
                          {issue.severity}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">ID: {issue.id.slice(0, 8)}</span>
                      </div>
                      
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide flex items-center gap-1 ${
                        issue.status === "Verified & Closed"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : issue.status === "Resolved (Pending AI Verification)" || issue.status === "Resolved"
                          ? "bg-purple-500/15 text-purple-400"
                          : issue.status === "In Progress"
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-sky-500/15 text-sky-400"
                      }`}>
                        {issue.status}
                      </span>
                    </div>

                    {/* Title and location */}
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-slate-200 line-clamp-1 group-hover:text-white">
                        {issue.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{issue.location}</span>
                      </p>
                    </div>

                    {/* Department and date footers */}
                    <div className="pt-2.5 border-t border-slate-900 flex justify-between items-center text-[10px] text-slate-500">
                      <span className="flex items-center gap-1 font-bold text-slate-400">
                        <Building className="w-3 h-3 text-slate-500" />
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
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Selected Issue Detail & Operational Actions (7cols) */}
        <div className="lg:col-span-7 h-full overflow-y-auto bg-slate-900/20 border border-slate-900 rounded-3xl p-6 flex flex-col space-y-6">
          <AnimatePresence mode="wait">
            {!selectedIssue ? (
              <div className="flex-1 flex flex-col justify-center items-center py-24 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                  <FileText className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-400">No Dispatch Ticket Selected</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
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
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-900 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                        selectedIssue.severity === "Critical" 
                          ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                          : selectedIssue.severity === "High" 
                          ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                          : selectedIssue.severity === "Medium"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}>
                        {selectedIssue.severity} Severity
                      </span>
                      <span className="text-[10px] font-extrabold text-indigo-400">{selectedIssue.category}</span>
                    </div>
                    <h2 className="text-base font-black text-white">{selectedIssue.title}</h2>
                    <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5 pt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{selectedIssue.location}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start">
                    <button
                      onClick={() => handleDeleteIssue(selectedIssue.id)}
                      className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-500 hover:text-red-400 transition-colors"
                      title="Delete Ticket"
                      id="official-delete-ticket-btn"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <span className={`px-3 py-1.5 rounded-2xl text-xs font-black uppercase tracking-widest ${
                      selectedIssue.status === "Verified & Closed"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : selectedIssue.status === "Resolved (Pending AI Verification)" || selectedIssue.status === "Resolved"
                        ? "bg-purple-500/10 text-purple-400 border border-purple-500/20 animate-pulse"
                        : selectedIssue.status === "In Progress"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                    }`}>
                      {selectedIssue.status}
                    </span>
                  </div>
                </div>

                {/* Grid of Main Details and Images */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Details */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reporter Info</h4>
                      <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-3 flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-xs font-black uppercase">
                          {selectedIssue.reporterName[0] || "U"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-200 truncate">{selectedIssue.reporterName}</p>
                          <p className="text-[10px] text-slate-400 truncate font-semibold">{selectedIssue.reporterEmail}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</h4>
                      <p className="text-xs text-slate-300 leading-relaxed font-semibold bg-slate-900/30 border border-slate-900 rounded-2xl p-4">
                        {selectedIssue.description || "No description was entered for this dispatch ticket."}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-3 text-center">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Priority Index</span>
                        <span className="text-sm font-black text-indigo-400 mt-1 block">
                          {selectedIssue.priorityScore !== undefined ? `${selectedIssue.priorityScore}/100` : `Lvl ${selectedIssue.priority}`}
                        </span>
                      </div>
                      <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-3 text-center">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Report Date</span>
                        <span className="text-xs font-bold text-slate-300 mt-1.5 block">
                          {new Date(selectedIssue.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Original Image */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Original Hazard Photo</h4>
                    <div className="relative rounded-2xl overflow-hidden border border-slate-800 aspect-video bg-slate-900 flex items-center justify-center">
                      {selectedIssue.imageUrl ? (
                        <img 
                          src={selectedIssue.imageUrl} 
                          alt="Original issue evidence" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="text-slate-600 flex flex-col items-center justify-center space-y-2">
                          <ImageIcon className="w-10 h-10 text-slate-700" />
                          <p className="text-[10px] font-bold uppercase text-slate-500">No Image Attached</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ACTION 1: Assign Department */}
                <div className="space-y-2 pt-4 border-t border-slate-900">
                  <div className="flex items-center space-x-1.5">
                    <Building className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">Assign Municipal Department</h3>
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
                    <Clock className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">Update Lifecycle Status</h3>
                  </div>

                  <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                    Transition this hazard claim manually across core operations stages:
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {["Reported", "Under Review", "Assigned", "In Progress", "Resolved (Pending AI Verification)", "Verified & Closed"].map((st) => {
                      const isActive = selectedIssue.status === st;
                      return (
                        <button
                          key={st}
                          id={`official-status-${st.replace(/\s+/g, "-")}`}
                          onClick={() => handleUpdateStatus(selectedIssue.id, st)}
                          disabled={updatingStatus === selectedIssue.id}
                          className={`py-2 px-3 border rounded-xl text-[10px] font-black uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all ${
                            isActive
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10"
                              : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800"
                          }`}
                        >
                          {isActive && <Check className="w-3 h-3 text-white" />}
                          <span>{st === "Resolved (Pending AI Verification)" ? "Pending AI Audit" : st}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ACTION 3 & 4: Upload Repair Image & Run Comparative Gemini Vision */}
                <div className="space-y-4 pt-4 border-t border-slate-900">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                      <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">AI Resolution Audit</h3>
                    </div>
                    {selectedIssue.resolutionVerification && (
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Audited
                      </span>
                    )}
                  </div>

                  {/* Verification Results Display */}
                  {selectedIssue.resolutionVerification ? (
                    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900 pb-3">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            selectedIssue.resolutionVerification.status === "Resolved"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : selectedIssue.resolutionVerification.status === "Partially Resolved"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}>
                            {selectedIssue.resolutionVerification.status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Confidence Match: <b className="text-slate-200">{selectedIssue.resolutionVerification.confidenceScore}%</b>
                          </span>
                        </div>

                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                          Audited on {new Date(selectedIssue.resolutionVerification.verifiedAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Bar indicator */}
                      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            selectedIssue.resolutionVerification.status === "Resolved" ? "bg-emerald-500" :
                            selectedIssue.resolutionVerification.status === "Partially Resolved" ? "bg-amber-500" : "bg-rose-500"
                          }`}
                          style={{ width: `${selectedIssue.resolutionVerification.confidenceScore}%` }}
                        />
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                        {selectedIssue.resolutionVerification.explanation}
                      </p>

                      {/* Side by side visual audit */}
                      {selectedIssue.resolutionImage && (
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Original Issue</span>
                            <div className="aspect-video rounded-xl overflow-hidden border border-slate-900 bg-slate-950">
                              <img src={selectedIssue.imageUrl} alt="Before" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Repair Audit Proof</span>
                            <div className="aspect-video rounded-xl overflow-hidden border border-slate-900 bg-slate-950">
                              <img src={selectedIssue.resolutionImage} alt="After" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Quick close button if Resolved and status is not yet Closed */}
                      {selectedIssue.status !== "Verified & Closed" && selectedIssue.resolutionVerification.status === "Resolved" && (
                        <button
                          onClick={() => handleCloseIssue(selectedIssue.id)}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/15 flex items-center justify-center gap-2"
                          id="audit-verify-close-btn"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Close and Archive Ticket</span>
                        </button>
                      )}

                      {/* Allow re-verifying */}
                      <div className="flex justify-end pt-1">
                        <button 
                          onClick={async () => {
                            await updateFirestoreIssue(selectedIssue.id, {
                              resolutionVerification: undefined,
                              resolutionImage: undefined
                            });
                            setSelectedIssue(prev => prev ? {
                              ...prev,
                              resolutionVerification: undefined,
                              resolutionImage: undefined
                            } : null);
                          }}
                          className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 hover:underline uppercase tracking-wider"
                          id="reverify-trigger"
                        >
                          Re-Upload & Audit
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-5 space-y-4">
                      <p className="text-xs text-slate-400 leading-relaxed font-medium">
                        Compare repair efficacy by uploading the field crew's completion photo. Gemini Vision will analyze and match pixel differences to verify resolution.
                      </p>

                      {repairBase64 ? (
                        <div className="space-y-4">
                          <div className="relative rounded-2xl overflow-hidden border border-slate-800 aspect-video bg-slate-950 max-w-sm mx-auto">
                            <img 
                              src={repairBase64} 
                              alt="Repair preview" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              onClick={() => {
                                setRepairFile(null);
                                setRepairBase64("");
                              }}
                              className="absolute top-2.5 right-2.5 bg-slate-950 hover:bg-slate-900 text-white p-1 rounded-full text-xs w-6 h-6 flex items-center justify-center border border-slate-800 transition-colors"
                            >
                              ✕
                            </button>
                          </div>

                          {/* Upload Progress Indicator */}
                          {isUploading && (
                            <div className="space-y-1.5 max-w-sm mx-auto">
                              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                <span>Uploading verification proof...</span>
                                <span>{uploadProgress}%</span>
                              </div>
                              <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                                <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                              </div>
                            </div>
                          )}

                          {verificationError && (
                            <p className="text-xs text-red-400 font-bold text-center">{verificationError}</p>
                          )}

                          <button
                            onClick={handleRunVerification}
                            disabled={verifyingResolution}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400/40 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                            id="run-ai-audit-btn"
                          >
                            {verifyingResolution ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                                <span>Running Gemini Comparison Engine ({uploadProgress}%)</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                <span>Verify Repair with Gemini Vision</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => repairFileInputRef.current?.click()}
                          className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-950/40 hover:bg-slate-950/70 space-y-2.5 group"
                        >
                          <Upload className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 mx-auto transition-colors" />
                          <div className="text-xs text-slate-300 font-semibold">
                            <span className="font-extrabold text-indigo-400 group-hover:underline">Click to upload completion photo</span> or drag and drop
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium">PNG, JPG, WEBP up to 10MB</p>
                          <input 
                            type="file" 
                            ref={repairFileInputRef}
                            onChange={handleRepairFileChange}
                            accept="image/*"
                            className="hidden" 
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
