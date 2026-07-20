import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { DeepTrackPage } from './pages/DeepTrackPage';
import { HomePage } from './pages/HomePage';
import { InterviewLevelPage } from './pages/InterviewLevelPage';
import { ScoreboardPage } from './pages/ScoreboardPage';
import { TopicHubPage } from './pages/TopicHubPage';

/** Map legacy /learn/:slug → /topics/:slug */
function LegacyLearnRedirect() {
  const { slug } = useParams();
  return <Navigate to={slug ? `/topics/${slug}` : '/'} replace />;
}

/** Map legacy /interview/:sectionId → /topics/:sectionId */
function LegacyInterviewRedirect() {
  const { sectionId } = useParams();
  return <Navigate to={sectionId ? `/topics/${sectionId}` : '/'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="topics/:slug" element={<TopicHubPage />} />
          <Route path="topics/:slug/interview/:level" element={<InterviewLevelPage />} />
          <Route path="topics/:slug/deep/:track" element={<DeepTrackPage />} />
          <Route path="scoreboard" element={<ScoreboardPage />} />
          <Route path="learn/:slug" element={<LegacyLearnRedirect />} />
          <Route path="interview" element={<Navigate to="/" replace />} />
          <Route path="interview/:sectionId" element={<LegacyInterviewRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
