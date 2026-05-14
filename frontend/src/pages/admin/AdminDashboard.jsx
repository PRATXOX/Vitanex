import React, { useEffect, useState, useCallback } from "react";
import PortalShell from "../../components/PortalShell";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import LeafletMap from "../../components/LeafletMap";
import { api, formatApiError } from "../../lib/api";
import { toast } from "sonner";
import { Users, Building2, HandHeart, Siren, ShieldCheck, Ban, CheckCircle2, Trash2 } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    try {
      const [s, u, a] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/users"),
        api.get("/alerts"),
      ]);
      setStats(s.data);
      setUsers(u.data || []);
      setAlerts(a.data || []);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 10000);
    return () => clearInterval(i);
  }, [load]);

  const patch = async (uid, payload) => {
    try {
      const { data } = await api.patch(`/admin/users/${uid}`, payload);
      setUsers((p) => p.map((x) => (x.id === uid ? data : x)));
      toast.success("Updated");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const del = async (uid) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await api.delete(`/admin/users/${uid}`);
      setUsers((p) => p.filter((x) => x.id !== uid));
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const filtered = (role) =>
    users
      .filter((u) => u.role === role)
      .filter((u) => {
        const q = filter.toLowerCase();
        return !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.organization?.toLowerCase().includes(q);
      });

  return (
    <PortalShell title="Admin control tower" subtitle="System-wide visibility and governance.">
      {stats && (
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
          <KPI icon={Users} label="Users" value={stats.users} color="text-red-600" />
          <KPI icon={Building2} label="Hospitals" value={stats.hospitals} color="text-blue-600" />
          <KPI icon={HandHeart} label="NGOs" value={stats.ngos} color="text-emerald-600" />
          <KPI icon={ShieldCheck} label="Pending verify" value={stats.pending_verification} color="text-amber-600" />
          <KPI icon={Siren} label="Alerts" value={stats.alerts} color="text-slate-900" />
          <KPI label="Pending" value={stats.alerts_pending} color="text-red-600" />
          <KPI label="Dispatched" value={stats.alerts_dispatched} color="text-blue-600" />
          <KPI label="Resolved" value={stats.alerts_resolved} color="text-emerald-600" />
        </div>
      )}

      <Tabs defaultValue="users">
        <TabsList className="bg-white">
          <TabsTrigger value="users" data-testid="tab-admin-users">Users</TabsTrigger>
          <TabsTrigger value="hospitals" data-testid="tab-admin-hospitals">Hospitals</TabsTrigger>
          <TabsTrigger value="ngos" data-testid="tab-admin-ngos">NGOs</TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-admin-alerts">Alerts</TabsTrigger>
        </TabsList>

        <div className="my-4">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search by name, email, organization…"
            className="w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            data-testid="admin-search"
          />
        </div>

        <TabsContent value="users"><UserTable rows={filtered("user")} patch={patch} del={del} /></TabsContent>
        <TabsContent value="hospitals"><UserTable rows={filtered("hospital")} patch={patch} del={del} showOrg /></TabsContent>
        <TabsContent value="ngos"><UserTable rows={filtered("ngo")} patch={patch} del={del} showOrg /></TabsContent>
        <TabsContent value="alerts">
          <Card>
            <CardHeader><CardTitle>All alerts ({alerts.length})</CardTitle></CardHeader>
            <CardContent>
              <LeafletMap markers={alerts.map((a) => ({ id: a.id, lat: a.lat, lng: a.lng, title: a.user_name, subtitle: a.kind }))} height={280} />
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-left font-mono text-xs uppercase tracking-wider text-slate-500">
                    <tr><th className="py-3">Time</th><th>User</th><th>Kind</th><th>Location</th><th>Status</th><th>Assignee</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {alerts.map((a) => (
                      <tr key={a.id}>
                        <td className="py-3 font-mono text-xs">{new Date(a.created_at).toLocaleString()}</td>
                        <td>{a.user_name}</td>
                        <td>{a.kind}</td>
                        <td>{a.address || `${a.lat},${a.lng}`}</td>
                        <td><Badge variant="outline">{a.status}</Badge></td>
                        <td className="text-xs text-slate-600">{a.assignee_name || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PortalShell>
  );
}

const KPI = ({ icon: Icon, label, value, color }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
        {Icon && <Icon className={`h-4 w-4 ${color}`} />}
      </div>
      <div className={`mt-2 font-display text-3xl font-bold ${color}`}>{value}</div>
    </CardContent>
  </Card>
);

const UserTable = ({ rows, patch, del, showOrg }) => (
  <Card>
    <CardContent className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead className="border-b bg-slate-50 text-left font-mono text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th>Email</th>
            {showOrg && <th>Organization</th>}
            <th>Phone</th>
            <th>Verified</th>
            <th>Active</th>
            <th className="pr-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.length === 0 && (
            <tr><td colSpan={7} className="py-8 text-center text-sm text-slate-500">No records.</td></tr>
          )}
          {rows.map((u) => (
            <tr key={u.id} data-testid={`user-row-${u.id}`}>
              <td className="px-4 py-3 font-semibold">{u.name}</td>
              <td className="font-mono text-xs">{u.email}</td>
              {showOrg && <td>{u.organization || "—"}</td>}
              <td className="font-mono text-xs">{u.phone || "—"}</td>
              <td>{u.verified ? <Badge className="bg-emerald-100 text-emerald-700" variant="outline">Yes</Badge> : <Badge className="bg-amber-100 text-amber-700" variant="outline">No</Badge>}</td>
              <td>{u.active ? <Badge variant="outline" className="bg-emerald-100 text-emerald-700">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</td>
              <td className="pr-4 text-right">
                <div className="inline-flex gap-1">
                  {!u.verified && (
                    <Button size="sm" variant="outline" onClick={() => patch(u.id, { verified: true })} data-testid={`verify-${u.id}`}>
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Verify
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => patch(u.id, { active: !u.active })} data-testid={`toggle-${u.id}`}>
                    <Ban className="mr-1 h-3 w-3" /> {u.active ? "Suspend" : "Restore"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => del(u.id)} data-testid={`del-${u.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardContent>
  </Card>
);
