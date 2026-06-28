//app/admin/index.tsx
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import fondo from '../../assets/bg-contabilidad.png';

export default function AdminDashboard() {
  const router = useRouter();

  const handleLogout = async () => {
  console.log("Cerrando sesión...");
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('user');
  router.replace('/');
};

  return (
    <ImageBackground
      source={fondo} // Fondo decorativo AvanzApp
      style={styles.background}
    >
      <View style={styles.overlay}>
        {/* Saludo profesional */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Bienvenido al Centro de Control de AvanzApp</Text>
          <Text style={styles.description}>
            Administra clientes, reportes y configuraciones de AvanzApp desde un solo lugar
          </Text>
        </View>

        {/* Tarjetas del Dashboard */}
        <View style={styles.modules}>

          {/* Clientes */}
          <TouchableOpacity 
              style={styles.card} 
              onPress={() => router.push('/admin/Clientes')}
          >
            <MaterialIcons name="people" size={42} color="#8b5e3c" />
            <Text style={styles.cardText}>Clientes</Text>
          </TouchableOpacity>

          {/* Reportes */}
          <TouchableOpacity style={styles.card}>
            <MaterialIcons name="bar-chart" size={42} color="#8b5e3c" />
            <Text style={styles.cardText}>Reportes</Text>
          </TouchableOpacity>

          {/* Configuración */}
          <TouchableOpacity style={styles.card}>
            <MaterialIcons name="settings" size={42} color="#8b5e3c" />
            <Text style={styles.cardText}>Configuración</Text>
          </TouchableOpacity>

          {/* Cerrar Sesión */}
          <TouchableOpacity style={styles.card} onPress={handleLogout}>
            <MaterialIcons name="logout" size={42} color="#b71c1c" />
            <Text style={[styles.cardText, { color: '#b71c1c' }]}>
              Cerrar Sesión
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  overlay: {
    flex: 1,
    //backgroundColor: 'rgba(253, 246, 227, 0.92)',
    alignItems: 'center',
    paddingTop: 50,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8b5e3c',
    marginBottom: 6,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
  },
  modules: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '90%',
  },
  card: {
    width: 150,
    height: 130,
    backgroundColor: '#fff8e1',
    margin: 12,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#8b5e3c',
    textAlign: 'center',
  },
});
