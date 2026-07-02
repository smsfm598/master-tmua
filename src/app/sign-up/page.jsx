'use client';

import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#150025] to-[#280040] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <SignUp 
          path="/sign-up" 
          signInUrl="/login" 
          redirectUrl="/dashboard"
          localization={{
            socialButtonsBlockButton: 'Continue with {{provider|capitalize}}',
            useAnotherMethod: 'Try a different sign up method',
          }}
          appearance={{
            elements: {
              formButtonPrimary: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-none',
              card: 'bg-[#1a0030] border border-[#5c4d7d] shadow-lg rounded-2xl',
              headerTitle: 'text-white',
              headerSubtitle: 'text-gray-300',
              socialButtonsBlockButton: 'bg-[#2a0040] border border-[#5c4d7d] text-white hover:bg-[#3a0050]',
              formFieldLabel: 'text-gray-300',
              formFieldInput: 'bg-purple-900/30 border border-purple-500/40 text-white focus:border-purple-400 focus:ring-purple-400/50',
              formFieldHintText: 'text-gray-300',
              footerText: 'text-gray-400',
              footerActionLink: 'text-purple-400 hover:text-purple-300',
              useAnotherMethodLink: 'text-purple-400 hover:text-purple-300',
              formFieldAction: 'text-gray-300 hover:text-gray-100',
              formFieldErrorText: 'text-red-300',
              formFieldSuccessText: 'text-green-300',
              identityPreviewText: 'text-gray-300',
              otpInput: 'bg-purple-900/30 border border-purple-500/40 text-white focus:border-purple-400 focus:ring-purple-400/50',
            }
          }}
        />
      </div>
    </div>
  );
}
