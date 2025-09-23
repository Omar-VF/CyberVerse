from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import whisper

# You can put your transcription logic in a function
def run_transcription(video_url):
    print(f"🤖 Received video URL: {video_url}. Starting transcription...")
    model = whisper.load_model("base")
    result = model.transcribe(video_url)
    print("--- Transcription Complete ---")
    print(result['text'])
    # In a real app, you would save this result to a database or file.
    return result['text']

# Create the Flask app
app = Flask(__name__)
CORS(app)

# Define the webhook endpoint
@app.route('/webhook', methods=['POST'])
def cloudinary_webhook():
    data = request.json
    
    # Check if the notification is for a successful upload
    if data['notification_type'] == 'upload' and data.get('secure_url'):
        # Get the URL of the new video from the webhook data
        video_url = data['secure_url']
        
        # Run the transcription
        # In a production app, you'd run this as a background task
        transcript = run_transcription(video_url)

        # --- 1. Place Your API Key Here ---
        # Paste the key you generated from Google AI Studio inside the quotes.
        API_KEY = "AIzaSyB3oFn8G3KH52YhBEayRS07xcMM5HRmj3k"

        # --- 2. Configure the Library ---
        try:
            genai.configure(api_key=API_KEY)
        except Exception as e:
            print(f"Error configuring API: {e}")
            exit()

        # --- 3. Use the Model ---
        try:
            print("Connecting to the Gemini model...")
            # Using 'gemini-1.5-flash' as it's fast and capable
            model = genai.GenerativeModel('gemini-1.5-flash')

            # Ask a question
            response = model.generate_content(f"I will provide you with a raw transcript from a Google Meet. The transcript may contain errors, repetitions, or incomplete sentences, but it is mostly accurate. Your task is to carefully read through it and produce a clear, well-structured summary. Focus on the main topics discussed, key decisions made, action items, and any important concerns raised. Ignore filler words, transcription mistakes, and irrelevant small talk. The final summary should be concise, easy to understand, and written in professional language. Transcript: {transcript}")

            # Print the response
            print("\n--- Model Response ---")
            print(response.text)
            print("----------------------")
            with open("summary.txt", "w") as f:
                f.write(response.text)

        except Exception as e:
            print(f"An error occurred while generating content: {e}")
            return jsonify(status="error", message="Transcription or summary generation failed."), 500

        # Only return success after summary is written
        return jsonify(status="success", message="Summary generated."), 200
    
    return jsonify(status="ignored", message="Notification was not a new video upload."), 200


# Endpoint to serve the latest summary
@app.route('/summary', methods=['GET'])
def get_summary():
    try:
        with open("summary.txt", "r", encoding="utf-8") as f:
            summary = f.read()
        return jsonify({"summary": summary})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Run the app on port 5000
    app.run(port=5000, debug=True)