"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 mb-4">
        <AlertTriangle className="h-6 w-6 text-red-600" />
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h2>
      <p className="text-sm text-gray-500 mb-1">
        This section failed to load. The error has been reported automatically.
      </p>
      {error.digest && (
        <p className="text-xs text-gray-400 font-mono mb-4">ID: {error.digest}</p>
      )}
      <div className="flex gap-3 mt-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" />Dashboard</Link>
        </Button>
        <Button size="sm" onClick={reset} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />Retry
        </Button>
      </div>
    </div>
  );
}
