"use client";
import Link from "next/link";

export default function AuthError() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
      <div className="bg-[#111827] border border-red-900/50 rounded-2xl p-10 max-w-sm w-full text-center shadow-2xl">
        <div className="text-4xl mb-4">⛔</div>
        <h1 className="text-xl font-semibold text-red-400 mb-2">Access Denied</h1>
        <p className="text-gray-400 text-sm mb-6">Your account is not authorized to access this dashboard.</p>
        <Link href="/auth/signin" className="text-indigo-400 hover:text-indigo-300 text-sm">Try a different account →</Link>
      </div>
    </div>
  );
}
