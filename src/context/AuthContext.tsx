import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { createLogger } from '../utils/logger';

const log = createLogger('AUTH');

interface AuthContextValue {
  currentUser: User | null;
  loginAsFieldWorker: (displayName: string, phoneNumber: string) => Promise<UserCredential>;
  loginWithGoogle: () => Promise<UserCredential>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Hook to access the authentication context. Throws if used outside AuthProvider. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function loginAsFieldWorker(displayName: string, phoneNumber: string): Promise<UserCredential> {
    const result = await signInAnonymously(auth);
    await updateProfile(result.user, { displayName, photoURL: phoneNumber });

    // Save worker profile to Firestore so Supervisor can see them
    await setDoc(
      doc(db, 'workers', phoneNumber),
      {
        name: displayName,
        phone: phoneNumber,
        location: 'Detecting...',
        lastActive: new Date().toISOString(),
      },
      { merge: true }
    );

    log.info('Field worker signed in', { displayName, phoneNumber });
    // Force a state refresh so displayName and phone are immediately available
    setCurrentUser({ ...result.user, displayName, photoURL: phoneNumber } as User);
    return result;
  }

  function loginWithGoogle(): Promise<UserCredential> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    log.info('Google sign-in initiated');
    return signInWithPopup(auth, provider);
  }

  function logout(): Promise<void> {
    log.info('User signed out');
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value: AuthContextValue = {
    currentUser,
    loginAsFieldWorker,
    loginWithGoogle,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
