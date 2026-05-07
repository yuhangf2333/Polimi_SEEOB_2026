"use client";

import Image from "next/image";
import { useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Database,
  Mail,
  Map,
  Menu,
  Search,
  Sparkles,
  TramFront,
  X,
} from "@/components/icons";

const productName = "LIMEN";
const liveMapUrl = "/dashboard";

const heroTabs = [
  {
    label: "Decision outputs",
    image: "/images/milan/current-live-map-desktop.png",
    alt: "Live WebGIS screenshot showing the Intervention Priority map and explanation panel",
    panelTitle: "Priority cockpit",
    summary: "Transport Poverty Hotspot Score, Intervention Priority Index, Data Confidence, typology, and ranking.",
    stat: "56",
    statLabel: "intervention priority",
    items: ["Hotspot Score", "Priority Index", "Data Confidence", "Typology", "Suggested intervention"],
  },
  {
    label: "Diagnostic modules",
    image: "/images/milan/current-live-map-desktop.png",
    alt: "Live WebGIS screenshot used to explain diagnostic layer groups",
    panelTitle: "Four modules",
    summary: "Social vulnerability, public transport deficit, essential-services deficit, and EO territorial disadvantage.",
    stat: "4",
    statLabel: "input modules",
    items: ["Social vulnerability", "PT deficit", "Services deficit", "EO disadvantage", "Score breakdown"],
  },
  {
    label: "Hotspot card",
    image: "/images/milan/current-live-map-mobile.png",
    alt: "Mobile live WebGIS screenshot showing the hotspot interpretation card",
    panelTitle: "Selected area",
    summary: "A selected cell or hotspot should show drivers, scores, confidence, intervention family, KPIs, and report export.",
    stat: "87",
    statLabel: "data confidence",
    items: ["Dominant drivers", "EO typology", "Local validation", "Possible KPIs", "Report export"],
  },
  {
    label: "AI reporting",
    image: "/images/milan/current-live-map-desktop.png",
    alt: "Live WebGIS screenshot used to frame AI-assisted planning explanations",
    panelTitle: "Assistant layer",
    summary: "AI translates transparent geospatial scores into readable diagnosis, caveats, KPIs, and report paragraphs.",
    stat: "AI",
    statLabel: "explanation only",
    items: ["Plain-language diagnosis", "Rationale", "Caveats", "KPIs", "Report paragraph"],
  },
];

const sourceNames = [
  "Social Vulnerability",
  "PT Deficit",
  "Services Deficit",
  "EO Context",
  "Hotspot Score",
  "Priority Index",
];

const promptExamples = [
  "Explain why this hotspot is high priority",
  "Compare equity-first and mobility-network scenarios",
  "Write a report paragraph for the selected municipality",
];

const templateCards = [
  {
    image: "/images/milan/current-live-map-desktop.png",
    title: "Intervention Priority Map",
    text: "Decision output",
  },
  {
    image: "/images/milan/current-live-map-desktop.png",
    title: "Hotspot Explanation Card",
    text: "Selected-area view",
  },
  {
    image: "/images/milan/current-live-map-desktop.png",
    title: "Data Confidence Review",
    text: "Caveat layer",
  },
];

const faqs = [
  {
    question: `What is ${productName}?`,
    answer:
      "It is a WebGIS decision-support cockpit for transport poverty analysis and intervention prioritization. The goal is to help public decision-makers diagnose hotspots, understand drivers, rank priorities, and prepare policy-oriented summaries.",
  },
  {
    question: "Is this just a map viewer?",
    answer:
      "No. The briefing explicitly positions the product beyond a simple map viewer or a collection of unrelated indicators. The map is the interface, but the product logic is diagnosis, prioritization, typology, recommendation, and export.",
  },
  {
    question: "Which analytical modules power the platform?",
    answer:
      "The core modules are Social Vulnerability Index, Public Transport Deficit, Essential Services Deficit, and EO-Territorial Disadvantage. Accessibility layers are converted into deficit indicators so all components point in the same decision direction.",
  },
  {
    question: "What is the difference between Hotspot Score and Priority Index?",
    answer:
      "The Hotspot Score answers where transport poverty is likely to be severe. The Intervention Priority Index answers where a public actor should intervene first by adding exposed population, service criticality, feasibility, growth mismatch, and confidence adjustment.",
  },
  {
    question: "How should Earth Observation be used?",
    answer:
      "EO should be framed as a spatial intelligence layer. It adds continuous, comparable territorial context, supports areas with incomplete local data, and helps interpret mismatch typologies such as growth-transport mismatch or service-desert signals.",
  },
  {
    question: "What does the AI assistant do?",
    answer:
      "AI should not replace planning judgment. It receives structured scores, breakdowns, dominant drivers, confidence labels, typology, and caveats, then produces plain-language diagnosis, preliminary suggestions, validation needs, KPIs, and report-ready text.",
  },
];

export function MilanHomepage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);
  const activeTab = heroTabs[activeIndex];

  return (
    <main className="atlas-page milan-atlas-page milan-green-page">
      <Header />

      <section className="atlas-hero">
        <div className="atlas-hero__grid" aria-hidden="true" />
        <div className="atlas-container atlas-hero__inner">
          <h1 className="atlas-logo-heading">
            <LimenLogo className="atlas-logo-heading__image" preload />
          </h1>
          <p className="atlas-hero__lead">
            A WebGIS decision-support platform that combines social vulnerability, public transport deficit,
            essential-services deficit, and EO-derived territorial context to rank intervention priorities.
          </p>

          <div className="atlas-hero__buttons">
            <a className="atlas-btn" href={liveMapUrl}>
              Open live map
            </a>
          </div>

          <div className="atlas-tabs" role="tablist" aria-label={`${productName} layer demos`}>
            {heroTabs.map((tab, index) => (
              <button
                aria-selected={activeIndex === index}
                className="atlas-tabs__button"
                key={tab.label}
                onClick={() => setActiveIndex(index)}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="atlas-map-shell milan-map-shell">
            <Image
              className="atlas-map-shell__map"
              src={activeTab.image}
              alt={activeTab.alt}
              width={1440}
              height={1000}
              priority
              sizes="(max-width: 860px) 100vw, 1180px"
            />

            <aside className="atlas-map-card atlas-map-card--left">
              <h3>{activeTab.panelTitle}</h3>
              <LayerStatPanel tab={activeTab} />
            </aside>

            <aside className="atlas-map-card atlas-map-card--right">
              <div className="atlas-card-heading">
                <h3>Decision fields</h3>
                <span>{activeTab.label}</span>
              </div>
              <div className="atlas-task-list">
                {activeTab.items.map((item, index) => (
                  <div className="atlas-task" key={item}>
                    <b>{item}</b>
                    <small>{index < 2 ? "Primary output" : "Supporting evidence"}</small>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="atlas-logo-strip milan-source-strip">
        <p>THE PRODUCT LOGIC FROM THE TP-IPT TECHNICAL BRIEFING</p>
        <div className="milan-source-strip__track" aria-label="Analytical modules and outputs">
          {sourceNames.concat(sourceNames).map((name, index) => (
            <span key={`${name}-${index}`}>{name}</span>
          ))}
        </div>
      </section>

      <section className="atlas-section atlas-section--center" id="assistant">
        <div className="atlas-kicker">
          <Sparkles size={16} fill="currentColor" />
          EXPLANATION AND REPORTING ASSISTANT
        </div>
        <h2>Diagnose the hotspot. Explain the drivers. Rank the priority.</h2>
        <p className="atlas-section__lead">
          The AI layer should translate structured geospatial evidence into planning language, while transparent scores
          and local validation remain the basis for decisions.
        </p>

        <div className="atlas-prompt" aria-label="Example planning prompt">
          <span>
            <Sparkles size={17} fill="currentColor" />
          </span>
          <input readOnly value="Ask for a diagnosis, priority rationale, or report paragraph..." />
          <button aria-label="Submit prompt" type="button">
            <ArrowRight size={20} />
          </button>
        </div>

        <ul className="atlas-prompt-examples">
          {promptExamples.map((example) => (
            <li key={example}>{example}</li>
          ))}
        </ul>

        <p className="atlas-ai-footnote">
          The assistant is framed as explanation support, not as a black-box tool that replaces planners.
        </p>
      </section>

      <section className="atlas-section atlas-product">
        <h2>
          From transport poverty mapping
          <br />
          to intervention prioritization.
        </h2>

        <div className="atlas-feature-grid">
          <article className="atlas-feature-card atlas-feature-card--source">
            <div className="atlas-source-badge atlas-source-badge--top milan-source-badge">
              <Database size={18} />
              Input modules
            </div>
            <div className="atlas-window atlas-window--empty">
              <div className="atlas-window-dots">
                <span />
                <span />
                <span />
              </div>
              <div className="atlas-map-pulse">
                <Map size={34} />
              </div>
              <div className="atlas-source-badge atlas-source-badge--floating milan-source-badge">
                <Database size={18} />
                Normalizing SVI, PTD, ESD, EOTD...
              </div>
            </div>
            <h3>Four analytical families, one direction</h3>
            <p>Vulnerability, public transport, services, and EO context are harmonized into concern-oriented layers.</p>
          </article>

          <article className="atlas-feature-card">
            <div className="atlas-window milan-window-map">
              <div className="atlas-window-dots">
                <span />
                <span />
                <span />
              </div>
              <Image src="/images/milan/current-live-map-desktop.png" alt="Live decision output map" width={1440} height={1000} />
              <div className="atlas-property-chip">Priority 56 / 100</div>
            </div>
            <h3>One decision cockpit</h3>
            <p>Hotspot severity, priority, confidence, dominant drivers, and intervention logic stay on the same screen.</p>
          </article>

          <article className="atlas-feature-card">
            <div className="atlas-pipeline-card">
              <h4>Strategic priority check</h4>
              <small>Decision path</small>
              <div className="atlas-phase">
                <i />
                <i />
                <i />
                <i />
              </div>
              {["Severity map", "Exposed population", "Service criticality"].map((item) => (
                <label key={item}>
                  <span />
                  {item}
                </label>
              ))}
              <button type="button">Review priority class</button>
            </div>
            <h3>Priority is not the same as severity</h3>
            <p>The product separates problem identification from planning urgency, which is central to the briefing.</p>
          </article>

          <article className="atlas-feature-card">
            <div className="atlas-reporting-card">
              <div className="atlas-alert">
                <TramFront size={23} />
                <div>
                  <strong>Hotspot explanation ready</strong>
                  <span>Access to services and PT deficit are the strongest signals in this selected area</span>
                </div>
              </div>
              <div className="atlas-report-line" />
              <div className="atlas-email-node">
                <Mail size={20} />
                <span>Export report</span>
              </div>
            </div>
            <h3>Report-ready planning language</h3>
            <p>Selected hotspots can produce diagnosis, rationale, caveats, validation needs, KPIs, and export text.</p>
          </article>
        </div>
      </section>

      <section className="atlas-section atlas-collab">
        <div className="atlas-collab__copy">
          <h2>A planning-support product, not a black box.</h2>
          <p>
            EO data improves scalability and territorial interpretation, while social, transport, and service layers
            remain visible so planners can validate each recommendation.
          </p>
        </div>
        <div className="atlas-collab__screen milan-collab-screen">
          <Image
            src="/images/milan/current-live-map-desktop.png"
            alt={`${productName} live WebGIS decision cockpit`}
            width={1440}
            height={1000}
          />
        </div>
      </section>

      <section className="atlas-section atlas-templates">
        <div className="atlas-split-heading">
          <div>
            <h2>Start from the outputs decision-makers need.</h2>
            <p>
              The MVP should include hotspot maps, priority maps, data confidence, diagnostic layers, typology, hotspot
              cards, and downloadable report templates.
            </p>
          </div>
          <a className="atlas-btn" href={liveMapUrl}>
            View live viewer <ArrowRight size={18} />
          </a>
        </div>

        <div className="atlas-template-grid">
          {templateCards.map((card) => (
            <article className="atlas-template-card milan-template-card" key={card.title}>
              <Image src={card.image} alt="" width={540} height={320} />
              <div>
                <h3>{card.title}</h3>
                <p>
                  <Map size={15} /> {card.text}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="atlas-section atlas-get-started">
        <h2>
          From briefing logic to a <a href={liveMapUrl}>live WebGIS cockpit</a>.
        </h2>
        <div className="atlas-learning-grid">
          <article className="atlas-doc-card">
            <div className="atlas-search-card">
              <Search size={42} />
              Hotspot score
            </div>
            <div>
              <p>Transparent formulas</p>
              <h3>Scoring logic</h3>
              <a href={liveMapUrl}>
                Open viewer <ArrowRight size={15} />
              </a>
            </div>
          </article>
          <article className="atlas-academy-card milan-resource-card">
            <p>Selected-area view</p>
            <h3>Hotspot card</h3>
            <a href={liveMapUrl}>Inspect card</a>
            <button aria-label="Open hotspot card preview" type="button">
              <ArrowRight size={15} />
            </button>
          </article>
        </div>
        <article className="atlas-blueprints-card">
          <p>Step-by-step WebGIS roadmap</p>
          <h3>Prioritization Blueprint</h3>
          <a href={liveMapUrl}>
            Explore the MVP path <ArrowRight size={15} />
          </a>
        </article>
      </section>

      <section className="atlas-section atlas-faq">
        <h2>FAQ</h2>
        <div className="atlas-faq__list">
          {faqs.map((item, index) => (
            <article className="atlas-faq__item" key={item.question}>
              <button
                aria-expanded={openFaq === index}
                onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                type="button"
              >
                {item.question}
                <ChevronDown size={18} />
              </button>
              {openFaq === index ? <p>{item.answer}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <footer className="atlas-footer">
        <section className="atlas-footer__cta">
          <h2>Ready to inspect the intervention cockpit?</h2>
          <p>Open the viewer, switch outputs, and review the selected-area explanation.</p>
          <a className="atlas-footer__button" href={liveMapUrl}>
            Launch viewer <span>-&gt;</span>
          </a>
        </section>

        <div className="atlas-footer__links">
          <nav aria-label="Product links">
            <h3>PRODUCT</h3>
            <a href="#assistant">Explanation assistant</a>
            <a href={liveMapUrl}>Live map</a>
            <a href={liveMapUrl}>Computation roadmap</a>
          </nav>
          <nav aria-label="Analysis links">
            <h3>MODULES</h3>
            <a href={liveMapUrl}>Social vulnerability</a>
            <a href={liveMapUrl}>Public transport deficit</a>
            <a href={liveMapUrl}>Essential services deficit</a>
            <a href={liveMapUrl}>EO territorial disadvantage</a>
          </nav>
          <nav aria-label="Decision links">
            <h3>DECISIONS</h3>
            <a href={liveMapUrl}>Hotspot Score</a>
            <a href={liveMapUrl}>Priority Index</a>
            <a href={liveMapUrl}>Data Confidence</a>
          </nav>
          <nav aria-label="Project links">
            <h3>PROJECT</h3>
            <a href={liveMapUrl}>WebGIS viewer</a>
            <a href="#assistant">Prompt examples</a>
            <a href={liveMapUrl}>MVP workflow</a>
          </nav>
          <nav aria-label="Layer notes">
            <h3>BRIEFING LOGIC</h3>
            <a href={liveMapUrl}>Scenario weighting</a>
            <a href={liveMapUrl}>Hotspot typology</a>
            <a href={liveMapUrl}>Report export</a>
            <a href={liveMapUrl}>Local validation</a>
          </nav>
        </div>

        <div className="atlas-footer__bottom">
          <a className="atlas-logo" href="#">
            <span className="atlas-mark atlas-mark--milan" aria-hidden="true" />
            <LimenLogo className="atlas-footer-logo__image" />
          </a>
          <p>2026 / TP-IPT WebGIS decision-support homepage demo</p>
        </div>
      </footer>
    </main>
  );
}

function LayerStatPanel({ tab }: { tab: (typeof heroTabs)[number] }) {
  return (
    <>
      <button className="atlas-panel-button" type="button">
        Inspect output
      </button>
      <div className="atlas-donut milan-donut">
        <span>{tab.stat}</span>
        <small>{tab.statLabel}</small>
      </div>
      <p>{tab.summary}</p>
      {[
        ["Diagnostic", "Hotspot", "82%"],
        ["Decision", "Priority", "66%"],
        ["Confidence", "Strong", "87%"],
      ].map(([label, value, width]) => (
        <div className="atlas-priority" key={label}>
          <div>
            <span>{label}</span>
            <span>{value}</span>
          </div>
          <i style={{ width }} />
        </div>
      ))}
    </>
  );
}

function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="atlas-nav">
      <a className="atlas-logo" href="#">
        <LimenLogo className="atlas-logo__image" />
      </a>

      <nav className="atlas-nav__links" aria-label="Primary navigation">
        <a className="atlas-nav__link" href="#assistant">
          Product <ChevronDown size={14} />
        </a>
        <a className="atlas-nav__link" href={liveMapUrl}>
          Scoring <ChevronDown size={14} />
        </a>
        <a className="atlas-nav__link" href={liveMapUrl}>
          Live map
        </a>
        <a className="atlas-nav__link" href="#assistant">
          Briefing <ChevronDown size={14} />
        </a>
      </nav>

      <div className="atlas-nav__actions">
        <a href={liveMapUrl}>Roadmap</a>
        <a href={liveMapUrl}>Open viewer</a>
        <a className="atlas-btn atlas-btn--small" href={liveMapUrl}>
          Launch
        </a>
      </div>

      <button
        aria-expanded={open}
        aria-label="Toggle menu"
        className="atlas-nav__menu"
        onClick={() => setOpen(!open)}
        type="button"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {open ? (
        <div className="atlas-nav__mobile">
          <a href="#assistant" onClick={() => setOpen(false)}>
            Product
          </a>
          <a href={liveMapUrl} onClick={() => setOpen(false)}>
            Scoring
          </a>
          <a href={liveMapUrl} onClick={() => setOpen(false)}>
            Open viewer
          </a>
        </div>
      ) : null}
    </header>
  );
}

function LimenLogo({
  className,
  preload = false,
}: {
  className: string;
  preload?: boolean;
}) {
  return (
    <Image
      src="/images/limen.svg"
      alt={productName}
      width={380}
      height={90}
      unoptimized
      preload={preload}
      className={className}
    />
  );
}
