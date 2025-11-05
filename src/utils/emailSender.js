// © NextCartBD - Developed by Mahin Ltd (Tanvir)

const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail(to, subject, html) {
  return await resend.emails.send({
    from: process.env.CUSTOMER_FROM_EMAIL,
    to,
    subject,
    html
  });
}

module.exports = sendEmail;
