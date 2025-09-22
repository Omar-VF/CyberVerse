from flask import Flask, request, jsonify
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


        
        return jsonify(status="success", message="Transcription started."), 200
    
    return jsonify(status="ignored", message="Notification was not a new video upload."), 200

if __name__ == '__main__':
    # Run the app on port 5000
    app.run(port=5000, debug=True)