// app/contactos/index.tsx
import { FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Href, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Linking,
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

const CONTACT = {
  name: "Javier Contrera",
  phone: "+595972151409",
  whatsapp: "595972151409",
  email: "javier@avanzaconsultores.com",
};

const THEME = {
  brand: "#facc15",
  iconBgAlpha: "40",
};

const SHADOW = {
  elevation: 5,
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
};

type UserDTO = {
  id?: number;
  nombre?: string;
  apellido?: string;
  cedula?: string;
  telefono?: string;
  ruc?: string;
};

function ActionCard({
  title,
  desc,
  icon,
  color,
  onPress,
}: {
  title: string;
  desc: string;
  icon: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "rgba(0,0,0,0.06)" }}
      style={({ pressed }) => [
        tw`rounded-2xl p-4 mb-3 bg-white`,
        SHADOW,
        { opacity: pressed ? 0.95 : 1 },
      ]}
    >
      <View style={tw`flex-row items-center`}>
        <View
          style={[
            tw`w-10 h-10 rounded-full items-center justify-center`,
            { backgroundColor: `${color}${THEME.iconBgAlpha}` },
          ]}
        >
          <FontAwesome5 name={icon as any} size={18} color={color} />
        </View>

        <View style={tw`ml-3 flex-1`}>
          <Text style={tw`text-base font-semibold text-gray-900`}>{title}</Text>
          <Text style={tw`text-xs text-gray-600 mt-0.5`}>{desc}</Text>
        </View>

        <FontAwesome5 name="chevron-right" size={14} color="#9ca3af" />
      </View>
    </Pressable>
  );
}

export default function ContactosHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const TOP_PAD = insets.top + 16;

  const [usuario, setUsuario] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
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
          router.replace("/" as Href);
          return;
        }

        const data: UserDTO = await res.json();
        setUsuario(data);
      } catch {
        router.replace("/" as Href);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const fullName = useMemo(() => {
    const n = [usuario?.nombre, usuario?.apellido]
      .filter(Boolean)
      .join(" ")
      .trim();
    return n || "Cliente";
  }, [usuario]);

  const abrirWhatsApp = async () => {
    const text = `Hola ${CONTACT.name}, soy ${fullName}. Quisiera una ayuda con mis documentos/obligaciones en DNIT.`;
    const url = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(text)}`;
    const can = await Linking.canOpenURL(url);
    if (can) return Linking.openURL(url);
  };

  const llamar = async () => {
    const url = `tel:${CONTACT.phone}`;
    const can = await Linking.canOpenURL(url);
    if (can) return Linking.openURL(url);
  };

  const enviarEmail = async () => {
    const subject = `Consulta AvanzApp - ${fullName}`;
    const body = `Hola ${CONTACT.name},\n\nSoy ${fullName}. Quisiera consultar sobre mis documentos/obligaciones en DNIT.\n\nSaludos.`;
    const url = `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const can = await Linking.canOpenURL(url);
    if (can) return Linking.openURL(url);
  };

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-100`}>
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color={THEME.brand} />
          <Text style={tw`mt-2 text-gray-600`}>Cargando contacto...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`} edges={["bottom"]}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      {/* Barra superior: Atrás / Inicio */}
      <View
        style={[
          tw`px-4 pt-3 pb-2 flex-row justify-between`,
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

      <ScrollView contentContainerStyle={tw`px-4 pb-6`}>
        {/* Header */}
        <View style={[tw`rounded-2xl p-4 bg-white`, SHADOW]}>
          <View style={tw`flex-row items-center`}>
            <View
              style={[
                tw`w-12 h-12 rounded-full items-center justify-center`,
                { backgroundColor: THEME.brand },
                SHADOW,
              ]}
            >
              <Text style={tw`text-lg font-extrabold text-white`}>CJ</Text>
            </View>

            <View style={tw`ml-3 flex-1`}>
              <Text style={tw`text-xl font-extrabold text-gray-900`}>
                Contactar al Contador
              </Text>
              <Text style={tw`text-xs text-gray-600 mt-0.5`}>
                Elegí una opción para comunicarte con tu contador.
              </Text>
            </View>
          </View>

          <View style={tw`mt-3`}>
            <Text style={tw`text-sm text-gray-800 font-semibold`}>
              {CONTACT.name}
            </Text>
            <Text style={tw`text-xs text-gray-600`}>Tel: {CONTACT.phone}</Text>
            <Text style={tw`text-xs text-gray-600`}>
              Email: {CONTACT.email}
            </Text>
          </View>
        </View>

        {/* Acciones */}
        <View style={tw`mt-4`}>
          <ActionCard
            title="WhatsApp"
            desc="Escribile al contador y enviá tu consulta en segundos."
            icon="whatsapp"
            color="#22c55e"
            onPress={abrirWhatsApp}
          />

          <ActionCard
            title="Llamar"
            desc="Hacé una llamada directa al contador."
            icon="phone"
            color="#06b6d4"
            onPress={llamar}
          />

          <ActionCard
            title="Email"
            desc="Enviá un correo formal con tu consulta."
            icon="envelope"
            color="#8b5cf6"
            onPress={enviarEmail}
          />
        </View>

        {/* Footer */}
        <View style={tw`mt-4 items-center`}>
          <Text style={tw`text-[10px] text-gray-500`}>
            © 2025 Avanza Consultores — Todos los derechos reservados
          </Text>
          <Text style={tw`text-[10px] text-gray-500`}>
            Desarrollado por Yamil M. para uso exclusivo de clientes
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
