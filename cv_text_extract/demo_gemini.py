from google.genai import types
from google import genai
with open('/Users/burakayyorgun/Documents/gitclones/PennApps2025/example_img3.jpeg', 'rb') as f:
    image_bytes = f.read()
client = genai.Client()


prompt_string = ""
with open("/Users/burakayyorgun/Documents/gitclones/PennApps2025/cv_text_extract/prompt.txt", "r") as f:
    prompt_string = f.read()


response = client.models.generate_content(
model='gemini-2.5-flash',
contents=[
    types.Part.from_bytes(
    data=image_bytes,
    mime_type='image/jpeg',
    ),
    '' + prompt_string
]
)

print(response.text)