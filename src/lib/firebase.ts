import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  signInAnonymously,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with custom databaseId if defined, and enable multi-tab persistence
const customDbId = (firebaseConfig as any).firestoreDatabaseId;
let db;
try {
  if (customDbId) {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    }, customDbId);
  } else {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
  }
} catch {
  // Fallback if already initialized
  db = customDbId ? getFirestore(app, customDbId) : getFirestore(app);
}

export { db };

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
// Encourage account selection and explicit consent during popup sign-in
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { signInWithPopup, signOut, signInAnonymously, onAuthStateChanged };
export type { User };
