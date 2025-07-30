import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HttpClient } from "@/lib/httpClient";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Tracking from "./pages/Tracking";
import TeamManagement from "./pages/TeamManagement";
import DataManagement from "./pages/DataManagement";
import NotFound from "./pages/NotFound";

// Initialize HttpClient
HttpClient.init();

// Global error handler for unhandled AbortErrors and FullStory fetch errors
window.addEventListener("unhandledrejection", (event) => {
  if (event.reason?.name === "AbortError") {
    console.warn("Caught unhandled AbortError:", event.reason.message);
    event.preventDefault();
  }

  // Handle FullStory fetch interference
  if (
    event.reason instanceof TypeError &&
    (event.reason.message.includes("fetch") ||
      event.reason.message.includes("Failed to fetch"))
  ) {
    console.warn("Caught FullStory fetch interference:", event.reason.message);
    // Force HttpClient to use XHR mode
    HttpClient.forceXHRMode();
    event.preventDefault();
  }
});

// Additional check for FullStory interference
if (typeof window !== "undefined") {
  // Check if FullStory has modified fetch
  const originalFetch = window.fetch.toString();
  if (
    originalFetch.includes("eval") ||
    originalFetch.includes("fullstory") ||
    originalFetch.length < 50 ||
    (window as any).FS
  ) {
    console.warn(
      "FullStory detected on page load - HttpClient will use XMLHttpRequest on fetch failures",
    );
    // Don't force XHR mode immediately, let fetch fail first
    // HttpClient.forceXHRMode();
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tracking/:employeeId" element={<Tracking />} />
          <Route path="/team-management" element={<TeamManagement />} />
          <Route path="/data-management" element={<DataManagement />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
