#!/usr/bin/env python3
"""
YouTube Transcript Extractor
Similar to the working Python code
"""
import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled

def get_video_id(url):
    """Extract video ID from YouTube URL"""
    import re
    match = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11})", url)
    if match:
        return match.group(1)
    return None

def fetch_transcript(video_id):
    """Fetch transcript from YouTube video"""
    try:
        # Use the same method as the working Python code
        ytt_api = YouTubeTranscriptApi()
        transcript = ytt_api.fetch(video_id, languages=['ar', 'en'])
        
        # Extract text: loop directly on transcript (iterable)
        full_text = ""
        for snippet in transcript:
            full_text += snippet.text + " "
        
        # Clean up the text
        full_text = " ".join(full_text.split()).strip()
        
        return {
            "success": True,
            "transcript": full_text,
            "wordCount": len(full_text.split()),
            "language": transcript.language_code if hasattr(transcript, 'language_code') else 'unknown'
        }
    except NoTranscriptFound:
        return {
            "success": False,
            "error": "No transcript available for this video (no manual or automatic captions).",
            "details": "Try another video, or check if the video has CC (captions) enabled on YouTube."
        }
    except TranscriptsDisabled:
        return {
            "success": False,
            "error": "Transcripts are disabled by the video creator."
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Error: {str(e)}"
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Video ID is required"
        }))
        sys.exit(1)
    
    video_id = sys.argv[1]
    result = fetch_transcript(video_id)
    print(json.dumps(result))

