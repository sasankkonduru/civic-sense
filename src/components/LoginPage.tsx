import React, { useState } from "react";
import { Shield, AlertTriangle, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { signInWithGoogle } from "../firebase";
import Button from "./ui/Button";
import { Card, CardContent } from "./ui/Card";
import Badge from "./ui/Badge";

interface LoginPageProps {
  onLogin: (user: { uid?: string; email: string; name: string; role: "citizen" | "official"; picture?: string }) => void;
  onNavigate: (page: string) => void;
  userEmail?: string;
}

export default function LoginPage({ onLogin, onNavigate, userEmail = "sasankkonduru@gmail.com" }: LoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"citizen" | "official">("citizen");
  const [errorMsg, setErrorMsg] = useState("");

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const user = await signInWithGoogle(selectedRole);
      onLogin({
        uid: user.uid,
        email: user.email,
        name: user.name,
        role: user.role,
        picture: user.picture || undefined,
      });
      onNavigate("dashboard");
    } catch (err: any) {
      console.error("Sign in failed:", err);
      setErrorMsg(err?.message || "Google Sign-In was cancelled or failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-page" className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      
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
          Access Civic Intelligence
        </h2>
        <p className="mt-3 text-center text-sm text-slate-400">
          Or return to the{" "}
          <button
            onClick={() => onNavigate("landing")}
            className="font-bold text-brand-primary hover:text-indigo-400 hover:underline transition-all inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> main landing page
          </button>
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
              
              {/* Role selector to try citizen or official */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
                  Select Demo Identity
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("citizen")}
                    className={`py-2.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      selectedRole === "citizen"
                        ? "bg-slate-800 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Citizen Reporter
                  </button>
                  <button
                    type="button"
                    id="role-official-btn"
                    onClick={() => setSelectedRole("official")}
                    className={`py-2.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      selectedRole === "official"
                        ? "bg-brand-primary text-white shadow-md shadow-indigo-650/20"
                        : "text-slate-400 hover:text-slate-200"
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

              <div className="space-y-6">
                {/* Google Authentication button */}
                <div>
                  <Button
                    id="google-signin-btn"
                    onClick={handleGoogleSignIn}
                    loading={loading}
                    variant="glass"
                    className="w-full justify-center py-3.5 hover:bg-slate-900 border border-slate-800 rounded-2xl text-slate-200 hover:text-white"
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

                <div className="relative flex items-center justify-center my-6">
                  <div className="absolute inset-x-0 border-t border-slate-900" />
                  <span className="relative bg-slate-950/80 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                    Platform Access Info
                  </span>
                </div>

                <div className="rounded-2xl bg-indigo-950/30 border border-indigo-900/30 p-4 space-y-2">
                  <div className="flex items-center space-x-2 text-indigo-400">
                    <Shield className="w-4.5 h-4.5 text-brand-primary" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider font-mono">Demo Security Credentials</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    This applet uses Google OAuth styling. Choosing <b>Citizen Reporter</b> logs you in as <b>{userEmail}</b> to file and monitor issues. Choosing <b>City Official</b> grants administrative access to dispatch operations and verify repairs.
                  </p>
                </div>
              </div>

            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
