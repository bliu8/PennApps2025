#!/usr/bin/env python3
"""
Test script for CV text extraction functionality.
Tests all components: text extraction, barcode detection, and Gemini integration.
"""

import os
import sys
import json
from pathlib import Path
import subprocess

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_dependencies():
    """Test if all required dependencies are installed."""
    print("🔍 Testing dependencies...")
    
    dependencies = {
        'pytesseract': 'pytesseract',
        'PIL': 'Pillow',
        'cv2': 'opencv-python',
        'pyzbar': 'pyzbar',
        'google.generativeai': 'google-generativeai',
        'requests': 'requests'
    }
    
    missing = []
    for module, package in dependencies.items():
        try:
            __import__(module)
            print(f"✅ {package} - OK")
        except ImportError:
            print(f"❌ {package} - MISSING")
            missing.append(package)
    
    if missing:
        print(f"\n⚠️  Missing dependencies: {', '.join(missing)}")
        print("Install with: pip install " + " ".join(missing))
        return False
    
    print("✅ All dependencies available")
    return True

def test_tesseract_installation():
    """Test if Tesseract binary is available."""
    print("\n🔍 Testing Tesseract installation...")
    
    try:
        import pytesseract
        from extract_text import find_tesseract
        
        tesseract_path = find_tesseract()
        if tesseract_path:
            print(f"✅ Tesseract found at: {tesseract_path}")
            return True
        else:
            print("❌ Tesseract binary not found")
            print("Install with: brew install tesseract")
            return False
    except Exception as e:
        print(f"❌ Error checking Tesseract: {e}")
        return False

def test_text_extraction():
    """Test text extraction on sample images."""
    print("\n🔍 Testing text extraction...")
    
    try:
        from extract_text import main as extract_main
        
        # Test with available images
        img_dir = Path("/Users/benliu/Downloads/PennApps2025-main 5/imgs")
        if not img_dir.exists():
            print("❌ Images directory not found")
            return False
        
        image_files = list(img_dir.glob("*.jpeg")) + list(img_dir.glob("*.jpg")) + list(img_dir.glob("*.png"))
        
        if not image_files:
            print("❌ No image files found for testing")
            return False
        
        print(f"Found {len(image_files)} image files to test")
        
        # Test with first image
        test_image = str(image_files[0])
        print(f"Testing with: {test_image}")
        
        # Run text extraction
        result = extract_main([test_image])
        
        if result == 0:
            print("✅ Text extraction completed successfully")
            return True
        else:
            print("❌ Text extraction failed")
            return False
            
    except Exception as e:
        print(f"❌ Error in text extraction: {e}")
        return False

def test_barcode_detection():
    """Test barcode detection functionality."""
    print("\n🔍 Testing barcode detection...")
    
    try:
        from object_detection import read_barcodes
        
        img_dir = Path("/Users/benliu/Downloads/PennApps2025-main 5/imgs")
        image_files = list(img_dir.glob("*.jpeg")) + list(img_dir.glob("*.jpg")) + list(img_dir.glob("*.png"))
        
        if not image_files:
            print("❌ No image files found for testing")
            return False
        
        # Test with first image
        test_image = image_files[0]
        print(f"Testing barcode detection with: {test_image}")
        
        barcodes = read_barcodes(test_image)
        
        if barcodes:
            print(f"✅ Found {len(barcodes)} barcode(s)")
            for i, barcode in enumerate(barcodes):
                print(f"  Barcode {i+1}: {barcode['data']} (type: {barcode['type']})")
        else:
            print("ℹ️  No barcodes detected (this is normal for images without barcodes)")
        
        print("✅ Barcode detection test completed")
        return True
        
    except Exception as e:
        print(f"❌ Error in barcode detection: {e}")
        return False

def test_gemini_integration():
    """Test Gemini AI integration."""
    print("\n🔍 Testing Gemini AI integration...")
    
    try:
        # Check if API key is available from environment or .env file
        api_key = os.environ.get('GOOGLE_API_KEY') or os.environ.get('GEMINI_API_KEY')
        
        # Try to load from .env file if not in environment
        if not api_key:
            env_file = Path(__file__).parent / '.env'
            if env_file.exists():
                try:
                    with open(env_file, 'r') as f:
                        for line in f:
                            if line.strip().startswith('GOOGLE_API_KEY=') or line.strip().startswith('GEMINI_API_KEY='):
                                api_key = line.strip().split('=', 1)[1].strip()
                                break
                except Exception as e:
                    print(f"Error reading .env file: {e}")
        
        if not api_key or api_key == 'your-api-key-here':
            print("⚠️  GOOGLE_API_KEY or GEMINI_API_KEY not set or is placeholder")
            print("Set it with: export GOOGLE_API_KEY='your-api-key'")
            print("Or create a .env file with: GOOGLE_API_KEY=your-api-key or GEMINI_API_KEY=your-api-key")
            return False
        
        print("✅ Google API key found")
        
        # Test Gemini client initialization
        import google.generativeai as genai
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        print("✅ Gemini client initialized")
        
        # Test with a sample image
        img_dir = Path("/Users/benliu/Downloads/PennApps2025-main 5/imgs")
        image_files = list(img_dir.glob("*.jpeg")) + list(img_dir.glob("*.jpg")) + list(img_dir.glob("*.png"))
        
        if not image_files:
            print("❌ No image files found for testing")
            return False
        
        test_image = image_files[0]
        print(f"Testing Gemini with: {test_image}")
        
        # Read prompt
        prompt_file = Path("/Users/benliu/Downloads/PennApps2025-main 5/cv_text_extract/prompt.txt")
        if not prompt_file.exists():
            print("❌ Prompt file not found")
            return False
        
        with open(prompt_file, 'r') as f:
            prompt_string = f.read()
        
        # Read image
        with open(test_image, 'rb') as f:
            image_bytes = f.read()
        
        # Test Gemini API call
        response = model.generate_content([
            {
                'mime_type': 'image/jpeg',
                'data': image_bytes
            },
            prompt_string
        ])
        
        print("✅ Gemini API call successful")
        print(f"Response preview: {response.text[:200]}...")
        
        # Try to parse as JSON
        try:
            result = json.loads(response.text)
            print("✅ Response is valid JSON")
            print(f"Extracted {len(result.get('items', []))} items")
        except json.JSONDecodeError:
            print("⚠️  Response is not valid JSON (this might be expected)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error in Gemini integration: {e}")
        return False

def main():
    """Run all tests."""
    print("🚀 Starting CV text extraction tests...\n")
    
    tests = [
        ("Dependencies", test_dependencies),
        ("Tesseract Installation", test_tesseract_installation),
        ("Text Extraction", test_text_extraction),
        ("Barcode Detection", test_barcode_detection),
        ("Gemini Integration", test_gemini_integration)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results[test_name] = False
    
    # Summary
    print("\n" + "="*50)
    print("📊 TEST SUMMARY")
    print("="*50)
    
    passed = 0
    total = len(tests)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! CV text extraction is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
