import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuthContext } from '@/context/AuthContext';
import Stats from '../../components/home/stats';
import Alerts from '../../components/home/alerts';

export default function HomeScreen() {
  const palette = Colors.light;
  // const greeting = useGreeting();
  const { user, accessToken } = useAuthContext();
  const displayName = useMemo(() => {
    if (user?.name) return user.name.split(' ')[0];
    if (user?.email) return user.email.split('@')[0];
    return 'neighbor';
  }, [user]);

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: palette.background }]}> 
      <View style={[styles.container, { backgroundColor: palette.background }]}> 
        <View style={styles.header}>
            <ThemedText type="title">Hey {displayName}!</ThemedText>
        </View>
        <Alerts />
        <Stats />
        
        <SurfaceCard
          onPress={() => { console.log('UPLOAD YOUR FOOD'); }}
          style={[
            styles.uploadCard,
            styles.uploadShadow,
            {
              backgroundColor: palette.cardHighlight,
              opacity: 0.95,
              borderColor: palette.tint,
              borderWidth: 1.25,
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}
        >
          <View style={styles.uploadHero}>
            <View style={[styles.uploadIcon]}> 
              <IconSymbol name="camera.fill" size={50} color={palette.tint} />
            </View>
            <ThemedText type="subtitle">Upload your food</ThemedText>
          </View>
        </SurfaceCard>
        
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 24,
  },
  uploadCard: {
    gap: 16,
    flex: 1,
    minHeight: 220,
  },
  uploadHero: {
    gap: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButton: {
    marginTop: 4,
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  uploadShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
  },
});


