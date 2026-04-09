"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { databases, account, ID, Query } from "@/lib/appwrite";

export default function StudentLobbyPage() {
  const router = useRouter();
  
  // States
  const [studentName, setStudentName] = useState("Loading...");
  const [studentId, setStudentId] = useState(""); 
  const [enrolledClasses, setEnrolledClasses] = useState<any[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  
  const DB_ID = "69cdad52000c69263839";

  useEffect(() => {
    // 1. Get student name from local storage (saved during Auth)
    const storedName = localStorage.getItem("studentName");
    if (!storedName) {
      router.push("/auth");
      return;
    }
    setStudentName(storedName);
    fetchMyClasses(storedName);
    
    // 2. Fetch the secure Appwrite User ID in the background
    fetchUserId();
  }, []);

  // 🔍 FETCH USER ID
  const fetchUserId = async () => {
    try {
      const user = await account.get();
      setStudentId(user.$id);
    } catch (err) {
      console.error("Failed to get user ID:", err);
    }
  };

  // 🔍 FETCH ENROLLED CLASSES
  const fetchMyClasses = async (name: string) => {
    try {
      // Find all enrollments for this specific student
      const enrolls = await databases.listDocuments(DB_ID, "enrollments", [
        Query.equal("studentName", name)
      ]);

      if (enrolls.documents.length === 0) {
        setEnrolledClasses([]);
        return;
      }

      // Get the actual classroom details for each enrollment
      const classPromises = enrolls.documents.map(async (enroll) => {
        try {
          const classData = await databases.getDocument(DB_ID, "classrooms", enroll.classId);
          return { ...classData, enrollmentId: enroll.$id };
        } catch (e) {
          return null; // Ignore deleted classes
        }
      });

      const classes = (await Promise.all(classPromises)).filter(c => c !== null);
      setEnrolledClasses(classes);
    } catch (err) {
      console.error("Failed to fetch classes:", err);
    }
  };

  // ➕ JOIN A NEW CLASSROOM
  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setIsJoining(true);

    try {
      // 1. Find the classroom with this exact code
      const classLookup = await databases.listDocuments(DB_ID, "classrooms", [
        Query.equal("joinCode", joinCode.trim().toUpperCase())
      ]);

      if (classLookup.documents.length === 0) {
        alert("Invalid Class Code bro! Check with your professor.");
        setIsJoining(false);
        return;
      }

      const targetClass = classLookup.documents[0];

      // 2. Check if already enrolled
      const checkEnrolled = await databases.listDocuments(DB_ID, "enrollments", [
        Query.equal("classId", targetClass.$id),
        Query.equal("studentName", studentName)
      ]);

      if (checkEnrolled.documents.length > 0) {
        alert("You are already in this class bro!");
        setJoinCode("");
        setIsJoining(false);
        return;
      }

      // 3. Create the enrollment document!
      await databases.createDocument(DB_ID, "enrollments", ID.unique(), {
        classId: targetClass.$id,
        studentName: studentName,
        studentId: studentId,
        className: targetClass.className // 🔥 THE FIX: We now send the className to satisfy Appwrite!
      });

      alert(`Successfully joined ${targetClass.className}!`);
      setJoinCode("");
      fetchMyClasses(studentName);

    } catch (err: any) {
      console.error(err);
      alert("Error joining class: " + err.message);
    } finally {
      setIsJoining(false);
    }
  };

  // 🚪 LEAVE CLASSROOM (THE ESCAPE HATCH)
  const handleLeaveClass = async (enrollmentId: string, className: string) => {
    const confirmed = window.confirm(`Bro, are you sure you want to leave ${className}? You'll lose access to your assignments!`);
    if (!confirmed) return;

    try {
      // Nuke the enrollment document from Appwrite
      await databases.deleteDocument(DB_ID, "enrollments", enrollmentId);
      alert(`Left ${className} successfully.`);
      fetchMyClasses(studentName); // Refresh the UI
    } catch (err) {
      console.error(err);
      alert("System Error: Couldn't leave class.");
    }
  };

  // 🔒 LOGOUT
  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
      localStorage.removeItem("studentName");
      router.push("/");
    } catch (err) {
      localStorage.removeItem("studentName");
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-10 font-sans">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-12 bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-1">
            <span className="text-white">Student</span><span className="text-emerald-500">Hub</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-2">
            Active User: <span className="text-emerald-400">{studentName}</span>
          </p>
        </div>
        <button onClick={handleLogout} className="bg-slate-950 px-8 py-3 rounded-xl text-[10px] font-black uppercase border border-slate-800 hover:border-red-900/50 hover:text-red-500 transition-all shadow-lg">
          Logout
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto">
        
        {/* LEFT COLUMN: ACTIVE CLASSROOMS */}
        <div className="flex-1 space-y-6">
          <h2 className="text-xl font-black italic uppercase tracking-widest text-emerald-500 mb-6 pl-2">My Classrooms</h2>
          
          {enrolledClasses.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800 p-10 rounded-[2rem] text-center">
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">You haven't joined any classes yet bro.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {enrolledClasses.map(cls => (
                <div key={cls.$id} className="bg-slate-900/60 p-8 rounded-[2rem] border border-slate-800 shadow-xl flex flex-col justify-between animate-in fade-in slide-in-from-bottom-4 transition-all hover:border-emerald-500/30">
                  
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase mb-3 tracking-[0.2em] bg-slate-950 inline-block px-3 py-1 rounded-md border border-slate-800">
                      Code: <span className="text-emerald-400">{cls.joinCode || cls.classCode}</span>
                    </p>
                    <h3 className="text-2xl font-black uppercase mb-8 text-white tracking-wide leading-tight">{cls.className}</h3>
                  </div>
                  
                  <div className="flex gap-3 mt-auto">
                    <button 
                      onClick={() => router.push(`/student/class/${cls.$id}`)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg shadow-emerald-900/30"
                    >
                      Enter
                    </button>
                    {/* THE ESCAPE HATCH */}
                    <button 
                      onClick={() => handleLeaveClass(cls.enrollmentId, cls.className)}
                      className="px-5 bg-slate-950 border border-red-900/30 hover:bg-red-600 hover:border-red-500 text-red-500 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                      title="Leave Class"
                    >
                      Leave
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: JOIN CLASS WIDGET */}
        <div className="w-full lg:w-[400px]">
          <div className="bg-slate-900/80 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl sticky top-10">
            <h2 className="text-xl font-black italic uppercase tracking-widest text-white mb-2">Join Class</h2>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-8 leading-relaxed">Enter the unique code provided by your professor to enroll.</p>
            
            <form onSubmit={handleJoinClass} className="space-y-4">
              <input 
                type="text" 
                placeholder="e.g. U2UBB" 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-700 outline-none focus:border-emerald-500 text-emerald-400 font-black text-center text-xl tracking-[0.5em] transition-colors"
                required
              />
              <button 
                type="submit" 
                disabled={isJoining}
                className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all ${isJoining ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-black hover:bg-emerald-400 shadow-xl'}`}
              >
                {isJoining ? "Verifying..." : "Enroll Now"}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}