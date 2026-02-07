import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Onboarding from './pages/Onboarding.jsx';
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
import NotFound from './pages/NotFound.jsx';

export const routes = [
  { path: '/', element: <Landing /> },
  { path: '/login', element: <Login /> },
  { path: '/onboarding', element: <Onboarding /> },
  { path: '/student', element: <StudentDashboard /> },
  { path: '/student/company', element: <CompanyProfile /> },
  { path: '/student/stage/:stageId', element: <StageDetail /> },
  { path: '/student/task/:taskId', element: <TaskDetail /> },
  { path: '/student/help', element: <HelpDesk /> },
  { path: '/student/announcements', element: <Announcements /> },
  { path: '/student/notifications', element: <Notifications /> },
  { path: '/student/pitch-deck', element: <PitchDeck /> },
  { path: '/teacher', element: <TeacherDashboard /> },
  { path: '/teacher/stages', element: <TeacherStages /> },
  { path: '/teacher/approvals', element: <Approvals /> },
  { path: '/teacher/teams', element: <Teams /> },
  { path: '/teacher/analytics', element: <Analytics /> },
  { path: '/teacher/announcements', element: <Announcements /> },
  { path: '/teacher/side-hustles', element: <SideHustles /> },
  { path: '/teacher/helpdesk', element: <HelpDesk /> },
  { path: '/admin', element: <AdminDashboard /> },
  { path: '*', element: <NotFound /> }
];
