// config.ts

const ENV = 'development'; // o 'production' development

const CONFIG = {
  development: {
    BASE_URL: 'http://192.168.100.5:8080',
  },
  production: {
    BASE_URL: 'https://f3a5-ngrok-url.ngrok-free.app',
  },
};

export const BASE_URL = CONFIG[ENV].BASE_URL;

