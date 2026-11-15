// app/admin/ImportDNIT.tsx
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  ImageBackground,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import * as XLSX from 'xlsx';
import fondo from '../../assets/bg-contabilidad.png';
import { BASE_URL } from '../config/config';

type FormatoCompras = 'IVA' | 'IRP' | null;

const normalizarHeader = (value: any) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/º|°/g, '')
    .replace(/[.\-/%]/g, ' ')
    .trim()
    .replace(/\s+/g, '_');

const detectarFormatoCompras = (rows: any[][]): FormatoCompras => {
  for (const row of rows.slice(0, 20)) {
    const headers = new Set((row ?? []).map(normalizarHeader).filter(Boolean));

    const esIrp =
      headers.has('FECHA') &&
      (headers.has('NUMERO_DEL_DOCUMENTO') || headers.has('NRO_DEL_DOCUMENTO')) &&
      (headers.has('MONTO_DE_COMPRA') || headers.has('MONTO_COMPRA')) &&
      headers.has('TOTAL_COMPROBANTE');

    if (esIrp) return 'IRP';

    const esIva =
      headers.has('DIA') &&
      (headers.has('DOCUMENTO_NRO') ||
        headers.has('DOCUMENTO_NO') ||
        headers.has('DOC_NRO'));

    if (esIva) return 'IVA';
  }

  return null;
};

export default function ImportDNIT() {
  const [fileName, setFileName] = useState('');
  const [previewData, setPreviewData] = useState<any[][]>([]);
  const [fileUri, setFileUri] = useState('');
  const [detectedFormat, setDetectedFormat] = useState<FormatoCompras>(null);
  const { id } = useLocalSearchParams(); // ID del cliente desde la URL

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      });

      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setFileName(file.name);
        setFileUri(file.uri);

        if (Platform.OS === 'web') {
          const response = await fetch(file.uri);
          const blob = await response.blob();
          const reader = new FileReader();

          reader.onload = () => {
            const data = reader.result as string;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const parsed = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
            setPreviewData(parsed.slice(0, 8));
            setDetectedFormat(detectarFormatoCompras(parsed));
          };

          reader.readAsBinaryString(blob);
        } else {
          // 👇 Algunos tipos de @types pueden no exponer EncodingType; usamos string literal 'base64'
          const b64 = await FileSystem.readAsStringAsync(file.uri, {
            encoding: 'base64' as any,
          });

          const workbook = XLSX.read(b64, { type: 'base64' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const parsed = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
          setPreviewData(parsed.slice(0, 8));
          setDetectedFormat(detectarFormatoCompras(parsed));
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        Toast.show({
          type: 'error',
          text1: 'Error al leer archivo',
          text2: 'Asegúrate de seleccionar un archivo válido',
        });
      } else {
        Alert.alert('❌ Error de conexión', 'Ocurrió un error inesperado');
      }
    }
  };

  const realizarImportacion = async (overwrite = false) => {
    if (!fileUri) {
      Alert.alert('Error', 'Primero selecciona un archivo.');
      return;
    }

    if (!detectedFormat) {
      Alert.alert(
        'Formato no reconocido',
        'El archivo debe corresponder a Compras IVA o Libro de Egresos IRP.',
      );
      return;
    }

    const usuarioId = id;
    const formData = new FormData();
    formData.append('usuarioId', String(usuarioId));

    if (Platform.OS === 'web') {
      const response = await fetch(fileUri);
      const blob = await response.blob();
      formData.append('file', new File([blob], fileName || 'compras.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }));
    } else {
      formData.append('file', {
        uri: fileUri,
        name: fileName || 'compras.xlsx',
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      } as any);
    }

    try {
      const url = `${BASE_URL}/dnit/import?overwrite=${overwrite ? 'true' : 'false'}`;
      const response = await fetch(url, {
        method: 'POST',
        body: formData, // No agregar 'Content-Type' manualmente
      });

      let result: any = {};
      try { result = await response.json(); } catch {}

      if (response.ok) {
        const fuente = result?.fuente || detectedFormat;
        const periodos = Array.isArray(result?.periodos)
          ? result.periodos.join(', ')
          : '';
        const okMsg =
          (result?.mensaje || 'Archivo procesado') +
          (fuente ? `\nFuente detectada: ${fuente}` : '') +
          (periodos ? `\nPeriodo(s): ${periodos}` : '') +
          (result?.advertencia ? `\n\n⚠️ ${result.advertencia}` : '') +
          (result?.resumen ? `\n${result.resumen}` : '');
        Alert.alert('✅ Importación Exitosa', okMsg);
      } else if (response.status === 409) {
        const warnMsg = result?.mensaje || 'El ejercicio ya existe.';
        Alert.alert(
          '⚠️ Ejercicio existente',
          `${warnMsg}\n\n¿Deseás reemplazar el ejercicio (overwrite)?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Reemplazar', style: 'destructive', onPress: () => realizarImportacion(true) },
          ],
        );
      } else {
        Alert.alert('⚠️ Error', result?.mensaje || result?.error || 'No se pudo importar');
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('❌ Error de conexión', error.message || 'Revisá el servidor');
      } else {
        Alert.alert('❌ Error de conexión', 'Ocurrió un error inesperado');
      }
    }
  };

  return (
    <ImageBackground source={fondo} style={styles.background} resizeMode="cover">
      <View style={styles.container}>
        <Text style={styles.title}>Importar Compras DNIT</Text>
        <Text style={styles.subtitle}>
          Cargá el reporte mensual del cliente. AvanzApp detecta automáticamente si corresponde a IVA o IRP.
        </Text>

        <TouchableOpacity style={styles.button} onPress={pickDocument}>
          <MaterialIcons name="folder-open" size={20} color="white" style={styles.icon} />
          <Text style={styles.buttonText}>Seleccionar Archivo Excel</Text>
        </TouchableOpacity>

        {fileName ? (
          <View style={styles.previewBox}>
            <Text style={styles.fileName}>📄 {fileName}</Text>
            <View
              style={[
                styles.formatBadge,
                detectedFormat ? styles.formatOk : styles.formatError,
              ]}
            >
              <Text style={styles.formatText}>
                {detectedFormat
                  ? `Formato detectado: ${detectedFormat}`
                  : 'Formato no reconocido'}
              </Text>
            </View>
            <ScrollView horizontal>
              <View>
                {previewData.map((row, rowIndex) => (
                  <View style={styles.row} key={rowIndex}>
                    {row.map((cell, colIndex) => (
                      <Text style={styles.cell} key={colIndex}>
                        {String(cell)}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.buttonSecondary} onPress={() => realizarImportacion(false)}>
              <FontAwesome5 name="cloud-upload-alt" size={18} color="white" style={styles.icon} />
              <Text style={styles.buttonText}>Realizar Importación</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Toast />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8b5e3c',
    marginBottom: 20,
    textAlign: 'center',
  },
  fileName: {
    fontSize: 16,
    marginVertical: 10,
    fontWeight: '600',
  },
  subtitle: {
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 10,
  },
  formatBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },
  formatOk: {
    backgroundColor: '#dcfce7',
  },
  formatError: {
    backgroundColor: '#fee2e2',
  },
  formatText: {
    fontWeight: '700',
    color: '#374151',
  },
  previewBox: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#fff8e1',
    borderRadius: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  cell: {
    marginRight: 10,
    fontSize: 13,
    color: '#333',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#fdd835',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  buttonSecondary: {
    flexDirection: 'row',
    backgroundColor: '#8b5e3c',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  icon: {
    marginRight: 4,
  },
});
