import { Route, Routes } from 'react-router-dom';
import RequireAuth from './components/RequireAuth.jsx';
import RequireRole from './components/RequireRole.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Onboarding from './pages/Onboarding.jsx';
import PendingAccess from './pages/PendingAccess.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import Notifications from './pages/Notifications.jsx';
import CompanyProfile from './pages/CompanyProfile.jsx';
import TeacherDashboard from './pages/TeacherDashboard.jsx';
import TeacherStages from './pages/TeacherStages.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Approvals from './pages/Approvals.jsx';
import StageDetail from './pages/StageDetail.jsx';
import TaskDetail from './pages/TaskDetail.jsx';
import HelpDesk from './pages/HelpDesk.jsx';
import Announcements from './pages/Announcements.jsx';
import Analytics from './pages/Analytics.jsx';
import Teams from './pages/Teams.jsx';
import SideHustles from './pages/SideHustles.jsx';
import PitchDeck from './pages/PitchDeck.jsx';
import Resources from './pages/Resources.jsx';
import NotFound from './pages/NotFound.jsx';
import Unauthorized from './pages/Unauthorized.jsx';
import { PATHS } from './lib/paths.js';

const STUDENT_ROUTES = [
  { path: PATHS.student.root, element: <StudentDashboard /> },
  { path: PATHS.student.company, element: <CompanyProfile /> },
  { path: PATHS.student.stage, element: <StageDetail /> },
  { path: PATHS.student.task, element: <TaskDetail /> },
  { path: PATHS.student.help, element: <HelpDesk /> },
  { path: PATHS.student.announcements, element: <Announcements /> },
  { path: PATHS.student.notifications, element: <Notifications /> },
  { path: PATHS.student.pitchDeck, element: <PitchDeck /> },
  { path: PATHS.student.resources, element: <Resources /> }
];

const TEACHER_ROUTES = [
  { path: PATHS.teacher.root, element: <TeacherDashboard /> },
  { path: PATHS.teacher.stages, element: <TeacherStages /> },
  { path: PATHS.teacher.approvals, element: <Approvals /> },
  { path: PATHS.teacher.teams, element: <Teams /> },
  { path: PATHS.teacher.analytics, element: <Analytics /> },
  { path: PATHS.teacher.announcements, element: <Announcements /> },
  { path: PATHS.teacher.sideHustles, element: <SideHustles /> },
  { path: PATHS.teacher.resources, element: <Resources /> },
  { path: PATHS.teacher.helpdesk, element: <HelpDesk /> }
];

export default function App() {
  return (
    <Routes>
      <Route path={PATHS.home} element={<Landing />} />
      <Route path={PATHS.login} element={<Login />} />
      <Route path={PATHS.onboarding} element={<Onboarding />} />
      <Route path={PATHS.pending} element={<PendingAccess />} />
      <Route path={PATHS.unauthorized} element={<Unauthorized />} />

      <Route element={<RequireAuth />}>
        {STUDENT_ROUTES.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              <RequireRole allow={['student']}>
                {route.element}
              </RequireRole>
            }
          />
        ))}

        {TEACHER_ROUTES.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              <RequireRole allow={['teacher', 'super_admin']}>
                {route.element}
              </RequireRole>
            }
          />
        ))}

        <Route
          path={PATHS.admin}
          element={
            <RequireRole allow={['super_admin']}>
              <AdminDashboard />
            </RequireRole>
          }
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
