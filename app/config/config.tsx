// config.ts
import { Platform } from "react-native";

const isDev = false; // 👉 TRUE mientras desarrollás localmente

let localIP = "";

if (Platform.OS === "android") {
  // Emulador Android → host local
  localIP = "http://192.168.100.65:8080";
} else if (Platform.OS === "ios") {
  // Simulador iOS
  localIP = "http://localhost:8080";
} else {
  // Web o dispositivo físico en la misma red
  // 👉 Asegurate que esta IP sea la de tu PC donde corre el backend
  localIP = "http://192.168.100.65:8080";
}

const CONFIG = {
  development: {
    BASE_URL: localIP,
  },
  production: {
    // Cuando realmente quieras usar ngrok / dominio público
    BASE_URL: "http://200.85.35.18:8080",
  },
};

export const BASE_URL = isDev
  ? CONFIG.development.BASE_URL
  : CONFIG.production.BASE_URL;
