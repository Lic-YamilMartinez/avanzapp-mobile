// app/dashboard/_layout.tsx (si no existe, crealo)
import { Stack } from 'expo-router';

export default function DashboardLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
