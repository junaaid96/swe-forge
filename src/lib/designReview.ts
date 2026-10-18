/** Optional AI review of a system design attempt against the rubric. */
import { chat, clip } from './ai';
import type { DesignPrompt } from './types';
import type { DesignAttempt } from './design';
import { DESIGN_SECTIONS } from './design';

export async function reviewDesign(prompt: DesignPrompt, attempt: DesignAttempt): Promise<string> {
  const rubric = prompt.rubric.map((r) => `### ${r.dimension}\n${r.points.map((p) => `- ${p}`).join('\n')}`).join('\n\n');
  const sections = DESIGN_SECTIONS.map((s) => `## ${s.label}\n${attempt.sections[s.key].trim() || '(left blank)'}`).join('\n\n');
  const r = await chat(
    [
      {
        role: 'system',
        content:
          'You review system design interview attempts. Reply in Markdown with: one "## Score: X/10" line, then per rubric dimension a "### <dimension>: n/10" heading with 1-2 sentences on what was good and what is missing, then "### Top 3 fixes" with concrete suggestions. Be direct and specific; reference the candidate\'s own numbers and choices.',
      },
      {
        role: 'user',
        content: `Prompt: ${prompt.title}\nBrief: ${clip(prompt.brief, 1500)}\n\nRubric:\n${clip(rubric, 2000)}\n\nCandidate attempt:\n${clip(sections, 4000)}\n\nDiagram (mermaid, may be a stub):\n${clip(attempt.mermaid, 800)}`,
      },
    ],
    { maxTokens: 1200, temperature: 0.4 },
  );
  return r.text;
}
