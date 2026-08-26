import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardCheck,
  Target,
  PieChart,
  Wallet,
  Megaphone,
  GanttChartSquare,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NMM Navigator™ — Strategic OS for Small Nonprofits" },
      {
        name: "description",
        content:
          "From assessment to plan to execution. NMM Navigator unifies strategic planning, programs, budgeting, fundraising, and impact reporting into one nonprofit operating system.",
      },
    ],
  }),
  component: Landing,
});

const MODULES = [
  { icon: ClipboardCheck, label: "11 organizational assessments" },
  { icon: Target, label: "SMART strategic planning builder" },
  { icon: GanttChartSquare, label: "Auto-generated Gantt + calendar" },
  { icon: Wallet, label: "Budget planning & cash flow forecasts" },
  { icon: PieChart, label: "Revenue diversity tracking" },
  { icon: Megaphone, label: "Asks Bank & Grant Response Bank" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-brand-surface text-slate-900 font-sans">
      {/* Nav */}
      <header className="px-8 py-6 flex items-center justify-between max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-8 bg-brand-deep rounded-lg flex items-center justify-center">
            <div className="size-3 bg-white rounded-full" />
          </div>
          <span className="font-serif italic text-xl">NMM Navigator</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            Sign in
          </Link>
          <Link
            to="/auth"
            className="px-4 py-2 text-sm font-medium bg-brand-deep text-white rounded-lg hover:bg-brand-deep/90 transition-colors"
          >
            Start free
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-8 pt-16 pb-24 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="bg-brand-accent/10 text-brand-accent text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
            For nonprofits under $1M
          </span>
          <h1 className="text-5xl lg:text-6xl font-serif italic mt-6 leading-[1.05] text-balance">
            The strategic operating system your team will actually use.
          </h1>
          <p className="text-lg text-slate-600 mt-6 max-w-lg text-pretty">
            Most strategic plans sit on a shelf. NMM Navigator turns yours into an integrated
            assessment, planning, budgeting, and execution platform — built around the IMPACT and
            4Rs frameworks.
          </p>
          <div className="mt-8 flex gap-3">
            <Link
              to="/auth"
              className="px-6 py-3 bg-brand-deep text-white rounded-lg font-medium text-sm hover:bg-brand-deep/90 transition-colors flex items-center gap-2"
            >
              Start a strategic plan <ArrowRight className="size-4" />
            </Link>
            <a
              href="#modules"
              className="px-6 py-3 border border-slate-200 rounded-lg font-medium text-sm hover:bg-white transition-colors"
            >
              See what's inside
            </a>
          </div>
        </div>

        {/* Hero card preview */}
        <div className="bg-brand-deep text-white rounded-2xl p-8 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 h-full w-1/2 bg-gradient-to-l from-brand-primary/30 to-transparent pointer-events-none" />
          <div className="relative">
            <span className="bg-brand-accent/20 text-brand-accent text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
              Active Assessment
            </span>
            <h3 className="text-3xl font-serif mt-4 leading-tight">
              Is your revenue mix diverse enough to survive a recession?
            </h3>
            <p className="text-slate-400 mt-3 text-sm">
              A 12-minute audit using the Herfindahl-Hirschman Index.
            </p>
            <div className="mt-8">
              <div className="flex justify-between text-xs mb-2 text-slate-400 italic">
                <span>Progress: 4 of 12</span>
                <span>33% complete</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full">
                <div className="h-full bg-brand-accent w-1/3 rounded-full shadow-[0_0_10px_#10b981]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="max-w-7xl mx-auto px-8 py-20 border-t border-slate-200">
        <h2 className="text-3xl font-serif italic max-w-xl">
          One platform. Twenty integrated modules.
        </h2>
        <p className="text-slate-600 mt-3 max-w-2xl">
          Strategic planning is connected to programs, programs are connected to budgets, budgets
          are connected to asks. Every screen feeds the next.
        </p>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="bg-white border border-slate-200 rounded-xl p-6 flex items-start gap-3"
            >
              <div className="size-10 rounded-lg bg-brand-deep/5 flex items-center justify-center shrink-0">
                <Icon className="size-5 text-brand-deep" />
              </div>
              <p className="text-sm font-medium text-slate-800 mt-2">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-8 py-20">
        <div className="bg-brand-deep text-white rounded-2xl p-12 relative overflow-hidden text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/20 via-transparent to-brand-accent/10 pointer-events-none" />
          <div className="relative max-w-2xl mx-auto">
            <Sparkles className="size-8 mx-auto text-brand-accent" />
            <h3 className="text-4xl font-serif italic mt-4">
              Built for the leader who needs the plan to actually happen.
            </h3>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-white text-brand-deep rounded-full font-bold text-sm hover:bg-brand-accent hover:text-white transition-all"
            >
              Create your workspace <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 px-8 text-center text-xs text-slate-400 italic">
        © 2026 NMM Navigator™ — Nonprofit Management Methodology.
      </footer>
    </div>
  );
}
