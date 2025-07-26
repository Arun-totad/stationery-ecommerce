'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  User as AuthUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp, runTransaction } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  userRole: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, role: UserRole, phoneNumber: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUserData = async () => {
    if (auth.currentUser) {
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();

          const createdAtDate = data.createdAt instanceof Timestamp 
            ? data.createdAt.toDate() 
            : new Date(data.createdAt);
          const updatedAtDate = data.updatedAt instanceof Timestamp 
            ? data.updatedAt.toDate() 
            : new Date(data.updatedAt);

          const updatedUser = {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email || '',
            displayName: data.displayName || '',
            phoneNumber: data.phoneNumber || null,
            addresses: data.addresses || [{ street: '', city: '', state: '', zipCode: '', country: '' }],
            role: data.role,
            createdAt: createdAtDate,
            updatedAt: updatedAtDate,
            ...(data.role === 'vendor' && { 
              shopName: (data as any).shopName || '', 
              isVerified: (data as any).isVerified || false, 
              products: (data as any).products || [] 
            }),
          } as User;
          setUser(updatedUser);
          setUserRole(data.role);
        } else {
          const defaultUser = {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email || '',
            displayName: auth.currentUser.displayName || '',
            phoneNumber: null,
            addresses: [{ street: '', city: '', state: '', zipCode: '', country: '' }],
            role: 'customer' as UserRole,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          setUser(defaultUser);
          setUserRole('customer');
        }
      } catch (error) {
        // Error refreshing user data
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser({
          uid: authUser.uid,
          email: authUser.email || '',
          displayName: authUser.displayName || '',
          phoneNumber: null,
          addresses: [{ street: '', city: '', state: '', zipCode: '', country: '' }],
          role: 'customer',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await refreshUserData();
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      await refreshUserData();
    } catch (error: any) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/invalid-credential') {
        const customError = new Error('Invalid email or password.');
        (customError as any).code = 'auth/invalid-credential';
        throw customError;
      }
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string, role: UserRole, phoneNumber: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Generate persistent user number
      let userNumber = '';
      await runTransaction(db, async (transaction) => {
        const metaRef = doc(db, 'userMeta', 'numbering');
        const metaSnap = await transaction.get(metaRef);
        let lastNumber = 0;
        if (metaSnap.exists()) {
          lastNumber = metaSnap.data().lastNumber || 0;
        }
        const newNumber = lastNumber + 1;
        const year = new Date().getFullYear();
        userNumber = `USR-${year}-${String(newNumber).padStart(4, '0')}`;
        transaction.set(metaRef, { lastNumber: newNumber }, { merge: true });
      });

      await setDoc(doc(db, 'users', newUser.uid), {
        email: newUser.email,
        displayName: name,
        phoneNumber: phoneNumber || null,
        addresses: [{ street: '', city: '', state: '', zipCode: '', country: '' }],
        role,
        userNumber, // Store persistent user number
        createdAt: new Date(),
        updatedAt: new Date(),
        ...(role === 'vendor' && { shopName: name, isVerified: false, products: [] }),
      });
      await refreshUserData();
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    userRole,
    loading,
    signIn,
    signUp,
    logout,
    resetPassword,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 