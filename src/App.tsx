// ---------------------------------------------------------------
// App shell
// ---------------------------------------------------------------
// Wires up React Query, React Router, and the shared layout.
// Routes:
//   /login                                           public
//   /                                                redirect -> /portfolio
//   /portfolio                                       protected (Layout + Portfolio)
//   /portfolio/:projectId                            protected (Layout + ProjectDetail)
//   /portfolio/:projectId/tasks/:taskId              protected (Layout + ProjectDetail w/ modal)
//   /closed                                          protected (Layout + Portfolio state=archived)
//   /decisions                                       protected (Layout + Decisions log)
//   /*                                               NotFound
// ---------------------------------------------------------------

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { Decisions } from './pages/Decisions';
import { Login } from './pages/Login';
import { NotFound } from './pages/NotFound';
import { Portfolio } from './pages/Portfolio';
import { Programmes } from './pages/Programmes';
import { ProgrammeDetail } from './pages/ProgrammeDetail';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { Tasks } from './pages/Tasks';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/portfolio" replace />} />
            <Route path="/portfolio" element={<Dashboard />} />
            <Route path="/portfolio/board" element={<Portfolio mode="active" view="board" />} />
            <Route path="/portfolio/map" element={<Portfolio mode="active" view="map" />} />
            <Route path="/portfolio/table" element={<Portfolio mode="active" view="table" />} />
            <Route path="/portfolio/:projectId" element={<ProjectDetail />} />
            <Route path="/portfolio/:projectId/tasks/:taskId" element={<ProjectDetail />} />
            <Route path="/programmes" element={<Programmes />} />
            <Route path="/programmes/:programmeId" element={<ProgrammeDetail />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/closed" element={<Portfolio mode="archived" view="table" />} />
            <Route path="/decisions" element={<Decisions />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
