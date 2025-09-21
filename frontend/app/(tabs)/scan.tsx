import { useMemo, useState } from 'react';
import { StyleSheet, View, Pressable, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuthContext } from '@/context/AuthContext';
import Fridge from '@/components/home/fridge';
import { consumeInventoryItem, deleteInventoryItem, updateInventoryQuantity, fetchInventoryItems, generateRecipe } from '@/services/api';

const palette = Colors.light;

export default function ScanScreen() {
  const { user, accessToken } = useAuthContext();
  const [showRecipePopup, setShowRecipePopup] = useState(false);
  const [showRecipes, setShowRecipes] = useState(false);
  const [recipes, setRecipes] = useState<string[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  
  const displayName = useMemo(() => {
    if (user?.name) return user.name.split(' ')[0];
    if (user?.email) return user.email.split('@')[0];
    return 'neighbor';
  }, [user]);

  const handleBookPress = () => {
    setShowRecipePopup(true);
  };

  const generateRecipes = async () => {
    if (!accessToken) return;
    
    setLoadingRecipes(true);
    setShowRecipePopup(false); // Close the popup
    
    try {
      // Get current inventory items
      const inventoryResponse = await fetchInventoryItems(accessToken);
      const items = inventoryResponse.items;
      
      if (items.length === 0) {
        setRecipes(['No items in your fridge to generate recipes from!']);
        setShowRecipes(true);
        return;
      }
      
      // Format inventory items for recipe generation
      const inventoryItems = items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        baseUnit: item.baseUnit
      }));
      
      // Generate recipe using Gemini
      const result = await generateRecipe(accessToken, inventoryItems);
      
      if (result.success && result.recipe) {
        const recipe = result.recipe;
        const recipeText = `🍳 ${recipe.name}: ${recipe.description}\n\nIngredients:\n${recipe.ingredients.map(ing => `• ${ing}`).join('\n')}\n\nInstructions:\n${recipe.instructions.map((step, i) => `${i + 1}. ${step}`).join('\n')}${recipe.cooking_time_minutes ? `\n\n⏱️ Ready in ${recipe.cooking_time_minutes} minutes` : ''}\n\n✅ Recipe saved to your collection!`;
        setRecipes([recipeText]);
      } else {
        setRecipes([`Failed to generate recipe: ${result.error || 'Unknown error'}`]);
      }
      
      setShowRecipes(true);
    } catch (error) {
      console.error('Failed to generate recipes:', error);
      setRecipes(['Failed to generate recipes. Please try again.']);
      setShowRecipes(true);
    } finally {
      setLoadingRecipes(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}> 
      <View style={[styles.container, { backgroundColor: palette.background }]}> 
        <View style={[styles.content]}>
          <View style={styles.header}>
            <View>
              <ThemedText type="title">Fridge</ThemedText>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable 
                onPress={handleBookPress} 
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              > 
                <IconSymbol name="book.fill" size={22} color={palette.tint} />
              </Pressable>
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

        {/* Recipe Generation Popup */}
        <Modal transparent animationType="fade" visible={showRecipePopup} onRequestClose={() => setShowRecipePopup(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">🍳 Generate Recipe</ThemedText>
                <Pressable onPress={() => setShowRecipePopup(false)} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
                  <IconSymbol name="xmark" size={18} color={palette.icon} />
                </Pressable>
              </View>
              
              <ThemedText style={styles.popupText}>
                Generate a personalized recipe using ingredients from your current inventory!
              </ThemedText>
              
              <View style={styles.popupActions}>
                <Pressable 
                  onPress={() => setShowRecipePopup(false)} 
                  style={({ pressed }) => [styles.cancelButton, { opacity: pressed ? 0.8 : 1 }]}
                >
                  <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                </Pressable>
                <Pressable 
                  onPress={generateRecipes} 
                  style={({ pressed }) => [styles.generateButton, { opacity: pressed ? 0.8 : 1 }]}
                >
                  <ThemedText style={styles.generateButtonText}>Generate Recipe</ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Recipe Generation Modal */}
        <Modal transparent animationType="fade" visible={showRecipes} onRequestClose={() => setShowRecipes(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">🍳 Recipe Ideas</ThemedText>
                <Pressable onPress={() => setShowRecipes(false)} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
                  <IconSymbol name="xmark" size={18} color={palette.icon} />
                </Pressable>
              </View>
              
              {loadingRecipes ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={palette.tint} />
                  <ThemedText style={styles.loadingText}>Generating recipes...</ThemedText>
                </View>
              ) : (
                <View style={styles.recipesList}>
                  {recipes.map((recipe, index) => (
                    <SurfaceCard key={index} style={styles.recipeCard}>
                      <ThemedText style={styles.recipeText}>{recipe}</ThemedText>
                    </SurfaceCard>
                  ))}
                </View>
              )}
              
              <Pressable 
                onPress={() => setShowRecipes(false)} 
                style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.8 : 1 }]}
              >
                <ThemedText style={styles.closeButtonText}>Close</ThemedText>
              </Pressable>
            </View>
          </View>
        </Modal>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: palette.card,
    borderRadius: 12,
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  loadingText: {
    color: palette.subtleText,
  },
  recipesList: {
    gap: 12,
  },
  recipeCard: {
    padding: 12,
  },
  recipeText: {
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: palette.tint,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  popupText: {
    fontSize: 16,
    color: palette.subtleText,
    textAlign: 'center',
    marginVertical: 16,
  },
  popupActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: palette.cardMuted,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: palette.text,
    fontWeight: '600',
  },
  generateButton: {
    flex: 1,
    backgroundColor: palette.tint,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
