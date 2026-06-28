import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  User as FirebaseUser 
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  getDocFromServer,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  uploadString
} from "firebase/storage";
import firebaseConfig from "../firebase-applet-config.json";
import { FirestoreIssue } from "./types";
import { getSeededIssues } from "./seedData";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

let storageInstance: any = null;
try {
  if (firebaseConfig.storageBucket && firebaseConfig.storageBucket.trim() !== "") {
    storageInstance = getStorage(app);
  }
} catch (e) {
  console.warn("Failed to initialize Firebase Storage:", e);
}
export const storage = storageInstance;

export function isStorageConfigured(): boolean {
  return (
    !!storage &&
    !!firebaseConfig.storageBucket &&
    firebaseConfig.storageBucket.trim() !== "" &&
    !firebaseConfig.storageBucket.includes("YOUR_") &&
    !firebaseConfig.storageBucket.includes("<")
  );
}


// Providers
export const googleProvider = new GoogleAuthProvider();

// Operation types for Firestore diagnostics
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on load
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Authentication Helpers
export async function signInWithGoogle(role: "citizen" | "official" = "citizen") {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const firebaseUser = result.user;

    // Create/update user document in Firestore collection: users
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userPayload = {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || "Anonymous User",
      email: firebaseUser.email || "",
      photoURL: firebaseUser.photoURL || "",
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(userDocRef, userPayload, { merge: true });
    } catch (dbErr) {
      handleFirestoreError(dbErr, OperationType.WRITE, `users/${firebaseUser.uid}`);
    }

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || "",
      name: firebaseUser.displayName || "Anonymous User",
      picture: firebaseUser.photoURL || "",
      photoURL: firebaseUser.photoURL || "",
      role: role,
      createdAt: userPayload.createdAt
    };
  } catch (err) {
    console.error("Error signing in with Google:", err);
    throw err;
  }
}

export async function logOut() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("Error signing out:", err);
    throw err;
  }
}

// Storage upload helpers
export async function uploadFileToStorage(file: File, path: string): Promise<string> {
  if (!isStorageConfigured()) {
    throw new Error("Firebase Storage is not configured.");
  }
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  } catch (err) {
    console.error("Storage uploadFileToStorage failed:", err);
    throw err;
  }
}

export async function uploadBase64ToStorage(base64String: string, path: string): Promise<string> {
  if (!isStorageConfigured()) {
    throw new Error("Firebase Storage is not configured.");
  }
  try {
    const storageRef = ref(storage, path);
    const format = base64String.startsWith("data:") ? "data_url" : "base64";
    const snapshot = await uploadString(storageRef, base64String, format);
    return await getDownloadURL(snapshot.ref);
  } catch (err) {
    console.error("Storage uploadBase64ToStorage failed:", err);
    throw err;
  }
}

// Client-side base64 image compression utility to fit in Firestore 1MB limits
export async function compressBase64Image(base64Str: string, maxBytes: number = 800000): Promise<string> {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith("data:image")) {
      resolve(base64Str);
      return;
    }
    
    if (base64Str.length <= maxBytes) {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      
      const maxDimension = 1000;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(base64Str);
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      let quality = 0.8;
      let result = canvas.toDataURL("image/jpeg", quality);
      
      while (result.length > maxBytes && quality > 0.15) {
        quality -= 0.1;
        result = canvas.toDataURL("image/jpeg", quality);
      }
      
      resolve(result);
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
}


// Firestore utilities for issues
export async function createFirestoreIssue(issueData: Omit<FirestoreIssue, "id" | "createdAt">): Promise<FirestoreIssue> {
  const issueCollectionRef = collection(db, "issues");
  const newDocRef = doc(issueCollectionRef);
  const issueId = newDocRef.id;
  
  const newIssue: FirestoreIssue = {
    ...issueData,
    id: issueId,
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(newDocRef, newIssue);
    return newIssue;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `issues/${issueId}`);
    throw err;
  }
}

export async function getFirestoreIssue(id: string): Promise<FirestoreIssue | null> {
  try {
    const docRef = doc(db, "issues", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as FirestoreIssue;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `issues/${id}`);
    throw err;
  }
}

export async function updateFirestoreIssue(id: string, updates: Partial<Omit<FirestoreIssue, "id">>): Promise<void> {
  try {
    const docRef = doc(db, "issues", id);
    const current = await getFirestoreIssue(id);
    if (!current) {
      throw new Error(`Issue with ID ${id} not found.`);
    }
    const merged = { ...current, ...updates };
    await setDoc(docRef, merged);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `issues/${id}`);
    throw err;
  }
}

export async function getAllFirestoreIssues(): Promise<FirestoreIssue[]> {
  try {
    const issuesCollection = collection(db, "issues");
    const q = query(issuesCollection, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const list: FirestoreIssue[] = [];
    querySnapshot.forEach((doc) => {
      list.push(doc.data() as FirestoreIssue);
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, "issues");
    throw err;
  }
}

export async function deleteFirestoreIssue(id: string): Promise<void> {
  try {
    const docRef = doc(db, "issues", id);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `issues/${id}`);
    throw err;
  }
}

export async function seedDemoIssuesIfEmpty(): Promise<boolean> {
  try {
    const issuesCollection = collection(db, "issues");
    const querySnapshot = await getDocs(issuesCollection);
    if (querySnapshot.empty) {
      console.log("Firestore issues collection is empty. Seeding 20 realistic municipal issues...");
      const seeded = getSeededIssues();
      for (const issue of seeded) {
        const docRef = doc(db, "issues", issue.id);
        await setDoc(docRef, issue);
      }
      console.log("Successfully seeded 20 realistic municipal issues into Firestore!");
      return true;
    }
    return false;
  } catch (err) {
    console.error("Failed to seed demo issues:", err);
    return false;
  }
}

