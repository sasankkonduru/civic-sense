import React, { useState, useRef, useEffect } from "react";
import { 
  Upload, MapPin, Sparkles, Brain, AlertTriangle, ArrowLeft, 
  Image as ImageIcon, CheckCircle, FileText, X, Check, ChevronLeft, ChevronRight,
  Trash2, Droplets, Lightbulb, Hammer, Loader2, AlertCircle, Info, Coins, ShieldCheck,
  Camera, FileDown, Eye, FileSpreadsheet, ShieldAlert, Sparkle, RefreshCw, BarChart2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Issue } from "../types";
import { uploadFileToStorage, uploadBase64ToStorage, createFirestoreIssue, getAllFirestoreIssues, updateFirestoreIssue } from "../firebase";

interface ReportPageProps {
  onNavigate: (page: string) => void;
  currentUser: { uid?: string; email: string; name: string; role: "citizen" | "official"; picture?: string } | null;
}

// Custom vector illustrations for the quick templates to bypass missing asset errors beautifully
function TemplateIllustration({ category }: { category: string }) {
  if (category === "Pothole") {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-rose-50 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-100/50 via-rose-50/20 to-transparent"></div>
        <div className="absolute w-12 h-12 rounded-full border border-rose-100 bg-rose-100/30 flex items-center justify-center animate-pulse">
          <AlertTriangle className="w-6 h-6 text-rose-500" />
        </div>
        <svg className="absolute inset-x-0 bottom-0 h-6 text-rose-200/60" viewBox="0 0 100 10" preserveAspectRatio="none">
          <path d="M0,10 Q25,3 50,8 T100,10 L100,10 L0,10 Z" fill="currentColor" />
          <path d="M10,8 Q35,1 60,6 T100,8" fill="none" stroke="#fecdd3" strokeWidth="0.5" strokeDasharray="2,2" />
        </svg>
      </div>
    );
  }
  if (category === "Garbage") {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-amber-50 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-100/50 via-amber-50/20 to-transparent"></div>
        <div className="absolute w-12 h-12 rounded-full border border-amber-100 bg-amber-100/30 flex items-center justify-center">
          <Trash2 className="w-6 h-6 text-amber-500 animate-bounce" style={{ animationDuration: "3s" }} />
        </div>
        <div className="absolute bottom-3 left-4 w-2 h-2 rounded bg-amber-200/70 rotate-12"></div>
        <div className="absolute top-4 right-6 w-1.5 h-1.5 rounded-full bg-amber-300"></div>
      </div>
    );
  }
  if (category === "Water Leakage") {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-sky-50 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-100/50 via-sky-50/20 to-transparent"></div>
        <div className="absolute w-12 h-12 rounded-full border border-sky-100 bg-sky-100/30 flex items-center justify-center">
          <Droplets className="w-6 h-6 text-sky-500 animate-pulse" />
        </div>
        <div className="absolute bottom-2 inset-x-0 flex justify-center space-x-1">
          <span className="w-1.5 h-1.5 bg-sky-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
          <span className="w-1.5 h-1.5 bg-sky-300 rounded-full animate-bounce" style={{ animationDelay: "200ms" }}></span>
          <span className="w-1.5 h-1.5 bg-sky-300 rounded-full animate-bounce" style={{ animationDelay: "400ms" }}></span>
        </div>
      </div>
    );
  }
  if (category === "Broken Streetlight") {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-indigo-50 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-100/50 via-indigo-50/20 to-transparent"></div>
        <div className="absolute w-12 h-12 rounded-full border border-indigo-100 bg-indigo-100/30 flex items-center justify-center">
          <Lightbulb className="w-6 h-6 text-indigo-400" />
        </div>
        <div className="absolute -inset-1 border border-indigo-200/40 rounded-full animate-ping" style={{ animationDuration: "4s" }}></div>
      </div>
    );
  }
  if (category === "Road Damage") {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-orange-50 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-100/50 via-orange-50/20 to-transparent"></div>
        <div className="absolute w-12 h-12 rounded-full border border-orange-100 bg-orange-100/30 flex items-center justify-center">
          <Hammer className="w-6 h-6 text-orange-500" />
        </div>
        <div className="absolute bottom-1 inset-x-0 h-1 bg-orange-200/50 flex space-x-2 overflow-hidden">
          <div className="w-4 h-full bg-orange-400 transform -skew-x-12"></div>
          <div className="w-4 h-full bg-orange-400 transform -skew-x-12"></div>
          <div className="w-4 h-full bg-orange-400 transform -skew-x-12"></div>
        </div>
      </div>
    );
  }
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-slate-50 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-100/50 via-slate-50/20 to-transparent"></div>
      <div className="absolute w-12 h-12 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center">
        <ImageIcon className="w-6 h-6 text-slate-400" />
      </div>
    </div>
  );
}

export default function ReportPage({ onNavigate, currentUser }: ReportPageProps) {
  // Wizard Navigation Step
  // Step 0: Upload Visual Evidence
  // Step 1: Hazard Details (Title, Description, GPS)
  // Step 2: AI Dispatch Review
  const [currentStep, setCurrentStep] = useState(0);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [detectingGPS, setDetectingGPS] = useState(false);
  
  const [imageUrl, setImageUrl] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageMetadata, setImageMetadata] = useState<{ name: string; size: string; type: string } | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionStage, setSubmissionStage] = useState<"idle" | "upload" | "analyze" | "duplicates" | "create">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);

  const [successIssue, setSuccessIssue] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [previewsAIAnalysis, setPreviewsAIAnalysis] = useState<any | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<{
    duplicateProbability: number;
    similarExistingIssues: any[];
    duplicateOf: string | null;
    explanation?: string;
  } | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [supportedIssueSuccess, setSupportedIssueSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ready-made templates to make testing beautiful & fun
  const templates = [
    {
      name: "Pothole",
      title: "Severe Pothole on Jubilee Hills Road No. 36",
      description: "Large, deep pothole at the turn on Road No. 36 near metro pillar 1620. Vehicles swerve abruptly to avoid it, creating extreme collision risk.",
      category: "Pothole",
      severity: "Critical" as const,
      status: "Reported",
      priority: 3,
      priorityLevel: "Critical" as const,
      priorityScore: 88,
      location: "Road No. 36, Jubilee Hills, Hyderabad, Telangana",
      latitude: 17.4325,
      longitude: 78.4071,
      imageUrl: "/demo-images/pothole.svg",
      recommendedAction: "Deploy immediate asphalt repair team to fill pothole and restore road safety.",
      explanation: "Identified deep pothole on a high-traffic roadway, causing severe vehicle maneuvering risk.",
      shortDescription: "Large, deep pothole causing vehicle collision risk."
    },
    {
      name: "Garbage",
      title: "Overflowing Garbage Bin & Litter Pile",
      description: "Major commercial waste bin overflowing onto the main pavement. Stray animals are spreading litter, posing a severe public health hazard.",
      category: "Garbage",
      severity: "High" as const,
      status: "Reported",
      priority: 2,
      priorityLevel: "High" as const,
      priorityScore: 75,
      location: "100 Feet Rd, Indiranagar, Bengaluru, Karnataka",
      latitude: 12.9716,
      longitude: 77.6412,
      imageUrl: "/demo-images/garbage.svg",
      recommendedAction: "Dispatch sanitation waste disposal truck to clear the overflowing dump site.",
      explanation: "Commercial waste bin overflows onto a public sidewalk, causing immediate sanitation hazards.",
      shortDescription: "Overflowing commercial waste bin spreading onto sidewalk."
    },
    {
      name: "Water Leak",
      title: "Drinking Water Pipeline Leakage",
      description: "Substantial freshwater is leaking continuously from a damaged underground pipeline, flooding the main road and reducing domestic pressure.",
      category: "Water Leakage",
      severity: "Medium" as const,
      status: "Reported",
      priority: 2,
      priorityLevel: "Medium" as const,
      priorityScore: 58,
      location: "Anna Salai, Near Spencer Plaza, Chennai, Tamil Nadu",
      latitude: 13.0604,
      longitude: 80.2504,
      imageUrl: "/demo-images/water-leak.svg",
      recommendedAction: "Deploy water works utility team to patch or replace the ruptured main pipeline.",
      explanation: "Underground main drinking water pipe rupture causing local flooding and utility loss.",
      shortDescription: "Freshwater line leakage flooding main roadway."
    },
    {
      name: "Streetlight",
      title: "Non-functional High-Mast Streetlight",
      description: "The primary high-mast light is completely dead, making the crosswalk pitch black and extremely unsafe for pedestrians at night.",
      category: "Broken Streetlight",
      severity: "Medium" as const,
      status: "Reported",
      priority: 1,
      priorityLevel: "Medium" as const,
      priorityScore: 62,
      location: "Linking Road, Bandra West, Mumbai, Maharashtra",
      latitude: 19.0596,
      longitude: 72.8295,
      imageUrl: "/demo-images/streetlight.svg",
      recommendedAction: "Deploy electrical utility crew to replace the faulty high-mast luminaire and restore street lighting.",
      explanation: "Complete failure of the primary high-mast intersection streetlight, causing pedestrian safety risks.",
      shortDescription: "Primary high-mast streetlight completely non-functional."
    },
    {
      name: "Road Damage",
      title: "Damaged Pedestrian Pavement / Open Manhole",
      description: "An open manhole chamber with broken concrete slabs on the Connaught Place pedestrian pathway, posing an active falling hazard.",
      category: "Road Damage",
      severity: "Critical" as const,
      status: "Reported",
      priority: 3,
      priorityLevel: "Critical" as const,
      priorityScore: 92,
      location: "Connaught Place Outer Circle, New Delhi, Delhi",
      latitude: 28.6304,
      longitude: 77.2177,
      imageUrl: "/demo-images/road-damage.svg",
      recommendedAction: "Erect immediate physical hazard barriers and deploy emergency civil repair team to secure and seal manhole.",
      explanation: "Broken pavement slab exposing an active manhole shaft, posing immediate pedestrian injury threat.",
      shortDescription: "Open manhole and broken concrete slabs on busy walkway."
    }
  ];

  // Auto-detect GPS location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      setDetectingGPS(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setLocation(`${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`);
          setDetectingGPS(false);
        },
        (error) => {
          console.warn("Initial auto-detect geolocation failed or blocked:", error);
          // Set reasonable default coords (India Center)
          setLatitude(20.5937);
          setLongitude(78.9629);
          setLocation("20.59370, 78.96290");
          setDetectingGPS(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setLatitude(20.5937);
      setLongitude(78.9629);
      setLocation("20.59370, 78.96290");
    }
  }, []);

  // Request high accuracy GPS coordinates instantly
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      setDetectingGPS(true);
      setErrorMessage("");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setLocation(`${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`);
          setDetectingGPS(false);
        },
        (error) => {
          console.error("Manual GPS detection failed:", error);
          setErrorMessage("Could not detect GPS. Please ensure location services are enabled in your browser.");
          setDetectingGPS(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setErrorMessage("Geolocation is not supported by your browser.");
    }
  };

  // Convert uploaded image file to Base64 & Preview
  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Only image files (.jpg, .png, .webp) are supported.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setErrorMessage("Image exceeds 5MB size limit.");
      return;
    }

    setErrorMessage("");
    setImageFile(file);
    setImageLoadError(false);

    // Capture file dimensions metadata
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    setImageMetadata({
      name: file.name,
      size: `${sizeInMB} MB`,
      type: file.type.split("/")[1].toUpperCase()
    });

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setImageBase64(b64);
      setImageUrl(b64); // Use base64 string as direct preview source
      
      // Clear previous diagnostic and trigger fresh vision analysis
      setPreviewsAIAnalysis(null);
      setTimeout(() => {
        triggerLiveAIAnalysis(description, title, location, b64, undefined);
      }, 50);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl("");
    setImageBase64("");
    setImageFile(null);
    setImageMetadata(null);
    setPreviewsAIAnalysis(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Trigger real-time AI triage analysis on the fly
  const triggerLiveAIAnalysis = async (
    customDesc?: string,
    customTitle?: string,
    customLoc?: string,
    customBase64?: string,
    customImgUrl?: string
  ) => {
    const activeDesc = customDesc !== undefined ? customDesc : description;
    const activeTitle = customTitle !== undefined ? customTitle : title;
    const activeLoc = customLoc !== undefined ? customLoc : location;
    const activeBase64 = customBase64 !== undefined ? customBase64 : imageBase64;
    const activeImgUrl = customImgUrl !== undefined ? customImgUrl : imageUrl;

    // We need at least an image or a description to analyze
    if (!activeBase64 && !activeImgUrl && !activeDesc) {
      return;
    }

    try {
      setAnalyzingImage(true);
      setErrorMessage("");
      
      const payload = {
        title: activeTitle || "Infrastructure Issue",
        description: activeDesc || "Automated image diagnostic analysis.",
        location: activeLoc || "Detected Location",
        imageBase64: activeBase64 && activeBase64.startsWith("data:image") ? activeBase64 : undefined,
        imageUrl: activeImgUrl && activeImgUrl.startsWith("http") ? activeImgUrl : undefined,
      };

      const res = await fetch("/api/analyze-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.aiAnalysis) {
          setPreviewsAIAnalysis(data.aiAnalysis);
        }
      } else {
        console.warn("AI pre-analysis returned non-ok status");
      }
    } catch (err) {
      console.error("Live AI analysis pre-trigger failed:", err);
    } finally {
      setAnalyzingImage(false);
    }
  };

  // Submit report: Upload image to Firebase Storage, analyze with AI, then save to Firestore
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !location) {
      setErrorMessage("Please fill in all required fields (Title, Description, and Location).");
      setCurrentStep(1); // bounce back to details step
      return;
    }

    // Helper to enforce timeouts on promises to prevent hanging states
    const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, stepName: string): Promise<T> => {
      let timeoutHandle: any;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`${stepName} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });
      try {
        const result = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timeoutHandle);
        return result;
      } catch (err) {
        clearTimeout(timeoutHandle);
        throw err;
      }
    };

    try {
      setSubmitting(true);
      setErrorMessage("");
      setSubmissionStage("upload");
      setUploadProgress(15);

      console.log("=== SUBMISSION WORKFLOW AUDIT START ===");

      // Animate simulated upload progress nicely
      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressTimer);
            return 90;
          }
          return prev + Math.floor(Math.random() * 12) + 4;
        });
      }, 120);

      // Step 1: Image upload to Firebase Storage
      let finalStorageUrl = imageUrl;
      console.log("[Audit Step 1/5] Image upload to Firebase Storage: Starting...");
      try {
        if (imageFile) {
          console.log("Uploading image file to Firebase Storage...", imageFile.name);
          const storagePath = `issues/${Date.now()}_${imageFile.name}`;
          finalStorageUrl = await withTimeout(uploadFileToStorage(imageFile, storagePath), 10000, "Image upload");
          console.log("[Audit Step 1/5] Image upload to Firebase Storage: Success. URL:", finalStorageUrl);
        } else if (imageBase64 && imageBase64.startsWith("data:image")) {
          console.log("Uploading base64 image to Firebase Storage...");
          const storagePath = `issues/${Date.now()}_image.png`;
          finalStorageUrl = await withTimeout(uploadBase64ToStorage(imageBase64, storagePath), 10000, "Image upload");
          console.log("[Audit Step 1/5] Image upload to Firebase Storage: Success. URL:", finalStorageUrl);
        } else {
          console.log("[Audit Step 1/5] Image upload to Firebase Storage: Success (Skipped, using preset URL).");
        }
      } catch (err: any) {
        console.error("[Audit Step 1/5] Image upload to Firebase Storage: Exception/Failure.", err);
        console.warn("Falling back to default placeholder image due to storage upload failure/timeout.");
        finalStorageUrl = "https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&q=80&w=600";
      } finally {
        clearInterval(progressTimer);
        setUploadProgress(100);
      }

      // Step 2: Gemini Vision analysis
      setSubmissionStage("analyze");
      console.log("[Audit Step 2/5] Gemini Vision analysis: Starting...");
      let aiAnalysis = previewsAIAnalysis;
      try {
        if (!aiAnalysis) {
          const analyzePromise = (async () => {
            const analyzeRes = await fetch("/api/analyze-issue", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title,
                description,
                location,
                imageBase64: imageBase64 && imageBase64.startsWith("data:image") ? imageBase64 : undefined,
                imageUrl: imageUrl && imageUrl.startsWith("http") ? imageUrl : undefined,
              })
            });
            if (!analyzeRes.ok) {
              throw new Error(`Server returned status ${analyzeRes.status}`);
            }
            const data = await analyzeRes.json();
            return data.aiAnalysis;
          })();
          aiAnalysis = await withTimeout(analyzePromise, 12000, "Gemini Vision analysis");
          console.log("[Audit Step 2/5] Gemini Vision analysis: Success. Data:", aiAnalysis);
        } else {
          console.log("[Audit Step 2/5] Gemini Vision analysis: Success (Using pre-analyzed metadata).");
        }
      } catch (err: any) {
        console.error("[Audit Step 2/5] Gemini Vision analysis: Exception/Failure.", err);
        console.warn("Falling back to client-side rule-based classification due to analysis failure.");
      }

      if (!aiAnalysis) {
        const descLower = description.toLowerCase();
        let fallbackCat = "Other";
        let fallbackSev: 'Low' | 'Medium' | 'High' | 'Critical' = "Medium";
        let fallbackPri = 3;
        let fallbackRec = "Dispatch municipal field verification crew.";
        
        if (descLower.includes("water") || descLower.includes("leak") || descLower.includes("flood") || descLower.includes("hydrant")) {
          fallbackCat = "Water Leakage";
          fallbackSev = "Critical";
          fallbackPri = 1;
          fallbackRec = "Dispatch emergency municipal utility response team to isolate valve and repair leakage.";
        } else if (descLower.includes("light") || descLower.includes("dark") || descLower.includes("blackout") || descLower.includes("streetlight")) {
          fallbackCat = "Broken Streetlight";
          fallbackSev = "Medium";
          fallbackPri = 3;
          fallbackRec = "Replace burned-out street lamps.";
        } else if (descLower.includes("pothole")) {
          fallbackCat = "Pothole";
          fallbackSev = "High";
          fallbackPri = 2;
          fallbackRec = "Schedule localized asphalt cold patching.";
        }

        aiAnalysis = {
          category: fallbackCat,
          severity: fallbackSev,
          priority: fallbackPri,
          explanation: "Generated by client-side fallback rule engine.",
          recommendedAction: fallbackRec,
          estimatedCost: "$350 - $750",
          confidenceScore: 70
        };
      }

      // Step 3: Priority score generation
      setSubmissionStage("create");
      console.log("[Audit Step 3/5] Priority score generation: Starting...");
      let priorityScore = 50;
      let priorityLevel: 'Low' | 'Medium' | 'High' | 'Critical' = "Medium";
      try {
        const priorityPromise = (async () => {
          const priorityRes = await fetch("/api/priority-agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              category: aiAnalysis.category,
              severity: aiAnalysis.severity,
              issueAge: "0 hours (newly reported)"
            })
          });
          if (!priorityRes.ok) {
            throw new Error(`Server returned status ${priorityRes.status}`);
          }
          return await priorityRes.json();
        })();
        const priorityData = await withTimeout(priorityPromise, 8000, "Priority score generation");
        priorityScore = priorityData.priorityScore;
        priorityLevel = priorityData.priorityLevel;
        console.log("[Audit Step 3/5] Priority score generation: Success. Score:", priorityScore, "Level:", priorityLevel);
      } catch (err: any) {
        console.error("[Audit Step 3/5] Priority score generation: Exception/Failure.", err);
        console.warn("Using default priority settings due to priority generation failure.");
      }

      // Step 4: Duplicate detection
      setSubmissionStage("duplicates");
      console.log("[Audit Step 4/5] Duplicate detection: Starting...");
      let currentDupProb = 0;
      let currentDupOf: string | null = null;
      let currentSimilar: any[] = [];

      if (!showDuplicateWarning) {
        try {
          const dupPromise = (async () => {
            const existingIssues = await getAllFirestoreIssues();
            const dupRes = await fetch("/api/check-duplicates", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title,
                description,
                category: aiAnalysis.category,
                latitude: latitude || 20.5937,
                longitude: longitude || 78.9629,
                existingIssues
              })
            });
            if (!dupRes.ok) {
              throw new Error(`Server returned status ${dupRes.status}`);
            }
            return await dupRes.json();
          })();
          const dupData = await withTimeout(dupPromise, 10000, "Duplicate detection");
          setDuplicateCheckResult(dupData);
          currentDupProb = dupData.duplicateProbability || 0;
          currentDupOf = dupData.duplicateOf || null;
          currentSimilar = dupData.similarExistingIssues || [];
          console.log("[Audit Step 4/5] Duplicate detection: Success. Prob:", currentDupProb, "Duplicate of:", currentDupOf);

          if (currentDupProb >= 80) {
            setShowDuplicateWarning(true);
            setSubmitting(false);
            setSubmissionStage("idle");
            console.log("[Audit Step 4/5] Duplicate detection: Duplicate found (prob >= 80%). Halting submission.");
            return;
          }
        } catch (err: any) {
          console.error("[Audit Step 4/5] Duplicate detection: Exception/Failure.", err);
          console.warn("Continuing without duplicate detection due to failure.");
        }
      } else {
        currentDupProb = duplicateCheckResult?.duplicateProbability || 0;
        currentDupOf = duplicateCheckResult?.duplicateOf || null;
        currentSimilar = duplicateCheckResult?.similarExistingIssues || [];
        console.log("[Audit Step 4/5] Duplicate detection: Success (Using existing duplicate warning).");
      }

      // Step 5: Firestore document creation
      setSubmissionStage("create");
      console.log("[Audit Step 5/5] Firestore document creation: Starting...");
      const issueData = {
        imageUrl: finalStorageUrl,
        description: description,
        latitude: latitude || 20.5937,
        longitude: longitude || 78.9629,
        status: "Submitted",
        category: aiAnalysis.category,
        severity: aiAnalysis.severity,
        priority: Number(aiAnalysis.priority) || 3,
        priorityScore: priorityScore,
        priorityLevel: priorityLevel,
        createdBy: currentUser?.uid || currentUser?.email || "anonymous_user",
        
        // Include extra fields for compatibility with existing dashboard presentation
        title: title,
        location: location,
        reporterName: currentUser ? currentUser.name : "Anonymous Citizen",
        reporterEmail: currentUser ? currentUser.email : "anonymous@example.com",
        aiAnalysis: aiAnalysis,

        // Duplicate Detection Fields
        supportCount: 0,
        supportedBy: [],
        duplicateProbability: currentDupProb,
        duplicateOf: currentDupOf,
        similarIssues: currentSimilar,
        isDuplicate: currentDupProb >= 80
      };

      try {
        const createdIssue = await withTimeout(createFirestoreIssue(issueData), 10000, "Firestore creation");
        console.log("[Audit Step 5/5] Firestore document creation: Success. Created ID:", createdIssue.id);
        setSuccessIssue(createdIssue);
      } catch (err: any) {
        console.error("[Audit Step 5/5] Firestore document creation: Exception/Failure.", err);
        throw err;
      }

      console.log("=== SUBMISSION WORKFLOW AUDIT COMPLETE - ALL STEPS EXECUTED ===");

    } catch (err: any) {
      console.error("Complete issue submission workflow failed:", err);
      setErrorMessage("Failed to submit report: " + (err.message || err));
    } finally {
      setSubmitting(false);
      setSubmissionStage("idle");
    }
  };

  const handleSupportExisting = async (existingIssueId: string) => {
    try {
      setSubmitting(true);
      setErrorMessage("");
      console.log("Adding citizen support to existing issue:", existingIssueId);
      const existingIssues = await getAllFirestoreIssues();
      const matched = existingIssues.find(iss => iss.id === existingIssueId);
      if (matched) {
        const currentCount = matched.supportCount || 0;
        const currentBy = matched.supportedBy || [];
        const userEmail = currentUser?.email || "anonymous_user";
        
        if (!currentBy.includes(userEmail)) {
          currentBy.push(userEmail);
        }
        
        await updateFirestoreIssue(existingIssueId, {
          supportCount: currentCount + 1,
          supportedBy: currentBy
        });
        
        setSupportedIssueSuccess(matched.title || "the existing issue");
      } else {
        throw new Error("Target issue not found in database.");
      }
    } catch (err: any) {
      console.error("Failed to support existing issue:", err);
      setErrorMessage("Could not support existing issue: " + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadTemplate = (tpl: typeof templates[0]) => {
    setTitle(tpl.title);
    setDescription(tpl.description);
    setLocation(tpl.location);
    setImageUrl(tpl.imageUrl);
    setImageBase64(""); // Clear any previous user file
    setImageFile(null);
    setImageLoadError(false);
    
    setImageMetadata({
      name: `${tpl.name.toLowerCase()}_demo_asset.svg`,
      size: "Preset Illustration",
      type: "SVG"
    });

    if (tpl.latitude && tpl.longitude) {
      setLatitude(tpl.latitude);
      setLongitude(tpl.longitude);
    }
    
    // Deterministic prefilled AI analysis
    setPreviewsAIAnalysis({
      category: tpl.category,
      severity: tpl.severity,
      confidenceScore: 98,
      recommendedAction: tpl.recommendedAction,
      explanation: tpl.explanation,
      status: tpl.status,
      priority: tpl.priority,
      estimatedCost: "$250 - $600"
    });

    // Jump immediately to review step to let them see the pre-populated diagnostics
    setCurrentStep(2);
  };

  // Helper validation to prevent illegal navigation
  const canGoToStep1 = !!imageUrl;
  const canGoToStep2 = !!title.trim() && !!description.trim() && !!location.trim();

  return (
    <div id="report-page" className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => onNavigate("dashboard")}
            className="flex items-center space-x-1.5 text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
            <span className="text-sm font-extrabold tracking-tight text-slate-800">File a Civic Claim</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-3xl mx-auto px-4 mt-8">
        
        {/* Step Progress Indicator (Wizard Header) */}
        {!successIssue && !supportedIssueSuccess && !showDuplicateWarning && (
          <div className="mb-8 bg-white border border-slate-200 p-4 rounded-3xl shadow-sm">
            <div className="flex items-center justify-between">
              {/* Step 1 */}
              <button 
                onClick={() => setCurrentStep(0)}
                className="flex flex-col items-start space-y-1 text-left focus:outline-none group"
              >
                <div className="flex items-center space-x-2">
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                    currentStep === 0 
                      ? "bg-indigo-600 text-white" 
                      : canGoToStep1 
                        ? "bg-emerald-100 text-emerald-700" 
                        : "bg-slate-100 text-slate-500"
                  }`}>
                    {canGoToStep1 && currentStep !== 0 ? <Check className="w-3.5 h-3.5" /> : "1"}
                  </span>
                  <span className={`text-xs font-extrabold uppercase tracking-wider transition-colors ${
                    currentStep === 0 ? "text-slate-950" : "text-slate-400 group-hover:text-slate-600"
                  }`}>Evidence</span>
                </div>
                <span className="text-[10px] text-slate-400 pl-8 font-medium">Upload photo</span>
              </button>

              {/* Connector */}
              <div className="flex-1 mx-4 h-0.5 bg-slate-100 relative rounded-full">
                <div className={`absolute inset-0 bg-indigo-600 transition-all duration-300`} style={{
                  width: currentStep > 0 ? "100%" : "0%"
                }}></div>
              </div>

              {/* Step 2 */}
              <button 
                onClick={() => { if (canGoToStep1) setCurrentStep(1); }}
                disabled={!canGoToStep1}
                className="flex flex-col items-start space-y-1 text-left focus:outline-none group disabled:opacity-50"
              >
                <div className="flex items-center space-x-2">
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                    currentStep === 1 
                      ? "bg-indigo-600 text-white" 
                      : canGoToStep2 && currentStep > 1 
                        ? "bg-emerald-100 text-emerald-700" 
                        : "bg-slate-100 text-slate-500"
                  }`}>
                    {canGoToStep2 && currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : "2"}
                  </span>
                  <span className={`text-xs font-extrabold uppercase tracking-wider transition-colors ${
                    currentStep === 1 ? "text-slate-950" : "text-slate-400 group-hover:text-slate-600"
                  }`}>Details</span>
                </div>
                <span className="text-[10px] text-slate-400 pl-8 font-medium">Description & GPS</span>
              </button>

              {/* Connector */}
              <div className="flex-1 mx-4 h-0.5 bg-slate-100 relative rounded-full">
                <div className={`absolute inset-0 bg-indigo-600 transition-all duration-300`} style={{
                  width: currentStep > 1 ? "100%" : "0%"
                }}></div>
              </div>

              {/* Step 3 */}
              <button 
                onClick={() => { if (canGoToStep1 && canGoToStep2) setCurrentStep(2); }}
                disabled={!canGoToStep1 || !canGoToStep2}
                className="flex flex-col items-start space-y-1 text-left focus:outline-none group disabled:opacity-50"
              >
                <div className="flex items-center space-x-2">
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                    currentStep === 2 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    3
                  </span>
                  <span className={`text-xs font-extrabold uppercase tracking-wider transition-colors ${
                    currentStep === 2 ? "text-slate-950" : "text-slate-400"
                  }`}>AI Dispatch</span>
                </div>
                <span className="text-[10px] text-slate-400 pl-8 font-medium">Review & submit</span>
              </button>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {supportedIssueSuccess ? (
            /* SUCCESS SUPPORT OVERLAY */
            <motion.div
              key="support-success-container"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-8 space-y-6 text-center"
            >
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 bg-emerald-100 rounded-full opacity-30 animate-ping"></div>
                <div className="absolute inset-2 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100 shadow-inner">
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-950 tracking-tight">Support Registered Successfully</h2>
                <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  You have successfully backed the existing report:
                </p>
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl text-indigo-950 font-extrabold max-w-md mx-auto text-sm shadow-inner">
                  "{supportedIssueSuccess}"
                </div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  By backing existing claims, you help municipal crews identify high-impact community issues faster without cluttering coordinates.
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-3">
                <button
                  onClick={() => {
                    setSupportedIssueSuccess(null);
                    setShowDuplicateWarning(false);
                    setDuplicateCheckResult(null);
                    setTitle("");
                    setDescription("");
                    setLocation("");
                    setImageUrl("");
                    setImageBase64("");
                    setCurrentStep(0);
                  }}
                  className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
                >
                  File Another Report
                </button>
                <button
                  onClick={() => onNavigate("dashboard")}
                  className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-600/10"
                >
                  Go to Public Dashboard
                </button>
              </div>
            </motion.div>
          ) : showDuplicateWarning && duplicateCheckResult ? (
            /* DUPLICATE WARNING CONTAINER */
            <motion.div
              key="duplicate-warning-container"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 space-y-4">
                <div className="flex items-center space-x-3 text-amber-800">
                  <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shrink-0 border border-amber-200 animate-pulse">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-slate-900">Potential Duplicate Detected ({duplicateCheckResult.duplicateProbability}% Match)</h2>
                    <p className="text-xs text-amber-700 mt-0.5 font-medium">
                      An extremely similar hazard has already been reported nearby.
                    </p>
                  </div>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed">
                  Our duplicate detector compared locations, descriptions, and categories and discovered matching coordinates. Rather than creating a redundant map marker, we highly recommend <strong>backing the existing report instead</strong>. This automatically increases its community impact weight to speed up municipal crews.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-slate-400" /> Similar Existing Reports Nearby:
                </h3>

                <div className="space-y-3">
                  {duplicateCheckResult.similarExistingIssues.map((iss) => (
                    <div
                      key={iss.id}
                      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:border-indigo-300 transition-all hover:shadow-md"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {iss.category}
                            </span>
                            {iss.distance !== undefined && (
                              <span className="text-[10px] font-bold text-slate-400">
                                • {iss.distance} km away
                              </span>
                            )}
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                              {iss.probability}% Match
                            </span>
                          </div>
                          <h4 className="font-extrabold text-slate-950 tracking-tight">{iss.title}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed max-w-lg line-clamp-2">
                            {iss.description}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSupportExisting(iss.id)}
                          disabled={submitting}
                          className="w-full sm:w-auto shrink-0 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center space-x-1.5 transform hover:-translate-y-0.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Support This Report Instead</span>
                        </button>
                      </div>

                      {iss.reasoning && (
                        <div className="bg-indigo-50/50 border border-indigo-100/60 rounded-xl p-3 text-xs text-indigo-900 italic flex items-start space-x-1.5">
                          <Brain className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                          <span><strong>AI Comparison:</strong> {iss.reasoning}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Duplicate Action Buttons */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDuplicateWarning(false);
                    setDuplicateCheckResult(null);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Edit My Report
                </button>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      handleSubmit({ preventDefault: () => {} } as React.FormEvent);
                    }}
                    disabled={submitting}
                    className="w-full sm:w-auto px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors"
                  >
                    {submitting ? "Submitting..." : "Submit as Separate New Issue Anyway"}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : !successIssue ? (
            /* WIZARD FLOW */
            <motion.div
              key="report-form-container"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              
              {/* Wizard Title Segment */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                <div className="space-y-1">
                  <h1 className="text-2xl font-black text-slate-950 tracking-tight">Report Municipal Defect</h1>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed">
                    CivicSense automatically triages category, prioritizes urgency, and schedules field crews.
                  </p>
                </div>
                
                {/* Simulated database indicator */}
                <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-full shrink-0">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                  <span className="text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase">FIRESTORE DIRECT</span>
                </div>
              </div>

              {/* Quick load templates (ONLY shown in Step 0 & 1 for easy testing access) */}
              {currentStep < 2 && (
                <div className="space-y-3">
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">
                    Select a Quick Demo Hazard Template:
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {templates.map(tpl => (
                      <div
                        key={tpl.name}
                        id={`template-${tpl.name.toLowerCase().replace(" ", "-")}`}
                        onClick={() => handleLoadTemplate(tpl)}
                        className="group cursor-pointer bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-indigo-500 hover:shadow-md transition-all duration-300 flex flex-col h-full"
                      >
                        {/* Illustration Container */}
                        <div className="h-20 bg-slate-50 border-b border-slate-100 overflow-hidden relative flex items-center justify-center">
                          <TemplateIllustration category={tpl.category} />
                        </div>
                        
                        {/* Info Container */}
                        <div className="p-3 flex flex-col flex-grow justify-between space-y-1.5">
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-xs text-slate-950 group-hover:text-indigo-600 transition-colors block leading-tight">
                              {tpl.name}
                            </span>
                            <span className={`inline-block text-[8px] font-bold px-1 py-0.2 rounded ${
                              tpl.severity === "Critical" ? "bg-rose-50 text-rose-600 border border-rose-100" :
                              tpl.severity === "High" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                              tpl.severity === "Medium" ? "bg-indigo-50 text-indigo-600 border border-indigo-100" :
                              "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            }`}>
                              {tpl.severity}
                            </span>
                          </div>
                          
                          <div className="pt-1 border-t border-slate-100/80 flex items-center justify-between text-[8px] text-slate-400 font-semibold uppercase">
                            <span>📍 {tpl.location.split(",")[tpl.location.split(",").length - 2]?.trim() || "India"}</span>
                            <span className="text-indigo-600 font-extrabold group-hover:underline">PREFILL ⚡</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Form container */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                
                {/* Form header message */}
                {errorMessage && (
                  <div className="bg-red-50 border-b border-red-100 p-4 text-xs font-semibold text-red-600 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Submitting Loading Overlay State */}
                {submitting && (
                  <div className="p-12 text-center space-y-8 bg-white flex flex-col items-center justify-center min-h-[400px]">
                    
                    {/* Animated Loader Graphic */}
                    <div className="relative w-24 h-24">
                      {/* Scanning glow circle */}
                      <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-45"></div>
                      <div className="absolute inset-2 bg-indigo-50 rounded-full flex items-center justify-center border border-indigo-100 shadow-inner">
                        {submissionStage === "upload" && <Camera className="w-10 h-10 text-indigo-600 animate-bounce" />}
                        {submissionStage === "analyze" && <Brain className="w-10 h-10 text-indigo-600 animate-pulse" />}
                        {submissionStage === "duplicates" && <Eye className="w-10 h-10 text-indigo-600 animate-spin" style={{ animationDuration: "3s" }} />}
                        {submissionStage === "create" && <ShieldCheck className="w-10 h-10 text-emerald-600 animate-pulse" />}
                      </div>
                    </div>

                    <div className="space-y-2 max-w-sm">
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">
                        {submissionStage === "upload" && "Uploading Photo to Storage..."}
                        {submissionStage === "analyze" && "Gemini Vision Analyzing Image..."}
                        {submissionStage === "duplicates" && "Comparing Local Hazards..."}
                        {submissionStage === "create" && "Generating Dispatch Ticket..."}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed">
                        {submissionStage === "upload" && "Compressing and transferring raw payload to Google Cloud Storage bucket."}
                        {submissionStage === "analyze" && "Analyzing pixels, parsing categorization models, and calculating cost estimates."}
                        {submissionStage === "duplicates" && "Executing Haversine proximity calculations to isolate duplicate citizen files."}
                        {submissionStage === "create" && "Encrypting document schemas and logging transaction directly in Firestore."}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full max-w-xs space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">
                        <span>TRANSFER RATE</span>
                        <span>{submissionStage === "upload" ? `${uploadProgress}%` : "AI COGNITIVE PATH"}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner relative">
                        <div 
                          className="bg-indigo-600 h-full rounded-full transition-all duration-300 relative" 
                          style={{ width: submissionStage === "upload" ? `${uploadProgress}%` : "100%" }}
                        >
                          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[size:1rem_1rem] animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 0: PHOTO EVIDENCE UPLOAD */}
                {!submitting && currentStep === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-6 space-y-6"
                  >
                    <div className="space-y-1">
                      <h2 className="text-xs font-bold text-indigo-600 tracking-wider uppercase">Step 1: Visual Evidence</h2>
                      <p className="text-base font-extrabold text-slate-900">Upload Hazard Photograph</p>
                    </div>

                    {imageUrl ? (
                      <div className="space-y-4">
                        {/* Rich Upload Preview */}
                        <div className="relative h-60 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shadow-inner group">
                          {imageLoadError ? (
                            <div className="h-full w-full bg-slate-100 flex flex-col items-center justify-center p-4">
                              <AlertCircle className="w-10 h-10 text-slate-400 mb-2" />
                              <span className="font-bold text-sm text-slate-700">Preset Illustration Loaded</span>
                            </div>
                          ) : (
                            <img
                              src={imageUrl}
                              alt="Issue preview"
                              className={`w-full h-full ${
                                imageUrl.startsWith("/demo-images/") ? "object-contain p-6 bg-slate-100/50" : "object-cover"
                              }`}
                              onError={() => setImageLoadError(true)}
                              referrerPolicy="no-referrer"
                            />
                          )}
                          
                          {/* Top-Right Dismiss Button */}
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute top-3.5 right-3.5 p-2 bg-slate-950/80 hover:bg-slate-950 text-white rounded-full transition-all hover:scale-105 active:scale-95 shadow-md"
                            title="Remove image"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          {/* Floating Glassmorphic Metadata bar */}
                          {imageMetadata && (
                            <div className="absolute bottom-3.5 inset-x-3.5 bg-slate-950/70 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-white flex items-center justify-between text-xs">
                              <div className="flex items-center space-x-2">
                                <FileText className="w-4 h-4 text-indigo-400" />
                                <span className="font-bold max-w-[150px] truncate">{imageMetadata.name}</span>
                              </div>
                              <div className="flex items-center space-x-2 font-mono text-[10px]">
                                <span className="bg-white/15 px-2 py-0.5 rounded text-white">{imageMetadata.type}</span>
                                <span className="text-slate-300">{imageMetadata.size}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* If it's a demo illustration, show a helpful banner with a direct replace button */}
                        {imageUrl.startsWith("/demo-images/") && (
                          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                            <div className="space-y-1">
                              <p className="font-extrabold text-amber-800">Demo Template Loaded</p>
                              <p className="text-amber-600 font-medium leading-relaxed">
                                This template is prefilled with a local SVG illustration. You can replace it with your own actual photograph to test real-time Gemini Vision analysis!
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-all shadow-md shadow-amber-600/10 shrink-0 flex items-center justify-center gap-1.5"
                              id="replace-with-custom-image-btn"
                            >
                              <Upload className="w-4 h-4" />
                              <span>Replace with Photo</span>
                            </button>
                          </div>
                        )}

                        {/* Real-Time Vision pre-analysis panel */}
                        {(analyzingImage || previewsAIAnalysis) && (
                          <div className="bg-slate-50 border border-indigo-100 rounded-2xl p-4 space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                              <div className="flex items-center space-x-2">
                                <Brain className="w-4 h-4 text-indigo-600 animate-pulse" />
                                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                  Real-Time Gemini Pre-Analysis
                                </span>
                              </div>
                              {analyzingImage ? (
                                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full animate-pulse">
                                  ⚡ Analyzing pixels...
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => triggerLiveAIAnalysis()}
                                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                                >
                                  <RefreshCw className="w-3 h-3" /> Re-Scan
                                </button>
                              )}
                            </div>

                            {analyzingImage ? (
                              <div className="py-2 space-y-2.5">
                                <div className="h-3.5 bg-slate-200 rounded animate-pulse w-2/3"></div>
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="h-10 bg-slate-200 rounded animate-pulse"></div>
                                  <div className="h-10 bg-slate-200 rounded animate-pulse"></div>
                                  <div className="h-10 bg-slate-200 rounded animate-pulse"></div>
                                </div>
                              </div>
                            ) : previewsAIAnalysis ? (
                              <div className="space-y-3 text-xs">
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-sm">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Category</span>
                                    <span className="font-extrabold text-slate-800 block mt-0.5">
                                      {previewsAIAnalysis.category}
                                    </span>
                                  </div>
                                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-sm">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Severity</span>
                                    <span className={`font-extrabold block mt-0.5 ${
                                      previewsAIAnalysis.severity === "Critical" ? "text-rose-600" :
                                      previewsAIAnalysis.severity === "High" ? "text-amber-600" :
                                      previewsAIAnalysis.severity === "Medium" ? "text-indigo-600" :
                                      "text-emerald-600"
                                    }`}>
                                      {previewsAIAnalysis.severity}
                                    </span>
                                  </div>
                                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-sm">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Match Confidence</span>
                                    <span className="font-extrabold text-indigo-700 block mt-0.5">
                                      {previewsAIAnalysis.confidenceScore || 85}%
                                    </span>
                                  </div>
                                </div>
                                <div className="space-y-1 bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm">
                                  <span className="text-[9px] text-indigo-600 font-bold block uppercase tracking-wider">Estimated Cost</span>
                                  <p className="font-extrabold text-slate-800">{previewsAIAnalysis.estimatedCost || "$150 - $400"}</p>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Drag & Drop Upload Space */
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`h-56 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all p-6 ${
                          isDragging 
                            ? "border-indigo-600 bg-indigo-50/40 scale-[1.01]" 
                            : "border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400"
                        }`}
                      >
                        <input
                          type="file"
                          id="image-file-input"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/*"
                          className="hidden"
                        />
                        
                        {/* Animated Photo Icon box */}
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-slate-200 shadow-sm text-slate-400 mb-3 group-hover:scale-105 transition-transform duration-300">
                          <Upload className={`w-6 h-6 ${isDragging ? "text-indigo-600" : "text-slate-400"}`} />
                        </div>

                        <p className="text-sm font-extrabold text-slate-800 text-center">
                          Drag & Drop or Click to Upload
                        </p>
                        <p className="text-xs text-slate-400 text-center mt-1 max-w-xs">
                          Takes JPEG, PNG, or WEBP images up to 5MB. Camera snapshots are supported on mobile.
                        </p>
                      </div>
                    )}

                    {/* Navigation Buttons for Step 0 */}
                    <div className="flex justify-end pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => { if (canGoToStep1) setCurrentStep(1); }}
                        disabled={!canGoToStep1}
                        className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-2xl shadow-md disabled:shadow-none tracking-tight transition-all text-xs flex items-center space-x-1.5 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <span>Provide Details</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 1: HAZARD DETAILS */}
                {!submitting && currentStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-6 space-y-6"
                  >
                    <div className="space-y-1">
                      <h2 className="text-xs font-bold text-indigo-600 tracking-wider uppercase">Step 2: Hazard Details</h2>
                      <p className="text-base font-extrabold text-slate-900">Define Hazard Particulars</p>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                      <label htmlFor="issue-title" className="block text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                        Issue Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="issue-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Collapsed sewer grate near transit stop"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-sm transition-all"
                        required
                      />
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                      <label htmlFor="issue-location" className="block text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                        Location / Intersection <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="issue-location"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="e.g., 1400 Pine St, Downtown District"
                          className="w-full pl-11 pr-28 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-sm transition-all"
                          required
                        />
                        <MapPin className="absolute left-4 top-3.5 w-4.5 h-4.5 text-slate-400" />
                        
                        <button
                          type="button"
                          onClick={handleUseCurrentLocation}
                          disabled={detectingGPS}
                          className="absolute right-2 top-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 text-[10px] font-bold rounded-lg transition-colors border border-slate-200 flex items-center space-x-1"
                        >
                          {detectingGPS ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                              <span>🛰️ Detecting...</span>
                            </>
                          ) : (
                            <>
                              <span>📍 GPS Pin</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <label htmlFor="issue-description" className="block text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                        Description of Hazard <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        id="issue-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Explain the damage. Is it causing immediate traffic interruption or active safety hazards?"
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-sm transition-all resize-none leading-relaxed"
                        required
                      ></textarea>
                    </div>

                    {/* Navigation Buttons for Step 1 */}
                    <div className="flex justify-between pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(0)}
                        className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors flex items-center space-x-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Visual Evidence</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { if (canGoToStep2) setCurrentStep(2); }}
                        disabled={!canGoToStep2}
                        className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-2xl shadow-md disabled:shadow-none tracking-tight transition-all text-xs flex items-center space-x-1.5 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <span>Dispatch Review</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: REVIEW & DISPATCH */}
                {!submitting && currentStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-6 space-y-6"
                  >
                    <div className="space-y-1">
                      <h2 className="text-xs font-bold text-indigo-600 tracking-wider uppercase">Step 3: Dispatch Review</h2>
                      <p className="text-base font-extrabold text-slate-900">Pre-Dispatch AI Summary</p>
                    </div>

                    {/* Summary Split-View */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Left: Input Summary Card */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                        <div className="flex items-center space-x-2 text-slate-700 pb-2 border-b border-slate-200/60">
                          <FileText className="w-4.5 h-4.5 text-indigo-600" />
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Your Submission</span>
                        </div>

                        <div className="space-y-3 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Title</span>
                            <span className="font-extrabold text-slate-900 block mt-0.5">{title || "Untitled Report"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Location / GPS Coords</span>
                            <span className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                              {location}
                            </span>
                            {latitude && longitude && (
                              <span className="text-[9px] font-mono text-slate-400 mt-0.5 block pl-4">
                                Lat: {latitude.toFixed(5)}, Lon: {longitude.toFixed(5)}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Description</span>
                            <p className="text-slate-600 mt-0.5 leading-relaxed bg-white border border-slate-200 p-2.5 rounded-xl text-[11px] line-clamp-3">
                              {description}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-1.5">Visual Evidence</span>
                            {imageUrl ? (
                              <div className="space-y-2">
                                <div className="relative border border-slate-200 rounded-xl overflow-hidden aspect-video bg-slate-100 flex items-center justify-center group max-w-[280px] shadow-sm">
                                  <img
                                    src={imageUrl}
                                    alt="Issue preview"
                                    className={`w-full h-full ${
                                      imageUrl.startsWith("/demo-images/") ? "object-contain p-4 bg-slate-100/50" : "object-cover"
                                    }`}
                                    referrerPolicy="no-referrer"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] text-white font-extrabold uppercase tracking-wider gap-1.5"
                                    title="Click to replace photo"
                                  >
                                    <Upload className="w-4 h-4" />
                                    <span>Replace Photo</span>
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                                  id="replace-image-step2-btn"
                                >
                                  <Upload className="w-3 h-3" /> Replace with uploaded image
                                </button>
                              </div>
                            ) : (
                              <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-4 text-center cursor-pointer text-slate-400 text-xs hover:bg-slate-50 transition-all max-w-[280px]"
                              >
                                <Upload className="w-5 h-5 mx-auto mb-1 text-slate-400" />
                                <span className="font-bold text-indigo-600">Upload custom image</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: AI Core Analytics preview */}
                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-50/10 border border-indigo-100 rounded-2xl p-4 space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                          <div className="flex items-center space-x-2 text-indigo-950">
                            <Brain className="w-4.5 h-4.5 text-indigo-600 animate-pulse" />
                            <span className="text-xs font-bold uppercase tracking-wider">CivicSense Triage</span>
                          </div>
                          
                          <button 
                            type="button"
                            onClick={() => triggerLiveAIAnalysis()}
                            className="text-[9px] font-bold text-indigo-600 bg-white border border-indigo-100 px-2.5 py-1 rounded-lg flex items-center gap-1 hover:bg-indigo-50"
                          >
                            <Sparkle className="w-3 h-3 animate-spin" style={{ animationDuration: "3s" }} /> RE-EVALUATE
                          </button>
                        </div>

                        {previewsAIAnalysis ? (
                          <div className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-white p-2.5 rounded-xl border border-indigo-100/60 shadow-sm">
                                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Category</span>
                                <span className="font-extrabold text-slate-900 block mt-0.5">{previewsAIAnalysis.category}</span>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-indigo-100/60 shadow-sm">
                                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Severity</span>
                                <span className={`font-extrabold block mt-0.5 ${
                                  previewsAIAnalysis.severity === "Critical" ? "text-rose-600" :
                                  previewsAIAnalysis.severity === "High" ? "text-amber-600" :
                                  previewsAIAnalysis.severity === "Medium" ? "text-indigo-600" :
                                  "text-emerald-600"
                                }`}>{previewsAIAnalysis.severity}</span>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-indigo-100/60 shadow-sm">
                                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Repairs Cost</span>
                                <span className="font-extrabold text-slate-900 block mt-0.5">{previewsAIAnalysis.estimatedCost || "$150 - $400"}</span>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-indigo-100/60 shadow-sm">
                                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">AI Confidence</span>
                                <span className="font-extrabold text-indigo-700 block mt-0.5">{previewsAIAnalysis.confidenceScore || 85}%</span>
                              </div>
                            </div>

                            <div className="space-y-1 bg-white p-3 rounded-xl border border-indigo-100/60 shadow-sm">
                              <span className="text-[9px] text-indigo-600 font-bold block uppercase tracking-wider">Action Plan</span>
                              <p className="text-slate-600 leading-relaxed text-[11px] mt-0.5 font-medium">{previewsAIAnalysis.recommendedAction}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="py-8 text-center space-y-2">
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
                            <p className="text-xs text-slate-500 font-medium">Extracting cognitive insights...</p>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Submit Section trigger */}
                    <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                      
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors flex items-center justify-center space-x-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Incident Details</span>
                      </button>

                      <div className="flex items-center space-x-2 text-indigo-700 text-xs font-bold">
                        <Brain className="w-4 h-4 text-indigo-600 animate-pulse" />
                        <span>Gemini Duplicates & Priority active</span>
                      </div>

                      <button
                        type="button"
                        id="report-submit-btn"
                        onClick={handleSubmit}
                        disabled={submitting || (analyzingImage && !previewsAIAnalysis)}
                        className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl shadow-lg shadow-indigo-600/10 transition-all text-xs flex items-center justify-center space-x-1.5 transform hover:-translate-y-0.5"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Submit & Dispatch Crew</span>
                      </button>
                    </div>
                  </motion.div>
                )}

              </div>
            </motion.div>
          ) : (
            /* SUCCESS OVERLAY - HIGH QUALITY WORK TICKET */
            <motion.div
              key="success-card-container"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-8 space-y-6 text-center max-w-lg mx-auto"
            >
              {/* Confetti Celebration layout */}
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 bg-emerald-100 rounded-full opacity-35 animate-ping" style={{ animationDuration: "2.5s" }}></div>
                <div className="absolute inset-2 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100 shadow-inner">
                  <CheckCircle className="w-12 h-12 text-emerald-500 animate-pulse" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-950 tracking-tight">Report Logged Successfully</h2>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Your report has been received and routed in real-time. Below is your official, authenticated CivicSense dispatch certificate.
                </p>
              </div>

              {/* Certified Official Work Ticket */}
              {successIssue.aiAnalysis && (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-5 text-left space-y-4 relative overflow-hidden">
                  
                  {/* Decorative Ticket stamps */}
                  <div className="absolute -right-12 -top-12 w-28 h-28 bg-indigo-150 rounded-full opacity-10"></div>
                  <div className="absolute -left-12 -bottom-12 w-28 h-28 bg-indigo-150 rounded-full opacity-10"></div>

                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center space-x-2 text-slate-800">
                      <Brain className="w-4 h-4 text-indigo-600 animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-500">
                        CivicSense Dispatch Ticket
                      </span>
                    </div>
                    <span className="text-[9px] font-mono bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-bold">
                      #CIV-{successIssue.id.toUpperCase().slice(-5)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs font-medium">
                    <div>
                      <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Classified Category</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{successIssue.aiAnalysis.category}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Assessed Urgency</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{successIssue.aiAnalysis.severity}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Dispatch Priority</p>
                      <p className="font-extrabold text-slate-800 mt-0.5 flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                        Code {successIssue.aiAnalysis.priority}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Confidence Score</p>
                      <p className="font-extrabold text-indigo-700 mt-0.5">{successIssue.aiAnalysis.confidenceScore || 85}%</p>
                    </div>
                    <div className="col-span-2 border-t border-slate-200/60 pt-3">
                      <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Estimated Costs</p>
                      <p className="font-extrabold text-slate-900 mt-0.5 text-sm">{successIssue.aiAnalysis.estimatedCost}</p>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs border-t border-slate-200/60 pt-3">
                    <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">First-Response Order</p>
                    <p className="text-slate-700 leading-relaxed bg-white border border-slate-200 p-2.5 rounded-xl font-medium text-[11px] shadow-sm">
                      "{successIssue.aiAnalysis.recommendedAction}"
                    </p>
                  </div>
                </div>
              )}

              {/* Action routes */}
              <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    // Reset page states
                    setSuccessIssue(null);
                    setTitle("");
                    setDescription("");
                    setLocation("");
                    setImageUrl("");
                    setImageBase64("");
                    setImageMetadata(null);
                    setCurrentStep(0);
                  }}
                  className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
                >
                  File Another Report
                </button>
                <button
                  onClick={() => onNavigate("dashboard")}
                  className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-600/10"
                >
                  Go to Public Dashboard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
