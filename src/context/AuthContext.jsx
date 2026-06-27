import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInAnonymously,
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase';

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loginAsFieldWorker(displayName, phoneNumber) {
    const result = await signInAnonymously(auth);
    await updateProfile(result.user, { displayName, photoURL: phoneNumber });
    
    // Save worker profile to Firestore so Supervisor can see them
    const { doc, setDoc } = await import('firebase/firestore');
    const { db } = await import('../firebase');
    await setDoc(doc(db, 'workers', phoneNumber), {
      name: displayName,
      phone: phoneNumber,
      location: 'Detecting...',
      lastActive: new Date().toISOString()
    }, { merge: true });

    // Force a state refresh so displayName and phone are immediately available
    setCurrentUser({ ...result.user, displayName, photoURL: phoneNumber });
    return result;
  }

  function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return signInWithPopup(auth, provider);
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loginAsFieldWorker,
    loginWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
