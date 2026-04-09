"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { databases, storage, ID, Query } from "@/lib/appwrite";

export default function StudentClassroomPage() {
  const { classId } = useParams();
  const router = useRouter();
  
  // Base Data
  const [className, setClassName] = useState("Loading...");
  const [studentName, setStudentName] = useState("");
  const [materials, setMaterials] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [mySubmissions, setMySubmissions] = useState<Record<string, any>>({});
  
  // Standard UI States
  const [activeTab, setActiveTab] = useState<"materials" | "assignments">("materials");
  const [solutionFile, setSolutionFile] = useState<File | null>(null);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 🚀 AI STUDY ROOM STATES
  const [studyMaterial, setStudyMaterial] = useState<any | null>(null);
  const [viewerUrl, setViewerUrl] = useState(""); // <-- ADDED THIS BACK FROM YOUR CODE
  const [studyTab, setStudyTab] = useState<"chat" | "quiz">("chat");
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState<{role: string, text: string}[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);

  const DB_ID = "69cdad52000c69263839";
  const BUCKET_ID = "69cdaa6f002c333f4450";

  useEffect(() => {
    if (classId) fetchData();
  }, [classId]);

  const fetchData = async () => {
    try {
      const classData = await databases.getDocument(DB_ID, "classrooms", classId as string);
      setClassName(classData.className);

      const name = localStorage.getItem("studentName") || "Student";
      setStudentName(name);

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
        Query.equal("stuidentName", name) 
      ]);
      
      const subMap: Record<string, any> = {};
      subs.documents.forEach(s => { subMap[s.assignmentId] = s; });
      setMySubmissions(subMap);

    } catch (err) { console.error(err); }
  };

  const handleUpload = async () => {
    if (!solutionFile || !activeAssignmentId) return alert("Select a file bro!");
    setIsUploading(true);
    try {
      const uploadedFile = await storage.createFile(BUCKET_ID, ID.unique(), solutionFile);
      
      await databases.createDocument(DB_ID, "submissions", ID.unique(), {
        assignmentId: activeAssignmentId,
        stuidentName: studentName,
        solutionField: uploadedFile.$id,
        classId: classId as string
      });
      
      setSolutionFile(null); setActiveAssignmentId(null);
      fetchData(); 
    } catch (err: any) { alert("Upload failed: " + err.message); }
    finally { setIsUploading(false); }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !studyMaterial) return;
    
    const userMsg = chatInput;
    setChatLog(prev => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    setIsAiThinking(true);

    try {
      const res = await fetch(`http://127.0.0.1:8001/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: studyMaterial.fileId, message: userMsg }) 
      });
      const data = await res.json();
      
      setChatLog(prev => [...prev, { role: "ai", text: data.reply || "I analyzed the document, bro. What's next?" }]);
    } catch (err) {
      setChatLog(prev => [...prev, { role: "ai", text: "Python backend is offline! Start it up on port 8001 bro." }]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleGenerateQuiz = async () => {
    setIsAiThinking(true);
    setChatLog([{ role: "ai", text: "Generating a custom mock quiz based on this document... give me a few seconds!" }]);
    setStudyTab("chat"); 
    
    try {
      const res = await fetch(`http://127.0.0.1:8001/ai/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: studyMaterial.fileId }) 
      });
      const data = await res.json();
      setChatLog([{ role: "ai", text: data.quiz || "Question 1: What is the main topic of this document?\n\nA) Data\nB) Science\nC) Magic" }]);
    } catch (err) {
      setChatLog([{ role: "ai", text: "Python backend is offline! Start it up to generate quizzes." }]);
    } finally {
      setIsAiThinking(false);
    }
  };


  // 📖 ==========================================
  // RENDER: THE FULL-SCREEN AI STUDY ROOM
  // ==========================================
  if (studyMaterial) {
    return (
      <div className="h-screen w-screen bg-[#020617] text-white flex flex-col font-sans overflow-hidden">
        
        {/* TOP NAVBAR */}
        <div className="h-20 bg-slate-950 border-b border-slate-800 flex justify-between items-center px-8 shrink-0">
          <div>
            <h1 className="text-xl font-black italic uppercase text-emerald-500">{studyMaterial.topic}</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">AI Study Room Active</p>
          </div>
          <button 
            onClick={() => { 
              setStudyMaterial(null); 
              setChatLog([]); 
              setViewerUrl(""); 
            }} 
            className="bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-red-900/50 transition-all"
          >
            Exit Study Room
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT: DOCUMENT VIEWER */}
          <div className="w-[65%] h-full bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-3">
            
            <div className="flex justify-between items-center px-2 shrink-0">
               <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Document Viewer</p>
            </div>

            <div className="w-full flex-1 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              {/* Using your exact iframe setup from the reference code */}
              <iframe src={viewerUrl} className="w-full h-full border-0" />
            </div>
            
          </div>

          {/* RIGHT: AI COPILOT */}
          <div className="w-[35%] h-full flex flex-col bg-[#020617]">
            <div className="flex p-4 gap-2 border-b border-slate-800 shrink-0">
              <button onClick={() => setStudyTab("chat")} className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${studyTab === 'chat' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-500 hover:bg-slate-800'}`}>Document Chat</button>
              <button onClick={() => setStudyTab("quiz")} className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${studyTab === 'quiz' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-500 hover:bg-slate-800'}`}>Mock Quiz</button>
            </div>

            {studyTab === "chat" && (
              <div className="flex-1 flex flex-col overflow-hidden relative">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {chatLog.length === 0 && (
                    <div className="text-center mt-20 opacity-50">
                      <div className="text-4xl mb-4">🤖</div>
                      <p className="text-xs font-black uppercase tracking-widest text-emerald-500">Document AI Initialized</p>
                      <p className="text-[10px] text-slate-400 mt-2">Ask me anything about the content on the left.</p>
                    </div>
                  )}
                  {chatLog.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{msg.role === 'user' ? studentName : 'Neural Engine'}</p>
                      <div className={`p-4 rounded-2xl text-sm max-w-[85%] ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-300 rounded-bl-none whitespace-pre-wrap'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isAiThinking && (
                    <div className="flex items-start">
                      <div className="p-4 bg-slate-900 rounded-2xl rounded-bl-none text-xs text-slate-500 font-black tracking-widest animate-pulse border border-slate-800">
                        Analyzing...
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0">
                  <div className="flex gap-2">
                    <input 
                      value={chatInput} 
                      onChange={e => setChatInput(e.target.value)} 
                      onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Ask a question..." 
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-emerald-500 transition-all"
                    />
                    <button onClick={handleSendMessage} disabled={isAiThinking} className="bg-emerald-600 hover:bg-emerald-500 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">Send</button>
                  </div>
                </div>
              </div>
            )}

            {studyTab === "quiz" && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-900/20">
                <div className="text-5xl mb-6">📝</div>
                <h2 className="text-xl font-black uppercase text-purple-400 mb-4">Generate Mock Quiz</h2>
                <p className="text-xs text-slate-400 leading-relaxed mb-8">Click the button below to have the AI scan this document and generate a practice quiz.</p>
                <button onClick={handleGenerateQuiz} disabled={isAiThinking} className="bg-purple-600 hover:bg-purple-500 w-full py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-purple-900/40 transition-all">
                  {isAiThinking ? "Scanning Document..." : "Generate Test"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }


  // 🏠 ==========================================
  // RENDER: THE STANDARD DASHBOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-[#020617] text-white p-10 font-sans">
      
      <div className="flex justify-between items-center mb-12 bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase text-emerald-500">{className}</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-2">Student Dashboard: {studentName}</p>
        </div>
        <button onClick={() => router.push('/student')} className="bg-slate-950 px-8 py-3 rounded-xl text-[10px] font-black uppercase border border-slate-800 hover:text-white transition-all shadow-lg">Back to Lobby</button>
      </div>

      <div className="flex gap-4 mb-10">
        <button onClick={() => setActiveTab("materials")} className={`flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all ${activeTab === 'materials' ? 'bg-emerald-600 border-emerald-400 shadow-lg shadow-emerald-900/30' : 'bg-slate-900/40 border-slate-800 text-slate-500'}`}>01. Lecture Materials</button>
        <button onClick={() => setActiveTab("assignments")} className={`flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all ${activeTab === 'assignments' ? 'bg-teal-600 border-teal-400 shadow-lg shadow-teal-900/30' : 'bg-slate-900/40 border-slate-800 text-slate-500'}`}>02. My Assignments</button>
      </div>

      {activeTab === "materials" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials.length === 0 ? <p className="text-slate-500 font-black uppercase tracking-widest col-span-3 text-center mt-10">No materials posted yet.</p> : null}
          {materials.map(m => (
            <div key={m.$id} className="bg-slate-900/60 p-8 rounded-3xl border border-slate-800 flex flex-col justify-between">
              <div>
                <p className="text-[9px] font-black text-emerald-500 uppercase mb-2 tracking-widest italic">Lecture Content</p>
                <h3 className="text-xl font-black uppercase mb-6">{m.topic}</h3>
              </div>
              
              {/* 🔥 THE FIX: Generates URL and state EXACTLY like your reference code when clicked */}
              <button 
                onClick={() => {
                  setStudyMaterial(m);
                  const rawUrl = storage.getFileView(BUCKET_ID, m.fileId).toString();
                  setViewerUrl(`https://docs.google.com/gview?url=${encodeURIComponent(rawUrl)}&embedded=true`);
                  
                  // Optional: Ping your Python backend to process the file when opened, just like your old code
                  fetch(`http://127.0.0.1:8001/ai/process-intelligence/${m.fileId}`).catch(() => {});
                }} 
                className="w-full bg-slate-950 py-4 rounded-xl border border-emerald-900 text-[10px] font-black uppercase text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all shadow-lg shadow-emerald-900/20"
              >
                Enter AI Study Room
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === "assignments" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 max-w-4xl mx-auto">
          {assignments.length === 0 ? <p className="text-slate-500 font-black uppercase tracking-widest text-center mt-10">No active tasks from the professor.</p> : null}
          
          {assignments.map(task => {
            const mySub = mySubmissions[task.$id];

            return (
              <div key={task.$id} className="bg-slate-900/80 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl">
                <h2 className="text-2xl font-black italic uppercase mb-2 text-white">{task.title}</h2>
                <p className="text-sm text-slate-400 mb-8 leading-relaxed">{task.description}</p>

                {!mySub && activeAssignmentId !== task.$id && (
                  <button onClick={() => setActiveAssignmentId(task.$id)} className="w-full bg-emerald-600 py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-900/30 hover:bg-emerald-500">
                    Submit Work
                  </button>
                )}

                {activeAssignmentId === task.$id && !mySub && (
                  <div className="bg-slate-950 p-6 rounded-2xl border border-emerald-500/50 border-dashed">
                     <input type="file" onChange={e => setSolutionFile(e.target.files?.[0] || null)} className="w-full text-xs text-slate-500 file:bg-emerald-600 file:text-white file:border-0 file:py-2 file:px-4 file:rounded-full file:mr-4 cursor-pointer mb-4" />
                     <div className="flex gap-4">
                       <button onClick={handleUpload} disabled={isUploading} className="flex-1 bg-emerald-600 py-3 rounded-lg font-black uppercase text-[10px]">{isUploading ? "Uploading..." : "Confirm Upload"}</button>
                       <button onClick={() => setActiveAssignmentId(null)} className="px-6 py-3 bg-slate-800 rounded-lg font-black uppercase text-[10px] text-slate-400">Cancel</button>
                     </div>
                  </div>
                )}

                {mySub && !mySub.aiScore && (
                  <div className="bg-amber-900/20 border border-amber-500/30 p-6 rounded-2xl text-center">
                    <p className="text-amber-500 font-black uppercase tracking-widest text-xs">Submission Received! Awaiting Grading...</p>
                  </div>
                )}

                {mySub && mySub.aiScore && (
                  <div className="bg-emerald-950/30 border border-emerald-500/30 p-6 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600 mb-2">Final Score</p>
                    <h1 className="text-4xl font-black text-emerald-400 mb-4 tracking-tighter">{mySub.aiScore}</h1>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">AI Feedback</p>
                    <p className="text-xs text-slate-300 leading-relaxed">{mySub.aiFeedback}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}