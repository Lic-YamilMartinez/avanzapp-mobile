// app/reportes/index.tsx
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
import { useReportes } from "../context/ReportesContext";

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

type CardProps = {
  title: string;
  desc: string;
  to: Href;
  iconKey: "compras" | "ventas" | "balance";
};

const CARD_ICONS: Record<
  "compras" | "ventas" | "balance",
  { icon: string; color: string }
> = {
  compras: { icon: "shopping-cart", color: "#f59e0b" },
  ventas: { icon: "file-invoice-dollar", color: "#22c55e" },
  balance: { icon: "balance-scale", color: "#06b6d4" },
};

function ReportCard({ title, desc, to, iconKey }: CardProps) {
  const router = useRouter();
  const { icon, color } = CARD_ICONS[iconKey];

  return (
    <Pressable
      onPress={() => router.push(to)}
      android_ripple={{ color: "rgba(0,0,0,0.05)" }}
      style={({ pressed }) => [
        tw`rounded-[24px] p-4 mb-3 bg-white flex-row items-center`,
        SHADOW,
        { opacity: pressed ? 0.96 : 1 },
      ]}
    >
      <View
        style={[
          tw`w-11 h-11 rounded-2xl items-center justify-center mr-3`,
          { backgroundColor: `${color}${THEME.iconBgAlpha}` },
        ]}
      >
        <FontAwesome5 name={icon as any} size={18} color={color} />
      </View>

      <View style={tw`flex-1`}>
        <Text style={tw`text-[15px] font-bold text-gray-900`}>{title}</Text>
        <Text style={tw`text-[11px] text-gray-500 mt-0.5`}>{desc}</Text>
      </View>

      <FontAwesome5 name="chevron-right" size={14} color="#9ca3af" />
    </Pressable>
  );
}

export default function ReportesHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const TOP_PAD = insets.top + 12;

  const { data, setData } = useReportes();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resumen = useMemo(() => {
    if (!data) return null;
    const compras = Array.isArray((data as any).compras)
      ? (data as any).compras.length
      : 0;
    const ventas = Array.isArray((data as any).ventas)
      ? (data as any).ventas.length
      : 0;
    return { compras, ventas };
  }, [data]);

  useEffect(() => {
    if (data && (data as any).compras && (data as any).ventas) return;
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const token = await AsyncStorage.getItem("token");
      const userId = await AsyncStorage.getItem("userId");

      if (!token || !userId) {
        router.replace("/" as Href);
        return;
      }

      const resp = await fetch(`${BASE_URL}/reportes/dnit/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!resp.ok) {
        setErrorMsg("No se pudieron cargar los reportes del DNIT.");
        if (resp.status === 401) {
          await AsyncStorage.multiRemove(["token", "email", "role", "userId"]);
          router.replace("/" as Href);
        }
        return;
      }

      const json = await resp.json();
      setData(json);
    } catch (e) {
      setErrorMsg("Ocurrió un error al cargar los reportes.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-100`}>
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color={THEME.brand} />
          <Text style={tw`mt-3 text-gray-600`}>Cargando reportes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`} edges={["bottom"]}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      <View
        style={[
          tw`px-4 pt-2 pb-2 flex-row justify-between`,
          { paddingTop: TOP_PAD },
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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`px-4 pb-5`}
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
                REPORTES AVANZAPP
              </Text>

              <Text style={tw`text-[21px] font-extrabold text-gray-900 mt-1`}>
                Reportes
              </Text>

              <Text style={tw`text-[12px] text-yellow-900 mt-1.5 leading-4`}>
                Consultá tus compras, ventas y balance en un solo lugar.
              </Text>

              {!!resumen && (
                <Text style={tw`text-[11px] text-yellow-900 mt-2`}>
                  Compras:{" "}
                  <Text style={tw`font-extrabold text-gray-900`}>
                    {resumen.compras}
                  </Text>{" "}
                  • Ventas:{" "}
                  <Text style={tw`font-extrabold text-gray-900`}>
                    {resumen.ventas}
                  </Text>
                </Text>
              )}
            </View>

            <View
              style={[
                tw`w-12 h-12 rounded-full items-center justify-center`,
                { backgroundColor: "rgba(255,255,255,0.35)" },
              ]}
            >
              <Text style={tw`text-sm font-extrabold text-white`}>R</Text>
            </View>
          </View>
        </View>

        {errorMsg && (
          <View style={[tw`bg-white rounded-[20px] p-3 mb-3`, SHADOW]}>
            <Text style={tw`text-xs text-red-500`}>⚠️ {errorMsg}</Text>
          </View>
        )}

        {/* Lista de reportes */}
        <View style={tw`mb-1`}>
          <Text style={tw`text-[13px] font-bold text-gray-800 mb-2`}>
            Accesos disponibles
          </Text>

          <ReportCard
            title="Reportes de Compras"
            desc="Visualizá tus comprobantes de compra."
            to="/reportes/compras"
            iconKey="compras"
          />

          <ReportCard
            title="Reportes de Ventas"
            desc="Visualizá tus facturas emitidas."
            to="/reportes/ventas"
            iconKey="ventas"
          />

          <ReportCard
            title="Balance"
            desc="Conciliá compras y ventas por período."
            to="/reportes/balance"
            iconKey="balance"
          />
        </View>

        {/* Footer */}
        <View style={tw`mt-2 items-center`}>
          <Text style={tw`text-[9px] text-gray-500 text-center`}>
            © 2025 Avanza Consultores — Todos los derechos reservados
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
