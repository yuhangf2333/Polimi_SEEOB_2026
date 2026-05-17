"use client";

import * as React from "react";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

const ERROR_STORAGE_KEY = "limen:last-dashboard-runtime-error";
const ERROR_RELOAD_KEY = "limen:dashboard-error-reload";

function isRecoverableChunkError(error: Error) {
  const text = `${error.name} ${error.message} ${error.stack ?? ""}`;

  return /ChunkLoadError|Loading chunk|CSS_CHUNK_LOAD_FAILED|dynamically imported module|module script failed|Failed to fetch/i.test(
    text,
  );
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  React.useEffect(() => {
    const detail = {
      at: new Date().toISOString(),
      digest: error.digest ?? null,
      message: error.message,
      name: error.name,
      path: window.location.pathname,
      reason: "dashboard-error-boundary",
      stack: error.stack ?? null,
    };

    console.error("[LIMEN dashboard error]", detail);

    try {
      window.localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(detail));
    } catch {
      // Error logging is best-effort; the recovery UI must still render.
    }

    if (!isRecoverableChunkError(error)) return;

    try {
      if (window.sessionStorage.getItem(ERROR_RELOAD_KEY)) return;
      window.sessionStorage.setItem(ERROR_RELOAD_KEY, "1");
      window.location.reload();
    } catch {
      // Fall through to the manual recovery controls.
    }
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-white px-6 text-neutral-950">
      <section className="w-full max-w-md space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            LIMEN dashboard
          </p>
          <h1 className="text-2xl font-semibold">Dashboard failed to load</h1>
          <p className="text-sm leading-6 text-neutral-600">
            The error was recorded in browser storage as{" "}
            <code>{ERROR_STORAGE_KEY}</code>. Reload the dashboard after the
            current build finishes.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-medium text-white"
            type="button"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
          <button
            className="rounded-md border border-neutral-200 px-4 py-2 text-sm font-medium"
            type="button"
            onClick={() => reset()}
          >
            Try again
          </button>
        </div>
      </section>
    </main>
  );
}
