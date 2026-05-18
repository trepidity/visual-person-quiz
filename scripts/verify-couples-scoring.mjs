#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = mkdtempSync(path.join(tmpdir(), 'couples-scoring-verify-'));
const tscBin = path.join(repoRoot, 'node_modules', '.bin', 'tsc');
const require = createRequire(import.meta.url);

function logCheck(message) {
  console.log(`✓ ${message}`);
}

try {
  execFileSync(
    tscBin,
    [
      '--ignoreConfig',
      '--module',
      'commonjs',
      '--target',
      'ES2020',
      '--moduleResolution',
      'node',
      '--ignoreDeprecations',
      '6.0',
      '--esModuleInterop',
      '--skipLibCheck',
      '--strict',
      '--noEmitOnError',
      'true',
      '--rootDir',
      repoRoot,
      '--outDir',
      outDir,
      'lib/couples-questions.ts',
      'lib/couples-scoring.ts',
    ],
    { cwd: repoRoot, stdio: 'inherit' },
  );

  const questionsModule = require(path.join(outDir, 'lib', 'couples-questions.js'));
  const scoring = require(path.join(outDir, 'lib', 'couples-scoring.js'));
  const { couplesQuestions, emptyLensScores } = questionsModule;

  const c3 = couplesQuestions.find((question) => question.id === 'c3_predict_partner_first_grab');
  assert.ok(c3, 'C3 exists');
  for (const option of c3.options) {
    assert.deepEqual(option.scores, emptyLensScores(), `C3 option ${option.id} should have empty scores`);
  }
  const syntheticC3 = {
    ...c3,
    options: c3.options.map((option, index) => ({
      ...option,
      scores: { ...emptyLensScores(), objectCategory: index + 1 },
    })),
  };
  const syntheticC3Max = scoring.maxLensScoresForQuestions([syntheticC3]);
  assert.deepEqual(syntheticC3Max, emptyLensScores(), 'partnerPrediction max-score contribution should be excluded');
  logCheck('C3 contributes zero and is excluded from max-score normalization');

  const alternateAnswers = scoring.enrichCouplesAnswers(
    { c1_image_first_grab: scoring.alternateCouplesAnswerId },
    {},
    couplesQuestions,
    { requireComplete: false, alternateAnswers: { c1_image_first_grab: 'None of these fit how I saw it.' } },
  );
  const alternateProfile = scoring.profileFromLensScores(scoring.scoreCouplesAnswers(alternateAnswers), alternateAnswers);
  assert.equal(alternateProfile.topLenses.length, 0, 'alternate/freeform-only answer should not produce top lenses');
  assert.equal(alternateAnswers[0].freeformText, 'None of these fit how I saw it.');
  logCheck('Alternate free-form answer is stored but does not affect scoring');

  const regularNoteAnswers = scoring.enrichCouplesAnswers(
    { c1_image_first_grab: 'main-object' },
    {},
    couplesQuestions,
    { requireComplete: false, alternateAnswers: { c1_image_first_grab: 'Horse, but with more emphasis on motion.' } },
  );
  assert.equal(regularNoteAnswers[0].answerId, 'main-object');
  assert.equal(regularNoteAnswers[0].freeformText, 'Horse, but with more emphasis on motion.');
  assert.ok(scoring.scoreCouplesAnswers(regularNoteAnswers).objectCategory > 0, 'regular answer note should preserve selected-answer scoring');
  logCheck('Free-form context can be attached to any selected answer without changing its scoring');

  const c9OnlyAnswers = scoring.enrichCouplesAnswers(
    { c9_imagery_band: 'vivid' },
    {},
    couplesQuestions,
    { requireComplete: false },
  );
  const c9OnlyProfile = scoring.profileFromLensScores(scoring.scoreCouplesAnswers(c9OnlyAnswers), c9OnlyAnswers);
  assert.equal(c9OnlyProfile.topLenses.length, 0, 'C9-only profile should not produce top lenses');
  assert.equal(c9OnlyProfile.imageryBand, 'vivid');
  logCheck('C9 alone cannot place a lens in topLenses');

  const partnerAObjectAnswers = {
    c1_image_first_grab: 'main-object',
    c2_image_describe_first: 'name-central-thing',
    c3_predict_partner_first_grab: 'surrounding-scene',
    c4_shared_memory_first: 'sequence',
    c5_assumed_obvious: 'topic',
    c6_explain_location_to_new_person: 'example',
    c7_translation_help: 'concrete-example',
    c8_output_format: 'diagram',
    c9_imagery_band: 'vivid',
    c10_crossed_wire_repair: 'name-main-thing',
  };

  const partnerBSceneAnswers = {
    c1_image_first_grab: 'surrounding-scene',
    c2_image_describe_first: 'set-scene',
    c3_predict_partner_first_grab: 'main-object',
    c4_shared_memory_first: 'scene-snapshot',
    c5_assumed_obvious: 'context',
    c6_explain_location_to_new_person: 'surrounding-context',
    c7_translation_help: 'more-context',
    c8_output_format: 'scene-setting',
    c9_imagery_band: 'absent',
    c10_crossed_wire_repair: 'give-context',
  };

  const partnerA = scoring.buildCouplesProfile(partnerAObjectAnswers);
  const partnerB = scoring.buildCouplesProfile(partnerBSceneAnswers);
  const report = scoring.comparePairProfiles({
    pairId: 'fixture-pair',
    participants: [
      { role: 'partner_a', profile: partnerA.profile, answers: partnerA.answers },
      { role: 'partner_b', profile: partnerB.profile, answers: partnerB.answers },
    ],
  });

  const objectSceneMove = report.translationMoves.find((move) => move.pattern === 'object_vs_scene');
  assert.ok(objectSceneMove, 'object_vs_scene translation move exists');
  assert.equal(
    objectSceneMove.forPartnerA,
    'After naming the main thing, add one sentence of surrounding context.',
    'object-leaning Partner A should receive object-facing copy',
  );
  assert.equal(
    objectSceneMove.forPartnerB,
    'Name the central object or decision earlier, then add the scene around it.',
    'scene-leaning Partner B should receive scene-facing copy',
  );
  logCheck('Object-vs-scene reciprocal copy assigns correctly');

  assert.match(
    report.assumedSimilarity.body,
    /both of you predicted each other closely/i,
    'exact C3 prediction matches should produce close-match copy',
  );
  logCheck('Exact C3 prediction match sets assumed-similarity close-match copy');

  assert.ok(
    report.differences.some((difference) => difference.pattern === 'different_repair_moves'),
    'C10 repair mismatch should surface different_repair_moves',
  );
  logCheck('C10 repair mismatch triggers different_repair_moves');

  const splitAnswers = scoring.enrichCouplesAnswers(
    {
      c5_assumed_obvious: 'topic',
      c7_translation_help: 'more-context',
      c8_output_format: 'walkthrough',
      c10_crossed_wire_repair: 'show-layout',
    },
    {},
    couplesQuestions,
    { requireComplete: false },
  );
  const splitProfile = scoring.profileFromLensScores(scoring.scoreCouplesAnswers(splitAnswers), splitAnswers);
  assert.notEqual(splitProfile.confidence, 'clear', 'split repeated communication/repair answers should not be clear');
  logCheck('Split C5/C7/C8/C10 fixture does not produce false clear confidence');

  const reportText = JSON.stringify(report);
  assert.match(reportText, /in this round/i, 'report should use round-language');
  assert.deepEqual(scoring.findBannedPairReportTerms(reportText), [], 'report should avoid banned language');
  logCheck('Generated report uses round language and avoids banned terms');

  console.log('All couples scoring fixture checks passed.');
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
