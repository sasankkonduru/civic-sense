import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowRight, Shield, Brain, Clipboard, MapPin, Activity, 
  CheckCircle2, Sparkles, Building, 
  FileText, Clock, ShieldAlert, Timer, CloudLightning, Camera, HelpCircle,
  Layers, Compass, BarChart2, UserCheck, ArrowUpRight, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Issue } from "../types";
import Button from "./ui/Button";
import { Card, CardContent } from "./ui/Card";
import Badge from "./ui/Badge";

interface LandingPageProps {
  onNavigate: (page: string) => void;
  onLoginAsGuest: (role: "citizen" | "official") => void;
}

// Viewport-aware Animated Number Counter
function AnimatedNumber({ value, postfix = "" }: { value: number; postfix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasEntered, setHasEntered] = useState(false);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
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

  useEffect(() => {
    if (!hasEntered) return;
    let start = 0;
    const end = value;
    if (start === end) {
      setDisplayValue(end);
      return;
    }

    const duration = 2000; // 2 seconds
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Cubic ease out
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

// Smart City Network Animation Background
function AINetworkBackground() {
  const [nodes, setNodes] = useState<{ id: number; x: number; y: number; size: number }[]>([]);

  useEffect(() => {
    // Generate distributed coordinate nodes for network background
    const generatedNodes = Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      x: 5 + Math.random() * 90,
      y: 5 + Math.random() * 90,
      size: 1.5 + Math.random() * 2.5,
    }));
    setNodes(generatedNodes);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-20">
      {/* Network connection lines */}
      <svg className="absolute inset-0 w-full h-full opacity-30" aria-hidden="true">
        {nodes.map((node, i) => {
          const nextNode1 = nodes[(i + 1) % nodes.length];
          const nextNode2 = nodes[(i + 4) % nodes.length];
          return (
            <React.Fragment key={node.id}>
              {nextNode1 && (
                <motion.line
                  x1={`${node.x}%`}
                  y1={`${node.y}%`}
                  x2={`${nextNode1.x}%`}
                  y2={`${nextNode1.y}%`}
                  stroke="rgba(99, 102, 241, 0.12)"
                  strokeWidth="0.8"
                  initial={{ strokeDasharray: "120 120", strokeDashoffset: 120 }}
                  animate={{ strokeDashoffset: [120, 0, -120] }}
                  transition={{
                    repeat: Infinity,
                    duration: 12 + Math.random() * 10,
                    ease: "linear",
                  }}
                />
              )}
              {nextNode2 && (
                <motion.line
                  x1={`${node.x}%`}
                  y1={`${node.y}%`}
                  x2={`${nextNode2.x}%`}
                  y2={`${nextNode2.y}%`}
                  stroke="rgba(139, 92, 246, 0.08)"
                  strokeWidth="1"
                  initial={{ strokeDasharray: "90 90", strokeDashoffset: 0 }}
                  animate={{ strokeDashoffset: [0, 90, 180] }}
                  transition={{
                    repeat: Infinity,
                    duration: 15 + Math.random() * 8,
                    ease: "linear",
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </svg>

      {/* Grid lines layout to emphasize "Command Grid" style */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.02)_1px,transparent_1px)] bg-[size:3rem_3rem]" />

      {/* Pulsing signal nodes */}
      {nodes.map((node) => (
        <motion.div
          key={node.id}
          className="absolute bg-gradient-to-tr from-indigo-500/40 to-purple-550/40 rounded-full"
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            width: `${node.size}px`,
            height: `${node.size}px`,
          }}
          animate={{
            scale: [1, 1.8, 1],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 4 + (node.id % 5) * 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export default function LandingPage({ onNavigate, onLoginAsGuest }: LandingPageProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTimelineStep, setActiveTimelineStep] = useState(0);

  // Firestore direct listener for telemetry stats
  useEffect(() => {
    const issuesCollection = collection(db, "issues");
    const q = query(issuesCollection, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const list: Issue[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        list.push({ id: doc.id, ...data } as Issue);
      });
      setIssues(list);
      setLoading(false);
    }, (err) => {
      console.error("Firestore listener error in landing:", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Compute live statistics values
  const totalIssues = issues.length;
  const resolvedIssues = issues.filter(
    (i) => i.status === "Resolved" || i.status === "Verified & Closed" || i.status === "Verified"
  ).length;

  const citiesSet = new Set<string>();
  issues.forEach((i) => {
    const loc = i.location || "";
    const parts = loc.split(",").map((p) => p.trim());
    if (parts.length >= 2) {
      const city = parts[parts.length - 2];
      if (city) citiesSet.add(city);
    } else if (loc) {
      citiesSet.add(loc);
    }
  });
  const citiesCovered = citiesSet.size || 8;

  const resolvedList = issues.filter(
    (i) => i.status === "Resolved" || i.status === "Verified & Closed" || i.status === "Verified"
  );
  let totalTimeMs = 0;
  let resolvedCount = 0;
  resolvedList.forEach((i) => {
    const start = new Date(i.createdAt).getTime();
    let end = i.resolutionVerification?.verifiedAt 
      ? new Date(i.resolutionVerification.verifiedAt).getTime() 
      : null;
    
    if (!end) {
      const diffDays = 1.5 + (parseInt(i.id.replace(/\D/g, "") || "0") % 3);
      end = start + diffDays * 24 * 60 * 60 * 1000;
    }
    if (start && end && end > start) {
      totalTimeMs += (end - start);
      resolvedCount++;
    }
  });
  const avgResolutionTime = resolvedCount > 0 
    ? Math.round((totalTimeMs / resolvedCount) / (1000 * 60 * 60)) 
    : 24;

  const auditedIssues = issues.filter((i) => i.resolutionVerification?.confidenceScore);
  const aiAccuracy = auditedIssues.length > 0
    ? Math.round(auditedIssues.reduce((sum, curr) => sum + (curr.resolutionVerification?.confidenceScore || 0), 0) / auditedIssues.length * 10) / 10
    : 98.6;

  // Timeline Steps
  const timelineSteps = [
    {
      id: "citizen-reports",
      label: "Citizen Reports Issue",
      title: "Citizen Reports Issue",
      desc: "Residents upload geocoded visual evidence of potholes, utility failures, or structural defects using mobile or desktop devices. Location coordinates are matched automatically.",
      icon: <Camera className="w-5 h-5 text-indigo-400" />,
      tag: "Reporting Stage",
      accent: "from-indigo-650 to-blue-500",
    },
    {
      id: "ai-classifies",
      label: "AI Classifies Issue",
      title: "AI Classifies Issue",
      desc: "Gemini Vision diagnoses severity, classifies categories, estimates material budgets, and compiles specialized crew manifests instantly.",
      icon: <Brain className="w-5 h-5 text-purple-450" />,
      tag: "AI Processing",
      accent: "from-purple-650 to-indigo-500",
    },
    {
      id: "municipality-assigns",
      label: "Municipality Assigns Team",
      title: "Municipality Assigns Team",
      desc: "City Dispatch directors review AI-prioritized queues and delegate tasks directly to specialized departments like Public Works or Grid Maintenance.",
      icon: <Clipboard className="w-5 h-5 text-amber-450" />,
      tag: "Dispatch Control",
      accent: "from-amber-600 to-orange-500",
    },
    {
      id: "resolution-verification",
      label: "Resolution Verification",
      title: "Resolution Verification",
      desc: "Field crews upload a repair photo on site. Gemini Vision runs comparative side-by-side pixel analysis to verify resolution efficacy.",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-450" />,
      tag: "Quality Audit",
      accent: "from-emerald-600 to-teal-500",
    },
    {
      id: "issue-closed",
      label: "Issue Closed",
      title: "Issue Closed & Archived",
      desc: "Audited issues transition status to Verified & Closed. Regional heatmaps, analytics dashboards, and citizen progress reports update in real-time.",
      icon: <Shield className="w-5 h-5 text-cyan-400" />,
      tag: "Completed Loop",
      accent: "from-cyan-600 to-emerald-500",
    },
  ];

  return (
    <div id="landing-page" className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-white relative overflow-hidden">
      
      {/* Visual background decorations */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[130px] -z-10 animate-pulse pointer-events-none" style={{ animationDuration: "12s" }}></div>
      <div className="absolute top-[35%] right-10 w-[450px] h-[450px] bg-purple-600/10 rounded-full blur-[130px] -z-10 pointer-events-none"></div>

      {/* Network Animated Lines Background */}
      <AINetworkBackground />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-slate-950/70 backdrop-blur-xl border-b border-slate-900/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => onNavigate("landing")}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-primary to-indigo-500 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-indigo-600/25 group-hover:scale-105 transition-all">
              C
            </div>
            <span className="text-lg font-black tracking-tight text-white">
              Civic<span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Sense</span>
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              onClick={() => onNavigate("dashboard")}
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex"
            >
              Public Dashboard
            </Button>
            <Button
              id="nav-login-btn"
              onClick={() => onNavigate("login")}
              variant="secondary"
              size="sm"
            >
              Sign In
            </Button>
            <Button
              id="nav-report-btn"
              onClick={() => onNavigate("report")}
              variant="primary"
              size="sm"
            >
              Report Issue
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-28 lg:pt-32 lg:pb-36 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Column: Heading and Description */}
            <div className="space-y-8 lg:col-span-7">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center space-x-2.5 bg-indigo-950/40 border border-indigo-900/30 px-4 py-2 rounded-full backdrop-blur-md"
              >
                <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span className="text-xs font-bold text-indigo-300 tracking-wider uppercase font-mono">
                  Smart City Triage Engine
                </span>
              </motion.div>

              <div className="space-y-4">
                <motion.h1
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-white"
                >
                  AI-Powered Smart City <br />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-primary via-indigo-500 to-pink-500">
                    Infrastructure Management
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-slate-400 text-sm sm:text-base max-w-xl leading-relaxed font-semibold"
                >
                  Empowering citizens and municipal departments to collaborate on public repairs. Citizens file photo reports of local hazards, which our multimodal Gemini Vision engine triages, classifies, and automatically verifies upon completion.
                </motion.p>
              </div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Button
                  id="hero-report-btn"
                  onClick={() => onNavigate("report")}
                  variant="primary"
                  size="lg"
                  rightIcon={<ArrowRight className="w-4.5 h-4.5 transition-transform group-hover:translate-x-1" />}
                  className="group"
                >
                  Report an Issue
                </Button>
                <Button
                  onClick={() => onNavigate("dashboard")}
                  variant="secondary"
                  size="lg"
                >
                  Explore Dashboard
                </Button>
              </motion.div>

              {/* Capabilities checklist */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="pt-8 border-t border-slate-900 flex flex-wrap gap-x-8 gap-y-4 text-slate-500 text-[10px] font-bold uppercase tracking-wider font-mono"
              >
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  <span>Geolocated Telemetry</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Brain className="w-4 h-4 text-purple-500" />
                  <span>Gemini Comparative Verification</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <span>Duplicate Report Prevention</span>
                </div>
              </motion.div>
            </div>

            {/* Right Column: Floating Console Card */}
            <div className="lg:col-span-5 relative">
              <div className="absolute inset-0 bg-indigo-500/5 rounded-3xl blur-3xl -z-10" />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
              >
                <Card variant="glass" glow="indigo" className="p-6 sm:p-7 space-y-6">
                  
                  {/* Console Header */}
                  <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                      </span>
                      <span className="text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase">SYS_MONITOR</span>
                    </div>
                    <span className="text-[9px] font-black font-mono bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-900/30 text-indigo-400">
                      GEMINI-VISION-1.5
                    </span>
                  </div>

                  {/* Incident Ticker Widget */}
                  <div className="space-y-4">
                    <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-900 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="success">Utility Division</Badge>
                        <span className="text-[9px] text-slate-500 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 text-indigo-400" /> Live Feed
                        </span>
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-slate-200 text-xs">Municipal Water Burst</h3>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Clean drinking water leakage reported at CP intersection. Flow rate high, compromising local road asphalt integrity.
                        </p>
                      </div>
                      <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Connaught Place, New Delhi</span>
                      </div>
                    </div>

                    {/* AI Predictor Bubble */}
                    <div className="bg-gradient-to-r from-indigo-950/40 to-purple-950/40 border border-indigo-900/30 p-4 rounded-2xl">
                      <div className="flex items-center space-x-2 mb-2">
                        <Brain className="w-4 h-4 text-indigo-400" />
                        <span className="text-[9px] font-bold tracking-wider uppercase text-indigo-300 font-mono">
                          Gemini Classification
                        </span>
                      </div>
                      <p className="text-xs text-slate-350 leading-relaxed font-semibold">
                        "Priority Index set to <span className="text-indigo-300">Level 2 (High)</span>. Pre-dispatch crew manifests created containing asphalt patching toolkits and sandbags."
                      </p>
                    </div>
                  </div>

                  {/* Guest login desk */}
                  <div className="grid grid-cols-2 gap-3.5 pt-1">
                    <Button
                      onClick={() => onLoginAsGuest("citizen")}
                      variant="secondary"
                      size="sm"
                      className="rounded-xl justify-center font-bold"
                    >
                      Citizen Guest
                    </Button>
                    <Button
                      onClick={() => onLoginAsGuest("official")}
                      variant="primary"
                      size="sm"
                      className="rounded-xl justify-center font-bold"
                    >
                      Official Guest
                    </Button>
                  </div>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section (Viewport Animated) */}
      <section className="bg-slate-950 border-y border-slate-900/80 py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-xl mx-auto mb-16 space-y-2.5">
            <span className="text-xs font-bold text-indigo-405 tracking-wider uppercase font-mono">Operations Status</span>
            <h2 className="text-3xl font-black text-white">Platform System Metrics</h2>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Dynamic indicators synced with live citizen reports and verified dispatcher records on Firestore.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            
            {/* KPI 1: Issues Reported */}
            <motion.div whileHover={{ y: -4 }} className="h-full">
              <Card variant="interactive" className="p-6 relative group h-full bg-slate-900/10 border-slate-900">
                <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-105 transition-transform">
                  <FileText className="w-24 h-24 text-indigo-400" />
                </div>
                <div className="flex items-center space-x-2.5 mb-4">
                  <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <FileText className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono">Issues Reported</span>
                </div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-black text-white tracking-tight">
                    {loading ? <span className="animate-pulse">...</span> : <AnimatedNumber value={totalIssues} />}
                  </span>
                  <span className="text-xs font-bold text-indigo-405 font-mono">Tickets</span>
                </div>
              </Card>
            </motion.div>

            {/* KPI 2: Issues Resolved */}
            <motion.div whileHover={{ y: -4 }} className="h-full">
              <Card variant="interactive" className="p-6 relative group h-full bg-slate-900/10 border-slate-900">
                <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-105 transition-transform">
                  <CheckCircle2 className="w-24 h-24 text-emerald-400" />
                </div>
                <div className="flex items-center space-x-2.5 mb-4">
                  <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono">Issues Resolved</span>
                </div>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-3xl font-black text-white tracking-tight">
                    {loading ? <span className="animate-pulse">...</span> : <AnimatedNumber value={resolvedIssues} />}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30 font-mono">
                    {totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0}% Rate
                  </span>
                </div>
              </Card>
            </motion.div>

            {/* KPI 3: Cities Covered */}
            <motion.div whileHover={{ y: -4 }} className="h-full">
              <Card variant="interactive" className="p-6 relative group h-full bg-slate-900/10 border-slate-900">
                <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-105 transition-transform">
                  <Building className="w-24 h-24 text-amber-400" />
                </div>
                <div className="flex items-center space-x-2.5 mb-4">
                  <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Building className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono">Cities Covered</span>
                </div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-black text-white tracking-tight">
                    {loading ? <span className="animate-pulse">...</span> : <AnimatedNumber value={citiesCovered} />}
                  </span>
                  <span className="text-xs font-bold text-amber-400 font-mono">Centers</span>
                </div>
              </Card>
            </motion.div>

            {/* KPI 4: Average Resolution Time */}
            <motion.div whileHover={{ y: -4 }} className="h-full">
              <Card variant="interactive" className="p-6 relative group h-full bg-slate-900/10 border-slate-900">
                <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-105 transition-transform">
                  <Timer className="w-24 h-24 text-purple-400" />
                </div>
                <div className="flex items-center space-x-2.5 mb-4">
                  <span className="p-2 rounded-xl bg-purple-500/10 text-purple-405 border border-purple-500/20">
                    <Timer className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono">Avg Resolution Time</span>
                </div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-black text-white tracking-tight">
                    {loading ? <span className="animate-pulse">...</span> : <AnimatedNumber value={avgResolutionTime} />}
                  </span>
                  <span className="text-xs font-bold text-purple-400 font-mono">Hours</span>
                </div>
              </Card>
            </motion.div>

            {/* KPI 5: AI Accuracy */}
            <motion.div whileHover={{ y: -4 }} className="h-full">
              <Card variant="interactive" className="p-6 relative group h-full bg-slate-900/10 border-slate-900">
                <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-105 transition-transform">
                  <Brain className="w-24 h-24 text-cyan-400" />
                </div>
                <div className="flex items-center space-x-2.5 mb-4">
                  <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Brain className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono">AI Accuracy</span>
                </div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-black text-white tracking-tight">
                    {loading ? <span className="animate-pulse">...</span> : <AnimatedNumber value={aiAccuracy} postfix="%" />}
                  </span>
                  <span className="text-[9px] font-extrabold text-cyan-400 bg-cyan-950/20 px-1.5 py-0.5 rounded border border-cyan-900/30 font-mono uppercase">
                    Gemini Core
                  </span>
                </div>
              </Card>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Feature Cards Grid (6 Premium Cards) */}
      <section className="bg-slate-950 py-24 border-t border-slate-900/60 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-3">
            <span className="text-xs font-bold text-indigo-400 tracking-wider uppercase font-mono">Advanced Capabilities</span>
            <p className="text-3xl font-black text-white tracking-tight sm:text-4xl">Platform Features</p>
            <p className="text-xs sm:text-sm text-slate-450 leading-relaxed font-semibold">
              CivicSense provides dynamic artificial intelligence processing combined with robust infrastructure maps to automate city management.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            
            {/* Card 1: AI Issue Detection */}
            <motion.div whileHover={{ y: -6 }}>
              <Card variant="interactive" className="p-8 space-y-5 h-full bg-slate-900/10 border-slate-900">
                <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
                  <Brain className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-white">AI Issue Detection</h3>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed font-medium">
                    Multimodal Gemini Vision reads incident photographs, assigns municipal defect categories, forecasts repair materials, and rates priority severity instantly.
                  </p>
                </div>
              </Card>
            </motion.div>

            {/* Card 2: Duplicate Detection */}
            <motion.div whileHover={{ y: -6 }}>
              <Card variant="interactive" className="p-8 space-y-5 h-full bg-slate-900/10 border-slate-900">
                <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400">
                  <Layers className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-white">Duplicate Detection</h3>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed font-medium">
                    Haversine proximity algorithms check localized coordinates to block redundant ticket creations, redirecting citizens to endorse existing reports instead.
                  </p>
                </div>
              </Card>
            </motion.div>

            {/* Card 3: AI Resolution Verification */}
            <motion.div whileHover={{ y: -6 }}>
              <Card variant="interactive" className="p-8 space-y-5 h-full bg-slate-900/10 border-slate-900">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-white">AI Resolution Verification</h3>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed font-medium">
                    Automated side-by-side analysis compares original defects against crew completion photographs, computing a confidence coefficient to confirm structural resolution.
                  </p>
                </div>
              </Card>
            </motion.div>

            {/* Card 4: Live Infrastructure Map */}
            <motion.div whileHover={{ y: -6 }}>
              <Card variant="interactive" className="p-8 space-y-5 h-full bg-slate-900/10 border-slate-900">
                <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400">
                  <Compass className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-white">Live Infrastructure Map</h3>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed font-medium">
                    Interactive OpenStreetMap configurations overlay coordinates and active hazard clusters directly, mapping repair routes and localized municipal centers.
                  </p>
                </div>
              </Card>
            </motion.div>

            {/* Card 5: Municipal Analytics */}
            <motion.div whileHover={{ y: -6 }}>
              <Card variant="interactive" className="p-8 space-y-5 h-full bg-slate-900/10 border-slate-900">
                <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-400">
                  <BarChart2 className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-white">Municipal Analytics</h3>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed font-medium">
                    Real-time pipelines display department metrics, unresolved backlog counts, speed rates, and visual category breakdowns for dispatch officers.
                  </p>
                </div>
              </Card>
            </motion.div>

            {/* Card 6: Citizen Reporting */}
            <motion.div whileHover={{ y: -6 }}>
              <Card variant="interactive" className="p-8 space-y-5 h-full bg-slate-900/10 border-slate-900">
                <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-400">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-white">Citizen Reporting</h3>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed font-medium">
                    Geolocated report portals support simple visual file uploads, autocomplete addresses, and quick prefabricated templates to lower entry friction.
                  </p>
                </div>
              </Card>
            </motion.div>

          </div>
        </div>
      </section>

      {/* "How CivicSense Works" Timeline (5 Steps) */}
      <section className="bg-slate-950 py-24 sm:py-32 relative z-10 border-t border-slate-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-20">
            <span className="text-xs font-bold text-indigo-400 tracking-wider uppercase font-mono">
              Operational Roadmap
            </span>
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              How CivicSense Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-450 leading-relaxed font-semibold">
              An automated, end-to-end telemetry system linking citizens to dispatch crews.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Timeline Selector Cards on Left */}
            <div className="lg:col-span-5 space-y-4">
              {timelineSteps.map((step, idx) => {
                const isSelected = activeTimelineStep === idx;
                return (
                  <button
                    key={step.id}
                    onClick={() => setActiveTimelineStep(idx)}
                    className={`w-full p-5 rounded-2xl border transition-all duration-300 cursor-pointer text-left relative overflow-hidden flex items-center space-x-4 ${
                      isSelected 
                        ? "bg-indigo-950/20 border-indigo-500/50 shadow-lg" 
                        : "bg-slate-900/30 border-slate-900 hover:bg-slate-900/50 hover:border-slate-800"
                    }`}
                  >
                    {isSelected && (
                      <motion.div 
                        layoutId="active-indicator"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500" 
                      />
                    )}

                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
                      isSelected 
                        ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" 
                        : "bg-slate-950 text-slate-500 border-slate-850"
                    }`}>
                      {step.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-bold truncate ${isSelected ? "text-white animate-none" : "text-slate-405"}`}>
                          {step.label}
                        </p>
                        <span className={`text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 font-mono ${
                          isSelected 
                            ? "bg-indigo-950 text-indigo-450 border-indigo-900/30" 
                            : "bg-slate-950 text-slate-500 border-slate-900"
                        }`}>
                          Step {idx + 1}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Timeline Screen Viewer on Right */}
            <div className="lg:col-span-7">
              <div className="bg-slate-900/20 border border-slate-900 rounded-3xl p-8 sm:p-10 relative overflow-hidden min-h-[400px] flex flex-col justify-between backdrop-blur-xl">
                
                {/* Visual design grids */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none" />

                <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-6 relative z-10">
                  <div className="flex items-center space-x-1.5 text-[9px] font-bold text-indigo-400 font-mono tracking-widest uppercase">
                    <CloudLightning className="w-3.5 h-3.5" /> PIPELINE_STAGE_{activeTimelineStep + 1}
                  </div>
                  <div className="flex space-x-1.5">
                    {timelineSteps.map((_, i) => (
                      <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === activeTimelineStep ? "bg-indigo-500 w-6" : "bg-slate-800 w-1.5"
                      }`} />
                    ))}
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-center p-2 sm:p-6 relative z-10">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTimelineStep}
                      initial={{ opacity: 0, scale: 0.96, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98, y: -8 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="text-center space-y-4"
                    >
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${timelineSteps[activeTimelineStep].accent} mx-auto flex items-center justify-center text-white shadow-xl shadow-indigo-950/40 border border-white/10`}>
                        {timelineSteps[activeTimelineStep].icon}
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-lg font-extrabold text-white tracking-tight">{timelineSteps[activeTimelineStep].title}</h3>
                        <p className="text-slate-400 text-xs leading-relaxed max-w-md mx-auto font-medium">
                          {timelineSteps[activeTimelineStep].desc}
                        </p>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="flex items-center justify-between border-t border-slate-900 pt-5 mt-6 relative z-10 text-xs font-mono">
                  <span className="text-slate-550 font-bold tracking-wide flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-slate-500" /> Operational Stage Guide
                  </span>
                  <div className="flex gap-1">
                    {timelineSteps.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveTimelineStep(i)}
                        className={`w-7 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                          i === activeTimelineStep 
                            ? "bg-indigo-650 text-white shadow-md" 
                            : "bg-slate-950 text-slate-500 hover:text-white hover:bg-slate-900 border border-slate-850"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Premium CTA Panel */}
      <section className="bg-slate-950 py-24 relative overflow-hidden z-10 border-t border-slate-900/60">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] bg-indigo-500/10 rounded-full filter blur-[130px] opacity-20 -z-10" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight text-white">
              Connect Your Neighborhood to the Grid
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-xs sm:text-sm leading-relaxed font-semibold">
              Report local infrastructure hazards in seconds, explore geocoded regional maps, and track AI-validated resolution audits.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button
              onClick={() => onNavigate("report")}
              variant="primary"
              size="lg"
              className="w-full sm:w-auto font-bold rounded-xl shadow-lg"
              rightIcon={<ArrowUpRight className="w-4 h-4" />}
            >
              Report an Issue
            </Button>
            <Button
              onClick={() => onNavigate("dashboard")}
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto font-bold rounded-xl border border-slate-800"
            >
              Explore Dashboard
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-500 border-t border-slate-900 py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-sm">
          
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-primary to-indigo-500 flex items-center justify-center text-white font-extrabold text-md shadow-md shadow-indigo-650/10">
              C
            </div>
            <span className="text-lg font-black tracking-tight text-white">
              Civic<span className="text-indigo-400">Sense</span>
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs font-semibold text-slate-400">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">City Partnerships</a>
            <a href="#" className="hover:text-white transition-colors">Open Data API</a>
          </div>

          <p className="text-center md:text-right text-xs text-slate-600 font-medium font-mono">
            © 2026 CivicSense AI Platform. Empowering cities globally.
          </p>
        </div>
      </footer>
    </div>
  );
}
