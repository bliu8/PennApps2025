# Install dependencies first:
#   brew install zbar
#   pip install pyzbar pillow
# pip install opencv-python matplotlib pyzbar
# pip install pyzbar opencv-python openfoodfacts
# export DYLD_LIBRARY_PATH=/opt/homebrew/lib:$DYLD_LIBRARY_PATH


"""
Robust barcode detection script.

This script will attempt to use OpenCV/Pyzbar to detect barcodes. If a
barcode is detected and looks like a numeric GTIN/EAN/UPC, it will query
Open Food Facts for product info; otherwise it will print the decoded text.

Dependencies:
  brew install zbar
  pip install pyzbar pillow opencv-python openfoodfacts

Usage:
  python object_detection.py /path/to/image.jpg
"""

from pathlib import Path
import sys
import argparse
import json
import requests


try:
    import cv2
except Exception:
    cv2 = None

try:
    from pyzbar.pyzbar import decode
except Exception:
    print("pyzbar import failed. Ensure 'pyzbar' is installed and the native 'zbar' library is available.", file=sys.stderr)
    print("On macOS: brew install zbar", file=sys.stderr)
    print("Then: pip install pyzbar", file=sys.stderr)
    sys.exit(1)

try:
    from PIL import Image
except Exception:
    Image = None

try:
    from openfoodfacts import Product
except Exception:
    Product = None


def decode_with_cv2(path: Path):
    # Use OpenCV if available
    if cv2 is None:
        return []
    img = cv2.imread(str(path))
    if img is None:
        return []
    # pyzbar.decode accepts numpy arrays
    return decode(img)


def decode_with_pillow(path: Path):
    if Image is None:
        return []
    img = Image.open(path)
    return decode(img)


def read_barcodes(image_path: Path):
    # Try cv2 first, then PIL
    decoded = decode_with_cv2(image_path)
    if not decoded:
        print("OpenCV decode failed or no barcodes found; trying PIL...", file=sys.stderr)
        decoded = decode_with_pillow(image_path)
    results = []
    for d in decoded:
        results.append({
            "data": d.data.decode('utf-8', errors='replace'),
            "type": d.type,
            "rect": {"left": d.rect.left, "top": d.rect.top, "width": d.rect.width, "height": d.rect.height},
            "polygon": [{"x": p.x, "y": p.y} for p in getattr(d, 'polygon', [])],
            "quality": getattr(d, 'quality', None),
        })
    return results


# def query_openfoodfacts(barcode: str):
#     if Product is None:
#         print("OpenFoodFacts client not installed; skipping product lookup.")
#         return None
#     try:
#         product = Product.get(barcode)
#     except Exception:
#         return None
#     if not product or product.get("status") != 1:
#         return None
#     return product.get("product")
def query_openfoodfacts(barcode):
    url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
    resp = requests.get(url)
    if resp.status_code != 200:
        return None
    data = resp.json()
    if data.get("status") != 1:
        return None
    return data.get("product")


def get_product_json(image_path, output_path=None):
    """
    Decodes barcodes from an image file, queries Open Food Facts, and 
    writes all data (barcode + product info) to a single JSON file.

    Args:
        image_path (str or Path): The path to the image file.
        output_path (str or Path, optional): The directory where the JSON file 
            should be saved. If None, the JSON is saved next to the image.
    """
    # Ensure image_path is a Path object for consistent handling
    image_path = Path(image_path)

    if not image_path.exists():
        print(f"Image not found: {image_path}", file=sys.stderr)
        return

    # --- Barcode Processing ---
    barcodes = read_barcodes(image_path)
    if not barcodes:
        print("No barcodes detected.")
        return

    # --- Query OpenFoodFacts and Augment Barcode Data ---
    # The 'barcodes' list will be augmented/modified in this loop.
    for b in barcodes:
        data = b['data']
        
        # Initialize the product info key
        b['product_info'] = None

        if data.isdigit() and 8 <= len(data) <= 14:
            product = query_openfoodfacts(data)
            
            if product:
                # Store the product info dictionary directly inside the barcode dictionary 'b'
                b['product_info'] = product
                print(f'\nProduct found for {data}')
                # NOTE: You can uncomment this line for immediate console output of the product JSON
                # print(json.dumps(product, indent=2))
            else:
                print(f'No product found for barcode {data}')
        else:
            print(f"Decoded (non-numeric): {data}")
            # Optional: Add a note when skipping the lookup
            b['product_info'] = {"note": "Decoded data is non-numeric, skipping OpenFoodFacts lookup."}

    # --- Prepare Final Output Structure ---
    # We create a final dictionary that contains all the results and metadata
    final_output_data = {
        "image_file": image_path.name,
        "barcodes": barcodes  # This now contains the augmented data
    }

    # Print the FINAL structure containing all data to the console
    json.dumps(final_output_data, indent=2)

    # --- Determine Write Path ---
    if output_path is None:
        final_out_path = image_path.with_suffix('.json')
    else:
        output_dir = Path(output_path)
        output_dir.mkdir(parents=True, exist_ok=True)
        json_filename = image_path.stem + '.json'
        final_out_path = output_dir / json_filename

    # --- Write Results to File ---
    try:
        # Write the augmented 'final_output_data' to the file
        final_out_path.write_text(json.dumps(final_output_data, indent=2), encoding='utf-8')
        print(f"Wrote complete JSON output to: {final_out_path}")
    except Exception as e:
        print(f"Failed to write JSON output: {e}", file=sys.stderr)



if __name__ == '__main__':
    get_product_json("/Users/burakayyorgun/Documents/gitclones/PennApps2025/imgs/example_img5.jpeg", "/Users/burakayyorgun/Documents/gitclones/PennApps2025/output")
