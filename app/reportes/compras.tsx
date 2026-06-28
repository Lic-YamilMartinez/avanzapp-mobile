// app/reportes/compras.tsx
import { FontAwesome5 } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import tw from "twrnc";
import { useReportes } from "../context/ReportesContext";

/* ===== Tipos backend ===== */
type DNITCompra = {
  id: number;
  usuarioId?: number;
  proveedorRuc?: string;
  proveedorNombre?: string;
  nroComprobante?: string;
  tipoComprobante?: string;
  condicionOperacion?: string;
  fechaEmision?: string;
  periodoEmision?: string; // mm/yyyy
  periodoMes?: number;
  periodoAnio?: number;

  gravada10?: number | string;
  gravada5?: number | string;
  iva10?: number | string;
  iva5?: number | string;
  exenta?: number | string;
  totalComprobante?: number | string;
  baseImponible?: number | string;

  afectacionExento?: string;
  afectacionGrav10?: string;
  afectacionGrav5?: string;

  concepto?: string;
  noImputar?: boolean;
};

type KPI = {
  ncCompras: number;
  egresos: number;
  balance: number;
  comprobantes: number;
};

/* ===== UI / helpers ===== */
const COLORS = { brand: "#facc15", text: "#111827" };
const PIE_PALETTE = [
  "#16a34a",
  "#06b6d4",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#3b82f6",
  "#f97316",
];
const monthNames = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const SHADOW = {
  elevation: 5,
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
};

const formatoCompactoDesdeMillones = (m: number) => {
  if (!Number.isFinite(m) || m <= 0) return "";

  if (m < 1) {
    const miles = Math.round(m * 1000);
    return `${miles}K`;
  }

  const redondeado1Decimal = Math.round(m * 10) / 10;
  const entero = Math.round(redondeado1Decimal);

  if (Math.abs(redondeado1Decimal - entero) < 0.05) {
    return `${entero}M`;
  }

  return `${redondeado1Decimal.toFixed(1)}M`;
};

const peso = (n: number) => n.toLocaleString("es-PY");
const trim = (s: string, max = 18) =>
  s.length > max ? s.slice(0, max - 1) + "…" : s;

const toNum = (v: any): number => {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const isNC = (c: DNITCompra) => {
  const t = (c.tipoComprobante || "").toUpperCase().replace(/\s+/g, "");
  return (
    t.includes("N/CRED") ||
    t.includes("NOTADECREDITO") ||
    t === "NC" ||
    t === "NCR"
  );
};

const montoTotal = (c: DNITCompra) => {
  const total = toNum(c.totalComprobante);
  return total !== 0
    ? total
    : toNum(c.gravada10) + toNum(c.gravada5) + toNum(c.exenta);
};

const periodoKey = (c: DNITCompra) => {
  if (c.periodoEmision && /^\d{2}\/\d{4}$/.test(c.periodoEmision))
    return c.periodoEmision;

  if (Number.isFinite(c.periodoMes) && Number.isFinite(c.periodoAnio)) {
    const mm = String(c.periodoMes).padStart(2, "0");
    return `${mm}/${c.periodoAnio}`;
  }

  if (c.fechaEmision) {
    const d = new Date(c.fechaEmision);
    if (!isNaN(d.getTime())) {
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      return `${mm}/${d.getFullYear()}`;
    }
  }

  return "00/0000";
};

const sortPeriodos = (a: string, b: string) => {
  const [ma, ya] = a.split("/").map(Number);
  const [mb, yb] = b.split("/").map(Number);
  return ya === yb ? ma - mb : ya - yb;
};

const categoriaDesdeAfectacion = (c: DNITCompra): string => {
  const a10 = (c.afectacionGrav10 || "").trim();
  const a5 = (c.afectacionGrav5 || "").trim();
  const ex = (c.afectacionExento || "").trim();
  return a10 || a5 || ex || "Sin categoría";
};

/* ===== Pantalla ===== */
export default function ReportesCompras() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const TOP_PAD = insets.top + 16;

  const { data } = useReportes();

  const compras: DNITCompra[] = useMemo(
    () => (data?.compras ?? []).filter((c: DNITCompra) => !c.noImputar),
    [data],
  );

  const [mode, setMode] = useState<"mensual" | "anual">("mensual");

  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [showYear, setShowYear] = useState(false);
  const [showMonth, setShowMonth] = useState(false);

  const WHATSAPP = "595972151409";

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const availableYears = useMemo(() => {
    const ys = new Set<number>();
    compras.forEach((c) => {
      const p = periodoKey(c);
      if (p !== "00/0000") ys.add(Number(p.split("/")[1]));
    });
    return Array.from(ys).sort((a, b) => a - b);
  }, [compras]);

  const availableMonths = useMemo(() => {
    if (!year) return [];
    const ms = new Set<number>();

    compras.forEach((c) => {
      const p = periodoKey(c);
      if (p !== "00/0000") {
        const [m, y] = p.split("/").map(Number);
        if (y === year) ms.add(m);
      }
    });

    return Array.from(ms).sort((a, b) => a - b);
  }, [compras, year]);

  useEffect(() => {
    if (!year && !month && compras.length > 0) {
      const periodos = Array.from(new Set(compras.map((c) => periodoKey(c))))
        .filter((p) => p !== "00/0000")
        .sort(sortPeriodos);

      const last = periodos[periodos.length - 1];
      if (last) {
        const [m, y] = last.split("/").map(Number);
        setYear(y);
        setMonth(m);
      }
    }
  }, [compras, year, month]);

  /* ===== filtradas (mensual) ===== */
  const filtradas = useMemo(() => {
    if (!year || !month) return [];

    return compras.filter((c) => {
      const p = periodoKey(c);
      if (p === "00/0000") return false;
      const [m, y] = p.split("/").map(Number);
      return y === year && m === month;
    });
  }, [compras, year, month]);

  /* ===== KPIs + categorías por afectación (mensual) ===== */
  const { kpiMensual, categoriasAfectacion } = useMemo(() => {
    let ncCompras = 0;
    let egresos = 0;
    const catMap = new Map<string, number>();

    for (const c of filtradas) {
      const total = montoTotal(c);
      const abs = Math.abs(total);

      if (isNC(c) || total < 0) {
        ncCompras += abs;
        egresos -= abs;
      } else {
        egresos += abs;
        const cat = categoriaDesdeAfectacion(c);
        catMap.set(cat, (catMap.get(cat) || 0) + abs);
      }
    }

    const egresosNetos = Math.max(0, egresos);

    const categorias = Array.from(catMap.entries())
      .map(([x, y]) => ({ x, y }))
      .sort((a, b) => b.y - a.y);

    return {
      kpiMensual: {
        ncCompras,
        egresos: egresosNetos,
        balance: -egresosNetos + ncCompras,
        comprobantes: filtradas.length,
      } as KPI,
      categoriasAfectacion: categorias,
    };
  }, [filtradas]);

  const totalCategorias = useMemo(
    () => categoriasAfectacion.reduce((s, t) => s + Number(t.y), 0),
    [categoriasAfectacion],
  );

  useEffect(() => {
    if (categoriasAfectacion.length > 0) setSelectedIndex(0);
    else setSelectedIndex(null);
  }, [categoriasAfectacion]);

  /* ===== Top proveedores mensual ===== */
  const topProveedoresMensual = useMemo(() => {
    if (!year || !month) return [] as { nombre: string; monto: number }[];

    const map = new Map<string, number>();

    filtradas.forEach((c) => {
      const total = montoTotal(c);
      if (isNC(c) || total < 0) return;

      const clave = (
        c.proveedorNombre ||
        c.proveedorRuc ||
        "Sin proveedor"
      ).trim();

      map.set(clave, (map.get(clave) || 0) + Math.abs(total));
    });

    return Array.from(map.entries())
      .map(([nombre, monto]) => ({ nombre, monto }))
      .sort((a, b) => b.monto - a.monto);
  }, [filtradas, year, month]);

  const totalProveedoresMontoMensual = useMemo(
    () => topProveedoresMensual.reduce((s, p) => s + p.monto, 0),
    [topProveedoresMensual],
  );

  /* ===== Agregados anuales ===== */
  const anual = useMemo(() => {
    if (!year) {
      return {
        data: [] as { value: number; label: string }[],
        egresosYear: 0,
        comprobantesYear: 0,
        maxValue: 0,
      };
    }

    const byMonth = Array.from({ length: 12 }, () => ({ egr: 0 }));
    let comprobantesYear = 0;

    compras.forEach((c) => {
      const p = periodoKey(c);
      if (p === "00/0000") return;

      const [m, y] = p.split("/").map(Number);
      if (y !== year) return;

      comprobantesYear++;

      const total = montoTotal(c);
      const abs = Math.abs(total);

      if (!isNC(c) && total > 0) {
        byMonth[m - 1].egr += abs;
      }
    });

    const fullData = byMonth.map((m, i) => ({
      label: monthNames[i],
      value: Math.round((Math.max(0, m.egr) / 1_000_000) * 10) / 10,
    }));

    let lastIndex = -1;
    fullData.forEach((d, i) => {
      if (d.value > 0) lastIndex = i;
    });

    const trimmedData = lastIndex >= 0 ? fullData.slice(0, lastIndex + 1) : [];
    const egresosYear = byMonth.reduce((s, m) => s + Math.max(0, m.egr), 0);
    const maxValue = fullData.reduce(
      (max, d) => (d.value > max ? d.value : max),
      0,
    );

    return { data: trimmedData, egresosYear, comprobantesYear, maxValue };
  }, [compras, year]);

  const chartMaxValue = useMemo(
    () => (anual.maxValue > 0 ? anual.maxValue * 1.3 : undefined),
    [anual.maxValue],
  );

  const anualLineData = useMemo(
    () =>
      anual.data.map((d, index) => {
        const hasValue = d.value > 0;
        const montoTexto = hasValue
          ? formatoCompactoDesdeMillones(d.value)
          : "";

        const prev = anual.data[index - 1];
        const next = anual.data[index + 1];

        let textShiftY = -8;

        if (prev && next) {
          if (d.value <= prev.value && d.value <= next.value) {
            textShiftY = -14;
          } else if (d.value >= prev.value && d.value >= next.value) {
            textShiftY = 14;
          }
        } else if (next && next.value > d.value) {
          textShiftY = 14;
        } else if (next && next.value < d.value) {
          textShiftY = -8;
        }

        return {
          value: d.value,
          label: d.label,
          dataPointText: montoTexto,
          textFontSize: 10,
          textColor: "#111827",
          textShiftY,
          textShiftX: -8,
          showVerticalLine: true,
          verticalLineUptoDataPoint: true,
          verticalLineColor: "#e5e7eb",
          verticalLineThickness: 1,
        };
      }),
    [anual.data],
  );

  /* ===== Top proveedores (anual) ===== */
  const topProveedores = useMemo(() => {
    if (!year) return [] as { nombre: string; monto: number }[];

    const map = new Map<string, number>();

    compras.forEach((c) => {
      const p = periodoKey(c);
      if (p === "00/0000") return;

      const [, y] = p.split("/").map(Number);
      if (y !== year) return;

      const total = montoTotal(c);
      if (isNC(c) || total < 0) return;

      const clave = (
        c.proveedorNombre ||
        c.proveedorRuc ||
        "Sin proveedor"
      ).trim();

      map.set(clave, (map.get(clave) || 0) + Math.abs(total));
    });

    return Array.from(map.entries())
      .map(([nombre, monto]) => ({ nombre, monto }))
      .sort((a, b) => b.monto - a.monto);
  }, [compras, year]);

  const totalProveedoresMonto = useMemo(
    () => topProveedores.reduce((s, p) => s + p.monto, 0),
    [topProveedores],
  );

  const fullName = "Cliente";

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`} edges={["bottom"]}>
      <View
        style={[
          tw`px-4 pt-3 pb-2 flex-row justify-between`,
          { paddingTop: TOP_PAD },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={[
            tw`px-4 py-2 rounded-xl bg-white flex-row items-center`,
            SHADOW,
          ]}
        >
          <FontAwesome5 name="arrow-left" size={14} color="#374151" />
          <Text style={tw`ml-2 text-sm font-semibold text-gray-700`}>
            Atrás
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace("/dashboard" as Href)}
          style={[
            tw`px-4 py-2 rounded-xl bg-white flex-row items-center`,
            SHADOW,
          ]}
        >
          <FontAwesome5 name="home" size={14} color="#374151" />
          <Text style={tw`ml-2 text-sm font-semibold text-gray-700`}>
            Inicio
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={tw`px-4 pb-6`}>
        <View style={[tw`bg-white rounded-2xl p-4 mb-3`, SHADOW]}>
          <Text style={tw`text-base text-gray-800`}>
            <Text style={tw`font-bold`}>{fullName}</Text>, acá ves un análisis
            de tus <Text style={tw`font-semibold`}>COMPRAS</Text> declaradas en
            tu DNIT. Usá los filtros para ver un mes puntual o el resumen anual.
            ¿Dudas?{" "}
            <Text
              style={tw`text-blue-600 underline`}
              onPress={() => Linking.openURL(`https://wa.me/${WHATSAPP}`)}
            >
              contactá con Javier Contrera (WhatsApp)
            </Text>
            .
          </Text>

          {compras.length === 0 && (
            <Text style={tw`mt-2 text-xs text-red-500`}>
              ⚠️ No encontramos compras en memoria. Volvé a la pantalla
              principal de Reportes para recargar los datos.
            </Text>
          )}
        </View>

        <View style={[tw`bg-white rounded-xl p-1 mb-3 flex-row`, SHADOW]}>
          <Segment
            label="Mensual"
            active={mode === "mensual"}
            onPress={() => setMode("mensual")}
          />
          <Segment
            label="Anual"
            active={mode === "anual"}
            onPress={() => setMode("anual")}
          />
        </View>

        {mode === "mensual" && (
          <>
            <View style={tw`flex-row`}>
              <Select
                label="Año"
                value={year ? String(year) : "—"}
                open={showYear}
                onToggle={() => {
                  setShowYear((v) => !v);
                  setShowMonth(false);
                }}
                options={availableYears.map((y) => ({
                  key: String(y),
                  label: String(y),
                  onPress: () => {
                    setYear(y);
                    setShowYear(false);
                    if (!availableMonths.includes(month || -1)) setMonth(null);
                  },
                }))}
              />
              <View style={tw`w-3`} />
              <Select
                label="Mes"
                value={month ? monthNames[month - 1] : "—"}
                open={showMonth}
                onToggle={() => {
                  setShowMonth((v) => !v);
                  setShowYear(false);
                }}
                options={availableMonths.map((m) => ({
                  key: String(m),
                  label: `${monthNames[m - 1]} (${String(m).padStart(2, "0")})`,
                  onPress: () => {
                    setMonth(m);
                    setShowMonth(false);
                  },
                }))}
                disabled={!year}
              />
            </View>

            <View style={tw`flex-row flex-wrap -mx-1 mt-3`}>
              <KpiCard
                title="Egresos (Compras)"
                value={kpiMensual.egresos}
                style="bg-red-100"
              />
              <KpiCard
                title="Comprobantes"
                value={kpiMensual.comprobantes}
                style="bg-blue-100"
              />
            </View>

            <View style={[tw`bg-white rounded-2xl p-4 mt-4`, SHADOW]}>
              <Text style={tw`text-base font-bold mb-3`}>
                ¿En qué estás gastando más? •{" "}
                {month ? monthNames[month - 1] : ""} {year ?? ""}
              </Text>

              {categoriasAfectacion.length === 0 ? (
                <Text style={tw`text-xs text-gray-500`}>
                  Sin datos de compras para este período.
                </Text>
              ) : (
                <View style={tw`max-h-64`}>
                  <ScrollView nestedScrollEnabled>
                    {(() => {
                      const total = totalCategorias || 1;
                      return categoriasAfectacion.map((d, i) => {
                        const monto = Number(d.y);
                        const pct = Math.round((monto * 100) / total);
                        const selected = selectedIndex === i;

                        return (
                          <Pressable
                            key={`${d.x}-${i}`}
                            onPress={() => setSelectedIndex(i)}
                            style={tw.style(
                              "flex-row items-center mb-1 px-2 py-1 rounded-lg",
                              selected ? "bg-yellow-50" : "",
                            )}
                          >
                            <View
                              style={[
                                tw`w-3 h-3 rounded-full mr-2`,
                                {
                                  backgroundColor:
                                    PIE_PALETTE[i % PIE_PALETTE.length],
                                },
                              ]}
                            />
                            <Text
                              style={tw.style(
                                "flex-1 text-[12px] text-gray-800",
                                selected ? "font-semibold" : "",
                              )}
                            >
                              {trim(d.x, 28)}
                            </Text>
                            <Text style={tw`text-[12px] text-gray-500 mr-2`}>
                              {pct}%
                            </Text>
                            <Text
                              style={tw.style(
                                "text-[12px]",
                                selected ? "font-extrabold" : "font-semibold",
                              )}
                            >
                              {peso(Math.round(monto))}
                            </Text>
                          </Pressable>
                        );
                      });
                    })()}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={[tw`bg-white rounded-2xl p-4 mt-4`, SHADOW]}>
              <Text style={tw`text-base font-bold mb-3`}>
                Top proveedores • {month ? monthNames[month - 1] : ""}{" "}
                {year ?? ""}
              </Text>

              {!year || !month ? (
                <Text style={tw`text-xs text-gray-500`}>
                  Elegí año y mes para ver los principales proveedores.
                </Text>
              ) : topProveedoresMensual.length === 0 ? (
                <Text style={tw`text-xs text-gray-500`}>
                  No hay compras registradas para este período.
                </Text>
              ) : (
                <View style={tw`max-h-64`}>
                  <ScrollView nestedScrollEnabled>
                    {topProveedoresMensual.map((p, i) => {
                      const pct = totalProveedoresMontoMensual
                        ? Math.round(
                            (p.monto * 100) / totalProveedoresMontoMensual,
                          )
                        : 0;

                      return (
                        <View
                          key={`${p.nombre}-${i}`}
                          style={tw`flex-row items-center mb-1`}
                        >
                          <View
                            style={[
                              tw`w-3 h-3 rounded-full mr-2`,
                              {
                                backgroundColor:
                                  PIE_PALETTE[i % PIE_PALETTE.length],
                              },
                            ]}
                          />
                          <Text style={tw`flex-1 text-[12px] text-gray-800`}>
                            {trim(p.nombre, 28)}
                          </Text>
                          <Text style={tw`text-[12px] text-gray-500 mr-2`}>
                            {pct}%
                          </Text>
                          <Text style={tw`text-[12px] font-semibold`}>
                            {peso(Math.round(p.monto))}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          </>
        )}

        {mode === "anual" && (
          <>
            <View style={tw`flex-row`}>
              <Select
                label="Año"
                value={year ? String(year) : "—"}
                open={showYear}
                onToggle={() => {
                  setShowYear((v) => !v);
                  setShowMonth(false);
                }}
                options={availableYears.map((y) => ({
                  key: String(y),
                  label: String(y),
                  onPress: () => {
                    setYear(y);
                    setShowYear(false);
                  },
                }))}
              />
            </View>

            {year && (
              <View style={tw`flex-row flex-wrap -mx-1 mt-3 mb-1`}>
                <KpiCard
                  title="Egresos (Compras año)"
                  value={anual.egresosYear}
                  style="bg-red-100"
                />
                <KpiCard
                  title="Comprobantes del año"
                  value={anual.comprobantesYear}
                  style="bg-blue-100"
                />
              </View>
            )}

            <View style={[tw`bg-white rounded-2xl p-4`, SHADOW]}>
              <Text style={tw`text-base font-bold mb-3`}>
                Egresos (compras) por mes • {year ?? "—"}
              </Text>

              {!year ? (
                <Text style={tw`text-xs text-gray-500`}>
                  Elegí un año para ver el análisis anual.
                </Text>
              ) : anualLineData.length === 0 ? (
                <Text style={tw`text-xs text-gray-500`}>
                  No hay datos de compras para este año.
                </Text>
              ) : (
                <LineChart
                  data={anualLineData}
                  height={260}
                  thickness={3}
                  color={COLORS.brand}
                  dataPointsColor="#0f766e"
                  dataPointsRadius={4}
                  curved={false}
                  hideRules
                  hideYAxisText
                  yAxisColor="#e5e7eb"
                  xAxisColor="#e5e7eb"
                  initialSpacing={22}
                  spacing={34}
                  textFontSize={10}
                  textColor="#111827"
                  xAxisTextNumberOfLines={1}
                  xAxisLabelTextStyle={{ fontSize: 9 }}
                  xAxisLabelsVerticalShift={6}
                  adjustToWidth
                  xAxisThickness={0.5}
                  maxValue={chartMaxValue}
                  yAxisExtraHeight={26}
                  showFractionalValues={false}
                  roundToDigits={0}
                />
              )}

              <Text style={tw`text-xs text-gray-500 mt-2`}>
                Total egresos (compras) del año:{" "}
                <Text style={tw`font-semibold`}>
                  {peso(Math.round(anual.egresosYear))}
                </Text>
              </Text>

              <Text style={tw`text-[10px] text-gray-400 mt-1`}>
                * En el gráfico los valores están en millones. Ejemplo: 14 =
                14M, 0.8 = 800K, 14.4 = 14.4M.
              </Text>
            </View>

            <View style={[tw`bg-white rounded-2xl p-4 mt-4`, SHADOW]}>
              <Text style={tw`text-base font-bold mb-3`}>
                Top proveedores • {year ?? "—"}
              </Text>

              {!year ? (
                <Text style={tw`text-xs text-gray-500`}>
                  Elegí un año para ver los proveedores principales.
                </Text>
              ) : topProveedores.length === 0 ? (
                <Text style={tw`text-xs text-gray-500`}>
                  No hay compras registradas para este año.
                </Text>
              ) : (
                <View style={tw`max-h-64`}>
                  <ScrollView nestedScrollEnabled>
                    {topProveedores.map((p, i) => {
                      const pct = totalProveedoresMonto
                        ? Math.round((p.monto * 100) / totalProveedoresMonto)
                        : 0;

                      return (
                        <View
                          key={`${p.nombre}-${i}`}
                          style={tw`flex-row items-center mb-1`}
                        >
                          <View
                            style={[
                              tw`w-3 h-3 rounded-full mr-2`,
                              {
                                backgroundColor:
                                  PIE_PALETTE[i % PIE_PALETTE.length],
                              },
                            ]}
                          />
                          <Text style={tw`flex-1 text-[12px] text-gray-800`}>
                            {trim(p.nombre, 28)}
                          </Text>
                          <Text style={tw`text-[12px] text-gray-500 mr-2`}>
                            {pct}%
                          </Text>
                          <Text style={tw`text-[12px] font-semibold`}>
                            {peso(Math.round(p.monto))}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ====== UI helpers ====== */
function KpiCard({
  title,
  value,
  style,
}: {
  title: string;
  value: number | string;
  style?: string;
}) {
  return (
    <View style={tw`w-1/2 px-1 mb-2`}>
      <View style={tw`${style ?? "bg-gray-100"} rounded-2xl p-4`}>
        <Text style={tw`text-xs text-gray-600`}>{title}</Text>
        <Text style={tw`text-xl font-bold`}>
          {typeof value === "number" ? value.toLocaleString("es-PY") : value}
        </Text>
      </View>
    </View>
  );
}

function Segment({
  label,
  active,
  onPress,
  small,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  small?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        tw`flex-1 py-2 rounded-lg items-center`,
        active ? tw`bg-yellow-400` : tw`bg-transparent`,
      ]}
    >
      <Text style={[tw`font-semibold`, small ? tw`text-xs` : tw`text-sm`]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Select({
  label,
  value,
  options,
  open,
  onToggle,
  disabled,
}: {
  label: string;
  value: string;
  options: { key: string; label: string; onPress: () => void }[];
  open: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={tw`flex-1`}>
      <Text style={tw`text-[11px] text-gray-500 mb-1`}>{label}</Text>

      <Pressable
        onPress={onToggle}
        disabled={disabled}
        style={tw.style(
          "bg-white rounded-xl px-3 py-3 border border-gray-200",
          disabled ? "opacity-50" : "",
        )}
      >
        <Text style={tw`text-[13px] text-gray-800`}>{value}</Text>
      </Pressable>

      {open && (
        <View
          style={tw`absolute z-10 left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 p-2`}
        >
          {options.map((opt) => (
            <Pressable
              key={opt.key}
              onPress={opt.onPress}
              style={tw`px-2 py-2 rounded-lg active:bg-gray-100`}
            >
              <Text style={tw`text-[13px]`}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
