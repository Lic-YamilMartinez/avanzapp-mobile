// app/_layout.tsx
import { Stack } from "expo-router";
import { ReportesProvider } from "./context/ReportesContext"; // 👈 ajustá la ruta si hace falta

export default function RootLayout() {
  return (
    <ReportesProvider>
      <Stack initialRouteName="index" screenOptions={{ headerShown: false }}>
        {/* Login en / */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        {/* Dashboard del cliente */}
        <Stack.Screen name="app/index" options={{ headerShown: false }} />
        {/* Grupo de tabs (solo para vistas internas) */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ReportesProvider>
  );
}
