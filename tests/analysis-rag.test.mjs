import assert from "node:assert/strict";
import test from "node:test";

async function loadAnalysisRag() {
  try {
    return await import("../src/lib/analysis-rag.ts");
  } catch (error) {
    assert.fail(`analysis RAG module should load: ${error.message}`);
  }
}

test("retrieveAnalysisKnowledge finds project methodology for IPI questions", async () => {
  const { retrieveAnalysisKnowledge } = await loadAnalysisRag();

  const result = await retrieveAnalysisKnowledge({
    question: "How is the intervention priority score calculated?",
    context: {
      scores: {
        intervention_priority_score: 82.4,
        hotspot_score: 76.1,
        data_confidence_score: 87.3,
      },
    },
    limit: 4,
  });

  assert.equal(result.answerMode, "methodology");
  assert.equal(result.responseGuide.mode, "methodology");
  assert.ok(result.responseGuide.structure.some((item) => /formula/i.test(item)));
  assert.ok(
    result.entries.some((entry) => entry.id === "scoring-methodology"),
    "expected scoring methodology entry",
  );
  assert.match(result.contextText, /IPI/i);
  assert.match(result.contextText, /DCS/i);
});

test("retrieveAnalysisKnowledge uses strict recalculated TP-IPT formulas", async () => {
  const { retrieveAnalysisKnowledge } = await loadAnalysisRag();

  const result = await retrieveAnalysisKnowledge({
    question: "Show the strict formulas for TPHS, IPI, EOTD and DCS.",
    limit: 4,
  });

  assert.match(result.contextText, /EOTD = M \* \(0\.45\*SI \+ 0\.25\*DS \+ 0\.20\*GP \+ 0\.10\*DI\)/);
  assert.match(result.contextText, /1 \+ 0\.20\*min\(SVI, PTD, ESD\)/);
  assert.match(result.contextText, /intervention_priority_formula_score \(IPI raw formula score\) = 100\*\(0\.45\*TPHS_norm \+ 0\.20\*VPE \+ 0\.15\*ESC \+ 0\.10\*FEAS \+ 0\.10\*GM\)\*CA/);
  assert.match(result.contextText, /intervention_priority_score = full-map min-max normalize\(intervention_priority_formula_score\)/);
  assert.match(result.contextText, /\$\$PTD_\{display\} = 100\(1 - PTA\)\$\$/);
  assert.ok(result.responseGuide.styleRules.some((rule) => /markdown math delimiters/i.test(rule)));
  assert.doesNotMatch(result.contextText, /0\.60\*TPHS_norm/);
  assert.doesNotMatch(result.contextText, /1 \+ 0\.15\*min\(SVI, PTD, ESD\)/);
});

test("retrieveAnalysisKnowledge prioritizes the data formula cookbook for data questions", async () => {
  const { retrieveAnalysisKnowledge } = await loadAnalysisRag();

  const result = await retrieveAnalysisKnowledge({
    question: "How are the data layers calculated and how should formulas render?",
  });

  assert.equal(result.answerMode, "methodology");
  assert.equal(result.entries[0].id, "data-formula-cookbook");
  assert.match(result.contextText, /\$\$SVI = 0\.20 Elderly/);
  assert.match(result.contextText, /which variables are direct measurements and which are proxies/);
});

test("retrieveAnalysisKnowledge answers granular data formula questions one metric at a time", async () => {
  const { retrieveAnalysisKnowledge } = await loadAnalysisRag();

  const svi = await retrieveAnalysisKnowledge({
    question: "How is SVI calculated? Show the formula.",
    limit: 3,
  });
  const ptd = await retrieveAnalysisKnowledge({
    question: "How is PTD calculated? Show only the PTD formula.",
    limit: 3,
  });
  const dcs = await retrieveAnalysisKnowledge({
    question: "How is DCS calculated? Show only the DCS formula.",
    limit: 3,
  });

  for (const result of [svi, ptd, dcs]) {
    assert.equal(result.answerMode, "methodology");
    assert.equal(result.responseGuide.mode, "methodology");
    assert.equal(result.entries[0].id, "data-formula-cookbook");
  }

  assert.match(svi.contextText, /\$\$SVI = 0\.20 Elderly/);
  assert.match(svi.contextText, /Elderly, Labour, Education, Citizenship, Income, and LowCarAccess/);
  assert.match(ptd.contextText, /\$\$PTD = 1 - PTA\$\$/);
  assert.match(ptd.contextText, /\$\$PTD_\{display\} = 100\(1 - PTA\)\$\$/);
  assert.match(dcs.contextText, /\$\$DCS = 100\(0\.35 source_completeness/);
});

test("retrieveAnalysisKnowledge answers simple data provenance and use questions", async () => {
  const { retrieveAnalysisKnowledge } = await loadAnalysisRag();

  const result = await retrieveAnalysisKnowledge({
    question: "\u8fd9\u4e2a\u6570\u636e\u4ece\u54ea\u6765\uff1f\u600e\u4e48\u7528\uff1f",
    limit: 4,
  });

  assert.equal(result.answerMode, "data_confidence");
  assert.equal(result.responseGuide.mode, "data_source");
  assert.equal(result.entries[0].id, "data-source-catalog");
  assert.match(result.contextText, /ISTAT 2023/);
  assert.match(result.contextText, /official GTFS/);
  assert.match(result.contextText, /Regione Lombardia/);
  assert.match(result.contextText, /GHSL GHS-POP 2025/);
  assert.match(result.contextText, /100 m grid/);
  assert.doesNotMatch(result.contextText, /city2graph/i);
  assert.match(result.contextText, /route\/stop dependency evidence/i);
  assert.match(result.responseGuide.structure[0], /source families/i);
  assert.doesNotMatch(result.responseGuide.structure.join(" "), /main confidence issue/i);
});

test("retrieveAnalysisKnowledge includes conceptual RAG questions without relying on presets", async () => {
  const { retrieveAnalysisKnowledge } = await loadAnalysisRag();

  const transportPoverty = await retrieveAnalysisKnowledge({
    question: "What does transport poverty mean in this project?",
    limit: 3,
  });
  const nearbyStop = await retrieveAnalysisKnowledge({
    question: "If there is a stop nearby, why can PTD still be high?",
    limit: 3,
  });

  assert.equal(transportPoverty.answerMode, "overview");
  assert.equal(transportPoverty.entries[0].id, "conceptual-001");
  assert.match(transportPoverty.contextText, /combined diagnostic concept/i);
  assert.match(transportPoverty.contextText, /not one single variable/i);

  assert.equal(nearbyStop.entries[0].id, "conceptual-058");
  assert.match(nearbyStop.contextText, /nearby stop does not always mean good public transport/i);
  assert.match(nearbyStop.contextText, /PTAL\/PTOL component together/i);
});

test("retrieveAnalysisKnowledge routes Data preset source and use prompts to provenance guidance", async () => {
  const { retrieveAnalysisKnowledge } = await loadAnalysisRag();

  const result = await retrieveAnalysisKnowledge({
    question:
      "Where do the dashboard data come from? How should these data be used in planning?",
    limit: 4,
  });

  assert.equal(result.answerMode, "data_confidence");
  assert.equal(result.responseGuide.mode, "data_source");
  assert.equal(result.entries[0].id, "data-source-catalog");
  assert.match(result.contextText, /treat the layers as screening and prioritization evidence/);
  assert.doesNotMatch(result.contextText, /city2graph/i);
  assert.match(result.responseGuide.structure[0], /source families/i);
});

test("retrieveAnalysisKnowledge routes PTAL caveat questions to project evidence", async () => {
  const { retrieveAnalysisKnowledge } = await loadAnalysisRag();

  const result = await retrieveAnalysisKnowledge({
    question: "What caveats affect PTAL and GTFS evidence?",
    context: {
      city2graph: {
        recommended_gtfs_action:
          "Check frequency, redundancy and feeder access before new infrastructure.",
      },
    },
    limit: 4,
  });

  assert.equal(result.answerMode, "data_confidence");
  assert.ok(
    result.entries.some((entry) => entry.id === "ptal-gtfs-netex-caveats"),
    "expected PTAL GTFS caveats entry",
  );
  assert.match(result.contextText, /official GTFS/i);
  assert.match(result.contextText, /NeTEx/i);
});

test("retrieveAnalysisKnowledge includes selected dashboard signals for local questions", async () => {
  const { retrieveAnalysisKnowledge } = await loadAnalysisRag();

  const result = await retrieveAnalysisKnowledge({
    question: "What should we do first in this selected area?",
    context: {
      scope: {
        h3_id: "891f99d983bffff",
        municipality: "Arconate",
      },
      scores: {
        intervention_priority_score: 100,
        hotspot_score: 73.51,
        data_confidence_score: 87.3,
      },
      diagnosis: {
        dominant_drivers:
          "essential services deficit; public transport deficit; social vulnerability",
        suggested_intervention_family:
          "Target essential service access and validate PT frequency.",
      },
    },
    limit: 4,
  });

  assert.equal(result.answerMode, "intervention");
  assert.equal(result.responseGuide.mode, "intervention");
  assert.ok(result.responseGuide.requiredEvidence.includes("dominant drivers"));
  assert.match(result.contextText, /891f99d983bffff/);
  assert.match(result.contextText, /essential services deficit/i);
  assert.match(result.contextText, /Target essential service access/i);
});

test("retrieveAnalysisKnowledge prefers table answers for local planning questions", async () => {
  const { retrieveAnalysisKnowledge } = await loadAnalysisRag();

  const result = await retrieveAnalysisKnowledge({
    question: "What should be done first in this selected area?",
    context: {
      scores: {
        intervention_priority_score: 56,
        hotspot_score: 55,
        data_confidence_score: 87,
      },
      diagnosis: {
        dominant_drivers: "Essential Services Deficit; Public Transport Deficit",
        suggested_intervention_family:
          "Monitor service quality and interchange conditions.",
      },
    },
    limit: 4,
  });

  assert.equal(result.responseGuide.mode, "intervention");
  assert.ok(result.responseGuide.structure.some((item) => /table/i.test(item)));
  assert.match(result.responseGuide.tablePreference, /markdown intervention table/i);
});

test("retrieveAnalysisKnowledge keeps comparison questions on table format", async () => {
  const { retrieveAnalysisKnowledge } = await loadAnalysisRag();

  const result = await retrieveAnalysisKnowledge({
    question: "Compare transport and service gaps in a table.",
    context: {
      score_breakdown: {
        "Public Transport Deficit": 66,
        "Essential Services Deficit": 71,
      },
    },
    limit: 4,
  });

  assert.equal(result.responseGuide.mode, "comparison");
  assert.match(result.responseGuide.tablePreference, /comparison table/i);
});

test("retrieveAnalysisKnowledge finds nearest walking-access knowledge for local relationship questions", async () => {
  const { retrieveAnalysisKnowledge } = await loadAnalysisRag();

  const result = await retrieveAnalysisKnowledge({
    question: "\u6700\u8fd1\u7684\u836f\u5e97\u548c\u6b65\u884c\u5173\u7cfb\u662f\u4ec0\u4e48\uff1f",
    context: {
      scope: {
        h3_id: "891f99564c7ffff",
        municipality: "Milano",
        selected_coordinate: {
          longitude: 9.19,
          latitude: 45.47,
        },
      },
    },
    limit: 4,
  });

  assert.equal(result.responseGuide.mode, "nearest_relationship");
  assert.ok(
    result.responseGuide.requiredEvidence.includes("nearest walking-access grid"),
  );
  assert.ok(
    result.entries.some((entry) => entry.id === "city2graph-nearest-walking-access"),
    "expected nearest walking-access entry",
  );
  assert.match(result.contextText, /nearest 100 m walking-network grid/i);
  assert.match(result.contextText, /PTAL walking distance/i);
});

test("retrieveAnalysisKnowledge chooses a comparison template for trade-off questions", async () => {
  const { retrieveAnalysisKnowledge } = await loadAnalysisRag();

  const result = await retrieveAnalysisKnowledge({
    question: "Is this mainly a transport deficit or a service access deficit? Compare them in a table.",
    context: {
      scores: {
        intervention_priority_score: 76,
        hotspot_score: 68,
        data_confidence_score: 84,
      },
      score_breakdown: {
        "Public Transport Deficit": 72,
        "Essential Services Deficit": 81,
      },
    },
    limit: 4,
  });

  assert.equal(result.responseGuide.mode, "comparison");
  assert.ok(result.responseGuide.structure.some((item) => /comparison table/i.test(item)));
  assert.ok(result.responseGuide.requiredEvidence.includes("score breakdown"));
});
