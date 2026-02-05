import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { shortLivedToken } = body;

        if (!shortLivedToken) {
            return NextResponse.json({ error: 'Missing token' }, { status: 400 });
        }

        console.log('🔄 [API] Starting WhatsApp Token Exchange...');

        // 1. Exchange Short-Lived User Token for Long-Lived User Token (Optional but recommended)
        const exchangeUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.NEXT_PUBLIC_FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${shortLivedToken}`;

        const exchangeRes = await fetch(exchangeUrl);
        const exchangeData = await exchangeRes.json();

        if (exchangeData.error) {
            console.error('❌ [API] Token Exchange Error:', exchangeData.error);
            return NextResponse.json({ error: 'Failed to exchange token', details: exchangeData.error }, { status: 400 });
        }

        const longLivedToken = exchangeData.access_token || shortLivedToken;

        // 2. Fetch WABAs (WhatsApp Business Accounts) the user has access to
        // We look for the one that was likely just shared/created. For simplicity, we pick the first valid one or filter by ID if passed.
        const wabaRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedToken}`); // This fetches Pages, but for WABA we need a different endpoint usually: me?fields=whatsapp_business_accounts

        // Correct endpoint for finding shared WABAs via granular scopes might be different, 
        // but often 'me/businesses' or checking specific IDs is needed. 
        // However, the Embedded Signup flow usually is about connecting a specific phone number.
        // Let's try fetching the granular scopes or the specific setup.

        // BETTER APPROACH: Fetch the client_business_accounts or similar if granular.
        // For now, we will query `me?fields=id,name` and then try to find the numbers.

        // Actually, let's use the standard "fetch phone numbers" from the WABA if we can find the WABA ID.
        // Since we don't have the WABA ID from the frontend explicitly (unless passed), we might need to find it.
        // But the user just granted permissions.

        // Let's try to fetch all WABAs:
        const accountsRes = await fetch(`https://graph.facebook.com/v19.0/me/whatsapp_business_accounts?access_token=${longLivedToken}`);
        const accountsData = await accountsRes.json();

        if (accountsData.error || !accountsData.data || accountsData.data.length === 0) {
            console.error('❌ [API] No WABA found:', accountsData);
            return NextResponse.json({ error: 'No WhatsApp Business Account found on this user.' }, { status: 404 });
        }

        // We'll take the first WABA found. In a real multi-WABA scenario, we'd ask the user to pick, 
        // but Embedded Signup usually focuses on one context.
        const wabaId = accountsData.data[0].id;
        const wabaName = accountsData.data[0].name;

        console.log(`✅ [API] Found WABA: ${wabaName} (${wabaId})`);

        // 3. Fetch Phone Numbers for this WABA
        const numbersRes = await fetch(`https://graph.facebook.com/v19.0/${wabaId}/phone_numbers?access_token=${longLivedToken}`);
        const numbersData = await numbersRes.json();

        if (numbersData.error || !numbersData.data || numbersData.data.length === 0) {
            return NextResponse.json({ error: 'No Phone Numbers found in this WABA.' }, { status: 404 });
        }

        // We'll take the first verified number.
        const phoneNumberObj = numbersData.data[0];
        const phoneNumberId = phoneNumberObj.id;
        const displayPhoneNumber = phoneNumberObj.display_phone_number;
        const qualityRating = phoneNumberObj.quality_rating;

        console.log(`✅ [API] Found Phone: ${displayPhoneNumber} (${phoneNumberId})`);

        // 4. Register the Webhook (Configuration)
        // We need to subscribe this WABA to our webhook.
        // IMPORTANT: The app must be configured with the webhook URL in the App Dashboard already.
        // This step subscribes the specific WABA to receive fields.
        const subscribeRes = await fetch(`https://graph.facebook.com/v19.0/${wabaId}/subscribed_apps`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                access_token: longLivedToken, // System User token is best, but User access token works if Admin
            })
        });
        const subscribeData = await subscribeRes.json();

        if (subscribeData.error) {
            console.warn('⚠️ [API] Webhook subscription warning:', subscribeData.error);
            // We continue, as it might already be subscribed or require system user.
        }

        // 5. Save credentials to Supabase
        const supabase = createClient();

        // Check if channel exists to update or insert
        // We use a simplified table structure assumption here based on previous context
        const { error: dbError } = await supabase
            .from('channels') // Assuming a 'channels' table exists
            .upsert({
                type: 'whatsapp_business',
                name: `WhatsApp (${displayPhoneNumber})`,
                status: 'active',
                credentials: {
                    waba_id: wabaId,
                    phone_number_id: phoneNumberId,
                    access_token: longLivedToken,
                    display_phone_number: displayPhoneNumber,
                    quality_rating: qualityRating
                },
                updated_at: new Date().toISOString()
            }, { onConflict: 'type' });

        if (dbError) {
            console.error('❌ [API] DB Save Error:', dbError);
            return NextResponse.json({ error: 'Database save failed' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            account: displayPhoneNumber,
            waba_id: wabaId
        });

    } catch (error: any) {
        console.error('❌ [API] General Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
