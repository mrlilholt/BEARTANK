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
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/pending" element={<PendingAccess />} />

      <Route element={<RequireAuth />}>
        <Route
          path="/student"
          element={
            <RequireRole allow={['student']}>
              <StudentDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/student/company"
          element={
            <RequireRole allow={['student']}>
              <CompanyProfile />
            </RequireRole>
          }
        />
        <Route
          path="/student/stage/:stageId"
          element={
            <RequireRole allow={['student']}>
              <StageDetail />
            </RequireRole>
          }
        />
        <Route
          path="/student/task/:taskId"
          element={
            <RequireRole allow={['student']}>
              <TaskDetail />
            </RequireRole>
          }
        />
        <Route
          path="/student/help"
          element={
            <RequireRole allow={['student']}>
              <HelpDesk />
            </RequireRole>
          }
        />
        <Route
          path="/student/announcements"
          element={
            <RequireRole allow={['student']}>
              <Announcements />
            </RequireRole>
          }
        />
        <Route
          path="/student/notifications"
          element={
            <RequireRole allow={['student']}>
              <Notifications />
            </RequireRole>
          }
        />
        <Route
          path="/student/pitch-deck"
          element={
            <RequireRole allow={['student']}>
              <PitchDeck />
            </RequireRole>
          }
        />

        <Route
          path="/teacher"
          element={
            <RequireRole allow={['teacher', 'super_admin']}>
              <TeacherDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/teacher/stages"
          element={
            <RequireRole allow={['teacher', 'super_admin']}>
              <TeacherStages />
            </RequireRole>
          }
        />
        <Route
          path="/teacher/approvals"
          element={
            <RequireRole allow={['teacher', 'super_admin']}>
              <Approvals />
            </RequireRole>
          }
        />
        <Route
          path="/teacher/teams"
          element={
            <RequireRole allow={['teacher', 'super_admin']}>
              <Teams />
            </RequireRole>
          }
        />
        <Route
          path="/teacher/analytics"
          element={
            <RequireRole allow={['teacher', 'super_admin']}>
              <Analytics />
            </RequireRole>
          }
        />
        <Route
          path="/teacher/announcements"
          element={
            <RequireRole allow={['teacher', 'super_admin']}>
              <Announcements />
            </RequireRole>
          }
        />
        <Route
          path="/teacher/side-hustles"
          element={
            <RequireRole allow={['teacher', 'super_admin']}>
              <SideHustles />
            </RequireRole>
          }
        />
        <Route
          path="/teacher/helpdesk"
          element={
            <RequireRole allow={['teacher', 'super_admin']}>
              <HelpDesk />
            </RequireRole>
          }
        />

        <Route
          path="/admin"
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
