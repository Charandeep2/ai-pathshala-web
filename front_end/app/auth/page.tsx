"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { account, databases, ID, Query } from "@/lib/appwrite";
import Link from "next/link"; // Added this for the Back to Home button

export default function AuthPage() {
  const router = useRouter();
  
  // UI States
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(true); 
  const [errorMsg, setErrorMsg] = useState("");

  // Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");

  const DB_ID = "69cdad52000c69263839";

  // 🚀 ON LOAD: Check if they are already logged in secretly
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const user = await account.get();
      const profile = await databases.listDocuments(DB_ID, "user_profile", [
        Query.equal("userId", user.$id)
      ]);

      if (profile.documents.length > 0) {
        const userRole = profile.documents[0].role;
        localStorage.setItem("studentName", profile.documents[0].fullName); 
        
        // Auto-redirect them!
        if (userRole === "teacher") router.push("/teacher");
        else router.push("/student");
      } else {
        setLoading(false);
      }
    } catch (e) {
      // No active session found, which is normal. Let them log in.
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      // 💣 NUKE STUCK SESSIONS: Prevents the "Session already active" error
      try {
        await account.deleteSession("current");
      } catch (ignoredError) {
        // If there is no session to delete, just ignore and keep moving
      }

      if (isLogin) {
        // --- 1. LOG IN EXISTING USER ---
        await account.createEmailPasswordSession(email, password);
        
        const user = await account.get();
        const profile = await databases.listDocuments(DB_ID, "user_profile", [
          Query.equal("userId", user.$id)
        ]);

        if (profile.documents.length > 0) {
          const userRole = profile.documents[0].role;
          localStorage.setItem("studentName", profile.documents[0].fullName); 
          
          if (userRole === "teacher") router.push("/teacher");
          else router.push("/student");
        } else {
          setErrorMsg("Profile data not found. Please contact an admin.");
        }

      } else {
        // --- 2. REGISTER NEW USER ---
        if (!fullName.trim()) return setErrorMsg("Full Name is required bro!");

        const newUser = await account.create(ID.unique(), email, password, fullName);
        await account.createEmailPasswordSession(email, password);

        // Save to user_profile collection
        await databases.createDocument(DB_ID, "user_profile", ID.unique(), {
          userId: newUser.$id,
          role: role,
          fullName: fullName
        });

        localStorage.setItem("studentName", fullName);

        if (role === "teacher") router.push("/teacher");
        else router.push("/student");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // Prevent UI flickering while checking session
  if (loading && !email && !password) return <div className="h-screen bg-[#020617] flex items-center justify-center text-white font-black tracking-widest uppercase">Initializing Secure Portal...</div>;

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-sans overflow-hidden relative">
      
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-900/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-900/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl p-10 rounded-[3rem] border border-slate-800 shadow-2xl relative z-10 animate-in slide-in-from-bottom-8">
        
        <div className="text-center mb-10">
          {/* 🔥 THE FIX: Updated Title to match the Homepage */}
          <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-2">
            <span className="text-white">AI-</span><span className="text-blue-500">PATHSHALA</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            {isLogin ? "Authenticate to Access" : "Create your account"}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-xs font-bold p-4 rounded-xl mb-6 text-center uppercase tracking-wide">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          
          {!isLogin && (
            <div className="space-y-5 animate-in fade-in slide-in-from-top-4">
              <div className="flex gap-4 p-2 bg-slate-950 rounded-2xl border border-slate-800">
                <button 
                  type="button"
                  onClick={() => setRole("student")}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${role === 'student' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'text-slate-500 hover:text-white'}`}
                >
                  Student
                </button>
                <button 
                  type="button"
                  onClick={() => setRole("teacher")}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${role === 'teacher' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'text-slate-500 hover:text-white'}`}
                >
                  Teacher
                </button>
              </div>

              <input 
                type="text" 
                placeholder="Full Name" 
                value={fullName} 
                onChange={e => setFullName(e.target.value)} 
                className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800 outline-none focus:border-blue-500 text-white font-bold text-sm transition-colors" 
                required={!isLogin}
              />
            </div>
          )}

          <input 
            type="email" 
            placeholder="Email Address" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800 outline-none focus:border-blue-500 text-white font-bold text-sm transition-colors" 
            required
          />
          
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800 outline-none focus:border-blue-500 text-white font-bold text-sm transition-colors" 
            required
          />

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-5 mt-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${loading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white shadow-lg shadow-blue-900/30 hover:scale-[1.02]'}`}
          >
            {loading ? "Processing..." : (isLogin ? "Secure Login" : "Create Account")}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-800 pt-6 flex flex-col items-center gap-4">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {isLogin ? "New to the platform?" : "Already have an account?"}
            </p>
            <button 
              onClick={() => { setIsLogin(!isLogin); setErrorMsg(""); }} 
              className="mt-2 text-xs font-black text-white hover:text-blue-400 uppercase tracking-widest transition-all"
            >
              {isLogin ? "Create an account" : "Log in here"}
            </button>
          </div>
          
          {/* Back to home link for easy navigation */}
          <Link href="/" className="text-[9px] text-slate-600 hover:text-slate-400 uppercase font-bold tracking-[0.2em] transition-colors mt-2">
            ← Back to Home
          </Link>
        </div>

      </div>
    </div>
  );
}