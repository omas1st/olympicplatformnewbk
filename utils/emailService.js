// utils/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

const emailService = {
  // Send notification to admin
  sendAdminNotification: async (subject, htmlContent) => {
    try {
      const adminEmail = process.env.ADMIN_EMAIL;
      
      if (!adminEmail || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.log('Email configuration not set. Skipping email notification.');
        return { success: false, message: 'Email configuration not set' };
      }

      const transporter = createTransporter();
      
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: adminEmail,
        subject: subject,
        html: htmlContent
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent to admin:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending email to admin:', error);
      return { success: false, error: error.message };
    }
  },

  // Send notification for new user registration
  sendNewUserNotification: async (userData) => {
    const subject = `📝 New User Registration: ${userData.name}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3498db; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .user-info { margin-bottom: 15px; }
          .label { font-weight: bold; color: #333; }
          .value { color: #666; }
          .footer { margin-top: 20px; font-size: 12px; color: #999; text-align: center; }
          .alert { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="margin: 0;">🎯 Olympic Lottery Platform - New User</h2>
        </div>
        <div class="content">
          <h3 style="color: #2c3e50;">New User Registration Details</h3>
          <div class="user-info">
            <span class="label">👤 Name:</span> <span class="value">${userData.name}</span>
          </div>
          <div class="user-info">
            <span class="label">📧 Email:</span> <span class="value">${userData.email}</span>
          </div>
          <div class="user-info">
            <span class="label">📱 WhatsApp:</span> <span class="value">${userData.whatsapp}</span>
          </div>
          <div class="user-info">
            <span class="label">🌍 Country:</span> <span class="value">${userData.country}</span>
          </div>
          <div class="user-info">
            <span class="label">⚧️ Sex:</span> <span class="value">${userData.sex}</span>
          </div>
          <div class="user-info">
            <span class="label">💼 Occupation:</span> <span class="value">${userData.occupation}</span>
          </div>
          <div class="user-info">
            <span class="label">🎂 Age:</span> <span class="value">${userData.age}</span>
          </div>
          <div class="user-info">
            <span class="label">📋 Current Plan:</span> <span class="value">${userData.plans && userData.plans.length > 0 ? userData.plans[0] : 'No plan yet'}</span>
          </div>
          <div class="user-info">
            <span class="label">💰 Balance:</span> <span class="value">${userData.currency} ${userData.balance || 0}</span>
          </div>
          <div class="user-info">
            <span class="label">📄 Proof of Payment:</span> <span class="value">${userData.proofOfPayment ? `<a href="${userData.proofOfPayment}" target="_blank">View Proof</a>` : 'Not uploaded yet'}</span>
          </div>
          <div class="user-info">
            <span class="label">📅 Registration Date:</span> <span class="value">${new Date().toLocaleString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
          </div>
          <div class="alert">
            <strong>ℹ️ Note:</strong> This user just registered on the Olympic Lottery Platform.
          </div>
        </div>
        <div class="footer">
          <p>This is an automated notification from Olympic Lottery Platform.</p>
          <p>User ID: ${userData._id || 'N/A'}</p>
        </div>
      </body>
      </html>
    `;

    return await emailService.sendAdminNotification(subject, htmlContent);
  },

  // Send notification for user login
  sendUserLoginNotification: async (userData) => {
    const subject = `🔐 User Login: ${userData.name}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #27ae60; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .user-info { margin-bottom: 15px; }
          .label { font-weight: bold; color: #333; }
          .value { color: #666; }
          .footer { margin-top: 20px; font-size: 12px; color: #999; text-align: center; }
          .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 10px; border-radius: 4px; margin: 15px 0; color: #155724; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="margin: 0;">🔐 Olympic Lottery Platform - User Login</h2>
        </div>
        <div class="content">
          <h3 style="color: #2c3e50;">User Login Activity</h3>
          <div class="success">
            <strong>✅ Login Successful:</strong> User has logged into their account.
          </div>
          <div class="user-info">
            <span class="label">👤 Name:</span> <span class="value">${userData.name}</span>
          </div>
          <div class="user-info">
            <span class="label">📧 Email:</span> <span class="value">${userData.email}</span>
          </div>
          <div class="user-info">
            <span class="label">📱 WhatsApp:</span> <span class="value">${userData.whatsapp}</span>
          </div>
          <div class="user-info">
            <span class="label">🌍 Country:</span> <span class="value">${userData.country}</span>
          </div>
          <div class="user-info">
            <span class="label">📋 Current Plan:</span> <span class="value">${userData.plans && userData.plans.length > 0 ? userData.plans[0] : 'No plan'}</span>
          </div>
          <div class="user-info">
            <span class="label">✅ Is Verified:</span> <span class="value">${userData.isVerified ? '✅ Yes' : '❌ No'}</span>
          </div>
          <div class="user-info">
            <span class="label">💰 Balance:</span> <span class="value">${userData.currency} ${userData.balance || 0}</span>
          </div>
          <div class="user-info">
            <span class="label">🕒 Login Time:</span> <span class="value">${new Date().toLocaleString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}</span>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated notification from Olympic Lottery Platform.</p>
          <p>User ID: ${userData._id || 'N/A'}</p>
        </div>
      </body>
      </html>
    `;

    return await emailService.sendAdminNotification(subject, htmlContent);
  },

  // Send notification for proof of payment - UPDATED TO EMBED IMAGE
  sendProofOfPaymentNotification: async (userData, proofUrl) => {
    const subject = `💰 Proof of Payment Uploaded: ${userData.name}`;
    
    // Check if proofUrl is a Cloudinary URL
    const isCloudinary = proofUrl && proofUrl.includes('cloudinary');
    const isImage = proofUrl && (proofUrl.toLowerCase().endsWith('.jpg') || 
                                 proofUrl.toLowerCase().endsWith('.jpeg') || 
                                 proofUrl.toLowerCase().endsWith('.png') || 
                                 proofUrl.toLowerCase().endsWith('.gif'));
    
    // Function to get optimized Cloudinary URL for embedding
    const getOptimizedImageUrl = (url) => {
      if (url.includes('cloudinary') && url.includes('/upload/')) {
        // Insert optimization parameters
        return url.replace('/upload/', '/upload/w_600,c_limit,q_auto,f_auto/');
      }
      return url;
    };

    const optimizedImageUrl = isImage ? getOptimizedImageUrl(proofUrl) : proofUrl;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; }
          .header { background: #e67e22; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 25px; border: 1px solid #ddd; }
          .user-info { margin-bottom: 15px; }
          .label { font-weight: bold; color: #333; }
          .value { color: #666; }
          .footer { margin-top: 20px; font-size: 12px; color: #999; text-align: center; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 15px 0; color: #856404; }
          .action-button { background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 5px; }
          .secondary-button { background: #95a5a6; color: white; padding: 8px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 5px; font-size: 0.9em; }
          .proof-container { margin: 20px 0; padding: 15px; background: white; border: 2px dashed #ddd; border-radius: 5px; }
          .proof-image { max-width: 100%; max-height: 400px; border: 1px solid #ccc; border-radius: 4px; display: block; margin: 15px auto; }
          .proof-info { text-align: center; margin: 10px 0; }
          .button-container { margin: 20px 0; text-align: center; }
          .file-type-badge { background: #6c5ce7; color: white; padding: 3px 10px; border-radius: 12px; font-size: 0.8em; margin-left: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="margin: 0;">💰 Olympic Lottery Platform - Proof of Payment</h2>
        </div>
        <div class="content">
          <h3 style="color: #2c3e50;">Proof of Payment Uploaded</h3>
          <div class="warning">
            <strong>⚠️ Action Required:</strong> User has uploaded proof of payment. Please verify and assign a plan.
          </div>
          
          <div class="user-info">
            <span class="label">👤 Name:</span> <span class="value">${userData.name}</span>
          </div>
          <div class="user-info">
            <span class="label">📧 Email:</span> <span class="value">${userData.email}</span>
          </div>
          <div class="user-info">
            <span class="label">📱 WhatsApp:</span> <span class="value">${userData.whatsapp}</span>
          </div>
          <div class="user-info">
            <span class="label">🌍 Country:</span> <span class="value">${userData.country}</span>
          </div>
          <div class="user-info">
            <span class="label">📋 Current Plan:</span> <span class="value">${userData.plans && userData.plans.length > 0 ? userData.plans[0] : 'No plan yet'}</span>
          </div>
          <div class="user-info">
            <span class="label">✅ Is Verified:</span> <span class="value">${userData.isVerified ? '✅ Yes' : '❌ No'}</span>
          </div>
          <div class="user-info">
            <span class="label">💰 Balance:</span> <span class="value">${userData.currency} ${userData.balance || 0}</span>
          </div>
          <div class="user-info">
            <span class="label">🕒 Upload Time:</span> <span class="value">${new Date().toLocaleString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
          </div>
          
          <div class="proof-container">
            <h4 style="color: #2c3e50; margin-top: 0;">📄 Proof of Payment Details</h4>
            
            ${isImage ? `
            <div style="text-align: center; margin: 20px 0;">
              <img src="${optimizedImageUrl}" alt="Proof of Payment" class="proof-image" />
              <p class="proof-info">
                <em>Image automatically embedded for easy viewing</em>
              </p>
            </div>
            ` : `
            <div class="proof-info">
              <p><strong>File Type:</strong> Document ${proofUrl.toLowerCase().endsWith('.pdf') ? '<span class="file-type-badge">PDF</span>' : ''}</p>
              <p>This file type cannot be embedded in email. Please use the download link below.</p>
            </div>
            `}
            
            <div class="button-container">
              ${isImage ? `
              <a href="${proofUrl}" class="action-button" target="_blank" download="proof_of_payment.jpg">
                📥 Download Full Image
              </a>
              ` : `
              <a href="${proofUrl}" class="action-button" target="_blank" download="proof_of_payment.pdf">
                📥 Download PDF Document
              </a>
              `}
              
              <a href="${proofUrl}" class="secondary-button" target="_blank">
                🔗 Open in Browser
              </a>
            </div>
            
            <div style="margin-top: 15px; font-size: 0.9em; color: #666;">
              <p><strong>File URL:</strong> <a href="${proofUrl}" target="_blank" style="word-break: break-all;">${proofUrl.substring(0, 80)}...</a></p>
            </div>
          </div>
          
          <div style="background: #e8f4fd; padding: 15px; border-radius: 4px; margin-top: 20px;">
            <p><strong>📋 Quick Actions:</strong></p>
            <ol style="margin: 10px 0; padding-left: 20px;">
              <li>Verify the payment proof above</li>
              <li>Login to Admin Panel to assign a plan</li>
              <li>Send the user their access PIN via WhatsApp/Email</li>
              <li>Mark user as verified in the system</li>
            </ol>
          </div>
          
          <div style="margin-top: 20px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
            <p style="margin: 0; font-size: 0.9em; color: #666;">
              <strong>💡 Tip:</strong> If the image doesn't load, click "Download Full Image" or "Open in Browser" to view it.
            </p>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated notification from Olympic Lottery Platform.</p>
          <p>User ID: ${userData._id || 'N/A'} | Timestamp: ${new Date().toISOString()}</p>
        </div>
      </body>
      </html>
    `;

    return await emailService.sendAdminNotification(subject, htmlContent);
  },

  // Send notification for deposit proof
  sendDepositProofNotification: async (userData, amount, currency, proofUrl) => {
    const subject = `💰 Deposit Proof Uploaded: ${userData.name} - ${currency} ${amount}`;
    
    // Check if proofUrl is a Cloudinary URL
    const isCloudinary = proofUrl && proofUrl.includes('cloudinary');
    const isImage = proofUrl && (proofUrl.toLowerCase().endsWith('.jpg') || 
                                 proofUrl.toLowerCase().endsWith('.jpeg') || 
                                 proofUrl.toLowerCase().endsWith('.png') || 
                                 proofUrl.toLowerCase().endsWith('.gif'));
    
    // Function to get optimized Cloudinary URL for embedding
    const getOptimizedImageUrl = (url) => {
      if (url.includes('cloudinary') && url.includes('/upload/')) {
        // Insert optimization parameters
        return url.replace('/upload/', '/upload/w_600,c_limit,q_auto,f_auto/');
      }
      return url;
    };

    const optimizedImageUrl = isImage ? getOptimizedImageUrl(proofUrl) : proofUrl;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; }
          .header { background: #9b59b6; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 25px; border: 1px solid #ddd; }
          .user-info { margin-bottom: 15px; }
          .label { font-weight: bold; color: #333; }
          .value { color: #666; }
          .footer { margin-top: 20px; font-size: 12px; color: #999; text-align: center; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 15px 0; color: #856404; }
          .action-button { background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 5px; }
          .secondary-button { background: #95a5a6; color: white; padding: 8px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 5px; font-size: 0.9em; }
          .proof-container { margin: 20px 0; padding: 15px; background: white; border: 2px dashed #ddd; border-radius: 5px; }
          .proof-image { max-width: 100%; max-height: 400px; border: 1px solid #ccc; border-radius: 4px; display: block; margin: 15px auto; }
          .proof-info { text-align: center; margin: 10px 0; }
          .button-container { margin: 20px 0; text-align: center; }
          .file-type-badge { background: #6c5ce7; color: white; padding: 3px 10px; border-radius: 12px; font-size: 0.8em; margin-left: 10px; }
          .deposit-amount { font-size: 1.5em; color: #27ae60; font-weight: bold; text-align: center; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="margin: 0;">💰 Olympic Lottery Platform - Deposit Proof</h2>
        </div>
        <div class="content">
          <h3 style="color: #2c3e50;">Deposit Proof Uploaded</h3>
          <div class="warning">
            <strong>⚠️ Action Required:</strong> User has uploaded proof for a deposit. Please verify and approve/reject.
          </div>
          
          <div class="deposit-amount">
            ${currency} ${amount.toFixed(2)}
          </div>
          
          <div class="user-info">
            <span class="label">👤 Name:</span> <span class="value">${userData.name}</span>
          </div>
          <div class="user-info">
            <span class="label">📧 Email:</span> <span class="value">${userData.email}</span>
          </div>
          <div class="user-info">
            <span class="label">📱 WhatsApp:</span> <span class="value">${userData.whatsapp}</span>
          </div>
          <div class="user-info">
            <span class="label">🌍 Country:</span> <span class="value">${userData.country}</span>
          </div>
          <div class="user-info">
            <span class="label">📋 Current Plan:</span> <span class="value">${userData.plans && userData.plans.length > 0 ? userData.plans[0] : 'No plan yet'}</span>
          </div>
          <div class="user-info">
            <span class="label">💰 Current Balance:</span> <span class="value">${userData.currency} ${userData.balance || 0}</span>
          </div>
          <div class="user-info">
            <span class="label">🕒 Upload Time:</span> <span class="value">${new Date().toLocaleString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
          </div>
          
          <div class="proof-container">
            <h4 style="color: #2c3e50; margin-top: 0;">📄 Deposit Proof Details</h4>
            
            ${isImage ? `
            <div style="text-align: center; margin: 20px 0;">
              <img src="${optimizedImageUrl}" alt="Deposit Proof" class="proof-image" />
              <p class="proof-info">
                <em>Image automatically embedded for easy viewing</em>
              </p>
            </div>
            ` : `
            <div class="proof-info">
              <p><strong>File Type:</strong> Document ${proofUrl.toLowerCase().endsWith('.pdf') ? '<span class="file-type-badge">PDF</span>' : ''}</p>
              <p>This file type cannot be embedded in email. Please use the download link below.</p>
            </div>
            `}
            
            <div class="button-container">
              ${isImage ? `
              <a href="${proofUrl}" class="action-button" target="_blank" download="deposit_proof.jpg">
                📥 Download Full Image
              </a>
              ` : `
              <a href="${proofUrl}" class="action-button" target="_blank" download="deposit_proof.pdf">
                📥 Download PDF Document
              </a>
              `}
              
              <a href="${proofUrl}" class="secondary-button" target="_blank">
                🔗 Open in Browser
              </a>
            </div>
            
            <div style="margin-top: 15px; font-size: 0.9em; color: #666;">
              <p><strong>File URL:</strong> <a href="${proofUrl}" target="_blank" style="word-break: break-all;">${proofUrl.substring(0, 80)}...</a></p>
            </div>
          </div>
          
          <div style="background: #e8f4fd; padding: 15px; border-radius: 4px; margin-top: 20px;">
            <p><strong>📋 Quick Actions:</strong></p>
            <ol style="margin: 10px 0; padding-left: 20px;">
              <li>Verify the deposit proof above</li>
              <li>Login to Admin Panel to approve/reject</li>
              <li>If approved, user balance will be updated automatically</li>
              <li>User will receive notification of the result</li>
            </ol>
          </div>
          
          <div style="margin-top: 20px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
            <p style="margin: 0; font-size: 0.9em; color: #666;">
              <strong>💡 Tip:</strong> If the image doesn't load, click "Download Full Image" or "Open in Browser" to view it.
            </p>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated notification from Olympic Lottery Platform.</p>
          <p>User ID: ${userData._id || 'N/A'} | Timestamp: ${new Date().toISOString()}</p>
        </div>
      </body>
      </html>
    `;

    return await emailService.sendAdminNotification(subject, htmlContent);
  },

  // Send notification for PIN submission
  sendPinSubmissionNotification: async (userData, pinStatus, pinAttempt = '') => {
    const subject = `🔐 PIN Submission: ${userData.name} - ${pinStatus}`;
    
    const statusColors = {
      'Valid PIN - User Verified': '#27ae60',
      'Invalid PIN Attempt': '#e74c3c',
      'PIN Verification Error': '#f39c12',
      'Invalid PIN Format': '#95a5a6'
    };

    const statusColor = statusColors[pinStatus] || '#3498db';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${statusColor}; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .user-info { margin-bottom: 15px; }
          .label { font-weight: bold; color: #333; }
          .value { color: #666; }
          .footer { margin-top: 20px; font-size: 12px; color: #999; text-align: center; }
          .status { background: ${pinStatus.includes('Valid') ? '#d4edda' : '#f8d7da'}; 
                   border: 1px solid ${pinStatus.includes('Valid') ? '#c3e6cb' : '#f5c6cb'}; 
                   padding: 15px; border-radius: 4px; margin: 15px 0; 
                   color: ${pinStatus.includes('Valid') ? '#155724' : '#721c24'}; }
          .pin-attempt { background: #f8f9fa; border: 1px solid #e9ecef; padding: 10px; border-radius: 4px; margin: 10px 0; font-family: monospace; font-size: 1.2em; letter-spacing: 2px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="margin: 0;">🔐 Olympic Lottery Platform - PIN Submission</h2>
        </div>
        <div class="content">
          <h3 style="color: #2c3e50;">PIN Verification Activity</h3>
          <div class="status">
            <strong>${pinStatus.includes('Valid') ? '✅' : '❌'} Status:</strong> ${pinStatus}
          </div>
          <div class="user-info">
            <span class="label">👤 Name:</span> <span class="value">${userData.name}</span>
          </div>
          <div class="user-info">
            <span class="label">📧 Email:</span> <span class="value">${userData.email}</span>
          </div>
          <div class="user-info">
            <span class="label">📱 WhatsApp:</span> <span class="value">${userData.whatsapp}</span>
          </div>
          <div class="user-info">
            <span class="label">🌍 Country:</span> <span class="value">${userData.country}</span>
          </div>
          <div class="user-info">
            <span class="label">📋 Current Plan:</span> <span class="value">${userData.plans && userData.plans.length > 0 ? userData.plans[0] : 'No plan'}</span>
          </div>
          <div class="user-info">
            <span class="label">✅ Is Verified:</span> <span class="value">${userData.isVerified ? '✅ Yes' : '❌ No'}</span>
          </div>
          ${pinAttempt ? `
          <div class="user-info">
            <span class="label">🔢 PIN Attempt:</span> 
            <div class="pin-attempt">${pinAttempt}</div>
            <div style="font-size: 0.8em; color: #666; text-align: center; margin-top: 5px;">
              User entered this PIN for verification
            </div>
          </div>
          ` : ''}
          <div class="user-info">
            <span class="label">🕒 Submission Time:</span> <span class="value">${new Date().toLocaleString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}</span>
          </div>
          ${pinStatus.includes('Invalid') ? `
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin-top: 20px;">
            <strong>⚠️ Attention Required:</strong> User may need assistance with their PIN. Consider:
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Sending them the correct PIN via WhatsApp</li>
              <li>Checking if their plan is active</li>
              <li>Verifying their payment was processed</li>
            </ul>
          </div>
          ` : ''}
          
          ${pinStatus.includes('Valid') ? `
          <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 4px; margin-top: 20px; color: #155724;">
            <strong>✅ Success:</strong> User can now access VIP content and winning numbers.
          </div>
          ` : ''}
        </div>
        <div class="footer">
          <p>This is an automated notification from Olympic Lottery Platform.</p>
          <p>User ID: ${userData._id || 'N/A'} | PIN Status: ${pinStatus}</p>
        </div>
      </body>
      </html>
    `;

    return await emailService.sendAdminNotification(subject, htmlContent);
  },

  // Send subscription notification
sendSubscriptionNotification: async (userData, plan, amount) => {
  const subject = `📋 New Subscription: ${userData.name} - ${plan}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        /* Add your email styles here */
      </style>
    </head>
    <body>
      <div class="header">
        <h2>📋 Olympic Lottery Platform - New Subscription</h2>
      </div>
      <div class="content">
        <h3>Subscription Details</h3>
        <div class="user-info">
          <p><strong>User:</strong> ${userData.name}</p>
          <p><strong>Email:</strong> ${userData.email}</p>
          <p><strong>Plan:</strong> ${plan}</p>
          <p><strong>Amount:</strong> R ${amount}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return await emailService.sendAdminNotification(subject, htmlContent);
},

// Send ID card generation notification
sendIdCardNotification: async (userData, amount) => {
  const subject = `🪪 ID Card Generated: ${userData.name}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        /* Add your email styles here */
      </style>
    </head>
    <body>
      <div class="header">
        <h2>🪪 Olympic Lottery Platform - ID Card Generated</h2>
      </div>
      <div class="content">
        <h3>ID Card Generation Details</h3>
        <div class="user-info">
          <p><strong>User:</strong> ${userData.name}</p>
          <p><strong>Email:</strong> ${userData.email}</p>
          <p><strong>Amount:</strong> R ${amount}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return await emailService.sendAdminNotification(subject, htmlContent);
},

  // Send PIN update notification
  sendPinUpdateNotification: async (userData, newPin) => {
    const subject = `🔐 Personal PIN Updated: ${userData.name}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #9b59b6; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .user-info { margin-bottom: 15px; }
          .label { font-weight: bold; color: #333; }
          .value { color: #666; }
          .footer { margin-top: 20px; font-size: 12px; color: #999; text-align: center; }
          .pin-display { background: #f8f9fa; border: 1px solid #e9ecef; padding: 15px; border-radius: 4px; margin: 15px 0; font-family: monospace; font-size: 1.5em; letter-spacing: 3px; text-align: center; color: #2c3e50; }
          .note { background: #e8f4fd; border: 1px solid #c3e6cb; padding: 10px; border-radius: 4px; margin: 15px 0; color: #155724; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="margin: 0;">🔐 Olympic Lottery Platform - PIN Update</h2>
        </div>
        <div class="content">
          <h3 style="color: #2c3e50;">Personal PIN Updated</h3>
          <div class="note">
            <strong>ℹ️ Information:</strong> A personal PIN has been set for this user.
          </div>
          
          <div class="user-info">
            <span class="label">👤 Name:</span> <span class="value">${userData.name}</span>
          </div>
          <div class="user-info">
            <span class="label">📧 Email:</span> <span class="value">${userData.email}</span>
          </div>
          <div class="user-info">
            <span class="label">📱 WhatsApp:</span> <span class="value">${userData.whatsapp}</span>
          </div>
          
          <div class="pin-display">
            ${newPin}
          </div>
          
          <div style="text-align: center; margin: 20px 0;">
            <p><strong>New Personal PIN</strong></p>
            <p style="font-size: 0.9em; color: #666;">User should use this PIN to access VIP features</p>
          </div>
          
          <div class="user-info">
            <span class="label">🕒 Update Time:</span> <span class="value">${new Date().toLocaleString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}</span>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin-top: 20px; color: #856404;">
            <strong>⚠️ Note:</strong> The user has been notified about this PIN update via their dashboard.
          </div>
        </div>
        <div class="footer">
          <p>This is an automated notification from Olympic Lottery Platform.</p>
          <p>User ID: ${userData._id || 'N/A'}</p>
        </div>
      </body>
      </html>
    `;

    return await emailService.sendAdminNotification(subject, htmlContent);
  }
};

module.exports = emailService;