import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { HomePage } from './pages/HomePage';
import { InterviewGuidePage } from './pages/InterviewGuidePage';
import { ScoreboardPage } from './pages/ScoreboardPage';
import { TopicPage } from './pages/TopicPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="learn/:slug" element={<TopicPage />} />
          <Route path="interview" element={<InterviewGuidePage />} />
          <Route path="interview/:sectionId" element={<InterviewGuidePage />} />
          <Route path="scoreboard" element={<ScoreboardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
