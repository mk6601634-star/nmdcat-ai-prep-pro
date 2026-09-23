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

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export { db };

// Initialize Storage
export const storage = getStorage(app);

/**
 * Upload an authentic past-paper PDF to Firebase Storage
 * Path pattern: past_papers/{year}_{paperId}/{sanitizedFileName}
 */
export async function uploadPastPaperPdf(
  file: File | Blob, 
  storagePath: string, 
  customMetadata?: Record<string, string>
): Promise<string> {
  const fileRef = ref(storage, storagePath);
  const metadata = {
    contentType: 'application/pdf',
    customMetadata: {
      uploadedAt: new Date().toISOString(),
      ...customMetadata
    }
  };
  const snapshot = await uploadBytes(fileRef, file, metadata);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
}

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
// Encourage account selection and explicit consent during popup sign-in
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { signInWithPopup, signOut, signInAnonymously, onAuthStateChanged };
export type { User };

