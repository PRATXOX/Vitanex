import React, { useEffect, useMemo, useState, useCallback } from "react";
import PortalShell from "../../components/PortalShell";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import LeafletMap from "../../components/LeafletMap";
import { api, formatApiError } from "../../lib/api";
import { toast } from "sonner";
import { Siren, Sparkles, Check, X, CircleDot, MapPin, Heart, Activity } from "lucide-react";

const STATUS_CLR = {
  pending: "bg-red-100 text-red-700 border-red-200",
  accepted: "bg-amber-100 text-amber-700 border-amber-200",
  dispatched: "bg-blue-100 text-blue-700 border-blue-200",
  resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  false_alarm: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function ResponderDashboard({ role = "hospital" }) {
  const [alerts, setAlerts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [remarks, setRemarks] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/alerts");
      setAlerts(data || []);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 6000);
    return () => clearInterval(i);
  }, [load]);

  const pending = useMemo(() => alerts.filter((a) => a.status === "pending"), [alerts]);
  const active = useMemo(() => alerts.filter((a) => ["accepted", "dispatched"].includes(a.status)), [alerts]);
  const resolved = useMemo(() => alerts.filter((a) => ["resolved", "false_alarm"].includes(a.status)), [alerts]);

  const markers = alerts.map((a) => ({
    id: a.id,
    lat: a.lat,
    lng: a.lng,
    title: `${a.kind.toUpperCase()} · ${a.user_name}`,
    subtitle: a.address,
  }));

  const updateStatus = async (aid, status) => {
    try {
      const { data } = await api.patch(`/alerts/${aid}/status`, { status, remarks });
      setAlerts((p) => p.map((x) => (x.id === aid ? data : x)));
      setSelected(data);
      toast.success(`Alert marked ${status}`);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const runAISummary = async (aid) => {
    setAiLoading(true);
    try {
      const { data } = await api.post(`/alerts/${aid}/ai-summary`);
      setSelected((s) => (s ? { ...s, ai_summary: data.summary } : s));
      setAlerts((p) => p.map((x) => (x.id === aid ? { ...x, ai_summary: data.summary } : x)));
      toast.success("AI triage brief generated");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally {
      setAiLoading(false);
    }
  };

  const title = role === "hospital" ? "Hospital command center" : "NGO rapid response";
  const subtitle =
    role === "hospital"
      ? "Incoming emergencies, AI triage briefs & dispatch."
      : "Nearby emergencies, volunteer coordination & response.";

  return (
    <PortalShell title={title} subtitle={subtitle}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Tabs defaultValue="pending">
            <TabsList className="bg-white">
              <TabsTrigger value="pending" data-testid="tab-pending">
                Pending <Badge className="ml-2 bg-red-600">{pending.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="active" data-testid="tab-active">
                Active <Badge className="ml-2 bg-blue-600">{active.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="resolved" data-testid="tab-resolved">Resolved</TabsTrigger>
            </TabsList>
            <TabsContent value="pending">
              <AlertList items={pending} onOpen={(a) => { setSelected(a); setRemarks(a.remarks || ""); }} />
            </TabsContent>
            <TabsContent value="active">
              <AlertList items={active} onOpen={(a) => { setSelected(a); setRemarks(a.remarks || ""); }} />
            </TabsContent>
            <TabsContent value="resolved">
              <AlertList items={resolved} onOpen={(a) => { setSelected(a); setRemarks(a.remarks || ""); }} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" /> Live alert map
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LeafletMap markers={markers} height={360} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Today's pulse</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 text-center">
              <Stat label="Pending" value={pending.length} color="text-red-600" />
              <Stat label="Active" value={active.length} color="text-blue-600" />
              <Stat label="Resolved" value={resolved.length} color="text-emerald-600" />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-3">
                  <DialogTitle className="flex items-center gap-2">
                    <Siren className="h-5 w-5 text-red-600" />
                    {selected.kind.toUpperCase()} alert · {selected.user_name}
                  </DialogTitle>
                  <Button variant="outline" size="sm" onClick={() => setSelected(null)} data-testid="alert-back-btn">
                    ← Back
                  </Button>
                </div>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-3 text-sm">
                  <Row label="Status">
                    <Badge className={STATUS_CLR[selected.status]} variant="outline">{selected.status}</Badge>
                  </Row>
                  <Row label="Location">{selected.address || `${selected.lat},${selected.lng}`}</Row>
                  <Row label="Phone">{selected.user_phone || "—"}</Row>
                  <Row label="Vitals">
                    <span className="font-mono">HR {selected.heart_rate ?? "—"} · SpO₂ {selected.spo2 ?? "—"} · g {selected.g_force ?? "—"}</span>
                  </Row>
                  <Row label="Note">{selected.note || "—"}</Row>
                  <div className="pt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Medical ID</div>
                  <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-700">
                    <div><b>Blood:</b> {selected.medical_snapshot?.blood_group || "—"}</div>
                    <div><b>Allergies:</b> {selected.medical_snapshot?.allergies || "—"}</div>
                    <div><b>Conditions:</b> {selected.medical_snapshot?.conditions || "—"}</div>
                    <div><b>Medications:</b> {selected.medical_snapshot?.medications || "—"}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <LeafletMap markers={[{ id: selected.id, lat: selected.lat, lng: selected.lng, title: selected.user_name }]} height={200} />
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">AI triage brief</div>
                      <Button size="sm" variant="outline" onClick={() => runAISummary(selected.id)} disabled={aiLoading} data-testid="ai-summary-btn">
                        <Sparkles className="mr-2 h-3 w-3" /> {aiLoading ? "Generating…" : selected.ai_summary ? "Regenerate" : "Generate"}
                      </Button>
                    </div>
                    <div className="min-h-[120px] rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700" data-testid="ai-summary-box">
                      {selected.ai_summary || "Click generate to get Claude Sonnet 4.5 triage brief."}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Remarks</div>
                    <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Dispatch notes, ETA, bay assignment…" />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap justify-end gap-2 border-t pt-4">
                <Button variant="outline" onClick={() => updateStatus(selected.id, "false_alarm")} data-testid="status-false-alarm-btn">
                  <X className="mr-1 h-4 w-4" /> Mark false alarm
                </Button>
                <Button variant="outline" onClick={() => updateStatus(selected.id, "accepted")} data-testid="status-accept-btn">
                  <CircleDot className="mr-1 h-4 w-4" /> Accept
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => updateStatus(selected.id, "dispatched")} data-testid="status-dispatch-btn">
                  <Siren className="mr-1 h-4 w-4" /> Dispatch
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus(selected.id, "resolved")} data-testid="status-resolve-btn">
                  <Check className="mr-1 h-4 w-4" /> Resolve
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PortalShell>
  );
}

const Row = ({ label, children }) => (
  <div className="flex items-baseline gap-3">
    <span className="w-24 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</span>
    <span className="flex-1">{children}</span>
  </div>
);

const Stat = ({ label, value, color }) => (
  <div>
    <div className={`font-display text-3xl font-bold ${color}`}>{value}</div>
    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
  </div>
);

const AlertList = ({ items, onOpen }) => {
  if (!items.length) return <div className="py-10 text-center text-sm text-slate-500">No alerts here.</div>;
  return (
    <div className="space-y-3">
      {items.map((a) => (
        <button
          key={a.id}
          onClick={() => onOpen(a)}
          data-testid={`alert-card-${a.id}`}
          className={`w-full rounded-lg border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
            a.status === "pending" ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-display text-lg font-semibold text-slate-900">
                {a.kind.toUpperCase()} · {a.user_name}
              </div>
              <div className="mt-1 text-sm text-slate-600">{a.address || `${a.lat},${a.lng}`}</div>
              <div className="mt-2 flex flex-wrap gap-3 font-mono text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3 text-red-500" /> {a.heart_rate ?? "—"}</span>
                <span className="inline-flex items-center gap-1"><Activity className="h-3 w-3 text-blue-500" /> {a.spo2 ?? "—"}%</span>
                <span>g {a.g_force ?? "—"}</span>
                <span>{new Date(a.created_at).toLocaleTimeString()}</span>
              </div>
            </div>
            <Badge className={STATUS_CLR[a.status]} variant="outline">{a.status}</Badge>
          </div>
        </button>
      ))}
    </div>
  );
};
