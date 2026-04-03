let twilioFactory;
try {
  twilioFactory = require('twilio');
} catch (error) {
  twilioFactory = null;
}

const hasSmsConfig = () => {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
};

let smsClient;

const getSmsClient = () => {
  if (!twilioFactory || !hasSmsConfig()) return null;
  if (smsClient) return smsClient;

  smsClient = twilioFactory(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  return smsClient;
};

const toE164Mobile = (mobile) => {
  const cleaned = String(mobile || '').replace(/\D/g, '');
  const countryCode = process.env.SMS_COUNTRY_CODE || '+91';

  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  }

  if (cleaned.length === 10) {
    return `${countryCode}${cleaned}`;
  }

  return cleaned;
};

const sendOtpSms = async ({ mobile, otp }) => {
  const to = toE164Mobile(mobile);

  if (!hasSmsConfig() || !twilioFactory) {
    console.log(`[DEV SMS OTP] to=${to} otp=${otp}`);
    return { delivered: false, simulated: true };
  }

  try {
    const client = getSmsClient();
    if (!client) {
      return { delivered: false, simulated: false };
    }

    await client.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
      body: `TirthOne OTP: ${otp}. Valid for 5 minutes.`
    });

    return { delivered: true, simulated: false };
  } catch (error) {
    console.error('SMS OTP send failed:', error.message);
    return { delivered: false, simulated: false };
  }
};

module.exports = { sendOtpSms, hasSmsConfig, toE164Mobile };
