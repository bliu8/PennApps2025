import { API_BASE_URL } from '@/utils/env';
import { ImpactResponse } from '@/types/impact';

function buildHeaders(accessToken: string, init?: HeadersInit): Headers {
  if (!accessToken) {
    throw new Error('Authentication required. Sign in to continue.');
  }

  const headers = new Headers(init ?? {});
  headers.set('Authorization', `Bearer ${accessToken}`);
  return headers;
}

export async function fetchImpactMetrics(accessToken: string): Promise<ImpactResponse> {
  const response = await fetch(`${API_BASE_URL}/impact`, {
    headers: buildHeaders(accessToken),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to load impact metrics (${response.status})`);
  }

  const data = await response.json();
  return data as ImpactResponse;
}

// Inventory management endpoints
export async function updateInventoryQuantity(accessToken: string, itemId: string, newQuantity: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/inventory/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    headers: buildHeaders(accessToken, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ quantity: newQuantity }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update quantity: ${response.status}`);
  }
}

export async function consumeInventoryItem(
  accessToken: string,
  itemId: string,
  quantityDelta: number,
  reason: 'used' | 'discarded',
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/inventory/${encodeURIComponent(itemId)}/consume`, {
    method: 'POST',
    headers: buildHeaders(accessToken, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ quantity_delta: quantityDelta, reason }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to consume item: ${response.status}`);
  }
}

export async function deleteInventoryItem(accessToken: string, itemId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/inventory/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
    headers: buildHeaders(accessToken),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete item: ${response.status}`);
  }
}

// Fetch inventory items
export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  baseUnit: 'g' | 'kg' | 'oz' | 'lb' | 'ml' | 'L' | 'pieces';
  displayUnit?: string;
  unitsPerDisplay?: number;
  input_date: string; // ISO format
  est_expiry_date: string; // ISO format
}

export interface InventoryItemsResponse {
  items: InventoryItem[];
}

export async function fetchInventoryItems(accessToken: string): Promise<InventoryItemsResponse> {
  const response = await fetch(`${API_BASE_URL}/inventory`, {
    headers: buildHeaders(accessToken),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to load inventory items (${response.status})`);
  }

  const data = await response.json();
  return data as InventoryItemsResponse;
}

// Notification types and API
export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'nudge' | 'alert' | 'reminder';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  scheduled_for: string;
  sent_at?: string;
  status: 'pending' | 'sent' | 'read';
  data?: any;
}

export interface NotificationsResponse {
  notifications: Notification[];
}

export async function fetchNotifications(accessToken: string): Promise<NotificationsResponse> {
  const response = await fetch(`${API_BASE_URL}/notifications`, {
    headers: buildHeaders(accessToken),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to load notifications (${response.status})`);
  }

  const data = await response.json();
  return data as NotificationsResponse;
}

// Add to inventory from barcode
export interface AddToInventoryRequest {
  barcode_data: BarcodeProductInfo;
  barcode: string;
}

export interface AddToInventoryResponse {
  success: boolean;
  inventory_item?: any;
  error?: string;
}

// Client-side barcode scanning with TypeScript
export interface BarcodeProductInfo {
  name?: string;
  brand?: string;
  categories?: string[];
  ingredients?: string[];
  allergens?: string[];
  nutrition_grade?: string;
  image_url?: string;
  quantity?: string;
  packaging?: string[];
  serving_size?: string;
  net_weight?: string;
  gross_weight?: string;
}

export interface BarcodeScanResult {
  barcode: string;
  symbology?: string;
  product_info?: BarcodeProductInfo;
  found: boolean;
  confidence?: number;
  location?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface BarcodeScanOptions {
  formats?: string[];
  tryHarder?: boolean;
  tryInverted?: boolean;
  tryRotate?: boolean;
  trySkew?: boolean;
}

// OpenFoodFacts API integration
async function queryOpenFoodFacts(barcode: string): Promise<BarcodeProductInfo | null> {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (data.status !== 1 || !data.product) {
      return null;
    }
    
    const product = data.product;
    
    return {
      name: product.product_name || undefined,
      brand: product.brands || undefined,
      categories: product.categories_tags?.slice(0, 5) || undefined,
      ingredients: product.ingredients_text_en?.split(',').slice(0, 10) || undefined,
      allergens: product.allergens_tags || undefined,
      nutrition_grade: product.nutrition_grade_fr || undefined,
      image_url: product.image_url || undefined,
      quantity: product.quantity || undefined,
      packaging: product.packaging_tags?.slice(0, 5) || undefined,
      serving_size: product.serving_size || undefined,
      net_weight: product.net_weight || undefined,
      gross_weight: product.gross_weight || undefined,
    };
  } catch (error) {
    console.error('Error querying OpenFoodFacts:', error);
    return null;
  }
}

// Add barcode product to inventory using Gemini processing
export async function addBarcodeToInventory(
  accessToken: string,
  barcode: string,
  productInfo: BarcodeProductInfo
): Promise<AddToInventoryResponse> {
  const response = await fetch(`${API_BASE_URL}/inventory/add-from-barcode`, {
    method: 'POST',
    headers: buildHeaders(accessToken, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      barcode_data: productInfo,
      barcode: barcode
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to add to inventory: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Barcode detection using ZXing-js library (Web only)
async function detectBarcodesFromImage(
  imageElement: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
  options: BarcodeScanOptions = {}
): Promise<BarcodeScanResult[]> {
  // Check if we're in a web environment
  if (typeof window === 'undefined') {
    throw new Error('Barcode detection is only available in web environments');
  }

  try {
    // Dynamic import of ZXing-js library
    const { BrowserMultiFormatReader } = await import('@zxing/library').catch(() => {
      throw new Error('ZXing library not available. Please install @zxing/library');
    });
    
    const reader = new BrowserMultiFormatReader();
    
    try {
      const hints = new Map();
      
      if (options.formats) {
        hints.set(reader.hints, options.formats);
      }
      
      const results = await reader.decodeFromImageElement(imageElement);
      
      if (!results) {
        return [];
      }
      
      const barcode = results.getText();
      const symbology = results.getBarcodeFormat().toString();
      
      // Query OpenFoodFacts for product information
      const productInfo = await queryOpenFoodFacts(barcode);
      
      // If no product info found, create a fallback
      const fallbackProductInfo = productInfo || {
        name: `Product ${barcode}`,
        brand: 'Unknown Brand',
        quantity: '1 item',
        categories: ['unknown'],
        allergens: []
      };
      
      return [{
        barcode,
        symbology,
        product_info: fallbackProductInfo,
        found: true, // Always true if barcode was detected, regardless of product info
        confidence: 1.0, // ZXing doesn't provide confidence scores
        location: {
          x: 0, // ZXing doesn't provide location info
          y: 0,
          width: 0,
          height: 0,
        }
      }];
    } catch (error) {
      console.error('Barcode detection error:', error);
      return [];
    } finally {
      reader.reset();
    }
  } catch (importError) {
    console.error('Failed to load ZXing library:', importError);
    throw new Error('ZXing library not available. Please install @zxing/library');
  }
}

// Main barcode scanning function
export async function scanBarcodeFromImage(
  imageElement: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
  options: BarcodeScanOptions = {}
): Promise<BarcodeScanResult[]> {
  return detectBarcodesFromImage(imageElement, options);
}

// Scan barcode from camera stream (Web only)
export async function scanBarcodeFromCamera(
  videoElement: HTMLVideoElement,
  options: BarcodeScanOptions = {}
): Promise<BarcodeScanResult[]> {
  // Check if we're in a web environment
  if (typeof window === 'undefined' || !navigator.mediaDevices) {
    throw new Error('Camera scanning is only available in web environments');
  }

  // Start camera stream
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'environment', // Use back camera
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  });
  
  videoElement.srcObject = stream;
  videoElement.play();
  
  // Wait for video to be ready
  await new Promise((resolve) => {
    videoElement.onloadedmetadata = resolve;
  });
  
  // Scan for barcodes
  const results = await detectBarcodesFromImage(videoElement, options);
  
  // Stop camera stream
  stream.getTracks().forEach(track => track.stop());
  
  return results;
}

// Legacy function for manual barcode input
export async function scanBarcode(
  accessToken: string, 
  code: string, 
  symbology?: string
): Promise<BarcodeScanResult> {
  // Validate barcode format
  if (!code.match(/^\d{8,14}$/)) {
    return {
      barcode: code,
      symbology,
      found: false,
    };
  }
  
  // Query OpenFoodFacts directly
  const productInfo = await queryOpenFoodFacts(code);
  
  return {
    barcode: code,
    symbology,
    product_info: productInfo || undefined,
    found: !!productInfo,
  };
}

// Utility function to create image element from file (Web only)
export function createImageFromFile(file: File): Promise<HTMLImageElement> {
  if (typeof window === 'undefined') {
    throw new Error('createImageFromFile is only available in web environments');
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Utility function to create image element from URL (Web only)
export function createImageFromUrl(url: string): Promise<HTMLImageElement> {
  if (typeof window === 'undefined') {
    throw new Error('createImageFromUrl is only available in web environments');
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// Recipe management endpoints
export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  image?: string;
  cooking_time_minutes?: number;
  difficulty: string;
  servings?: number;
  tags: string[];
  created_at: string;
}

export interface RecipesResponse {
  recipes: Recipe[];
}

export interface GenerateRecipeRequest {
  inventory_items: Array<{
    name: string;
    quantity: number;
    baseUnit: string;
  }>;
}

export async function fetchRecipes(accessToken: string): Promise<RecipesResponse> {
  const response = await fetch(`${API_BASE_URL}/recipes`, {
    headers: buildHeaders(accessToken),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to load recipes (${response.status})`);
  }

  const data = await response.json();
  return data as RecipesResponse;
}

export async function generateRecipe(accessToken: string, inventoryItems: Array<{name: string; quantity: number; baseUnit: string}>): Promise<{success: boolean; recipe?: Recipe; error?: string}> {
  const response = await fetch(`${API_BASE_URL}/recipes/generate`, {
    method: 'POST',
    headers: buildHeaders(accessToken, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ inventory_items: inventoryItems }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to generate recipe: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

export async function deleteRecipe(accessToken: string, recipeId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/recipes/${encodeURIComponent(recipeId)}`, {
    method: 'DELETE',
    headers: buildHeaders(accessToken),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete recipe: ${response.status}`);
  }
}
