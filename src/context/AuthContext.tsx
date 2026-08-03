import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  signInAnonymously,
  linkWithPopup,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { createLogger } from '../utils/logger';

const log = createLogger('AUTH');

interface AuthContextValue {
  currentUser: User | null;
  loginFieldWorker: (displayName: string, phoneNumber: string) => Promise<UserCredential>;
  loginWithGoogle: () => Promise<UserCredential>;
  linkGoogleAccount: () => Promise<UserCredential>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Hook to access the authentication context. Throws if used outside AuthProvider. */
// eslint-disable-next-line react-refresh/only-export-components
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

  async function loginFieldWorker(displayName: string, phoneNumber: string): Promise<UserCredential> {
    log.info('Logging in field worker (Anonymous mode)', { displayName, phoneNumber });
    
    let result: UserCredential;
    try {
      result = await signInAnonymously(auth);
    } catch (err: any) {
      log.error('Anonymous auth failed. Please ensure Anonymous sign-in is enabled in Firebase Console.', err);
      throw err;
    }
    
    // Update the profile with their actual name and phone
    await updateProfile(result.user, { displayName, photoURL: phoneNumber });

    // Save worker profile to Firestore so Supervisor can see them
    await setDoc(
      doc(db, 'workers', result.user.uid),
      {
        name: displayName,
        phone: phoneNumber,
        location: 'Detecting...',
        lastActive: new Date().toISOString(),
      },
      { merge: true }
    );

    log.info('Field worker signed in successfully', { uid: result.user.uid });
    setCurrentUser({ ...result.user, displayName, photoURL: phoneNumber } as User);
    return result;
  }

  function loginWithGoogle(): Promise<UserCredential> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    log.info('Google sign-in initiated');
    return signInWithPopup(auth, provider);
  }

  async function linkGoogleAccount(): Promise<UserCredential> {
    if (!auth.currentUser) throw new Error('No user is currently signed in');
    const provider = new GoogleAuthProvider();
    log.info('Linking Google account');
    return linkWithPopup(auth.currentUser, provider);
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
    loginFieldWorker,
    loginWithGoogle,
    linkGoogleAccount,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
