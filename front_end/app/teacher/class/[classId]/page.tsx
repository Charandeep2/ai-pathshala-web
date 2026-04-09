"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { databases, storage, ID, Query } from "@/lib/appwrite";

export default function TeacherClassroomPage() {
  const { classId } = useParams();
  const router = useRouter();

  // Data States
  const [className, setClassName] = useState("Loading...");
  const [materials, setMaterials] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);

  // UI States
  const [activeTab, setActiveTab] = useState<"materials" | "assignments">("materials");
  const [gradingId, setGradingId] = useState<string | null>(null);

  // Modal States
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form States
  const [materialTopic, setMaterialTopic] = useState("");
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDesc, setAssignmentDesc] = useState("");

  // Appwrite IDs
  const DB_ID = "69cdad52000c69263839";
  const BUCKET_ID = "69cdaa6f002c333f4450"; // Make sure this is your Storage Bucket ID

  useEffect(() => {
    if (classId) fetchData();
  }, [classId]);

  const fetchData = async () => {
    try {
      const classData = await databases.getDocument(DB_ID, "classrooms", classId as string);
      setClassName(classData.className);

      const mats = await databases.listDocuments(DB_ID, "materials", [
        Query.equal("classId", classId as string),
        Query.orderDesc("$createdAt")
      ]);
      setMaterials(mats.documents);

      const tasks = await databases.listDocuments(DB_ID, "assignments", [
        Query.equal("classId", classId as string),
        Query.orderDesc("$createdAt")
      ]);
      setAssignments(tasks.documents);

      const subs = await databases.listDocuments(DB_ID, "submissions", [
        Query.equal("classId", classId as string)
      ]);
      setSubmissions(subs.documents);

    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  // 📂 UPLOAD MATERIAL
  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialFile || !materialTopic.trim()) return alert("Please provide a topic and a file.");
    setIsUploading(true);

    try {
      const uploadedFile = await storage.createFile(BUCKET_ID, ID.unique(), materialFile);
      
      await databases.createDocument(DB_ID, "materials", ID.unique(), {
        topic: materialTopic,
        fileId: uploadedFile.$id,
        classId: classId as string
      });

      setMaterialTopic("");
      setMaterialFile(null);
      setShowMaterialModal(false);
      fetchData();
      alert("Material uploaded successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Upload failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // 📝 CREATE ASSIGNMENT
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentTitle.trim() || !assignmentDesc.trim()) return alert("Please fill all fields.");
    setIsUploading(true);

    try {
      await databases.createDocument(DB_ID, "assignments", ID.unique(), {
        title: assignmentTitle,
        description: assignmentDesc,
        classId: classId as string
      });

      setAssignmentTitle("");
      setAssignmentDesc("");
      setShowAssignmentModal(false);
      fetchData();
      alert("Assignment created successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Creation failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // 🤖 AI GRADING FUNCTION
  const handleGradeSubmission = async (submission: any, assignmentDesc: string) => {
    setGradingId(submission.$id);
    
    try {
      const res = await fetch(`http://127.0.0.1:8001/ai/grade-submission/${submission.solutionField}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignment_desc: assignmentDesc })
      });
      
      if (!res.ok) throw new Error("Python Server Offline");
      
      const data = await res.json();
      const rawResult = data.result || "";

      let finalScore = "Graded";
      let finalFeedback = rawResult;

      if (rawResult.includes("Grade:") && rawResult.includes("Feedback:")) {
         const parts = rawResult.split("Feedback:");
         finalScore = parts[0].replace("Grade:", "").trim();
         finalFeedback = parts[1].trim();
      }

      await databases.updateDocument(DB_ID, "submissions", submission.$id, {
        aiScore: finalScore,
        aiFeedback: finalFeedback
      });

      await fetchData();
      alert(`Graded ${submission.stuidentName}'s work!`);

    } catch (err) {
      console.error(err);
      alert("Failed to grade submission. Is Python running?");
    } finally {
      setGradingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-10 font-sans relative pb-32">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-12 bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase text-blue-500">{className}</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-2">Classroom Controller</p>
        </div>
        <button onClick={() => router.push('/teacher')} className="bg-slate-950 px-8 py-3 rounded-xl text-[10px] font-black uppercase border border-slate-800 hover:text-white hover:bg-slate-900 transition-all shadow-lg">Back to Lobby</button>
      </div>

      {/* TABS SECTION */}
      <div className="flex gap-4 mb-10">
        <button onClick={() => setActiveTab("materials")} className={`flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all ${activeTab === 'materials' ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-900/30 text-white' : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:bg-slate-800'}`}>01. Course Materials</button>
        <button onClick={() => setActiveTab("assignments")} className={`flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all ${activeTab === 'assignments' ? 'bg-violet-600 border-violet-400 shadow-lg shadow-violet-900/30 text-white' : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:bg-slate-800'}`}>02. Assignments & Grading</button>
      </div>

      {/* TAB CONTENT: MATERIALS */}
      {activeTab === "materials" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials.length === 0 ? <p className="text-slate-500 font-black uppercase tracking-widest col-span-3 text-center mt-10">No materials uploaded yet.</p> : null}
          {materials.map(m => (
            <div key={m.$id} className="bg-slate-900/60 p-8 rounded-3xl border border-slate-800 flex flex-col justify-between hover:border-blue-500/30 transition-all">
              <div>
                <p className="text-[9px] font-black text-blue-500 uppercase mb-2 tracking-widest italic">Document</p>
                <h3 className="text-xl font-black uppercase mb-6 text-white">{m.topic}</h3>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB CONTENT: ASSIGNMENTS & GRADING */}
      {activeTab === "assignments" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 max-w-5xl mx-auto">
          {assignments.length === 0 ? <p className="text-slate-500 font-black uppercase tracking-widest text-center mt-10">No assignments created yet.</p> : null}
          
          {assignments.map(task => {
            const taskSubmissions = submissions.filter(sub => sub.assignmentId === task.$id);

            return (
              <div key={task.$id} className="bg-slate-900/80 p-10 rounded-[2.5rem] border border-slate-800 shadow-xl">
                <h2 className="text-3xl font-black italic uppercase mb-3 text-white">{task.title}</h2>
                <p className="text-sm text-slate-400 mb-8 leading-relaxed uppercase tracking-wide">{task.description}</p>
                
                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mb-6 pl-2">
                    Student Submissions ({taskSubmissions.length})
                  </p>

                  {taskSubmissions.length === 0 && (
                    <p className="text-xs text-slate-600 font-bold uppercase tracking-widest text-center py-4">No submissions yet.</p>
                  )}

                  <div className="space-y-4">
                    {taskSubmissions.map(sub => (
                      <div key={sub.$id} className="flex flex-col bg-slate-900/50 border border-slate-800 p-6 rounded-2xl transition-all hover:border-slate-700">
                        <div className="flex justify-between items-center">
                          <span className="font-black text-white uppercase tracking-widest text-sm">{sub.stuidentName}</span>
                          
                          <div className="flex items-center gap-6">
                            {sub.aiScore && (
                              <div className="text-right">
                                <span className="text-[9px] text-emerald-600 font-black uppercase tracking-[0.2em] block mb-1">Score</span>
                                <span className="text-emerald-400 font-black tracking-widest uppercase text-lg">{sub.aiScore}</span>
                              </div>
                            )}
                            
                            <button 
                              onClick={() => handleGradeSubmission(sub, task.description)}
                              disabled={gradingId === sub.$id}
                              className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                gradingId === sub.$id 
                                  ? 'bg-slate-800 text-slate-500 animate-pulse' 
                                  : sub.aiScore 
                                    ? 'bg-slate-800 text-white hover:bg-emerald-600 border border-slate-700' 
                                    : 'bg-white text-black hover:bg-violet-500 hover:text-white'
                              }`}
                            >
                              {gradingId === sub.$id ? "Analyzing..." : sub.aiScore ? "Re-Grade" : "AI Grade"}
                            </button>
                          </div>
                        </div>

                        {sub.aiFeedback && (
                          <div className="mt-6 bg-slate-950 border border-emerald-900/30 p-5 rounded-xl">
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-2">🤖 Llama 3 Feedback</p>
                            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">{sub.aiFeedback}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🚀 FLOATING ACTION BUTTONS (FAB) */}
      <div className="fixed bottom-10 right-10 z-40 flex flex-col gap-4">
        {activeTab === "materials" && (
          <button 
            onClick={() => setShowMaterialModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-5 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl shadow-blue-900/50 hover:scale-105 transition-all border border-blue-400/50 flex items-center gap-3 animate-in slide-in-from-bottom-8"
          >
            <span className="text-xl leading-none">+</span> Upload Material
          </button>
        )}

        {activeTab === "assignments" && (
          <button 
            onClick={() => setShowAssignmentModal(true)}
            className="bg-violet-600 hover:bg-violet-500 text-white px-8 py-5 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl shadow-violet-900/50 hover:scale-105 transition-all border border-violet-400/50 flex items-center gap-3 animate-in slide-in-from-bottom-8"
          >
            <span className="text-xl leading-none">+</span> Create Assignment
          </button>
        )}
      </div>

      {/* 📂 MODAL: UPLOAD MATERIAL */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-[#020617] border border-slate-800 p-10 rounded-[2.5rem] shadow-2xl max-w-lg w-full">
            <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-6 text-white">Upload Material</h2>
            <form onSubmit={handleUploadMaterial} className="space-y-6">
              <input 
                type="text" 
                placeholder="Topic / Title (e.g. Chapter 1 Notes)" 
                value={materialTopic}
                onChange={(e) => setMaterialTopic(e.target.value)}
                className="w-full bg-slate-900/80 p-5 rounded-2xl border border-slate-800 outline-none focus:border-blue-500 text-white font-bold text-sm"
                required
              />
              <input 
                type="file" 
                onChange={(e) => setMaterialFile(e.target.files ? e.target.files[0] : null)}
                className="w-full bg-slate-900/80 p-4 rounded-2xl border border-slate-800 text-slate-400 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                required
              />
              <div className="flex gap-4">
                <button type="submit" disabled={isUploading} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">
                  {isUploading ? "Uploading..." : "Upload"}
                </button>
                <button type="button" onClick={() => setShowMaterialModal(false)} className="px-8 bg-slate-900 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-800 hover:text-white">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📝 MODAL: CREATE ASSIGNMENT */}
      {showAssignmentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-[#020617] border border-slate-800 p-10 rounded-[2.5rem] shadow-2xl max-w-lg w-full">
            <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-6 text-white">New Assignment</h2>
            <form onSubmit={handleCreateAssignment} className="space-y-6">
              <input 
                type="text" 
                placeholder="Assignment Title" 
                value={assignmentTitle}
                onChange={(e) => setAssignmentTitle(e.target.value)}
                className="w-full bg-slate-900/80 p-5 rounded-2xl border border-slate-800 outline-none focus:border-violet-500 text-white font-bold text-sm"
                required
              />
              <textarea 
                placeholder="Instructions for the AI (e.g. Grade this strictly on grammar and provide a score out of 100)" 
                value={assignmentDesc}
                onChange={(e) => setAssignmentDesc(e.target.value)}
                rows={4}
                className="w-full bg-slate-900/80 p-5 rounded-2xl border border-slate-800 outline-none focus:border-violet-500 text-white font-bold text-sm resize-none"
                required
              />
              <div className="flex gap-4">
                <button type="submit" disabled={isUploading} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">
                  {isUploading ? "Creating..." : "Create"}
                </button>
                <button type="button" onClick={() => setShowAssignmentModal(false)} className="px-8 bg-slate-900 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-800 hover:text-white">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}