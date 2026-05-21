import { readFile } from "node:fs/promises";
import path from "node:path";

export type AnalysisAnswerMode =
  | "priority"
  | "intervention"
  | "validation"
  | "data_confidence"
  | "methodology"
  | "overview";

export type AnalysisResponseMode =
  | "diagnosis"
  | "nearest_relationship"
  | "intervention"
  | "comparison"
  | "methodology"
  | "validation"
  | "data_source"
  | "data_confidence"
  | "overview";

export type AnalysisResponseGuide = {
  mode: AnalysisResponseMode;
  objective: string;
  structure: string[];
  requiredEvidence: string[];
  tablePreference: string;
  styleRules: string[];
};

export type AnalysisKnowledgeEntry = {
  id: string;
  title: string;
  source: string;
  modes: AnalysisAnswerMode[];
  keywords: string[];
  questions: string[];
  content: string;
};

export type RetrievedAnalysisKnowledge = {
  answerMode: AnalysisAnswerMode;
  responseGuide: AnalysisResponseGuide;
  contextText: string;
  entries: Array<Pick<AnalysisKnowledgeEntry, "id" | "title" | "source" | "content">>;
};

type RetrieveAnalysisKnowledgeInput = {
  question: string;
  context?: unknown;
  limit?: number;
};

const CONCEPTUAL_QA_SOURCE = path.join(
  process.cwd(),
  "docs",
  "conceptual_questions_for_rag.txt",
);
const CONCEPTUAL_QA_SOURCE_NAME = "docs/conceptual_questions_for_rag.txt";

const ANALYSIS_KNOWLEDGE_ENTRIES: AnalysisKnowledgeEntry[] = [
  {
    id: "scoring-methodology",
    title: "TP-IPT scoring methodology",
    source: "final_scoring_methodology.md",
    modes: ["methodology", "priority", "overview"],
    keywords: [
      "formula",
      "calculated",
      "calculation",
      "ipi",
      "tphs",
      "dcs",
      "priority score",
      "methodology",
      "score",
    ],
    questions: [
      "How is the intervention priority score calculated?",
      "What does IPI mean?",
      "How should the scores be interpreted?",
    ],
    content:
      "The strict recalculated project methodology uses 100 m grids for computation, H3 resolution 9 for WebGIS visualization, and municipality as a dominant attribute. Core formulas include SVI = 0.20*Elderly + 0.20*Labour + 0.15*Education + 0.15*Citizenship + 0.20*Income + 0.10*LowCarAccess, PTD = 1 - PTA, ESD = 1 - ESA, EOTD = M * (0.45*SI + 0.25*DS + 0.20*GP + 0.10*DI), TPHS = min(100, 100*(0.40*SVI + 0.30*PTD + 0.20*ESD + 0.10*EOTD)*(1 + 0.20*min(SVI, PTD, ESD))), intervention_priority_formula_score (IPI raw formula score) = 100*(0.45*TPHS_norm + 0.20*VPE + 0.15*ESC + 0.10*FEAS + 0.10*GM)*CA, intervention_priority_score = full-map min-max normalize(intervention_priority_formula_score), DCS = 100*(0.35*source_completeness + 0.20*spatial_resolution + 0.20*temporal_freshness + 0.25*data_directness), and CA = 0.85 + 0.15*DCS/100.",
  },
  {
    id: "data-formula-cookbook",
    title: "Data and formula cookbook",
    source: "data/analysis/audit/formula_audit_summary.json",
    modes: ["methodology", "data_confidence", "overview"],
    keywords: [
      "data",
      "formula",
      "formulas",
      "calculate",
      "calculation",
      "score formula",
      "components",
      "variables",
      "render",
      "math",
      "latex",
      "svi",
      "social vulnerability",
      "ptd",
      "public transport deficit",
      "pta",
      "esd",
      "essential services deficit",
      "esa",
      "eotd",
      "eo territorial disadvantage",
      "tphs",
      "transport poverty hotspot score",
      "dcs",
      "data confidence score",
      "raw priority",
      "normalized priority",
      "intervention_priority_formula_score",
      "intervention_priority_score",
    ],
    questions: [
      "How are the data layers calculated?",
      "Show the formulas for every score.",
      "Which data variables feed each formula?",
      "How is SVI calculated?",
      "How is PTD calculated?",
      "How is ESD calculated?",
      "How is EOTD calculated?",
      "How is TPHS calculated?",
      "How is DCS calculated?",
      "How is intervention_priority_formula_score calculated?",
      "How is intervention_priority_score calculated?",
    ],
    content:
      "Use markdown display math delimiters for formulas so the WebGIS answer renderer can display them in a fixed formula viewport. Formula reference: $$SVI = 0.20 Elderly + 0.20 Labour + 0.15 Education + 0.15 Citizenship + 0.20 Income + 0.10 LowCarAccess$$. The SVI inputs are Elderly, Labour, Education, Citizenship, Income, and LowCarAccess; no-population cells are treated as no data in vulnerability displays. $$PTD = 1 - PTA$$ and the dashboard displays it on a 0-100 scale as $$PTD_{display} = 100(1 - PTA)$$. PTA is the normalized public transport accessibility signal derived from PTAL, frequency, line availability, hub access and PTAL/PTOL evidence. $$ESD = 1 - ESA$$ where ESA combines HealthAccess, SchoolAccess, JobAccess, and GroceryAccess. $$EOTD = M(0.45 SI + 0.25 DS + 0.20 GP + 0.10 DI)$$ where M is population demand, SI is settlement intensity, DS is development stress, GP is green protection deficit, and DI is network disadvantage. $$TPHS = min(100, 100(0.40 SVI + 0.30 PTD + 0.20 ESD + 0.10 EOTD)(1 + 0.20 min(SVI, PTD, ESD)))$$. $$intervention_priority_formula_score = 100(0.45 TPHS_norm + 0.20 VPE + 0.15 ESC + 0.10 FEAS + 0.10 GM)CA$$. $$intervention_priority_score = minmax(intervention_priority_formula_score)$$ across all visible H3 cells. $$DCS = 100(0.35 source_completeness + 0.20 spatial_resolution + 0.20 temporal_freshness + 0.25 data_directness)$$ and $$CA = 0.85 + 0.15 DCS/100$$. When explaining formulas, say which variables are direct measurements and which are proxies. When a user asks about one metric, answer only that metric, show one formula first, then list variables and the main caveat.",
  },
  {
    id: "data-source-catalog",
    title: "Data source catalog and use guide",
    source:
      "INDEX_ORGANIZATION_README.md; milan_metropolitan_ptal/README.md; milan_essential_services_accessibility/README.md; milan_eo_territorial_context/README.md; LAYER_CALCULATION_METHODS_CN.md",
    modes: ["data_confidence", "methodology", "overview", "validation"],
    keywords: [
      "data source",
      "data sources",
      "source",
      "sources",
      "provenance",
      "where from",
      "where does this data come from",
      "where do these data come from",
      "where do the dashboard data come from",
      "how to use",
      "use data",
      "how should these data be used",
      "data method",
      "data catalog",
      "\u6570\u636e\u6765\u6e90",
      "\u8fd9\u4e2a\u6570\u636e\u4ece\u54ea\u6765",
      "\u6570\u636e\u4ece\u54ea\u6765",
      "\u4ece\u54ea\u6765",
      "\u4ece\u54ea\u91cc\u6765",
      "\u6765\u6e90",
      "\u600e\u4e48\u7528",
      "\u5982\u4f55\u4f7f\u7528",
      "\u7528\u6cd5",
      "istat",
      "gtfs",
      "netex",
      "regione lombardia",
      "openstreetmap",
      "osm",
      "ghsl",
      "worldcover",
      "sdgsat",
      "pcnl",
      "mef",
      "aci",
    ],
    questions: [
      "Where do these data come from?",
      "Where does this data come from?",
      "What is the source of this data?",
      "How should I use these data?",
      "What are the data methods and caveats?",
      "\u8fd9\u4e2a\u6570\u636e\u4ece\u54ea\u6765\uff1f",
      "\u6570\u636e\u6765\u6e90\u662f\u4ec0\u4e48\uff1f",
      "\u8fd9\u4e9b\u6570\u636e\u600e\u4e48\u7528\uff1f",
    ],
    content:
      "Use this entry for simple provenance questions such as \"where does this data come from?\" or Chinese questions asking where the data come from or how to use them. The WebGIS does not display raw live feeds directly. Source data are cleaned, validated, computed on a 100 m grid, aggregated to H3 resolution 9 for WebGIS, and then joined to dashboard/report fields. Social vulnerability/SVI uses ISTAT 2023 census-section variables joined to ISTAT Lombardia 2021 census-section geometry; MEF/Dipartimento delle Finanze 2024 IRPEF income and ACI Autoritratto 2024 motorization are contextual/proxy supplements where used. Public transport/PTAL/PTOL/PTD uses official GTFS feeds from ATM/Comune di Milano/AMAT, Agenzia TPL Area di Milano operators Airpullman, Movibus, STAR Mobility and STAV, Agenzia TPL Area di Monza e Brianza NET, Regione Lombardia/Trenord rail GTFS, plus Lombardia NAP NeTEx supplement; the main service window is weekday 08:15-09:15 and missing feeds include Autoguidovie and STIE in relevant areas. Essential services uses Regione Lombardia/open data service records for healthcare structures, pharmacies, schools, jobs/local units and official large food retail, plus OpenStreetMap/Overpass grocery shops; current processed counts are 62 healthcare structures, 826 pharmacies, 1,341 schools, 106 official large food retail points, 2,446 OSM grocery points and 134 job municipalities. Jobs are municipality-level proxies, not workplace points. EO/territorial context uses GHSL GHS-POP 2025 100 m, GHSL GHS-BUILT-S 2000/2010/2020 100 m, ESA WorldCover 2021 10 m, PCNL 2024 night-time lights, GHS-SDGSAT-1 Po Plain stationary night-time lights 2022-2023, and OpenStreetMap road network via OSMnx. Route/stop dependency evidence is derived from GTFS/NeTEx stop-route-service records and walking-network nearest-grid relationships; it explains transit dependency and validation needs but does not replace the main score formula. Boundary/grid processing uses Citta Metropolitana di Milano boundary evidence from Regione Lombardia/open administrative sources or OSM/Nominatim relation 44881. How to use: treat the layers as screening and prioritization evidence, not final intervention proof; use them to locate hotspots, compare drivers, and decide what to validate locally. Always separate direct observations from proxies, and validate feed completeness, service-point currency/capacity, demographic assumptions, EO proxy interpretation and walking-network conditions before action.",
  },
  {
    id: "citywide-analysis-summary",
    title: "Citywide TP-IPT summary",
    source: "data/analysis/summary.json",
    modes: ["overview", "priority", "data_confidence"],
    keywords: [
      "citywide",
      "summary",
      "distribution",
      "how many",
      "high priority",
      "strategic priority",
      "typology",
      "hotspot",
    ],
    questions: [
      "What is the overall citywide pattern?",
      "How many high priority cells are there?",
      "What typologies dominate the results?",
    ],
    content:
      "The TP-IPT decision layer contains 15,547 H3 resolution 9 cells. Mean scores are Social Vulnerability Index 39.720, Public Transport Deficit 65.521, Essential Services Deficit 62.348, EO-Territorial Disadvantage Index 48.154, hotspot score 56.653, intervention priority formula score 42.882, full-map normalized intervention priority score 51.264, and data confidence score 89.284. Priority classes are distributed as Low Priority 45.46%, Medium Priority 40.12%, and High Priority 14.41%. The largest typologies are Monitor / Low Composite Need, B/C Network Mismatch, and Essential Services Desert.",
  },
  {
    id: "ptal-gtfs-netex-caveats",
    title: "Public transport accessibility evidence and caveats",
    source: "Public Transport Accessibility Index reports and data gap report",
    modes: ["data_confidence", "validation", "methodology"],
    keywords: [
      "ptal",
      "ptol",
      "gtfs",
      "netex",
      "transit",
      "public transport",
      "frequency",
      "headway",
      "caveat",
      "data gap",
      "missing feed",
    ],
    questions: [
      "What caveats affect PTAL and GTFS evidence?",
      "Can PTAL represent all-day service?",
      "Which transport evidence should be validated?",
    ],
    content:
      "Public transport accessibility is strongest for scheduled morning-peak service supply. The current stack uses official GTFS plus a Lombardia NAP NeTEx supplement because some official GTFS feeds were unavailable, including Autoguidovie and STIE in relevant Milan-area feeds. The main analysis window is weekday 08:15-09:15, so it should not be interpreted as all-day, evening, weekend, holiday, reliability, crowding, cancellation, or real-time accessibility. Null waiting and walking times mainly indicate zero-access or no accessible service cells, not necessarily file errors.",
  },
  {
    id: "essential-services-caveats",
    title: "Essential services accessibility evidence and caveats",
    source: "Essential Services Accessibility Index methodology",
    modes: ["data_confidence", "validation", "intervention"],
    keywords: [
      "essential services",
      "services",
      "healthcare",
      "schools",
      "grocery",
      "jobs",
      "distance",
      "accessibility",
      "poi",
    ],
    questions: [
      "What are the service accessibility limitations?",
      "How should jobs evidence be interpreted?",
      "What service evidence should be validated locally?",
    ],
    content:
      "Essential services data are available for healthcare, pharmacies, schools, grocery access, and municipality-level employment opportunity proxies. Jobs are not observed job locations and not travel-time reachable jobs. Grocery combines official large retail and OSM grocery points, so small-store coverage depends partly on volunteered data. Current service access uses straight-line distance thresholds rather than walking-network or transit-based travel time. Healthcare and schools are point-location evidence and do not yet model capacity, opening hours, eligibility, catchments, or service quality.",
  },
  {
    id: "social-vulnerability-caveats",
    title: "Social Vulnerability Index evidence and caveats",
    source: "Social Vulnerability Index sources and calculations",
    modes: ["data_confidence", "validation", "priority"],
    keywords: [
      "social vulnerability",
      "svi",
      "istat",
      "income",
      "motorization",
      "employment",
      "non-employment",
      "demographic",
    ],
    questions: [
      "How should SVI be interpreted?",
      "Is unemployment directly measured?",
      "What social vulnerability evidence is proxy-based?",
    ],
    content:
      "The Social Vulnerability Index layer is based on ISTAT-derived demographic indicators. The employment component is a non-employment or labour-fragility proxy, not an official unemployment rate. MEF 2024 income and ACI 2024 motorization exist as contextual supplements but are not direct 100 m SVI components. Extra-EU share is used for migrant vulnerability, but the project does not model language barriers, legal status, year of arrival, or detailed nationality groups.",
  },
  {
    id: "eo-territorial-caveats",
    title: "EO territorial context evidence and caveats",
    source: "milan_eo_territorial_context methodology",
    modes: ["data_confidence", "validation", "priority"],
    keywords: [
      "eo",
      "earth observation",
      "territorial",
      "night lights",
      "built-up",
      "ghsl",
      "worldcover",
      "road connectivity",
      "urban growth",
    ],
    questions: [
      "What does EO-Territorial Disadvantage Index mean?",
      "What caveats affect night lights and built-up evidence?",
      "Can road connectivity be treated as walkability?",
    ],
    content:
      "EO territorial context combines GHSL population and built-up epochs, ESA WorldCover land-cover shares, night-light products, and road-network context. PCNL 2024 night lights are too coarse for true neighbourhood-level lighting even when resampled to 100 m. GHSL population is modelled gridded population and does not replace ISTAT demographics. OSM road connectivity represents mapped network structure and should not be treated as observed walkability. Urban growth uses GHSL built-up epochs rather than custom Sentinel or Landsat change detection.",
  },
  {
    id: "city2graph-transit-dependency",
    title: "Transit route and stop dependency evidence",
    source: "GTFS-NeTEx dependency layer",
    modes: ["intervention", "validation", "data_confidence"],
    keywords: [
      "city2graph",
      "dependency",
      "redundancy",
      "primary route",
      "primary stop",
      "gtfs action",
      "transit dependency",
      "nearest",
      "closest",
      "walking access",
      "walking network",
      "\u6700\u8fd1",
      "\u6700\u8fd1\u7684\u5730\u65b9",
      "\u5173\u7cfb",
    ],
    questions: [
      "How should route and stop dependency evidence be used?",
      "Does transit dependency evidence change the ABCD score?",
      "What route or stop evidence matters?",
      "What are the nearest service and walking-network relationships?",
    ],
    content:
      "GTFS/NeTEx route and stop dependency evidence explains transit dependency and intervention logic. It does not replace or recalculate the ABCD scoring formula and should not be treated as a separate main score component. Use it to discuss route dependency, stop dependency, redundancy, feeder access, frequency checks, and local validation around the selected H3 or hotspot. When selected-coordinate walking evidence is available, use the nearest 100 m grid relationship to discuss closest healthcare, pharmacy, school, official food retail, OSM grocery, service walking distance, PTAL walking distance, detour ratios, and B/C service-PTAL mismatch.",
  },
  {
    id: "city2graph-nearest-walking-access",
    title: "Nearest walking-access relationships",
    source: "walking_network_bc_full nearest-grid layer",
    modes: ["overview", "intervention", "validation", "data_confidence"],
    keywords: [
      "nearest",
      "closest",
      "nearby",
      "walking access",
      "walking network",
      "service walking",
      "ptal walking",
      "detour",
      "pharmacy",
      "school",
      "healthcare",
      "grocery",
      "food retail",
      "mismatch",
      "\u6700\u8fd1",
      "\u6700\u8fd1\u7684",
      "\u6700\u8fd1\u5173\u7cfb",
      "\u9644\u8fd1",
      "\u836f\u5e97",
      "\u5b66\u6821",
      "\u533b\u7597",
      "\u8d85\u5e02",
      "\u670d\u52a1",
      "\u6b65\u884c",
    ],
    questions: [
      "What is the nearest pharmacy, school, healthcare, or grocery access?",
      "How far is the selected cell from service and PTAL by walking network?",
      "Is there a service/PTAL mismatch around this selected place?",
    ],
    content:
      "Nearest walking-access relationships are matched from the selected map coordinate to the nearest 100 m walking-network grid. They are useful for local interpretation: which essential services are closest, whether straight-line distance differs from walking-network distance, whether service access and PTAL access point in different directions, and whether the selected place has a B/C service-PTAL mismatch. Treat this as local relationship evidence for explanation and validation, not as a replacement for the overall score.",
  },
  {
    id: "intervention-sequencing",
    title: "Intervention sequencing logic",
    source: "AI hotspot cards and report logic",
    modes: ["intervention", "priority"],
    keywords: [
      "intervention",
      "recommendation",
      "what to do",
      "first",
      "sequence",
      "policy",
      "action",
      "kpi",
    ],
    questions: [
      "What intervention should come first?",
      "How should actions be sequenced?",
      "What KPIs should be tracked?",
    ],
    content:
      "Intervention sequencing should start from the dominant drivers and confidence level. Public Transport Deficit points to frequency, stop access, redundancy, feeder access, and service coverage validation before new infrastructure. Essential Services Deficit points to checking service POIs, opening hours, catchments, capacity, and walking-network access. Social Vulnerability Index requires checking whether affected groups are genuinely exposed to the transport or service gap. EO-Territorial Disadvantage Index should be used as context for growth, built-up intensity, isolation, or land-use mismatch rather than as a standalone prescription.",
  },
  {
    id: "local-validation-checklist",
    title: "Local validation checklist",
    source: "AI hotspot cards and final report caveats",
    modes: ["validation", "data_confidence", "intervention"],
    keywords: [
      "validate",
      "validation",
      "evidence",
      "check",
      "field",
      "local",
      "caveat",
      "confidence",
    ],
    questions: [
      "Which evidence should be validated?",
      "What should be checked before action?",
      "What local evidence is missing?",
    ],
    content:
      "Before turning a score into an intervention, validate GTFS/NeTEx route frequency, redundancy, and stop access; check essential service POIs against municipal records and recent changes; review vulnerable population assumptions with updated ISTAT or local demographic data; inspect right-of-way, safety, street constraints, and stakeholder feedback; and separate direct observations from proxy variables such as jobs, motorization, income, road connectivity, and EO activity.",
  },
  {
    id: "typology-interpretation",
    title: "Hotspot typology interpretation",
    source: "data/analysis/summary.json and hotspot cards",
    modes: ["priority", "intervention", "overview"],
    keywords: [
      "typology",
      "transport poverty hotspot",
      "essential-services desert",
      "dense underserved fringe",
      "active but disconnected",
      "growth-transport mismatch",
    ],
    questions: [
      "What does this typology mean?",
      "How should typology affect intervention?",
      "Which hotspot type is this?",
    ],
    content:
      "Project typologies are strict rule-based labels and include Mixed or lower-priority pattern, Essential-Services Desert, Growth-Transport Mismatch, Active but Disconnected, Dense Underserved Fringe, and Dispersed Rural Fragility. When multiple rules match, the strongest matching mechanism signal is used. Typology should guide the explanation and initial intervention family but should not replace the underlying score breakdown and local validation.",
  },
];

const RESPONSE_GUIDES: Record<AnalysisResponseMode, AnalysisResponseGuide> = {
  diagnosis: {
    mode: "diagnosis",
    objective: "Explain what is driving the selected area's priority signal.",
    structure: [
      "Start with one direct finding sentence.",
      "Use a compact evidence table with score, value, and planning meaning.",
      "Explain the dominant driver interaction in one short paragraph.",
      "End with one validation step when the evidence has caveats.",
    ],
    requiredEvidence: [
      "current scores",
      "score breakdown",
      "dominant drivers",
      "data confidence",
    ],
    tablePreference: "Use a markdown table for the evidence summary.",
    styleRules: [
      "Do not repeat a fixed heading set unless the user asks for a formal report.",
      "Do not overstate score evidence as a field observation.",
    ],
  },
  nearest_relationship: {
    mode: "nearest_relationship",
    objective: "Describe the selected place's nearby service, walking, route, and stop relationships.",
    structure: [
      "Start with the nearest relationship that most affects interpretation.",
      "Use a nearest relationship table for services and walking-network distances.",
      "Add route and stop dependency evidence only when available.",
      "Finish with what the relationship implies for intervention or validation.",
    ],
    requiredEvidence: [
      "nearest walking-access grid",
      "closest healthcare/pharmacy/school/food retail",
      "service and PTAL walking distance",
      "route and stop dependency when present",
    ],
    tablePreference: "Use one markdown table for nearest evidence and another only if route/stop dependency is needed.",
    styleRules: [
      "Distinguish nearest-grid evidence from H3-level score evidence.",
      "Do not invent a nearby place name if the data only provides distance.",
    ],
  },
  intervention: {
    mode: "intervention",
    objective: "Recommend a practical first action for the selected area.",
    structure: [
      "Open with the recommended first action.",
      "Explain why it comes before alternatives.",
      "Use a table for action, evidence, expected effect, and validation.",
      "Name one action that should wait if evidence is insufficient.",
    ],
    requiredEvidence: [
      "dominant drivers",
      "priority class",
      "score breakdown",
      "route/stop dependency or nearest access when available",
    ],
    tablePreference: "Use a markdown intervention table.",
    styleRules: [
      "Keep recommendations operational and tied to provided evidence.",
      "Avoid budget, timeline, or governance claims unless supplied.",
    ],
  },
  comparison: {
    mode: "comparison",
    objective: "Compare competing explanations, scores, or intervention options.",
    structure: [
      "Start with the comparison judgment in one sentence.",
      "Use a comparison table with evidence, signal, implication, and caveat.",
      "State which side is stronger and why.",
      "End with the evidence that would change the judgment.",
    ],
    requiredEvidence: [
      "score breakdown",
      "current scores",
      "relevant route/stop or nearest access evidence",
      "data caveats",
    ],
    tablePreference: "Use a markdown comparison table.",
    styleRules: [
      "Compare like with like: score evidence, dependency evidence, and nearest access are different evidence types.",
      "Do not force a winner when the evidence is mixed.",
    ],
  },
  methodology: {
    mode: "methodology",
    objective: "Explain how the project defines or calculates a metric.",
    structure: [
      "Give the formula or definition first.",
      "Explain how it is used in this dashboard.",
      "Add a short example using current values when available.",
      "Clarify what the metric does not measure.",
    ],
    requiredEvidence: [
      "methodology entry",
      "current metric value when available",
      "known caveats",
    ],
    tablePreference: "Use a table only when comparing multiple metrics.",
    styleRules: [
      "Keep formulas readable.",
      "Use markdown math delimiters for formulas, for example $PTD = 1 - PTA$ or $$EOTD = M(0.45 SI + 0.25 DS + 0.20 GP + 0.10 DI)$$.",
      "Separate methodology from policy interpretation.",
    ],
  },
  validation: {
    mode: "validation",
    objective: "Identify what must be checked before acting on the evidence.",
    structure: [
      "Start with the highest-risk evidence gap.",
      "Use a validation checklist table.",
      "Prioritize field checks and data checks separately.",
      "End with the minimum check needed before intervention.",
    ],
    requiredEvidence: [
      "data confidence",
      "known caveats",
      "route/stop/service evidence when relevant",
    ],
    tablePreference: "Use a markdown validation checklist table.",
    styleRules: [
      "Be specific about what to verify.",
      "Do not imply validation has already happened.",
    ],
  },
  data_confidence: {
    mode: "data_confidence",
    objective: "Explain reliability, caveats, and missing evidence.",
    structure: [
      "State the main confidence issue first.",
      "Use a caveat table for source, risk, and effect on interpretation.",
      "Separate proxy evidence from direct observations.",
      "Name the data that would reduce uncertainty.",
    ],
    requiredEvidence: [
      "data confidence score",
      "source caveats",
      "proxy variables",
    ],
    tablePreference: "Use a markdown caveat table.",
    styleRules: [
      "Do not bury caveats after the recommendation.",
      "Avoid generic uncertainty language.",
    ],
  },
  data_source: {
    mode: "data_source",
    objective: "Explain where the project data come from and how planners should use them.",
    structure: [
      "Start with one sentence naming the source families.",
      "Use a source-family table with source family, main inputs, processing/use, and main caveat.",
      "Separate direct observations from proxy variables.",
      "End with how planners should use the layers for screening and local validation.",
    ],
    requiredEvidence: [
      "source families",
      "processed grid/H3 workflow",
      "main caveat for each family",
      "proxy versus direct-observation distinction",
    ],
    tablePreference: "Use a markdown source-family table.",
    styleRules: [
      "Do not start with the data confidence score unless the user asks about confidence.",
      "Do not expose internal engine names; say route/stop dependency evidence instead.",
      "Keep the answer simple for provenance questions.",
    ],
  },
  overview: {
    mode: "overview",
    objective: "Give a compact project-grounded answer without forcing a rigid report.",
    structure: [
      "Answer the question directly.",
      "Use bullets or a small table only if it improves clarity.",
      "Tie the answer back to the selected dashboard context.",
      "Mention caveats only when they affect interpretation.",
    ],
    requiredEvidence: [
      "live dashboard context",
      "retrieved project knowledge",
    ],
    tablePreference: "Use a table for multi-part evidence, otherwise keep prose compact.",
    styleRules: [
      "Keep the tone natural.",
      "Do not over-template simple questions.",
    ],
  },
};

export async function retrieveAnalysisKnowledge({
  question,
  context,
  limit = 6,
}: RetrieveAnalysisKnowledgeInput): Promise<RetrievedAnalysisKnowledge> {
  const knowledgeEntries = await loadAnalysisKnowledgeEntries();
  const answerMode = detectAnswerMode(question);
  const responseGuide = RESPONSE_GUIDES[detectResponseMode(question, answerMode)];
  const query = `${question} ${flattenContextForSearch(context)}`;
  const selectedEntries = rankKnowledgeEntries(knowledgeEntries, query, question, answerMode)
    .slice(0, Math.max(1, limit))
    .map(({ entry }) => entry);
  const dashboardEntry = buildDashboardContextEntry(context);
  const entries = dashboardEntry
    ? [dashboardEntry, ...selectedEntries].slice(0, Math.max(1, limit + 1))
    : selectedEntries;

  return {
    answerMode,
    responseGuide,
    entries: entries.map(({ id, title, source, content }) => ({
      id,
      title,
      source,
      content,
    })),
    contextText: formatKnowledgeContext(entries),
  };
}

let conceptualKnowledgeEntriesPromise: Promise<AnalysisKnowledgeEntry[]> | null = null;

async function loadAnalysisKnowledgeEntries() {
  const conceptualEntries = await loadConceptualKnowledgeEntries();

  return conceptualEntries.length
    ? [...ANALYSIS_KNOWLEDGE_ENTRIES, ...conceptualEntries]
    : ANALYSIS_KNOWLEDGE_ENTRIES;
}

function loadConceptualKnowledgeEntries() {
  conceptualKnowledgeEntriesPromise ??= readFile(CONCEPTUAL_QA_SOURCE, "utf8")
    .then(parseConceptualKnowledgeEntries)
    .catch(() => []);

  return conceptualKnowledgeEntriesPromise;
}

function parseConceptualKnowledgeEntries(source: string): AnalysisKnowledgeEntry[] {
  return source
    .split(/\r?\n={10,}\r?\n/)
    .map(parseConceptualKnowledgeBlock)
    .filter((entry): entry is AnalysisKnowledgeEntry => Boolean(entry));
}

function parseConceptualKnowledgeBlock(block: string): AnalysisKnowledgeEntry | null {
  const idMatch = block.match(/\bCONCEPT-(\d{3})\b/);
  if (!idMatch) return null;

  const questions = readConceptualQuestions(block);
  const keywords = readConceptualKeywords(block);
  const answerZh = readConceptualAnswer(block, "answer_zh", "answer_en");
  const answerEn = readConceptualAnswer(block, "answer_en");
  if (!questions.length || (!answerEn && !answerZh)) return null;

  const id = `conceptual-${idMatch[1]}`;
  const content = [
    "Use this conceptual Q&A entry for broad project-definition questions.",
    questions.length ? `Matched questions: ${questions.join(" | ")}.` : "",
    answerEn ? `Answer: ${answerEn}` : "",
    answerZh ? `Chinese answer: ${answerZh}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id,
    title: `Conceptual Q&A ${idMatch[1]}: ${questions[0]}`,
    source: CONCEPTUAL_QA_SOURCE_NAME,
    modes: detectConceptualModes(keywords, questions, content),
    keywords,
    questions,
    content,
  };
}

function readConceptualKeywords(block: string) {
  const match = block.match(/^keywords:\s*(.+)$/m);
  return match
    ? match[1]
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean)
    : [];
}

function readConceptualQuestions(block: string) {
  const match = block.match(/^questions:\s*\r?\n([\s\S]*?)(?:\r?\nanswer_zh:|\r?\nanswer_en:)/m);
  if (!match) return [];

  return match[1]
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
}

function readConceptualAnswer(
  block: string,
  label: "answer_zh" | "answer_en",
  nextLabel?: "answer_en",
) {
  const pattern = nextLabel
    ? new RegExp(`^${label}:\\s*\\r?\\n([\\s\\S]*?)\\r?\\n${nextLabel}:`, "m")
    : new RegExp(`^${label}:\\s*\\r?\\n([\\s\\S]*)$`, "m");

  return pattern.exec(block)?.[1].trim().replace(/\s+/g, " ") ?? "";
}

function detectConceptualModes(
  keywords: string[],
  questions: string[],
  content: string,
): AnalysisAnswerMode[] {
  const searchable = normalizeSearchText(
    [...keywords, ...questions, content].join(" "),
  );
  const modes = new Set<AnalysisAnswerMode>();

  if (
    /\b(priority|hotspot|driver|typology|concern|high score|score direction)\b/.test(
      searchable,
    )
  ) {
    modes.add("priority");
  }

  if (/\b(intervention|policy|action|kpi|planning|planners|decision support)\b/.test(searchable)) {
    modes.add("intervention");
  }

  if (/\b(validate|validation|fieldwork|check|caveat|limitation|evidence grounded)\b/.test(searchable)) {
    modes.add("validation");
  }

  if (/\b(data|source|gtfs|netex|eo|proxy|confidence|reliability|resolution limits)\b/.test(searchable)) {
    modes.add("data_confidence");
  }

  if (
    /\b(definition|method|formula|calculate|calculation|score|index|h3|ptal|ptol|ptd|pta|svi|esd|esa|eotd|tphs|aggregation|population mask|report b)\b/.test(
      searchable,
    )
  ) {
    modes.add("methodology");
  }

  return modes.size ? Array.from(modes) : ["overview"];
}

function detectResponseMode(
  question: string,
  answerMode: AnalysisAnswerMode,
): AnalysisResponseMode {
  const normalized = question.toLowerCase();

  if (answerMode === "data_confidence" && isDataSourceQuestion(normalized)) {
    return "data_source";
  }

  if (
    /\b(nearest|closest|nearby|walking access|walking network|service walking|ptal walking|detour|pharmacy|school|healthcare|grocery|food retail|mismatch)\b/.test(normalized) ||
    normalized.includes("\u6700\u8fd1") ||
    normalized.includes("\u9644\u8fd1") ||
    normalized.includes("\u6b65\u884c") ||
    normalized.includes("\u836f\u5e97") ||
    normalized.includes("\u5b66\u6821")
  ) {
    return "nearest_relationship";
  }

  if (
    /\b(compare|comparison|versus|vs\.?|which is worse|which is stronger|mainly|transport deficit or|service access deficit|trade-off)\b/.test(normalized) ||
    normalized.includes("\u5bf9\u6bd4") ||
    normalized.includes("\u66f4\u50cf") ||
    normalized.includes("\u54ea\u4e2a")
  ) {
    return "comparison";
  }

  if (answerMode === "methodology") return "methodology";
  if (answerMode === "validation") return "validation";
  if (answerMode === "data_confidence") return "data_confidence";
  if (answerMode === "intervention") return "intervention";

  if (/\b(why|why is|problem|driver|drivers|diagnosis|high priority)\b/.test(normalized)) {
    return "diagnosis";
  }

  if (answerMode === "priority") return "diagnosis";

  return "overview";
}

function detectAnswerMode(question: string): AnalysisAnswerMode {
  const normalized = question.toLowerCase();

  if (isDataSourceQuestion(normalized)) {
    return "data_confidence";
  }

  if (/\b(formulas?|method|methodology|calculate|calculated|definition|what is|how is .+ score)\b/.test(normalized)) {
    return "methodology";
  }

  if (/\b(caveat|caveats|limitation|limitations|confidence|data gap|source|sources|proxy|missing|uncertain|quality)\b/.test(normalized)) {
    return "data_confidence";
  }

  if (/\b(validate|validation|check|verify|field|evidence should)\b/.test(normalized)) {
    return "validation";
  }

  if (/\b(intervention|recommend|what should|do first|action|policy|sequence|kpi)\b/.test(normalized)) {
    return "intervention";
  }

  if (/\b(priority|high priority|hotspot|why is|driver|drivers)\b/.test(normalized)) {
    return "priority";
  }

  return "overview";
}

function isDataSourceQuestion(normalizedQuestion: string) {
  return (
    /\bwhere\s+(?:do|does|did)\b.{0,120}\bdata\b.{0,120}\bcome\s+from\b/.test(normalizedQuestion) ||
    /\bwhere\b.{0,120}\bdata\b.{0,120}\bfrom\b/.test(normalizedQuestion) ||
    /\bhow\s+(?:should|do|can|to)\b.{0,120}\bdata\b.{0,120}\b(?:use|used|using)\b/.test(normalizedQuestion) ||
    /\bdata\s+(?:source|sources|provenance|origin|origins|catalog)\b/.test(normalizedQuestion) ||
    normalizedQuestion.includes("\u6570\u636e\u6765\u6e90") ||
    normalizedQuestion.includes("\u6570\u636e\u4ece") ||
    normalizedQuestion.includes("\u4ece\u54ea\u6765") ||
    normalizedQuestion.includes("\u4ece\u54ea\u91cc\u6765") ||
    normalizedQuestion.includes("\u6765\u6e90") ||
    normalizedQuestion.includes("\u600e\u4e48\u7528") ||
    normalizedQuestion.includes("\u5982\u4f55\u4f7f\u7528") ||
    normalizedQuestion.includes("\u7528\u6cd5")
  );
}

function rankKnowledgeEntries(
  entries: AnalysisKnowledgeEntry[],
  query: string,
  question: string,
  answerMode: AnalysisAnswerMode,
) {
  const queryTokens = tokenize(query);
  const normalizedQuestion = normalizeSearchText(question);

  return entries.map((entry) => {
    const searchable = [
      entry.id,
      entry.title,
      entry.source,
      entry.keywords.join(" "),
      entry.questions.join(" "),
      entry.content,
    ].join(" ");
    const searchableTokens = new Set(tokenize(searchable));
    let score = entry.modes.includes(answerMode) ? 4 : 0;

    for (const token of queryTokens) {
      if (searchableTokens.has(token)) score += 1;
    }

    for (const keyword of entry.keywords) {
      if (query.toLowerCase().includes(keyword.toLowerCase())) score += 3;
    }

    for (const entryQuestion of entry.questions) {
      const normalizedEntryQuestion = normalizeSearchText(entryQuestion);
      if (!normalizedEntryQuestion) continue;
      if (
        normalizedQuestion === normalizedEntryQuestion ||
        normalizedQuestion.includes(normalizedEntryQuestion) ||
        normalizedEntryQuestion.includes(normalizedQuestion)
      ) {
        score += 30;
      }
    }

    return { entry, score };
  })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score);
}

function buildDashboardContextEntry(context: unknown): AnalysisKnowledgeEntry | null {
  if (!context || typeof context !== "object") return null;

  const record = context as Record<string, unknown>;
  const scope = readRecord(record.scope);
  const scores = readRecord(record.scores);
  const diagnosis = readRecord(record.diagnosis);
  const city2graph = readRecord(record.city2graph);
  const scoreBreakdown = readRecord(record.score_breakdown);
  const parts = [
    scope
      ? `Scope: ${joinKnownValues([
          readString(scope.h3_id),
          readString(scope.municipality),
          readString(scope.area),
        ])}.`
      : "",
    scores
      ? `Current scores: intervention priority ${readNumber(scores.intervention_priority_score)}, hotspot ${readNumber(scores.hotspot_score)}, data confidence ${readNumber(scores.data_confidence_score)}.`
      : "",
    scoreBreakdown
      ? `Score breakdown: ${Object.entries(scoreBreakdown)
          .map(([key, value]) => `${key} ${readNumber(value)}`)
          .join("; ")}.`
      : "",
    diagnosis
      ? `Diagnosis: priority class ${readString(diagnosis.priority_class)}, hotspot class ${readString(diagnosis.hotspot_class)}, typology ${readString(diagnosis.typology)}, dominant drivers ${readString(diagnosis.dominant_drivers)}, suggested intervention ${readString(diagnosis.suggested_intervention_family)}.`
      : "",
    city2graph
      ? `Transit dependency evidence: ${readString(city2graph.transit_dependency_diagnosis)}, primary route ${readString(city2graph.primary_route_line)}, primary stop ${readString(city2graph.primary_stop_id)}, recommended GTFS action ${readString(city2graph.recommended_gtfs_action)}.`
      : "",
  ].filter(Boolean);

  if (!parts.length) return null;

  return {
    id: "live-dashboard-context",
    title: "Live selected dashboard context",
    source: "current dashboard selection",
    modes: ["priority", "intervention", "validation", "data_confidence", "overview"],
    keywords: [],
    questions: [],
    content: parts.join(" "),
  };
}

function formatKnowledgeContext(entries: AnalysisKnowledgeEntry[]) {
  return entries
    .map(
      (entry) =>
        `[${publicContextId(entry.id)}] ${entry.title}\nSource: ${entry.source}\n${entry.content}`,
    )
    .join("\n\n");
}

function publicContextId(id: string) {
  return id.replace(/city2graph/gi, "transit-dependency");
}

function flattenContextForSearch(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(flattenContextForSearch).join(" ");
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map(flattenContextForSearch)
      .join(" ");
  }
  return "";
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_\u4e00-\u9fff -]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function normalizeSearchText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_\u4e00-\u9fff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "n/a";
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Number(value.toFixed(3)).toString()
    : "n/a";
}

function joinKnownValues(values: string[]) {
  const knownValues = values.filter((value) => value !== "n/a");
  return knownValues.length ? knownValues.join(" / ") : "n/a";
}
