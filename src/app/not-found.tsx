import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0f111a] text-white flex flex-col items-center justify-center text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mb-6 text-2xl">
        🔍
      </div>
      <h1 className="text-6xl font-extrabold text-white/10 mb-2">404</h1>
      <h2 className="text-2xl font-bold mb-3">Page not found</h2>
      <p className="text-white/40 mb-8 max-w-sm">
        This page does not exist or was moved. Head back to the dashboard.
      </p>
      <Link
        href="/dashboard"
        className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 font-medium transition"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
