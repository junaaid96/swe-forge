/** Combined progress backup: reading/SRS state plus Practice Lab state. */
import { practice, type PracticeState } from './practiceStore';
import { progress, type ProgressState } from './progress';

interface Envelope {
  app: 'forgeline';
  version: 2;
  progress: ProgressState;
  practice: PracticeState;
}

export function exportAll(): string {
  return JSON.stringify({ app: 'forgeline', version: 2, progress: JSON.parse(progress.exportJson()), practice: practice.exportData() } as Envelope, null, 2);
}

/** Accepts the combined envelope and legacy progress-only files. */
export function importAll(json: string): void {
  const parsed = JSON.parse(json) as Partial<Envelope> & Partial<ProgressState>;
  if (parsed?.app === 'forgeline' && parsed?.version === 2) {
    const env = parsed as Partial<Envelope>;
    if (env.practice?.version !== 1) throw new Error('Not a Forgeline practice file');
    progress.importJson(JSON.stringify(env.progress));
    practice.importData(env.practice);
    return;
  }
  progress.importJson(json);
}

export function resetAll(): void {
  progress.reset();
  practice.reset();
}
