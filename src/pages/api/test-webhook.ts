export const prerender = false;
import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';

export const POST: APIRoute = async ({ request }) => {
  const requestTimestamp = new Date().toISOString();
  console.log(`[Test Webhook ${requestTimestamp}] Received test request`);

  try {
    const formData = await request.formData();
    const email = formData.get('email')?.toString()?.toLowerCase()?.trim();
    const action = formData.get('action')?.toString(); // 'verify' or 'unverify'

    if (!email) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Email is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'verify') {
      // Test verification using the database function
      const { data: functionResult, error: functionError } = await supabase
        .rpc('verify_quiz_email', { 
          email_to_verify: email,
          quiz_type_filter: null
        });

      if (functionError) {
        console.error(`[Test Webhook ${requestTimestamp}] Error verifying email:`, functionError);
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Verification failed',
          error: functionError.message
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const recordsUpdated = functionResult || 0;
      console.log(`[Test Webhook ${requestTimestamp}] Test verification complete for ${email}: ${recordsUpdated} records updated`);

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Test verification completed for ${email}`,
        records_updated: recordsUpdated,
        action: 'verify'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } else if (action === 'unverify') {
      // Test un-verification
      const { data: unverifyResult, error: unverifyError } = await supabase
        .from('quiz_results')
        .update({ 
          is_email_verified: false,
          verification_timestamp: null 
        })
        .eq('email', email)
        .select('id');

      if (unverifyError) {
        console.error(`[Test Webhook ${requestTimestamp}] Error un-verifying email:`, unverifyError);
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Un-verification failed',
          error: unverifyError.message
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const recordsUpdated = unverifyResult?.length || 0;
      console.log(`[Test Webhook ${requestTimestamp}] Test un-verification complete for ${email}: ${recordsUpdated} records updated`);

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Test un-verification completed for ${email}`,
        records_updated: recordsUpdated,
        action: 'unverify'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } else {
      // Check verification status
      const { data: checkResult, error: checkError } = await supabase
        .from('quiz_results')
        .select('id, email, quiz_type, is_email_verified, verification_timestamp, attempt_timestamp')
        .eq('email', email);

      if (checkError) {
        console.error(`[Test Webhook ${requestTimestamp}] Error checking email status:`, checkError);
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Status check failed',
          error: checkError.message
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      console.log(`[Test Webhook ${requestTimestamp}] Status check complete for ${email}: ${checkResult?.length || 0} records found`);

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Status check completed for ${email}`,
        records_found: checkResult?.length || 0,
        records: checkResult || [],
        action: 'check'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error(`[Test Webhook ${requestTimestamp}] Error:`, error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Test webhook error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// GET endpoint for test interface
export const GET: APIRoute = async ({ request }) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Webhook Test Interface</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, select, button { padding: 8px; font-size: 14px; }
        input[type="email"] { width: 300px; }
        button { background: #007cba; color: white; border: none; cursor: pointer; margin-right: 10px; }
        button:hover { background: #005a87; }
        .result { margin-top: 20px; padding: 15px; border-radius: 5px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .info { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>ConvertKit Webhook Test Interface</h1>
    
    <form id="testForm">
        <div class="form-group">
            <label for="email">Email Address:</label>
            <input type="email" id="email" name="email" required placeholder="user@example.com">
        </div>
        
        <div class="form-group">
            <label for="action">Action:</label>
            <select id="action" name="action">
                <option value="check">Check Status</option>
                <option value="verify">Mark as Verified</option>
                <option value="unverify">Mark as Unverified</option>
            </select>
        </div>
        
        <button type="submit">Execute Test</button>
        <button type="button" onclick="clearResult()">Clear Result</button>
    </form>
    
    <div id="result"></div>
    
    <h2>Available Endpoints</h2>
    <ul>
        <li><strong>/api/convertkit-webhook</strong> - Basic webhook endpoint</li>
        <li><strong>/api/convertkit-webhook-secure</strong> - Secure webhook with signature verification</li>
        <li><strong>/api/test-webhook</strong> - This testing interface</li>
    </ul>
    
    <h2>ConvertKit Setup Instructions</h2>
    <ol>
        <li>In ConvertKit, go to Settings → Webhooks</li>
        <li>Add webhook URL: <code>https://yourdomain.com/api/convertkit-webhook-secure</code></li>
        <li>Select events: <code>subscriber.subscriber_activate</code>, <code>subscriber.form_subscribe</code></li>
        <li>Test with the form above to verify functionality</li>
    </ol>

    <script>
        document.getElementById('testForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const resultDiv = document.getElementById('result');
            
            resultDiv.innerHTML = '<div class="info">Testing webhook...</div>';
            
            try {
                const response = await fetch('/api/test-webhook', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    resultDiv.innerHTML = \`
                        <div class="success">
                            <h3>✅ Test Successful</h3>
                            <p><strong>Message:</strong> \${result.message}</p>
                            \${result.records_updated !== undefined ? \`<p><strong>Records Updated:</strong> \${result.records_updated}</p>\` : ''}
                            \${result.records_found !== undefined ? \`<p><strong>Records Found:</strong> \${result.records_found}</p>\` : ''}
                            <pre>\${JSON.stringify(result, null, 2)}</pre>
                        </div>
                    \`;
                } else {
                    resultDiv.innerHTML = \`
                        <div class="error">
                            <h3>❌ Test Failed</h3>
                            <p><strong>Message:</strong> \${result.message}</p>
                            <pre>\${JSON.stringify(result, null, 2)}</pre>
                        </div>
                    \`;
                }
            } catch (error) {
                resultDiv.innerHTML = \`
                    <div class="error">
                        <h3>❌ Network Error</h3>
                        <p><strong>Error:</strong> \${error.message}</p>
                    </div>
                \`;
            }
        });
        
        function clearResult() {
            document.getElementById('result').innerHTML = '';
        }
    </script>
</body>
</html>
  `;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  });
}; 