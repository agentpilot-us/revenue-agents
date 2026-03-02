import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════
// AGENTPILOT — TARGET COMPANY PAGE
// Reference Implementation: Overview + Buying Groups Tabs
// Uses agentpilot-tokens.css design system
// ═══════════════════════════════════════════════════════════

// --- DEMO DATA (mirrors Roadmap engine output) ---
const COMPANY = {
  name: "General Motors Company",
  domain: "gm.com",
  industry: "Automotive Manufacturing",
  employees: "90,000+",
  hq: "Detroit, MI",
  totalContacts: 27,
  currentARR: 0,
  expansionOpportunity: 45000000,
  targetARR: 45000000,
};

const OBJECTIVE = {
  goalText: "Land 2 new divisional NVIDIA use cases at GM",
  targetCount: 2,
  progress: { landed: 0, active: 2, monitoring: 3 },
};

const DIVISIONS = [
  {
    id: "d1", name: "Autonomous Driving & ADAS", fullName: "Autonomous Driving & ADAS (includes Cruise)",
    stage: "Active Program", stageIcon: "●", stageColor: "#22c55e",
    contacts: 2, personasNeeded: 3, coverage: 67,
    salesPage: "placeholder", salesPageUrl: "/go/gm-adas-nvidia",
    isExpansionTarget: true,
    latestSignal: { text: "VP of AV Engineering viewed your ADAS sales page", time: "2 hours ago", type: "page_view" },
    keyInitiatives: ["Super Cruise ADAS expansion", "Cruise autonomous fleet", "ADAS safety platform"],
    valueProposition: "NVIDIA DRIVE platform enables GM to accelerate ADAS development cycles by 3x while reducing simulation costs.",
    useCase: "End-to-end ADAS development: perception training, simulation, and in-vehicle inference using NVIDIA DRIVE Orin.",
    estimatedOpportunity: "$15M–$25M",
    contactsList: [
      { name: "David Richardson", title: "VP Autonomous Vehicle Engineering", role: "Decision Maker", enriched: true, engagement: "Email opened" },
      { name: "Maria Lopez", title: "Director ADAS & Safety Systems", role: "Technical Influencer", enriched: true, engagement: "Page view" },
    ],
    missingPersonas: ["IT Architecture Lead"],
  },
  {
    id: "d2", name: "Manufacturing & Supply Chain", fullName: "Manufacturing & Supply Chain",
    stage: "Expansion Target", stageIcon: "◎", stageColor: "#f59e0b",
    contacts: 1, personasNeeded: 3, coverage: 33,
    salesPage: null, salesPageUrl: null,
    isExpansionTarget: true,
    latestSignal: { text: "GM posted 3 AI/ML Engineer roles in Manufacturing", time: "2 days ago", type: "job_posting" },
    keyInitiatives: ["Predictive maintenance AI", "Quality control automation", "Digital factory twins"],
    valueProposition: "",
    useCase: "",
    estimatedOpportunity: "",
    contactsList: [
      { name: "James Chen", title: "Manufacturing Ops Director", role: "LOB Owner", enriched: false, engagement: "No engagement" },
    ],
    missingPersonas: ["VP of AI/ML", "IT Architecture Lead"],
  },
  {
    id: "d3", name: "IT Infrastructure & AI Platform", fullName: "IT Infrastructure & AI Platform",
    stage: "Strategic Platform", stageIcon: "★", stageColor: "#3b82f6",
    contacts: 2, personasNeeded: 3, coverage: 67,
    salesPage: "live", salesPageUrl: "/go/gm-it-nvidia",
    isExpansionTarget: false,
    latestSignal: { text: "mark.haener@gm.com viewed IT page (3rd time this week)", time: "Today", type: "page_view" },
    keyInitiatives: ["Enterprise AI platform", "GPU compute infrastructure", "MLOps pipeline"],
    valueProposition: "NVIDIA DGX platform provides GM's centralized AI infrastructure, enabling all divisions to train and deploy models.",
    useCase: "Enterprise GPU compute cluster for centralized AI training, serving ADAS, Manufacturing, and Engineering divisions.",
    estimatedOpportunity: "$5M–$10M",
    contactsList: [
      { name: "Mark Haener", title: "VP AI Platform Engineering", role: "Decision Maker", enriched: true, engagement: "3 page views" },
      { name: "Sarah Kim", title: "IT Architecture Lead", role: "Technical Evaluator", enriched: true, engagement: "Email opened" },
    ],
    missingPersonas: ["LOB Owner"],
  },
  {
    id: "d4", name: "Vehicle Engineering & Simulation", fullName: "Vehicle Engineering & Simulation",
    stage: "Expansion Target", stageIcon: "◎", stageColor: "#f59e0b",
    contacts: 2, personasNeeded: 3, coverage: 67,
    salesPage: null, salesPageUrl: null,
    isExpansionTarget: true,
    latestSignal: { text: "VP of Simulation posted about digital twin initiatives", time: "3 days ago", type: "linkedin_activity" },
    keyInitiatives: ["Crash simulation", "Digital twin platforms", "Virtual prototyping"],
    valueProposition: "",
    useCase: "",
    estimatedOpportunity: "",
    contactsList: [
      { name: "Alex Nguyen", title: "VP Vehicle Engineering", role: "Decision Maker", enriched: false, engagement: "No engagement" },
      { name: "Priya Srinivasan", title: "Director Simulation & Digital Twins", role: "Technical Influencer", enriched: false, engagement: "No engagement" },
    ],
    missingPersonas: ["IT Architecture Lead"],
  },
  {
    id: "d5", name: "Software-Defined Vehicle", fullName: "Software-Defined Vehicle & Connected Services",
    stage: "Emerging", stageIcon: "◦", stageColor: "#6b7280",
    contacts: 1, personasNeeded: 3, coverage: 33,
    salesPage: null, salesPageUrl: null,
    isExpansionTarget: false,
    latestSignal: { text: "GM announces partnership with Qualcomm for next-gen cockpits", time: "1 day ago", type: "news" },
    keyInitiatives: ["In-vehicle compute", "Connected services", "OTA update platform"],
    valueProposition: "",
    useCase: "",
    estimatedOpportunity: "",
    contactsList: [
      { name: "Tom Bradley", title: "SDV Platform Lead", role: "Technical Evaluator", enriched: false, engagement: "No engagement" },
    ],
    missingPersonas: ["VP of SDV", "LOB Owner"],
  },
];

const RECENT_SIGNALS = [
  { id: "s1", icon: "📊", type: "EARNINGS CALL", color: "#a855f7", title: "Mary Barra mentioned $2B AV investment", division: "Autonomous Driving & ADAS", divisionId: "d1", time: "3 hours ago", isExpansion: true },
  { id: "s2", icon: "💼", type: "JOB POSTING", color: "#f59e0b", title: "3 AI/ML Engineer roles posted in Manufacturing", division: "Manufacturing & Supply Chain", divisionId: "d2", time: "2 days ago", isExpansion: true },
  { id: "s3", icon: "👁", type: "PAGE VIEW", color: "#22c55e", title: "mark.haener@gm.com viewed IT page (3rd time)", division: "IT Infrastructure", divisionId: "d3", time: "Today", isExpansion: false },
];


// ═══════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════

const T = {
  page: "#0b1120",
  surface: "rgba(15,23,42,0.6)",
  elevated: "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.9))",
  cardV: "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(30,41,59,0.9))",
  nav: "rgba(15,23,42,0.8)",
  borderSubtle: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.06)",
  borderMed: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.12)",
  borderAccent: "rgba(59,130,246,0.3)",
  textPrimary: "#e2e8f0",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  textFaint: "#475569",
  blue: "#3b82f6",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
  purple: "#8b5cf6",
  cyan: "#0ea5e9",
  pink: "#ec4899",
  gradientBrand: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
  gradientCta: "linear-gradient(135deg, #3b82f6, #2563eb)",
  hover: "rgba(255,255,255,0.03)",
  inputBg: "rgba(255,255,255,0.04)",
};

function StageBadge({ stage, color, icon }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, color, letterSpacing: "0.06em", textTransform: "uppercase" }}>
      <span style={{ fontSize: 11 }}>{icon}</span> {stage}
    </span>
  );
}

function CoverageMini({ value, size = "sm" }) {
  const color = value >= 60 ? T.green : value >= 30 ? T.amber : T.red;
  const h = size === "sm" ? 4 : 6;
  return (
    <div>
      <div style={{ height: h, background: "rgba(255,255,255,0.05)", borderRadius: h/2, overflow: "hidden", width: "100%" }}>
        <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: h/2, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

function Btn({ children, variant = "primary", onClick, style: sx = {}, full }) {
  const base = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 6, padding: "7px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease", fontFamily: "'DM Sans', sans-serif", border: "none", width: full ? "100%" : "auto", ...sx };
  if (variant === "primary") return <button style={{ ...base, background: T.gradientCta, color: "#fff" }} onClick={onClick} onMouseEnter={e => e.target.style.transform="scale(1.02)"} onMouseLeave={e => e.target.style.transform="none"}>{children}</button>;
  if (variant === "secondary") return <button style={{ ...base, background: "transparent", color: T.textMuted, border: `1px solid ${T.borderMed}` }} onClick={onClick} onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor=T.borderStrong; }} onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.borderColor=T.borderMed; }}>{children}</button>;
  if (variant === "ghost") return <button style={{ ...base, background: "transparent", color: T.textFaint, padding: "7px 10px" }} onClick={onClick} onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.04)"; e.currentTarget.style.color=T.textSecondary; }} onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textFaint; }}>{children}</button>;
  return <button style={base} onClick={onClick}>{children}</button>;
}

function Card({ children, style: sx = {}, hover = false, accent }) {
  const ref = useRef(null);
  const cardStyle = {
    background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20,
    transition: "all 0.2s ease", ...(accent ? { borderLeft: `3px solid ${accent}` } : {}), ...sx,
  };
  return (
    <div ref={ref} style={cardStyle}
      onMouseEnter={e => { if (hover) { e.currentTarget.style.borderColor = T.borderStrong; e.currentTarget.style.transform = "translateY(-1px)"; } }}
      onMouseLeave={e => { if (hover) { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = "none"; } }}
    >{children}</div>
  );
}

function SectionHeader({ title, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: T.textSecondary, letterSpacing: "0.06em", textTransform: "uppercase" }}>{title}</h2>
      {right && <div style={{ fontSize: 11, color: T.textFaint }}>{right}</div>}
    </div>
  );
}

function DivisionFilter({ divisions, selected, onChange }) {
  return (
    <select
      value={selected}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: "6px 32px 6px 12px", background: T.inputBg, color: T.textSecondary,
        border: `1px solid ${T.borderMed}`, borderRadius: 8, fontSize: 11, cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif", appearance: "none",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2364748b' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
      }}
    >
      <option value="all">All Divisions</option>
      {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
    </select>
  );
}

function EmptyField({ label, placeholder }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{
        padding: "10px 14px", background: T.inputBg, border: `1px dashed ${T.borderMed}`, borderRadius: 8,
        fontSize: 12, color: T.textFaint, cursor: "pointer", transition: "all 0.15s ease",
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderAccent; e.currentTarget.style.color = T.textMuted; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderMed; e.currentTarget.style.color = T.textFaint; }}
      >{placeholder}</div>
    </div>
  );
}

function FilledField({ label, value }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{
        padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: `1px solid ${T.borderSubtle}`, borderRadius: 8,
        fontSize: 12, color: T.textSecondary, lineHeight: 1.5,
      }}>{value}</div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// TAB: OVERVIEW
// ═══════════════════════════════════════════════════════════

function OverviewTab({ divisions, selectedDivision, onSelectDivision }) {
  const filteredDivisions = selectedDivision === "all" ? divisions : divisions.filter(d => d.id === selectedDivision);
  const filteredSignals = selectedDivision === "all" ? RECENT_SIGNALS : RECENT_SIGNALS.filter(s => s.divisionId === selectedDivision);

  return (
    <div style={{ padding: "24px 0" }}>
      {/* Company Header Card */}
      <Card style={{ marginBottom: 20, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: T.textPrimary }}>{COMPANY.name}</h1>
              <span style={{ fontSize: 10, fontWeight: 600, color: T.green, background: "rgba(34,197,94,0.12)", padding: "2px 8px", borderRadius: 20 }}>✅ AI Researched</span>
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 12, color: T.textMuted, flexWrap: "wrap" }}>
              <span>{COMPANY.domain}</span>
              <span>·</span>
              <span>{COMPANY.industry}</span>
              <span>·</span>
              <span>{COMPANY.totalContacts} contacts</span>
              <span>·</span>
              <span>{COMPANY.employees} employees</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[
              { label: "Current ARR", value: "$0", color: T.textMuted },
              { label: "Expansion Opportunity", value: "$45M", color: T.green },
              { label: "Target ARR", value: "$45M", color: T.blue },
            ].map((m, i) => (
              <div key={i} style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: T.textMuted, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Objective Bar */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        border: `1px solid rgba(59,130,246,0.2)`, borderRadius: 12, padding: "14px 20px", marginBottom: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: T.gradientBrand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🎯</div>
          <div>
            <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>ROADMAP OBJECTIVE</div>
            <div style={{ fontSize: 14, color: T.textPrimary, fontWeight: 600, marginTop: 2 }}>{OBJECTIVE.goalText}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          {[
            { l: "Landed", v: OBJECTIVE.progress.landed, t: OBJECTIVE.targetCount, c: T.green },
            { l: "Active", v: OBJECTIVE.progress.active, c: T.amber },
            { l: "Monitoring", v: OBJECTIVE.progress.monitoring, c: T.textMuted },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.c }}>{s.v}{s.t !== undefined && <span style={{ fontSize: 12, color: T.textFaint }}>/{s.t}</span>}</div>
              <div style={{ fontSize: 10, color: T.textMuted }}>{s.l}</div>
            </div>
          ))}
          <div style={{ width: 100 }}>
            <div style={{ fontSize: 10, color: T.textFaint, marginBottom: 4, textAlign: "right" }}>{OBJECTIVE.progress.landed}/{OBJECTIVE.targetCount}</div>
            <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.max((OBJECTIVE.progress.landed/OBJECTIVE.targetCount)*100, 3)}%`, background: "linear-gradient(90deg, #3b82f6, #22c55e)", borderRadius: 3 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Division Cards */}
      <SectionHeader title="Divisions" right={`${filteredDivisions.length} division${filteredDivisions.length !== 1 ? "s" : ""} · ${filteredDivisions.filter(d=>d.isExpansionTarget).length} expansion targets`} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14, marginBottom: 28 }}>
        {filteredDivisions.map(d => {
          const covColor = d.coverage >= 60 ? T.green : d.coverage >= 30 ? T.amber : T.red;
          const pageLabel = d.salesPage === "live" ? { t: "LIVE", c: T.green } : d.salesPage === "placeholder" ? { t: "PLACEHOLDER", c: T.amber } : { t: "Not started", c: T.textFaint };
          return (
            <div key={d.id} style={{
              background: T.cardV, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16,
              transition: "all 0.2s ease", cursor: "pointer", position: "relative", overflow: "hidden",
            }}
              onClick={() => onSelectDivision(d.id)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderAccent; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
            >
              {d.isExpansionTarget && (
                <div style={{ position: "absolute", top: 0, right: 0, background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000", fontSize: 9, fontWeight: 700, padding: "3px 10px 3px 14px", borderBottomLeftRadius: 8, letterSpacing: "0.04em" }}>EXPANSION</div>
              )}
              <StageBadge stage={d.stage} color={d.stageColor} icon={d.stageIcon} />
              <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, lineHeight: 1.3, margin: "10px 0", minHeight: 38 }}>{d.name}</div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.textSecondary, marginBottom: 4 }}>
                <span>Contacts: {d.contacts}/{d.personasNeeded}</span>
                <span style={{ color: covColor, fontWeight: 600 }}>{d.coverage}%</span>
              </div>
              <CoverageMini value={d.coverage} />

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 10, marginBottom: 4 }}>
                <span style={{ color: T.textMuted }}>Sales page</span>
                <span style={{ color: pageLabel.c, fontWeight: 600, fontSize: 10, letterSpacing: "0.04em" }}>{pageLabel.t}</span>
              </div>

              {d.latestSignal && (
                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: "8px 10px", marginTop: 10, borderLeft: `2px solid ${d.stageColor}` }}>
                  <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 2 }}>Latest signal</div>
                  <div style={{ fontSize: 11, color: T.textSecondary, lineHeight: 1.4 }}>{d.latestSignal.text}</div>
                  <div style={{ fontSize: 10, color: T.textFaint, marginTop: 3 }}>{d.latestSignal.time}</div>
                </div>
              )}

              <Btn variant="secondary" full style={{ marginTop: 12 }}>
                {d.contacts === 0 ? "Research Division" : "View Division →"}
              </Btn>
            </div>
          );
        })}
      </div>

      {/* Recent Signals */}
      {filteredSignals.length > 0 && (
        <>
          <SectionHeader title="Recent Signals" right={`${filteredSignals.length} signals`} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredSignals.map(s => (
              <Card key={s.id} hover accent={s.color} style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 14 }}>{s.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: s.color, textTransform: "uppercase" }}>{s.type}</span>
                  <span style={{ fontSize: 11, color: T.textFaint, marginLeft: "auto" }}>{s.time}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, marginBottom: 4 }}>{s.title}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.textSecondary }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.isExpansion ? T.amber : T.blue }} />
                  {s.division}
                </div>
                {s.isExpansion && (
                  <div style={{ fontSize: 10, color: T.amber, marginTop: 6, fontWeight: 500 }}>↗ Expansion target for your objective</div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <Btn>View Signal</Btn>
                  <Btn variant="secondary">View in Division</Btn>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// TAB: BUYING GROUPS
// ═══════════════════════════════════════════════════════════

function BuyingGroupsTab({ divisions, selectedDivision }) {
  const filtered = selectedDivision === "all" ? divisions : divisions.filter(d => d.id === selectedDivision);
  const researched = filtered.filter(d => d.valueProposition).length;

  return (
    <div style={{ padding: "24px 0" }}>
      {/* Segmentation Strategy */}
      <Card style={{ marginBottom: 24, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary, marginBottom: 8 }}>Segmentation Strategy</h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: T.blue, background: "rgba(59,130,246,0.12)", padding: "2px 10px", borderRadius: 20, letterSpacing: "0.04em" }}>HYBRID</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: T.purple, background: "rgba(139,92,246,0.12)", padding: "2px 10px", borderRadius: 20, letterSpacing: "0.04em" }}>ENTERPRISE EXPANSION</span>
            </div>
            <p style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.6 }}>
              GM is a large, complex organization with distinct business segments and a strong focus on strategic technological initiatives.
              A hybrid approach targets key functional departments, ensuring value propositions and use cases are tailored to their specific projects and budget authorities.
            </p>
          </div>
          <div style={{ textAlign: "center", padding: "12px 20px", background: "rgba(255,255,255,0.02)", borderRadius: 10 }}>
            <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>Divisions Researched</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: researched === filtered.length ? T.green : T.amber }}>{researched}<span style={{ fontSize: 14, color: T.textFaint }}>/{filtered.length}</span></div>
          </div>
        </div>
      </Card>

      {/* Division Strategy Cards */}
      <SectionHeader title="Divisions" right={
        <Btn variant="secondary" style={{ fontSize: 11 }}>Research All Divisions</Btn>
      } />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filtered.map(d => {
          const covColor = d.coverage >= 60 ? T.green : d.coverage >= 30 ? T.amber : T.red;
          return (
            <Card key={d.id} style={{ padding: 0, overflow: "hidden" }}>
              {/* Division Header */}
              <div style={{ padding: "16px 24px", borderBottom: `1px solid ${T.borderSubtle}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary }}>{d.fullName}</h3>
                  <StageBadge stage={d.stage} color={d.stageColor} icon={d.stageIcon} />
                  {d.isExpansionTarget && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#000", background: "linear-gradient(135deg, #f59e0b, #d97706)", padding: "2px 8px", borderRadius: 4, letterSpacing: "0.04em" }}>EXPANSION TARGET</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: T.textMuted }}>Contacts</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>{d.contacts}<span style={{ color: T.textFaint, fontSize: 11 }}>/{d.personasNeeded}</span></div>
                  </div>
                  <div style={{ width: 80 }}>
                    <div style={{ fontSize: 10, color: covColor, fontWeight: 600, textAlign: "right", marginBottom: 3 }}>{d.coverage}%</div>
                    <CoverageMini value={d.coverage} />
                  </div>
                </div>
              </div>

              {/* Division Body — 2 column */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                {/* Left: Strategy fields */}
                <div style={{ padding: 24, borderRight: `1px solid ${T.borderSubtle}` }}>
                  {d.valueProposition
                    ? <FilledField label="Value Proposition" value={d.valueProposition} />
                    : <EmptyField label="Value Proposition" placeholder="Click to add — why does NVIDIA matter for this division?" />
                  }
                  {d.useCase
                    ? <FilledField label="Use Case" value={d.useCase} />
                    : <EmptyField label="Use Case" placeholder="Click to add use case" />
                  }
                  {d.estimatedOpportunity
                    ? <FilledField label="Estimated Opportunity" value={d.estimatedOpportunity} />
                    : <EmptyField label="Estimated Opportunity" placeholder="Click to add estimated opportunity" />
                  }
                  {d.keyInitiatives.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Key Initiatives</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {d.keyInitiatives.map((k, i) => (
                          <span key={i} style={{ fontSize: 10, color: T.textSecondary, background: "rgba(255,255,255,0.04)", padding: "3px 10px", borderRadius: 20, border: `1px solid ${T.borderSubtle}` }}>{k}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Contacts + missing personas */}
                <div style={{ padding: 24 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Buying Group Contacts</div>
                  {d.contactsList.map((c, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < d.contactsList.length - 1 ? `1px solid ${T.borderSubtle}` : "none" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: c.enriched ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: c.enriched ? T.blue : T.textFaint, flexShrink: 0 }}>
                        {c.name.split(" ").map(n=>n[0]).join("")}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.textPrimary }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: T.textMuted }}>{c.title}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: c.role === "Decision Maker" ? T.blue : c.role === "Technical Influencer" ? T.purple : T.textMuted }}>{c.role}</div>
                        <div style={{ fontSize: 10, color: c.engagement !== "No engagement" ? T.green : T.textFaint }}>{c.engagement}</div>
                      </div>
                    </div>
                  ))}

                  {d.missingPersonas.length > 0 && (
                    <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(239,68,68,0.06)", border: `1px dashed rgba(239,68,68,0.2)`, borderRadius: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: T.red, letterSpacing: "0.04em", marginBottom: 6 }}>MISSING PERSONAS</div>
                      {d.missingPersonas.map((p, i) => (
                        <div key={i} style={{ fontSize: 11, color: T.textSecondary, padding: "2px 0" }}>• {p}</div>
                      ))}
                      <Btn style={{ marginTop: 10, fontSize: 10, padding: "5px 12px" }}>Find Contacts</Btn>
                    </div>
                  )}
                </div>
              </div>

              {/* Division Footer — latest signal */}
              {d.latestSignal && (
                <div style={{ padding: "12px 24px", borderTop: `1px solid ${T.borderSubtle}`, display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.01)" }}>
                  <span style={{ fontSize: 10, color: T.textMuted }}>Latest signal:</span>
                  <span style={{ fontSize: 11, color: T.textSecondary }}>{d.latestSignal.text}</span>
                  <span style={{ fontSize: 10, color: T.textFaint, marginLeft: "auto" }}>{d.latestSignal.time}</span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// MAIN: TARGET COMPANY PAGE WITH TABS
// ═══════════════════════════════════════════════════════════

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "buying-groups", label: "Buying Groups" },
  { key: "contacts", label: "Contacts" },
  { key: "content", label: "Content" },
  { key: "engagement", label: "Engagement" },
  { key: "signals", label: "Signals" },
];

export default function TargetCompanyPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedDivision, setSelectedDivision] = useState("all");

  const divisionName = selectedDivision === "all" ? null : DIVISIONS.find(d => d.id === selectedDivision)?.name;

  return (
    <div style={{ minHeight: "100vh", background: T.page, color: T.textPrimary, fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>

      {/* Top Nav */}
      <div style={{
        background: T.nav, backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${T.borderSubtle}`,
        padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: T.gradientBrand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff" }}>A</div>
          <span style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary }}>AgentPilot</span>
        </div>
        <div style={{ display: "flex", gap: 24, fontSize: 13, color: T.textMuted }}>
          <span style={{ cursor: "pointer" }}>Dashboard</span>
          <span style={{ cursor: "pointer" }}>Your Sales Map</span>
          <span style={{ color: T.textPrimary, fontWeight: 600 }}>Target Accounts</span>
          <span style={{ cursor: "pointer" }}>Analytics</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #22c55e, #16a34a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>N</div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div style={{ padding: "12px 24px", fontSize: 12, color: T.textMuted, display: "flex", gap: 8 }}>
        <span style={{ color: T.blue, cursor: "pointer" }}>Dashboard</span>
        <span>/</span>
        <span style={{ color: T.blue, cursor: "pointer" }}>General Motors Company</span>
        <span>/</span>
        <span style={{ color: T.textSecondary }}>{TABS.find(t => t.key === activeTab)?.label}</span>
        {divisionName && (
          <>
            <span>/</span>
            <span style={{ color: T.amber, fontWeight: 500 }}>{divisionName}</span>
          </>
        )}
      </div>

      {/* Tab Bar + Division Filter */}
      <div style={{ padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.borderSubtle}` }}>
        <div style={{ display: "flex", gap: 0 }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "12px 20px", fontSize: 14, fontWeight: activeTab === tab.key ? 600 : 500,
                color: activeTab === tab.key ? T.blue : T.textMuted,
                borderBottom: `2px solid ${activeTab === tab.key ? T.blue : "transparent"}`,
                background: "none", border: "none", borderTop: "none", borderLeft: "none", borderRight: "none",
                cursor: "pointer", transition: "all 0.15s ease",
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={e => { if (activeTab !== tab.key) e.target.style.color = T.textSecondary; }}
              onMouseLeave={e => { if (activeTab !== tab.key) e.target.style.color = T.textMuted; }}
            >
              {tab.label}
              {selectedDivision !== "all" && (tab.key === "contacts" || tab.key === "content" || tab.key === "engagement" || tab.key === "signals") && (
                <span style={{ display: "inline-flex", alignItems: "center", background: "rgba(59,130,246,0.12)", color: T.blue, fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 10, marginLeft: 6 }}>
                  {divisionName?.split(" ")[0]}
                </span>
              )}
            </button>
          ))}
        </div>
        <DivisionFilter divisions={DIVISIONS} selected={selectedDivision} onChange={setSelectedDivision} />
      </div>

      {/* Tab Content */}
      <div style={{ padding: "0 24px", maxWidth: 1200, margin: "0 auto" }}>
        {activeTab === "overview" && (
          <OverviewTab divisions={DIVISIONS} selectedDivision={selectedDivision} onSelectDivision={setSelectedDivision} />
        )}
        {activeTab === "buying-groups" && (
          <BuyingGroupsTab divisions={DIVISIONS} selectedDivision={selectedDivision} />
        )}
        {activeTab === "contacts" && (
          <div style={{ padding: "48px 0", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>👥</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.textSecondary, marginBottom: 8 }}>Contacts Tab</div>
            <div style={{ fontSize: 12, color: T.textMuted, maxWidth: 320, margin: "0 auto", lineHeight: 1.5 }}>
              Apply the same dark theme pattern. List/Map view toggle. Division filter shared from URL state. See Spec 2 for full requirements.
            </div>
          </div>
        )}
        {activeTab === "content" && (
          <div style={{ padding: "48px 0", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>📄</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.textSecondary, marginBottom: 8 }}>Content Tab</div>
            <div style={{ fontSize: 12, color: T.textMuted, maxWidth: 320, margin: "0 auto", lineHeight: 1.5 }}>
              Three sub-tabs: Content Library, Create Content, Sales Pages. Signal context pre-loading. Division filter. See Spec 2 for full requirements.
            </div>
          </div>
        )}
        {activeTab === "engagement" && (
          <div style={{ padding: "48px 0", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>📈</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.textSecondary, marginBottom: 8 }}>Engagement Tab</div>
            <div style={{ fontSize: 12, color: T.textMuted, maxWidth: 320, margin: "0 auto", lineHeight: 1.5 }}>
              Metrics table + activity timeline. Division filter. No "Run play" CTAs. See Spec 2 for full requirements.
            </div>
          </div>
        )}
        {activeTab === "signals" && (
          <div style={{ padding: "48px 0", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>📡</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.textSecondary, marginBottom: 8 }}>Signals Tab</div>
            <div style={{ fontSize: 12, color: T.textMuted, maxWidth: 320, margin: "0 auto", lineHeight: 1.5 }}>
              Signal cards with Plan status, match transparency, division tags. See Spec 2 + Spec 3 Gap 1 for full requirements.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
