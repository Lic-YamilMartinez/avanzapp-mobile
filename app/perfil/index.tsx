// app/perfil/index.tsx
import { FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Href, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import tw from "twrnc";
import { BASE_URL } from "../config/config";

type UserDTO = {
  id?: number;
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  ruc?: string;
  direccion?: string;
  ciudad?: string;
  pais?: string;
};

const THEME = {
  brand: "#facc15",
  iconBgAlpha: "20",
};

const SHADOW = {
  elevation: 5,
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
};

async function getMe(): Promise<UserDTO> {
  const token = await AsyncStorage.getItem("token");
  const email = await AsyncStorage.getItem("email");

  const res = await fetch(`${BASE_URL}/usuarios/me?email=${email}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 401) {
    await AsyncStorage.multiRemove(["token", "email", "role"]);
    throw new Error("SESSION_EXPIRED");
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function Perfil() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const TOP_BAR_PAD = insets.top + 12;

  const [user, setUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const u = await getMe();
      setUser(u);
    } catch (e: any) {
      if (e?.message === "SESSION_EXPIRED") {
        Alert.alert("Sesión expirada", "Iniciá sesión nuevamente.");
        router.replace("/" as Href);
      } else {
        Alert.alert("Error", e?.message || "No se pudo cargar el perfil.");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const iniciales = useMemo(() => {
    const full = [user?.nombre, user?.apellido]
      .filter(Boolean)
      .join(" ")
      .trim();
    return full
      ? full
          .split(" ")
          .map((s) => s[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "CL";
  }, [user]);

  const fullName =
    [user?.nombre, user?.apellido].filter(Boolean).join(" ") || "Cliente";

  const logout = async () => {
    await AsyncStorage.multiRemove([
      "token",
      "email",
      "role",
      "userId",
      "cedula",
    ]);
    router.replace("/" as Href);
  };

  const call = async () => {
    if (!user?.telefono) return;
    const url = `tel:${user.telefono}`;
    const can = await Linking.canOpenURL(url);
    if (can) await Linking.openURL(url);
  };

  const mail = async () => {
    if (!user?.email) return;
    const url = `mailto:${user.email}`;
    const can = await Linking.canOpenURL(url);
    if (can) await Linking.openURL(url);
  };

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-100`}>
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color={THEME.brand} />
          <Text style={tw`text-gray-600 mt-2`}>Cargando perfil…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`} edges={["bottom"]}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      {/* Top bar */}
      <View
        style={[
          tw`px-4 pt-2 pb-2 flex-row justify-between`,
          { paddingTop: TOP_BAR_PAD },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            tw`px-4 py-2 rounded-xl bg-white flex-row items-center`,
            SHADOW,
            { opacity: pressed ? 0.95 : 1 },
          ]}
        >
          <FontAwesome5 name="arrow-left" size={14} color="#374151" />
          <Text style={tw`ml-2 text-sm font-semibold text-gray-700`}>
            Atrás
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace("/dashboard" as Href)}
          style={({ pressed }) => [
            tw`px-4 py-2 rounded-xl bg-white flex-row items-center`,
            SHADOW,
            { opacity: pressed ? 0.95 : 1 },
          ]}
        >
          <FontAwesome5 name="home" size={14} color="#374151" />
          <Text style={tw`ml-2 text-sm font-semibold text-gray-700`}>
            Inicio
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={tw`px-4 pb-5`}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* HERO */}
        <View
          style={[
            tw`rounded-[24px] p-4 mb-3`,
            SHADOW,
            { backgroundColor: THEME.brand },
          ]}
        >
          <View style={tw`flex-row items-start justify-between`}>
            <View style={tw`flex-1 pr-3`}>
              <Text style={tw`text-[11px] font-semibold text-yellow-900`}>
                PERFIL DEL CLIENTE
              </Text>

              <Text style={tw`text-[21px] font-extrabold text-gray-900 mt-1`}>
                {fullName}
              </Text>

              <Text style={tw`text-[12px] text-yellow-900 mt-1.5 leading-4`}>
                Consultá y actualizá tus datos personales registrados en
                AvanzApp.
              </Text>
            </View>

            <View
              style={[
                tw`w-12 h-12 rounded-full items-center justify-center`,
                { backgroundColor: "rgba(255,255,255,0.35)" },
              ]}
            >
              <Text style={tw`text-sm font-extrabold text-white`}>
                {iniciales}
              </Text>
            </View>
          </View>

          <View style={tw`mt-3 flex-row justify-between items-center`}>
            <View
              style={[
                tw`rounded-2xl px-3 py-1.5`,
                { backgroundColor: "rgba(255,255,255,0.28)" },
              ]}
            >
              <Text style={tw`text-[10px] font-semibold text-gray-900`}>
                Datos personales
              </Text>
            </View>

            <Pressable
              onPress={() => router.push("/perfil/editar" as Href)}
              style={({ pressed }) => [
                tw`px-3 py-2 rounded-xl flex-row items-center`,
                {
                  opacity: pressed ? 0.9 : 1,
                  backgroundColor: "rgba(255,255,255,0.38)",
                },
              ]}
            >
              <FontAwesome5 name="pen" size={11} color="#92400e" />
              <Text style={tw`ml-2 text-[11px] font-extrabold text-amber-900`}>
                Editar
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Contacto */}
        <Card title="Contacto">
          <Field
            icon="envelope"
            iconColor="#8b5cf6"
            label="Correo"
            value={user?.email}
            onPress={mail}
            action="Abrir"
          />
          <Divider />
          <Field
            icon="phone"
            iconColor="#06b6d4"
            label="Teléfono"
            value={user?.telefono}
            onPress={call}
            action="Llamar"
          />
        </Card>

        {/* Identificación fiscal */}
        <Card title="Identificación fiscal">
          <Field
            icon="id-card"
            iconColor="#f59e0b"
            label="RUC"
            value={user?.ruc}
          />
        </Card>

        {/* Dirección */}
        {(user?.direccion || user?.ciudad || user?.pais) && (
          <Card title="Dirección">
            <Field
              icon="map-marker-alt"
              iconColor="#22c55e"
              label="Dirección"
              value={user?.direccion}
            />
            {user?.ciudad ? (
              <>
                <Divider />
                <Field
                  icon="city"
                  iconColor="#3b82f6"
                  label="Ciudad"
                  value={user.ciudad}
                />
              </>
            ) : null}
            {user?.pais ? (
              <>
                <Divider />
                <Field
                  icon="globe"
                  iconColor="#ef4444"
                  label="País"
                  value={user.pais}
                />
              </>
            ) : null}
          </Card>
        )}

        {/* Acciones */}
        <View style={tw`mt-1 flex-row`}>
          <Pressable
            onPress={onRefresh}
            style={({ pressed }) => [
              tw`flex-1 mr-2 py-3 rounded-[20px] bg-white items-center`,
              SHADOW,
              { opacity: pressed ? 0.95 : 1 },
            ]}
          >
            <Text style={tw`text-[13px] font-bold text-gray-800`}>
              Actualizar
            </Text>
          </Pressable>

          <Pressable
            onPress={logout}
            style={({ pressed }) => [
              tw`flex-1 ml-2 py-3 rounded-[20px] bg-red-500 items-center`,
              SHADOW,
              { opacity: pressed ? 0.95 : 1 },
            ]}
          >
            <Text style={tw`text-[13px] font-bold text-white`}>
              Cerrar sesión
            </Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={tw`mt-4 items-center`}>
          <Text style={tw`text-[9px] text-gray-500 text-center`}>
            © 2025 Avanza Consultores — Todos los derechos reservados
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* === UI helpers === */
function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[tw`bg-white rounded-[24px] p-4 mb-3`, SHADOW]}>
      <Text style={tw`text-[15px] font-bold mb-3 text-gray-900`}>{title}</Text>
      {children}
    </View>
  );
}

function Field({
  icon,
  iconColor,
  label,
  value,
  action,
  onPress,
}: {
  icon: string;
  iconColor: string;
  label: string;
  value?: string | number | null;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={tw`flex-row items-center`}>
      <View
        style={[
          tw`w-10 h-10 rounded-2xl items-center justify-center mr-3`,
          { backgroundColor: `${iconColor}${THEME.iconBgAlpha}` },
        ]}
      >
        <FontAwesome5 name={icon as any} size={15} color={iconColor} />
      </View>

      <View style={tw`flex-1`}>
        <Text style={tw`text-[11px] text-gray-500`}>{label}</Text>
        <Text style={tw`text-[13px] text-gray-900 font-semibold`}>
          {value || "—"}
        </Text>
      </View>

      {action && onPress ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            tw`px-3 py-2 rounded-xl bg-gray-100`,
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={tw`text-[11px] font-semibold text-gray-700`}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Divider() {
  return <View style={tw`my-3 h-[1px] bg-gray-100`} />;
}
