const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

const isConfigured = accountSid && accountSid.startsWith('AC') && authToken && !authToken.includes('your_');

let client = null;

if (isConfigured) {
  client = twilio(accountSid, authToken);
}

const getTwilioClient = () => {
  if (!client) {
    throw new Error('Twilio not configured. Set real TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env (remove placeholders)');
  }
  return client;
};

const getPhoneNumber = () => {
  if (!phoneNumber || phoneNumber.includes('your_')) {
    throw new Error('Twilio phone number not configured. Set real TWILIO_PHONE_NUMBER in .env');
  }
  return phoneNumber;
};

const isTwilioConfigured = () => isConfigured;

module.exports = { getTwilioClient, getPhoneNumber, isTwilioConfigured };
