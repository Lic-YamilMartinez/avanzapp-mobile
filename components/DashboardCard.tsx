// components/DashboardCard.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

interface DashboardCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

export default function DashboardCard({ icon, label, onPress }: DashboardCardProps) {
  return (
    <TouchableOpacity onPress={onPress} style={tw`bg-yellow-400 p-4 rounded-2xl mb-4 shadow-md`}>
      <View style={tw`flex-row items-center`}>
        <Ionicons name={icon} size={28} color="white" style={tw`mr-4`} />
        <Text style={tw`text-white text-lg font-bold`}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}