import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import {Pressable, View} from 'react-native';
import SkeletonLoader from '../../../components/Skeleton';

const InfoSkeleton = ({onBack}: {onBack: () => void}) => (
  <View style={{backgroundColor: '#000000', flex: 1}}>
    <SkeletonLoader
      show
      height={340}
      width="100%"
      marginVertical={0}
      style={{borderRadius: 0}}
    />
    <Pressable
      accessibilityLabel="Go back"
      accessibilityRole="button"
      hitSlop={8}
      onPress={onBack}
      style={{
        alignItems: 'center',
        height: 48,
        justifyContent: 'center',
        left: 10,
        position: 'absolute',
        top: 36,
        width: 48,
      }}>
      <MaterialCommunityIcons name="arrow-left" color="#FFFFFF" size={28} />
    </Pressable>
    <View style={{gap: 14, paddingHorizontal: 20, paddingTop: 22}}>
      <SkeletonLoader show height={38} width={190} marginVertical={0} />
      <View style={{flexDirection: 'row', gap: 8}}>
        <SkeletonLoader show height={28} width={62} marginVertical={0} />
        <SkeletonLoader show height={28} width={78} marginVertical={0} />
        <SkeletonLoader show height={28} width={54} marginVertical={0} />
      </View>
      <SkeletonLoader show height={24} width={130} marginVertical={4} />
      <SkeletonLoader show height={18} width="100%" marginVertical={0} />
      <SkeletonLoader show height={18} width="92%" marginVertical={0} />
      <SkeletonLoader show height={18} width="76%" marginVertical={0} />
      <SkeletonLoader show height={28} width={120} marginVertical={10} />
      <SkeletonLoader show height={72} width="100%" marginVertical={0} />
    </View>
  </View>
);

export default InfoSkeleton;
