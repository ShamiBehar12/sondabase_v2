import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { AuthProvider } from "@/contexts/AuthContext";
import { AIChatProvider } from "@/contexts/AIChatContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import SuccessStories from "./pages/SuccessStories";
import Certificates from "./pages/Certificates";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import MySuccessStories from "./pages/MySuccessStories";

import ProfessionalCertificates from "./pages/ProfessionalCertificates";
import CertificateApproval from "./pages/CertificateApproval";
import SuccessStoryApproval from "./pages/SuccessStoryApproval";
import ContentManagement from "./pages/ContentManagement";
import MyCertificates from "./pages/MyCertificates";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { CleanupCertificates } from "./pages/CleanupCertificates";
import AIAdmin from "./pages/AIAdmin";
import AIChat from "./pages/AIChat";
import SmartCitiesChat from "./pages/SmartCitiesChat";
import SmartCitiesIngest from "./pages/SmartCitiesIngest";
import AdminConversations from "./pages/AdminConversations";
import DocumentExplorer from "./pages/DocumentExplorer";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <AIChatProvider>
                <SidebarProvider>
                  <div className="min-h-screen flex w-full">
                    <AppSidebar />
                    <div className="flex-1">
                      <AppHeader />
                      <main>
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/success-stories" element={<SuccessStories />} />
                          <Route path="/certificates" element={<Certificates />} />
                          <Route path="/professional-certificates" element={<ProfessionalCertificates />} />
                           <Route path="/certificate-approval" element={
                             <ProtectedRoute requireRole={['admin', 'reviewer']}>
                               <CertificateApproval />
                             </ProtectedRoute>
                            } />
                           <Route path="/success-story-approval" element={
                             <ProtectedRoute requireRole={['admin', 'reviewer']}>
                               <SuccessStoryApproval />
                             </ProtectedRoute>
                            } />
                          <Route path="/documents" element={<DocumentExplorer />} />
                          <Route path="/admin/conversations" element={
                            <ProtectedRoute requireRole="admin">
                              <AdminConversations />
                            </ProtectedRoute>
                          } />
        <Route path="/content-management" element={<ContentManagement />} />
        <Route path="/my-certificates" element={<MyCertificates />} />
        <Route path="/my-success-stories" element={<MySuccessStories />} />
                          <Route path="/ai-chat" element={<AIChat />} />
                          <Route path="/smart-cities" element={<SmartCitiesChat />} />
                          <Route path="/smart-cities/ingest" element={<SmartCitiesIngest />} />
                          <Route path="/users" element={
                            <ProtectedRoute requireRole="admin">
                              <Users />
                            </ProtectedRoute>
                          } />
                          <Route path="/ai-admin" element={
                            <ProtectedRoute requireRole="admin">
                              <AIAdmin />
                            </ProtectedRoute>
                          } />
                          <Route path="/cleanup-certificates" element={
                            <ProtectedRoute requireRole="admin">
                              <CleanupCertificates />
                            </ProtectedRoute>
                          } />
                          <Route path="/settings" element={<Settings />} />
                          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </main>
                    </div>
                  </div>
                </SidebarProvider>
                </AIChatProvider>
              </ProtectedRoute>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
