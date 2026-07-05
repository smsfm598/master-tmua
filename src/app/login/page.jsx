'use client';

import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#150025] to-[#280040] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <SignIn 
          signUpUrl="/sign-up"
          localization={{
            useAnotherMethod: 'Try a different sign in method',
            signInEnterPasswordTitle: 'Enter your password',
            signInEnterPasswordSubtitle: 'Enter the password you used to create your account',
          }}
          appearance={{
            variables: {
              colorPrimary: '#8b5cf6',
              colorBackground: '#1a0030',
              colorInputBackground: 'rgba(88, 28, 135, 0.4)',
              colorInputText: '#ffffff',
              colorInputBorder: 'rgba(168, 85, 247, 0.5)',
              colorText: '#ffffff',
              colorTextSecondary: '#e5e7eb',
              colorTextOnPrimaryBackground: '#ffffff',
            },
            elements: {
              formButtonPrimary: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-none shadow-lg',
              card: 'bg-[#1a0030] border border-[#5c4d7d] shadow-xl rounded-2xl',
              headerTitle: 'text-white text-2xl font-bold',
              headerSubtitle: 'text-gray-100',
              formFieldLabel: 'text-gray-100 font-medium',
              formFieldInput: 'bg-purple-900/50 border-2 border-purple-500/60 text-white placeholder:text-gray-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/70 focus:outline-none rounded-lg',
              formFieldHintText: 'text-gray-100 text-sm',
              footerText: 'text-gray-100',
              footerActionLink: 'text-purple-400 hover:text-purple-300 font-medium',
              useAnotherMethodLink: 'text-purple-400 hover:text-purple-300 font-medium',
              formFieldAction: 'text-gray-100 hover:text-gray-50 font-medium',
              formFieldErrorText: 'text-red-300 font-medium',
              formFieldSuccessText: 'text-green-300 font-medium',
              identityPreviewText: 'text-gray-100',
              otpInput: 'bg-purple-900/50 border-2 border-purple-500/60 text-white focus:border-purple-400 focus:ring-2 focus:ring-purple-400/70 focus:outline-none rounded-lg',
            }
          }}
        />
      </div>
    </div>
  );
}
