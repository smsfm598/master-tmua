"use client";
import React from "react";
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Dashboard from './Dashboard';

function MainComponent() {
  const { user, isLoaded } = useUser(); // Fixed: use consistent destructuring
  const router = useRouter();
  const [examHistory, setExamHistory] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const fetchExamHistory = async () => {
      if (!user) return;

      try {
        const response = await fetch("/api/get-exam-history", {
          method: "GET", // Changed from POST to GET
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch exam history: ${response.status}`);
        }

        const result = await response.json();

        if (result.error) {
          throw new Error(result.error);
        }

        setExamHistory(result.exams || []);
      } catch (err) {
        console.error("Error fetching exam history:", err);
        setError("Failed to load exam history");
      } finally {
        setLoading(false);
      }
    };

    fetchExamHistory();
  }, [user]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#150025] to-[#280040] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login instead of showing access denied
    router.push('/login');
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#150025] to-[#280040] flex items-center justify-center">
        <div className="text-white text-xl">Redirecting to login...</div>
      </div>
    );
  }

  // Use the Dashboard component instead of the old implementation
  return <Dashboard onReady={() => {}} />;
}

export default MainComponent;