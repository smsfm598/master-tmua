// app/layout.jsx
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import { AuthProvider } from '../contexts/AuthContext';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Master TMUA',
  description: 'The best practice for the Test of Mathematics for University Admission. How to get a 9.0 on the TMUA, How to get full marks on the TMUA, TMUA preparation site, TMUA prep, TMUA Exam simulator, Best TMUA website, TMUA Resources, How to prepare for the TMUA, TMUA Guidance, Test for University Admissions, Maths Admissions Test, MAT, TMUA, ',
};

// Add error boundary component
function ClerkErrorBoundary({ children }) {
  return (
    <ClerkProvider 
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/dashboard"
      signInUrl="/login"
      signUpUrl="/sign-up"
    >
      {children}
    </ClerkProvider>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClerkErrorBoundary>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ClerkErrorBoundary>
      </body>
    </html>
  );
}
