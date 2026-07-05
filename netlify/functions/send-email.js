// ============================================================
// NETLIFY FUNCTION: SEND EMAIL VIA MAILJET
// ============================================================

const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    // 1. Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // 2. Get data from request
        const { email, code, action = 'verification' } = JSON.parse(event.body);
        
        // 3. Validate input
        if (!email || !code) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Email and code are required' })
            };
        }

        // 4. Get Mailjet API keys from environment variables
        const MAILJET_API_KEY = process.env.MAILJET_API_KEY;
        const MAILJET_SECRET_KEY = process.env.MAILJET_SECRET_KEY;
        
        if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
            console.error('Mailjet keys not configured');
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Email service not configured' })
            };
        }

        // 5. Build email content
        const subjectMap = {
            signup: 'Verify Your Email - FreeTranslate',
            signin: 'Your Sign In Code - FreeTranslate',
            reset: 'Reset Your Password - FreeTranslate',
            email: 'Change Email Verification - FreeTranslate',
            password: 'Change Password Verification - FreeTranslate',
            delete: 'Delete Account Verification - FreeTranslate'
        };
        
        const subject = subjectMap[action] || 'Your Verification Code - FreeTranslate';
        
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 10px;">
                <div style="text-align: center; padding: 20px 0;">
                    <h1 style="color: #4f46e5; margin: 0;">🔐 FreeTranslate</h1>
                    <p style="color: #6b7280; font-size: 16px;">Your verification code</p>
                </div>
                <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <p style="font-size: 16px; color: #1f2937;">Hello,</p>
                    <p style="font-size: 16px; color: #1f2937;">Your verification code is:</p>
                    <div style="text-align: center; padding: 20px; background: #f3f4f6; border-radius: 8px; margin: 20px 0;">
                        <h2 style="font-size: 36px; letter-spacing: 8px; color: #4f46e5; margin: 0;">${code}</h2>
                    </div>
                    <p style="font-size: 14px; color: #6b7280;">This code will expire in 15 minutes.</p>
                    <p style="font-size: 14px; color: #6b7280;">If you didn't request this, please ignore this email.</p>
                </div>
                <div style="text-align: center; padding: 20px; font-size: 12px; color: #9ca3af;">
                    © 2026 FreeTranslate | Built by Ornella Mutuyimana
                </div>
            </div>
        `;

        // 6. Mailjet API request
        const mailjetUrl = 'https://api.mailjet.com/v3.1/send';
        const auth = Buffer.from(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`).toString('base64');

        const mailjetPayload = {
            Messages: [{
                From: {
                    Email: 'mutuyimanaornella00@gmail.com',
                    Name: 'FreeTranslate'
                },
                To: [{
                    Email: email,
                    Name: email.split('@')[0]
                }],
                Subject: subject,
                HTMLPart: htmlContent
            }]
        };

        const response = await fetch(mailjetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify(mailjetPayload)
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Email sent to:', email);
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, message: 'Email sent' })
            };
        } else {
            console.error('Mailjet error:', result);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: 'Failed to send email' })
            };
        }

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
