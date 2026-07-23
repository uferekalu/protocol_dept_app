export default () => ({
  port: parseInt(process.env.PORT ?? '4000', 10),
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/protocol_department',
  jwtSecret: process.env.JWT_SECRET ?? 'change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  termiiApiKey: process.env.TERMII_API_KEY,
  termiiBaseUrl: process.env.TERMII_BASE_URL ?? 'https://v4.api.termii.com',
  // A generic/shared sender ID works without Termii's sender-ID registration approval —
  // swap to a custom registered one later by changing this env var alone.
  termiiSenderId: process.env.TERMII_SENDER_ID ?? 'Termii',
  termiiChannel: process.env.TERMII_CHANNEL ?? 'generic',
});
