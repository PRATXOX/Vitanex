import React, { useEffect, useState } from "react";
import PortalShell from "../../components/PortalShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  AlertTriangle,
  Heart,
  Activity,
  Droplets,
  Trash2,
  PlusCircle,
  MapPin,
  FileHeart,
  PhoneCall,
  Clock,
} from "lucide-react";
import { api, formatApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import LeafletMap from "../../components/LeafletMap";

const STATUS_CLR = {
  pending: "bg-red-100 text-red-700 border-red-200",
  accepted: "bg-amber-100 text-amber-700 border-amber-200",
  dispatched: "bg-blue-100 text-blue-700 border-blue-200",
  resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  false_alarm: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function UserDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("dashboard");
  const [profile, setProfile] = useState({});
  const [contacts, setContacts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [vitals, setVitals] = useState({ hr: 78, spo2: 98 });
  const [location, setLocation] = useState({ lat: 12.9716, lng: 77.5946, address: "Bengaluru, Karnataka" });
  const [countdown, setCountdown] = useState(null);
  const [newContact, setNewContact] = useState({ name: "", relation: "", phone: "", email: "" });

  // simulate vitals
  useEffect(() => {
    const t = setInterval(() => {
      setVitals({
        hr: 70 + Math.round(Math.random() * 12),
        spo2: 96 + Math.round(Math.random() * 3),
      });
    }, 2500);
    return () => clearInterval(t);
  }, []);

  // try geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation((l) => ({ ...l, lat: pos.coords.latitude, lng: pos.coords.longitude })),
        () => {},
        { timeout: 5000 }
      );
    }
  }, []);

  const load = async () => {
    try {
      const [p, c, a] = await Promise.all([
        api.get("/me/profile"),
        api.get("/me/contacts"),
        api.get("/alerts"),
      ]);
      setProfile(p.data || {});
      setContacts(c.data || []);
      setAlerts(a.data || []);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };
  useEffect(() => { load(); }, []);

  // countdown SOS
  useEffect(() => {
    if (countdown == null) return;
    if (countdown <= 0) {
      triggerAlert("manual");
      setCountdown(null);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]); // eslint-disable-line

  const triggerAlert = async (kind) => {
    try {
      const { data } = await api.post("/alerts", {
        kind,
        lat: location.lat,
        lng: location.lng,
        address: location.address,
        heart_rate: vitals.hr,
        spo2: vitals.spo2,
        g_force: kind === "accident" ? 8.2 + Math.random() * 2 : null,
        note: kind === "accident" ? "Simulated crash detection" : "Manual SOS triggered",
      });
      toast.success("Alert broadcast to hospitals, NGOs and admin");
      setAlerts((prev) => [data, ...prev]);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const saveProfile = async (e) => {
    e?.preventDefault();
    try {
      const { data } = await api.put("/me/profile", profile);
      setProfile(data);
      toast.success("Medical ID saved");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const addContact = async (e) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) return toast.error("Name and phone required");
    try {
      const payload = { ...newContact };
      if (!payload.email) delete payload.email;
      const { data } = await api.post("/me/contacts", payload);
      setContacts((p) => [...p, data]);
      setNewContact({ name: "", relation: "", phone: "", email: "" });
      toast.success("Contact added");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const delContact = async (id) => {
    try {
      await api.delete(`/me/contacts/${id}`);
      setContacts((p) => p.filter((c) => c.id !== id));
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const mapMarker = [{ id: "me", lat: location.lat, lng: location.lng, title: user?.name, subtitle: "Your current location" }];

  return (
    <PortalShell
      title={`Hello, ${user?.name?.split(" ")[0] || "patient"}`}
      subtitle="You are protected. Your network is one tap away."
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 bg-white">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="medical" data-testid="tab-medical">Medical ID</TabsTrigger>
          <TabsTrigger value="contacts" data-testid="tab-contacts">Emergency Contacts</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">Alert History</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* SOS */}
            <Card className="lg:col-span-5 border-red-200 bg-gradient-to-b from-red-50 to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" /> Emergency SOS
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <button
                  data-testid="sos-trigger-button"
                  onClick={() => setCountdown(countdown == null ? 5 : null)}
                  className="group flex h-60 w-60 flex-col items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700 sos-pulse"
                >
                  <span className="font-display text-6xl font-black tracking-tight">
                    {countdown != null ? countdown : "SOS"}
                  </span>
                  <span className="mt-1 font-mono text-xs uppercase tracking-[0.2em]">
                    {countdown != null ? "cancel?" : "Hold or tap"}
                  </span>
                </button>
                <div className="mt-5 flex gap-2">
                  <Button variant="outline" onClick={() => triggerAlert("accident")} data-testid="simulate-accident-btn">
                    Simulate accident
                  </Button>
                  <Button variant="outline" onClick={() => triggerAlert("health")} data-testid="simulate-health-btn">
                    Simulate health crisis
                  </Button>
                </div>
                {countdown != null && (
                  <div className="mt-3 text-sm text-red-600" data-testid="sos-countdown">
                    Sending alert in {countdown}s. Tap to cancel.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vitals + Map */}
            <div className="lg:col-span-7 grid gap-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <VitalCard icon={Heart} label="Heart rate" value={vitals.hr} unit="bpm" color="text-red-600" />
                <VitalCard icon={Activity} label="SpO₂" value={vitals.spo2} unit="%" color="text-blue-600" />
                <VitalCard icon={Droplets} label="Blood group" value={profile.blood_group || "—"} unit="" color="text-slate-900" />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4" /> Your live location
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <LeafletMap markers={mapMarker} height={260} />
                  <div className="mt-3 font-mono text-xs text-slate-500">
                    {location.lat.toFixed(4)}, {location.lng.toFixed(4)} · {location.address}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent alerts */}
            <Card className="lg:col-span-12">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4" /> Recent alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-500">No alerts yet — stay safe.</div>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {alerts.slice(0, 5).map((a) => (
                      <li key={a.id} className="flex items-center justify-between py-3">
                        <div>
                          <div className="font-semibold text-slate-900">{a.kind.toUpperCase()} · {a.address || `${a.lat},${a.lng}`}</div>
                          <div className="font-mono text-xs text-slate-500">{new Date(a.created_at).toLocaleString()}</div>
                        </div>
                        <Badge className={STATUS_CLR[a.status]} variant="outline">
                          {a.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="medical">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileHeart className="h-5 w-5 text-red-600" /> Medical ID
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveProfile} className="grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="medical-form">
                {[
                  ["blood_group", "Blood group"],
                  ["date_of_birth", "Date of birth"],
                  ["gender", "Gender"],
                  ["height_cm", "Height (cm)"],
                  ["weight_kg", "Weight (kg)"],
                ].map(([k, lbl]) => (
                  <div key={k}>
                    <Label>{lbl}</Label>
                    <Input
                      className="mt-1"
                      value={profile[k] ?? ""}
                      onChange={(e) => setProfile((p) => ({ ...p, [k]: e.target.value }))}
                      data-testid={`profile-${k}`}
                    />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <Label>Allergies</Label>
                  <Textarea className="mt-1" value={profile.allergies || ""} onChange={(e) => setProfile((p) => ({ ...p, allergies: e.target.value }))} data-testid="profile-allergies" />
                </div>
                <div className="md:col-span-2">
                  <Label>Medical conditions</Label>
                  <Textarea className="mt-1" value={profile.conditions || ""} onChange={(e) => setProfile((p) => ({ ...p, conditions: e.target.value }))} data-testid="profile-conditions" />
                </div>
                <div className="md:col-span-2">
                  <Label>Current medications</Label>
                  <Textarea className="mt-1" value={profile.medications || ""} onChange={(e) => setProfile((p) => ({ ...p, medications: e.target.value }))} data-testid="profile-medications" />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" className="bg-red-600 hover:bg-red-700" data-testid="profile-save-btn">Save medical ID</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PlusCircle className="h-4 w-4" /> Add emergency contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={addContact} className="space-y-3" data-testid="contact-form">
                  <Input placeholder="Name" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} data-testid="contact-name" />
                  <Input placeholder="Relation" value={newContact.relation} onChange={(e) => setNewContact({ ...newContact, relation: e.target.value })} data-testid="contact-relation" />
                  <Input placeholder="Phone" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} data-testid="contact-phone" />
                  <Input placeholder="Email (optional)" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} data-testid="contact-email" />
                  <Button type="submit" className="bg-red-600 hover:bg-red-700" data-testid="contact-add-btn">Add contact</Button>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PhoneCall className="h-4 w-4" /> Your contacts ({contacts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contacts.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-500">No contacts yet.</div>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {contacts.map((c) => (
                      <li key={c.id} className="flex items-center justify-between py-3">
                        <div>
                          <div className="font-semibold text-slate-900">{c.name} <span className="text-xs text-slate-500">· {c.relation}</span></div>
                          <div className="font-mono text-xs text-slate-500">{c.phone}</div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => delContact(c.id)} data-testid={`contact-del-${c.id}`}>
                          <Trash2 className="h-4 w-4 text-slate-500" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle>Alert history</CardTitle></CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">No alerts yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b text-left font-mono text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3">Time</th>
                        <th>Kind</th>
                        <th>Location</th>
                        <th>HR</th>
                        <th>SpO₂</th>
                        <th>Status</th>
                        <th>Assignee</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {alerts.map((a) => (
                        <tr key={a.id}>
                          <td className="py-3 font-mono text-xs">{new Date(a.created_at).toLocaleString()}</td>
                          <td className="font-semibold">{a.kind}</td>
                          <td>{a.address || `${a.lat},${a.lng}`}</td>
                          <td className="font-mono">{a.heart_rate ?? "—"}</td>
                          <td className="font-mono">{a.spo2 ?? "—"}</td>
                          <td><Badge className={STATUS_CLR[a.status]} variant="outline">{a.status}</Badge></td>
                          <td className="text-xs text-slate-600">{a.assignee_name || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PortalShell>
  );
}

const VitalCard = ({ icon: Icon, label, value, unit, color }) => (
  <Card>
    <CardContent className="p-5">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="mt-3 font-display text-4xl font-bold tracking-tight text-slate-900">
        {value}<span className="ml-1 text-base font-normal text-slate-500">{unit}</span>
      </div>
    </CardContent>
  </Card>
);
