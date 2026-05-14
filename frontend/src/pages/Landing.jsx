import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { Button } from "../components/ui/button";
import {
  Activity,
  Siren,
  MapPin,
  Heart,
  ShieldCheck,
  Clock,
  Cpu,
  Ambulance,
  Users,
  Building2,
  HandHeart,
  ArrowRight,
  PhoneCall,
} from "lucide-react";

const HERO_IMG =
  "https://images.unsplash.com/photo-1625258111307-3e929842d9b5?crop=entropy&cs=srgb&fm=jpg&q=85";
const HOSPITAL_IMG =
  "https://images.pexels.com/photos/13697732/pexels-photo-13697732.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const MAP_IMG =
  "https://images.pexels.com/photos/38271/ipad-map-tablet-internet-38271.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const ECG_IMG =
  "https://images.pexels.com/photos/6203473/pexels-photo-6203473.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function Landing() {
  return (
    <div className="bg-white">
      <Navbar variant="public" />

      {/* Ticker */}
      <div className="border-b border-slate-200 bg-red-600 text-white">
        <div className="mx-auto flex max-w-[1400px] items-center gap-6 overflow-hidden px-6 py-2 font-mono text-xs uppercase tracking-[0.18em]">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> LIVE
          </span>
          <div className="flex min-w-full gap-12 whitespace-nowrap ticker-track">
            {Array.from({ length: 2 }).map((_, i) => (
              <div className="flex items-center gap-12" key={i}>
                <span>Golden hour saved 37 patients this week</span>
                <span>ML false-alarm rate: 0.4%</span>
                <span>Median alert-to-dispatch: 41s</span>
                <span>Active hospitals on Vitanex: 214</span>
                <span>NGO rapid responders: 87</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HERO */}
      <section className="relative border-b border-slate-200 grid-bg">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-10 px-6 py-20 md:grid-cols-12 md:py-28">
          <div className="md:col-span-7">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
              <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
              <span className="font-mono uppercase tracking-[0.2em]">
                Intelligent Emergency Response
              </span>
            </div>
            <h1 className="font-display text-5xl font-black leading-[0.95] tracking-tighter text-slate-900 sm:text-6xl lg:text-7xl">
              The Golden Hour<br />
              <span className="text-red-600">isn't negotiable.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              Vitanex detects accidents and health crises from your phone & wearables,
              filters false alarms with machine learning, and routes alerts with your
              medical ID to hospitals, NGOs and family — in seconds, not minutes.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" className="h-12 bg-red-600 px-7 text-base hover:bg-red-700" asChild data-testid="hero-cta-register">
                <Link to="/register">
                  Get protected now <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 border-slate-300 px-7 text-base" asChild data-testid="hero-cta-login">
                <Link to="/login">Access portal</Link>
              </Button>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 border-t border-slate-200 pt-6 text-sm">
              <Stat label="Median response" value="41s" />
              <Stat label="False-alarm filter" value="99.6%" />
              <Stat label="Integrated hospitals" value="214" />
            </div>
          </div>

          <div className="relative md:col-span-5">
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <img src={HERO_IMG} alt="Ambulance" className="h-[360px] w-full object-cover" />
              <div className="absolute inset-x-4 bottom-4 rounded-lg border border-red-200 bg-white/95 p-4 shadow-lg backdrop-blur">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
                  <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-red-700">
                    Alert dispatched
                  </span>
                </div>
                <div className="mt-2 font-display text-lg font-semibold text-slate-900">
                  Accident · Old Airport Road
                </div>
                <div className="mt-1 font-mono text-xs text-slate-500">
                  HR 132bpm · SpO₂ 91% · g-force 8.4
                </div>
              </div>
            </div>
            <div className="absolute -right-4 -top-6 hidden rotate-2 rounded-lg border border-slate-200 bg-white p-3 shadow-md md:block">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Hospital alert
              </div>
              <div className="font-display text-sm font-semibold text-slate-900">
                Apollo · Bed 14 ready
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section id="problem" className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-[1400px] px-6 py-20">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
            <div className="md:col-span-4">
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-red-600">
                The crisis
              </div>
              <h2 className="mt-3 font-display text-4xl font-bold leading-tight tracking-tight text-slate-900">
                Every minute without help reduces survival by 10%.
              </h2>
              <p className="mt-4 text-slate-600">
                Most lives lost in road accidents and medical emergencies are lost not to
                the injury itself, but to the lag between incident and intervention.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:col-span-8 md:grid-cols-2">
              {[
                { icon: Clock, title: "Critical 60-minute window", desc: "The first hour after trauma determines survival." },
                { icon: MapPin, title: "Responders can't locate you", desc: "Most calls lack precise live GPS coordinates." },
                { icon: Heart, title: "Medical history unknown", desc: "ER teams react blind — no allergies, no blood group." },
                { icon: Ambulance, title: "Remote zones ignored", desc: "Rural areas lose more lives to slow dispatch." },
              ].map((c) => (
                <div key={c.title} className="border border-slate-200 bg-white p-6 transition hover:border-red-300 hover:shadow-sm">
                  <c.icon className="h-6 w-6 text-red-600" />
                  <div className="mt-4 font-display text-lg font-semibold text-slate-900">{c.title}</div>
                  <div className="mt-1 text-sm text-slate-600">{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-b border-slate-200">
        <div className="mx-auto max-w-[1400px] px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
              How Vitanex works
            </div>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-slate-900">
              Four steps. Seconds, not minutes.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            {[
              { n: "01", icon: Cpu, t: "Detect", d: "Accelerometer, GPS & biometrics detect impact or vital drop." },
              { n: "02", icon: ShieldCheck, t: "Validate", d: "ML distinguishes a dropped phone from a real accident." },
              { n: "03", icon: Siren, t: "Alert", d: "Hospitals, NGOs & family receive location + medical ID instantly." },
              { n: "04", icon: Ambulance, t: "Dispatch", d: "Nearest hospital confirms; NGO responder mobilizes in parallel." },
            ].map((s) => (
              <div key={s.n} className="group relative border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-red-500 hover:shadow-md">
                <div className="font-mono text-xs text-slate-400">{s.n}</div>
                <s.icon className="mt-4 h-7 w-7 text-slate-900 group-hover:text-red-600" strokeWidth={1.75} />
                <div className="mt-5 font-display text-xl font-semibold text-slate-900">{s.t}</div>
                <div className="mt-2 text-sm text-slate-600">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="border-b border-slate-200 bg-slate-900 text-white grid-bg-dark">
        <div className="mx-auto max-w-[1400px] px-6 py-20">
          <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-12">
            <div className="md:col-span-5">
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-red-400">
                Capabilities
              </div>
              <h2 className="mt-3 font-display text-4xl font-bold tracking-tight">
                Designed for the worst moments of your life.
              </h2>
            </div>
            <div className="md:col-span-7">
              <p className="text-lg leading-relaxed text-slate-300">
                Every feature is built for one thing: shaving seconds off the time it takes
                for qualified help to reach you with the information it needs.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { t: "Automatic crash detection", d: "Detects G-force spikes + sudden vehicle deceleration.", img: ECG_IMG },
              { t: "Live vital monitoring", d: "HR & SpO₂ streamed; abnormal readings auto-escalate.", img: HOSPITAL_IMG },
              { t: "AI triage brief", d: "Claude Sonnet 4.5 summarizes patient data for the ER.", img: MAP_IMG },
            ].map((f) => (
              <div key={f.t} className="overflow-hidden border border-slate-700 bg-slate-800/60">
                <img src={f.img} alt={f.t} className="h-40 w-full object-cover" />
                <div className="p-5">
                  <div className="font-display text-lg font-semibold">{f.t}</div>
                  <div className="mt-1 text-sm text-slate-400">{f.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PORTALS */}
      <section id="portals" className="border-b border-slate-200">
        <div className="mx-auto max-w-[1400px] px-6 py-20">
          <div className="mb-10 max-w-2xl">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
              Four portals · one network
            </div>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-slate-900">
              Built for every side of the emergency.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Users, c: "bg-red-600", t: "User", d: "SOS, medical ID, live vitals & contacts." },
              { icon: Building2, c: "bg-blue-600", t: "Hospital", d: "Incoming alerts, AI triage, dispatch." },
              { icon: HandHeart, c: "bg-emerald-600", t: "NGO", d: "Nearby alerts, volunteer coordination." },
              { icon: ShieldCheck, c: "bg-slate-900", t: "Admin", d: "Verify partners, monitor the entire network." },
            ].map((p) => (
              <div key={p.t} className="group relative overflow-hidden border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg">
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-md ${p.c} text-white`}>
                  <p.icon className="h-5 w-5" />
                </div>
                <div className="font-display text-xl font-semibold text-slate-900">{p.t} Portal</div>
                <div className="mt-1 text-sm text-slate-600">{p.d}</div>
                <div className="mt-5 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-slate-500 group-hover:text-red-600">
                  <Link to="/login">Open portal</Link>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-slate-200 bg-red-600 text-white">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-8 px-6 py-16 md:grid-cols-12">
          <div className="md:col-span-8">
            <h3 className="font-display text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              Emergencies don't schedule themselves. Neither should your response.
            </h3>
            <p className="mt-3 max-w-2xl text-red-100">
              Join Vitanex today. Set up your medical ID in 2 minutes and be one tap away
              from help for life.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:col-span-4 md:justify-end">
            <Button size="lg" className="bg-white text-red-700 hover:bg-slate-100" asChild data-testid="cta-register-bottom">
              <Link to="/register">Create free account</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-red-700" asChild>
              <Link to="/login">
                <PhoneCall className="mr-2 h-4 w-4" /> Demo login
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="bg-slate-50">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-4 px-6 py-8 text-sm text-slate-500 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-600 text-white">
              <Activity className="h-3 w-3" strokeWidth={3} />
            </div>
            <span className="font-display font-semibold text-slate-700">Vitanex</span>
            <span>© {new Date().getFullYear()} · Saving the golden hour</span>
          </div>
          <div className="font-mono text-xs uppercase tracking-[0.2em]">
            Powered by IoT · ML · OpenStreetMap · Claude Sonnet 4.5
          </div>
        </div>
      </footer>
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div>
    <div className="font-display text-3xl font-bold tracking-tight text-slate-900">
      {value}
    </div>
    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
      {label}
    </div>
  </div>
);
