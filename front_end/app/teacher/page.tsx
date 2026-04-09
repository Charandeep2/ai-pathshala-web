"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { databases, account, ID, Query } from "@/lib/appwrite";

export default function TeacherLobbyPage() {
  const router = useRouter();
  
  // States
  const [teacherName, setTeacherName] = useState("Loading...");
  const [classrooms, setClassrooms] = useState<any[]>([]);
  
  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const DB_ID = "69cdad52000c69263839";

  // 🚀 ON LOAD: Authenticate and Fetch
  useEffect(() => {
    // We saved the user's name as 'studentName' in local storage during auth
    const storedName = localStorage.getItem("studentName");
    if (!storedName) {
      router.push("/auth");
      return;
    }
    setTeacherName(storedName);
    fetchClassrooms();
  }, []);

  // 🔍 FETCH ACTIVE CLASSROOMS
  const fetchClassrooms = async () => {
    try {
      const response = await databases.listDocuments(DB_ID, "classrooms", [
        Query.orderDesc("$createdAt")
      ]);
      setClassrooms(response.documents);
    } catch (err) {
      console.error("Error fetching classrooms:", err);
    }
  };

  // ✨ GENERATE & CREATE CLASS
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setIsCreating(true);

    try {
      // 1. Generate the unique 5-character code
      const generatedCode = Math.random().toString(36).substring(2, 7).toUpperCase();

      // 2. Save it to Appwrite with ALL required fields!
      await databases.createDocument(DB_ID, "classrooms", ID.unique(), {
        className: newClassName.trim(),
        classCode: generatedCode, // Keeping this just in case your UI still looks for it
        joinCode: generatedCode,  // 🔥 THE FIX: Appwrite is specifically asking for this!
        teacherId: teacherName 
      });

      // 3. Reset and refresh
      setNewClassName("");
      setShowCreateModal(false);
      fetchClassrooms();
      alert(`Class Generated! Code is: ${generatedCode}`);

    } catch (err: any) {
      console.error(err);
      alert("Error creating class: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  // 🗑️ DELETE CLASSROOM
  const handleDeleteClass = async (classId: string, name: string) => {
    const confirmed = window.confirm(`Bro, are you sure you want to completely delete ${name}?`);
    if (!confirmed) return;

    try {
      await databases.deleteDocument(DB_ID, "classrooms", classId);
      fetchClassrooms(); // Refresh UI instantly
    } catch (err: any) {
      console.error(err);
      alert("Failed to delete class.");
    }
  };

  // 🔒 SECURE LOGOUT
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
    <div className="min-h-screen bg-[#020617] text-white p-10 font-sans relative">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-12 bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-1">
            <span className="text-white">Teacher</span><span className="text-blue-500">Hub</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-2">
            Manage your active classrooms
          </p>
        </div>
        <button onClick={handleLogout} className="bg-slate-950 px-8 py-3 rounded-xl text-[10px] font-black uppercase border border-slate-800 hover:text-white hover:bg-slate-900 transition-all shadow-lg">
          Logout
        </button>
      </div>

      {/* CREATE NEW CLASS BUTTON */}
      <div className="mb-10">
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-900/30"
        >
          + Create New Class
        </button>
      </div>

      {/* CLASSROOMS GRID */}
      {classrooms.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 p-10 rounded-[2rem] text-center max-w-2xl">
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No active classrooms bro. Create one to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classrooms.map(cls => (
            <div key={cls.$id} className="bg-slate-900/60 p-8 rounded-[2rem] border border-slate-800 shadow-xl flex flex-col justify-between animate-in fade-in zoom-in-95 transition-all hover:border-blue-500/30">
              
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-3xl font-black italic uppercase text-white tracking-wide">{cls.className}</h3>
                <button 
                  onClick={() => handleDeleteClass(cls.$id, cls.className)}
                  className="text-[9px] font-black text-slate-600 hover:text-red-500 uppercase tracking-widest transition-colors"
                >
                  Delete
                </button>
              </div>
              
              {/* THE CLASS CODE BOX */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl mb-8 inline-block self-start">
                <p className="text-[8px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Class Code</p>
                {/* Checks for joinCode first, falls back to classCode so it never breaks */}
                <p className="text-emerald-400 font-black text-xl tracking-[0.3em]">{cls.joinCode || cls.classCode || "ERROR"}</p>
              </div>
              
              <button 
                onClick={() => router.push(`/teacher/class/${cls.$id}`)}
                className="w-full bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-slate-800 shadow-lg"
              >
                Enter Classroom
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 🔥 THE CREATE CLASS MODAL OVERLAY */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-[#020617] border border-slate-800 p-10 rounded-[2.5rem] shadow-2xl max-w-lg w-full animate-in zoom-in-95 slide-in-from-bottom-8">
            
            <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-2">
              <span className="text-white">Create</span><span className="text-blue-500">Class</span>
            </h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-8 leading-relaxed">
              A unique 5-character code will be generated for your students.
            </p>

            <form onSubmit={handleCreateClass} className="space-y-6">
              <input 
                type="text" 
                placeholder="e.g. physics-01" 
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="w-full bg-slate-900/80 p-5 rounded-2xl border border-slate-800 outline-none focus:border-blue-500 text-white font-bold text-sm transition-colors"
                required
                autoFocus
              />
              
              <div className="flex gap-4">
                <button 
                  type="submit" 
                  disabled={isCreating}
                  className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${isCreating ? 'bg-blue-900 text-blue-300' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/30'}`}
                >
                  {isCreating ? "Generating..." : "Generate Class"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-slate-900 text-slate-400 hover:text-white transition-all border border-slate-800"
                >
                  Cancel
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}