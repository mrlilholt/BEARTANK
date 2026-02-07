import {
  GoogleAuthProvider,
  getIdTokenResult,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut
} from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth, db } from './firebase.js';

const AuthContext = createContext(null);

const SUPER_ADMIN_EMAILS = (import.meta.env.VITE_SUPER_ADMIN_EMAILS || '')
  .split(',')
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

export const ROLE_LABELS = {
  student: 'Student',
  teacher: 'Teacher',
  super_admin: 'Super Admin'
};

export const DASHBOARD_BY_ROLE = {
  student: '/student',
  teacher: '/teacher',
  super_admin: '/teacher'
};

function isSuperAdminEmail(email) {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [claims, setClaims] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (nextUser) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      setUser(nextUser);
      setProfile(null);
      setClaims({});
      setError(null);

      if (!nextUser) {
        setLoading(false);
        return;
      }

      try {
        const tokenResult = await getIdTokenResult(nextUser, true);
        setClaims(tokenResult.claims || {});
      } catch (err) {
        setError(err);
      }

      if (isSuperAdminEmail(nextUser.email)) {
        const superAdminRef = doc(db, 'users', nextUser.uid);
        try {
          await setDoc(
            superAdminRef,
            {
              role: 'super_admin',
              status: 'active',
              onboarded: true,
              email: nextUser.email || '',
              photoURL: nextUser.photoURL || '',
              updatedAt: serverTimestamp(),
              createdAt: serverTimestamp()
            },
            { merge: true }
          );
        } catch (err) {
          setError(err);
        }
      }

      const profileRef = doc(db, 'users', nextUser.uid);
      unsubscribeProfile = onSnapshot(
        profileRef,
        (snapshot) => {
          setProfile(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
          setLoading(false);
        },
        (err) => {
          setError(err);
          setLoading(false);
        }
      );
    });

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
      unsubscribeAuth();
    };
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return signInWithPopup(auth, provider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const completeOnboarding = async ({ fullName, preferredName, pronouns, role, classCode }) => {
    if (!auth.currentUser) throw new Error('Missing user');

    const isSuper = isSuperAdminEmail(auth.currentUser.email);
    const nextRole = isSuper ? 'super_admin' : role;
    const status = nextRole === 'teacher' ? 'pending' : 'active';

    await setDoc(
      doc(db, 'users', auth.currentUser.uid),
      {
        role: nextRole,
        status,
        onboarded: true,
        email: auth.currentUser.email || '',
        photoURL: auth.currentUser.photoURL || '',
        classCode: nextRole === 'student' ? classCode : null,
        profile: {
          fullName,
          preferredName,
          pronouns
        },
        updatedAt: serverTimestamp(),
        createdAt: profile?.createdAt || serverTimestamp()
      },
      { merge: true }
    );

    if (nextRole === 'student' && !profile?.teamId) {
      try {
        const baseName = preferredName || fullName?.split(' ')?.[0] || 'Solo';
        const companyName = `${baseName} Co.`;
        const teamRef = await addDoc(collection(db, 'teams'), {
          companyName,
          teamName: companyName,
          memberIds: [auth.currentUser.uid],
          memberEmails: auth.currentUser.email ? [auth.currentUser.email] : [],
          status: 'active',
          createdBy: auth.currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        const stagesSnapshot = await getDocs(
          query(collection(db, 'stages'), orderBy('order', 'asc'))
        );
        const stagePromises = stagesSnapshot.docs.map((stageDoc, index) =>
          setDoc(doc(db, 'teamStages', `${teamRef.id}_${stageDoc.id}`), {
            teamId: teamRef.id,
            stageId: stageDoc.id,
            order: Number(stageDoc.data().order || index + 1),
            status: index === 0 ? 'active' : 'locked',
            progress: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })
        );
        await Promise.all(stagePromises);

        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          teamId: teamRef.id,
          companyName,
          teamName: companyName,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        console.error('Failed to create solo team', err);
      }
    }
  };

  const value = useMemo(() => {
    const resolvedRole =
      claims.role ||
      profile?.role ||
      (user && isSuperAdminEmail(user.email) ? 'super_admin' : null);

    const resolvedStatus = claims.status || profile?.status || null;

    return {
      user,
      profile,
      claims,
      role: resolvedRole,
      status: resolvedStatus,
      loading,
      error,
      isSuperAdmin: user ? isSuperAdminEmail(user.email) : false,
      signIn,
      signOut,
      completeOnboarding
    };
  }, [user, profile, claims, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
