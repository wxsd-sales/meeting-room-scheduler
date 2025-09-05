import 'dotenv/config';

export const config = {
  port: process.env.MY_APP_PORT || 5000,
  mongodb: {
    uri: process.env.MONGODB_SRV,
    database: process.env.MONGODB,
    collections: {
      bookings: process.env.MONGODB_COL,
    }
  },
  baseUri: process.env.BASE_URI,
  webex: {
    serviceApp: {
      clientId: process.env.WEBEX_SA_CLIENT_ID,
      clientSecret: process.env.WEBEX_SA_CLIENT_SECRET,
      refreshToken: process.env.WEBEX_SA_REFRESH_TOKEN
    }
  }
};