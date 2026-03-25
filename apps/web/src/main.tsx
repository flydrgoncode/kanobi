import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";
import { TenantSelectionProvider } from "./context/tenant-selection";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TenantSelectionProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </TenantSelectionProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
