// ============================================================
// VERCEL FUNCTION: SEND EMAIL VIA RESEND API
// ============================================================

export default async function handler(req, res) {
    // 1. Handle CORS preflight (OPTIONS) requests
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }

    // 2. Only allow POST requests
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Please use POST.' 
        });
    }

    console.log('📨 Function called with:', req.body);

    try {
        // 3. Get data from request
        const { email, code, action = 'verification' } = req.body;
        
        // 4. Validate input
        if (!email || !code) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email and verification code are required.' 
            });
        }

        // Basic email validation
        if (!email.includes('@') || !email.includes('.')) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid email address.' 
            });
        }

        // 5. Get Resend API key from environment variables (SECURE)
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        
        console.log('🔑 Resend API Key present:', RESEND_API_KEY ? 'YES' : 'NO');
        console.log('🔑 Resend API Key length:', RESEND_API_KEY ? RESEND_API_KEY.length : 0);
        
        if (!RESEND_API_KEY) {
            console.error('❌ Resend API key not configured in environment variables.');
            return res.status(500).json({ 
                success: false, 
                error: 'Email service is not configured. Please contact support.' 
            });
        }

        // 6. Build email subject based on action
        const subjectMap = {
            signup: 'Verify Your Email - FreeTranslate',
            signin: 'Your Sign In Code - FreeTranslate',
            reset: 'Reset Your Password - FreeTranslate',
            email: 'Change Email Verification - FreeTranslate',
            password: 'Change Password Verification - FreeTranslate',
            delete: 'Delete Account Verification - FreeTranslate'
        };
        
        const subject = subjectMap[action] || 'Your Verification Code - FreeTranslate';
        
        // 7. Build email HTML content
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>FreeTranslate Verification</title>
            </head>
            <body style="margin:0; padding:0; font-family: Arial, sans-serif; background:#f8f9fa;">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; margin:0 auto; padding:20px;">
                    <tr>
                        <td style="text-align:center; padding:20px 0;">
                            <h1 style="color:#4f46e5; margin:0;">🔐 FreeTranslate</h1>
                            <p style="color:#6b7280; font-size:16px;">Your verification code</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background:white; padding:30px; border-radius:8px; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
                            <p style="font-size:16px; color:#1f2937;">Hello,</p>
                            <p style="font-size:16px; color:#1f2937;">Your verification code is:</p>
                            <div style="text-align:center; padding:20px; background:#f3f4f6; border-radius:8px; margin:20px 0;">
                                <h2 style="font-size:36px; letter-spacing:8px; color:#4f46e5; margin:0;">${code}</h2>
                            </div>
                            <p style="font-size:14px; color:#6b7280;">This code will expire in 15 minutes.</p>
                            <p style="font-size:14px; color:#6b7280;">If you didn't request this, please ignore this email.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="text-align:center; padding:20px; font-size:12px; color:#9ca3af;">
                            © 2026 FreeTranslate | Built by Ornella Mutuyimana
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;

        // 8. Prepare Resend API payload
        const resendPayload = {
            from: 'FreeTranslate <mutuyimanaornella00@gmail.com>',
            to: email,
            subject: subject,
            html: htmlContent
        };

        console.log('📧 Sending email to:', email);
        console.log('📧 Subject:', subject);

        // 9. Send email via Resend API
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify(resendPayload)
        });

        const result = await response.json();
        console.log('📥 Resend API response:', result);

        if (response.ok) {
            console.log('✅ Email sent successfully to:', email);
            return res.status(200).json({ 
                success: true, 
                message: 'Verification code sent to your email.' 
            });
        } else {
            console.error('❌ Resend API error:', result);
            return res.status(response.status).json({ 
                success: false, 
                error: result.message || 'Failed to send email. Please try again.' 
            });
        }

    } catch (error) {
        console.error('❌ Function error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'An internal error occurred. Please try again later.' 
        });
    }
}
