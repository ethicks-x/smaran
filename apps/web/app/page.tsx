"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Brain,
  Heart,
  BarChart3,
  Users,
  ArrowRight,
  UserPlus,
  Sparkles,
  ImageIcon,
  MapPin,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: "easeOut" as const },
  }),
};

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-background text-ink-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-black/[0.05] bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-lavender-500 text-white shadow-lg shadow-indigo-500/20">
              <Brain size={18} />
            </div>
            <span className="font-display text-xl font-bold">Smaran</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm font-medium text-ink-700 hover:text-ink-900 sm:block">
              Log In
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-6 pb-24 pt-16 lg:px-8 lg:pb-32 lg:pt-24">
        <div className="pointer-events-none absolute inset-0 bg-noise opacity-30" />
        <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-indigo-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-32 h-[28rem] w-[28rem] rounded-full bg-mint-200/40 blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 top-96 h-72 w-72 rounded-full bg-lavender-200/40 blur-3xl" />

        <div className="relative mx-auto max-w-4xl text-center">
          <motion.div
            initial="hidden"
            animate="show"
            custom={0}
            variants={fadeUp}
            className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-medium text-indigo-700 shadow-sm"
          >
            <Sparkles size={13} /> Personalized cognitive care for the people you love
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="show"
            custom={1}
            variants={fadeUp}
            className="text-balance font-display text-5xl font-bold leading-[1.05] text-ink-900 sm:text-6xl lg:text-7xl"
          >
            Because Every{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-lavender-500 to-mint-500 bg-clip-text text-transparent">
              Memory
            </span>{" "}
            Matters.
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="show"
            custom={2}
            variants={fadeUp}
            className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-ink-500"
          >
            Smaran helps caregivers create personalized cognitive experiences and stay
            connected with the people they care for.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="show"
            custom={3}
            variants={fadeUp}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link href="/signup">
              <Button size="lg" className="gap-2 shadow-lg shadow-indigo-500/25">
                Get Started <ArrowRight size={18} />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Log In
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Floating memory cards */}
        <div className="relative mx-auto mt-20 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { icon: Users, label: "People They Love", tone: "from-indigo-500 to-indigo-400", delay: 0 },
            { icon: MapPin, label: "Places That Matter", tone: "from-mint-500 to-mint-400", delay: 0.6 },
            { icon: Package, label: "Cherished Objects", tone: "from-lavender-500 to-lavender-400", delay: 1.2 },
          ].map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: [0, -10, 0] }}
              transition={{
                opacity: { duration: 0.6, delay: 0.4 + i * 0.15 },
                y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: c.delay },
              }}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
              className="rounded-2xl border border-black/[0.06] bg-surface p-5 text-left shadow-xl shadow-indigo-900/5"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${c.tone} text-white`}>
                <c.icon size={19} />
              </div>
              <p className="mt-3 text-sm font-semibold text-ink-900">{c.label}</p>
              <p className="mt-0.5 text-xs text-ink-500">Preserved &amp; personalized</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative border-t border-black/[0.05] bg-surface px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl text-center"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">How Smaran Works</p>
            <h2 className="mt-3 text-balance font-display text-3xl font-bold text-ink-900 sm:text-4xl">
              A journey from memory to meaningful engagement
            </h2>
          </motion.div>

          <div className="relative mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="pointer-events-none absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-indigo-300 to-transparent lg:block" />
            {[
              { step: "01", icon: UserPlus, title: "Add a Patient", desc: "Create a patient profile in minutes." },
              { step: "02", icon: Heart, title: "Preserve Their Memories", desc: "Add people, places, and objects that matter to them." },
              { step: "03", icon: Brain, title: "Personalized Quizzes", desc: "The mobile app generates recognition games from their memories." },
              { step: "04", icon: BarChart3, title: "Track Their Journey", desc: "Monitor accuracy and engagement over time." },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                whileHover={{ y: -6 }}
                className="relative rounded-2xl border border-black/[0.06] bg-background p-6 shadow-sm transition-shadow hover:shadow-xl hover:shadow-indigo-900/5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/30">
                  <s.icon size={20} />
                </div>
                <p className="mt-4 text-xs font-bold tracking-wide text-indigo-400">STEP {s.step}</p>
                <p className="mt-1 font-display text-lg font-semibold text-ink-900">{s.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl text-center"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Features</p>
            <h2 className="mt-3 text-balance font-display text-3xl font-bold text-ink-900 sm:text-4xl">
              Everything caregivers need, thoughtfully designed
            </h2>
          </motion.div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Brain, title: "Cognitive Engagement", desc: "Track quiz sessions and accuracy in real time.", tone: "from-indigo-500 to-indigo-400" },
              { icon: Heart, title: "Personal Memory Library", desc: "Preserve people, places, and objects that matter.", tone: "from-coral-400 to-coral-500" },
              { icon: BarChart3, title: "Progress Tracking", desc: "Monitor engagement and accuracy with clarity.", tone: "from-mint-500 to-mint-400" },
              { icon: Users, title: "Caregiver-Centered", desc: "Everything needed to support loved ones in one place.", tone: "from-lavender-500 to-lavender-400" },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="rounded-2xl border border-black/[0.06] bg-surface p-6 shadow-sm transition-shadow hover:shadow-xl hover:shadow-indigo-900/10"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${f.tone} text-white`}>
                  <f.icon size={20} />
                </div>
                <p className="mt-4 font-display text-base font-semibold text-ink-900">{f.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 pb-24 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-lavender-500 px-8 py-16 text-center shadow-2xl shadow-indigo-900/30"
        >
          <div className="pointer-events-none absolute -left-10 -top-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-10 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
          <h2 className="relative text-balance font-display text-3xl font-bold text-white sm:text-4xl">
            Every memory tells a story. Help keep them alive.
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-balance text-indigo-100">
            Join Smaran and start building a personalized cognitive care experience today.
          </p>
          <Link href="/signup" className="relative mt-8 inline-block">
            <Button size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50">
              Start with Smaran
            </Button>
          </Link>
        </motion.div>
      </section>

      <footer className="border-t border-black/[0.05] px-6 py-8 text-center text-sm text-ink-500 lg:px-8">
        © {new Date().getFullYear()} Smaran. Because every memory matters.
      </footer>
    </div>
  );
}