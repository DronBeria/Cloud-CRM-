"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function ClientError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 mb-4">
        <AlertTriangle className="h-6 w-6 text-red-600" />
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h2>
      <p className="text-sm text-gray-500 mb-4">
        We couldn't load this page. Try refreshing or go back to the dashboard.
      </p>
      {error.digest && (
        <p className="text-xs text-gray-400 font-mono mb-4">Ref: {error.digest}</p>
      )}
      <div className="flex gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard"><Home className="mr-1.5 h-3.5 w-3.5" />Dashboard</Link>
        </Button>
        <Button size="sm" onClick={reset} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />Try Again
        </Button>
      </div>
    </div>
  );
}
