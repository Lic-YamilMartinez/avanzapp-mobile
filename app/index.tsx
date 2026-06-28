// app/index.tsx
import { FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Href, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";

import logo from "../assets/logo-avanza.png";
import { BASE_URL } from "./config/config";

const THEME = {
  brand: "#facc15",
};

const CONTACT = {
  name: "Javier Contrera",
  phone: "+595972151409",
  whatsapp: "595972151409",
  email: "javier@avanzaconsultores.com",
};

export default function Login() {
  const router = useRouter();
  const [cedula, setCedula] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleLogin = useMemo(
    () => async () => {
      try {
        setSending(true);

        const res = await fetch(`${BASE_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cedula, password }),
        });

        // Si la API devuelve texto vacío en error, evitamos .json() que rompa
        let data: any = {};
        try {
          data = await res.json();
        } catch {
          data = {};
        }

        if (!res.ok) {
          const msg = data?.message || "Credenciales inválidas";
          throw new Error(msg);
        }

        // Guardamos sesión
        await AsyncStorage.multiSet([
          ["token", data.token],
          ["role", data.role],
          ["cedula", data.cedula ?? String(cedula)],
        ]);

        // Navegación según rol
        if (data.role === "ADMIN") {
          router.replace("/admin" as Href);
        } else if (data.role === "CLIENT") {
          router.replace("/dashboard" as Href);
        } else {
          Alert.alert("Error", "Rol desconocido.");
        }
      } catch (e: any) {
        Alert.alert(
          "No pudimos iniciar sesión",
          e?.message || "Intentá de nuevo.",
        );
      } finally {
        setSending(false);
      }
    },
    [cedula, password, router],
  );

  const openWhatsApp = () =>
    Linking.openURL(
      `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(
        "Hola, necesito ayuda para ingresar a AvanzApp.",
      )}`,
    );
  const openCall = () => Linking.openURL(`tel:${CONTACT.phone}`);
  const openMail = () =>
    Linking.openURL(
      `mailto:${CONTACT.email}?subject=${encodeURIComponent(
        "Ayuda acceso AvanzApp",
      )}&body=${encodeURIComponent("Hola, no puedo ingresar a la app…")}`,
    );

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={tw`flex-1 px-5 pt-10 pb-8 justify-center`}>
              <View style={tw`bg-white rounded-2xl px-5 py-6 shadow-lg`}>
                <View style={tw`items-center mb-4`}>
                  <Image
                    source={logo}
                    resizeMode="contain"
                    style={{ width: 180, height: 140 }}
                  />
                </View>

                <Text
                  style={tw`text-2xl font-extrabold text-center text-gray-900`}
                >
                  ¡Bienvenido!
                </Text>
                <Text style={tw`text-sm text-center text-gray-600 mt-1`}>
                  Ingresá tus credenciales para continuar
                </Text>

                <View style={tw`mt-6`}>
                  <Text style={tw`text-xs text-gray-600 mb-1`}>Cédula Nro</Text>
                  <View
                    style={tw`flex-row items-center bg-gray-50 rounded-xl px-3`}
                  >
                    <FontAwesome5 name="envelope" size={14} color="#9ca3af" />
                    <TextInput
                      placeholder="Cédula"
                      autoCapitalize="none"
                      value={cedula}
                      onChangeText={setCedula}
                      style={tw`flex-1 px-2 py-3 text-gray-800`}
                      returnKeyType="next"
                    />
                  </View>

                  <Text style={tw`text-xs text-gray-600 mt-4 mb-1`}>
                    Contraseña
                  </Text>
                  <View
                    style={tw`flex-row items-center bg-gray-50 rounded-xl px-3`}
                  >
                    <FontAwesome5 name="lock" size={14} color="#9ca3af" />
                    <TextInput
                      placeholder="********"
                      secureTextEntry={!showPw}
                      value={password}
                      onChangeText={setPassword}
                      style={tw`flex-1 px-2 py-3 text-gray-800`}
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                    />
                    <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={8}>
                      <FontAwesome5
                        name={showPw ? "eye-slash" : "eye"}
                        size={16}
                        color="#9ca3af"
                      />
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  onPress={handleLogin}
                  disabled={sending}
                  style={({ pressed }) => [
                    tw`mt-6 rounded-xl overflow-hidden`,
                    { opacity: pressed || sending ? 0.9 : 1 },
                  ]}
                >
                  <LinearGradient
                    colors={[THEME.brand, "#f59e0b"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={tw`py-3 items-center`}
                  >
                    <Text style={tw`text-white font-extrabold text-base`}>
                      {sending ? "Ingresando…" : "Entrar"}
                    </Text>
                  </LinearGradient>
                </Pressable>

                <View
                  style={tw`mt-5 p-3 rounded-xl bg-yellow-50 border border-yellow-100`}
                >
                  <Text style={tw`text-xs text-gray-700`}>
                    ¿Problemas para ingresar? Contactá a{" "}
                    <Text style={tw`font-semibold`}>{CONTACT.name}</Text>:
                  </Text>

                  <View style={tw`flex-row mt-2`}>
                    <Pressable
                      onPress={openWhatsApp}
                      style={tw`mr-4 flex-row items-center`}
                    >
                      <FontAwesome5 name="whatsapp" size={16} color="#22c55e" />
                      <Text style={tw`ml-1 text-[12px] text-gray-700`}>
                        WhatsApp
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={openCall}
                      style={tw`mr-4 flex-row items-center`}
                    >
                      <FontAwesome5 name="phone" size={14} color="#3b82f6" />
                      <Text style={tw`ml-1 text-[12px] text-gray-700`}>
                        Llamar
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={openMail}
                      style={tw`flex-row items-center`}
                    >
                      <FontAwesome5 name="envelope" size={14} color="#f59e0b" />
                      <Text style={tw`ml-1 text-[12px] text-gray-700`}>
                        Email
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              <View style={tw`items-center mt-4`}>
                <Text style={tw`text-[10px] text-gray-500`}>
                  © 2025 Avanza Consultores — Todos los derechos reservados
                </Text>
                <Text style={tw`text-[10px] text-gray-800`}>
                  Desarrollado por Yamil Martinez. para uso exclusivo de
                  clientes
                </Text>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
