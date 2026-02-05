
/**
 * Singleton utility to initialize Facebook SDK once.
 * Addresses the "overriding current access token" error by being extremely defensive.
 */

export const initFacebookSDK = (): Promise<void> => {
    if (typeof window === 'undefined') return Promise.resolve();

    // Store the promise on window to survive HMR
    // @ts-ignore
    if (window.__fb_init_promise) return window.__fb_init_promise;

    // @ts-ignore
    window.__fb_init_promise = new Promise((resolve) => {
        const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

        const finalize = () => {
            // @ts-ignore
            window.FB_INITIALIZED = true;
            resolve(undefined);
        };

        // If FB is already there, check if we need to init
        // @ts-ignore
        if (window.FB) {
            try {
                // @ts-ignore
                if (!window.FB_INITIALIZED) {
                    // @ts-ignore
                    window.FB.init({
                        appId: appId,
                        cookie: false, // Set to false to avoid token conflicts with old sessions
                        xfbml: false,  // Not needed for our custom flow
                        version: 'v19.0'
                    });
                }
            } catch (e) {
                console.warn('Caught FB.init conflict (expected in some cases):', e);
            }
            finalize();
            return;
        }

        // Standard injection
        // @ts-ignore
        window.fbAsyncInit = function () {
            try {
                // @ts-ignore
                window.FB.init({
                    appId: appId,
                    cookie: false,
                    xfbml: false,
                    version: 'v19.0'
                });
            } catch (e) {
                console.warn('fbAsyncInit conflict:', e);
            }
            finalize();
        };

        if (!document.getElementById('facebook-jssdk')) {
            const js = document.createElement('script');
            js.id = 'facebook-jssdk';
            js.src = "https://connect.facebook.net/en_US/sdk.js";
            const firstScript = document.getElementsByTagName('script')[0];
            if (firstScript && firstScript.parentNode) {
                firstScript.parentNode.insertBefore(js, firstScript);
            } else {
                document.body.appendChild(js);
            }
        }
    });

    // @ts-ignore
    return window.__fb_init_promise;
};
