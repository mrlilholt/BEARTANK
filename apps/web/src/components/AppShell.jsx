import {
  Avatar,
  Badge,
  Box,
  Button,
  ButtonBase,
  Chip,
  Stack,
  Typography
} from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import HelpRoundedIcon from '@mui/icons-material/HelpRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import SlideshowRoundedIcon from '@mui/icons-material/SlideshowRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import { DASHBOARD_BY_ROLE, ROLE_LABELS, useAuth } from '../lib/auth-context.jsx';
import LogoMark from './LogoMark.jsx';
import { collection, query, where } from 'firebase/firestore';
import { useCollection } from '../lib/firestore-hooks.js';
import { db } from '../lib/firebase.js';

const teacherNav = [
  { label: 'Dashboard', to: '/teacher', icon: DashboardRoundedIcon },
  { label: 'Stages', to: '/teacher/stages', icon: AccountTreeRoundedIcon },
  { label: 'Approvals', to: '/teacher/approvals', icon: TaskAltRoundedIcon, badge: 'approvals' },
  { label: 'Teams', to: '/teacher/teams', icon: GroupsRoundedIcon },
  { label: 'Analytics', to: '/teacher/analytics', icon: InsightsRoundedIcon },
  { label: 'Resources', to: '/teacher/resources', icon: MenuBookRoundedIcon },
  { label: 'Announcements', to: '/teacher/announcements', icon: CampaignRoundedIcon },
  { label: 'Side Hustles', to: '/teacher/side-hustles', icon: BoltRoundedIcon },
  { label: 'Help Desk', to: '/teacher/helpdesk', icon: HelpRoundedIcon }
];

const navByRole = {
  student: [
    { label: 'Dashboard', to: '/student', icon: DashboardRoundedIcon },
    { label: 'Company Profile', to: '/student/company', icon: BusinessRoundedIcon },
    {
      label: 'Notifications',
      to: '/student/notifications',
      icon: NotificationsRoundedIcon,
      badge: 'notifications'
    },
    { label: 'Resources', to: '/student/resources', icon: MenuBookRoundedIcon },
    { label: 'Announcements', to: '/student/announcements', icon: CampaignRoundedIcon },
    { label: 'Pitch Deck', to: '/student/pitch-deck', icon: SlideshowRoundedIcon },
    { label: 'Help Desk', to: '/student/help', icon: HelpRoundedIcon }
  ],
  teacher: teacherNav,
  super_admin: [
    ...teacherNav,
    { label: 'Admin', to: '/admin', icon: AdminPanelSettingsRoundedIcon, isBottom: true }
  ]
};

export default function AppShell({ title, subtitle, kicker, actions, children }) {
  const location = useLocation();
  const { user, role, signOut } = useAuth();
  const navItems = navByRole[role] || [];
  const roleLabel = role ? ROLE_LABELS[role] : 'Guest';
  const dashboardPath = DASHBOARD_BY_ROLE[role] || '/';
  const [scale, setScale] = useState(1);
  const baseWidth = 1280;
  const sidebarWidth = 240;
  const displayName =
    user?.displayName ||
    user?.email?.split('@')?.[0] ||
    'Bear';
  const firstName = displayName.split(' ')[0];

  useEffect(() => {
    const updateScale = () => {
      if (typeof window === 'undefined') return;
      const padding = 48;
      const availableWidth = Math.max(320, window.innerWidth - padding);
      const next = Math.min(1, availableWidth / baseWidth);
      setScale(Number(next.toFixed(3)));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const notificationsQuery = useMemo(() => {
    if (!user || role !== 'student') return null;
    return query(collection(db, 'notifications'), where('userId', '==', user.uid));
  }, [user?.uid, role]);
  const { data: notifications } = useCollection(notificationsQuery);
  const unreadCount = notifications.filter((item) => !item.read).length;

  const approvalsQuery = useMemo(() => {
    if (!user || (role !== 'teacher' && role !== 'super_admin')) return null;
    return query(collection(db, 'submissions'), where('status', '==', 'submitted'));
  }, [user?.uid, role]);
  const { data: approvals } = useCollection(approvalsQuery);
  const approvalsCount = approvals.length;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        px: { xs: 2, md: 3 },
        py: { xs: 2, md: 3 },
        overflowX: 'hidden',
        overflowY: 'auto'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Box
          sx={{
            width: baseWidth,
            transform: `scale(${scale})`,
            transformOrigin: 'top center'
          }}
        >
          <Box
            sx={{
              borderRadius: 8,
              overflow: 'hidden',
              boxShadow: '0 28px 60px rgba(31, 37, 82, 0.12)',
              display: 'grid',
              gridTemplateColumns: `${sidebarWidth}px minmax(0, 1fr)`
            }}
          >
            <Box
              sx={{
                bgcolor: 'var(--beartank-blue)',
                p: { xs: 3, md: 3.5 },
                display: 'flex',
                flexDirection: 'column',
                gap: 3
              }}
            >
              <Stack spacing={1} alignItems="center">
                <RouterLink to={dashboardPath} style={{ display: 'inline-flex' }}>
                  <LogoMark size={104} />
                </RouterLink>
                <Stack spacing={0.4} alignItems="center">
                  <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '0.12em' }}>
                    BEARTANK
                  </Typography>
                  <Chip label={roleLabel} color="secondary" size="small" />
                </Stack>
              </Stack>

            <Stack spacing={1} alignItems="center">
              <Avatar
                src={user?.photoURL || ''}
                alt={user?.displayName || 'User'}
                sx={{ width: 56, height: 56, bgcolor: 'secondary.main', color: '#0f1b2d' }}
              >
                {(user?.displayName || user?.email || 'B')[0]?.toUpperCase?.()}
              </Avatar>
              <Stack spacing={0.2} alignItems="center">
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {firstName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {roleLabel}
                </Typography>
              </Stack>
            </Stack>

            <Stack spacing={1}>
              {navItems.filter((item) => !item.isBottom).map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                const badgeContent =
                  item.badge === 'notifications'
                    ? unreadCount
                    : item.badge === 'approvals'
                    ? approvalsCount
                    : 0;
                const label = (
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: isActive ? 700 : 500,
                      color: 'inherit',
                      maxWidth: 160,
                      whiteSpace: 'normal',
                      lineHeight: 1.2
                    }}
                    noWrap={false}
                  >
                    {item.label}
                  </Typography>
                );

                return (
                  <ButtonBase
                    key={item.to}
                    component={RouterLink}
                    to={item.to}
                    sx={{
                      width: '100%',
                      borderRadius: 6,
                      px: 1.5,
                      py: 1,
                      justifyContent: 'space-between',
                      color: isActive ? 'primary.main' : 'text.secondary',
                      transition: 'color 0.2s ease',
                      '&:hover': {
                        color: 'primary.main'
                      },
                      '&:hover .nav-icon': {
                        bgcolor: 'rgba(255, 255, 255, 0.95)',
                        color: 'primary.main'
                      }
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box
                        className="nav-icon"
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: 6,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: 'rgba(255, 255, 255, 0.7)',
                          color: isActive ? 'primary.main' : 'text.secondary',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Icon fontSize="small" />
                      </Box>
                      {badgeContent > 0 ? (
                        <Badge
                          color="secondary"
                          badgeContent={badgeContent}
                          sx={{ '& .MuiBadge-badge': { top: 6, right: -16 } }}
                        >
                          {label}
                        </Badge>
                      ) : (
                        label
                      )}
                    </Stack>
                  </ButtonBase>
                );
              })}
            </Stack>

            <Box sx={{ mt: 'auto' }}>
              {navItems.filter((item) => item.isBottom).map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                const label = (
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: isActive ? 700 : 500,
                      color: 'inherit',
                      maxWidth: 160,
                      whiteSpace: 'normal',
                      lineHeight: 1.2
                    }}
                    noWrap={false}
                  >
                    {item.label}
                  </Typography>
                );
                return (
                  <ButtonBase
                    key={item.to}
                    component={RouterLink}
                    to={item.to}
                    sx={{
                      width: '100%',
                      borderRadius: 6,
                      px: 1.5,
                      py: 1,
                      justifyContent: 'space-between',
                      color: isActive ? 'primary.main' : 'text.secondary',
                      transition: 'color 0.2s ease',
                      '&:hover': {
                        color: 'primary.main'
                      },
                      '&:hover .nav-icon': {
                        bgcolor: 'rgba(255, 255, 255, 0.95)',
                        color: 'primary.main'
                      }
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box
                        className="nav-icon"
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: 6,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: 'rgba(255, 255, 255, 0.7)',
                          color: isActive ? 'primary.main' : 'text.secondary',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Icon fontSize="small" />
                      </Box>
                      {label}
                    </Stack>
                  </ButtonBase>
                );
              })}
              {user ? (
                <Button variant="contained" color="primary" onClick={signOut} fullWidth>
                  Sign out
                </Button>
              ) : (
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="contained"
                  color="primary"
                  fullWidth
                >
                  Sign in
                </Button>
              )}
            </Box>
          </Box>

          <Box
            sx={{
              bgcolor: '#ffffff',
              p: { xs: 3, md: 4 },
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              minWidth: 0
            }}
          >
            <Stack spacing={1}>
              {kicker ? (
                <Typography variant="overline" sx={{ letterSpacing: '0.25em' }}>
                  {kicker}
                </Typography>
              ) : null}
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ md: 'center' }}
                justifyContent="space-between"
              >
                <Box>
                  <Typography variant="h3" sx={{ maxWidth: 720 }}>
                    {title}
                  </Typography>
                  {subtitle ? (
                    <Typography variant="h6" sx={{ color: 'text.secondary', maxWidth: 720 }}>
                      {subtitle}
                    </Typography>
                  ) : null}
                </Box>
                {actions ? (
                  <Stack direction="row" spacing={2} alignItems="center">
                    {actions}
                  </Stack>
                ) : null}
              </Stack>
            </Stack>

            {children}
          </Box>
        </Box>
      </Box>
    </Box>
    </Box>
  );
}
