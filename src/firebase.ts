import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig as any);

const firestoreSettings = {
  experimentalForceLongPolling: true,
};

export const db = (firebaseConfig as any).firestoreDatabaseId 
  ? initializeFirestore(app, firestoreSettings, (firebaseConfig as any).firestoreDatabaseId) 
  : initializeFirestore(app, firestoreSettings);

export const auth = getAuth(app);

if (!firebaseConfig.storageBucket) {
  console.warn("Storage bucket is not configured in firebase-applet-config.json. Firebase Storage uploads will fail until enabled.");
}
export const storage = getStorage(app);

export default app;
