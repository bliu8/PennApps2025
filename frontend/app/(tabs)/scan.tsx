import { useMemo } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuthContext } from '@/context/AuthContext';
import Fridge from '@/components/home/fridge';
import { consumeInventoryItem, deleteInventoryItem, updateInventoryQuantity } from '@/services/api';

const palette = Colors.light;

export default function ScanScreen() {
  const { user, accessToken } = useAuthContext();
  
  
  const displayName = useMemo(() => {
    if (user?.name) return user.name.split(' ')[0];
    if (user?.email) return user.email.split('@')[0];
    return 'neighbor';
  }, [user]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}> 
      <View style={[styles.container, { backgroundColor: palette.background }]}> 
        <View style={[styles.content]}>
          <View style={styles.header}>
            <View>
              <ThemedText type="title">Fridge</ThemedText>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable onPress={() => router.push('/settings')} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
                <IconSymbol name="gearshape.fill" size={22} color={palette.icon} />
              </Pressable>
            </View>
          </View>
        </View>
        <View style={[styles.content, { flex: 1, paddingBottom: 0 }]}> 
          <View style={{ flex: 1 }}>
            <Fridge
              accessToken={accessToken ?? undefined}
              onEditQuantity={(id, qty) => {
                if (!accessToken) return;
                return updateInventoryQuantity(accessToken, id, qty);
              }}
              onConsume={(id, delta, reason) => {
                if (!accessToken) return;
                return consumeInventoryItem(accessToken, id, delta, reason);
              }}
              onDelete={(id) => {
                if (!accessToken) return;
                return deleteInventoryItem(accessToken, id);
              }}
            />
          </View>
        </View>
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
    paddingTop: 10,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 24,
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
  fridgeCard: {
    gap: 12,
  },
  settingsCard: {
    gap: 12,
  },
});
