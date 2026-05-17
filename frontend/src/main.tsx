import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./features/auth/auth-context";
import { LanguageProvider } from "./features/preferences/language-context";
import { ThemeProvider } from "./features/preferences/theme-context";
import { queryClient } from "./lib/react-query";
import { router } from "./lib/router";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            <Toaster richColors closeButton position="bottom-right" />
          </QueryClientProvider>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  </React.StrictMode>
);
