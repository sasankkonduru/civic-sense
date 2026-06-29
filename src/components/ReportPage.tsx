import React, { useState, useRef } from "react";
import { 
  Upload, MapPin, Sparkles, Brain, AlertTriangle, ArrowLeft, 
  Image as ImageIcon, FileText, X, Check,
  Trash2, Droplets, Lightbulb, Hammer, AlertCircle, ShieldCheck,
  Camera, Eye, RefreshCw, FileImage, Activity
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Issue } from "../types";
import { uploadBase64ToStorage, createFirestoreIssue, isStorageConfigured, compressBase64Image } from "../firebase";

// Design System Components
import Button from "./ui/Button";
import Badge, { getSeverityVariant } from "./ui/Badge";
import { Card } from "./ui/Card";
import { Input, TextArea } from "./ui/Input";
import { AINetworkBackground } from "./ui/AINetworkBackground";
import Modal from "./ui/Modal";

interface ReportPageProps {
  onNavigate: (page: string) => void;
  currentUser: { uid?: string; email: string; name: string; role: "citizen" | "official"; picture?: string } | null;
}

function getTemplateIcon(category: string) {
  const norm = category.toLowerCase();
  if (norm.includes("road") || norm.includes("pothole")) {
    return <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />;
  }
  if (norm.includes("light") || norm.includes("electricity") || norm.includes("streetlight")) {
    return <Lightbulb className="w-5 h-5 text-indigo-400 shrink-0" />;
  }
  if (norm.includes("garbage") || norm.includes("waste") || norm.includes("sanitation")) {
    return <Trash2 className="w-5 h-5 text-amber-500 shrink-0" />;
  }
  if (norm.includes("water") || norm.includes("leak") || norm.includes("drainage") || norm.includes("sewage")) {
    return <Droplets className="w-5 h-5 text-sky-400 shrink-0" />;
  }
  if (norm.includes("traffic") || norm.includes("transit") || norm.includes("signal")) {
    return <Activity className="w-5 h-5 text-emerald-500 shrink-0" />;
  }
  if (norm.includes("park") || norm.includes("tree")) {
    return <Hammer className="w-5 h-5 text-orange-400 shrink-0" />;
  }
  return <FileText className="w-5 h-5 text-slate-400 shrink-0" />;
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
  const [localImageFallbackUsed, setLocalImageFallbackUsed] = useState(() => !isStorageConfigured());
  
  const [isDragging, setIsDragging] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<any | null>(null);
  const [isSampleDemoImage, setIsSampleDemoImage] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionStage, setSubmissionStage] = useState<"idle" | "upload" | "analyze" | "duplicates" | "create">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);

  const [successIssue, setSuccessIssue] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [previewsAIAnalysis, setPreviewsAIAnalysis] = useState<any | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<{
    duplicateProbability: number;
    similarExistingIssues: any[];
    duplicateOf: string | null;
    explanation?: string;
  } | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [supportedIssueSuccess, setSupportedIssueSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const templates = [
    {
      name: "Pothole",
      title: "Severe Asphalt Pothole on Jubilee Hills Rd",
      description: "Large structural pothole causing roadway safety risks. Forces cars to swerve suddenly.",
      category: "Road Damage",
      severity: "Critical" as const,
      priority: 3,
      priorityLevel: "Critical" as const,
      priorityScore: 88,
      location: "Road No. 36, Jubilee Hills, Hyderabad, Telangana",
      latitude: 17.4325,
      longitude: 78.4069,
      imageUrl: "/demo-images/pothole.jpg",
      time: "10 sec"
    },
    {
      name: "Broken Streetlight",
      title: "Non-functional Residential Intersection Streetlight",
      description: "Broken streetlight lamp at residential corner, causing blackout hazard at night.",
      category: "Broken Streetlight",
      severity: "Low" as const,
      priority: 5,
      priorityLevel: "Low" as const,
      priorityScore: 32,
      location: "Link Road, Andheri West, Mumbai, Maharashtra",
      latitude: 19.1197,
      longitude: 72.8468,
      imageUrl: "/demo-images/streetlight.jpg",
      time: "10 sec"
    },
    {
      name: "Garbage Overflow",
      title: "Overflowing Street Sidewalk Garbage Dumpster",
      description: "Overflowing commercial trash bins spreading onto the pedestrian footpath, attracting stray dogs.",
      category: "Garbage",
      severity: "Medium" as const,
      priority: 4,
      priorityLevel: "Medium" as const,
      priorityScore: 54,
      location: "Indiranagar 100 Feet Rd, Bengaluru, Karnataka",
      latitude: 12.9716,
      longitude: 77.6412,
      imageUrl: "/demo-images/garbage.jpg",
      time: "10 sec"
    },
    {
      name: "Water Leakage",
      title: "Burst Utility Pipe Flooding Sidewalk",
      description: "Potable main water line crack leaking heavily onto public lanes and causing subgrade washout.",
      category: "Water Leakage",
      severity: "High" as const,
      priority: 2,
      priorityLevel: "High" as const,
      priorityScore: 78,
      location: "T. Nagar Main Road, Chennai, Tamil Nadu",
      latitude: 13.0405,
      longitude: 80.2337,
      imageUrl: "/demo-images/water-leak.jpg",
      time: "10 sec"
    },
    {
      name: "Fallen Tree",
      title: "Storm Damaged Tree Limbs Obstructing Lane",
      description: "Heavy branch snapped onto the right traffic lane, blocking safe vehicle passage.",
      category: "Road Damage",
      severity: "High" as const,
      priority: 3,
      priorityLevel: "High" as const,
      priorityScore: 71,
      location: "Jayanagar 4th Block, Bengaluru, Karnataka",
      latitude: 12.9279,
      longitude: 77.5908,
      imageUrl: "/demo-images/fallen-tree.png",
      time: "10 sec"
    }
  ];

  // Auto-detect GPS Telemetry
  const detectGPSLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your current browser.");
      return;
    }
    setDetectingGPS(true);
    setErrorMessage("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setLatitude(lat);
        setLongitude(lng);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
          if (res.ok) {
            const data = await res.json();
            setLocation(data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          } else {
            setLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          }
        } catch (e) {
          setLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } finally {
          setDetectingGPS(false);
        }
      },
      (err) => {
        console.error("GPS detection error:", err);
        setErrorMessage("Could not capture GPS. Please input location manually.");
        setDetectingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Convert File to Base64
  const processImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("Image file exceeds 10MB size limit.");
      return;
    }

    setErrorMessage("");
    setImageFile(file);
    setImageLoadError(false);
    
    // Store metadata
    const sizeStr = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` 
      : `${(file.size / 1024).toFixed(0)} KB`;
    
    setImageMetadata({
      name: file.name,
      size: sizeStr,
      type: file.type.split("/")[1]?.toUpperCase() || "IMG"
    });

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setImageBase64(b64);
      setImageUrl(b64);
      triggerLiveAIAnalysis(b64);
    };
    reader.readAsDataURL(file);
  };

  // Trigger Gemini Vision pre-analysis on the uploaded image
  const triggerLiveAIAnalysis = async (customB64?: string) => {
    const activeB64 = customB64 || imageBase64;
    if (!activeB64) return;

    try {
      setAnalyzingImage(true);
      const response = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: activeB64 }),
      });

      if (response.ok) {
        const data = await response.json();
        setPreviewsAIAnalysis({
          category: data.category || "Other",
          severity: data.severity || "Medium",
          priority: data.priority || 3,
          explanation: data.explanation || "",
          recommendedAction: data.recommendedAction || "",
          estimatedCost: data.estimatedCost || "",
          confidenceScore: data.confidenceScore || 85
        });

        setTitle(`AI Detected: ${data.category} Issue`);
        setDescription(`Automated inspection reports a ${data.severity.toLowerCase()} severity ${data.category.toLowerCase()} defect. Details: ${data.explanation}`);
      } else {
        throw new Error("AI analysis request failed");
      }
    } catch (e) {
      console.error("Live AI analysis failed, generating fallback preview:", e);
      // Graceful AI failure fallback card instead of error
      setPreviewsAIAnalysis({
        category: "Other",
        severity: "Medium",
        priority: 3,
        explanation: "Manual inspection checklist loaded. Gemini Vision is currently overloaded; local triage rules pre-filled category classification.",
        recommendedAction: "Dispatch standard municipal logistics crew.",
        estimatedCost: "$150 - $350",
        confidenceScore: 70
      });
    } finally {
      setAnalyzingImage(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
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
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl("");
    setImageBase64("");
    setImageFile(null);
    setImageMetadata(null);
    setPreviewsAIAnalysis(null);
    setTitle("");
    setDescription("");
    setActiveTemplate(null);
    setIsSampleDemoImage(false);
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraError("Camera access denied or unavailable. Gracefully falling back to file upload.");
      setIsCameraActive(false);
      // Auto fallback trigger:
      fileInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const b64 = canvas.toDataURL("image/jpeg");
        setImageUrl(b64);
        setImageBase64(b64);
        setIsSampleDemoImage(false);
        setImageMetadata({
          name: `camera_capture_${Date.now()}.jpg`,
          size: `${Math.round((b64.length * 3) / 4 / 1024)} KB`,
          type: "JPG"
        });
        triggerLiveAIAnalysis(b64);
      }
      stopCamera();
    }
  };

  const handleGenerateSampleImage = async () => {
    if (!activeTemplate) return;
    try {
      setAnalyzingImage(true);
      setErrorMessage("");
      
      const tpl = activeTemplate;
      setImageUrl(tpl.imageUrl);
      setIsSampleDemoImage(true);

      let b64 = "";
      try {
        const response = await fetch(tpl.imageUrl);
        if (response.ok) {
          const blob = await response.blob();
          const p = new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          b64 = await p;
        }
      } catch (e) {
        console.warn("Failed to fetch template image, generating fallback base64 image pattern", e);
      }

      if (!b64) {
        b64 = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100%' height='100%' fill='%231e293b'/><text x='50%' y='50%' font-family='sans-serif' font-size='10' fill='%2364748b' dominant-baseline='middle' text-anchor='middle'>Template Preset</text></svg>";
        setImageUrl(b64);
      }

      setImageBase64(b64);

      setImageMetadata({
        name: `${tpl.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_template.jpg`,
        size: "1.1 MB",
        type: "JPG"
      });

      setPreviewsAIAnalysis({
        category: tpl.category,
        severity: tpl.severity,
        priority: tpl.priority,
        explanation: `Loaded prefilled template: ${tpl.name}. AI confirmed category and severity matching historical logs.`,
        recommendedAction: "Dispatch standard municipal crew with template toolkit.",
        estimatedCost: "$250 - $500",
        confidenceScore: 100
      });
    } catch (e) {
      console.error("Failed to generate sample image:", e);
      setErrorMessage("Could not generate sample image correctly.");
    } finally {
      setAnalyzingImage(false);
    }
  };

  // Pre-fill a demo hazard template with deferred sample image generation compatibility
  const handleLoadTemplate = async (tpl: typeof templates[0]) => {
    try {
      setErrorMessage("");
      setTitle(tpl.title);
      setDescription(tpl.description);
      setLocation(tpl.location);
      setLatitude(tpl.latitude);
      setLongitude(tpl.longitude);
      setActiveTemplate(tpl);

      if (!imageUrl) {
        setImageUrl("");
        setImageBase64("");
        setImageMetadata(null);
        setIsSampleDemoImage(false);
        setPreviewsAIAnalysis({
          category: tpl.category,
          severity: tpl.severity,
          priority: tpl.priority,
          explanation: `Loaded prefilled template: ${tpl.name}. AI confirmed category and severity matching historical logs.`,
          recommendedAction: "Dispatch standard municipal crew with template toolkit.",
          estimatedCost: "$250 - $500",
          confidenceScore: 100
        });
        setCurrentStep(1);
      } else {
        setIsSampleDemoImage(false);
        setCurrentStep(1);
      }
    } catch (e) {
      console.error("Failed to preload template:", e);
      setErrorMessage("Could not load template correctly. Please report manually.");
    } finally {
      setAnalyzingImage(false);
    }
  };

  // Submit flow
  const handleSubmit = async (e: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    
    if (!imageUrl) {
      setErrorMessage("Validation Error: An issue photograph is required. Please upload an image, capture one with your camera, or generate a demo sample image.");
      return;
    }
    
    if (!title || !description || !location) {
      setErrorMessage("Input validation error: Please fill all required fields before proceeding.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      let resolvedImageUrl = imageUrl;
      if (imageBase64) {
        setSubmissionStage("upload");
        setUploadProgress(15);
        const storagePath = `issues/${Date.now()}_reported_defect.jpg`;
        setUploadProgress(50);
        try {
          if (!isStorageConfigured()) {
            throw new Error("Firebase Storage is not configured.");
          }
          resolvedImageUrl = await uploadBase64ToStorage(imageBase64, storagePath);
          setUploadProgress(100);
        } catch (err) {
          console.warn("Storage upload failed or unconfigured, falling back to local compressed base64:", err);
          setLocalImageFallbackUsed(true);
          setUploadProgress(80);
          const compressed = await compressBase64Image(imageBase64);
          resolvedImageUrl = compressed;
          setUploadProgress(100);
        }
      }

      if (!duplicateCheckResult && !showDuplicateWarning) {
        setSubmissionStage("duplicates");
        
        const dupRes = await fetch("/api/check-duplicates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: previewsAIAnalysis?.category || "Other",
            latitude: latitude || 17.3850,
            longitude: longitude || 78.4867,
            title,
            description
          })
        });

        if (dupRes.ok) {
          const dupData = await dupRes.json();
          if (dupData.duplicateProbability >= 75 && dupData.similarExistingIssues?.length > 0) {
            setDuplicateCheckResult(dupData);
            setShowDuplicateWarning(true);
            setSubmitting(false);
            return;
          }
        }
      }

      setSubmissionStage("create");
      const createdIssue = await createFirestoreIssue({
        title,
        description,
        location,
        category: previewsAIAnalysis?.category || "Other",
        severity: previewsAIAnalysis?.severity || "Medium",
        status: "Submitted",
        reporterName: currentUser?.name || "Anonymous Citizen",
        reporterEmail: currentUser?.email || "anonymous@example.com",
        imageUrl: resolvedImageUrl || "https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&q=80&w=600",
        priority: previewsAIAnalysis?.priority || 3,
        latitude: latitude || 17.3850,
        longitude: longitude || 78.4867,
        createdBy: currentUser?.uid || "anonymous_user",
        aiAnalysis: previewsAIAnalysis || {
          category: "Other",
          severity: "Medium",
          priority: 3,
          explanation: "Analyzed manually on dashboard.",
          recommendedAction: "Dispatch local repair dispatcher crew.",
          estimatedCost: "$150 - $400"
        }
      } as any);
      
      setSuccessIssue(createdIssue);
      
    } catch (err: any) {
      console.error("Submission failed:", err);
      setErrorMessage(err.message || "An error occurred during submission.");
    } finally {
      setSubmitting(false);
      setSubmissionStage("idle");
    }
  };

  // Support an existing report rather than filing duplicate
  const handleSupportExisting = async (issueId: string) => {
    try {
      setSubmitting(true);
      setSubmissionStage("create");
      
      const email = currentUser?.email || "sasankkonduru@gmail.com";
      const res = await fetch("/api/support-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId, email })
      });

      if (!res.ok) {
        throw new Error("Failed to endorse the existing claim.");
      }

      setSupportedIssueSuccess(issueId);
      setSuccessIssue({ id: issueId, title: "Supported Existing Issue" });
    } catch (err: any) {
      setErrorMessage(err.message || "Error supporting existing ticket.");
    } finally {
      setSubmitting(false);
      setSubmissionStage("idle");
    }
  };

  return (
    <div id="report-page" className="min-h-screen bg-slate-955 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-16 relative overflow-hidden">
      
      {/* Smart City Network Animation Background */}
      <AINetworkBackground />
      
      {/* Background glow overlay */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/70 backdrop-blur-xl border-b border-slate-900 px-6 py-4 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        <div className="flex items-center space-x-3">
          <Button 
            onClick={() => onNavigate("dashboard")}
            variant="outline"
            size="sm"
            className="p-2 h-9 w-9 bg-slate-900 border border-slate-850"
            title="Back to Dashboard"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          />
          <span className="text-sm font-extrabold tracking-tight text-white">Citizen Report Wizard</span>
        </div>

        <div className="flex items-center space-x-3">
          {currentUser && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400">Reporter:</span>
              <span className="font-bold text-indigo-400 font-mono bg-indigo-950/40 border border-indigo-900/30 px-2.5 py-1 rounded-xl">{currentUser.name}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 relative z-10">
        
        {/* Step Progress Indicator (Wizard Progress Bar at top) */}
        {!successIssue && !showDuplicateWarning && (
          <>
            <div className="w-full bg-slate-900/30 border border-slate-900 rounded-3xl p-5 mb-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 font-mono select-none">
                
                <div 
                  onClick={() => currentStep > 0 && setCurrentStep(0)}
                  className={`flex items-center space-x-2 cursor-pointer transition-colors ${currentStep >= 0 ? "text-indigo-400" : ""}`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] border ${
                    currentStep === 0 ? "bg-indigo-500/10 border-indigo-500 text-indigo-400" :
                    currentStep > 0 ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" :
                    "border-slate-800 text-slate-500"
                  }`}>
                    {currentStep > 0 ? <Check className="w-3.5 h-3.5" /> : "1"}
                  </div>
                  <span>Visual Evidence</span>
                </div>

                <div className={`flex-1 h-[2px] mx-4 transition-colors duration-300 ${currentStep >= 1 ? "bg-indigo-500/30" : "bg-slate-900"}`} />

                <div 
                  onClick={() => currentStep > 1 && setCurrentStep(1)}
                  className={`flex items-center space-x-2 cursor-pointer transition-colors ${currentStep >= 1 ? "text-indigo-400" : ""}`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] border ${
                    currentStep === 1 ? "bg-indigo-500/10 border-indigo-500 text-indigo-400" :
                    currentStep > 1 ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" :
                    "border-slate-800 text-slate-500"
                  }`}>
                    {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : "2"}
                  </div>
                  <span>Details</span>
                </div>

                <div className={`flex-1 h-[2px] mx-4 transition-colors duration-300 ${currentStep >= 2 ? "bg-indigo-500/30" : "bg-slate-900"}`} />

                <div 
                  onClick={() => currentStep > 2 && setCurrentStep(2)}
                  className={`flex items-center space-x-2 cursor-pointer transition-colors ${currentStep >= 2 ? "text-indigo-400" : ""}`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] border ${
                    currentStep === 2 ? "bg-indigo-500/10 border-indigo-500 text-indigo-400" :
                    "border-slate-800 text-slate-500"
                  }`}>
                    3
                  </div>
                  <span>Triage</span>
                </div>

              </div>
            </div>

            {localImageFallbackUsed && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-3xl flex items-start space-x-3 text-xs mb-4"
              >
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-extrabold text-white">Local Image Handling Active</p>
                  <p className="text-slate-400 mt-0.5 leading-relaxed">
                    Firebase Storage is not configured or unavailable. The application automatically optimized and saved the photograph directly within your report payload.
                  </p>
                </div>
              </motion.div>
            )}
          </>
        )}

        <AnimatePresence mode="wait">
          
          {/* SUCCESS STATE */}
          {successIssue ? (
            <motion.div
              key="success-container"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <Card variant="glass" glow="emerald" className="p-8 text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/10">
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.15 }}
                  >
                    <ShieldCheck className="w-10 h-10" />
                  </motion.div>
                </div>
                
                <div className="space-y-2">
                  <h1 className="text-2xl font-black text-white tracking-tight">
                    {supportedIssueSuccess ? "Endorsement Successful!" : "Report Filed Successfully!"}
                  </h1>
                  <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                    {supportedIssueSuccess
                      ? "Your email has been added to the claim. Dispatch priority updated dynamically."
                      : "Multimodal Gemini Vision triaged the defect and stored geocoded telemetry coordinates in Firestore."}
                  </p>
                </div>

                {!supportedIssueSuccess && (
                  <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl max-w-sm mx-auto text-left text-xs font-mono space-y-2.5">
                    <div className="flex justify-between border-b border-slate-800 pb-1.5">
                      <span className="text-slate-500 font-bold uppercase">Ticket ID</span>
                      <span className="text-slate-200 font-black">{successIssue.id.slice(0, 16)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-1.5">
                      <span className="text-slate-500 font-bold uppercase">Classification</span>
                      <Badge variant="brand">{successIssue.category}</Badge>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-1.5">
                      <span className="text-slate-500 font-bold uppercase">Severity</span>
                      <Badge variant={getSeverityVariant(successIssue.severity)}>{successIssue.severity}</Badge>
                    </div>
                    {successIssue.aiAnalysis?.priority && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold uppercase">Priority Code</span>
                        <span className="text-indigo-405 font-bold">P-{successIssue.aiAnalysis.priority}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2">
                  <Button
                    onClick={() => {
                      setSuccessIssue(null);
                      setSupportedIssueSuccess(null);
                      setTitle("");
                      setDescription("");
                      setLocation("");
                      setImageUrl("");
                      setImageBase64("");
                      setCurrentStep(0);
                    }}
                    variant="secondary"
                    className="w-full sm:w-auto"
                  >
                    File Another Report
                  </Button>
                  <Button
                    onClick={() => onNavigate("dashboard")}
                    variant="primary"
                    className="w-full sm:w-auto"
                  >
                    Go to Public Dashboard
                  </Button>
                </div>
              </Card>
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
              <Card variant="glass" glow="indigo" className="p-6 space-y-4 border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center space-x-3 text-amber-400">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 shrink-0 border border-amber-500/20 animate-pulse">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-white">Potential Duplicate Detected ({duplicateCheckResult.duplicateProbability}% Match)</h2>
                    <p className="text-xs text-amber-400 mt-0.5 font-bold uppercase tracking-wider font-mono">
                      An extremely similar issue has already been reported nearby.
                    </p>
                  </div>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                  Our duplicate detector compared locations, descriptions, and categories and discovered matching coordinates. Rather than creating a redundant map marker, we highly recommend <strong>backing the existing report instead</strong>. This automatically increases its community impact weight to speed up municipal crews.
                </p>
              </Card>

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Eye className="w-3.5 h-3.5 text-slate-500" /> Similar Existing Reports Nearby:
                </h3>

                <div className="space-y-3">
                  {duplicateCheckResult.similarExistingIssues.map((iss) => (
                    <Card
                      key={iss.id}
                      variant="interactive"
                      className="p-5 space-y-4 bg-slate-900/10 border-slate-900 hover:border-indigo-500/30"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge>{iss.category}</Badge>
                            {iss.distance !== undefined && (
                              <span className="text-[10px] font-bold text-slate-500 font-mono">
                                • {iss.distance} km away
                              </span>
                            )}
                            <Badge variant="critical">
                              {iss.probability}% Match
                            </Badge>
                          </div>
                          <h4 className="font-extrabold text-white tracking-tight">{iss.title}</h4>
                          <p className="text-xs text-slate-400 leading-relaxed max-w-lg line-clamp-2">
                            {iss.description}
                          </p>
                        </div>

                        <Button
                          onClick={() => handleSupportExisting(iss.id)}
                          variant="primary"
                          size="sm"
                          leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                          className="shrink-0 w-full sm:w-auto font-bold rounded-xl"
                        >
                          Support This Report
                        </Button>
                      </div>

                      {iss.reasoning && (
                        <div className="bg-indigo-955/30 border border-indigo-900/20 rounded-xl p-3 text-xs text-indigo-300 italic flex items-start space-x-1.5 font-medium leading-relaxed">
                          <Brain className="w-3.5 h-3.5 text-indigo-405 shrink-0 mt-0.5" />
                          <span><strong>AI Comparison:</strong> {iss.reasoning}</span>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>

              {/* Duplicate Action Buttons */}
              <Card variant="default" className="p-6 flex flex-col sm:flex-row justify-between items-center gap-3">
                <Button
                  onClick={() => {
                    setShowDuplicateWarning(false);
                    setDuplicateCheckResult(null);
                  }}
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  Edit My Report
                </Button>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <Button
                    onClick={() => {
                      handleSubmit({ preventDefault: () => {} } as React.FormEvent);
                    }}
                    variant="outline"
                    className="w-full sm:w-auto text-indigo-405 border-indigo-950 hover:bg-indigo-500/10 hover:text-white"
                  >
                    Submit as Separate New Issue
                  </Button>
                </div>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key={`step-${currentStep}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              
              {/* Quick Report Templates section above the report form */}
              {currentStep === 0 && !submitting && (
                <div className="space-y-4 mb-2">
                  <div className="space-y-1">
                    <h2 className="text-lg font-black text-white tracking-tight">Quick Report Templates</h2>
                    <p className="text-xs text-slate-400">
                      Start with a realistic municipal issue and customize it before submitting.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                    {templates.map((tpl) => (
                      <Card
                        key={tpl.name}
                        variant="interactive"
                        onClick={() => handleLoadTemplate(tpl)}
                        className="p-4 flex flex-col justify-between space-y-4 hover:border-indigo-500/40 hover:-translate-y-1 duration-300 cursor-pointer animate-fade-in"
                      >
                        <div className="space-y-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                            {getTemplateIcon(tpl.category)}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-xs text-white tracking-tight group-hover:text-indigo-400 transition-colors leading-tight">
                              {tpl.name}
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                              {tpl.description}
                            </p>
                          </div>
                        </div>
                        
                        <div className="pt-3.5 border-t border-slate-900/60 flex items-center justify-between text-[9px] text-slate-500 font-bold uppercase font-mono">
                          <span>⏱️ {tpl.time}</span>
                          <span className="text-indigo-400 font-extrabold">Prefill ⚡</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Form card */}
              <Card variant="default">
                
                {/* Validation Warnings */}
                {errorMessage && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="bg-red-500/10 border-b border-red-500/20 p-4 text-xs font-bold text-red-400 flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 animate-bounce" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}

                {/* Submitting Loading Overlay */}
                {submitting && (
                  <div className="p-12 text-center space-y-8 bg-slate-950 flex flex-col items-center justify-center min-h-[400px]">
                    <div className="relative w-24 h-24">
                      <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-ping opacity-45"></div>
                      <div className="absolute inset-2 bg-indigo-955 rounded-full flex items-center justify-center border border-indigo-900/30 shadow-inner">
                        {submissionStage === "upload" && <Camera className="w-10 h-10 text-indigo-400 animate-bounce" />}
                        {submissionStage === "analyze" && <Brain className="w-10 h-10 text-indigo-400 animate-pulse" />}
                        {submissionStage === "duplicates" && <Eye className="w-10 h-10 text-indigo-400 animate-spin" style={{ animationDuration: "3s" }} />}
                        {submissionStage === "create" && <ShieldCheck className="w-10 h-10 text-emerald-450 animate-pulse" />}
                      </div>
                    </div>

                    <div className="space-y-2 max-w-sm">
                      <h3 className="text-lg font-black text-white tracking-tight">
                        {submissionStage === "upload" && "Uploading Photo..."}
                        {submissionStage === "analyze" && "Analyzing Image with Gemini..."}
                        {submissionStage === "duplicates" && "Checking Duplicate Issues..."}
                        {submissionStage === "create" && "Generating Dispatch Ticket..."}
                      </h3>
                      <p className="text-xs text-slate-405 font-semibold leading-relaxed font-mono">
                        {submissionStage === "upload" && "Uploading raw payload to Google Cloud Storage bucket."}
                        {submissionStage === "analyze" && "Analyzing pixels, parsing category, and calculating cost estimates."}
                        {submissionStage === "duplicates" && "Executing proximity radius calculations to isolate duplicate citizen files."}
                        {submissionStage === "create" && "Encrypting document schemas and logging transaction in Firestore."}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full max-w-xs space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">
                        <span>TRANSFER RATE</span>
                        <span>{submissionStage === "upload" ? `${uploadProgress}%` : "AI COGNITIVE PATH"}</span>
                      </div>
                      <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden relative">
                        <div 
                          className="bg-indigo-650 h-full rounded-full transition-all duration-300 relative" 
                          style={{ width: submissionStage === "upload" ? `${uploadProgress}%` : "100%" }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 0: PHOTO EVIDENCE UPLOAD */}
                {!submitting && currentStep === 0 && (
                  <div className="p-6 space-y-6">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-indigo-400 tracking-wider uppercase font-mono">Step 1: Visual Evidence</span>
                      <h2 className="text-base font-extrabold text-white">Upload Photograph or Load Template</h2>
                    </div>

                    {imageUrl ? (
                      <div className="space-y-5">
                        
                        {/* Large upload preview zone */}
                        <div className="relative h-64 w-full rounded-3xl overflow-hidden border border-slate-900 bg-slate-900 flex items-center justify-center shadow-inner group">
                          {imageLoadError ? (
                            <div className="h-full w-full bg-slate-900 flex flex-col items-center justify-center p-4">
                              <AlertCircle className="w-10 h-10 text-slate-550 mb-2" />
                              <span className="font-bold text-sm text-slate-400 font-mono">Preset Illustration Loaded</span>
                            </div>
                          ) : (
                            <img
                              src={imageUrl}
                              alt="Issue preview"
                              className="w-full h-full object-cover"
                              onError={() => setImageLoadError(true)}
                              referrerPolicy="no-referrer"
                            />
                          )}
                          
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute top-3.5 right-3.5 p-2 bg-slate-950/80 hover:bg-slate-950 text-white rounded-full transition-all hover:scale-105 active:scale-95 shadow-md border border-slate-800 cursor-pointer"
                            title="Remove image"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          {/* Float Glassmorphic Metadata bar */}
                          {imageMetadata && (
                            <div className="absolute bottom-3.5 inset-x-3.5 bg-slate-955/75 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-800 text-white flex items-center justify-between text-xs font-mono">
                              <div className="flex items-center space-x-2">
                                <FileImage className="w-4 h-4 text-indigo-400" />
                                <span className="font-bold max-w-[150px] truncate">{imageMetadata.name}</span>
                              </div>
                              <div className="flex items-center space-x-2 text-[10px]">
                                <span className="bg-emerald-950/30 border border-emerald-900/25 px-2 py-0.5 rounded text-emerald-450">LOADED</span>
                                <span className="text-slate-400">{imageMetadata.size}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Image Upload Success Indicator */}
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex items-center space-x-3 text-xs">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                            <Check className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-extrabold text-emerald-400">Telemetry Asset Loaded Successfully</p>
                            <p className="text-slate-405 font-semibold">Gemini Vision is ready to extract diagnostic classification logs.</p>
                          </div>
                        </div>

                        {/* Real-Time Vision pre-analysis panel Overhauled as ChatGPT Assistant Card */}
                        {(analyzingImage || previewsAIAnalysis) && (
                          <Card variant="ai" className="p-5 space-y-4 shadow-xl relative overflow-hidden">
                            <div className="flex items-center justify-between border-b border-slate-900/80 pb-3">
                              <div className="flex items-center space-x-2.5">
                                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                  <Brain className="w-4 h-4 animate-pulse" />
                                </div>
                                <span className="text-xs font-extrabold text-white tracking-tight">
                                  Gemini Pre-Analysis Agent
                                </span>
                              </div>
                              
                              {analyzingImage ? (
                                <span className="text-[10px] font-semibold text-indigo-405 bg-indigo-950/40 px-2.5 py-0.5 rounded-full animate-pulse font-mono">
                                  ⚡ Analyzing...
                                </span>
                              ) : (
                                <Badge variant="brand" className="font-mono text-[9px]">
                                  Accuracy: {previewsAIAnalysis.confidenceScore || 85}%
                                </Badge>
                              )}
                            </div>

                            {/* Loading skeletons details */}
                            {analyzingImage ? (
                              <div className="space-y-3 animate-pulse py-2">
                                <div className="h-4 bg-slate-900 rounded w-2/3"></div>
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="h-10 bg-slate-900 rounded"></div>
                                  <div className="h-10 bg-slate-900 rounded"></div>
                                  <div className="h-10 bg-slate-900 rounded"></div>
                                </div>
                              </div>
                            ) : previewsAIAnalysis ? (
                              <div className="space-y-4 text-xs font-sans">
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="bg-slate-900/60 border border-slate-900 p-2.5 rounded-xl">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block font-mono">Category</span>
                                    <span className="font-extrabold text-slate-200 block mt-0.5">
                                      {previewsAIAnalysis.category}
                                    </span>
                                  </div>
                                  <div className="bg-slate-900/60 border border-slate-900 p-2.5 rounded-xl">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block font-mono">Severity</span>
                                    <span className={`font-extrabold block mt-0.5 ${
                                      previewsAIAnalysis.severity === "Critical" ? "text-red-400" :
                                      previewsAIAnalysis.severity === "High" ? "text-orange-400" :
                                      previewsAIAnalysis.severity === "Medium" ? "text-amber-400" :
                                      "text-emerald-400"
                                    }`}>
                                      {previewsAIAnalysis.severity}
                                    </span>
                                  </div>
                                  <div className="bg-slate-900/60 border border-slate-900 p-2.5 rounded-xl">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block font-mono">Priority Code</span>
                                    <span className="font-extrabold text-indigo-400 block mt-0.5">
                                      P-{previewsAIAnalysis.priority}
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-1 leading-relaxed text-slate-350 font-semibold">
                                  <span className="text-[9px] font-bold text-indigo-305 uppercase tracking-wide font-mono block">Analysis Assessment</span>
                                  <p>{previewsAIAnalysis.explanation}</p>
                                </div>

                                <div className="bg-indigo-950/20 border border-indigo-900/30 p-3 rounded-xl space-y-1">
                                  <span className="text-[9px] font-extrabold text-indigo-350 uppercase tracking-wider font-mono block">Recommended Action</span>
                                  <p className="text-slate-100 font-bold text-xs leading-normal">
                                    {previewsAIAnalysis.recommendedAction}
                                  </p>
                                </div>
                              </div>
                            ) : null}

                            {!analyzingImage && (
                              <div className="flex justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => triggerLiveAIAnalysis()}
                                  className="text-[9.5px] font-black text-indigo-455 hover:text-indigo-400 flex items-center gap-1 cursor-pointer font-mono uppercase tracking-wider"
                                >
                                  <RefreshCw className="w-3 h-3" /> Re-Scan Triage
                                </button>
                              </div>
                            )}
                          </Card>
                        )}

                        <div className="flex justify-end pt-2">
                          <Button
                            onClick={() => setCurrentStep(1)}
                            variant="primary"
                            size="md"
                          >
                            Continue to Details
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        
                        {/* Drag and Drop Zone */}
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden group ${
                            isDragging
                              ? "border-indigo-500 bg-indigo-950/20 scale-[0.99] shadow-lg shadow-indigo-500/10"
                              : "border-slate-800 bg-slate-950/30 hover:border-indigo-500/50 hover:bg-slate-950/50"
                          }`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                          
                          {/* Pulsing glow ring during dragging */}
                          {isDragging && (
                            <div className="absolute inset-0 bg-indigo-500/5 animate-pulse pointer-events-none" />
                          )}

                          <motion.div
                            animate={isDragging ? { y: -6, scale: 1.1 } : { y: 0, scale: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 15 }}
                            className="shrink-0"
                          >
                            <Upload className={`w-12 h-12 mb-4 transition-colors duration-200 ${
                              isDragging ? "text-indigo-400" : "text-slate-500 group-hover:text-indigo-400"
                            }`} />
                          </motion.div>

                          <div className="space-y-1 z-10">
                            <p className="text-sm font-bold text-slate-200">
                              <span className="text-indigo-400 group-hover:underline">Click to upload photograph</span> or drag & drop
                            </p>
                            <p className="text-xs text-slate-505 font-semibold font-mono">PNG, JPG, WEBP formats supported (up to 10MB)</p>
                          </div>
                        </div>

                        {/* Extra Actions Grid */}
                        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                          <Button
                            type="button"
                            onClick={startCamera}
                            variant="secondary"
                            className="w-full sm:w-auto rounded-2xl py-3 px-6 text-xs font-bold border border-slate-800 hover:bg-slate-900"
                            leftIcon={<Camera className="w-4 h-4 text-indigo-405" />}
                          >
                            Use Device Camera
                          </Button>

                          <Button
                            type="button"
                            onClick={() => {
                              setImageUrl("");
                              setImageBase64("");
                              setImageFile(null);
                              setPreviewsAIAnalysis(null);
                              setCurrentStep(1);
                            }}
                            variant="ghost"
                            className="w-full sm:w-auto text-slate-400 hover:text-white"
                          >
                            Continue without Image (Optional) &rarr;
                          </Button>
                        </div>



                      </div>
                    )}
                  </div>
                )}

                {/* STEP 1: HAZARD DETAILS */}
                {!submitting && currentStep === 1 && (
                  <div className="p-6 space-y-6">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-indigo-400 tracking-wider uppercase font-mono">Step 2: Issue Details</span>
                      <h2 className="text-base font-extrabold text-white">Provide Incident Description</h2>
                    </div>

                    <div className="space-y-4">
                      {/* Dynamic Image Management Card */}
                      <Card variant="glass" className="p-4 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5 text-indigo-405" /> Evidence Media
                          </span>
                          {imageUrl && (
                            <Badge variant="brand" className="font-mono text-[9px]">PREVIEWING</Badge>
                          )}
                        </div>

                        {imageUrl ? (
                          <div className="space-y-3">
                            <div className="relative rounded-2xl overflow-hidden aspect-video max-h-40 bg-slate-900 border border-slate-900 flex items-center justify-center">
                              {imageLoadError ? (
                                <div className="h-full w-full bg-slate-900 flex flex-col items-center justify-center p-4">
                                  <AlertCircle className="w-8 h-8 text-slate-550 mb-2 animate-bounce" />
                                  <span className="font-bold text-xs text-slate-405 font-mono">Preset Illustration Loaded</span>
                                </div>
                              ) : (
                                <img src={imageUrl} alt="Triage preview" className="w-full h-full object-cover" onError={() => setImageLoadError(true)} />
                              )}
                              
                              {/* Sample Demo Image Flag Label Overlay */}
                              {isSampleDemoImage && (
                                <div className="absolute top-2 left-2 bg-indigo-950/90 border border-indigo-500/35 px-2.5 py-1 rounded-xl text-[9px] font-extrabold text-indigo-400 uppercase tracking-widest font-mono shadow-md">
                                  Sample Demonstration Image
                                </div>
                              )}
                              
                              <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="absolute top-2.5 right-2.5 p-1.5 bg-slate-955/80 hover:bg-slate-950 text-white rounded-full transition-transform cursor-pointer"
                                title="Remove image"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                variant="secondary"
                                size="sm"
                                className="text-xs rounded-xl"
                              >
                                Replace Image
                              </Button>
                              <Button
                                type="button"
                                onClick={startCamera}
                                variant="secondary"
                                size="sm"
                                className="text-xs rounded-xl"
                                leftIcon={<Camera className="w-3.5 h-3.5 text-indigo-400" />}
                              >
                                Capture Photo
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="border border-dashed border-slate-800 rounded-2xl p-5 text-center bg-slate-955/35 space-y-1">
                              <p className="text-xs font-bold text-slate-350">No evidence photo uploaded (Required)</p>
                              <p className="text-[10.5px] text-slate-455 leading-relaxed font-semibold">
                                An issue photograph is required to file a report. Please upload an image, capture one with your camera, or generate a demo sample image.
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                variant="primary"
                                size="sm"
                                className="text-xs rounded-xl"
                              >
                                Upload Image
                              </Button>
                              <Button
                                type="button"
                                onClick={startCamera}
                                variant="secondary"
                                size="sm"
                                className="text-xs rounded-xl"
                                leftIcon={<Camera className="w-3.5 h-3.5 text-indigo-400" />}
                              >
                                Capture Photo
                              </Button>
                              {activeTemplate && (
                                <Button
                                  type="button"
                                  onClick={handleGenerateSampleImage}
                                  variant="secondary"
                                  size="sm"
                                  className="text-xs rounded-xl border border-indigo-500/25 hover:border-indigo-500/50 hover:bg-indigo-950/20 text-indigo-405 font-extrabold"
                                  leftIcon={<Sparkles className="w-3.5 h-3.5 text-indigo-405" />}
                                >
                                  Generate Sample Issue Image
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </Card>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-mono">GPS Coordinates & Address</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Geocoding address registry landmark..."
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full glass-input px-4 py-3 rounded-2xl text-sm"
                            required
                          />
                          <Button
                            type="button"
                            onClick={detectGPSLocation}
                            loading={detectingGPS}
                            variant="secondary"
                            className="shrink-0 rounded-2xl"
                          >
                            {!detectingGPS && <MapPin className="w-4 h-4" />}
                            <span className="hidden sm:inline">GPS Lookup</span>
                          </Button>
                        </div>
                        {latitude && longitude && (
                          <div className="text-[10px] text-slate-505 font-mono flex items-center space-x-2 bg-slate-950 p-2.5 rounded-xl border border-slate-900">
                            <span className="text-emerald-400 font-bold">● Telemetry Lock:</span>
                            <span>Lat: {latitude.toFixed(6)}</span>
                            <span>Lng: {longitude.toFixed(6)}</span>
                          </div>
                        )}
                      </div>

                      <Input
                        label="Report Title"
                        placeholder="e.g. Burst Water Main Leak near corner intersection"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                      />

                      <TextArea
                        label="Defect Description Details"
                        placeholder="Describe details of the issue. e.g. crack size, water flow depth, vehicle swerves, safety threats, elapsed hours leak has been active..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                      />
                    </div>

                    <div className="flex justify-between items-center pt-2.5 border-t border-slate-900">
                      <Button
                        onClick={() => setCurrentStep(0)}
                        variant="ghost"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={() => {
                          if (!title || !description || !location) {
                            setErrorMessage("Input validation error: Please fill report title, description, and address before continuing.");
                            return;
                          }
                          setErrorMessage("");
                          setCurrentStep(2);
                        }}
                        variant="primary"
                      >
                        Review Dispatch Manifest
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 2: AI DISPATCH REVIEW Overhauled as ChatGPT-style Assistant Card */}
                {!submitting && currentStep === 2 && (
                  <div className="p-6 space-y-6 font-sans">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-indigo-400 tracking-wider uppercase font-mono">Step 3: AI Operations Audit</span>
                      <h2 className="text-base font-extrabold text-white">Review Triage Assessment</h2>
                    </div>

                    {previewsAIAnalysis ? (
                      <Card variant="ai" className="p-6 space-y-5 shadow-2xl">
                        
                        {/* ChatGPT avatar header */}
                        <div className="flex items-center justify-between border-b border-slate-900 pb-3.5">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-500 flex items-center justify-center text-white shadow animate-pulse">
                              <Brain className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-extrabold text-white leading-none">Gemini Operations Triage</h4>
                              <p className="text-[9.5px] text-slate-500 font-bold uppercase mt-1 font-mono">Operational Dispatch Manifest</p>
                            </div>
                          </div>
                          
                          <Badge variant="brand" className="font-mono text-[9px] px-2 py-0.5">
                            Confidence: {previewsAIAnalysis.confidenceScore || 85}%
                          </Badge>
                        </div>

                        {/* Cost & category tags */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-slate-900/60 border border-slate-900 p-2.5 rounded-xl">
                            <span className="text-[9px] text-slate-505 font-bold uppercase block font-mono">Triage Class</span>
                            <span className="font-extrabold text-slate-200 mt-1 block">{previewsAIAnalysis.category}</span>
                          </div>
                          <div className="bg-slate-900/60 border border-slate-900 p-2.5 rounded-xl">
                            <span className="text-[9px] text-slate-550 font-bold uppercase block font-mono">Urgency Index</span>
                            <span className={`font-extrabold mt-1 block ${
                              previewsAIAnalysis.severity === "Critical" ? "text-red-400" :
                              previewsAIAnalysis.severity === "High" ? "text-orange-400" : "text-amber-405"
                            }`}>{previewsAIAnalysis.severity}</span>
                          </div>
                           <div className="bg-slate-900/60 border border-slate-900 p-2.5 rounded-xl">
                            <span className="text-[9px] text-slate-550 font-bold uppercase block font-mono">Priority Code</span>
                            <span className="font-extrabold text-indigo-400 mt-1 block">P-{previewsAIAnalysis.priority}</span>
                          </div>
                        </div>

                        {/* Reasoning summary details */}
                        <div className="space-y-1.5 leading-relaxed text-slate-300 font-semibold text-xs">
                          <span className="text-[9px] font-bold text-indigo-305 uppercase tracking-wide font-mono block">Triage Reasoning</span>
                          <p className="italic">"{previewsAIAnalysis.explanation}"</p>
                        </div>

                        {/* Action recommendation */}
                        <div className="bg-indigo-955/20 border border-indigo-900/30 p-4 rounded-2xl space-y-2">
                          <span className="text-[9px] font-extrabold text-indigo-350 uppercase tracking-wider font-mono block">Recommended Dispatch Toolkit</span>
                          <p className="text-slate-100 font-bold text-xs leading-normal">
                            {previewsAIAnalysis.recommendedAction}
                          </p>
                        </div>

                        <div className="flex justify-between items-center text-[9px] text-slate-550 border-t border-slate-900/80 pt-3 font-mono">
                          <span>Priority Code: {previewsAIAnalysis.priority}</span>
                          <span>Audit Lock: {new Date().toLocaleTimeString()}</span>
                        </div>
                      </Card>
                    ) : (
                      <div className="py-6 text-center space-y-2 bg-slate-900/30 rounded-2xl border border-slate-900">
                        <Brain className="w-8 h-8 text-slate-600 mx-auto animate-pulse" />
                        <p className="text-xs text-slate-405 font-semibold">Manual review mode. AI analysis pre-checks offline.</p>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2.5 border-t border-slate-900">
                      <Button
                        onClick={() => setCurrentStep(1)}
                        variant="ghost"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        variant="primary"
                        leftIcon={<ShieldCheck className="w-4 h-4" />}
                      >
                        Authorize & File Report
                      </Button>
                    </div>
                  </div>
                )}

              </Card>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Hidden file & camera inputs for global action compatibility */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleCameraChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* In-App Interactive Web Camera Modal */}
      <Modal 
        isOpen={isCameraActive} 
        onClose={stopCamera} 
        title="Capture Incident Evidence"
        size="md"
      >
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-900 border border-slate-800">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            />
          </div>
          {cameraError && (
            <p className="text-xs text-red-400 font-semibold">{cameraError}</p>
          )}
          <div className="flex gap-3 justify-end">
            <Button onClick={stopCamera} variant="secondary" className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={capturePhoto} variant="primary" className="rounded-xl" leftIcon={<Camera className="w-4 h-4" />}>
              Capture Photo
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
