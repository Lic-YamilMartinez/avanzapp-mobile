// config.ts
import { Platform } from "react-native";

const isDev = false;

let localIP = "";

if (Platform.OS === "android") {
  localIP = "http://192.168.100.65:8080";
} else if (Platform.OS === "ios") {
  localIP = "http://localhost:8080";
} else {
  localIP = "http://192.168.100.65:8080";
}

const CONFIG = {
  development: {
    BASE_URL: localIP,
  },

  production: {
    BASE_URL: "http://200.85.35.18:8080",
  },
};

export const BASE_URL = isDev
  ? CONFIG.development.BASE_URL
  : CONFIG.production.BASE_URL;
