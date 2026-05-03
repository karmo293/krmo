import { 
  getDoc, 
  doc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';

export interface WalletTransaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'purchase';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  createdAt: Date;
}

export interface UserProfile {
  userId: string;
  email: string;
  username: string;
  balance: number;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    return null;
  }
}

export async function createUserProfile(userId: string, email: string, username: string): Promise<void> {
  try {
    await setDoc(doc(db, 'users', userId), {
      userId,
      email,
      username,
      balance: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${userId}`);
  }
}

export async function depositFunds(amount: number): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  try {
    await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User profile does not exist');
      }

      const newBalance = (userDoc.data().balance || 0) + amount;
      transaction.update(userRef, { 
        balance: newBalance,
        updatedAt: serverTimestamp()
      });

      const transRef = doc(collection(db, 'transactions'));
      transaction.set(transRef, {
        transactionId: transRef.id,
        userId: user.uid,
        type: 'deposit',
        amount,
        status: 'completed',
        description: 'Wallet Deposit',
        createdAt: serverTimestamp()
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'transactions/deposit');
  }
}

export async function withdrawFunds(amount: number): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  try {
    await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists()) throw new Error('User profile does not exist');
      
      const currentBalance = userDoc.data().balance || 0;
      if (currentBalance < amount) throw new Error('Insufficient funds');

      const newBalance = currentBalance - amount;
      transaction.update(userRef, { 
        balance: newBalance,
        updatedAt: serverTimestamp()
      });

      const transRef = doc(collection(db, 'transactions'));
      transaction.set(transRef, {
        transactionId: transRef.id,
        userId: user.uid,
        type: 'withdraw',
        amount,
        status: 'completed',
        description: 'Wallet Withdrawal',
        createdAt: serverTimestamp()
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'transactions/withdraw');
  }
}

export async function getTransactions(): Promise<WalletTransaction[]> {
  const user = auth.currentUser;
  if (!user) return [];

  try {
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt?.toDate() || new Date()
    })) as WalletTransaction[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'transactions');
    return [];
  }
}
