import React, { useState } from "react";
import { Shield, AlertTriangle, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { signInWithGoogle } from "../firebase";
import Button from "./ui/Button";
import { Card, CardContent } from "./ui/Card";
import Badge from "./ui/Badge";
import { AINetworkBackground } from "./ui/AINetworkBackground";

interface LoginPageProps {
  onLogin: (user: { uid?: string; email: string; name: string; role: "citizen" | "official"; picture?: string }) => void;
  onNavigate: (page: string) => void;
  userEmail?: string;
  currentUser?: any;
}

export default function LoginPage({ onLogin, onNavigate, userEmail = "sasankkonduru@gmail.com", currentUser }: LoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"citizen" | "official">(() => {
    const preselected = localStorage.getItem("civic_sense_preselected_role");
    if (preselected === "citizen" || preselected === "official") {
      localStorage.removeItem("civic_sense_preselected_role");
      return preselected;
    }
    return currentUser?.role || "citizen";
  });
  const [errorMsg, setErrorMsg] = useState("");

  const handleGoogleSignIn = async () => {
    if (loading) return; // Prevent duplicate triggers
    try {
      setLoading(true);
      setErrorMsg("");
      
      // Store selected experience role to let App.tsx auto-redirect correctly on state sync
      localStorage.setItem("civic_sense_selected_role", selectedRole);
      
      await signInWithGoogle(selectedRole);
      // Do not navigate immediately; wait for App.tsx onAuthStateChanged to completely resolve
    } catch (err: any) {
      console.error("Sign in failed:", err);
      localStorage.removeItem("civic_sense_selected_role");
      setErrorMsg(err?.message || "Google Sign-In was cancelled or failed.");
      setLoading(false);
    }
  };

  const handleProceed = () => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, role: selectedRole };
    onLogin(updatedUser);
    if (selectedRole === "official") {
      onNavigate("official");
    } else {
      onNavigate("dashboard");
    }
  };


  return (
    <div id="login-page" className="min-h-screen bg-slate-955 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      
      {/* Smart City Network Animation Background */}
      <AINetworkBackground />

      {/* Decorative glows */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={() => onNavigate("landing")}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-600/35 group-hover:scale-105 transition-all">
              C
            </div>
            <span className="text-2xl font-black tracking-tight text-white">
              Civic<span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-secondary">Sense</span>
            </span>
          </div>
        </div>
        <h2 className="text-center text-3xl font-black text-white tracking-tight leading-none">
          Sign in to CivicSense
        </h2>
        <p className="mt-3 text-center text-sm text-slate-455 font-mono uppercase font-bold tracking-widest">
          Authentication Desk
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card variant="glass" glow="indigo">
            <CardContent className="space-y-6">
              
              {/* Experience selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 text-center font-mono">
                  Select Experience
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-900">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("citizen")}
                    className={`py-2.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      selectedRole === "citizen"
                        ? "bg-slate-800 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-205"
                    }`}
                  >
                    Citizen Portal
                  </button>
                  <button
                    type="button"
                    id="role-official-btn"
                    onClick={() => setSelectedRole("official")}
                    className={`py-2.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      selectedRole === "official"
                        ? "bg-brand-primary text-white shadow-md shadow-indigo-650/20"
                        : "text-slate-400 hover:text-slate-205"
                    }`}
                  >
                    City Official
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/25 p-4 rounded-2xl text-xs font-semibold text-red-400 flex items-center gap-2.5 shadow-sm">
                  <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-4">
                <Button
                  id="google-signin-btn"
                  onClick={handleGoogleSignIn}
                  loading={loading}
                  disabled={loading}
                  variant="glass"
                  className="w-full justify-center py-3.5 hover:bg-slate-900 border border-slate-800 rounded-2xl text-slate-202 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!loading && (
                    <div className="flex items-center space-x-3">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" width="24" height="24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.29 1.5-.1.14 1.14 2.47V19.2h1.86c3.07-2.83 4.86-7 4.86-11.83z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.86-3c-1.08.72-2.45 1.16-4.1 1.16-3.15 0-5.81-2.13-6.76-5.01H1.32v3.1A12 12 0 0 0 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.24 14.24a7.19 7.19 0 0 1 0-4.48V6.66H1.32a12 12 0 0 0 0 10.68l3.92-3.1z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.96 1.19 15.24 0 12 0 7.32 0 3.2 4.15 1.32 6.66l3.92 3.1c.95-2.88 3.61-5.01 6.76-5.01z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </div>
                  )}
                  {loading && <span>Authenticating with Google...</span>}
                </Button>
              </div>


            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
