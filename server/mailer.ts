import nodemailer from 'nodemailer';

// In-memory queue for reliable email sending with auto-retry
interface EmailTask {
  id: string;
  to: string;
  subject: string;
  html: string;
  retries: number;
  nextAttempt: number;
}

const emailQueue: EmailTask[] = [];
let isProcessingQueue = false;

// Create standard Nodemailer transporter
// Assumes GMAIL_USER and GMAIL_PASS are set in environment variables
const getTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || 'alaaalrubaie38@gmail.com',
      pass: process.env.GMAIL_PASS || '',
    },
  });
};

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 10000; // 10 seconds

async function processQueue() {
  if (isProcessingQueue || emailQueue.length === 0) return;
  isProcessingQueue = true;

  try {
    const now = Date.now();
    const tasksToProcess = emailQueue.filter(task => task.nextAttempt <= now);

    for (const task of tasksToProcess) {
      try {
        if (!process.env.GMAIL_PASS) {
           console.warn('⚠️ GMAIL_PASS is not set in environment variables. Skipping email delivery.');
           const index = emailQueue.findIndex(t => t.id === task.id);
           if (index > -1) emailQueue.splice(index, 1);
           continue;
        }

        const transporter = getTransporter();
        await transporter.sendMail({
          from: process.env.GMAIL_USER || 'alaaalrubaie38@gmail.com',
          to: task.to,
          subject: task.subject,
          html: task.html,
        });

        // Success, remove from queue
        const index = emailQueue.findIndex(t => t.id === task.id);
        if (index > -1) emailQueue.splice(index, 1);
        console.log(`✅ Email sent successfully: ${task.subject}`);
      } catch (error: any) {
        console.error(`❌ Failed to send email (Attempt ${task.retries + 1}/${MAX_RETRIES}): ${error.message}`);
        
        task.retries += 1;
        if (task.retries >= MAX_RETRIES) {
          // Max retries reached, remove from queue
          const index = emailQueue.findIndex(t => t.id === task.id);
          if (index > -1) emailQueue.splice(index, 1);
          console.error(`🚫 Email task permanently failed after ${MAX_RETRIES} attempts: ${task.subject}`);
        } else {
          // Schedule next attempt with exponential backoff
          task.nextAttempt = now + (RETRY_DELAY_MS * Math.pow(2, task.retries - 1));
        }
      }
    }
  } finally {
    isProcessingQueue = false;
    // If there are still items in the queue, schedule another processing run
    if (emailQueue.length > 0) {
      setTimeout(processQueue, 5000);
    }
  }
}

export function queueEmailNotification(data: {
  subject: string;
  html: string;
  to?: string;
}) {
  const task: EmailTask = {
    id: Math.random().toString(36).substring(7),
    to: data.to || 'alaaalrubaie38@gmail.com',
    subject: data.subject,
    html: data.html,
    retries: 0,
    nextAttempt: Date.now(),
  };

  emailQueue.push(task);
  console.log(`📩 Queued email for delivery: ${task.subject}`);
  
  // Trigger queue processing
  processQueue();
}
