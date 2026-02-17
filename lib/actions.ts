'use server';

import { signOut, signIn } from '@/auth';

export async function signOutAction() {
  await signOut({ redirectTo: '/' });
}

export async function signInAction(formData: FormData) {
  const callbackUrl = (formData.get('callbackUrl') as string) || '/dashboard';
  
  // Check for required environment variables
  if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
    throw new Error('AUTH_SECRET or NEXTAUTH_SECRET must be set in environment variables');
  }
  
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in environment variables');
  }
  
  await signIn('google', { callbackUrl });
}
