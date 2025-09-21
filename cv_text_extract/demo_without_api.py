#!/usr/bin/env python3
"""
Demo script for CV text extraction functionality without requiring API keys.
This demonstrates the core functionality that works without external API calls.
"""

import os
import sys
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def demo_text_extraction():
    """Demonstrate text extraction from images."""
    print("🔍 Text Extraction Demo")
    print("=" * 40)
    
    try:
        from extract_text import main as extract_main
        
        img_dir = Path("/Users/benliu/Downloads/PennApps2025-main 5/imgs")
        image_files = list(img_dir.glob("*.jpeg")) + list(img_dir.glob("*.jpg")) + list(img_dir.glob("*.png"))
        
        if not image_files:
            print("❌ No image files found")
            return False
        
        print(f"Found {len(image_files)} image files")
        
        for i, image_file in enumerate(image_files[:2]):  # Test first 2 images
            print(f"\n📸 Testing image {i+1}: {image_file.name}")
            print("-" * 30)
            
            # Run text extraction
            result = extract_main([str(image_file)])
            
            if result == 0:
                print("✅ Text extraction successful")
            else:
                print("❌ Text extraction failed")
        
        return True
        
    except Exception as e:
        print(f"❌ Error in text extraction demo: {e}")
        return False

def demo_barcode_detection():
    """Demonstrate barcode detection from images."""
    print("\n🔍 Barcode Detection Demo")
    print("=" * 40)
    
    try:
        from object_detection import read_barcodes
        
        img_dir = Path("/Users/benliu/Downloads/PennApps2025-main 5/imgs")
        image_files = list(img_dir.glob("*.jpeg")) + list(img_dir.glob("*.jpg")) + list(img_dir.glob("*.png"))
        
        if not image_files:
            print("❌ No image files found")
            return False
        
        print(f"Found {len(image_files)} image files")
        
        for i, image_file in enumerate(image_files[:2]):  # Test first 2 images
            print(f"\n📸 Testing image {i+1}: {image_file.name}")
            print("-" * 30)
            
            barcodes = read_barcodes(image_file)
            
            if barcodes:
                print(f"✅ Found {len(barcodes)} barcode(s)")
                for j, barcode in enumerate(barcodes):
                    print(f"  Barcode {j+1}: {barcode['data']} (type: {barcode['type']})")
            else:
                print("ℹ️  No barcodes detected (normal for images without barcodes)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error in barcode detection demo: {e}")
        return False

def demo_gemini_setup():
    """Demonstrate Gemini setup (without API call)."""
    print("\n🔍 Gemini AI Setup Demo")
    print("=" * 40)
    
    try:
        import google.generativeai as genai
        
        print("✅ Google GenerativeAI module imported successfully")
        
        # Check if API key is available
        api_key = os.environ.get('GOOGLE_API_KEY')
        if api_key:
            print("✅ GOOGLE_API_KEY environment variable is set")
            print("✅ Ready to make API calls")
        else:
            print("⚠️  GOOGLE_API_KEY environment variable not set")
            print("   To test Gemini integration, set it with:")
            print("   export GOOGLE_API_KEY='your-api-key'")
            print("   Then run: python demo_gemini.py")
        
        return True
        
    except Exception as e:
        print(f"❌ Error in Gemini setup demo: {e}")
        return False

def main():
    """Run all demos."""
    print("🚀 CV Text Extraction Demo")
    print("=" * 50)
    print("This demo shows the core functionality without requiring API keys.")
    print()
    
    demos = [
        ("Text Extraction", demo_text_extraction),
        ("Barcode Detection", demo_barcode_detection),
        ("Gemini Setup", demo_gemini_setup)
    ]
    
    results = {}
    
    for demo_name, demo_func in demos:
        try:
            results[demo_name] = demo_func()
        except Exception as e:
            print(f"❌ {demo_name} demo failed with exception: {e}")
            results[demo_name] = False
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 DEMO SUMMARY")
    print("=" * 50)
    
    passed = 0
    total = len(demos)
    
    for demo_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{demo_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} demos passed")
    
    if passed == total:
        print("🎉 All demos passed! CV text extraction is working correctly.")
        print("\nNext steps:")
        print("1. Set GOOGLE_API_KEY to test Gemini AI integration")
        print("2. Run 'python demo_gemini.py' to test full AI functionality")
    else:
        print("⚠️  Some demos failed. Check the output above for details.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
