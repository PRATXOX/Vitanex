import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import Landing from "./pages/Landing"; // Apni purani landing page file ka sahi path daal dena
import { Navigate } from "react-router-dom"; // Agar imported nahi hai toh
import Register from "./pages/Register";
import UserDashboard from "./pages/user/UserDashboard";
import ResponderDashboard from "./pages/responder/ResponderDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";

function RootRedirect() {
  const { user, loading } = useAuth();
  
  if (loading) return null;

  // 🕵️‍♂️ SECRET CHECK: Kya ye Vitanex ki Android App me khul raha hai?
  const isAndroidApp = navigator.userAgent.includes("VitanexAndroidApp");

  if (!user) {
    // Agar Android App hai toh Onboarding Slider dikhao, warna normal website Landing page dikhao
    return isAndroidApp ? <Onboarding /> : <Landing />;
  }
  
  // Agar login ho chuka hai, toh direct dashboard par bhejo
  const map = { admin: "/admin", hospital: "/hospital", ngo: "/ngo", user: "/user" };
  return <Navigate to={map[user.role] || "/user"} replace />;
}
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster richColors position="top-right" />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/user/*" element={
            <ProtectedRoute roles={["user"]}>
              <UserDashboard />
            </ProtectedRoute>
          } />
          <Route path="/hospital/*" element={
            <ProtectedRoute roles={["hospital"]}>
              <ResponderDashboard role="hospital" />
            </ProtectedRoute>
          } />
          <Route path="/ngo/*" element={
            <ProtectedRoute roles={["ngo"]}>
              <ResponderDashboard role="ngo" />
            </ProtectedRoute>
          } />
          <Route path="/admin/*" element={
            <ProtectedRoute roles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
