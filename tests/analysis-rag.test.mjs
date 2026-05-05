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
        "PTAL deficit": 72,
        "Essential services deficit": 81,
      },
    },
    limit: 4,
  });

  assert.equal(result.responseGuide.mode, "comparison");
  assert.ok(result.responseGuide.structure.some((item) => /comparison table/i.test(item)));
  assert.ok(result.responseGuide.requiredEvidence.includes("score breakdown"));
});
