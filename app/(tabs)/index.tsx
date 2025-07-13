// app/(tabs)/index.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  ImageBackground,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import tw from 'twrnc';
import fondo from '../../assets/bg-contabilidad.png';
import logo from '../../assets/logo-avanza.png';
import { BASE_URL } from '../config'; // ajustá la ruta según la ubicación del archivo


export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      //const response = await fetch('http://localhost:8080/auth/login', {
      //const response = await fetch('http://172.20.10.2:8080/auth/login', {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Login fallido');
      if (data.email) {
        await AsyncStorage.setItem('email', data.email);
        console.warn("Se recibio el email del backend")
      } else {
        console.warn('Email no recibido del backend');
      }

      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("role", data.role);
      await AsyncStorage.setItem('email', data.email);


      //const token = await AsyncStorage.getItem("token");
      const role = await AsyncStorage.getItem("role");

      console.warn('Ahora dirigira al admin o cliente');
      console.log("Test de flujo completado OK");


      if (role === 'ADMIN') {
        router.replace('/admin');
      } else if (data.role === 'CLIENT') {
        router.replace('/dashboard');
      } else {
        Alert.alert('Error', 'Rol desconocido');
      }

    } catch (err: any) {
      Alert.alert('Error', err.message || 'Algo salió mal.');
    }
  };

  return (
    <ImageBackground
      source={fondo}
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      resizeMode="cover"
    >
      <View style={tw`bg-white p-6 rounded-2xl w-11/12 max-w-md shadow-lg`}>
        <Image
  source={logo}
  style={tw`h-50 w-full mb-6`}
  resizeMode="contain"
/>



        <Text style={tw`text-xl font-semibold text-center text-gray-800 mb-4`}>Iniciar Sesión</Text>

        <Text style={tw`text-sm mb-1 text-gray-600`}>Correo</Text>
        <TextInput
          style={tw`border rounded-lg px-3 py-2 mb-4`}
          placeholder="correo@empresa.com"
          keyboardType="email-address"
          onChangeText={setEmail}
          value={email}
        />

        <Text style={tw`text-sm mb-1 text-gray-600`}>Contraseña</Text>
        
        <TextInput
          style={tw`border rounded-lg px-3 py-2 mb-4`}
          placeholder="********"
          secureTextEntry
          onChangeText={setPassword}
          value={password}
        />

        <TouchableOpacity
          style={tw`bg-yellow-500 p-3 rounded-lg`}
          onPress={handleLogin}
        >
          <Text style={tw`text-white text-center font-bold`}>Entrar</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}
