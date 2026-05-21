"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Database,
  Map,
  Satellite,
  Search,
  Sparkles,
  TramFront,
  UsersRound,
} from "@/components/icons";

const productName = "LIMEN";
const liveMapUrl = "/dashboard";
const captureRoot = "/images/milan/homepage-captures-fresh";

const heroTabs = [
  {
    label: "Decision outputs",
    image: `${captureRoot}/fresh-analysis-cockpit.png`,
    alt: "LIMEN analysis cockpit showing the Intervention Priority map, score breakdown, and recommendation panel",
    panelTitle: "TP-IPT cockpit",
    summary: "Hotspot severity, intervention priority, score breakdown, data confidence, and exportable recommendation stay in one decision view.",
    stat: "56",
    statLabel: "intervention priority",
    items: ["Priority Index", "Hotspot Score", "Data Confidence", "Dominant drivers", "Report export"],
  },
  {
    label: "Diagnostic modules",
    image: `${captureRoot}/fresh-transit-dependency.png`,
    alt: "GTFS and NeTEx dependency layer showing public transport diagnostic coverage across Milan",
    panelTitle: "Four modules",
    summary: "Social Vulnerability Index, Public Transport Deficit, Essential Services Deficit, and EO-Territorial Disadvantage Index are kept inspectable.",
    stat: "4",
    statLabel: "diagnostic modules",
    items: [
      "Social Vulnerability Index",
      "Public Transport Deficit",
      "Essential Services Deficit",
      "EO-Territorial Disadvantage Index",
      "Score breakdown",
    ],
  },
  {
    label: "Hotspot card",
    image: `${captureRoot}/fresh-report-dashboard.png`,
    alt: "Formal LIMEN report dashboard with priority, hotspot, confidence, funding fit, and decision narrative",
    panelTitle: "Hotspot card",
    summary: "Each hotspot needs location, severity, priority, drivers, typology, confidence, validation status, and intervention family.",
    stat: "73",
    statLabel: "funding fit",
    items: ["Location", "Priority rationale", "Typology", "Validation status", "Funding fit"],
  },
  {
    label: "AI reporting",
    image: `${captureRoot}/fresh-ai-recommended-questions.png`,
    alt: "AI reporting panel with recommended questions for priority evidence and hotspot explanation",
    panelTitle: "Bounded AI",
    summary: "AI converts structured evidence into planning language, caveats, validation needs, KPIs, and report-ready paragraphs.",
    stat: "AI",
    statLabel: "explanation layer",
    items: ["Diagnosis", "Priority rationale", "Caveats", "Validation needs", "Report paragraph"],
  },
];

const sourceNames = [
  "Social Vulnerability Index",
  "Public Transport Deficit",
  "Essential Services Deficit",
  "EO-Territorial Disadvantage Index",
  "Hotspot Score",
  "Intervention Priority",
  "Data Confidence",
  "Hotspot Typology",
];

const promptExamples = [
  "Explain why this hotspot is high priority",
  "Transport or service gap: which driver matters most?",
  "Write a report paragraph with caveats and validation needs",
];

const assistantHeadlines = [
  "Diagnose the hotspot. Explain the drivers. Rank the priority.",
  "Intelligence for Transport Poverty Analysis",
];

const templateCards = [
  {
    image: `${captureRoot}/fresh-priority-map.png`,
    title: "Priority ranking",
    text: "Which territories to investigate first",
  },
  {
    image: `${captureRoot}/fresh-hotspot-map.png`,
    title: "Hotspot severity",
    text: "Where transport poverty is structurally severe",
  },
  {
    image: `${captureRoot}/fresh-report-dashboard.png`,
    title: "Funding-readiness evidence",
    text: "Policy-ready narrative and validation path",
  },
];

const diagnosticModules = [
  {
    title: "Social Vulnerability Index",
    label: "Demand exposure",
    text: "Elderly population, labour fragility, education, citizenship, income, and motorisation vulnerability show where weak access has higher social consequences.",
    icon: UsersRound,
  },
  {
    title: "Public Transport Deficit",
    label: "Mobility supply",
    text: "GTFS and NeTEx stops, service frequency, line availability, hub access, and PTAL/PTOL logic are converted into concern-oriented deficit layers.",
    icon: TramFront,
  },
  {
    title: "Essential Services Deficit",
    label: "Opportunity access",
    text: "Healthcare, schools, jobs, and grocery accessibility move the product from transport coverage toward effective access to everyday needs.",
    icon: Database,
  },
  {
    title: "EO-Territorial Disadvantage Index",
    label: "Territorial observability",
    text: "Built-up density, land cover, population, night lights, roads, and growth pressure explain the spatial structure behind similar accessibility deficits.",
    icon: Satellite,
  },
];

const roadmapSteps = [
  {
    phase: "NOW",
    title: "Validate the buyer and service boundary",
    text: "Test the mock-up, product objects, pilot scope, and acceptable public-sector price range with buyers, users, and validators.",
  },
  {
    phase: "NEXT",
    title: "Deliver the first Milan peri-urban pilot",
    text: "Standardize data workflows, scoring logic, WebGIS components, hotspot cards, funding-readiness output, and validation workshop material.",
  },
  {
    phase: "LATER",
    title: "Scale as a repeatable service",
    text: "Reuse monitoring updates, thematic modules, territorial extensions, and regional benchmarking before moving toward broader SaaS packaging.",
  },
];

const faqs = [
  {
    question: `What is ${productName}?`,
    answer:
      "It is a WebGIS decision-support cockpit for transport poverty analysis and intervention prioritization. The goal is to help public decision-makers diagnose hotspots, understand drivers, rank priorities, and prepare policy-oriented summaries.",
  },
  {
    question: "Which analytical modules power the platform?",
    answer:
      "The core modules are Social Vulnerability Index, Public Transport Deficit, Essential Services Deficit, and EO-Territorial Disadvantage Index. Accessibility layers are converted into deficit indicators so all components point in the same decision direction.",
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
  {
    question: "How does validation fit the product?",
    answer:
      "Validation is part of the method. Local actors can confirm, correct, flag uncertainty, or mark hotspots as ready for planning discussion because EO, employment, income, service, and transport layers contain different proxy and freshness limits.",
  },
];

export function MilanHomepage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [assistantHeadlineIndex, setAssistantHeadlineIndex] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);
  const activeTab = heroTabs[activeIndex];

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setAssistantHeadlineIndex((currentIndex) => (currentIndex + 1) % assistantHeadlines.length);
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, []);

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
              width={1185}
              height={904}
              loading="eager"
              sizes="(max-width: 860px) 100vw, 1180px"
            />
          </div>
        </div>
      </section>

      <section className="atlas-logo-strip milan-source-strip">
        <p>THE PRODUCT LOGIC FROM THE TP-IPT TECHNICAL BRIEFING</p>
        <div className="milan-source-strip__viewport">
          <div className="milan-source-strip__track" aria-label="Analytical modules and outputs">
            {[0, 1].map((copy) => (
              <div className="milan-source-strip__group" key={copy} aria-hidden={copy === 1}>
                {sourceNames.map((name) => (
                  <span key={`${name}-${copy}`}>{name}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="atlas-section atlas-section--center" id="assistant">
        <div className="atlas-kicker">
          <Sparkles size={16} fill="currentColor" />
          EXPLANATION AND REPORTING ASSISTANT
        </div>
        <h2 className="milan-rotating-heading">
          <span className="milan-rotating-heading__text" key={assistantHeadlines[assistantHeadlineIndex]}>
            {assistantHeadlines[assistantHeadlineIndex]}
          </span>
        </h2>
        <p className="atlas-section__lead">
          The AI layer should translate structured geospatial evidence into planning language.
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

        <div className="milan-explanation-preview">
          <Image
            src={`${captureRoot}/fresh-ai-recommended-questions.png`}
            alt="AI explanation panel with recommended hotspot questions"
            width={1185}
            height={904}
            sizes="(max-width: 860px) 100vw, 980px"
          />
        </div>

      </section>

      <section className="atlas-section atlas-product" id="method">
        <h2>
          Four diagnostic modules
          <br />
          feed one prioritization engine.
        </h2>

        <div className="milan-module-grid">
          {diagnosticModules.map((module) => {
            const ModuleIcon = module.icon;

            return (
              <article className="milan-module-card" key={module.title}>
                <span>
                  <ModuleIcon size={22} />
                </span>
                <small>{module.label}</small>
                <h3>{module.title}</h3>
                <p>{module.text}</p>
              </article>
            );
          })}
        </div>

        <div className="atlas-feature-grid milan-feature-grid">
          <article className="atlas-feature-card">
            <div className="atlas-window milan-window-map">
              <Image
                src={`${captureRoot}/fresh-transit-dependency.png`}
                alt="GTFS and NeTEx dependency diagnostic layer"
                width={1185}
                height={904}
                sizes="(max-width: 860px) 100vw, 560px"
              />
              <div className="atlas-property-chip">GTFS/NeTEx dependency</div>
            </div>
            <h3>Diagnostics stay decomposable</h3>
            <p>Two places can share a high score for different reasons, so LIMEN keeps transport, services, vulnerability, and EO drivers visible.</p>
          </article>

          <article className="atlas-feature-card">
            <div className="atlas-window milan-window-map">
              <Image
                src={`${captureRoot}/fresh-services-gap.png`}
                alt="Essential service gap layer"
                width={1185}
                height={904}
                sizes="(max-width: 860px) 100vw, 560px"
              />
              <div className="atlas-property-chip">Essential service gap</div>
            </div>
            <h3>Access is not only transport supply</h3>
            <p>Transport poverty is a mismatch between vulnerable populations, public transport, and everyday opportunities.</p>
          </article>

          <article className="atlas-feature-card">
            <div className="atlas-window milan-window-map">
              <Image
                src={`${captureRoot}/milan-eo-territorial-context.png`}
                alt="Earth Observation territorial context map"
                width={2559}
                height={1397}
                sizes="(max-width: 860px) 100vw, 560px"
              />
              <div className="atlas-property-chip">EO territorial context</div>
            </div>
            <h3>EO explains territory, not poverty directly</h3>
            <p>Night lights, built-up form, land cover, roads, and growth pressure make peri-urban and fragmented territories comparable.</p>
          </article>

          <article className="atlas-feature-card">
            <div className="atlas-window milan-window-map">
              <Image
                src={`${captureRoot}/milan-priority-ranking.png`}
                alt="Intervention priority ranking dashboard"
                width={2170}
                height={1395}
                sizes="(max-width: 860px) 100vw, 560px"
              />
            </div>
            <h3>Ranking adds planning urgency</h3>
            <p>The Intervention Priority Index adds exposed population, service criticality, feasibility, growth mismatch, and confidence adjustment.</p>
          </article>
        </div>
      </section>

      <section className="atlas-section atlas-collab milan-product-objects" id="product-objects">
        <div className="atlas-collab__copy">
          <h2>Product objects, not loose indicators.</h2>
          <p>
            The WebGIS translates the TP-IPT engine into objects a public actor can use: diagnosis, ranking,
            explanation, validation, and report-ready evidence.
          </p>
        </div>
        <div className="atlas-collab__screen milan-collab-screen">
          <Image
            src={`${captureRoot}/fresh-report-dashboard.png`}
            alt={`${productName} report dashboard with funding-readiness and decision narrative`}
            width={1440}
            height={960}
            sizes="(max-width: 980px) 100vw, 720px"
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

      <section className="atlas-section atlas-get-started milan-roadmap" id="roadmap">
        <h2>Build, monitor, and explore Milan</h2>

        <div className="atlas-learning-grid milan-roadmap-grid">
          <article className="atlas-doc-card milan-scoring-card">
            <Image
              className="milan-roadmap-image"
              src={`${captureRoot}/fresh-score-formula.png`}
              alt="Score formula dialog over the LIMEN intervention priority dashboard"
              width={1920}
              height={1240}
              sizes="(max-width: 860px) 100vw, 720px"
            />
            <div className="milan-roadmap-image-overlay" />
            <div className="atlas-search-card milan-search-card">
              <Search size={42} />
              <span>Hotspot score</span>
            </div>
            <div>
              <p>Transparent formula</p>
              <h3>Scoring logic</h3>
              <a href={liveMapUrl}>
                Open viewer <ArrowRight size={15} />
              </a>
            </div>
          </article>

          <article className="atlas-academy-card milan-hotspot-card">
            <Image
              className="milan-roadmap-image"
              src={`${captureRoot}/fresh-hotspot-map.png`}
              alt="Selected-area hotspot card with map and score evidence"
              width={1920}
              height={1240}
              sizes="(max-width: 860px) 100vw, 540px"
            />
            <div className="milan-roadmap-image-overlay milan-roadmap-image-overlay--light" />
            <div>
              <p>Selected-area view</p>
              <h3>Hotspot card</h3>
              <a href={liveMapUrl}>
                Inspect card <ArrowRight size={15} />
              </a>
            </div>
          </article>

          <article className="atlas-blueprints-card milan-service-card">
            <p>Step-by-step WebGIS roadmap</p>
            <h3>Prioritization Blueprint</h3>
            <span>
              {roadmapSteps.map((step) => `${step.phase}: ${step.title}`).join(" / ")}
            </span>
            <a href={liveMapUrl}>
              Explore the MVP path <ArrowRight size={15} />
            </a>
          </article>
        </div>
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
            Launch viewer
          </a>
        </section>

        <div className="atlas-footer__links">
          <nav aria-label="Product links">
            <h3>PRODUCT</h3>
            <a href="#product-objects">Product objects</a>
            <a href="#assistant">Explanation assistant</a>
            <a href={liveMapUrl}>Live map</a>
            <a href="#roadmap">MVP roadmap</a>
          </nav>
          <nav aria-label="Analysis links">
            <h3>MODULES</h3>
            <a href={liveMapUrl}>Social Vulnerability Index</a>
            <a href={liveMapUrl}>Public Transport Deficit</a>
            <a href={liveMapUrl}>Essential Services Deficit</a>
            <a href={liveMapUrl}>EO-Territorial Disadvantage Index</a>
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
            <a href="#roadmap">Milan pilot sequence</a>
          </nav>
        </div>

        <div className="atlas-footer__bottom">
          <a className="atlas-logo" href="#">
            <LimenLogo className="atlas-footer-logo__image" />
          </a>
          <p>2026 SEEOB GROUP3 PROJECT</p>
        </div>
      </footer>
    </main>
  );
}

function Header() {
  return (
    <header className="atlas-nav">
      <a className="atlas-logo" href="#">
        <LimenLogo className="atlas-logo__image" />
      </a>

      <div className="atlas-nav__actions">
        <a className="atlas-btn atlas-btn--small" href={liveMapUrl}>
          Launch
        </a>
      </div>
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
      src="/images/night_limen.svg"
      alt={productName}
      width={380}
      height={90}
      unoptimized
      preload={preload}
      className={className}
    />
  );
}
