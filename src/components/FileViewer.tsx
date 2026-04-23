"use client";

import { useState } from "react";

interface FileViewerProps {
  agentId: string;
  files: Record<string, boolean | undefined>;
}

export function FileViewer({ agentId, files }: FileViewerProps) {
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFile = async (fileName: string) => {
    if (activeFile === fileName) {
      setActiveFile(null);
      return;
    }
    
    setLoading(true);
    setError(null);
    setActiveFile(fileName);

    try {
      const res = await fetch(`/api/v1/agents/${agentId}/files?name=${encodeURIComponent(fileName)}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to load file");
        setContent("");
      } else {
        const data = await res.json();
        setContent(data.content || "");
      }
    } catch {
      setError("Failed to fetch file");
      setContent("");
    } finally {
      setLoading(false);
    }
  };

  const fileList = Object.entries(files || {}).filter(([, exists]) => exists);

  if (fileList.length === 0) {
    return <div className="text-sm text-gray-500">No workspace files synced</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {fileList.map(([name]) => (
          <button
            key={name}
            onClick={() => loadFile(name + ".md")}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeFile === name + ".md"
                ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30"
                : "bg-green/10 text-green hover:bg-green/20"
            }`}
          >
            {name.toUpperCase()}.md
          </button>
        ))}
      </div>

      {activeFile && (
        <div className="mt-3 rounded-xl bg-[#0d1117] border border-white/10 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
            <span className="text-xs text-gray-300 font-mono">{activeFile}</span>
            <button
              onClick={() => setActiveFile(null)}
              className="text-xs text-gray-400 hover:text-white"
            >
              ✕ Close
            </button>
          </div>
          <div className="p-4 max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="text-sm text-gray-400 animate-pulse">Loading...</div>
            ) : error ? (
              <div className="text-sm text-red">{error}</div>
            ) : (
              <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words leading-relaxed">
                {content || "Empty file"}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
