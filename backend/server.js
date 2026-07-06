// ============================================================
// FREE TRANSLATE LANGUAGE - EMAIL SERVICE
// Using Brevo REST API (not SMTP)
// ============================================================

const express = require('express');
const cors = require('cors');
const https = require('https');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'freetranslate-email-service',
        timestamp: new Date().toISOString()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'Free Translate Language Email Service',
        version: '1.0.0',
        endpoints: {
            health: 'GET /health',
            sendEmail: 'POST /api/send-email'
        }
    });
});

// ============================================================
// SEND EMAIL VIA BREVO REST API
// ============================================================

app.post('/api/send-email', async (req, res) => {
    try {
        const { email, code, action } = req.body;

        // Validate input
        if (!email || !code || !action) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: email, code, action'
            });
        }

        console.log(`📧 Sending ${action} code to: ${email}`);
        console.log(`🔑 Code: ${code}`);

        // Get email content
        const subject = getEmailSubject(action);
        const htmlContent = getEmailTemplate(code, action);

        // Prepare Brevo API request
        const postData = JSON.stringify({
            sender: {
                name: process.env.BREVO_SENDER_NAME || 'Free Translate Language',
                email: process.env.BREVO_SENDER_EMAIL || 'mutuyimanaornella00@gmail.com'
            },
            to: [{
                email: email,
                name: email.split('@')[0]
            }],
            subject: subject,
            htmlContent: htmlContent
        });

        const options = {
            hostname: 'api.brevo.com',
            port: 443,
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        // Send request to Brevo
        const response = await new Promise((resolve, reject) => {
            const request = https.request(options, (response) => {
                let data = '';
                response.on('data', (chunk) => { data += chunk; });
                response.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve({ statusCode: response.statusCode, data: parsed });
                    } catch (e) {
                        resolve({ statusCode: response.statusCode, data: data });
                    }
                });
            });

            request.on('error', (error) => {
                reject(error);
            });

            request.write(postData);
            request.end();
        });

        if (response.statusCode === 201 || response.statusCode === 200) {
            console.log(`✅ Email sent successfully to: ${email}`);
            console.log(`📨 Message ID: ${response.data.messageId || 'N/A'}`);
            res.json({
                success: true,
                message: 'Verification code sent successfully',
                messageId: response.data.messageId
            });
        } else {
            console.error('❌ Brevo API error:', response.data);
            res.status(response.statusCode || 500).json({
                success: false,
                error: response.data.message || 'Failed to send email'
            });
        }

    } catch (error) {
        console.error('❌ Email error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to send email'
        });
    }
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getEmailSubject(action) {
    const subjects = {
        signup: 'Verify Your Email - Free Translate Language',
        signin: 'Your Sign In Code - Free Translate Language',
        reset: 'Reset Your Password - Free Translate Language',
        delete: 'Delete Account Verification - Free Translate Language',
        email: 'Change Email Verification - Free Translate Language',
        password: 'Change Password Verification - Free Translate Language'
    };
    return subjects[action] || 'Verification Code - Free Translate Language';
}

function getEmailTemplate(code, action) {
    const actionText = {
        signup: 'create your account',
        signin: 'sign in to your account',
        reset: 'reset your password',
        delete: 'delete your account',
        email: 'change your email address',
        password: 'change your password'
    };

    const actionEmoji = {
        signup: '🎉',
        signin: '🔐',
        reset: '🔑',
        delete: '⚠️',
        email: '📧',
        password: '🔒'
    };

    const actionDescription = {
        signup: 'To complete your registration, please verify your email address.',
        signin: 'To securely sign in, please verify your identity.',
        reset: 'To reset your password, please verify your identity.',
        delete: 'To delete your account, please confirm this action.',
        email: 'To change your email, please verify this request.',
        password: 'To change your password, please verify this request.'
    };

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verification Code - Free Translate Language</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    background-color: #f5f5f5;
                    margin: 0;
                    padding: 0;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #ffffff;
                    border-radius: 12px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .header {
                    text-align: center;
                    padding: 30px 0 20px;
                    border-bottom: 3px solid #4CAF50;
                }
                .header h1 {
                    margin: 0;
                    color: #1a1a1a;
                    font-size: 28px;
                }
                .header .emoji {
                    font-size: 40px;
                    display: block;
                    margin-bottom: 10px;
                }
                .content {
                    padding: 30px 20px;
                }
                .content p {
                    margin: 15px 0;
                    color: #555;
                }
                .code-container {
                    text-align: center;
                    padding: 25px;
                    margin: 25px 0;
                    background: #f0f7ff;
                    border-radius: 10px;
                    border: 2px dashed #4CAF50;
                }
                .code {
                    font-size: 42px;
                    font-weight: bold;
                    color: #2e7d32;
                    letter-spacing: 8px;
                    font-family: 'Courier New', monospace;
                    background: #fff;
                    padding: 15px 30px;
                    border-radius: 8px;
                    display: inline-block;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .code-label {
                    font-size: 14px;
                    color: #888;
                    margin-bottom: 10px;
                }
                .expiry {
                    text-align: center;
                    color: #888;
                    font-size: 14px;
                    margin: 20px 0;
                }
                .footer {
                    text-align: center;
                    padding: 20px 0;
                    border-top: 1px solid #eee;
                    color: #999;
                    font-size: 12px;
                }
                .footer a {
                    color: #4CAF50;
                    text-decoration: none;
                }
                .footer a:hover {
                    text-decoration: underline;
                }
                .security-note {
                    background: #fff3e0;
                    padding: 12px 20px;
                    border-radius: 8px;
                    border-left: 4px solid #ff9800;
                    margin: 20px 0;
                    font-size: 14px;
                    color: #666;
                }
                @media only screen and (max-width: 480px) {
                    .container { padding: 10px; }
                    .code { font-size: 32px; letter-spacing: 5px; padding: 10px 20px; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <span class="emoji">${actionEmoji[action] || '📧'}</span>
                    <h1>Free Translate Language</h1>
                    <p style="color: #666; margin: 5px 0 0;">Break language barriers instantly</p>
                </div>
                
                <div class="content">
                    <p><strong>Hello,</strong></p>
                    <p>${actionDescription[action] || 'Please verify your identity using the code below.'}</p>
                    
                    <div class="code-container">
                        <div class="code-label">Your verification code</div>
                        <div class="code">${code}</div>
                    </div>
                    
                    <p style="text-align: center; color: #666;">This code will expire in <strong>15 minutes</strong></p>
                    
                    <div class="security-note">
                        <strong>🔒 Security Note:</strong> If you didn't request this code, please ignore this email. 
                        Never share this code with anyone.
                    </div>
                    
                    <p style="text-align: center; color: #888; font-size: 14px;">
                        Need help? Contact us at 
                        <a href="mailto:mutuyimanaornella00@gmail.com">mutuyimanaornella00@gmail.com</a>
                    </p>
                </div>
                
                <div class="footer">
                    <p>© 2026 Free Translate Language | Built by Ornella Mutuyimana</p>
                    <p>
                        <a href="https://m-nella.github.io/freetranslatelanguage/">Visit Free Translate Language</a> 
                        • 
                        <a href="mailto:mutuyimanaornella00@gmail.com">Contact Support</a>
                    </p>
                    <p style="margin-top: 10px; color: #bbb; font-size: 11px;">
                        This is an automated message. Please do not reply to this email.
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;
}

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('🚀 Free Translate Language Email Service Started');
    console.log('='.repeat(50));
    console.log(`📡 Server running on port: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📧 Email service: ${process.env.BREVO_EMAIL || 'Not configured'}`);
    console.log(`📊 Status: Ready to send emails via Brevo REST API`);
    console.log('='.repeat(50));
});
