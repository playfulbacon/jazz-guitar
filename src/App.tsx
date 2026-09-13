import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { ChordsPage } from './pages/ChordsPage';
import { TunesPage } from './pages/TunesPage';
import { TunePlayerPage } from './pages/TunePlayerPage';
import { TuneLearnPage } from './pages/TuneLearnPage';
import { PracticePage } from './pages/PracticePage';
import { GymPage } from './pages/GymPage';
import { MetronomePage } from './pages/MetronomePage';
import { LearnPage } from './pages/LearnPage';
import { ListeningPage } from './pages/ListeningPage';
import { ProgressPage } from './pages/ProgressPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/chords" element={<ChordsPage />} />
          <Route path="/tunes" element={<TunesPage />} />
          <Route path="/tunes/:id" element={<TunePlayerPage />} />
          <Route path="/tunes/:id/learn" element={<TuneLearnPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/practice/gym" element={<GymPage />} />
          <Route path="/practice/metronome" element={<MetronomePage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/learn/listening" element={<ListeningPage />} />
          <Route path="/learn/progress" element={<ProgressPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
