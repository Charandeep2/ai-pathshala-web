import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-sans flex items-center justify-center">
      
      <div className="bg-slate-900/50 p-12 md:p-16 rounded-[2.5rem] border border-slate-800 shadow-2xl text-center max-w-2xl w-full animate-in fade-in zoom-in-95 duration-500">
        
        <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase mb-4">
          <span className="text-white">AI-</span><span className="text-blue-500">PATHSHALA</span>
        </h1>
        
        <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-[0.4em] mb-12">
          Neural Learning Environment
        </p>

        <div className="bg-slate-950/80 p-8 md:p-10 rounded-[2rem] border border-slate-800">
          
          <p className="text-[11px] md:text-xs text-slate-400 leading-relaxed mb-10 uppercase font-bold tracking-[0.2em]">
            Welcome to the next generation of smart studying, seamless grading, and AI-powered insights.
          </p>
          
          {/* 🔥 THE FIX: Pointing this to /auth instead of /login */}
          <Link 
            href="/auth" 
            className="inline-block w-full bg-blue-600 hover:bg-blue-500 text-white px-10 py-5 rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-[0.3em] transition-all shadow-lg shadow-blue-900/30"
          >
            Get Started
          </Link>
          
        </div>
      </div>
      
    </div>
  );
}