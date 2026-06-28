// app/documentos/DocumentosCliente.tsx
import { FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { Href, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import tw from "twrnc";
import { BASE_URL } from "../config/config";

/* =========================
   TIPOS
========================= */
type TipoBackend =
  | "CUMPLIMIENTO_TRIBUTARIO"
  | "CONSTANCIA_RUC"
  | "CEDULA_TRIBUTARIA"
  | "DECLARACION_JURADA";

type TipoSeccion =
  | "CUMPLIMIENTO_TRIBUTARIO"
  | "CONSTANCIA_RUC"
  | "CEDULA_TRIBUTARIA"
  | "DECLARACION";

type PdfItem = {
  id: number;
  tipo: TipoBackend;
  periodo: string; // YYYY-MM o YYYY-MM-01
  nombreOriginal?: string;
};

/* =========================
   UI THEME (AvanzApp)
========================= */
const THEME = {
  brand: "#facc15",
  iconBgAlpha: "28", // 👈 similar al dashboard, pero un poco más fuerte
};

const SHADOW = {
  elevation: 6,
  shadowColor: "#000",
  shadowOpacity: 0.1,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 10 },
};

const SECCION_LABEL: Record<TipoSeccion, string> = {
  CUMPLIMIENTO_TRIBUTARIO: "Cumplimiento Tributario",
  CONSTANCIA_RUC: "Constancia RUC",
  CEDULA_TRIBUTARIA: "Cédula Tributaria",
  DECLARACION: "Declaraciones (últimas 6)",
};

const SECCION_ICON: Record<TipoSeccion, string> = {
  CUMPLIMIENTO_TRIBUTARIO: "clipboard-check",
  CONSTANCIA_RUC: "id-card",
  CEDULA_TRIBUTARIA: "address-card",
  DECLARACION: "file-invoice",
};

// ✅ igual que Dashboard: color + fondo alpha
const SECCION_COLOR: Record<TipoSeccion, string> = {
  CUMPLIMIENTO_TRIBUTARIO: "#06b6d4", // cyan
  CONSTANCIA_RUC: "#22c55e", // green
  CEDULA_TRIBUTARIA: "#8b5cf6", // violet
  DECLARACION: "#f59e0b", // orange
};

const SECCIONES: TipoSeccion[] = [
  "CUMPLIMIENTO_TRIBUTARIO",
  "CONSTANCIA_RUC",
  "CEDULA_TRIBUTARIA",
  "DECLARACION",
];

const MAX_DECLARACIONES = 6;

/* =========================
   HELPERS
========================= */
function clampText(s?: string, max = 44) {
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function normalizarPeriodo(p: string) {
  if (!p) return p;
  return p.length >= 7 ? p.slice(0, 7) : p;
}

function nicePeriodo(yyyyMm: string) {
  const p = normalizarPeriodo(yyyyMm);
  const [y, m] = (p || "").split("-");
  return m && y ? `${m}/${y}` : p;
}

async function clearSessionAndGoLogin(router: any) {
  await AsyncStorage.multiRemove([
    "token",
    "email",
    "role",
    "userId",
    "cedula",
  ]);
  router.replace("/" as Href);
}

async function getTokenOrGoLogin(router: any) {
  const token = await AsyncStorage.getItem("token");
  if (!token) {
    router.replace("/" as Href);
    return null;
  }
  return token;
}

function joinUrl(base: string, path: string) {
  const b = (base || "").replace(/\/+$/, "");
  const p = (path || "").startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function withNgrokSkip(url: string) {
  const hasQuery = url.includes("?");
  const suffix = "ngrok-skip-browser-warning=1";
  return hasQuery ? `${url}&${suffix}` : `${url}?${suffix}`;
}

/* =========================
   COMPONENTE
========================= */
export default function DocumentosCliente() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const TOP_PAD = insets.top + 12;

  const [docs, setDocs] = useState<PdfItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [expandedTipo, setExpandedTipo] = useState<TipoSeccion | null>(null);
  const [openingId, setOpeningId] = useState<number | null>(null);

  /* =========================
     FETCH LISTA DE DOCS
  ========================= */
  const fetchDocs = async () => {
    try {
      setLoading(true);
      const token = await getTokenOrGoLogin(router);
      if (!token) return;

      const res = await fetch(joinUrl(BASE_URL, "/api/pdfs"), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const raw = await res.text().catch(() => "");

      if (res.status === 401 || res.status === 403) {
        Alert.alert("Sesión", "Tu sesión expiró. Volvé a iniciar sesión.");
        await clearSessionAndGoLogin(router);
        return;
      }

      if (!res.ok) {
        let msg = raw || "(sin mensaje del servidor)";
        try {
          const j = raw ? JSON.parse(raw) : null;
          msg = j?.message || j?.error || msg;
        } catch {}
        throw new Error(`Error ${res.status}: ${msg}`);
      }

      let data: PdfItem[] = [];
      try {
        data = raw ? JSON.parse(raw) : [];
      } catch {
        data = [];
      }

      const normalized = (Array.isArray(data) ? data : []).map((d) => ({
        ...d,
        periodo: normalizarPeriodo(d.periodo),
      }));

      setDocs(normalized);
    } catch (e: any) {
      console.error("fetchDocs error:", e);
      Alert.alert("Error", e?.message || "No se pudo cargar documentos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================
     AGRUPAR POR SECCIÓN
  ========================= */
  const docsPorTipo = useMemo(() => {
    const map: Record<TipoSeccion, PdfItem[]> = {
      CUMPLIMIENTO_TRIBUTARIO: [],
      CONSTANCIA_RUC: [],
      CEDULA_TRIBUTARIA: [],
      DECLARACION: [],
    };

    docs.forEach((d) => {
      if (d.tipo === "DECLARACION_JURADA") {
        map.DECLARACION.push(d);
        return;
      }
      if (d.tipo in map) {
        map[d.tipo as Exclude<TipoBackend, "DECLARACION_JURADA">].push(d);
      }
    });

    (Object.keys(map) as TipoSeccion[]).forEach((tipo) => {
      map[tipo].sort((a, b) =>
        (b.periodo || "").localeCompare(a.periodo || ""),
      );
    });

    map.DECLARACION = map.DECLARACION.slice(0, MAX_DECLARACIONES);
    return map;
  }, [docs]);

  /* =========================
     ABRIR PDF
  ========================= */
  const abrirDocumento = async (item: PdfItem) => {
    try {
      const token = await getTokenOrGoLogin(router);
      if (!token) return;

      setOpeningId(item.id);

      const linkRes = await fetch(
        joinUrl(BASE_URL, `/api/pdfs/${item.id}/link`),
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );

      const raw = await linkRes.text().catch(() => "");

      if (linkRes.status === 401 || linkRes.status === 403) {
        Alert.alert("Sesión", "Tu sesión expiró. Volvé a iniciar sesión.");
        await clearSessionAndGoLogin(router);
        return;
      }

      if (!linkRes.ok) {
        let msg = raw || "(sin mensaje del servidor)";
        try {
          const j = raw ? JSON.parse(raw) : null;
          msg = j?.message || j?.error || msg;
        } catch {}
        throw new Error(`Error ${linkRes.status}: ${msg}`);
      }

      let json: any = null;
      try {
        json = raw ? JSON.parse(raw) : null;
      } catch {
        json = null;
      }

      const path =
        (json?.path as string | undefined) ||
        (json?.token ? `/api/pdfs/public/${json.token}` : undefined);

      if (!path)
        throw new Error(
          "El servidor no devolvió token/path para abrir el PDF.",
        );

      const url = withNgrokSkip(joinUrl(BASE_URL, path));

      const can = await Linking.canOpenURL(url);
      if (!can)
        throw new Error(
          "No se pudo abrir el enlace del PDF en este dispositivo.",
        );

      await Linking.openURL(url);
    } catch (e: any) {
      console.error("abrirDocumento error:", e);
      Alert.alert("Error", e?.message || "No se pudo abrir el documento");
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`} edges={["bottom"]}>
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

      <View style={tw`px-4 pb-4`}>
        {/* Header */}
        <View
          style={[
            tw`rounded-2xl p-4 bg-white flex-row items-center justify-between`,
            SHADOW,
          ]}
        >
          <View style={tw`flex-row items-center`}>
            <View
              style={[
                tw`w-10 h-10 rounded-full items-center justify-center mr-3`,
                { backgroundColor: THEME.brand },
                SHADOW,
              ]}
            >
              <Text style={tw`text-lg font-extrabold text-white`}>D</Text>
            </View>

            <View>
              <Text style={tw`text-xl font-extrabold text-gray-900`}>
                Documentos
              </Text>
              <Text style={tw`text-[11px] text-gray-600 mt-0.5`}>
                AvanzApp • Mis PDFs
              </Text>
            </View>
          </View>

          <Pressable
            onPress={fetchDocs}
            style={({ pressed }) => [
              tw`px-3 py-2 rounded-xl flex-row items-center`,
              {
                backgroundColor: pressed
                  ? "rgba(250,204,21,0.30)"
                  : "rgba(250,204,21,0.18)",
                borderWidth: 1,
                borderColor: "rgba(250,204,21,0.35)",
              },
            ]}
          >
            <FontAwesome5 name="sync" size={14} color="#8b5e3c" />
            <Text
              style={[
                tw`ml-2 text-[12px]`,
                { color: "#8b5e3c", fontWeight: "900" },
              ]}
            >
              Actualizar
            </Text>
          </Pressable>
        </View>

        {/* Tip */}
        <View style={[tw`mt-3 px-3 py-2 rounded-2xl bg-white`, SHADOW]}>
          <Text
            style={[tw`text-[11px]`, { color: "#6b7280", fontWeight: "800" }]}
          >
            Tip: tocá una tarjeta para ver periodos y abrir el PDF.
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color={THEME.brand} />
          <Text style={tw`mt-2 text-gray-600`}>Cargando documentos...</Text>
        </View>
      ) : (
        <FlatList
          data={SECCIONES}
          keyExtractor={(t) => t}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          renderItem={({ item: tipo }) => {
            const abierto = expandedTipo === tipo;
            const lista = docsPorTipo[tipo] || [];
            const color = SECCION_COLOR[tipo];

            const subtitle =
              tipo === "DECLARACION"
                ? lista.length === 0
                  ? "Sin declaraciones cargadas"
                  : `Mostrando las últimas ${lista.length} declaración(es)`
                : lista.length === 0
                  ? "Sin documentos cargados"
                  : `${lista.length} documento(s) disponible(s)`;

            return (
              <View style={[tw`rounded-3xl p-4 mb-3 bg-white`, SHADOW]}>
                <Pressable
                  onPress={() => setExpandedTipo(abierto ? null : tipo)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.95 : 1 }]}
                >
                  <View style={tw`flex-row items-center justify-between`}>
                    <View style={tw`flex-row items-center flex-1`}>
                      {/* ✅ EXACTO estilo dashboard: color + fondo alpha */}
                      <View
                        style={[
                          tw`w-11 h-11 rounded-2xl items-center justify-center`,
                          {
                            backgroundColor: `${color}${THEME.iconBgAlpha}`,
                          },
                        ]}
                      >
                        <FontAwesome5
                          name={SECCION_ICON[tipo] as any}
                          size={16}
                          color={color}
                        />
                      </View>

                      <View style={tw`ml-3 flex-1`}>
                        <Text
                          style={tw`text-[15px] text-gray-900 font-extrabold`}
                        >
                          {SECCION_LABEL[tipo]}
                        </Text>
                        <Text
                          style={tw`text-[11px] mt-0.5 text-gray-600 font-semibold`}
                        >
                          {subtitle}
                        </Text>

                        {/* badge */}
                        <View style={tw`mt-1 flex-row items-center`}>
                          <View
                            style={[
                              tw`px-2 py-1 rounded-full`,
                              {
                                backgroundColor: `${color}18`,
                                borderWidth: 1,
                                borderColor: `${color}35`,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                tw`text-[10px] font-extrabold`,
                                { color },
                              ]}
                            >
                              {lista.length} item(s)
                            </Text>
                          </View>

                          {tipo === "DECLARACION" && (
                            <View
                              style={[
                                tw`ml-2 px-2 py-1 rounded-full`,
                                {
                                  backgroundColor: "rgba(17,24,39,0.06)",
                                  borderWidth: 1,
                                  borderColor: "rgba(17,24,39,0.08)",
                                },
                              ]}
                            >
                              <Text
                                style={tw`text-[10px] text-gray-600 font-bold`}
                              >
                                Últimos 6
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>

                    <FontAwesome5
                      name={abierto ? "chevron-up" : "chevron-down"}
                      size={14}
                      color="#9ca3af"
                    />
                  </View>
                </Pressable>

                {abierto && (
                  <View style={tw`mt-3`}>
                    {lista.length === 0 ? (
                      <View
                        style={[
                          tw`mt-1 p-3 rounded-2xl`,
                          {
                            backgroundColor: "rgba(17,24,39,0.03)",
                            borderWidth: 1,
                            borderColor: "rgba(17,24,39,0.06)",
                          },
                        ]}
                      >
                        <Text
                          style={tw`text-[12px] text-gray-600 font-semibold`}
                        >
                          No hay documentos cargados para este tipo.
                        </Text>
                      </View>
                    ) : (
                      lista.map((doc) => {
                        const isOpening = openingId === doc.id;

                        return (
                          <View
                            key={doc.id}
                            style={[
                              tw`flex-row items-center justify-between py-3 border-t`,
                              { borderTopColor: "rgba(17,24,39,0.06)" },
                            ]}
                          >
                            <View style={tw`flex-1 pr-2`}>
                              <Text
                                style={tw`text-[13px] text-gray-900 font-extrabold`}
                              >
                                Periodo {nicePeriodo(doc.periodo)}
                              </Text>

                              {!!doc.nombreOriginal && (
                                <Text
                                  style={tw`text-[10px] mt-0.5 text-gray-600 font-semibold`}
                                  numberOfLines={1}
                                >
                                  {clampText(doc.nombreOriginal, 46)}
                                </Text>
                              )}
                            </View>

                            <Pressable
                              onPress={() => abrirDocumento(doc)}
                              disabled={isOpening}
                              style={({ pressed }) => [
                                tw`px-3 py-2 rounded-2xl flex-row items-center`,
                                {
                                  backgroundColor: pressed
                                    ? "rgba(139,94,60,0.92)"
                                    : "#8b5e3c",
                                  borderWidth: 1,
                                  borderColor: "rgba(255,255,255,0.22)",
                                  opacity: isOpening ? 0.9 : 1,
                                },
                              ]}
                            >
                              {isOpening ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <>
                                  <FontAwesome5
                                    name="file-pdf"
                                    size={14}
                                    color="#fff"
                                  />
                                  <Text
                                    style={tw`ml-2 text-[12px] text-white font-extrabold`}
                                  >
                                    Abrir PDF
                                  </Text>
                                </>
                              )}
                            </Pressable>
                          </View>
                        );
                      })
                    )}
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={tw`flex-1 justify-center items-center px-6 mt-10`}>
              <FontAwesome5 name="folder-open" size={26} color="#9ca3af" />
              <Text style={tw`mt-3 text-gray-900 font-extrabold`}>
                No hay documentos cargados
              </Text>
              <Text
                style={tw`mt-1 text-center text-xs text-gray-600 font-semibold`}
              >
                Cuando tu contador suba PDFs, aparecerán aquí.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
