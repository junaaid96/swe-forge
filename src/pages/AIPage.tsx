/** AI hub: setup, usage and entry points for the Groq study coach. */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AIPanel, AISettings } from '../components/AIPanel';
import { IconCards, IconMap, IconSpark, IconTimer } from '../components/Icons';
import { useAiStatus } from '../lib/ai';

export function AIPage() {
  const [open, setOpen] = useState(false);
  const status = useAiStatus();

  useEffect(() => {
    document.title = 'AI Coach · Forgeline';
  }, []);

  const used = status.usage.inTokens + status.usage.outTokens;

  return (
    <div className="page">
      <div className="page-head">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">AI Coach</span>
        </nav>
        <div className="row">
          <img src="/logos/groq.svg" alt="" aria-hidden className="ai-logo" loading="lazy" />
          <h1 style={{ margin: 0 }}>AI Coach</h1>
        </div>
        <p className="lead">
          A Groq-powered study companion grounded in your material: it explains pages, quizzes you,
          interviews you, and grades your mock answers. It works out of the box with the site's
          shared key — or bring your own free key for private quota.
        </p>
        <div className="row">
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
            <IconSpark /> {status.key ? 'Open assistant' : 'Set up AI'}
          </button>
          <span className="muted small">
            {status.key ? `Ready · ${used.toLocaleString()}/${status.budget.toLocaleString()} tokens today` : 'Needs a free Groq key (2 minutes)'}
          </span>
        </div>
      </div>

      <section className="card pad" aria-labelledby="ai-where">
        <h2 id="ai-where">Where AI helps</h2>
        <div className="tools-grid">
          <Link to="/prep-map" className="tool-card card tool-card-main">
            <strong><IconMap width={16} height={16} /> Every reader page</strong>
            <span>Ask AI about any guide, deep dive or Q&A — explain, summarize, quiz-me, interview-me.</span>
          </Link>
          <Link to="/mock" className="tool-card card tool-card-main">
            <strong><IconTimer width={16} height={16} /> Mock interviews</strong>
            <span>Type open answers and get rubric grades with feedback instead of guessing.</span>
          </Link>
          <Link to="/flashcards" className="tool-card card tool-card-main">
            <strong><IconCards width={16} height={16} /> Flashcards</strong>
            <span>One-click AI explanations for any card you flip during review.</span>
          </Link>
        </div>
      </section>

      <section className="card pad" aria-labelledby="ai-setup">
        <h2 id="ai-setup">Setup & usage</h2>
        <AISettings />
        <p className="muted small">
          Get a free key at console.groq.com → API Keys. On rate limits the app falls back
          automatically (70B → Scout → 8B → OSS-20B). Exact free-tier numbers live at
          console.groq.com → Limits.
        </p>
      </section>

      <AIPanel
        open={open}
        onClose={() => setOpen(false)}
        context={{ title: 'General study help', body: 'No page selected. The user is chatting from the AI hub — answer software-engineering study questions concisely.' }}
      />
    </div>
  );
}

export default AIPage;
