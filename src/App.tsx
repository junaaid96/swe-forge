import { lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';

const TopicPage = lazy(() => import('./pages/TopicPage'));
const ReaderPage = lazy(() => import('./pages/ReaderPage'));
const FlashcardsPage = lazy(() => import('./pages/FlashcardsPage'));
const MockPage = lazy(() => import('./pages/MockPage'));
const SkillMapPage = lazy(() => import('./pages/SkillMapPage'));
const RoadmapsPage = lazy(() => import('./pages/RoadmapsPage'));
const TrackPage = lazy(() => import('./pages/TrackPage'));
const BookmarksPage = lazy(() => import('./pages/BookmarksPage'));
const ToolsPage = lazy(() => import('./pages/ToolsPage'));
const ToolPage = lazy(() => import('./pages/ToolPage'));
const ArenaPage = lazy(() => import('./pages/ArenaPage'));
const AIPage = lazy(() => import('./pages/AIPage'));
const PracticeCatalogPage = lazy(() => import('./pages/PracticeCatalogPage'));
const PracticeWorkspacePage = lazy(() => import('./pages/PracticeWorkspacePage'));
const PathsPage = lazy(() => import('./pages/PathsPage'));
const PathDetailPage = lazy(() => import('./pages/PathDetailPage'));
const StudyPlanPage = lazy(() => import('./pages/StudyPlanPage'));
const NotesPage = lazy(() => import('./pages/NotesPage'));
const VisualizeHubPage = lazy(() => import('./pages/VisualizeHubPage'));
const VisualizePage = lazy(() => import('./pages/VisualizePage'));
const DesignHubPage = lazy(() => import('./pages/DesignHubPage'));
const DesignWorkspacePage = lazy(() => import('./pages/DesignWorkspacePage'));

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
          <Route path="roadmaps" element={<RoadmapsPage />} />
          <Route path="roadmaps/:slug" element={<TrackPage />} />
          <Route path="flashcards" element={<FlashcardsPage />} />
          <Route path="mock" element={<MockPage />} />
          <Route path="skills" element={<SkillMapPage />} />
          <Route path="bookmarks" element={<BookmarksPage />} />
          <Route path="tools" element={<ToolsPage />} />
          <Route path="tools/:slug" element={<ToolPage />} />
          <Route path="arena" element={<ArenaPage />} />
          <Route path="ai" element={<AIPage />} />
          <Route path="practice" element={<PracticeCatalogPage />} />
          <Route path="practice/:topic/:slug" element={<PracticeWorkspacePage />} />
          <Route path="paths" element={<PathsPage />} />
          <Route path="paths/:slug" element={<PathDetailPage />} />
          <Route path="plan" element={<StudyPlanPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="visualize" element={<VisualizeHubPage />} />
          <Route path="visualize/:id" element={<VisualizePage />} />
          <Route path="design" element={<DesignHubPage />} />
          <Route path="design/:slug" element={<DesignWorkspacePage />} />
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
