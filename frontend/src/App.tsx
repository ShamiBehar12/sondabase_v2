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
import DocumentExplorer from "./pages/DocumentExplorer";
import AdminConversations from "./pages/AdminConversations";
import Biblioteca from "./pages/Biblioteca";
import SmartCitiesChat from "./pages/SmartCitiesChat";
import SmartCitiesIngest from "./pages/SmartCitiesIngest";
import Analytics from "./pages/Analytics";
import AdminDocPermissions from "./pages/AdminDocPermissions";
import { useAnalytics } from "./hooks/useAnalytics";

const queryClient = new QueryClient();

function AnalyticsTracker() {
  useAnalytics();
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AnalyticsTracker />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <AIChatProvider>
                <SidebarProvider>
                  <div className="min-h-screen flex w-full relative" style={{ background: 'hsl(222,32%,6%)' }}>
                    {/* ambient city background for all inner pages */}
                    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
                      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/smart-city-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.09, filter: 'blur(6px) saturate(0.4)' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(8,12,28,0.88) 0%, rgba(10,15,35,0.84) 50%, rgba(8,12,28,0.90) 100%)' }} />
                      {/* glow orbs */}
                      <div style={{ position: 'absolute', top: '-10%', left: '-8%', width: '50%', height: '50%', background: 'radial-gradient(ellipse, rgba(59,130,246,0.10) 0%, transparent 65%)', filter: 'blur(80px)' }} />
                      <div style={{ position: 'absolute', bottom: '-12%', right: '-10%', width: '55%', height: '55%', background: 'radial-gradient(ellipse, rgba(139,92,246,0.09) 0%, transparent 65%)', filter: 'blur(90px)' }} />
                      <div style={{ position: 'absolute', top: '40%', right: '20%', width: '30%', height: '30%', background: 'radial-gradient(ellipse, rgba(6,182,212,0.06) 0%, transparent 65%)', filter: 'blur(60px)' }} />
                      {/* subtle grid */}
                      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.010) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.010) 1px, transparent 1px)', backgroundSize: '52px 52px' }} />
                    </div>
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
                          <Route path="/documents" element={<DocumentExplorer />} />
                          <Route path="/admin/conversations" element={
                            <ProtectedRoute requireRole="admin">
                              <AdminConversations />
                            </ProtectedRoute>
                          } />
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
                          <Route path="/analytics" element={
                            <ProtectedRoute requireRole="admin">
                              <Analytics />
                            </ProtectedRoute>
                          } />
                          <Route path="/biblioteca" element={
                            <ProtectedRoute requireRole="admin">
                              <Biblioteca />
                            </ProtectedRoute>
                          } />
                          <Route path="/admin/doc-permissions" element={
                            <ProtectedRoute requireRole="admin">
                              <AdminDocPermissions />
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
