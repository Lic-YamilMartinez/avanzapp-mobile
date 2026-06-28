import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import fondo from '../../assets/bg-contabilidad.png';
import { BASE_URL } from '../config/config';

interface Feedback {
  type: 'OK' | 'WARNING' | 'ERROR';
  text: string;
}

export default function ClienteDetalle() {
  const router = useRouter();
  const rawParams = useLocalSearchParams();

  const { id, status, msg } = useMemo(() => {
    const p: any = rawParams || {};
    return {
      id: Array.isArray(p.id) ? p.id[0] : p.id,
      status: Array.isArray(p.status) ? p.status[0] : p.status,
      msg: Array.isArray(p.msg) ? p.msg[0] : p.msg,
    };
  }, [rawParams]);

  const [cliente, setCliente] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Mostrar feedback si viene por params (después de importar)
  useEffect(() => {
    if (status && msg) {
      const upper = String(status).toUpperCase();
      if (upper === 'OK' || upper === 'WARNING' || upper === 'ERROR') {
        const fb: Feedback = { type: upper as Feedback['type'], text: String(msg) };
        setFeedback(fb);

        // Alerta nativa opcional
        if (Platform.OS !== 'web') {
          Alert.alert(
            fb.type === 'OK' ? 'Éxito' : fb.type === 'WARNING' ? 'Aviso' : 'Error',
            fb.text
          );
        }
      }
    }
  }, [status, msg]);

  // Auto-ocultar banner a los 5 segundos
  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  // Cargar datos del cliente
  useEffect(() => {
    const fetchCliente = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem('token');
        const response = await fetch(`${BASE_URL}/usuarios/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 401) {
          throw new Error('Sesión expirada. Iniciá sesión nuevamente.');
        }
        if (!response.ok) throw new Error('Error al obtener datos del cliente');

        const data = await response.json();
        setCliente(data);
      } catch (error: any) {
        console.error('Error cargando cliente:', error);
        setFeedback({ type: 'ERROR', text: error?.message || 'Error desconocido' });
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchCliente();
  }, [id]);

  const bannerStyle =
    feedback?.type === 'OK'
      ? styles.bannerOk
      : feedback?.type === 'WARNING'
      ? styles.bannerWarn
      : styles.bannerErr;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5e3c" />
        <Text style={{ marginTop: 10 }}>Cargando datos del cliente...</Text>
      </View>
    );
  }

  if (!cliente) {
    return (
      <View style={styles.loadingContainer}>
        <Text>No se encontró información para este cliente.</Text>
      </View>
    );
  }

  return (
    <ImageBackground source={fondo} style={styles.background}>
      <View style={styles.overlay}>
        <Text style={styles.title}>Detalle del Cliente</Text>

        {/* Banner de feedback */}
        {feedback && (
          <View style={[styles.banner, bannerStyle]}>
            <Text style={styles.bannerText}>
              {feedback.type === 'OK' ? '✅ ' : feedback.type === 'WARNING' ? '⚠️ ' : '❌ '}
              {feedback.text}
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.info}>🧑 {cliente.nombre} {cliente.apellido}</Text>
          <Text style={styles.info}>📧 {cliente.email}</Text>
          <Text style={styles.info}>📞 {cliente.telefono || 'Sin teléfono'}</Text>
          <Text style={styles.info}>🏢 {cliente.tipoCliente || 'Sin tipo definido'}</Text>
          <Text style={styles.info}>📍 {cliente.direccion || 'Sin dirección'}</Text>
          <Text style={styles.info}>🌎 {cliente.ciudad || 'Sin ciudad'}</Text>
          <Text style={styles.info}>🏢 RUC: {cliente.rucEmpresa || 'Sin RUC'}</Text>
          <Text style={styles.info}>🏢 Empresa: {cliente.nombreEmpresa || 'Sin empresa'}</Text>
        </View>

        {/* Botón Importar DNIT */}
        <TouchableOpacity
          style={styles.importButton}
          onPress={() =>
            router.push({ pathname: '/admin/ImportDNIT', params: { id: cliente.id.toString() } })
          }
        >
          <Text style={styles.importText}>📂 Importar Datos DNIT</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, resizeMode: 'cover' },
  overlay: { flex: 1, paddingTop: 50, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#8b5e3c', marginBottom: 12 },

  // Banner de feedback
  banner: {
    width: '85%',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  bannerOk: { backgroundColor: '#e6f8ec', borderWidth: 1, borderColor: '#55b476' },
  bannerWarn: { backgroundColor: '#fff7e6', borderWidth: 1, borderColor: '#f0b429' },
  bannerErr: { backgroundColor: '#ffeceb', borderWidth: 1, borderColor: '#d9534f' },
  bannerText: { color: '#333', fontSize: 14 },

  card: { backgroundColor: '#fff8e1', padding: 20, borderRadius: 16, width: '85%', marginBottom: 30 },
  info: { fontSize: 16, marginBottom: 8, color: '#555' },
  importButton: { backgroundColor: '#8b5e3c', padding: 15, borderRadius: 12 },
  importText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
