import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const FB_GRAPH_URL = 'https://graph.facebook.com/v19.0';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await req.json();
        const { shortLivedToken } = body;

        if (!shortLivedToken) {
            return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
        }

        // 1. Exchange for Long-Lived User Token
        // This is important so the user doesn't have to login constantly
        const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
        const appSecret = process.env.FACEBOOK_APP_SECRET;

        let userAccessToken = shortLivedToken;

        if (appSecret) {
            const exchangeUrl = `${FB_GRAPH_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;
            const exchangeRes = await fetch(exchangeUrl);
            const exchangeData = await exchangeRes.json();

            if (exchangeData.access_token) {
                userAccessToken = exchangeData.access_token;
            } else {
                console.error('Error exchanging token:', exchangeData);
                // Continue with short lived if exchange fails, or error out?
                // Ideally error out but for dev we might continue
            }
        }

        // 2. Fetch Pages and their Instagram Business Accounts
        // permission: pages_show_list, pages_read_engagement, instagram_basic
        const pagesUrl = `${FB_GRAPH_URL}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,profile_picture_url},picture{url}&access_token=${userAccessToken}&limit=100`;
        const pagesRes = await fetch(pagesUrl);
        const pagesData = await pagesRes.json();

        if (pagesData.error) {
            return NextResponse.json({ error: pagesData.error.message }, { status: 400 });
        }

        const pages = pagesData.data || [];

        // 3. Fetch WhatsApp Business Accounts
        // This is trickier. Usually we need 'whatsapp_business_management' permission.
        // We query the user's businesses and then the WBAs owned by them.
        // OR we query /me/assigned_business_managers -> /client_whatsapp_business_accounts

        // Simplified approach: Get businesses -> Client WhatsApp Accounts
        let whatsappAccounts: any[] = [];

        try {
            const businessesUrl = `${FB_GRAPH_URL}/me/businesses?fields=id,name,client_whatsapp_business_accounts{id,name,currency,timezone_id,message_templates}&access_token=${userAccessToken}`;
            const bizRes = await fetch(businessesUrl);
            const bizData = await bizRes.json();

            if (!bizData.error && bizData.data) {
                for (const biz of bizData.data) {
                    if (biz.client_whatsapp_business_accounts?.data) {
                        // For each WABA, we need phone numbers
                        for (const waba of biz.client_whatsapp_business_accounts.data) {
                            const phonesUrl = `${FB_GRAPH_URL}/${waba.id}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating&access_token=${userAccessToken}`;
                            const phonesRes = await fetch(phonesUrl);
                            const phonesData = await phonesRes.json();

                            if (phonesData.data) {
                                whatsappAccounts.push({
                                    waba_id: waba.id,
                                    waba_name: waba.name,
                                    phone_numbers: phonesData.data.map((p: any) => ({
                                        ...p,
                                        waba_id: waba.id
                                    }))
                                });
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error fetching WhatsApp accounts', e);
        }

        return NextResponse.json({
            success: true,
            user_access_token: userAccessToken, // Return this so client can send it back when connecting specific assets? No, security risk? 
            // Better: client selects asset, sends ID back. 
            // BUT: we need the page access token or WABA token to save to DB.
            // For now, we return structured data and we might assume the client sends back the selection 
            // and we re-fetch or we cache the user token in session (complicated without session).
            // SIMPLEST: Return the tokens here (encrypted/secure channel HTTPS) and client sends back the specific ones to save.

            assets: {
                pages: pages.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    access_token: p.access_token,
                    picture: p.picture?.data?.url
                })),
                instagram: pages.filter((p: any) => p.instagram_business_account).map((p: any) => ({
                    id: p.instagram_business_account.id,
                    username: p.instagram_business_account.username,
                    page_id: p.id, // Linked Page ID
                    page_access_token: p.access_token, // IG Graph API uses Page Token
                    profile_picture_url: p.instagram_business_account.profile_picture_url
                })),
                whatsapp: whatsappAccounts
            }
        });

    } catch (error: any) {
        console.error('Error in valid token exchange:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
