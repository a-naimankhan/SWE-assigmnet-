import { describe, it, expect } from 'vitest';
import samplesRaw from '../docs/evidence/practice11/prompt-samples.json?raw';
import { validateExplainOutput, type ExplainInput } from '@/ai/explain';

/**
 * Task #04: scores the saved samples for the three prompts.
 * Criteria: contract format (JSON {explanation}), automatic factual
 * agreement (validateExplainOutput) and a manual "unsupported claim" flag.
 */
const data = JSON.parse(samplesRaw) as {
  cases: Record<string, ExplainInput>;
  samples: Array<{ prompt: string; case: string; raw: string; unsupportedClaim: boolean }>;
};

function score(prompt: string) {
  const rows = data.samples.filter((s) => s.prompt === prompt).map((s) => {
    let parsed: unknown = null;
    let formatOk = false;
    try {
      parsed = JSON.parse(s.raw);
      formatOk = typeof parsed === 'object' && parsed !== null && 'explanation' in parsed;
    } catch {
      /* free text: breaks the {explanation} contract */
    }
    // Free text is judged on its wording, so wrap it the way an adapter would.
    const candidate = formatOk ? parsed : { explanation: s.raw };
    const validated = validateExplainOutput(candidate, data.cases[s.case]).ok;
    return { formatOk, validated, unsupported: s.unsupportedClaim };
  });
  return {
    n: rows.length,
    format: rows.filter((r) => r.formatOk).length,
    validator: rows.filter((r) => r.validated).length,
    unsupported: rows.filter((r) => r.unsupported).length,
  };
}

describe('prompt comparison (Task #04)', () => {
  it('p1 and p2 return free text, so they break the {explanation} contract', () => {
    expect(score('p1')).toMatchObject({ n: 4, format: 0 });
    expect(score('p2')).toMatchObject({ n: 4, format: 0 });
  });

  it('p1 contains an unsupported claim that the validator cannot catch', () => {
    expect(score('p1').unsupported).toBe(1);
    expect(score('p2').unsupported).toBe(0);
  });

  it('validator accepts all honest free-text samples (the "no ... overlaps" false positive is fixed)', () => {
    expect(score('p1').validator).toBe(4);
    expect(score('p2').validator).toBe(4);
  });

  it('p3 is fully contract-compliant, validator-clean and supported by the input', () => {
    expect(score('p3')).toEqual({ n: 4, format: 4, validator: 4, unsupported: 0 });
  });
});
