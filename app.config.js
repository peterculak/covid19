import 'dotenv/config';

export default {
  name: 'Covid19',
  version: '1.0.0',
  extra: {
    url: process.env.REACT_NATIVE_OCKOVANIE_URL,
    cities: process.env.REACT_NATIVE_OCKOVANIE_CITIES,
    waitInSecondsBeforeRetry: process.env.REACT_NATIVE_OCKOVANIE_RETRY_EVERY_SECONDS,
    ageFrom: process.env.REACT_NATIVE_OCKOVANIE_AGE_FROM,
    ageTo: process.env.REACT_NATIVE_OCKOVANIE_AGE_TO,
  },
};
