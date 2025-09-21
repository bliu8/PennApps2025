from google import genai

# --- Configuration and File Paths ---
# The path where the prompt text is stored
PROMPT_FILE_PATH = "/Users/burakayyorgun/Documents/gitclones/PennApps2025/cv_text_extract/prompt.txt"
# The file where Gemini's output will be saved
OUTPUT_FILE = 'output.txt' 

# --- Initialize Client ---
# The client automatically finds your API key from environment variables (e.g., GEMINI_API_KEY)
client = genai.Client()

# --- Read Prompt from File ---
prompt_string = ""
try:
    print(f"Reading prompt from: {PROMPT_FILE_PATH}")
    with open(PROMPT_FILE_PATH, "r", encoding="utf-8") as f:
        prompt_string = f.read()
    
    if not prompt_string.strip():
        print("Warning: The prompt file is empty.")

except FileNotFoundError:
    print(f"Error: Prompt file not found at the specified path: {PROMPT_FILE_PATH}")
    exit()
except Exception as e:
    print(f"An error occurred while reading the prompt file: {e}")
    exit()

# --- Generate Content with Gemini (Text-Only) ---
print("Sending text-only request to Gemini API...")
try:
    # We pass the prompt_string directly as the 'contents' argument.
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt_string
    )
    print("Response received.")

    # --- Write Output to File ---
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(response.text)
    
    print(f"\n✅ Success! Gemini's output has been saved to {OUTPUT_FILE}")
    print("\n--- Model Output Preview ---")
    # Display the first 300 characters of the output
    print(response.text[:300].strip() + ("..." if len(response.text) > 300 else ""))
    print("--------------------------")

except genai.errors.APIError as e:
    print(f"Gemini API Error: {e}")
except Exception as e:
    print(f"An unexpected error occurred: {e}")