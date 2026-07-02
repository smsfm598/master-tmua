'use client';

import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#150025] to-[#280040] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <SignIn 
          path="/login" 
          signUpUrl="/sign-up" 
          redirectUrl="/dashboard"
          localization={{
            socialButtonsBlockButton: 'Continue with {{provider|capitalize}}',
            useAnotherMethod: 'Try a different sign in method',
            signInEnterPasswordTitle: 'Enter your password',
            signInEnterPasswordSubtitle: 'Enter the password you used to create your account',
          }}
          appearance={{
            elements: {
              formButtonPrimary: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-none',
              card: 'bg-[#1a0030] border border-[#5c4d7d] shadow-lg rounded-2xl',
              headerTitle: 'text-white',
              headerSubtitle: 'text-gray-50',
              socialButtonsBlockButton: 'bg-[#2a0040] border border-[#5c4d7d] text-white hover:bg-[#3a0050]',
              formFieldLabel: 'text-white',
              formFieldInput: 'bg-[#2a0040] border border-[#5c4d7d] text-white',
              footerText: 'text-gray-50',
              footerActionLink: 'text-purple-400 hover:text-purple-300',
              useAnotherMethodLink: 'text-purple-400 hover:text-purple-300',
            }
          }}
        />
      </div>
    </div>
  );
}
