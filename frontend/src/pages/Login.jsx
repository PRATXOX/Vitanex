import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../lib/api";
import { toast } from "sonner";

const demos = [
  { role: "User", email: "user@vitanex.io", pw: "User@123" },
  { role: "Hospital", email: "hospital@vitanex.io", pw: "Hospital@123" },
  { role: "NGO", email: "ngo@vitanex.io", pw: "Ngo@123" },
  { role: "Admin", email: "admin@vitanex.io", pw: "Admin@123" },
];

const roleHome = { admin: "/admin", hospital: "/hospital", ngo: "/ngo", user: "/user" };

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome, ${u.name}`);
      navigate(roleHome[u.role] || "/");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (d) => {
    setEmail(d.email);
    setPassword(d.pw);
    setLoading(true);
    try {
      const u = await login(d.email, d.pw);
      toast.success(`Signed in as ${d.role}`);
      navigate(roleHome[u.role] || "/");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar variant="public" />
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-12 px-6 py-16 md:grid-cols-12">
        <div className="md:col-span-6">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-red-600">
            Secure access · Vitanex network
          </div>
          <h1 className="mt-3 font-display text-5xl font-bold tracking-tighter text-slate-900">
            Sign in to your portal.
          </h1>
          <p className="mt-4 max-w-md text-slate-600">
            Vitanex connects patients, hospitals, NGOs and admins onto a single emergency
            response network. Use your credentials below.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4" data-testid="login-form">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="login-email"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="login-password"
                className="mt-1"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full bg-red-600 text-base hover:bg-red-700"
              data-testid="login-submit"
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
            <div className="text-sm text-slate-500">
              New to Vitanex?{" "}
              <Link to="/register" className="font-semibold text-red-600 hover:underline">
                Create an account
              </Link>
            </div>
          </form>
        </div>

        <div className="md:col-span-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
              Demo accounts · one-click
            </div>
            <h3 className="mt-2 font-display text-2xl font-semibold text-slate-900">
              Explore every portal instantly.
            </h3>
            <div className="mt-5 space-y-3">
              {demos.map((d) => (
                <button
                  key={d.role}
                  onClick={() => quickLogin(d)}
                  disabled={loading}
                  data-testid={`demo-login-${d.role.toLowerCase()}`}
                  className="flex w-full items-center justify-between border border-slate-200 bg-white px-5 py-4 text-left transition hover:border-red-400 hover:shadow-sm"
                >
                  <div>
                    <div className="font-display text-base font-semibold text-slate-900">
                      {d.role} Portal
                    </div>
                    <div className="font-mono text-xs text-slate-500">{d.email}</div>
                  </div>
                  <div className="font-mono text-xs text-slate-400">→</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
