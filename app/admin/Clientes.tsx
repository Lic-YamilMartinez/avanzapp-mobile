// app/admin/Clientes.tsx
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import fondo from "../../assets/bg-contabilidad.png";
import { BASE_URL } from "../config/config";

type Cliente = {
  id: number;
  nombre: string;
  apellido?: string;
  email?: string;
  rucEmpresa?: string;
};

// ✅ Agregamos DECLARACION_JURADA
type TipoPdf =
  | "CUMPLIMIENTO_TRIBUTARIO"
  | "CONSTANCIA_RUC"
  | "CEDULA_TRIBUTARIA"
  | "DECLARACION_JURADA";

const TIPOS_PDF: { label: string; value: TipoPdf }[] = [
  { label: "Cumplimiento Tributario", value: "CUMPLIMIENTO_TRIBUTARIO" },
  { label: "Constancia RUC", value: "CONSTANCIA_RUC" },
  { label: "Cédula Tributaria", value: "CEDULA_TRIBUTARIA" },
  { label: "Declaración Jurada", value: "DECLARACION_JURADA" }, // ✅ NUEVO
];

function pad2(n: string) {
  const t = (n || "").trim();
  if (!t) return "";
  return t.length === 1 ? `0${t}` : t;
}

function isValidPeriodo(yyyy: string, mm: string) {
  const y = Number(yyyy);
  const m = Number(mm);
  return (
    Number.isInteger(y) &&
    y >= 2000 &&
    y <= 2100 &&
    Number.isInteger(m) &&
    m >= 1 &&
    m <= 12
  );
}

export default function Clientes() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);

  const [uploadingComprasId, setUploadingComprasId] = useState<number | null>(
    null,
  );
  const [uploadingVentasId, setUploadingVentasId] = useState<number | null>(
    null,
  );

  // === PDF modal states ===
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [pdfCliente, setPdfCliente] = useState<Cliente | null>(null);
  const [pdfTipo, setPdfTipo] = useState<TipoPdf>("CUMPLIMIENTO_TRIBUTARIO");
  const [pdfMes, setPdfMes] = useState<string>(""); // 1..12
  const [pdfAnio, setPdfAnio] = useState<string>(""); // 2025
  const [pdfFile, setPdfFile] = useState<{
    uri: string;
    name?: string;
    mimeType?: string;
  } | null>(null);
  const [uploadingPdfId, setUploadingPdfId] = useState<number | null>(null);

  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // ==============================
  // Cargar clientes
  // ==============================
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem("token");

        const response = await fetch(`${BASE_URL}/usuarios/clientes`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) throw new Error("Error al obtener clientes");
        const data: Cliente[] = await response.json();
        setClientes(data);
      } catch (error: any) {
        console.error("Error cargando clientes:", error);
        Alert.alert(
          "Error",
          error?.message || "No se pudo cargar la lista de clientes.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchClientes();
  }, []);

  // ==============================
  // Filtro en memoria
  // ==============================
  const filtrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    if (!t) return clientes;

    return clientes.filter(
      (c) =>
        (c.nombre && c.nombre.toLowerCase().includes(t)) ||
        (c.apellido && c.apellido.toLowerCase().includes(t)) ||
        (c.email && c.email.toLowerCase().includes(t)) ||
        (c.rucEmpresa && c.rucEmpresa.includes(busqueda.trim())),
    );
  }, [busqueda, clientes]);

  // ==============================
  // IMPORT DNIT COMPRAS
  // ==============================
  const importarParaCliente = async (clienteId: number, overwrite = false) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (!result.assets || result.assets.length === 0) return;
      const file = result.assets[0];

      setUploadingComprasId(clienteId);

      const formData = new FormData();
      formData.append("usuarioId", String(clienteId));

      if (Platform.OS === "web") {
        const resp = await fetch(file.uri);
        const blob = await resp.blob();
        formData.append(
          "file",
          new File([blob], file.name || "compras.xlsx", {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
        );
      } else {
        formData.append("file", {
          uri: file.uri,
          name: file.name || "compras.xlsx",
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        } as any);
      }

      const token = await AsyncStorage.getItem("token");
      const url = `${BASE_URL}/dnit/import?overwrite=${
        overwrite ? "true" : "false"
      }`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      let resultJson: any = {};
      try {
        resultJson = await response.json();
      } catch {}

      if (response.ok) {
        const okMsg =
          (resultJson?.mensaje || "Importación realizada correctamente.") +
          (resultJson?.resumen ? `\n${resultJson.resumen}` : "");
        Alert.alert("✅ Import DNIT Compras", okMsg);
        setMensajeExito(
          resultJson?.mensaje || "Importación realizada correctamente.",
        );
        setTimeout(() => setMensajeExito(null), 4000);
        return;
      }

      if (response.status === 409) {
        const warnMsg = resultJson?.mensaje || "El ejercicio ya existe.";
        Alert.alert(
          "⚠️ Ejercicio existente",
          `${warnMsg}\n\n¿Deseás reemplazar el ejercicio (overwrite)?`,
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Reemplazar",
              style: "destructive",
              onPress: () => importarParaCliente(clienteId, true),
            },
          ],
        );
        return;
      }

      const errMsg =
        resultJson?.mensaje ||
        resultJson?.error ||
        "No se pudo procesar el archivo.";
      Alert.alert("❌ Error al importar", errMsg);
    } catch (error: any) {
      console.error("Error importando compras:", error);
      Alert.alert(
        "❌ Error",
        error?.message || "Ocurrió un error al importar.",
      );
    } finally {
      setUploadingComprasId(null);
    }
  };

  // ==============================
  // IMPORT DNIT VENTAS
  // ==============================
  const importarVentasParaCliente = async (
    clienteId: number,
    overwrite = false,
  ) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (!result.assets || result.assets.length === 0) return;
      const file = result.assets[0];

      setUploadingVentasId(clienteId);

      const formData = new FormData();
      formData.append("usuarioId", String(clienteId));

      if (Platform.OS === "web") {
        const resp = await fetch(file.uri);
        const blob = await resp.blob();
        formData.append(
          "file",
          new File([blob], file.name || "ventas.xlsx", {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
        );
      } else {
        formData.append("file", {
          uri: file.uri,
          name: file.name || "ventas.xlsx",
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        } as any);
      }

      const token = await AsyncStorage.getItem("token");
      const url = `${BASE_URL}/ventas/import?overwrite=${
        overwrite ? "true" : "false"
      }`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      let resultJson: any = {};
      try {
        resultJson = await response.json();
      } catch {}

      if (response.ok) {
        const okMsg =
          (resultJson?.mensaje ||
            "Importación de ventas realizada correctamente.") +
          (resultJson?.resumen ? `\n${resultJson.resumen}` : "");
        Alert.alert("✅ Import DNIT Venta", okMsg);
        setMensajeExito(
          resultJson?.mensaje ||
            "Importación de ventas realizada correctamente.",
        );
        setTimeout(() => setMensajeExito(null), 4000);
        return;
      }

      if (response.status === 409) {
        const warnMsg =
          resultJson?.mensaje || "El ejercicio de ventas ya existe.";
        Alert.alert(
          "⚠️ Ejercicio de ventas existente",
          `${warnMsg}\n\n¿Deseás reemplazar el ejercicio (overwrite)?`,
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Reemplazar",
              style: "destructive",
              onPress: () => importarVentasParaCliente(clienteId, true),
            },
          ],
        );
        return;
      }

      const errMsg =
        resultJson?.mensaje ||
        resultJson?.error ||
        "No se pudo procesar el archivo de ventas.";
      Alert.alert("❌ Error al importar ventas", errMsg);
    } catch (error: any) {
      console.error("Error importando ventas:", error);
      Alert.alert(
        "❌ Error",
        error?.message || "Ocurrió un error al importar ventas.",
      );
    } finally {
      setUploadingVentasId(null);
    }
  };

  // ==============================
  // PDF: abrir modal + seleccionar archivo + subir
  // ==============================
  const abrirModalPdf = (cliente: Cliente) => {
    setPdfCliente(cliente);
    setPdfTipo("CUMPLIMIENTO_TRIBUTARIO");
    setPdfMes("");
    setPdfAnio("");
    setPdfFile(null);
    setPdfModalVisible(true);
  };

  const seleccionarPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf"],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (!result.assets || result.assets.length === 0) return;
      const file = result.assets[0];
      setPdfFile({ uri: file.uri, name: file.name, mimeType: file.mimeType });
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo seleccionar el PDF.");
    }
  };

  // ✅ Mejorado + incluye DECLARACION_JURADA
  const subirPdf = async () => {
    if (!pdfCliente) return;

    const mm = pad2(pdfMes);
    const yyyy = (pdfAnio || "").trim();

    if (!isValidPeriodo(yyyy, mm)) {
      Alert.alert(
        "⚠️ Periodo inválido",
        "Ingresá un mes (1-12) y año (ej: 2025).",
      );
      return;
    }
    if (!pdfFile) {
      Alert.alert("⚠️ Falta archivo", "Seleccioná un PDF para subir.");
      return;
    }

    try {
      setUploadingPdfId(pdfCliente.id);

      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Sesión", "Tu sesión expiró. Volvé a iniciar sesión.");
        return;
      }

      const formData = new FormData();
      formData.append("tipo", pdfTipo); // ✅ incluye DECLARACION_JURADA
      formData.append("periodo", `${yyyy}-${mm}`);

      if (Platform.OS === "web") {
        const resp = await fetch(pdfFile.uri);
        const blob = await resp.blob();
        formData.append(
          "file",
          new File([blob], pdfFile.name || "documento.pdf", {
            type: "application/pdf",
          }),
        );
      } else {
        formData.append("file", {
          uri: pdfFile.uri,
          name: pdfFile.name || "documento.pdf",
          type: "application/pdf",
        } as any);
      }

      const url = `${BASE_URL}/api/admin/clientes/${pdfCliente.id}/pdfs`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          // ❌ no setear Content-Type manualmente en multipart
        },
        body: formData,
      });

      const raw = await response.text().catch(() => "");
      let resultJson: any = {};
      try {
        resultJson = raw ? JSON.parse(raw) : {};
      } catch {
        resultJson = {};
      }

      if (response.ok) {
        Alert.alert(
          "✅ PDF subido",
          `Se cargó correctamente.\nTipo: ${pdfTipo}\nPeriodo: ${yyyy}-${mm}`,
        );
        setMensajeExito("PDF subido correctamente.");
        setTimeout(() => setMensajeExito(null), 4000);
        setPdfModalVisible(false);
        return;
      }

      const errMsg =
        resultJson?.message ||
        resultJson?.error ||
        resultJson?.mensaje ||
        raw ||
        "No se pudo subir el PDF.";

      Alert.alert("❌ Error al subir PDF", errMsg);
    } catch (e: any) {
      console.error("Error subiendo PDF:", e);
      Alert.alert(
        "❌ Error",
        e?.message || "Ocurrió un error al subir el PDF.",
      );
    } finally {
      setUploadingPdfId(null);
    }
  };

  // ==============================
  // Render ítem
  // ==============================
  const renderCliente = ({ item }: { item: Cliente }) => {
    const isUploadingCompras = uploadingComprasId === item.id;
    const isUploadingVentas = uploadingVentasId === item.id;
    const isUploadingPdf = uploadingPdfId === item.id;

    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>
            {item.nombre} {item.apellido || ""}
          </Text>
          {!!item.email && (
            <Text style={styles.cardSubtitle}>{item.email}</Text>
          )}
          <Text style={styles.cardSubtitle}>
            RUC: {item.rucEmpresa || "Sin RUC"}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.btnDetalle}
            onPress={() =>
              router.push({
                pathname: "/admin/ClienteDetalle",
                params: { id: String(item.id) },
              })
            }
          >
            <MaterialIcons name="info" size={18} color="#8b5e3c" />
            <Text style={styles.btnTextDetalle}>Detalle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnImport}
            onPress={() => importarParaCliente(item.id)}
            disabled={isUploadingCompras}
          >
            {isUploadingCompras ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="cloud-upload" size={18} color="#fff" />
            )}
            <Text style={styles.btnTextImport}>
              {isUploadingCompras ? "Importando..." : "Import DNIT Compras"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnImportVenta}
            onPress={() => importarVentasParaCliente(item.id)}
            disabled={isUploadingVentas}
          >
            {isUploadingVentas ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="cloud-upload" size={18} color="#fff" />
            )}
            <Text style={styles.btnTextImport}>
              {isUploadingVentas ? "Importando..." : "Import DNIT Venta"}
            </Text>
          </TouchableOpacity>

          {/* ✅ Importar PDF (incluye Declaración Jurada dentro del modal) */}
          <TouchableOpacity
            style={styles.btnImportPdf}
            onPress={() => abrirModalPdf(item)}
            disabled={isUploadingPdf}
          >
            {isUploadingPdf ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="picture-as-pdf" size={18} color="#fff" />
            )}
            <Text style={styles.btnTextImport}>
              {isUploadingPdf ? "Subiendo..." : "Importar PDF"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5e3c" />
        <Text style={{ marginTop: 10 }}>Cargando clientes...</Text>
      </View>
    );
  }

  return (
    <ImageBackground source={fondo} style={styles.background}>
      <View style={styles.overlay}>
        <Text style={styles.title}>Clientes de Avanza</Text>

        {mensajeExito && (
          <View style={styles.bannerOk}>
            <Text style={styles.bannerText}>✅ {mensajeExito}</Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="🔍 Buscar cliente por nombre, RUC o email"
          value={busqueda}
          onChangeText={setBusqueda}
        />

        <FlatList
          data={filtrados}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCliente}
          contentContainerStyle={{ paddingBottom: 40 }}
        />

        {/* =========================
            MODAL IMPORTAR PDF
           ========================= */}
        <Modal
          visible={pdfModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setPdfModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                Importar PDF{" "}
                {pdfCliente
                  ? `• ${pdfCliente.nombre} ${pdfCliente.apellido || ""}`
                  : ""}
              </Text>

              <Text style={styles.modalLabel}>Tipo de documento</Text>
              <View style={{ gap: 8 }}>
                {TIPOS_PDF.map((t) => (
                  <Pressable
                    key={t.value}
                    onPress={() => setPdfTipo(t.value)}
                    style={[
                      styles.tipoRow,
                      pdfTipo === t.value && styles.tipoRowActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tipoText,
                        pdfTipo === t.value && styles.tipoTextActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.modalLabel, { marginTop: 14 }]}>
                Periodo (mes/año)
              </Text>
              <View style={styles.periodRow}>
                <TextInput
                  style={[styles.periodInput, { flex: 1 }]}
                  placeholder="MM"
                  keyboardType="number-pad"
                  value={pdfMes}
                  onChangeText={setPdfMes}
                  maxLength={2}
                />
                <TextInput
                  style={[styles.periodInput, { flex: 2 }]}
                  placeholder="YYYY"
                  keyboardType="number-pad"
                  value={pdfAnio}
                  onChangeText={setPdfAnio}
                  maxLength={4}
                />
              </View>

              <TouchableOpacity
                style={styles.btnPickPdf}
                onPress={seleccionarPdf}
              >
                <MaterialIcons name="attach-file" size={18} color="#8b5e3c" />
                <Text style={styles.btnPickPdfText}>
                  {pdfFile?.name ? pdfFile.name : "Seleccionar PDF"}
                </Text>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => setPdfModalVisible(false)}
                  disabled={uploadingPdfId != null}
                >
                  <Text style={styles.modalBtnTextCancel}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnOk]}
                  onPress={subirPdf}
                  disabled={uploadingPdfId != null}
                >
                  {uploadingPdfId != null ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalBtnTextOk}>Subir PDF</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, resizeMode: "cover" },
  overlay: { flex: 1, paddingTop: 50, paddingHorizontal: 20 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#8b5e3c",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#fff8e1",
    padding: 10,
    borderRadius: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 14,
    marginBottom: 12,
    borderRadius: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    alignItems: "center",
  },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: "#8b5e3c" },
  cardSubtitle: { fontSize: 14, color: "#555" },

  actions: { gap: 8, marginLeft: 12, alignItems: "flex-end" },

  btnDetalle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff3cd",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  btnTextDetalle: { marginLeft: 6, color: "#8b5e3c", fontWeight: "600" },

  btnImport: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#8b5e3c",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  btnImportVenta: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#c27b48",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  btnImportPdf: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#b23b3b",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
  },

  btnTextImport: { marginLeft: 8, color: "#fff", fontWeight: "700" },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  bannerOk: {
    backgroundColor: "#e6f8ec",
    borderWidth: 1,
    borderColor: "#55b476",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  bannerText: {
    color: "#333",
    fontSize: 15,
    textAlign: "center",
    fontWeight: "500",
  },

  // ===== Modal =====
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#8b5e3c",
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },

  tipoRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e7e7e7",
    backgroundColor: "#fafafa",
  },
  tipoRowActive: {
    borderColor: "#8b5e3c",
    backgroundColor: "#fff3cd",
  },
  tipoText: { color: "#333", fontWeight: "600" },
  tipoTextActive: { color: "#8b5e3c", fontWeight: "800" },

  periodRow: { flexDirection: "row", gap: 10 },
  periodInput: {
    backgroundColor: "#fff8e1",
    padding: 10,
    borderRadius: 12,
    fontSize: 16,
  },

  btnPickPdf: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff3cd",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  btnPickPdfText: { color: "#8b5e3c", fontWeight: "700" },

  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    justifyContent: "flex-end",
  },
  modalBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 110,
    alignItems: "center",
  },
  modalBtnCancel: {
    backgroundColor: "#f1f1f1",
  },
  modalBtnOk: {
    backgroundColor: "#8b5e3c",
  },
  modalBtnTextCancel: { color: "#333", fontWeight: "800" },
  modalBtnTextOk: { color: "#fff", fontWeight: "800" },
});
