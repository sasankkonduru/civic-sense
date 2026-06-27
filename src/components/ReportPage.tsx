import React, { useState, useRef, useEffect } from "react";
import { 
  Upload, MapPin, Sparkles, Brain, AlertTriangle, ArrowLeft, 
  Image as ImageIcon, FileText, X, Check,
  Trash2, Droplets, Lightbulb, Hammer, AlertCircle, ShieldCheck,
  Camera, Eye, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Issue } from "../types";
import { uploadBase64ToStorage, createFirestoreIssue, updateFirestoreIssue } from "../firebase";

// Design System Components
import Button from "./ui/Button";
import Badge, { getSeverityVariant } from "./ui/Badge";
import { Card, CardContent } from "./ui/Card";
import { Input, TextArea } from "./ui/Input";
import { AILoader } from "./ui/Loading";

interface ReportPageProps {
  onNavigate: (page: string) => void;
  currentUser: { uid?: string; email: string; name: string; role: "citizen" | "official"; picture?: string } | null;
}

// Custom vector illustrations for the quick templates to bypass missing asset errors beautifully
function TemplateIllustration({ category }: { category: string }) {
  if (category === "Pothole") {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-rose-950/20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-900/30 via-rose-950/10 to-transparent"></div>
        <div className="absolute w-12 h-12 rounded-full border border-rose-900/20 bg-rose-900/10 flex items-center justify-center animate-pulse">
          <AlertTriangle className="w-6 h-6 text-rose-500" />
        </div>
      </div>
    );
  }
  if (category === "Garbage") {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-amber-950/20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/30 via-amber-950/10 to-transparent"></div>
        <div className="absolute w-12 h-12 rounded-full border border-amber-900/20 bg-amber-900/10 flex items-center justify-center">
          <Trash2 className="w-6 h-6 text-amber-500" />
        </div>
      </div>
    );
  }
  if (category === "Water Leakage") {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-sky-950/20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-900/30 via-sky-950/10 to-transparent"></div>
        <div className="absolute w-12 h-12 rounded-full border border-sky-900/20 bg-sky-900/10 flex items-center justify-center">
          <Droplets className="w-6 h-6 text-sky-500" />
        </div>
      </div>
    );
  }
  if (category === "Broken Streetlight") {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-indigo-950/20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/30 via-indigo-950/10 to-transparent"></div>
        <div className="absolute w-12 h-12 rounded-full border border-indigo-900/20 bg-indigo-900/10 flex items-center justify-center">
          <Lightbulb className="w-6 h-6 text-indigo-400" />
        </div>
      </div>
    );
  }
  if (category === "Road Damage") {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-orange-950/20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-900/30 via-orange-950/10 to-transparent"></div>
        <div className="absolute w-12 h-12 rounded-full border border-orange-900/20 bg-orange-900/10 flex items-center justify-center">
          <Hammer className="w-6 h-6 text-orange-500" />
        </div>
      </div>
    );
  }
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-slate-900 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800/30 via-slate-900/10 to-transparent"></div>
      <div className="absolute w-12 h-12 rounded-full border border-slate-800 bg-slate-900 flex items-center justify-center">
        <ImageIcon className="w-6 h-6 text-slate-500" />
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

  // Ready-made templates to pre-fill hazard info
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
      longitude: 78.4069,
      illustrationUrl: "/demo-images/pothole.svg"
    },
    {
      name: "Garbage Pile",
      title: "Overflowing Garbage Dumpster Near Commercial Hub",
      description: "Municipal trash bins overflowing onto the main sidewalk. Dogs and birds scattering waste across the road, causing unhygienic conditions and foul odor.",
      category: "Garbage",
      severity: "Medium" as const,
      status: "Submitted",
      priority: 4,
      priorityLevel: "Medium" as const,
      priorityScore: 54,
      location: "Indiranagar 100 Feet Rd, Near Metro Station, Bengaluru, Karnataka",
      latitude: 12.9716,
      longitude: 77.6412,
      illustrationUrl: "/demo-images/garbage.svg"
    },
    {
      name: "Water Leakage",
      title: "Burst Water Pipe Flooding Road",
      description: "Clean drinking water leaking continuously from under the asphalt. Sidewalk is submerged and vehicle traffic has slowed down considerably.",
      category: "Water Leakage",
      severity: "High" as const,
      status: "Submitted",
      priority: 2,
      priorityLevel: "High" as const,
      priorityScore: 78,
      location: "T. Nagar Main Road, Chennai, Tamil Nadu",
      latitude: 13.0405,
      longitude: 80.2337,
      illustrationUrl: "/demo-images/leakage.svg"
    },
    {
      name: "Broken Streetlight",
      title: "Broken Streetlight Bulbs on Corner Street",
      description: "Two consecutive streetlights are out, leaving the residential intersection completely pitch black. Walking at night feels unsafe.",
      category: "Broken Streetlight",
      severity: "Low" as const,
      status: "Reported",
      priority: 5,
      priorityLevel: "Low" as const,
      priorityScore: 32,
      location: "Link Road, Andheri West, Mumbai, Maharashtra",
      latitude: 19.1197,
      longitude: 72.8468,
      illustrationUrl: "/demo-images/light.svg"
    },
    {
      name: "Road Crack Damage",
      title: "Deep Fissure & Asphalt Cracks",
      description: "Severe road cracks expanding due to heavy vehicle traffic. Hazard threatens structural integrity of local roadway and could damage vehicles.",
      category: "Road Damage",
      severity: "High" as const,
      status: "Reported",
      priority: 3,
      priorityLevel: "High" as const,
      priorityScore: 68,
      location: "Connaught Place, New Delhi",
      latitude: 28.6304,
      longitude: 77.2177,
      illustrationUrl: "/demo-images/crack.svg"
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
          // Perform reverse geocoding to resolve address
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
      
      // Auto-trigger live pre-analysis
      triggerLiveAIAnalysis(b64);
    };
    reader.readAsDataURL(file);
  };

  // Trigger Gemini Vision pre-analysis on the uploaded image
  const triggerLiveAIAnalysis = async (customB64?: string) => {
    const activeB64 = customB64 || imageBase64;
    if (!activeB64 || activeB64.startsWith("/demo-images/")) return;

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

        // Autofill details based on AI analysis
        setTitle(`AI Detected: ${data.category} Hazard`);
        setDescription(`Automated inspection reports a ${data.severity.toLowerCase()} severity ${data.category.toLowerCase()} defect. Details: ${data.explanation}`);
      }
    } catch (e) {
      console.error("Live AI analysis failed:", e);
    } finally {
      setAnalyzingImage(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  // Pre-fill a demo hazard template
  const handleLoadTemplate = (tpl: typeof templates[0]) => {
    setTitle(tpl.title);
    setDescription(tpl.description);
    setLocation(tpl.location);
    setLatitude(tpl.latitude);
    setLongitude(tpl.longitude);
    
    // Load local pre-made SVG illustration instead of upload
    setImageUrl(tpl.illustrationUrl);
    setImageBase64(""); // Mark as demo template, no base64 upload required
    setImageFile(null);
    
    setPreviewsAIAnalysis({
      category: tpl.category,
      severity: tpl.severity,
      priority: tpl.priority,
      explanation: "Loaded prefilled demo data coordinates.",
      recommendedAction: "Pre-dispatch scheduled in system.",
      estimatedCost: "$300 - $600",
      confidenceScore: 100
    });
    
    setErrorMessage("");
    setCurrentStep(1); // Advance to details step immediately
  };

  // Submit flow
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !location) {
      setErrorMessage("Please complete all required fields.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      // Stage 1: Upload Image (if not using demo illustration template)
      let resolvedImageUrl = imageUrl;
      if (imageBase64 && imageFile) {
        setSubmissionStage("upload");
        setUploadProgress(10);
        const storagePath = `issues/${Date.now()}_${imageFile.name}`;
        setUploadProgress(40);
        resolvedImageUrl = await uploadBase64ToStorage(imageBase64, storagePath);
        setUploadProgress(100);
      }

      // Stage 2: AI Dispatch Diagnostics & Duplicates check (if not checked yet)
      if (!duplicateCheckResult && !showDuplicateWarning) {
        setSubmissionStage("duplicates");
        
        // Call backend duplicate check
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
            return; // STOP flow, prompt user choice
          }
        }
      }

      // Stage 3: Store document in database
      setSubmissionStage("create");
      const issuePayload: Partial<Issue> = {
        title,
        description,
        location,
        category: previewsAIAnalysis?.category || "Other",
        severity: previewsAIAnalysis?.severity || "Medium",
        status: "Submitted",
        reporterName: currentUser?.name || "Anonymous Citizen",
        reporterEmail: currentUser?.email || "anonymous@example.com",
        imageUrl: resolvedImageUrl || "https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&q=80&w=600",
        createdAt: new Date().toISOString(),
        priority: previewsAIAnalysis?.priority || 3,
        latitude: latitude || 17.3850,
        longitude: longitude || 78.4867,
        aiAnalysis: previewsAIAnalysis || {
          category: "Other",
          severity: "Medium",
          priority: 3,
          explanation: "Analyzed manually on dashboard.",
          recommendedAction: "Dispatch local repair dispatcher crew.",
          estimatedCost: "$150 - $400"
        }
      };

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
      setSuccessIssue({ id: issueId, title: "Supported Existing Hazard" });
    } catch (err: any) {
      setErrorMessage(err.message || "Error supporting existing ticket.");
    } finally {
      setSubmitting(false);
      setSubmissionStage("idle");
    }
  };

  return (
    <div id="report-page" className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-16 relative overflow-hidden">
      
      {/* Decorative glows */}
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
          <span className="text-sm font-extrabold tracking-tight text-white">Report System Portal</span>
        </div>

        <div className="flex items-center space-x-3">
          {currentUser && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400">Reporter:</span>
              <span className="font-bold text-indigo-400 font-mono bg-indigo-950/40 border border-indigo-900/30 px-2 py-0.5 rounded-lg">{currentUser.name}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <AnimatePresence mode="wait">
          
          {/* SUCCESS STATE */}
          {successIssue ? (
            <motion.div
              key="success-container"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="space-y-6"
            >
              <Card variant="glass" glow="emerald" className="p-8 text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <ShieldCheck className="w-9 h-9 animate-pulse" />
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
                      <span className="text-slate-200 font-black">{successIssue.id}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-1.5">
                      <span className="text-slate-500 font-bold uppercase">Classification</span>
                      <Badge variant="brand">{successIssue.category}</Badge>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-1.5">
                      <span className="text-slate-500 font-bold uppercase">Severity</span>
                      <Badge variant={getSeverityVariant(successIssue.severity)}>{successIssue.severity}</Badge>
                    </div>
                    {successIssue.aiAnalysis?.estimatedCost && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold uppercase">Estimated Cost</span>
                        <span className="text-indigo-400 font-bold">{successIssue.aiAnalysis.estimatedCost}</span>
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
                      An extremely similar hazard has already been reported nearby.
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
                          className="shrink-0 w-full sm:w-auto"
                        >
                          Support This Report
                        </Button>
                      </div>

                      {iss.reasoning && (
                        <div className="bg-indigo-950/30 border border-indigo-900/20 rounded-xl p-3 text-xs text-indigo-300 italic flex items-start space-x-1.5 font-medium leading-relaxed">
                          <Brain className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
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
                    className="w-full sm:w-auto text-indigo-400 border-indigo-950 hover:bg-indigo-500/10 hover:text-white"
                  >
                    Submit as Separate New Issue
                  </Button>
                </div>
              </Card>
            </motion.div>
          ) : (
            /* WIZARD FLOW */
            <motion.div
              key="report-form-container"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              
              {/* Wizard Title Segment */}
              <Card variant="glass" className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1 animate-none">
                  <h1 className="text-2xl font-black text-white tracking-tight">Report Municipal Defect</h1>
                  <p className="text-slate-400 text-xs font-medium leading-relaxed">
                    CivicSense automatically triages category, prioritizes urgency, and schedules field crews.
                  </p>
                </div>
                
                {/* Simulated database indicator */}
                <div className="flex items-center space-x-2.5 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-full shrink-0">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-450 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                  <span className="text-[10px] font-bold font-mono tracking-widest text-slate-500 uppercase">FIRESTORE DIRECT</span>
                </div>
              </Card>

              {/* Quick load templates */}
              {currentStep < 2 && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-550 uppercase tracking-wider block font-mono">
                    Quick Prefill Demo Templates:
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {templates.map(tpl => (
                      <div
                        key={tpl.name}
                        id={`template-${tpl.name.toLowerCase().replace(" ", "-")}`}
                        onClick={() => handleLoadTemplate(tpl)}
                        className="group cursor-pointer bg-slate-900/40 rounded-2xl border border-slate-900 overflow-hidden hover:border-indigo-500/50 hover:shadow-md transition-all duration-300 flex flex-col h-full"
                      >
                        {/* Illustration Container */}
                        <div className="h-20 bg-slate-950 border-b border-slate-900/80 overflow-hidden relative flex items-center justify-center">
                          <TemplateIllustration category={tpl.category} />
                        </div>
                        
                        {/* Info Container */}
                        <div className="p-3 flex flex-col flex-grow justify-between space-y-1.5">
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-xs text-slate-200 group-hover:text-indigo-400 transition-colors block leading-tight">
                              {tpl.name}
                            </span>
                            <Badge variant={getSeverityVariant(tpl.severity)} className="mt-0.5">
                              {tpl.severity}
                            </Badge>
                          </div>
                          
                          <div className="pt-1 border-t border-slate-900/80 flex items-center justify-between text-[8px] text-slate-500 font-bold uppercase font-mono">
                            <span>📍 CP</span>
                            <span className="text-indigo-400 font-extrabold">Prefill ⚡</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Form container */}
              <Card variant="default">
                
                {/* Form header message */}
                {errorMessage && (
                  <div className="bg-red-500/10 border-b border-red-500/20 p-4 text-xs font-semibold text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Submitting Loading Overlay State */}
                {submitting && (
                  <div className="p-12 text-center space-y-8 bg-slate-950 flex flex-col items-center justify-center min-h-[400px]">
                    <div className="relative w-24 h-24">
                      <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-ping opacity-45"></div>
                      <div className="absolute inset-2 bg-indigo-950 rounded-full flex items-center justify-center border border-indigo-900/30 shadow-inner">
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
                        {submissionStage === "duplicates" && "Checking Duplicate Hazards..."}
                        {submissionStage === "create" && "Generating Dispatch Ticket..."}
                      </h3>
                      <p className="text-xs text-slate-400 font-semibold leading-relaxed font-mono">
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
                          className="bg-indigo-600 h-full rounded-full transition-all duration-300 relative" 
                          style={{ width: submissionStage === "upload" ? `${uploadProgress}%` : "100%" }}
                        />
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
                      <span className="text-xs font-bold text-indigo-400 tracking-wider uppercase font-mono">Step 1: Visual Evidence</span>
                      <h2 className="text-base font-extrabold text-white">Upload Photograph</h2>
                    </div>

                    {imageUrl ? (
                      <div className="space-y-4">
                        {/* Rich Upload Preview */}
                        <div className="relative h-60 w-full rounded-2xl overflow-hidden border border-slate-900 bg-slate-900 flex items-center justify-center shadow-inner group">
                          {imageLoadError ? (
                            <div className="h-full w-full bg-slate-900 flex flex-col items-center justify-center p-4">
                              <AlertCircle className="w-10 h-10 text-slate-500 mb-2" />
                              <span className="font-bold text-sm text-slate-400 font-mono">Preset Illustration Loaded</span>
                            </div>
                          ) : (
                            <img
                              src={imageUrl}
                              alt="Issue preview"
                              className={`w-full h-full ${
                                imageUrl.startsWith("/demo-images/") ? "object-contain p-6 bg-slate-950/50" : "object-cover"
                              }`}
                              onError={() => setImageLoadError(true)}
                              referrerPolicy="no-referrer"
                            />
                          )}
                          
                          {/* Top-Right Dismiss Button */}
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute top-3.5 right-3.5 p-2 bg-slate-950/80 hover:bg-slate-950 text-white rounded-full transition-all hover:scale-105 active:scale-95 shadow-md border border-slate-800 cursor-pointer"
                            title="Remove image"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          {/* Floating Glassmorphic Metadata bar */}
                          {imageMetadata && (
                            <div className="absolute bottom-3.5 inset-x-3.5 bg-slate-950/70 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-800 text-white flex items-center justify-between text-xs">
                              <div className="flex items-center space-x-2">
                                <FileText className="w-4 h-4 text-indigo-400" />
                                <span className="font-bold max-w-[150px] truncate">{imageMetadata.name}</span>
                              </div>
                              <div className="flex items-center space-x-2 font-mono text-[10px]">
                                <span className="bg-white/10 px-2 py-0.5 rounded text-white">{imageMetadata.type}</span>
                                <span className="text-slate-350">{imageMetadata.size}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* If it's a demo illustration, show a helpful pre-fill banner */}
                        {imageUrl.startsWith("/demo-images/") && (
                          <div className="bg-amber-500/5 border border-amber-500/25 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                            <div className="space-y-1">
                              <p className="font-extrabold text-amber-400">Demo Template Loaded</p>
                              <p className="text-slate-400 font-medium leading-relaxed">
                                This template is prefilled with a local SVG illustration. You can replace it with your own actual photograph to test real-time Gemini Vision analysis!
                              </p>
                            </div>
                            <Button
                              onClick={() => fileInputRef.current?.click()}
                              variant="primary"
                              size="sm"
                              className="shrink-0"
                            >
                              Replace with Photo
                            </Button>
                          </div>
                        )}

                        {/* Real-Time Vision pre-analysis panel */}
                        {(analyzingImage || previewsAIAnalysis) && (
                          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-4 space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                              <div className="flex items-center space-x-2">
                                <Brain className="w-4 h-4 text-indigo-400 animate-pulse" />
                                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                                  Real-Time Gemini Pre-Analysis
                                </span>
                              </div>
                              {analyzingImage ? (
                                <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded-full animate-pulse font-mono">
                                  ⚡ Analyzing...
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => triggerLiveAIAnalysis()}
                                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-mono"
                                >
                                  <RefreshCw className="w-3 h-3" /> Re-Scan
                                </button>
                              )}
                            </div>

                            {analyzingImage ? (
                              <div className="py-2 space-y-2.5">
                                <div className="h-3.5 bg-slate-950 rounded animate-pulse w-2/3"></div>
                                <div className="grid grid-cols-3 gap-3 animate-pulse">
                                  <div className="h-10 bg-slate-950 rounded"></div>
                                  <div className="h-10 bg-slate-950 rounded"></div>
                                  <div className="h-10 bg-slate-950 rounded"></div>
                                </div>
                              </div>
                            ) : previewsAIAnalysis ? (
                              <div className="space-y-3 text-xs">
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-900">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block font-mono">Category</span>
                                    <span className="font-extrabold text-slate-200 block mt-0.5">
                                      {previewsAIAnalysis.category}
                                    </span>
                                  </div>
                                  <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-900">
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
                                  <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-900">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block font-mono">Confidence</span>
                                    <span className="font-extrabold text-indigo-400 block mt-0.5">
                                      {previewsAIAnalysis.confidenceScore || 85}%
                                    </span>
                                  </div>
                                </div>
                                <div className="space-y-1 bg-slate-950/40 p-3 rounded-xl border border-slate-900 leading-relaxed text-slate-300 font-medium">
                                  <span className="font-bold text-white block uppercase text-[9px] tracking-wide text-indigo-400 font-mono">Gemini Assessment:</span>
                                  <p>{previewsAIAnalysis.explanation}</p>
                                </div>
                              </div>
                            ) : null}
                          </div>
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
                          className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[250px] relative overflow-hidden group ${
                            isDragging
                              ? "border-brand-primary bg-indigo-950/20"
                              : "border-slate-800 bg-slate-950/30 hover:border-indigo-500/50 hover:bg-slate-950/50"
                          }`}
                        >
                          <Upload className="w-10 h-10 text-slate-500 group-hover:text-indigo-400 mb-4 transition-colors" />
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-200">
                              <span className="text-indigo-400 group-hover:underline">Click to upload photograph</span> or drag & drop
                            </p>
                            <p className="text-xs text-slate-500 font-medium font-mono">PNG, JPG, WEBP formats supported (up to 10MB)</p>
                          </div>
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* STEP 1: HAZARD DETAILS */}
                {!submitting && currentStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-6 space-y-6 animate-none"
                  >
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-indigo-400 tracking-wider uppercase font-mono">Step 2: Hazard Details</span>
                      <h2 className="text-base font-extrabold text-white">Provide Incident Description</h2>
                    </div>

                    <div className="space-y-4">
                      {/* Telemetry Geocoding Actions */}
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
                          <div className="text-[10px] text-slate-500 font-mono flex items-center space-x-2 bg-slate-950 p-2 rounded-xl border border-slate-900">
                            <span className="text-emerald-400">● Telemetry Lock:</span>
                            <span>Lat: {latitude.toFixed(6)}</span>
                            <span>Lng: {longitude.toFixed(6)}</span>
                          </div>
                        )}
                      </div>

                      <Input
                        label="Report Title"
                        placeholder="e.g. Hazardous Water Main Leak near corner intersection"
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
                            setErrorMessage("Please fill all details.");
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
                  </motion.div>
                )}

                {/* STEP 2: AI DISPATCH REVIEW */}
                {!submitting && currentStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-6 space-y-6"
                  >
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-indigo-400 tracking-wider uppercase font-mono">Step 3: AI Operations Audit</span>
                      <h2 className="text-base font-extrabold text-white">Review Triage Assessment</h2>
                    </div>

                    {previewsAIAnalysis ? (
                      <div className="space-y-6">
                        
                        {/* Cost & Severity Dashboard Summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Card variant="bordered" className="p-4 space-y-2 bg-indigo-950/20 border-indigo-900/30">
                            <div className="flex items-center space-x-2">
                              <Brain className="w-4 h-4 text-indigo-400" />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 font-mono">Triage Class</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-sm font-extrabold text-white">{previewsAIAnalysis.category}</span>
                              <div className="flex items-center space-x-1.5 pt-0.5">
                                <span className="text-[10px] text-slate-400">Urgency:</span>
                                <Badge variant={getSeverityVariant(previewsAIAnalysis.severity)}>{previewsAIAnalysis.severity}</Badge>
                              </div>
                            </div>
                          </Card>

                          <Card variant="bordered" className="p-4 space-y-2 bg-indigo-950/20 border-indigo-900/30">
                            <div className="flex items-center space-x-2">
                              <ImageIcon className="w-4 h-4 text-indigo-400" />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 font-mono">Resource Estimate</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-sm font-extrabold text-indigo-400">{previewsAIAnalysis.estimatedCost || "$250 - $500"}</span>
                              <p className="text-[10px] text-slate-400 font-medium">Standard material budget threshold</p>
                            </div>
                          </Card>
                        </div>

                        {/* Dispatch Recommendation */}
                        <div className="space-y-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block font-mono">AI Recommended Crew Toolkit Manifest</span>
                          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl text-xs font-semibold text-slate-200 leading-relaxed shadow-sm">
                            {previewsAIAnalysis.recommendedAction}
                          </div>
                        </div>

                        {/* Dispatch Rationale */}
                        <div className="space-y-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block font-mono">Triage Analysis Reasoning</span>
                          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl text-xs text-slate-300 leading-relaxed italic">
                            "{previewsAIAnalysis.explanation}"
                          </div>
                        </div>

                      </div>
                    ) : (
                      <div className="py-6 text-center space-y-2 bg-slate-900/30 rounded-2xl border border-slate-900">
                        <Brain className="w-8 h-8 text-slate-650 mx-auto animate-pulse" />
                        <p className="text-xs text-slate-400">Manual review mode. AI analysis pre-checks skipped.</p>
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
                  </motion.div>
                )}

              </Card>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
