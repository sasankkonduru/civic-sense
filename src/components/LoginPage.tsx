import React, { useState } from "react";
import { Shield, Lock, Eye, EyeOff, CheckCircle, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";
import { signInWithGoogle } from "../firebase";

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
    <div id="login-page" className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => onNavigate("landing")}>
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-indigo-600/20">
              C
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-950">
              Civic<span className="text-indigo-600">Sense</span>
            </span>
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Access Civic Intelligence
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Or return to the{" "}
          <button
            onClick={() => onNavigate("landing")}
            className="font-medium text-indigo-600 hover:text-indigo-500 underline transition-all"
          >
            main landing page
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-200 sm:px-10"
        >
          {/* Role selector to try citizen or official */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
              Select Demo Identity
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedRole("citizen")}
                className={`py-2 px-3 text-xs font-semibold rounded-xl transition-all ${
                  selectedRole === "citizen"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Citizen Reporter
              </button>
              <button
                type="button"
                id="role-official-btn"
                onClick={() => setSelectedRole("official")}
                className={`py-2 px-3 text-xs font-semibold rounded-xl transition-all ${
                  selectedRole === "official"
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/10"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                City Official
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 bg-red-50 border border-red-250 p-4 rounded-xl text-xs font-semibold text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-6">
            {/* Google Authentication button */}
            <div>
              <button
                id="google-signin-btn"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex justify-center items-center px-4 py-3 border border-slate-300 rounded-2xl shadow-sm bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 transition-all hover:border-slate-400 focus:outline-none"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Authenticating with Google...</span>
                  </div>
                ) : (
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
              </button>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-500 font-medium">Platform Access Info</span>
              </div>
            </div>

            <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 space-y-2">
              <div className="flex items-center space-x-2 text-indigo-850">
                <Shield className="w-4.5 h-4.5 text-indigo-600" />
                <span className="text-xs font-bold uppercase tracking-wider">Demo Security</span>
              </div>
              <p className="text-xs text-indigo-700 leading-relaxed">
                This applet uses Google OAuth styling. Choosing <b>Citizen Reporter</b> logs you in as <b>{userEmail}</b> to file and monitor issues. Choosing <b>City Official</b> grants admin access to update repair queues and dispatcher metrics.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
