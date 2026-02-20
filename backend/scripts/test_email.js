
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const nodemailer = require('nodemailer');

async function testEmail() {
    console.log('--- Testing Email Configuration ---');
    console.log('SMTP_HOST:', process.env.SMTP_HOST || '(not set)');
    console.log('SMTP_SERVICE:', process.env.SMTP_SERVICE || '(not set)');
    console.log('SMTP_USER:', process.env.SMTP_USER || '(not set)');
    console.log('SMTP_PASS:', process.env.SMTP_PASS ? '******' : '(not set)');

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('\n❌ ERROR: SMTP_USER and SMTP_PASS are required in .env to send emails.');
        console.log('Please open backend/.env and uncomment/fill the SMTP settings.');
        return;
    }

    const transporter = nodemailer.createTransport({
        service: process.env.SMTP_SERVICE || 'gmail',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    try {
        console.log('\nAttempting to send test email...');
        const info = await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: process.env.SMTP_USER, // Send to self
            subject: 'Test Email from Hotel Booking System',
            text: 'If you receive this, your email configuration is working!'
        });
        console.log('✅ Success! Email sent with ID:', info.messageId);
    } catch (err) {
        console.error('\n❌ Failed to send email:', err.message);
        if (err.code === 'EAUTH') {
            console.log('\n💡 Tip: If using Gmail, you need to use an "App Password", not your login password.');
            console.log('Go to Google Account > Security > 2-Step Verification > App Passwords.');
        }
    }
}

testEmail();
