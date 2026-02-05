'use client';

import Script from 'next/script';
import { useEffect } from 'react';

export default function FacebookSDKProvider({ children }: { children: React.ReactNode }) {
    const fbAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

    useEffect(() => {
        // @ts-ignore
        window.fbAsyncInit = function () {
            // @ts-ignore
            if (window.FB_INITIALIZED) return;
            try {
                console.log('FacebookSDKProvider: Initializing FB SDK via fbAsyncInit...');
                // @ts-ignore
                window.FB.init({
                    appId: fbAppId,
                    cookie: false,
                    xfbml: false,
                    version: 'v19.0',
                    status: false // Disable auto-status check to avoid conflicts
                });
                // @ts-ignore
                window.FB_INITIALIZED = true;
                // @ts-ignore
                window.FB_READY = true;
                console.log('FacebookSDKProvider: Initialized Successfully');
                window.dispatchEvent(new Event('fb-sdk-ready'));
            } catch (e) {
                console.warn('FacebookSDKProvider: FB.init error', e);
            }
        };
    }, [fbAppId]);

    return (
        <>
            <Script
                id="facebook-jssdk"
                src="https://connect.facebook.net/en_US/sdk.js"
                strategy="afterInteractive"
            />
            {children}
        </>
    );
}
