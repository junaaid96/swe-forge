import { lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';

const TopicPage = lazy(() => import('./pages/TopicPage'));
const ReaderPage = lazy(() => import('./pages/ReaderPage'));
const FlashcardsPage = lazy(() => import('./pages/FlashcardsPage'));
const MockPage = lazy(() => import('./pages/MockPage'));
const SkillMapPage = lazy(() => import('./pages/SkillMapPage'));
const BookmarksPage = lazy(() => import('./pages/BookmarksPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

/** Old SWE Forge URLs keep working. */
function Legacy({ to }: { to: (p: Record<string, string | undefined>) => string }) {
  const params = useParams();
  return <Navigate to={to(params)} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="prep-map" element={<ReaderPage prepMap />} />
          <Route path="topics/:slug" element={<TopicPage />} />
          <Route path="topics/:slug/:kind/:id" element={<ReaderPage />} />
          <Route path="flashcards" element={<FlashcardsPage />} />
          <Route path="mock" element={<MockPage />} />
          <Route path="skills" element={<SkillMapPage />} />
          <Route path="bookmarks" element={<BookmarksPage />} />
          <Route path="scoreboard" element={<Navigate to="/skills" replace />} />
          <Route path="learn/:slug" element={<Legacy to={(p) => `/topics/${p.slug}`} />} />
          <Route path="interview/:slug" element={<Legacy to={(p) => `/topics/${p.slug}`} />} />
          <Route path="interview" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
