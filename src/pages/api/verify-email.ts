import type { APIRoute } from 'astro';
import { verifyTokenAndLogConversion } from '~/lib/database-operations';
import type { VerifiedTokenData } from '~/lib/database-operations';
// Placeholder for ConvertKit service - we'll need to implement this
// import { updateSubscriberTags } from '~/lib/convertkitService'; 

const CONVERTKIT_TAG_ID_VERIFIED = import.meta.env.CONVERTKIT_TAG_ID_VERIFIED as string;
// const CONVERTKIT_TAG_ID_NOT_VERIFIED = import.meta.env.CONVERTKIT_TAG_ID_NOT_VERIFIED as string; // Commented out as not currently used

export const GET: APIRoute = async ({ request, redirect, site }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    console.warn('[API /verify-email] Token missing from URL.');
    // Redirect to a generic error page or homepage if token is missing
    return redirect('/verification-failed?error=missing_token', 302);
  }

  console.log(`[API /verify-email] Received verification request with token: ${token}`);
  const verificationResult: VerifiedTokenData = await verifyTokenAndLogConversion(token);

  if (verificationResult.success && verificationResult.email) {
    console.log(`[API /verify-email] Token validated successfully for email: ${verificationResult.email}. UserProfileId: ${verificationResult.userProfileId}`);

    // ConvertKit actions: Add 'verified' tag, remove 'not verified' tag (if applicable)
    if (CONVERTKIT_TAG_ID_VERIFIED) {
        try {
            // TODO: Implement actual ConvertKit API call using a robust service
            // For now, let's assume a function like this exists or will be created:
            // const kitSuccess = await updateSubscriberTags(verificationResult.kitSubscriberId || verificationResult.email, [CONVERTKIT_TAG_ID_VERIFIED], [CONVERTKIT_TAG_ID_NOT_VERIFIED]);
            // if (kitSuccess) {
            //     console.log(`[API /verify-email] Successfully updated ConvertKit tags for ${verificationResult.email}`);
            // } else {
            //     console.warn(`[API /verify-email] Failed to update ConvertKit tags for ${verificationResult.email}`);
            // }
            console.log(`[API /verify-email] Placeholder: Would update ConvertKit tags for ${verificationResult.email}. Verified Tag ID: ${CONVERTKIT_TAG_ID_VERIFIED}`);
            if (verificationResult.kitSubscriberId) {
                console.log(`   Using Kit Subscriber ID: ${verificationResult.kitSubscriberId}`);
            }
        } catch (kitError) {
            console.error('[API /verify-email] Error during ConvertKit interaction:', kitError);
        }
    } else {
        console.warn('[API /verify-email] CONVERTKIT_TAG_ID_VERIFIED is not configured. Skipping ConvertKit tag update.');
    }

    // Redirect to a success page, optionally passing user info
    const successRedirectUrl = new URL('/verification-success', site);
    if (verificationResult.email) successRedirectUrl.searchParams.set('email', verificationResult.email);
    if (verificationResult.firstName) successRedirectUrl.searchParams.set('name', verificationResult.firstName);
    
    console.log(`[API /verify-email] Redirecting to success page: ${successRedirectUrl.toString()}`);
    return redirect(successRedirectUrl.toString(), 302);

  } else {
    console.warn(`[API /verify-email] Token validation failed for token: ${token}. Reason: ${verificationResult.message}`);
    // Redirect to an error page with a more specific error if possible
    let errorQuery = 'invalid_token';
    if (verificationResult.error === 'Token expired') errorQuery = 'expired_token';
    if (verificationResult.error === 'Token already used') errorQuery = 'already_verified'; // Or a different page for this
    
    const failureRedirectUrl = new URL('/verification-failed', site);
    failureRedirectUrl.searchParams.set('error', errorQuery);
    if (verificationResult.email) failureRedirectUrl.searchParams.set('email', verificationResult.email); // For resend option

    console.log(`[API /verify-email] Redirecting to failure page: ${failureRedirectUrl.toString()}`);
    return redirect(failureRedirectUrl.toString(), 302);
  }
}; 