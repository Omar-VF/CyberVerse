import os
import cloudinary
import cloudinary.api
import whisper

# --- 1. Cloudinary Configuration (Updated) ---
# Replace the placeholders with your actual credentials from the dashboard.
cloudinary.config(
  cloud_name = "dhsjgmbrh",
  api_key = "724847925785571",
  api_secret = "lo9r0AccTs2i_N0k4HCyycvg2O0",
  secure = True # It's good practice to ensure all URLs are https
)


# --- 2. Find the Latest Video in Cloudinary ---
print("🔍 Searching for the latest uploaded video in Cloudinary...")
try:
    # Use the Admin API to search for resources
    search_result = cloudinary.api.resources(
        resource_type = "video",
        type = "upload",
        sort_by = [("created_at", "desc")],
        max_results = 1
    )

    if not search_result['resources']:
        print("❌ No videos found in your Cloudinary account.")
        exit()

    latest_video = search_result['resources'][0]
    video_url = latest_video['secure_url']
    video_name = latest_video['public_id']
    
    print(f"✅ Found video: '{video_name}'")
    print(f"   URL: {video_url}")

except Exception as e:
    print(f"❌ Error searching for video in Cloudinary: {e}")
    exit()

# --- 3. Transcribe with Whisper ---
# The rest of the script remains the same...

print("\nLoading Whisper model...")
model = whisper.load_model("base")

print(f"🤖 Transcribing video from URL...")
try:
    result = model.transcribe(video_url)
    print("\n--- Transcription Result ---")
    print(result["text"])
    print("--------------------------\n")
except Exception as e:
    print(f"❌ Error during transcription: {e}")