import whisper

# Load the Whisper model. "base" is a good starting point.
# Other options: "tiny", "small", "medium", "large"
print("Loading Whisper model...")
model = whisper.load_model("base")

# Path to your webm video file
video_file = "test2.webm"

# Transcribe the audio from the video file
print(f"Transcribing {video_file}...")
result = model.transcribe(video_file)

# Print the transcribed text
print("\n--- Transcription Result ---")
print(result["text"])
print("--------------------------")

# You can also save the output to a text file
with open("transcription.txt", "w") as f:
    f.write(result["text"])

print("\nTranscription saved to transcription.txt")