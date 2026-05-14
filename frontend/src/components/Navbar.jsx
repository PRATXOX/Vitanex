import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";

const dashLink = (role) => {
  if (role === "admin") return "/admin";
  if (role === "hospital") return "/hospital";
  if (role === "ngo") return "/ngo";
  return "/user";
};

export default function Navbar({ variant = "public" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2" data-testid="brand-link">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-600 text-white">
            <Activity className="h-4 w-4" strokeWidth={3} />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">Vitanex</span>
          <span className="hidden rounded-sm bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600 md:inline">
            Emergency Health
          </span>
        </Link>

        {variant === "public" && (
          <nav className="hidden items-center gap-7 text-sm text-slate-700 md:flex">
            <a href="#problem" className="hover:text-slate-900">The Problem</a>
            <a href="#how" className="hover:text-slate-900">How it Works</a>
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#portals" className="hover:text-slate-900">Portals</a>
          </nav>
        )}

        <div className="flex items-center gap-2">
          {!user ? (
            <>
              <Button variant="ghost" asChild data-testid="nav-login-btn">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button className="bg-red-600 hover:bg-red-700" asChild data-testid="nav-register-btn">
                <Link to="/register">Get protected</Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" asChild data-testid="nav-dashboard-btn">
                <Link to={dashLink(user.role)}>
                  <span className="font-mono text-xs uppercase">{user.role}</span>
                  <span className="ml-2">Portal</span>
                </Link>
              </Button>
              <Button variant="ghost" onClick={onLogout} data-testid="nav-logout-btn">
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
