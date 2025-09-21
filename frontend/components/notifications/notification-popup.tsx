import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, Animated } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { fetchNotifications, Notification } from '@/services/api';

interface NotificationPopupProps {
  accessToken?: string;
  onClose: () => void;
}

export function NotificationPopup({ accessToken, onClose }: NotificationPopupProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    const loadNotifications = async () => {
      try {
        const response = await fetchNotifications(accessToken);
        setNotifications(response.notifications);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [accessToken]);

  useEffect(() => {
    if (notifications.length > 0) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [notifications, fadeAnim]);

  const currentNotification = notifications[currentIndex];

  const handleNext = () => {
    if (currentIndex < notifications.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (loading) {
    return (
      <Modal transparent animationType="fade" visible={true}>
        <View style={styles.modalBackdrop}>
          <SurfaceCard style={styles.modalCard}>
            <ThemedText>Loading notifications...</ThemedText>
          </SurfaceCard>
        </View>
      </Modal>
    );
  }

  if (notifications.length === 0) {
    return null;
  }

  return (
    <Modal transparent animationType="fade" visible={true}>
      <View style={styles.modalBackdrop}>
        <Animated.View style={[styles.modalContainer, { opacity: fadeAnim }]}>
          <SurfaceCard style={styles.modalCard}>
            <View style={styles.header}>
              <IconSymbol 
                name="bell.fill" 
                size={24} 
                color={currentNotification?.priority === 'high' ? Colors.light.danger : Colors.light.tint} 
              />
              <ThemedText type="subtitle" style={styles.title}>
                {currentNotification?.priority === 'high' ? 'Urgent!' : 'Reminder'}
              </ThemedText>
            </View>

            <View style={styles.content}>
              <ThemedText type="title" style={styles.notificationTitle}>
                {currentNotification?.title}
              </ThemedText>
              <ThemedText style={styles.notificationBody}>
                {currentNotification?.body}
              </ThemedText>
            </View>

            <View style={styles.footer}>
              <View style={styles.progress}>
                <ThemedText style={styles.progressText}>
                  {currentIndex + 1} of {notifications.length}
                </ThemedText>
              </View>
              
              <View style={styles.actions}>
                <Pressable onPress={handleSkip} style={styles.skipButton}>
                  <ThemedText style={styles.skipButtonText}>Skip</ThemedText>
                </Pressable>
                <Pressable onPress={handleNext} style={styles.nextButton}>
                  <ThemedText style={styles.nextButtonText}>
                    {currentIndex < notifications.length - 1 ? 'Next' : 'Done'}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </SurfaceCard>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
  },
  modalCard: {
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    color: Colors.light.tint,
  },
  content: {
    gap: 8,
  },
  notificationTitle: {
    color: Colors.light.text,
  },
  notificationBody: {
    color: Colors.light.subtleText,
    lineHeight: 20,
  },
  footer: {
    gap: 12,
  },
  progress: {
    alignItems: 'center',
  },
  progressText: {
    fontSize: 12,
    color: Colors.light.subtleText,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.light.cardMuted,
    alignItems: 'center',
  },
  skipButtonText: {
    color: Colors.light.subtleText,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
  },
  nextButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
