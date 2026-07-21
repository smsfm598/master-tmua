"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { getPaperAccess } from '../lib/supabase';
import UpgradeModal from './UpgradeModal';

export default function PaymentGate({ children, paperName }) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [accessStatus, setAccessStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!isLoaded) return;
      
      if (!user) {
        router.push('/login');
        return;
      }

      // Check paper access status
      console.log("Current Clerk user:", user.id);
      console.log("Access result:", access);
      const access = await getPaperAccess(user.id, paperName);
      setAccessStatus(access);
      setLoading(false);
      
      // Show upgrade modal if no access
      if (!access.hasAccess) {
        setShowUpgradeModal(true);
      }
    };

    checkAccess();
  }, [user, isLoaded, router, paperName]);

  const handleUpgradeModalClose = () => {
    setShowUpgradeModal(false);
    router.push('/papers'); // Redirect back to papers page
  };

  // Show loading state
  if (loading || !isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#150025] to-[#280040] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Show upgrade modal if access is denied
  if (!accessStatus?.hasAccess) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-[#150025] to-[#280040] flex items-center justify-center">
          <div className="text-white text-xl">Checking access...</div>
        </div>
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={handleUpgradeModalClose}
          paperName={paperName}
        />
      </>
    );
  }

  // Render the protected content if user has access
  return children;
}
