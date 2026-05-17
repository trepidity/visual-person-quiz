export type ExperimentArm = {
  id: string;
  label: string;
  description: string;
};

export type ExperimentAssignment = {
  name: string;
  arm: string;
  label: string;
  assignedAt: string;
  source: 'client-random-v1' | 'server-fallback-v1';
};

export const activeExperimentName = 'quiz-flow-v2';

export const experimentArms = [
  {
    id: 'balanced-result-copy',
    label: 'Balanced result copy',
    description: 'Emphasizes blended profiles and practical next steps.',
  },
  {
    id: 'confidence-calibrated-copy',
    label: 'Confidence-calibrated copy',
    description: 'Emphasizes score gaps, uncertainty, and retake stability.',
  },
] as const satisfies readonly ExperimentArm[];

export function assignExperimentArm(randomValue = Math.random(), source: ExperimentAssignment['source'] = 'server-fallback-v1'): ExperimentAssignment {
  const index = Math.min(experimentArms.length - 1, Math.floor(randomValue * experimentArms.length));
  const arm = experimentArms[index];

  return {
    name: activeExperimentName,
    arm: arm.id,
    label: buildExperimentLabel(activeExperimentName, arm.id),
    assignedAt: new Date().toISOString(),
    source,
  };
}

export function buildExperimentLabel(name: string, arm: string) {
  return `${name}:${arm}`;
}
