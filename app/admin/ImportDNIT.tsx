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

export default function ImportDNIT() {
  const [fileName, setFileName] = useState('');
  const [previewData, setPreviewData] = useState<any[][]>([]);
  const [fileUri, setFileUri] = useState('');
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
            setPreviewData(parsed.slice(0, 5));
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
          setPreviewData(parsed.slice(0, 5));
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
        const okMsg =
          (result?.mensaje || 'Archivo procesado') +
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
        <Text style={styles.title}>Importar Datos DNIT</Text>

        <TouchableOpacity style={styles.button} onPress={pickDocument}>
          <MaterialIcons name="folder-open" size={20} color="white" style={styles.icon} />
          <Text style={styles.buttonText}>Seleccionar Archivo Excel</Text>
        </TouchableOpacity>

        {fileName ? (
          <View style={styles.previewBox}>
            <Text style={styles.fileName}>📄 {fileName}</Text>
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
