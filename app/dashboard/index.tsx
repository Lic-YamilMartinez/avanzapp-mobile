import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ImageBackground, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';
import fondo from '../../assets/bg-contabilidad.png';
import { BASE_URL } from '../config'; // Ajustá la ruta si estás en otro subdirectorio


interface UserDTO {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  ubicacion: string;
}

const OptionCard = ({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={tw`bg-white rounded-2xl p-4 flex-row items-center mb-4 shadow-md`}
    onPress={onPress}
  >
    <FontAwesome5 name={icon} size={24} color="#facc15" style={tw`mr-4`} />
    <Text style={tw`text-lg text-gray-800 font-semibold`}>{label}</Text>
  </TouchableOpacity>
);

export default function DashboardCliente() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['token', 'email', 'role']);
    router.replace('/');
  };

  useEffect(() => {
    const validarSesion = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) router.replace('/');
    };

    const fetchUsuario = async () => {
      try {
        const email = await AsyncStorage.getItem('email');
        const token = await AsyncStorage.getItem('token');
        const response = await fetch(`${BASE_URL}/usuarios/me?email=${email}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          },
          });

        const data = await response.json();
        setUsuario(data);
      } catch (err) {
        console.error('Error al obtener usuario', err);
      } finally {
        setLoading(false);
      }
    };

    validarSesion();
    fetchUsuario();
  }, [router]);

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={tw`mt-2 text-gray-600`}>Cargando datos...</Text>
      </View>
    );
  }

  return (
  <ImageBackground
    source={fondo}
    resizeMode="cover"
    style={{ flex: 1 }}
  >
    <ScrollView contentContainerStyle={tw`flex-1 p-2`}>
      <View style={tw`bg-white/70 rounded-2xl p-5 shadow-none`}>
        <Text style={tw`text-2xl font-bold text-gray-900 mb-2`}>
          Hola, {usuario?.nombre}!
        </Text>
        <Text style={tw`text-sm text-gray-600 mb-6`}>
          Bienvenido a tu panel personal
        </Text>
        <OptionCard label="Perfil" icon="user" onPress={() => alert('Ir a Perfil')} />
        <OptionCard label="Informes" icon="file-alt" onPress={() => alert('Ir a Reportes')} />
        <OptionCard label="DNIT" icon="clipboard-list" onPress={() => alert('Ir a Declaraciones')} />
        <OptionCard label="Contactar al Contador" icon="phone" onPress={() => alert('Ir a Contacto')} />
        <OptionCard label="Cerrar Sesión" icon="sign-out-alt" onPress={handleLogout} />
      </View>

      <View style={tw`mt-8 items-center`}>
        <Text style={tw`text-xs text-gray-500`}>
          © 2025 Avanza Consultores - Todos los derechos reservados
        </Text>
        <Text style={tw`text-xs text-gray-500`}>
          Desarrollado por Yamil M. para uso exclusivo de clientes
        </Text>
    </View>
    </ScrollView>
  </ImageBackground>
);
}
