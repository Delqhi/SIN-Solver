import io
import os
import tempfile
import logging
from typing import Dict, Any

import whisper
from pydub import AudioSegment

logger = logging.getLogger("AudioSolver")


class AudioSolver:
    def __init__(self, model_name: str = "base"):
        self._model = whisper.load_model(model_name)
        self._model_name = model_name
        logger.info(f"✅ Whisper model '{model_name}' loaded")
    
    def transcribe(self, audio_bytes: bytes) -> Dict[str, Any]:
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_wav:
                wav_path = tmp_wav.name
                
                try:
                    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp_mp3:
                        tmp_mp3.write(audio_bytes)
                        tmp_mp3.flush()
                        
                        audio = AudioSegment.from_file(tmp_mp3.name)
                        audio.export(wav_path, format="wav")
                        
                        os.unlink(tmp_mp3.name)
                except Exception:
                    with open(wav_path, "wb") as f:
                        f.write(audio_bytes)
                
                result = self._model.transcribe(
                    wav_path,
                    language="en",
                    task="transcribe",
                    fp16=False
                )
                
                os.unlink(wav_path)
                
                text = result["text"].strip()
                cleaned_text = self._clean_captcha_text(text)
                
                segments = result.get("segments", [])
                avg_confidence = sum(s.get("no_speech_prob", 0) for s in segments) / len(segments) if segments else 0.5
                confidence = 1.0 - avg_confidence
                
                return {
                    "text": cleaned_text,
                    "raw_text": text,
                    "confidence": min(confidence, 0.95),
                    "language": result.get("language", "en"),
                    "model": self._model_name
                }
        except Exception as e:
            logger.error(f"Audio transcription failed: {e}")
            raise
    
    def _clean_captcha_text(self, text: str) -> str:
        text = text.lower().strip()
        
        replacements = {
            "zero": "0", "one": "1", "two": "2", "three": "3",
            "four": "4", "five": "5", "six": "6", "seven": "7",
            "eight": "8", "nine": "9",
            " ": ""
        }
        
        for word, digit in replacements.items():
            text = text.replace(word, digit)
        
        cleaned = "".join(c for c in text if c.isalnum())
        
        return cleaned
    
    def transcribe_with_segments(self, audio_bytes: bytes) -> Dict[str, Any]:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp.flush()
            
            result = self._model.transcribe(tmp.name, language="en", word_timestamps=True)
            os.unlink(tmp.name)
            
            return {
                "text": result["text"].strip(),
                "segments": result.get("segments", []),
                "words": result.get("words", [])
            }
