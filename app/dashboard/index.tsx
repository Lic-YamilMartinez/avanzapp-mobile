// app/dashboard/index.tsx
import { FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Href, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
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
  cedula?: string;
  telefono?: string;
  ruc?: string;
};

type DailyTip = {
  text: string;
};

const THEME = {
  brand: "#facc15",
  text: "#111827",
};

const SHADOW = {
  elevation: 5,
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
};

const DAILY_TIPS: DailyTip[] = [
  {
    text: "Separá siempre tu dinero personal del dinero de tu actividad para saber realmente cuánto ganás.",
  },
  {
    text: "Reservá una parte de cada ingreso para impuestos y obligaciones antes de usar el resto del dinero.",
  },
  {
    text: "Controlar tus gastos fijos todos los meses te ayuda a detectar fugas de dinero a tiempo.",
  },
  {
    text: "No todo ingreso es ganancia: primero descontá costos, impuestos y compromisos pendientes.",
  },
  {
    text: "Guardar y ordenar tus comprobantes evita errores, multas y pérdidas de tiempo innecesarias.",
  },
  {
    text: "Revisar tus ventas y egresos cada mes te permite tomar decisiones más inteligentes para tu negocio.",
  },
  {
    text: "Un pequeño ahorro mensual sostenido puede convertirse en un fondo de tranquilidad para imprevistos.",
  },
  {
    text: "Reducir gastos innecesarios mejora tu rentabilidad más rápido de lo que parece.",
  },
  {
    text: "Llevar tu información financiera al día te da más control, más claridad y menos estrés.",
  },
  {
    text: "Tener orden en tus números te ayuda a crecer con mayor seguridad y confianza.",
  },
];

function getDailyTip(): DailyTip {
  const today = new Date();
  const seed = Number(
    `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(
      today.getDate(),
    ).padStart(2, "0")}`,
  );
  const index = seed % DAILY_TIPS.length;
  return DAILY_TIPS[index];
}

export default function DashboardCliente() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const TOP_PAD = insets.top + 35;

  const [usuario, setUsuario] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setUsuario(null);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        router.replace("/" as Href);
        return;
      }

      try {
        const res = await fetch(`${BASE_URL}/usuarios/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("Error HTTP al obtener usuario", res.status, text);
          router.replace("/" as Href);
          return;
        }

        const data: UserDTO = await res.json();
        setUsuario(data);

        if (data?.id) {
          await AsyncStorage.setItem("userId", String(data.id));
        }
        if (data?.cedula) {
          await AsyncStorage.setItem("cedula", String(data.cedula));
        }
      } catch (e) {
        console.error("Error al obtener usuario", e);
        router.replace("/" as Href);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const iniciales = useMemo(() => {
    const full = [usuario?.nombre, usuario?.apellido]
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
  }, [usuario]);

  const dailyTip = useMemo(() => getDailyTip(), []);

  const MENU: {
    key: string;
    label: string;
    subtitle: string;
    icon: string;
    color: string;
    onPress: () => void;
  }[] = [
    {
      key: "perfil",
      label: "Perfil",
      subtitle: "Tus datos personales",
      icon: "user",
      color: "#f59e0b",
      onPress: () => router.push("/perfil" as Href),
    },
    {
      key: "informes",
      label: "Informes",
      subtitle: "Ventas y compras",
      icon: "chart-line",
      color: "#22c55e",
      onPress: () => router.push("/reportes" as Href),
    },
    {
      key: "dnit",
      label: "DNIT",
      subtitle: "Documentos y archivos",
      icon: "clipboard-list",
      color: "#06b6d4",
      onPress: () => router.push("/documentos" as Href),
    },
    {
      key: "contacto",
      label: "Contador",
      subtitle: "Soporte y consultas",
      icon: "phone",
      color: "#8b5cf6",
      onPress: () => router.push("/contactos" as Href),
    },
  ];

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

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-100`}>
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color={THEME.brand} />
          <Text style={tw`mt-2 text-gray-600`}>Cargando datos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`} edges={["bottom"]}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[tw`px-4 pb-4`, { paddingTop: TOP_PAD }]}
      >
        {/* HERO compacto */}
        <View
          style={[
            tw`rounded-[24px] p-4`,
            SHADOW,
            { backgroundColor: THEME.brand },
          ]}
        >
          <View style={tw`flex-row items-start justify-between`}>
            <View style={tw`flex-1 pr-3`}>
              <Text style={tw`text-[11px] font-semibold text-yellow-900`}>
                AVANZA CONSULTORES
              </Text>

              <Text style={tw`text-[20px] font-extrabold text-gray-900 mt-1`}>
                Hola, {usuario?.nombre || "Cliente"}
              </Text>

              <Text style={tw`text-[12px] text-yellow-900 mt-1.5 leading-4`}>
                Accedé a tus informes, DNIT y contacto con tu contador.
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

          <View style={tw`mt-3 flex-row`}>
            <View
              style={[
                tw`rounded-2xl px-3 py-1.5`,
                { backgroundColor: "rgba(255,255,255,0.28)" },
              ]}
            >
              <Text style={tw`text-[10px] font-semibold text-gray-900`}>
                Panel del Cliente
              </Text>
            </View>
          </View>
        </View>

        {/* TIP compacto */}
        <View style={[tw`mt-3 rounded-[24px] p-3.5 bg-white`, SHADOW]}>
          <View style={tw`flex-row items-center`}>
            <View
              style={[
                tw`w-9 h-9 rounded-2xl items-center justify-center`,
                { backgroundColor: "#dcfce7" },
              ]}
            >
              <FontAwesome5 name="wallet" size={15} color="#16a34a" />
            </View>

            <View style={tw`ml-3 flex-1`}>
              <Text style={tw`text-[13px] font-bold text-gray-800`}>
                Tip financiero del día
              </Text>
              <Text style={tw`text-[10px] text-gray-500`}>
                Cambia automáticamente cada día
              </Text>
            </View>
          </View>

          <Text style={tw`mt-3 text-[12px] text-gray-700 leading-5`}>
            {dailyTip.text}
          </Text>
        </View>

        {/* ACCESOS */}
        <View style={tw`mt-3`}>
          <Text style={tw`text-[13px] font-bold text-gray-800 mb-2.5`}>
            Accesos rápidos
          </Text>

          <View style={tw`flex-row flex-wrap justify-between`}>
            {MENU.map((item) => (
              <Pressable
                key={item.key}
                onPress={item.onPress}
                android_ripple={{ color: "rgba(0,0,0,0.05)" }}
                style={({ pressed }) => [
                  tw`bg-white rounded-[24px] p-3.5 mb-3 w-[48.5%]`,
                  SHADOW,
                  { opacity: pressed ? 0.96 : 1, minHeight: 112 },
                ]}
              >
                <View style={tw`flex-1 justify-between`}>
                  <View
                    style={[
                      tw`w-10 h-10 rounded-2xl items-center justify-center`,
                      { backgroundColor: `${item.color}20` },
                    ]}
                  >
                    <FontAwesome5
                      name={item.icon as any}
                      size={17}
                      color={item.color}
                    />
                  </View>

                  <View style={tw`mt-3`}>
                    <Text style={tw`text-[14px] font-bold text-gray-800`}>
                      {item.label}
                    </Text>
                    <Text style={tw`text-[10px] text-gray-500 mt-0.5`}>
                      {item.subtitle}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* LOGOUT */}
        <Pressable
          onPress={logout}
          style={({ pressed }) => [
            tw`mt-0.5 bg-white rounded-[24px] p-3.5`,
            SHADOW,
            { opacity: pressed ? 0.96 : 1 },
          ]}
        >
          <View style={tw`flex-row items-center`}>
            <View
              style={[
                tw`w-10 h-10 rounded-2xl items-center justify-center`,
                { backgroundColor: "#fee2e2" },
              ]}
            >
              <FontAwesome5 name="sign-out-alt" size={16} color="#ef4444" />
            </View>

            <View style={tw`ml-3 flex-1`}>
              <Text style={tw`text-[13px] font-bold text-gray-800`}>
                Cerrar sesión
              </Text>
              <Text style={tw`text-[10px] text-gray-500 mt-0.5`}>
                Salir de tu cuenta actual
              </Text>
            </View>

            <FontAwesome5 name="chevron-right" size={13} color="#9ca3af" />
          </View>
        </Pressable>

        {/* FOOTER */}
        <View style={tw`mt-4 pt-1 items-center`}>
          <Text style={tw`text-[9px] text-gray-500 text-center`}>
            © 2025 Avanza Consultores — Todos los derechos reservados
          </Text>
          <Text style={tw`text-[9px] text-gray-500 text-center mt-0.5`}>
            Desarrollado por Yamil M. para uso exclusivo de clientes
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
