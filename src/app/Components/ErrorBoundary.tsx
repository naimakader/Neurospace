"use client";
import React from "react";

type State = { hasError: boolean; message?: string };

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", err, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="p-6 text-red-400 bg-red-500/10 rounded-xl border border-red-500/20">
            <p className="font-medium">Something went wrong.</p>
            {this.state.message && (
              <p className="text-sm text-red-300/70 mt-1">
                {this.state.message}
              </p>
            )}
          </div>
        )
      );
    }
    return this.props.children;
  }
}
