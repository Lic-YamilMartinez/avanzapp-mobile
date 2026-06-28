// app/reportes/balance.tsx
import { FontAwesome5 } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import tw from "twrnc";
import { useReportes } from "../context/ReportesContext";

/* ===== Tipos mínimos (compras / ventas) ===== */
type DNITBase = {
  id: number;
  tipoComprobante?: string;
  fechaEmision?: string;
  periodoEmision?: string; // mm/yyyy
  periodoMes?: number;
  periodoAnio?: number;
  gravada10?: number | string;
  gravada5?: number | string;
  exenta?: number | string;
  totalComprobante?: number | string;
  noImputar?: boolean;
};

type KPI = {
  ventas: number;
  compras: number;
  neto: number;
  comprobantes: number;
};

/* ===== UI ===== */
const COLORS = { brand: "#facc15", text: "#111827" };

const SHADOW = {
  elevation: 5,
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
};

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

const peso = (n: number) => n.toLocaleString("es-PY");

const toNum = (v: any): number => {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const isNC = (tipo?: string) => {
  const t = (tipo || "").toUpperCase().replace(/\s+/g, "");
  return (
    t.includes("N/CRED") ||
    t.includes("NOTADECREDITO") ||
    t === "NC" ||
    t === "NCR"
  );
};

const montoTotal = (c: DNITBase) => {
  const total = toNum(c.totalComprobante);
  return total !== 0
    ? total
    : toNum(c.gravada10) + toNum(c.gravada5) + toNum(c.exenta);
};

const periodoKey = (c: DNITBase) => {
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

// ✅ Para labels del gráfico: mostramos en millones (evita solaparse)
const abreviarMillones = (n: number) => Math.round(n).toString();

export default function ReportesBalance() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const TOP_PAD = insets.top + 16;

  const { data } = useReportes();

  const [mode, setMode] = useState<"mensual" | "anual">("mensual");

  // filtros
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [showYear, setShowYear] = useState(false);
  const [showMonth, setShowMonth] = useState(false);

  const [loading, setLoading] = useState(true);

  const compras: DNITBase[] = useMemo(
    () => ((data as any)?.compras ?? []).filter((c: DNITBase) => !c.noImputar),
    [data],
  );

  const ventas: DNITBase[] = useMemo(
    () => ((data as any)?.ventas ?? []).filter((v: DNITBase) => !v.noImputar),
    [data],
  );

  // ===== set periodo por defecto (último con datos entre compras+ventas) =====
  useEffect(() => {
    if (!data) {
      setLoading(false);
      return;
    }

    const periodos = Array.from(
      new Set([...compras.map(periodoKey), ...ventas.map(periodoKey)]),
    )
      .filter((p) => p !== "00/0000")
      .sort(sortPeriodos);

    const last = periodos[periodos.length - 1];
    if (last) {
      const [m, y] = last.split("/").map(Number);
      setYear(y);
      setMonth(m);
    }

    setLoading(false);
  }, [data, compras, ventas]);

  // ===== años / meses disponibles =====
  const availableYears = useMemo(() => {
    const ys = new Set<number>();
    [...compras, ...ventas].forEach((c) => {
      const p = periodoKey(c);
      if (p !== "00/0000") ys.add(Number(p.split("/")[1]));
    });
    return Array.from(ys).sort((a, b) => a - b);
  }, [compras, ventas]);

  const availableMonths = useMemo(() => {
    if (!year) return [];
    const ms = new Set<number>();
    [...compras, ...ventas].forEach((c) => {
      const p = periodoKey(c);
      if (p !== "00/0000") {
        const [m, y] = p.split("/").map(Number);
        if (y === year) ms.add(m);
      }
    });
    return Array.from(ms).sort((a, b) => a - b);
  }, [compras, ventas, year]);

  // ===== filtradas mensual =====
  const comprasMensual = useMemo(() => {
    if (!year || !month) return [];
    return compras.filter((c) => {
      const p = periodoKey(c);
      if (p === "00/0000") return false;
      const [m, y] = p.split("/").map(Number);
      return y === year && m === month;
    });
  }, [compras, year, month]);

  const ventasMensual = useMemo(() => {
    if (!year || !month) return [];
    return ventas.filter((c) => {
      const p = periodoKey(c);
      if (p === "00/0000") return false;
      const [m, y] = p.split("/").map(Number);
      return y === year && m === month;
    });
  }, [ventas, year, month]);

  // ===== KPI mensual =====
  const kpiMensual: KPI = useMemo(() => {
    let totalVentas = 0;
    let totalCompras = 0;

    for (const v of ventasMensual) {
      const t = montoTotal(v);
      const abs = Math.abs(t);
      if (isNC(v.tipoComprobante) || t < 0) totalVentas -= abs;
      else totalVentas += abs;
    }

    for (const c of comprasMensual) {
      const t = montoTotal(c);
      const abs = Math.abs(t);
      if (isNC(c.tipoComprobante) || t < 0) totalCompras -= abs;
      else totalCompras += abs;
    }

    const ventasNetas = Math.max(0, totalVentas);
    const comprasNetas = Math.max(0, totalCompras);

    return {
      ventas: ventasNetas,
      compras: comprasNetas,
      neto: ventasNetas - comprasNetas,
      comprobantes: ventasMensual.length + comprasMensual.length,
    };
  }, [ventasMensual, comprasMensual]);

  // ===== anual por mes (detalle + chart en millones) =====
  const anual = useMemo(() => {
    if (!year) {
      return {
        chart: [] as { value: number; label: string }[],
        rows: [] as {
          monthIndex: number;
          label: string;
          ventas: number;
          compras: number;
          neto: number;
          comp: number;
        }[],
        ventasYear: 0,
        comprasYear: 0,
        netoYear: 0,
        comprobantesYear: 0,
        maxAbsM: 0,
      };
    }

    const byMonth = Array.from({ length: 12 }, () => ({ v: 0, c: 0, comp: 0 }));

    // Ventas
    ventas.forEach((item) => {
      const p = periodoKey(item);
      if (p === "00/0000") return;
      const [m, y] = p.split("/").map(Number);
      if (y !== year) return;

      byMonth[m - 1].comp += 1;

      const t = montoTotal(item);
      const abs = Math.abs(t);

      if (isNC(item.tipoComprobante) || t < 0) byMonth[m - 1].v -= abs;
      else byMonth[m - 1].v += abs;
    });

    // Compras
    compras.forEach((item) => {
      const p = periodoKey(item);
      if (p === "00/0000") return;
      const [m, y] = p.split("/").map(Number);
      if (y !== year) return;

      byMonth[m - 1].comp += 1;

      const t = montoTotal(item);
      const abs = Math.abs(t);

      if (isNC(item.tipoComprobante) || t < 0) byMonth[m - 1].c -= abs;
      else byMonth[m - 1].c += abs;
    });

    const fullRows = byMonth.map((m, i) => {
      const ventasNetas = Math.max(0, m.v);
      const comprasNetas = Math.max(0, m.c);
      const neto = ventasNetas - comprasNetas;

      return {
        monthIndex: i + 1,
        label: monthNames[i],
        ventas: ventasNetas,
        compras: comprasNetas,
        neto,
        comp: m.comp,
      };
    });

    // recorta hasta último mes con movimiento
    let lastIndex = -1;
    fullRows.forEach((r, i) => {
      if (r.ventas > 0 || r.compras > 0 || r.neto !== 0) lastIndex = i;
    });
    const rows = lastIndex >= 0 ? fullRows.slice(0, lastIndex + 1) : [];

    const ventasYear = rows.reduce((s, r) => s + r.ventas, 0);
    const comprasYear = rows.reduce((s, r) => s + r.compras, 0);
    const netoYear = ventasYear - comprasYear;
    const comprobantesYear = rows.reduce((s, r) => s + r.comp, 0);

    // chart Neto en millones
    const chart = rows.map((r) => ({
      label: r.label,
      value: r.neto / 1_000_000,
    }));

    const maxAbsM = chart.reduce(
      (mx, d) => (Math.abs(d.value) > mx ? Math.abs(d.value) : mx),
      0,
    );

    return {
      chart,
      rows,
      ventasYear,
      comprasYear,
      netoYear,
      comprobantesYear,
      maxAbsM,
    };
  }, [compras, ventas, year]);

  const chartMaxValue = useMemo(() => {
    if (!anual.maxAbsM || anual.maxAbsM <= 0) return undefined;
    return anual.maxAbsM * 1.3;
  }, [anual.maxAbsM]);

  const anualLineData = useMemo(() => {
    return (anual.chart || []).map((d, index) => {
      const hasValue = d.value !== 0;
      const montoTexto = hasValue ? abreviarMillones(d.value) : "";

      const next = anual.chart[index + 1];
      let textShiftY = -8;
      if (next && next.value > d.value) textShiftY = 14;
      else if (next && next.value < d.value) textShiftY = -8;

      return {
        value: d.value,
        label: d.label,
        dataPointText: montoTexto,
        textFontSize: 9,
        textColor: "#111827",
        textShiftY,
        textShiftX: -10,
        showVerticalLine: true,
        verticalLineUptoDataPoint: true,
        verticalLineColor: "#e5e7eb",
        verticalLineThickness: 1,
      };
    });
  }, [anual.chart]);

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-100`} edges={["bottom"]}>
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={tw`mt-2 text-gray-600`}>Cargando balance…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!compras.length && !ventas.length) {
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
          <View style={[tw`bg-white rounded-2xl p-4`, SHADOW]}>
            <Text style={tw`text-xl font-extrabold mb-2`}>
              Balance Compras vs Ventas
            </Text>
            <Text style={tw`text-sm text-gray-600`}>
              No encontramos compras ni ventas cargadas. Volvé a{" "}
              <Text
                style={tw`text-blue-600 underline`}
                onPress={() => router.replace("/reportes" as Href)}
              >
                Informes
              </Text>{" "}
              para refrescar los datos.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`} edges={["bottom"]}>
      {/* Barra superior */}
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
        {/* Intro */}
        <View style={[tw`bg-white rounded-2xl p-4 mb-3`, SHADOW]}>
          <Text style={tw`text-base text-gray-800`}>
            Cruzamos tus <Text style={tw`font-semibold`}>VENTAS</Text> vs{" "}
            <Text style={tw`font-semibold`}>COMPRAS</Text>. Neto = ventas -
            compras.
          </Text>
        </View>

        {/* Segment control */}
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

        {/* ======= MENSUAL (SIN GRAFICO) ======= */}
        {mode === "mensual" && (
          <>
            {/* Filtros */}
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

            {/* KPIs */}
            <View style={tw`flex-row flex-wrap -mx-1 mt-3`}>
              <KpiCard
                title="Ventas"
                value={kpiMensual.ventas}
                style="bg-green-100"
              />
              <KpiCard
                title="Compras"
                value={kpiMensual.compras}
                style="bg-red-100"
              />
              <KpiCard
                title="Neto (V - C)"
                value={kpiMensual.neto}
                style={kpiMensual.neto >= 0 ? "bg-blue-100" : "bg-yellow-100"}
              />
              <KpiCard
                title="Comprobantes"
                value={kpiMensual.comprobantes}
                style="bg-gray-100"
              />
            </View>

            {/* Tabla mensual */}
            <View style={[tw`bg-white rounded-2xl p-4 mt-2`, SHADOW]}>
              <Text style={tw`text-base font-bold mb-3`}>
                Versus del mes • {month ? monthNames[month - 1] : "—"}{" "}
                {year ?? ""}
              </Text>

              {!year || !month ? (
                <Text style={tw`text-xs text-gray-500`}>
                  Elegí año y mes para ver el versus.
                </Text>
              ) : (
                <>
                  <View style={tw`flex-row pb-2 border-b border-gray-200`}>
                    <Text
                      style={tw`flex-1 text-[11px] text-gray-500 font-semibold`}
                    >
                      Mes
                    </Text>
                    <Text
                      style={tw`flex-1 text-[11px] text-gray-500 font-semibold text-right`}
                    >
                      Ventas
                    </Text>
                    <Text
                      style={tw`flex-1 text-[11px] text-gray-500 font-semibold text-right`}
                    >
                      Compras
                    </Text>
                    <Text
                      style={tw`flex-1 text-[11px] text-gray-500 font-semibold text-right`}
                    >
                      Neto
                    </Text>
                  </View>

                  <View style={tw`flex-row pt-3`}>
                    <Text
                      style={tw`flex-1 text-[12px] text-gray-800 font-semibold`}
                    >
                      {monthNames[month - 1]}
                    </Text>
                    <Text
                      style={tw`flex-1 text-[12px] text-gray-900 text-right`}
                    >
                      {peso(Math.round(kpiMensual.ventas))}
                    </Text>
                    <Text
                      style={tw`flex-1 text-[12px] text-gray-900 text-right`}
                    >
                      {peso(Math.round(kpiMensual.compras))}
                    </Text>
                    <Text
                      style={tw.style(
                        "flex-1 text-[12px] text-right font-extrabold",
                        kpiMensual.neto >= 0
                          ? "text-green-700"
                          : "text-red-600",
                      )}
                    >
                      {peso(Math.round(kpiMensual.neto))}
                    </Text>
                  </View>

                  <Text style={tw`text-[10px] text-gray-400 mt-2`}>
                    Comprobantes del mes: {kpiMensual.comprobantes}
                  </Text>
                </>
              )}
            </View>
          </>
        )}

        {/* ======= ANUAL (CON GRAFICO) ======= */}
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
                  title="Ventas año"
                  value={anual.ventasYear}
                  style="bg-green-100"
                />
                <KpiCard
                  title="Compras año"
                  value={anual.comprasYear}
                  style="bg-red-100"
                />
                <KpiCard
                  title="Neto año"
                  value={anual.netoYear}
                  style={anual.netoYear >= 0 ? "bg-blue-100" : "bg-yellow-100"}
                />
                <KpiCard
                  title="Comprobantes año"
                  value={anual.comprobantesYear}
                  style="bg-gray-100"
                />
              </View>
            )}

            {/* Chart Neto en millones */}
            <View style={[tw`bg-white rounded-2xl p-4`, SHADOW]}>
              <Text style={tw`text-base font-bold mb-3`}>
                Neto (ventas - compras) por mes • {year ?? "—"}
              </Text>

              {!year ? (
                <Text style={tw`text-xs text-gray-500`}>
                  Elegí un año para ver el análisis anual.
                </Text>
              ) : anualLineData.length === 0 ? (
                <Text style={tw`text-xs text-gray-500`}>
                  No hay datos para este año.
                </Text>
              ) : (
                <LineChart
                  data={anualLineData}
                  height={260}
                  thickness={3}
                  color={COLORS.brand}
                  dataPointsColor="#0f766e"
                  dataPointsRadius={5}
                  curved={false}
                  hideRules
                  hideYAxisText
                  yAxisColor="#e5e7eb"
                  xAxisColor="#e5e7eb"
                  initialSpacing={22}
                  spacing={34}
                  showValuesAsDataPointsText
                  textFontSize={9}
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

              {year ? (
                <>
                  <Text style={tw`text-xs text-gray-500 mt-2`}>
                    Neto total del año:{" "}
                    <Text style={tw`font-semibold`}>
                      {peso(Math.round(anual.netoYear))}
                    </Text>
                  </Text>
                  <Text style={tw`text-[10px] text-gray-400 mt-1`}>
                    * Los números del gráfico están en millones (ej: 14 =
                    14.000.000)
                  </Text>
                </>
              ) : null}
            </View>

            {/* Tabla anual: versus mes a mes */}
            <View style={[tw`bg-white rounded-2xl p-4 mt-4`, SHADOW]}>
              <Text style={tw`text-base font-bold mb-3`}>
                Versus mes a mes • {year ?? "—"}
              </Text>

              {!year ? (
                <Text style={tw`text-xs text-gray-500`}>
                  Elegí un año para ver el versus mensual.
                </Text>
              ) : anual.rows.length === 0 ? (
                <Text style={tw`text-xs text-gray-500`}>
                  Sin movimientos para este año.
                </Text>
              ) : (
                <>
                  <View style={tw`flex-row pb-2 border-b border-gray-200`}>
                    <Text
                      style={tw`w-12 text-[11px] text-gray-500 font-semibold`}
                    >
                      Mes
                    </Text>
                    <Text
                      style={tw`flex-1 text-[11px] text-gray-500 font-semibold text-right`}
                    >
                      Ventas
                    </Text>
                    <Text
                      style={tw`flex-1 text-[11px] text-gray-500 font-semibold text-right`}
                    >
                      Compras
                    </Text>
                    <Text
                      style={tw`flex-1 text-[11px] text-gray-500 font-semibold text-right`}
                    >
                      Neto
                    </Text>
                  </View>

                  {anual.rows.map((r, idx) => (
                    <View
                      key={`${r.monthIndex}-${idx}`}
                      style={tw.style(
                        "flex-row py-2",
                        idx !== 0 ? "border-t border-gray-100" : "",
                      )}
                    >
                      <Text
                        style={tw`w-12 text-[12px] text-gray-800 font-semibold`}
                      >
                        {r.label}
                      </Text>

                      <Text
                        style={tw`flex-1 text-[12px] text-gray-900 text-right`}
                      >
                        {peso(Math.round(r.ventas))}
                      </Text>

                      <Text
                        style={tw`flex-1 text-[12px] text-gray-900 text-right`}
                      >
                        {peso(Math.round(r.compras))}
                      </Text>

                      <Text
                        style={tw.style(
                          "flex-1 text-[12px] text-right font-extrabold",
                          r.neto >= 0 ? "text-green-700" : "text-red-600",
                        )}
                      >
                        {peso(Math.round(r.neto))}
                      </Text>
                    </View>
                  ))}

                  <Text style={tw`text-[10px] text-gray-400 mt-2`}>
                    * Neto = Ventas - Compras.
                  </Text>
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ===== UI helpers ===== */
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
