import './globals.css';
import ToastContainer from '@/components/Toast';

export const metadata = {
    title: 'AI Trading Platform',
    description: 'AI-Assisted Stock & Forex Paper Trading Platform',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                {children}
                <ToastContainer />
            </body>
        </html>
    );
}
