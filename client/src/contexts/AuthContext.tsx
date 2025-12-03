import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useLocation } from "wouter";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName?: string, photoURL?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Check for redirect result (if using signInWithRedirect)
    getRedirectResult(auth).then((result) => {
      if (result) {
        console.log("[Auth] Redirect sign-in successful:", result.user.email);
        setLocation("/dashboard");
      }
    }).catch((error) => {
      console.error("[Auth] Redirect sign-in error:", error);
    });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, [setLocation]);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    setLocation("/dashboard");
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }
    setLocation("/dashboard");
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // User signed in successfully
      console.log("[Auth] Google sign-in successful:", result.user.email);
      setLocation("/dashboard");
    } catch (error: any) {
      console.error("[Auth] Google sign-in error:", error);
      
      // Handle specific error cases
      if (error.code === 'auth/popup-closed-by-user') {
        // If popup was closed, try redirect method as fallback
        console.log("[Auth] Popup closed, trying redirect method...");
        try {
          await signInWithRedirect(auth, googleProvider);
          return; // Redirect will handle the rest
        } catch (redirectError: any) {
          throw new Error("Sign-in failed. Please try again.");
        }
      } else if (error.code === 'auth/popup-blocked') {
        // If popup is blocked, try redirect method as fallback
        console.log("[Auth] Popup blocked, trying redirect method...");
        try {
          await signInWithRedirect(auth, googleProvider);
          return; // Redirect will handle the rest
        } catch (redirectError: any) {
          throw new Error("Popup was blocked. Please allow popups for this site or try again.");
        }
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error("Network error. Please check your internet connection.");
      } else if (error.code === 'auth/unauthorized-domain') {
        throw new Error("This domain is not authorized. Please add this domain in Firebase Console → Project Settings → Authorized domains.");
      } else {
        throw error; // Re-throw original error
      }
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setLocation("/sign-in");
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateUserProfile = async (displayName?: string, photoURL?: string) => {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName,
        photoURL,
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

