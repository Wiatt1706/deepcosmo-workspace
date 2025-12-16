"use client";
import { redirect } from 'next/navigation';
import { useAuthGuard } from '@/lib/auth/hooks';
export default function Dashboard() {
  const { user, loading } = useAuthGuard();
  if (loading) {
    return <div>Loading...</div>;
  } else if (!user) {
    return redirect('/');
  } else {
    redirect('/dashboard/overview');
  }
}
