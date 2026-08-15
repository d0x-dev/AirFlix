import AppText from '../components/ui/Text';
import {Text} from 'react-native';
import {SvgUri} from 'react-native-svg';
import {FLAGS} from '../lib/constants';
import React from 'react';

const RenderProviderFlagIcon = ({type}: {type: string}) => {
  const uri = FLAGS[type.toLocaleUpperCase() as keyof typeof FLAGS] || '';
  return (
    <AppText>
      <SvgUri width={28} height={28} uri={uri} />
    </AppText>
  );
};

export default RenderProviderFlagIcon;
