#!/usr/bin/env python3
"""
Test-Suite für builder-1.1-captcha-worker Training
Validiert alle 48 Trainings-Bilder und Captcha-Typen
"""

import os
from pathlib import Path
from PIL import Image
import sys

TRAINING_DIR = Path("/Users/jeremy/dev/sin-solver/training")

# Definierte Captcha-Typen
CAPTCHA_TYPES = {
    "reCaptcha_v2": {
        "category": "Challenge-basiert",
        "difficulty": "Mittel",
        "description": "Google reCaptcha v2 mit Checkbox und Bildherausforderungen"
    },
    "reCaptcha_v3": {
        "category": "Score-basiert",
        "difficulty": "Leicht",
        "description": "Invisible Captcha basierend auf Benutzerverhalten"
    },
    "hCaptcha": {
        "category": "Challenge-basiert",
        "difficulty": "Mittel",
        "description": "Datenschutz-fokussiertes Captcha mit Bildklassifizierung"
    },
    "FunCaptcha": {
        "category": "Image Matching",
        "difficulty": "Mittel-Schwer",
        "description": "Spielerisches Captcha mit Tile-Matching"
    },
    "Cloudflare_Turnstile": {
        "category": "Challenge-basiert",
        "difficulty": "Leicht-Mittel",
        "description": "Moderne Cloudflare Alternative"
    },
    "GeeTest": {
        "category": "Multi-Modal",
        "difficulty": "Schwer",
        "description": "Advanced Captcha mit Slide, Puzzle, Click, Drag"
    },
    "Text_Captcha": {
        "category": "Distorted Text",
        "difficulty": "Leicht",
        "description": "Klassisches OCR-basiertes Captcha"
    },
    "Slide_Captcha": {
        "category": "Slider-Bewegung",
        "difficulty": "Mittel",
        "description": "Slider muss an richtige Position gezogen werden"
    },
    "Image_Click_Captcha": {
        "category": "Point-Based",
        "difficulty": "Mittel",
        "description": "Benutzer klickt auf spezifische Bildteile"
    },
    "Puzzle_Captcha": {
        "category": "Jigsaws",
        "difficulty": "Mittel-Schwer",
        "description": "Puzzle-Teile müssen zusammengefügt werden"
    },
    "Math_Captcha": {
        "category": "Arithmetik",
        "difficulty": "Leicht",
        "description": "Einfache mathematische Probleme lösen"
    },
    "Audio_Captcha": {
        "category": "Accessibility",
        "difficulty": "Mittel",
        "description": "Audio-basierte Herausforderung"
    },
}

class CaptchaTrainingValidator:
    """Validiert das komplette Training-Dataset"""
    
    def __init__(self, training_dir=TRAINING_DIR):
        self.training_dir = Path(training_dir)
        self.results = {
            "total_captcha_types": 0,
            "total_images": 0,
            "valid_images": 0,
            "invalid_images": 0,
            "errors": [],
            "warnings": []
        }
    
    def validate_directory_structure(self):
        """Validiere die Verzeichnisstruktur"""
        print("\n" + "="*70)
        print("🔍 VALIDIERE VERZEICHNISSTRUKTUR")
        print("="*70)
        
        for captcha_type in CAPTCHA_TYPES.keys():
            captcha_dir = self.training_dir / captcha_type
            
            if not captcha_dir.exists():
                msg = f"❌ Verzeichnis fehlt: {captcha_type}"
                print(msg)
                self.results["errors"].append(msg)
                continue
            
            images = sorted(list(captcha_dir.glob("*.png")))
            
            if len(images) == 0:
                msg = f"❌ {captcha_type}: Keine Bilder gefunden!"
                print(msg)
                self.results["errors"].append(msg)
                continue
            
            if len(images) != 4:
                msg = f"⚠️  {captcha_type}: {len(images)} Bilder (sollten 4 sein)"
                print(msg)
                self.results["warnings"].append(msg)
            else:
                print(f"✅ {captcha_type}: {len(images)} Bilder ✓")
            
            self.results["total_captcha_types"] += 1
            self.results["total_images"] += len(images)
    
    def validate_image_format(self):
        """Validiere Bildformat und Eigenschaften"""
        print("\n" + "="*70)
        print("📸 VALIDIERE BILDFORMATE")
        print("="*70)
        
        for captcha_type in CAPTCHA_TYPES.keys():
            captcha_dir = self.training_dir / captcha_type
            
            if not captcha_dir.exists():
                continue
            
            images = sorted(list(captcha_dir.glob("*.png")))
            
            for img_path in images:
                try:
                    img = Image.open(img_path)
                    
                    # Check format
                    if img.format != "PNG":
                        msg = f"⚠️  {img_path.name}: Format ist {img.format}, sollte PNG sein"
                        print(msg)
                        self.results["warnings"].append(msg)
                    
                    # Check resolution
                    if img.size != (400, 300):
                        msg = f"⚠️  {img_path.name}: Auflösung {img.size}, sollte 400x300 sein"
                        print(msg)
                        self.results["warnings"].append(msg)
                    
                    # Check color mode
                    if img.mode not in ["RGB", "RGBA"]:
                        msg = f"⚠️  {img_path.name}: Farbraum {img.mode}, sollte RGB/RGBA sein"
                        print(msg)
                        self.results["warnings"].append(msg)
                    
                    self.results["valid_images"] += 1
                    
                except Exception as e:
                    msg = f"❌ {img_path}: {str(e)}"
                    print(msg)
                    self.results["errors"].append(msg)
                    self.results["invalid_images"] += 1
        
        print(f"✅ Bilder validiert: {self.results['valid_images']} OK, {self.results['invalid_images']} FEHLER")
    
    def validate_file_sizes(self):
        """Validiere Dateigröße"""
        print("\n" + "="*70)
        print("💾 VALIDIERE DATEIGRÖSSEN")
        print("="*70)
        
        total_size = 0
        max_size = 0
        min_size = float('inf')
        
        for captcha_type in CAPTCHA_TYPES.keys():
            captcha_dir = self.training_dir / captcha_type
            
            if not captcha_dir.exists():
                continue
            
            images = list(captcha_dir.glob("*.png"))
            
            for img_path in images:
                if img_path.exists():
                    size = img_path.stat().st_size
                    total_size += size
                    max_size = max(max_size, size)
                    min_size = min(min_size, size)
        
        print(f"📊 Dateigröße Statistik:")
        print(f"   Gesamtgröße: {total_size / (1024*1024):.2f} MB")
        print(f"   Max Datei: {max_size / 1024:.2f} KB")
        print(f"   Min Datei: {min_size / 1024:.2f} KB")
        print(f"   Durchschnitt: {(total_size / 48) / 1024:.2f} KB pro Bild")
    
    def generate_dataset_summary(self):
        """Generiere Zusammenfassung des Datasets"""
        print("\n" + "="*70)
        print("📊 DATASET-ZUSAMMENFASSUNG")
        print("="*70)
        
        summary_lines = []
        summary_lines.append(f"{'Captcha-Typ':<30} {'Bilder':<10} {'Status':<10}")
        summary_lines.append("-" * 50)
        
        for captcha_type in CAPTCHA_TYPES.keys():
            captcha_dir = self.training_dir / captcha_type
            
            if captcha_dir.exists():
                images = list(captcha_dir.glob("*.png"))
                status = "✅" if len(images) == 4 else "⚠️"
                summary_lines.append(f"{captcha_type:<30} {len(images):<10} {status:<10}")
            else:
                summary_lines.append(f"{captcha_type:<30} {'0':<10} {'❌':<10}")
        
        for line in summary_lines:
            print(line)
    
    def run_all_validations(self):
        """Führe alle Validierungen durch"""
        print("\n" + "🚀"*35)
        print("STARTE CAPTCHA TRAINING DATASET VALIDIERUNG")
        print("🚀"*35)
        
        self.validate_directory_structure()
        self.validate_image_format()
        self.validate_file_sizes()
        self.generate_dataset_summary()
        
        self.print_final_report()
    
    def print_final_report(self):
        """Drucke Abschlussreport"""
        print("\n" + "="*70)
        print("📋 ABSCHLUSSREPORT")
        print("="*70)
        
        print(f"\n✅ ERFOLGREICHE VALIDIERUNGEN:")
        print(f"   Captcha-Typen: {self.results['total_captcha_types']}/{len(CAPTCHA_TYPES)}")
        print(f"   Total Bilder: {self.results['total_images']}")
        print(f"   Gültige Bilder: {self.results['valid_images']}")
        
        if self.results['warnings']:
            print(f"\n⚠️  WARNUNGEN ({len(self.results['warnings'])}):")
            for warning in self.results['warnings'][:5]:
                print(f"   {warning}")
            if len(self.results['warnings']) > 5:
                print(f"   ... und {len(self.results['warnings']) - 5} weitere")
        
        if self.results['errors']:
            print(f"\n❌ FEHLER ({len(self.results['errors'])}):")
            for error in self.results['errors'][:5]:
                print(f"   {error}")
            if len(self.results['errors']) > 5:
                print(f"   ... und {len(self.results['errors']) - 5} weitere")
        
        # Overall status
        print("\n" + "="*70)
        if self.results['errors']:
            print("❌ STATUS: FEHLER VORHANDEN - MANUELLES ÜBERPRÜFEN ERFORDERLICH")
            exit_code = 1
        elif self.results['warnings']:
            print("⚠️  STATUS: WARNUNGEN VORHANDEN - DATASET IST VERWENDBAR")
            exit_code = 0
        else:
            print("✅ STATUS: ALLES OK - DATASET IST PRODUCTION-READY!")
            exit_code = 0
        
        print("="*70)
        
        return exit_code

def main():
    """Hauptfunktion"""
    validator = CaptchaTrainingValidator()
    exit_code = validator.run_all_validations()
    sys.exit(exit_code)

if __name__ == "__main__":
    main()
