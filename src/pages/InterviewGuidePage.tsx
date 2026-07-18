import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { InterviewSection, InterviewSectionMeta } from '../data/types';
import { fetchInterviewIndex, fetchInterviewSection } from '../services/api';

export function InterviewGuidePage() {
  const { sectionId } = useParams();
  const navigate = useNavigate();
  const [index, setIndex] = useState<InterviewSectionMeta[]>([]);
  const [section, setSection] = useState<InterviewSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    void fetchInterviewIndex().then((sections) => {
      setIndex(sections);
      if (!sectionId && sections[0]) {
        navigate(`/interview/${sections[0].id}`, { replace: true });
      }
    });
  }, [sectionId, navigate]);

  useEffect(() => {
    if (!sectionId) return;
    setLoading(true);
    void fetchInterviewSection(sectionId).then((s) => {
      setSection(s);
      setOpenId(s?.items[0]?.id ?? null);
      setLoading(false);
    });
  }, [sectionId]);

  return (
    <div className="interview-layout">
      <section className="panel content-panel">
        <div className="section-head" style={{ marginTop: 0 }}>
          <div>
            <h2>Interview Guide</h2>
            <p>
              Secondary practice hub — learn topics deeply first, then use these banks. Every card
              links back to a lesson.
            </p>
          </div>
        </div>

        <div className="tabs" style={{ marginBottom: '1rem' }}>
          {index.map((s) => (
            <Link
              key={s.id}
              to={`/interview/${s.id}`}
              className={`tab ${sectionId === s.id ? 'active' : ''}`}
            >
              {s.title} ({s.itemCount})
            </Link>
          ))}
        </div>

        {loading || !section ? (
          <div className="empty-state">Loading interview content…</div>
        ) : (
          <>
            <p className="muted">{section.description}</p>
            <div className="accordion">
              {section.items.map((item) => (
                <div key={item.id} className="acc-item">
                  <button
                    type="button"
                    className="acc-btn"
                    onClick={() => setOpenId(openId === item.id ? null : item.id)}
                  >
                    <span>{item.title}</span>
                    <span className="open-mark">{openId === item.id ? '−' : '+'}</span>
                  </button>
                  {openId === item.id ? (
                    <div className="acc-body">
                      <div style={{ whiteSpace: 'pre-wrap' }}>{item.body}</div>
                      {item.learnSlug ? (
                        <div className="row-actions" style={{ marginTop: '0.9rem' }}>
                          <Link className="primary-btn" to={`/learn/${item.learnSlug}`}>
                            Learn deeply →
                          </Link>
                        </div>
                      ) : null}
                      {item.tags?.length ? (
                        <div className="chip-row" style={{ marginTop: '0.75rem' }}>
                          {item.tags.map((tag) => (
                            <span key={tag} className="chip">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
