import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets, useSafeAreaFrame } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { SurfaceCard } from '@/components/ui/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

export type Recipe = {
    name: string;
    description: string;
    ingredients: string[];
    instructions: string[];
    image?: string | null;
};

type RecipesProps = {
    recipes: Recipe[];
};

export default function Recipes({ recipes }: RecipesProps) {
    const insets = useSafeAreaInsets();
    const safeFrame = useSafeAreaFrame();
    const baseHorizontalPadding = 16; // base page padding inside the carousel
    const [measuredContainerWidth, setMeasuredContainerWidth] = useState<number | null>(null);
    const containerWidth = measuredContainerWidth ?? Math.max(0, safeFrame.width);
    const cardWidth = Math.max(0, containerWidth);

    const data = useMemo(() => recipes.slice(0, 3), [recipes]);
    const [active, setActive] = useState<Recipe | null>(null);
    const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

    if (!data || data.length === 0) return null;

    function renderItem({ item, index }: { item: Recipe; index: number }) {
        const showImage = !!item.image && !failedImages[item.name];
        return (
            <SurfaceCard
                style={[
                    styles.card,
                    { width: Math.round(cardWidth), marginRight: index === data.length - 1 ? 0 : baseHorizontalPadding },
                ]}
                onPress={() => setActive(item)}
            >
                <View style={styles.row}>
                    <View style={styles.thumbBox}>
                        {showImage ? (
                            <Image
                                source={{ uri: item.image || undefined }}
                                style={styles.thumb}
                                contentFit="cover"
                                transition={150}
                                onError={() => setFailedImages((prev) => ({ ...prev, [item.name]: true }))}
                            />
                        ) : (
                            <IconSymbol name="photo" size={22} color={Colors.light.icon} />
                        )}
                    </View>
                    <View style={styles.textStack}>
                        <ThemedText
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={styles.title}
                        >
                            {item.name}
                        </ThemedText>
                        <ThemedText
                            numberOfLines={2}
                            ellipsizeMode="tail"
                            style={styles.description}
                        >
                            {item.description}
                        </ThemedText>
                    </View>
                </View>
            </SurfaceCard>
        );
    }

    const snapOffsets = useMemo(() => {
        return data.map((_, i) => baseHorizontalPadding + i * (cardWidth + baseHorizontalPadding));
    }, [data, cardWidth]);

    return (
        <SafeAreaView style={{ paddingTop: 4}} edges={['left', 'right']}>
            <View onLayout={({ nativeEvent }) => setMeasuredContainerWidth(nativeEvent.layout.width)}>
            <FlatList
                data={data}
                keyExtractor={(it) => it.name}
                renderItem={renderItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToAlignment="start"
                decelerationRate="fast"
                snapToInterval={Math.round(cardWidth) + baseHorizontalPadding}
                contentContainerStyle={{ paddingHorizontal: 0 }}
            />
            </View>

            <Modal
                animationType="fade"
                visible={!!active}
                onRequestClose={() => setActive(null)}
                transparent={false}
                presentationStyle="fullScreen"
            >
                <SafeAreaView style={[styles.modalRoot, { paddingTop: insets.top, paddingBottom: insets.bottom }]} edges={['left', 'right']}>
                    {/* Header */}
                    <View style={[styles.modalHeader, { paddingHorizontal: baseHorizontalPadding }] }>
                        <Pressable onPress={() => setActive(null)} hitSlop={12} style={({ pressed }) => [styles.closeBtn, pressed ? { opacity: 0.7 } : undefined] }>
                            <IconSymbol name="xmark" size={22} color={Colors.light.icon} />
                        </Pressable>
                    </View>

                    {/* Body */}
                    <ScrollView
                        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={{ paddingHorizontal: baseHorizontalPadding }}>
                            <View style={styles.heroImageBox}>
                                {!!active && active.image && !failedImages[active.name] ? (
                                    <Image
                                        source={{ uri: active.image || undefined }}
                                        style={styles.heroImage}
                                        contentFit="cover"
                                        transition={200}
                                        onError={() => setFailedImages((prev) => ({ ...prev, [active.name]: true }))}
                                    />
                                ) : (
                                    <View style={styles.heroPlaceholder}>
                                        <IconSymbol name="photo" size={36} color={Colors.light.icon} />
                                    </View>
                                )}
                            </View>

                            <ThemedText type="subtitle" style={{ marginTop: 16 }}>{active?.name}</ThemedText>
                            {!!active?.description && (
                                <ThemedText style={{ color: Colors.light.subtleText, marginTop: 6 }}>
                                    {active.description}
                                </ThemedText>
                            )}

                            {!!active?.ingredients?.length && (
                                <View style={{ marginTop: 16 }}>
                                    <ThemedText style={styles.sectionLabel}>Ingredients</ThemedText>
                                    {active.ingredients.map((ing, idx) => (
                                        <ThemedText key={`ing-${idx}`} style={styles.bullet}>• {ing}</ThemedText>
                                    ))}
                                </View>
                            )}

                            {!!active?.instructions?.length && (
                                <View style={{ marginTop: 16, marginBottom: 8 }}>
                                    <ThemedText style={styles.sectionLabel}>Instructions</ThemedText>
                                    {active.instructions.map((step, idx) => (
                                        <ThemedText key={`step-${idx}`} style={styles.numbered}>{idx + 1}. {step}</ThemedText>
                                    ))}
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    card: {
        height: 116,
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    thumbBox: {
        width: 92,
        height: 92,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: Colors.light.cardMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    thumb: {
        width: '100%',
        height: '100%',
    },
    textStack: {
        flex: 1,
        minWidth: 0,
        justifyContent: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    description: {
        marginTop: 4,
        color: Colors.light.subtleText,
    },

    modalRoot: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    modalHeader: {
        height: 44,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    closeBtn: {
        padding: 8,
    },

    heroImageBox: {
        width: '100%',
        height: 240,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: Colors.light.cardMuted,
        marginTop: 4,
    },
    heroImage: {
        width: '100%',
        height: '100%',
        backgroundColor: Colors.light.cardMuted,
    },
    heroPlaceholder: {
        flex: 1,
        backgroundColor: Colors.light.cardMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionLabel: {
        fontWeight: '700',
        fontSize: 12,
        marginBottom: 4,
    },
    bullet: {
        marginTop: 4,
    },
    numbered: {
        marginTop: 4,
    },
});