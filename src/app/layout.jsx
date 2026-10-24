// app/layout.jsx
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import { AuthProvider } from '../contexts/AuthContext';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Master TMUA',
  description: 'The most authentic TMUA Preparation website, with an identical exam interface to Pearson VUE. Solve official questions and enjoy customised mistake-paper generation, automatic marking, score prediction and more. For the Test of Mathematics for University Admission, and how to get a 9.0 and full marks in the TMUA, the best preparation site.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClerkProvider 
          publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
          afterSignInUrl="/dashboard"
          afterSignUpUrl="/dashboard"
          signInUrl="/login"
          signUpUrl="/sign-up"
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
