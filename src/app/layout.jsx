// app/layout.jsx
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import { AuthProvider } from '../contexts/AuthContext';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'TMUA Prep',
  description: 'Practice for the Test of Mathematics for University Admission',
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <html lang="en">
        <body className={inter.className}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
