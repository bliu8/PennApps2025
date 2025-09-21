import google.generativeai as genai
import os
from pathlib import Path

# Set up API key
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
    print("Please set GOOGLE_API_KEY or GEMINI_API_KEY environment variable or create a .env file")
    print("Set it with: export GOOGLE_API_KEY='your-api-key'")
    print("Or create a .env file with: GOOGLE_API_KEY=your-api-key or GEMINI_API_KEY=your-api-key")
    exit(1)

genai.configure(api_key=api_key)

with open('/Users/benliu/Downloads/PennApps2025-main 5/imgs/example_img3.jpeg', 'rb') as f:
    image_bytes = f.read()

prompt_string = ""
with open("/Users/benliu/Downloads/PennApps2025-main 5/cv_text_extract/prompt.txt", "r") as f:
    prompt_string = f.read()

model = genai.GenerativeModel('gemini-1.5-flash')

response = model.generate_content([
    {
        'mime_type': 'image/jpeg',
        'data': image_bytes
    },
    prompt_string
])

print(response.text)