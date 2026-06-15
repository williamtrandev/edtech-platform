import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Boxes, CheckCircle2, GraduationCap, Play, Route, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LanguageSelect } from "../features/preferences/preference-selectors";
import { useI18n, type I18nKey } from "../i18n";

const CONTAINER = "mx-auto w-full max-w-[1180px] px-5 sm:px-8";

type Track = {
  nameKey: I18nKey;
  descKey: I18nKey;
  slug: string;
  lessons: number;
  span: string;
};

const TRACKS: Track[] = [
  { nameKey: "landing.trackPythonName", descKey: "landing.trackPythonDesc", slug: "python", lessons: 84, span: "md:col-span-3" },
  { nameKey: "landing.trackJsName", descKey: "landing.trackJsDesc", slug: "javascript", lessons: 96, span: "md:col-span-3" },
  { nameKey: "landing.trackGoName", descKey: "landing.trackGoDesc", slug: "go", lessons: 52, span: "md:col-span-2" },
  { nameKey: "landing.trackSqlName", descKey: "landing.trackSqlDesc", slug: "postgresql", lessons: 41, span: "md:col-span-2" },
  { nameKey: "landing.trackRustName", descKey: "landing.trackRustDesc", slug: "rust", lessons: 38, span: "md:col-span-2" },
  { nameKey: "landing.trackDevopsName", descKey: "landing.trackDevopsDesc", slug: "docker", lessons: 47, span: "md:col-span-6" }
];

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary font-mono text-sm font-semibold text-primary-foreground",
        className
      )}
      aria-hidden
    >
      {">_"}
    </span>
  );
}

function CodeWindow({ comment }: { comment: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_24px_80px_-24px_rgba(0,0,0,0.6)]">
      <div className="flex items-center gap-2 border-b border-border bg-secondary/60 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-destructive/70" />
        <span className="h-3 w-3 rounded-full bg-chart-3/70" />
        <span className="h-3 w-3 rounded-full bg-primary/70" />
        <span className="ml-2 font-mono text-xs text-muted-foreground">fibonacci.py</span>
      </div>
      <pre className="overflow-x-auto px-5 py-4 font-mono text-[13px] leading-relaxed">
        <code>
          <span className="text-muted-foreground">{comment}</span>
          {"\n"}
          <span className="text-primary">def</span> <span className="text-chart-3">fib</span>(n):{"\n"}
          {"    "}a, b = <span className="text-chart-4">0</span>, <span className="text-chart-4">1</span>{"\n"}
          {"    "}<span className="text-primary">for</span> _ <span className="text-primary">in</span> <span className="text-chart-3">range</span>(n):{"\n"}
          {"        "}a, b = b, a + b{"\n"}
          {"    "}<span className="text-primary">return</span> a{"\n"}
          {"\n"}
          <span className="text-chart-3">print</span>(fib(<span className="text-chart-4">10</span>))
        </code>
      </pre>
      <div className="flex items-center gap-2 border-t border-border bg-secondary/40 px-5 py-3 font-mono text-xs">
        <CheckCircle2 className="size-4 text-primary" />
        <span className="text-muted-foreground">3 / 3 tests passed</span>
        <span className="ml-auto text-primary">55</span>
      </div>
    </div>
  );
}

const STEPS: { icon: typeof Terminal; titleKey: I18nKey; descKey: I18nKey }[] = [
  { icon: Terminal, titleKey: "landing.step1Title", descKey: "landing.step1Desc" },
  { icon: Play, titleKey: "landing.step2Title", descKey: "landing.step2Desc" },
  { icon: CheckCircle2, titleKey: "landing.step3Title", descKey: "landing.step3Desc" }
];

export function LandingPage() {
  const { t } = useI18n();
  const lessonCount = (n: number) => t("landing.lessonCount").replace("{count}", String(n));

  return (
    <div className="dark">
      <div className="relative min-h-dvh overflow-x-hidden bg-background font-sans text-foreground antialiased">
        {/* ambient background */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute left-1/2 top-[-10%] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-primary/10 blur-[140px]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
              backgroundSize: "48px 48px"
            }}
          />
        </div>

        {/* nav */}
        <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
          <nav className={cn(CONTAINER, "flex h-16 items-center justify-between gap-4")}>
            <Link to="/" className="flex items-center gap-2.5">
              <BrandMark />
              <span className="text-base font-semibold tracking-tight">{t("app.name")}</span>
            </Link>
            <div className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
              <a href="#tracks" className="transition-colors hover:text-foreground">{t("landing.navTracks")}</a>
              <a href="#how" className="transition-colors hover:text-foreground">{t("landing.navHow")}</a>
              <Link to="/explore" className="transition-colors hover:text-foreground">{t("landing.navExplore")}</Link>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSelect variant="icon" className="hidden sm:inline-flex" />
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">{t("landing.signIn")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/register">{t("landing.ctaPrimary")}</Link>
              </Button>
            </div>
          </nav>
        </header>

        <main className="relative z-10">
          {/* hero */}
          <section className="relative">
            <div className={cn(CONTAINER, "grid items-center gap-12 pb-20 pt-16 md:grid-cols-12 md:pt-24")}>
              <div className="md:col-span-7">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs text-primary">
                  <Terminal className="size-3.5" />
                  {t("landing.heroEyebrow")}
                </span>
                <h1 className="mt-6 max-w-2xl text-balance text-4xl font-semibold tracking-tight md:text-6xl">
                  {t("landing.heroTitle")}
                </h1>
                <p className="mt-5 max-w-xl text-pretty text-base text-muted-foreground md:text-lg">
                  {t("landing.heroSubtitle")}
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button asChild size="lg">
                    <Link to="/register">
                      {t("landing.ctaPrimary")}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <a href="#tracks">{t("landing.ctaSecondary")}</a>
                  </Button>
                </div>
              </div>
              <motion.div
                className="md:col-span-5"
                initial={useReducedMotion() ? false : { opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                <CodeWindow comment={t("landing.terminalComment")} />
              </motion.div>
            </div>
          </section>

          {/* tracks */}
          <section id="tracks" className={cn(CONTAINER, "scroll-mt-20 py-24")}>
            <Reveal>
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">{t("landing.tracksTitle")}</h2>
              <p className="mt-3 max-w-xl text-muted-foreground">{t("landing.tracksSubtitle")}</p>
            </Reveal>
            <div className="mt-10 grid grid-flow-dense auto-rows-[1fr] grid-cols-1 gap-3 md:grid-cols-6">
              {TRACKS.map((track, i) => (
                <Reveal key={track.slug} delay={i * 0.05} className={track.span}>
                  <Link
                    to="/explore"
                    className="group flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
                  >
                    <div className="flex items-center justify-between">
                      <img
                        src={`https://cdn.simpleicons.org/${track.slug}/4ade80`}
                        alt=""
                        className="size-8 transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                      <span className="font-mono text-xs text-muted-foreground">{lessonCount(track.lessons)}</span>
                    </div>
                    <div className="mt-auto">
                      <h3 className="text-lg font-semibold tracking-tight">{t(track.nameKey)}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{t(track.descKey)}</p>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </section>

          {/* how it works */}
          <section id="how" className="border-y border-border/60 bg-card/30 scroll-mt-20">
            <div className={cn(CONTAINER, "grid gap-12 py-24 md:grid-cols-12")}>
              <div className="md:col-span-4">
                <Reveal>
                  <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("landing.howTitle")}</h2>
                  <p className="mt-3 text-muted-foreground">{t("landing.howSubtitle")}</p>
                </Reveal>
              </div>
              <div className="md:col-span-8">
                <div className="divide-y divide-border/70">
                  {STEPS.map((step, i) => (
                    <Reveal key={step.titleKey} delay={i * 0.08}>
                      <div className="flex gap-5 py-6 first:pt-0">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                          <step.icon className="size-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold tracking-tight">{t(step.titleKey)}</h3>
                          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground md:text-base">{t(step.descKey)}</p>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* features bento */}
          <section className={cn(CONTAINER, "py-24")}>
            <Reveal>
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">{t("landing.featuresTitle")}</h2>
            </Reveal>
            <div className="mt-10 grid grid-flow-dense grid-cols-1 gap-3 md:grid-cols-6">
              <Reveal className="md:col-span-4">
                <div className="flex h-full flex-col justify-between gap-6 rounded-xl border border-border bg-card p-6">
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight">{t("landing.featureEditorTitle")}</h3>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("landing.featureEditorDesc")}</p>
                  </div>
                  <pre className="overflow-x-auto rounded-lg border border-border bg-background px-4 py-3 font-mono text-xs text-muted-foreground">
                    <code>
                      <span className="text-primary">$</span> run main.go{"\n"}
                      <span className="text-primary">ok</span>  hello, world
                    </code>
                  </pre>
                </div>
              </Reveal>
              <Reveal className="md:col-span-2" delay={0.05}>
                <div className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-6">
                  <CheckCircle2 className="size-6 text-primary" />
                  <h3 className="text-lg font-semibold tracking-tight">{t("landing.featureGradedTitle")}</h3>
                  <p className="text-sm text-muted-foreground">{t("landing.featureGradedDesc")}</p>
                </div>
              </Reveal>
              <Reveal className="md:col-span-3" delay={0.1}>
                <div className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-6">
                  <Route className="size-6 text-primary" />
                  <h3 className="text-lg font-semibold tracking-tight">{t("landing.featurePathsTitle")}</h3>
                  <p className="text-sm text-muted-foreground">{t("landing.featurePathsDesc")}</p>
                </div>
              </Reveal>
              <Reveal className="md:col-span-3" delay={0.15}>
                <div className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-6">
                  <GraduationCap className="size-6 text-primary" />
                  <h3 className="text-lg font-semibold tracking-tight">{t("landing.featureCertsTitle")}</h3>
                  <p className="text-sm text-muted-foreground">{t("landing.featureCertsDesc")}</p>
                </div>
              </Reveal>
            </div>
          </section>

          {/* final cta */}
          <section className={cn(CONTAINER, "pb-28")}>
            <Reveal>
              <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-10 text-center md:p-16">
                <Boxes className="mx-auto size-8 text-primary" />
                <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
                  {t("landing.finalTitle")}
                </h2>
                <p className="mx-auto mt-3 max-w-md text-muted-foreground">{t("landing.finalSubtitle")}</p>
                <Button asChild size="lg" className="mt-8">
                  <Link to="/register">
                    {t("landing.finalCta")}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </Reveal>
          </section>
        </main>

        {/* footer */}
        <footer className="relative z-10 border-t border-border/60">
          <div className={cn(CONTAINER, "flex flex-col items-center justify-between gap-4 py-8 sm:flex-row")}>
            <div className="flex items-center gap-2.5">
              <BrandMark />
              <span className="font-semibold tracking-tight">{t("app.name")}</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/explore" className="transition-colors hover:text-foreground">{t("landing.navExplore")}</Link>
              <a href="#tracks" className="transition-colors hover:text-foreground">{t("landing.navTracks")}</a>
              <Link to="/login" className="transition-colors hover:text-foreground">{t("landing.signIn")}</Link>
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              © {new Date().getFullYear()} {t("app.name")}. {t("landing.footerRights")}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default LandingPage;
