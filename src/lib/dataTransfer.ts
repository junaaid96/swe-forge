/** Combined progress backup: reading/SRS state plus feature stores. */
import { practice, type PracticeState } from './practiceStore';
import { progress, type ProgressState } from './progress';
import { daily, type DailyState } from './daily';
import { studyPlan, type StudyPlanState } from './studyPlan';
import { noteStore, type NotesState } from './notes';
import { customCards, type CustomCardsState } from './customCards';

interface Envelope {
  app: 'forgeline';
  version: 2;
  progress: ProgressState;
  practice: PracticeState;
  daily?: DailyState;
  plan?: StudyPlanState;
  notes?: NotesState;
  customCards?: CustomCardsState;
}

export function exportAll(): string {
  return JSON.stringify(
    {
      app: 'forgeline',
      version: 2,
      progress: JSON.parse(progress.exportJson()),
      practice: practice.exportData(),
      daily: daily.exportData(),
      plan: studyPlan.exportData(),
      notes: noteStore.exportData(),
      customCards: customCards.exportData(),
    } as Envelope,
    null,
    2,
  );
}

/** Accepts the combined envelope and legacy progress-only files. */
export function importAll(json: string): void {
  const parsed = JSON.parse(json) as Partial<Envelope> & Partial<ProgressState>;
  if (parsed?.app === 'forgeline' && parsed?.version === 2) {
    const env = parsed as Partial<Envelope>;
    if (env.practice?.version !== 1) throw new Error('Not a Forgeline practice file');
    progress.importJson(JSON.stringify(env.progress));
    practice.importData(env.practice);
    if (env.daily) daily.importData(env.daily);
    if (env.plan) studyPlan.importData(env.plan);
    if (env.notes) noteStore.importData(env.notes);
    if (env.customCards) customCards.importData(env.customCards);
    return;
  }
  progress.importJson(json);
}

export function resetAll(): void {
  progress.reset();
  practice.reset();
  daily.reset();
  studyPlan.reset();
  noteStore.reset();
  customCards.reset();
}
