import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, logOut } from "./firebase";
import LandingPage from "./components/LandingPage";
import LoginPage from "./components/LoginPage";
import DashboardPage from "./components/DashboardPage";
import ReportPage from "./components/ReportPage";
import OfficialPage from "./components/OfficialPage";
import { User } from "./types";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";


export default function App() {
  const [currentPage, setCurrentPage] = useState<string>("landing");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const shouldReduceMotion = useReducedMotion();

  const handleNavigateDirect = (page: string, userOverride?: User | null) => {
    const activeUser = userOverride !== undefined ? userOverride : currentUser;
    let targetPage = page;
    if ((page === "dashboard" || page === "report" || page === "official") && !activeUser) {
      targetPage = "login";
    }
    setCurrentPage(targetPage);
    window.location.hash = `#/${targetPage}`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNavigate = (page: string) => {
    handleNavigateDirect(page, currentUser);
  };

  // Load session from localStorage on mount and sync with Firebase Auth
  useEffect(() => {
    // Quick load from local storage to avoid flashing
    const savedUser = localStorage.getItem("civic_sense_user");
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (err) {
        console.error("Error reading saved user session:", err);
      }
    }
    
    // Hash routing for simple browser history support if desired
    const hash = window.location.hash.replace("#/", "");
    if (["landing", "login", "dashboard", "report", "official"].includes(hash)) {
      setCurrentPage(hash);
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // If logged in via Firebase Auth, sync the user session details
        const savedUserJSON = localStorage.getItem("civic_sense_user");
        let role: "citizen" | "official" = "citizen";
        if (savedUserJSON) {
          try {
            const saved = JSON.parse(savedUserJSON);
            if (saved.uid === firebaseUser.uid) {
              role = saved.role || "citizen";
            }
          } catch (e) {
            console.error(e);
          }
        }

        const selectedRole = localStorage.getItem("civic_sense_selected_role");
        if (selectedRole === "citizen" || selectedRole === "official") {
          role = selectedRole as "citizen" | "official";
          localStorage.removeItem("civic_sense_selected_role");
        }

        const appUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: firebaseUser.displayName || "Anonymous User",
          picture: firebaseUser.photoURL || "",
          photoURL: firebaseUser.photoURL || "",
          role: role,
          createdAt: new Date().toISOString()
        };
        setCurrentUser(appUser);
        localStorage.setItem("civic_sense_user", JSON.stringify(appUser));

        // Auto navigate if they are on the login page!
        const currentHash = window.location.hash.replace("#/", "");
        if (currentHash === "login" || currentPage === "login") {
          const targetPage = role === "official" ? "official" : "dashboard";
          handleNavigateDirect(targetPage, appUser);
        }
      } else {
        // Clear session only if it was a Firebase user (has uid)
        const savedUserJSON = localStorage.getItem("civic_sense_user");
        if (savedUserJSON) {
          try {
            const saved = JSON.parse(savedUserJSON);
            if (saved.uid) {
              setCurrentUser(null);
              localStorage.removeItem("civic_sense_user");
            }
          } catch (e) {
            setCurrentUser(null);
            localStorage.removeItem("civic_sense_user");
          }
        } else {
          setCurrentUser(null);
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [currentPage]);

  // Listen for developer persona switching
  useEffect(() => {
    const handleSwitchPersona = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { type, role } = customEvent.detail || {};
      if (type === "switch-persona") {
        try {
          await logOut();
        } catch (err) {
          console.error("Error signing out during persona switch:", err);
        }
        setCurrentUser(null);
        localStorage.removeItem("civic_sense_user");
        
        if (role === "citizen" || role === "official") {
          localStorage.setItem("civic_sense_preselected_role", role);
        }
        handleNavigateDirect("login", null);
      }
    };

    window.addEventListener("dev-action", handleSwitchPersona);
    return () => window.removeEventListener("dev-action", handleSwitchPersona);
  }, []);

  // Protect Dashboard and Report Routes automatically on state or page changes
  useEffect(() => {
    if (!authLoading) {
      if ((currentPage === "dashboard" || currentPage === "report" || currentPage === "official") && !currentUser) {
        handleNavigateDirect("login", null);
      }
    }
  }, [currentPage, currentUser, authLoading]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("civic_sense_user", JSON.stringify(user));
  };

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (err) {
      console.error("Error logging out from Firebase:", err);
    }
    setCurrentUser(null);
    localStorage.removeItem("civic_sense_user");
    handleNavigate("landing");
  };


  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-indigo-600/20 animate-bounce">
            C
          </div>
          <p className="text-sm font-semibold text-slate-500 animate-pulse">
            Verifying Civic Identity...
          </p>
        </div>
      </div>
    );
  }


  const pageVariants = shouldReduceMotion ? {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.1 } },
    exit: { opacity: 0, transition: { duration: 0.1 } }
  } : {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" as const } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: "easeIn" as const } }
  };

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-indigo-500 selection:text-white">
      <AnimatePresence mode="wait">
        {currentPage === "landing" && (
          <motion.div key="landing" variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <LandingPage 
              onNavigate={handleNavigate} 
            />
          </motion.div>
        )}
        
        {currentPage === "login" && (
          <motion.div key="login" variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <LoginPage 
              onLogin={handleLogin} 
              onNavigate={handleNavigate} 
              userEmail="sasankkonduru@gmail.com" 
              currentUser={currentUser}
            />
          </motion.div>
        )}
        
        {currentPage === "dashboard" && (
          <motion.div key="dashboard" variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <DashboardPage 
              onNavigate={handleNavigate} 
              currentUser={currentUser} 
              onLogout={handleLogout} 
            />
          </motion.div>
        )}
        
        {currentPage === "report" && (
          <motion.div key="report" variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <ReportPage 
              onNavigate={handleNavigate} 
              currentUser={currentUser} 
            />
          </motion.div>
        )}

        {currentPage === "official" && (
          <motion.div key="official" variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <OfficialPage 
              onNavigate={handleNavigate} 
              currentUser={currentUser} 
              onLogout={handleLogout}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
