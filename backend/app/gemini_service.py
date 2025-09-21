"""Gemini AI service for processing barcode data into inventory format."""
import os
import json
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

class GeminiInventoryProcessor:
    def __init__(self):
        api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY not found in environment variables")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
    
    def process_barcode_to_inventory(self, barcode_data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert barcode product data to inventory item format."""
        from datetime import datetime
        today = datetime.now().strftime('%Y-%m-%d')
        
        prompt = f"""
You are a food inventory management assistant. Convert the following barcode product data into a structured inventory item format suitable for a MongoDB database.

TODAY'S DATE: {today}

Barcode Data:
{json.dumps(barcode_data, indent=2)}

Please extract and convert this data into the following JSON format:
{{
    "name": "Product name (required) - use the most descriptive name from product_name or brands",
    "quantity": "Numeric value (required) - total quantity in the package",
    "base_unit": "One of: g, kg, oz, lb, ml, L, pieces (required)",
    "est_expiry_date": "ISO datetime string (MUST be a future date after {today})",
    "cost_estimate": "Numeric value if available",
    "allergens": ["List of allergens from the data"],
    "categories": ["List of categories from the data"]
}}

Rules:
1. NAME: Use the most descriptive name available:
   - If product_name exists and is meaningful, use it
   - If product_name is generic, combine with brand: "Brand Product Name"
   - If only brand exists, use brand name
   - Clean up the name (remove extra spaces, standardize capitalization)

2. QUANTITY: Extract the total quantity in the package:
   - Look for quantity field (e.g., "1.3 oz, 37g" -> quantity: 37)
   - If multiple units, prefer metric (g, kg, ml, L) over imperial
   - If no quantity field, estimate based on typical package sizes for the product type
   - For single items (like "1 bottle"), use quantity: 1 with base_unit: "pieces"
   - Remember to convert the quantity to a reasonable number based on the base unit used

3. Estimate expiry date based on product type, MAKE IT ACCURATE (ALWAYS ADD DAYS TO TODAY'S DATE {today}):
   - Fresh produce: {today} + 3-7 days
   - Dairy products: {today} + 5-10 days
   - Packaged goods: {today} + 30-90 days
   - Frozen items: {today} + 90-365 days
   - Canned goods: {today} + 365-730 days
   - Dry goods: {today} + 180-365 days

4. Convert allergens to lowercase and standardize format
5. Return only valid JSON, no additional text
6. CRITICAL: Expiry date must be in the future, not in the past
7. EVEN MORE CRITICAL: Never say some nonsense like 500 for the quantity and bottles for the units

Example conversions for today ({today}):
Input: {{"quantity": "1.3 oz, 37g", "product_name": "Greek Yogurt", "brands": "Chobani"}}
Output: {{"name": "Chobani Greek Yogurt", "quantity": 37, "base_unit": "g", "display_unit": "tub", "units_per_display": 1, "est_expiry_date": "2025-01-05T00:00:00Z"}}

Input: {{"product_name": "Organic Spinach", "quantity": "5 oz"}}
Output: {{"name": "Organic Spinach", "quantity": 5, "base_unit": "oz", "display_unit": "bag", "units_per_display": 1, "est_expiry_date": "2025-01-03T00:00:00Z"}}

Input: {{"product_name": "Water", "quantity": "500ml"}}
Output: {{"name": "Water", "quantity": 500, "base_unit": "ml", "display_unit": "bottle", "units_per_display": 1, "est_expiry_date": "2025-01-10T00:00:00Z"}}

Input: {{"product_name": "Coca Cola", "quantity": "330ml"}}
Output: {{"name": "Coca Cola", "quantity": 330, "base_unit": "ml", "display_unit": "can", "units_per_display": 1, "est_expiry_date": "2025-01-15T00:00:00Z"}}
"""

        try:
            response = self.model.generate_content(prompt)
            result_text = response.text.strip()
            
            # Clean up the response to ensure it's valid JSON
            if result_text.startswith('```json'):
                result_text = result_text[7:]
            if result_text.endswith('```'):
                result_text = result_text[:-3]
            
            result_text = result_text.strip()
            
            # Parse the JSON response
            inventory_data = json.loads(result_text)
            
            # Add metadata
            inventory_data['input_date'] = datetime.utcnow().isoformat() + 'Z'
            inventory_data['remaining_quantity'] = inventory_data.get('quantity', 1.0)
            inventory_data['status'] = 'active'
            
            return inventory_data
            
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse Gemini response as JSON: {e}")
        except Exception as e:
            raise ValueError(f"Gemini processing failed: {e}")
    
    def generate_recipe_from_inventory(self, inventory_items: list) -> Dict[str, Any]:
        """Generate a recipe based on available inventory items."""
        
        # Format inventory items for the prompt
        items_text = "\n".join([
            f"- {item.get('name', 'Unknown')} ({item.get('quantity', 1)} {item.get('baseUnit', 'pieces')})"
            for item in inventory_items
        ])
        
        prompt = f"""
You are a creative cooking assistant. Generate a delicious recipe using the following ingredients from someone's fridge:

Available Ingredients:
{items_text}

Please create a recipe in the following JSON format:
{{
    "name": "Creative recipe name (required)",
    "description": "Brief description of the dish (required)",
    "ingredients": [
        "List of ingredients with quantities (required)"
    ],
    "instructions": [
        "Step-by-step cooking instructions (required)"
    ],
    "cooking_time_minutes": "Estimated cooking time in minutes (optional)",
    "difficulty": "One of: easy, medium, hard (optional, default: easy)",
    "servings": "Number of servings (optional)",
    "tags": ["List of tags like 'quick', 'vegetarian', 'breakfast', etc. (optional)"]
}}

Rules:
1. Use as many of the available ingredients as possible
2. Add common pantry staples (salt, pepper, oil, etc.) as needed
3. Keep instructions clear and simple
4. Make the recipe practical and delicious
5. Include cooking time if it's a quick recipe (under 30 minutes)
6. Add appropriate tags for categorization
7. Return only valid JSON, no additional text

Example:
Input: [{{"name": "Spinach", "quantity": 2, "baseUnit": "pieces"}}, {{"name": "Eggs", "quantity": 4, "baseUnit": "pieces"}}]
Output: {{"name": "Spinach Omelette", "description": "A quick, protein-packed breakfast with fresh spinach and cheese.", "ingredients": ["2 eggs", "1 cup spinach", "2 tbsp shredded cheese", "1 tbsp olive oil", "Salt and pepper"], "instructions": ["Whisk eggs with salt and pepper.", "Sauté spinach in olive oil until wilted.", "Pour eggs, sprinkle cheese, fold and cook through."], "cooking_time_minutes": 10, "difficulty": "easy", "servings": 2, "tags": ["breakfast", "quick", "protein"]}}
"""

        try:
            response = self.model.generate_content(prompt)
            result_text = response.text.strip()
            
            # Clean up the response to ensure it's valid JSON
            if result_text.startswith('```json'):
                result_text = result_text[7:]
            if result_text.endswith('```'):
                result_text = result_text[:-3]
            
            result_text = result_text.strip()
            
            # Parse the JSON response
            recipe_data = json.loads(result_text)
            
            # Add default values for optional fields
            recipe_data.setdefault('cooking_time_minutes', None)
            recipe_data.setdefault('difficulty', 'easy')
            recipe_data.setdefault('servings', None)
            recipe_data.setdefault('tags', [])
            recipe_data.setdefault('image_url', None)
            
            # Generate image for the recipe
            try:
                image_url = self.generate_recipe_image(recipe_data['name'], recipe_data['description'])
                recipe_data['image_url'] = image_url
            except Exception as e:
                print(f"Failed to generate recipe image: {e}")
                # Continue without image if generation fails
            
            return recipe_data
            
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse Gemini recipe response as JSON: {e}")
        except Exception as e:
            raise ValueError(f"Gemini recipe generation failed: {e}")

    def generate_recipe_image(self, recipe_name: str, recipe_description: str) -> Optional[str]:
        """Generate an actual food image via Nano Banana text-to-image.

        Attempts to call a Nano Banana generation endpoint using a rich prompt
        constructed from the recipe name and description. Returns a direct image
        URL if successful, otherwise None.
        """
        try:
            import requests
            
            base_url = os.getenv("NANO_BANANA_API_URL", "http://api.nanobanana.com")
            api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

            # Compose a concise food-photo prompt
            prompt = (
                f"High-quality appetizing food photograph of: {recipe_name}. "
                f"Description: {recipe_description}. Professional lighting, natural colors, clean background, close-up composition."
            )

            headers = {"Content-Type": "application/json"}
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"

            payload = {
                "prompt": prompt,
                "width": 400,
                "height": 300,
                "guidance": 7.0
            }

            # Try common generation endpoints
            candidate_paths = [
                "/v1/images/generate",
                "/v1/generate",
                "/generate"
            ]

            for path in candidate_paths:
                url = f"{base_url.rstrip('/')}{path}"
                try:
                    resp = requests.post(url, headers=headers, json=payload, timeout=20)
                except Exception:
                    continue
                if resp.status_code >= 200 and resp.status_code < 300:
                    try:
                        data = resp.json()
                    except Exception:
                        continue
                    # Flexible parsing for different response shapes
                    image_url = (
                        data.get("url")
                        or data.get("image_url")
                        or (data.get("data") or {}).get("url")
                        or (data.get("result") or {}).get("image_url")
                    )
                    if image_url:
                        return image_url

            # If all attempts failed, return None to indicate no image
            return None

        except Exception as e:
            print(f"Error generating recipe image: {e}")
            return None

# Global instance
gemini_processor = GeminiInventoryProcessor()
