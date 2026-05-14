import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../lib/api";
import { toast } from "sonner";

const roleHome = { admin: "/admin", hospital: "/hospital", ngo: "/ngo", user: "/user" };

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    phone: "",
    organization: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (k) => (v) => setForm((p) => ({ ...p, [k]: typeof v === "string" ? v : v.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await register(form);
      toast.success(`Welcome to Vitanex, ${u.name}`);
      navigate(roleHome[u.role] || "/");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const needsOrg = form.role === "hospital" || form.role === "ngo";

  return (
    <div className="min-h-screen bg-white">
      <Navbar variant="public" />
      <div className="mx-auto max-w-[900px] px-6 py-16">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-red-600">
          Join the Vitanex network
        </div>
        <h1 className="mt-3 font-display text-5xl font-bold tracking-tighter text-slate-900">
          Create your account.
        </h1>
        <p className="mt-3 max-w-xl text-slate-600">
          Sign up as a patient, hospital, or NGO. Hospitals and NGOs will be verified by admin before going live.
        </p>

        <form onSubmit={submit} className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2" data-testid="register-form">
          <div className="md:col-span-2">
            <Label>I am a…</Label>
            <Select value={form.role} onValueChange={update("role")}>
              <SelectTrigger className="mt-1" data-testid="register-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Individual user (patient)</SelectItem>
                <SelectItem value="hospital">Hospital / Clinic</SelectItem>
                <SelectItem value="ngo">NGO / Rapid responder</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="name">Full name{needsOrg ? " of contact" : ""}</Label>
            <Input id="name" required value={form.name} onChange={update("name")} className="mt-1" data-testid="register-name" />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={form.email} onChange={update("email")} className="mt-1" data-testid="register-email" />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={form.password} onChange={update("password")} className="mt-1" data-testid="register-password" />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} onChange={update("phone")} className="mt-1" data-testid="register-phone" />
          </div>

          {needsOrg && (
            <>
              <div className="md:col-span-2">
                <Label htmlFor="organization">Organization name</Label>
                <Input id="organization" required value={form.organization} onChange={update("organization")} className="mt-1" data-testid="register-org" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Address / City</Label>
                <Input id="address" value={form.address} onChange={update("address")} className="mt-1" data-testid="register-address" />
              </div>
            </>
          )}

          <div className="md:col-span-2">
            <Button type="submit" disabled={loading} className="h-11 w-full bg-red-600 text-base hover:bg-red-700" data-testid="register-submit">
              {loading ? "Creating account…" : "Create account"}
            </Button>
            <div className="mt-3 text-sm text-slate-500">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-red-600 hover:underline">Sign in</Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
