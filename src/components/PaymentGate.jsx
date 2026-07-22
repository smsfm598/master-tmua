"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { checkUserEntitlements, isPaperFree } from '../lib/supabase';
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

    // Free papers are always accessible
    if (isPaperFree(paperName)) {
      setAccessStatus({
        hasAccess: true,
        reason: 'free_paper'
      });
      setLoading(false);
      return;
    }

    // Check premium access via the API
    const entitlements = await checkUserEntitlements();

    const access = {
      hasAccess: entitlements.hasFullAccess,
      reason: entitlements.hasFullAccess
        ? 'paid_access'
        : 'requires_payment'
    };

    setAccessStatus(access);
    setLoading(false);

    if (!access.hasAccess) {
      setShowUpgradeModal(true);
    }
  };

  checkAccess();
}, [user, isLoaded, router, paperName]);

const handleUpgradeModalClose = () => {
  setShowUpgradeModal(false);
  router.push('/papers');
};

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
