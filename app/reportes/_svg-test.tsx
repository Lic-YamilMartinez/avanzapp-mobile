import React from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

export default function SvgTest() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={120} height={60}>
        <Rect x={0} y={0} width={120} height={60} />
        
      </Svg>
    </View>
  );
}
