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
    "name": "Product name (required)",
    "quantity": "Numeric value (required)",
    "base_unit": "One of: g, kg, oz, lb, ml, L, pieces (required)",
    "display_unit": "Optional display unit like 'tub', 'carton', 'clamshell'",
    "units_per_display": "Numeric value if display_unit is provided",
    "est_expiry_date": "ISO datetime string (MUST be a future date after {today})",
    "cost_estimate": "Numeric value if available",
    "allergens": ["List of allergens from the data"],
    "categories": ["List of categories from the data"]
}}

Rules:
1. Extract quantity and unit from the 'quantity' field (e.g., "1.3 oz, 37g" -> quantity: 37, base_unit: "g")
2. If quantity contains multiple units, prefer the metric unit (g, kg, ml, L)
3. Estimate expiry date based on product type (ALWAYS ADD DAYS TO TODAY'S DATE {today}):
   - Fresh produce: {today} + 3-7 days
   - Dairy: {today} + 5-10 days
   - Packaged goods: {today} + 30-90 days
   - Frozen: {today} + 90-365 days
   - Canned goods: {today} + 365-730 days
4. Convert allergens to lowercase and standardize format
5. If no quantity is available, estimate based on typical serving sizes
6. Return only valid JSON, no additional text
7. CRITICAL: Expiry date must be in the future, not in the past

Example conversion for today ({today}):
Input: {{"quantity": "1.3 oz, 37g", "name": "Greek Yogurt"}}
Output: {{"name": "Greek Yogurt", "quantity": 37, "base_unit": "g", "est_expiry_date": "2025-01-05T00:00:00Z"}}
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

# Global instance
gemini_processor = GeminiInventoryProcessor()
