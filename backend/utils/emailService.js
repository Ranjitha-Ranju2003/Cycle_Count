const nodemailer = require("nodemailer");

let transporter = null;

const isResendConfigured = () => Boolean(process.env.RESEND_API_KEY);

const isEmailConfigured = () =>
  isResendConfigured() ||
  Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.EMAIL_FROM
  );

const getTransporter = () => {
  if (!isEmailConfigured()) {
    throw new Error("Email delivery is not configured on the server.");
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return transporter;
};

const sendOtpEmail = async ({ email, otpCode, purpose }) => {
  if (isResendConfigured()) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || process.env.EMAIL_FROM,
        to: [email],
        subject: "Cycle Count OTP Verification",
        text: `Your Cycle Count OTP is ${otpCode}. Use it within 10 minutes to ${
          purpose === "signup" ? "complete your signup" : "reset your password"
        }.`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #17324d;">
            <h2 style="margin-bottom: 12px;">Cycle Count Verification</h2>
            <p style="margin: 0 0 16px;">Use the OTP below within 10 minutes to ${
              purpose === "signup" ? "complete your signup" : "reset your password"
            }.</p>
            <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #1f6b5f;">
              ${otpCode}
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Unable to send OTP email through Resend.");
    }

    return;
  }

  const mailer = getTransporter();
  const actionText =
    purpose === "signup" ? "complete your signup" : "reset your password";

  await mailer.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Cycle Count OTP Verification",
    text: `Your Cycle Count OTP is ${otpCode}. Use it within 10 minutes to ${actionText}.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #17324d;">
        <h2 style="margin-bottom: 12px;">Cycle Count Verification</h2>
        <p style="margin: 0 0 16px;">Use the OTP below within 10 minutes to ${actionText}.</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #1f6b5f;">
          ${otpCode}
        </div>
      </div>
    `,
  });
};

module.exports = {
  isEmailConfigured,
  isResendConfigured,
  sendOtpEmail,
};
