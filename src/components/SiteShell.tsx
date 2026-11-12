'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface SiteShellProps {
  children: React.ReactNode;
  currentUser: any;
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
}

export default function SiteShell({
  children,
  currentUser,
  unreadNotificationsCount,
  unreadMessagesCount,
}: SiteShellProps) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-[#090909] text-[#F5F5F5] flex flex-col">
        {children}
      </div>
    );
  }

  return (
    <>
      <Navbar
        currentUser={currentUser}
        unreadNotificationsCount={unreadNotificationsCount}
        unreadMessagesCount={unreadMessagesCount}
      />
      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
      <Footer />
    </>
  );
}
