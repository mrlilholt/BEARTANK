export const PATHS = {
  home: '/',
  login: '/login',
  onboarding: '/onboarding',
  pending: '/pending',
  unauthorized: '/unauthorized',
  student: {
    root: '/student',
    company: '/student/company',
    stage: '/student/stage/:stageId',
    task: '/student/task/:taskId',
    help: '/student/help',
    announcements: '/student/announcements',
    notifications: '/student/notifications',
    pitchDeck: '/student/pitch-deck',
    resources: '/student/resources'
  },
  teacher: {
    root: '/teacher',
    stages: '/teacher/stages',
    approvals: '/teacher/approvals',
    teams: '/teacher/teams',
    analytics: '/teacher/analytics',
    announcements: '/teacher/announcements',
    sideHustles: '/teacher/side-hustles',
    resources: '/teacher/resources',
    helpdesk: '/teacher/helpdesk'
  },
  admin: '/admin'
};

export function buildStudentStagePath(stageId) {
  return `/student/stage/${stageId}`;
}

export function buildStudentTaskPath(taskId) {
  return `/student/task/${taskId}`;
}
