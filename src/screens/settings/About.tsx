import {
  View,
  ScrollView,
  Pressable,
  Image,
  Linking,
  ActivityIndicator,
  ToastAndroid,
  Platform,
  StatusBar,
} from 'react-native';
import React, {useEffect, useState} from 'react';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import {Ionicons} from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import {useNavigation} from '@react-navigation/native';
import AppText from '../../components/ui/Text';
import AmbientBackground from '../../components/ui/AmbientBackground';

// Types for GitHub API
interface Contributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

// UserCard Component
const UserCard = ({
  imageUrl,
  name,
  role,
  githubUrl,
  telegramUrl,
  instagramUrl,
  websiteUrl,
}: {
  imageUrl: string;
  name: string;
  role: string;
  githubUrl?: string;
  telegramUrl?: string;
  instagramUrl?: string;
  websiteUrl?: string;
}) => {
  return (
    <View
      style={{
        flex: 1,
        margin: 6,
        padding: 16,
        height: 240,
        backgroundColor: '#1E1F22',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#38bdf840',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#38bdf8',
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
      }}>
      <View style={{alignItems: 'center'}}>
        <View
          style={{
            width: 76,
            height: 76,
            borderRadius: 38,
            borderWidth: 1.5,
            borderColor: '#38bdf8',
            overflow: 'hidden',
            backgroundColor: '#2a2b2f',
          }}>
          <Image
            source={{uri: imageUrl}}
            style={{width: '100%', height: '100%'}}
            resizeMode="cover"
          />
        </View>

        <View style={{height: 10}} />

        <AppText role="titleMedium" style={{fontWeight: 'bold', color: '#fff'}}>
          {name}
        </AppText>

        <View style={{height: 4}} />

        <View
          style={{
            backgroundColor: '#38bdf820',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 20,
          }}>
          <AppText
            role="labelSmall"
            style={{color: '#38bdf8', fontWeight: 'bold'}}>
            {role}
          </AppText>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 8,
          marginTop: 10,
        }}>
        {githubUrl && (
          <SocialBadge
            icon="logo-github"
            onPress={() => Linking.openURL(githubUrl)}
          />
        )}
        {telegramUrl && (
          <SocialBadge
            icon="paper-plane"
            onPress={() => Linking.openURL(telegramUrl)}
          />
        )}
        {instagramUrl && (
          <SocialBadge
            icon="logo-instagram"
            onPress={() => Linking.openURL(instagramUrl)}
          />
        )}
        {websiteUrl && (
          <SocialBadge
            icon="globe-outline"
            onPress={() => Linking.openURL(websiteUrl)}
          />
        )}
      </View>
    </View>
  );
};

const SocialBadge = ({icon, onPress}: {icon: any; onPress: () => void}) => (
  <Pressable
    onPress={onPress}
    style={({pressed}) => ({
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#38bdf815',
      borderWidth: 1,
      borderColor: '#38bdf840',
      justifyContent: 'center',
      alignItems: 'center',
      opacity: pressed ? 0.7 : 1,
    })}>
    <Ionicons name={icon} size={16} color="#38bdf8" />
  </Pressable>
);

const SocialIconRow = () => (
  <View
    style={{
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      alignItems: 'center',
      backgroundColor: '#1E1F22cc',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 28,
      marginHorizontal: 16,
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    }}>
    <Pressable
      onPress={() => Linking.openURL('https://github.com/d0x-dev')}
      style={{padding: 8}}>
      <Ionicons name="logo-github" size={24} color="#38bdf8" />
    </Pressable>
    <Pressable
      onPress={() => Linking.openURL('https://instagram.com/dark__336')}
      style={{padding: 8}}>
      <Ionicons name="logo-instagram" size={24} color="#38bdf8" />
    </Pressable>
    <Pressable
      onPress={() => Linking.openURL('https://t.me/songpy')}
      style={{padding: 8}}>
      <Ionicons name="paper-plane-outline" size={24} color="#38bdf8" />
    </Pressable>
    <Pressable
      onPress={() => Linking.openURL('https://darkboy.pro')}
      style={{padding: 8}}>
      <Ionicons name="globe-outline" size={24} color="#38bdf8" />
    </Pressable>
  </View>
);

const About = () => {
  const navigation = useNavigation();
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loadingContributors, setLoadingContributors] = useState(true);

  // Logo Scale Animation
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, {duration: 2500, easing: Easing.inOut(Easing.ease)}),
        withTiming(1, {duration: 2500, easing: Easing.inOut(Easing.ease)}),
      ),
      -1,
      true,
    );
  }, []);
  const animatedLogoStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  // Fetch Contributors
  useEffect(() => {
    fetch('https://api.github.com/repos/d0x-dev/AirFlix/contributors')
      .then(res => res.json())
      .then((data: Contributor[]) => {
        if (Array.isArray(data)) {
          // Filter out main contributors to show them in the "Other" section
          const filtered = data.filter(
            c => c.login !== 'd0x-dev' && c.login !== 'drkvenom786',
          );
          setContributors(filtered);
        }
        setLoadingContributors(false);
      })
      .catch(e => {
        console.error('Failed to load contributors', e);
        setLoadingContributors(false);
      });
  }, []);

  return (
    <AmbientBackground>
      <View style={{flex: 1}}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent={true}
        />

        {/* U-Shaped Top App Bar */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            paddingTop:
              Platform.OS === 'android' ? (StatusBar.currentHeight || 20) : 45,
            paddingBottom: 20,
            backgroundColor: '#141517f0', // Slight transparency for blur effect
            borderBottomLeftRadius: 30,
            borderBottomRightRadius: 30,
            borderBottomWidth: 0.6,
            borderColor: '#ffffff30',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
          }}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({pressed}) => ({
              opacity: pressed ? 0.7 : 1,
              width: 40,
              height: 40,
              justifyContent: 'center',
            })}>
            <Ionicons name="arrow-back" size={28} color="#ffffff" />
          </Pressable>

          <AppText
            style={{
              color: '#ffffff',
              fontSize: 20,
              fontWeight: '600',
            }}>
            About
          </AppText>

          {/* Empty view for flex balancing */}
          <View style={{width: 40}} />
        </View>

        {/* Scrollable Content */}
        <ScrollView
          contentContainerStyle={{
            paddingTop:
              Platform.OS === 'android'
                ? (StatusBar.currentHeight || 20) + 90
                : 130,
            paddingBottom: 60,
          }}
          showsVerticalScrollIndicator={false}>
          <View style={{alignItems: 'center', paddingHorizontal: 16}}>
            {/* Animated Logo */}
            <Pressable
              onPress={() => {
                const count = logoTapCount + 1;
                setLogoTapCount(count);
                if (count >= 7) {
                  ToastAndroid.show(
                    'Built with ❤️ by AirFlix Team',
                    ToastAndroid.LONG,
                  );
                  setLogoTapCount(0);
                }
              }}>
              <Animated.View
                style={[
                  {
                    width: 90,
                    height: 90,
                    borderRadius: 45,
                    backgroundColor: '#1E1F22',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  },
                  animatedLogoStyle,
                ]}>
                <Image
                  source={{uri: 'airflix_vector'}}
                  style={{width: 50, height: 50, tintColor: '#fff'}}
                  resizeMode="contain"
                />
              </Animated.View>
            </Pressable>

            {/* Title AirFlix */}
            <View style={{flexDirection: 'row'}}>
              <AppText
                style={{
                  fontSize: 28,
                  fontWeight: 'bold',
                  color: '#38bdf8', // Primary
                }}>
                Air
              </AppText>
              <AppText
                style={{
                  fontSize: 28,
                  fontWeight: 'bold',
                  color: '#818cf8', // Secondary
                }}>
                Flix
              </AppText>
            </View>

            {/* Version Badges */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 8,
                marginBottom: 12,
              }}>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: '#818cf8',
                  borderRadius: 20,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}>
                <AppText
                  style={{
                    fontSize: 12,
                    fontWeight: 'bold',
                    color: '#818cf8',
                  }}>
                  {Application.nativeApplicationVersion || '1.0.0'}
                </AppText>
              </View>
              {__DEV__ && (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: '#818cf8',
                    borderRadius: 20,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    marginLeft: 6,
                  }}>
                  <AppText
                    style={{
                      fontSize: 12,
                      fontWeight: 'bold',
                      color: '#818cf8',
                    }}>
                    DEBUG
                  </AppText>
                </View>
              )}
            </View>

            {/* Dev By DxV STUDIO */}
            <AppText
              style={{
                fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
                fontWeight: 'bold',
                color: '#818cf8',
                marginBottom: 20,
              }}>
              Dev By DxV STUDIO 亗
            </AppText>

            {/* Social Row */}
            <SocialIconRow />

            <View style={{height: 30}} />

            {/* Contributors Section Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                width: '100%',
                paddingHorizontal: 8,
                marginBottom: 12,
              }}>
              <Ionicons name="people" size={24} color="#38bdf8" />
              <AppText
                style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: '#fff',
                  marginLeft: 8,
                }}>
                Contributors
              </AppText>
              <AppText
                style={{
                  fontSize: 14,
                  color: '#38bdf8',
                  marginLeft: 8,
                }}>
                2 Contributors
              </AppText>
            </View>

            {/* 2 Main Contributors Grid */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                width: '100%',
              }}>
              <UserCard
                imageUrl="https://avatars.githubusercontent.com/u/218248866"
                name="Darkboy"
                role="Lead Developer"
                githubUrl="https://github.com/d0x-dev"
                telegramUrl="https://t.me/songpy"
                instagramUrl="https://instagram.com/dark__336"
                websiteUrl="https://darkboy.pro"
              />
              <UserCard
                imageUrl="https://avatars.githubusercontent.com/u/241423835"
                name="Venom"
                role="UI/UX Specialist"
                githubUrl="https://github.com/drkvenom786"
                websiteUrl="https://venomx.pro"
              />
            </View>

            {/* Dynamic Contributors */}
            <View style={{height: 24}} />

            {loadingContributors ? (
              <ActivityIndicator size="large" color="#38bdf8" />
            ) : (
              contributors.length > 0 && (
                <>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      width: '100%',
                      paddingHorizontal: 8,
                      marginBottom: 16,
                    }}>
                    <Ionicons name="logo-github" size={24} color="#38bdf8" />
                    <AppText
                      style={{
                        fontSize: 18,
                        fontWeight: 'bold',
                        color: '#fff',
                        marginLeft: 8,
                      }}>
                      Other Contributors
                    </AppText>
                  </View>

                  {/* Group into pairs for rows */}
                  {Array.from({length: Math.ceil(contributors.length / 2)}).map(
                    (_, i) => (
                      <View
                        key={`row-${i}`}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          width: '100%',
                          marginBottom: 16,
                        }}>
                        <UserCard
                          imageUrl={contributors[i * 2].avatar_url}
                          name={contributors[i * 2].login}
                          role={`${contributors[i * 2].contributions} Commits`}
                          githubUrl={contributors[i * 2].html_url}
                        />
                        {contributors[i * 2 + 1] ? (
                          <UserCard
                            imageUrl={contributors[i * 2 + 1].avatar_url}
                            name={contributors[i * 2 + 1].login}
                            role={`${
                              contributors[i * 2 + 1].contributions
                            } Commits`}
                            githubUrl={contributors[i * 2 + 1].html_url}
                          />
                        ) : (
                          <View style={{flex: 1, margin: 6}} /> // Empty placeholder
                        )}
                      </View>
                    ),
                  )}
                </>
              )
            )}
          </View>
        </ScrollView>
      </View>
    </AmbientBackground>
  );
};

export default About;
