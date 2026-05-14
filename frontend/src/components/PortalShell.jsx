import React from "react";
import Navbar from "./Navbar";
import { useAuth } from "../context/AuthContext";

const roleAccent = {
  user: { label: "USER PORTAL", color: "bg-red-600" },
  hospital: { label: "HOSPITAL PORTAL", color: "bg-blue-600" },
  ngo: { label: "NGO PORTAL", color: "bg-emerald-600" },
  admin: { label: "ADMIN PORTAL", color: "bg-slate-900" },
};

export default function PortalShell({ title, subtitle, children, actions }) {
  const { user } = useAuth();
  const acc = roleAccent[user?.role] || roleAccent.user;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar variant="portal" />
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${acc.color}`} />
              <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {acc.label}
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              {title}
            </h1>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}
