#!/usr/bin/env python3
"""
VISION CACHE - Golden Records System für KI-Lernen
Speichert analysierte Bild-Hashes um API-Kosten zu sparen
"""

import hashlib
import sqlite3
import os
import logging
from typing import Optional, Tuple

logger = logging.getLogger("VisionCache")

class VisionCache:
    def __init__(self, db_path: str = ".opencode/zimmer10_records.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)

        try:
            try:
                self.conn = sqlite3.connect(self.db_path)
                self.conn.execute("PRAGMA journal_mode=WAL;")
            except sqlite3.OperationalError:
                logger.warning("Could not open database file or enable WAL, using in-memory database")
                self.conn = sqlite3.connect(":memory:")

            try:
                self.conn.execute("PRAGMA synchronous=NORMAL;")
                self.conn.execute("PRAGMA cache_size=-64000;")
                self.conn.execute("PRAGMA temp_store=MEMORY;")
                self.conn.execute("PRAGMA wal_autocheckpoint=1000;")
            except sqlite3.OperationalError:
                pass

            self.conn.execute("""
                CREATE TABLE IF NOT EXISTS golden_records (
                    hash TEXT PRIMARY KEY,
                    result TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    usage_count INTEGER DEFAULT 0
                )
            """)
            self.conn.commit()
        except Exception as e:
            logger.warning(f"Vision cache init critical failure, disabling cache: {e}")
            self.conn = None

    def get_image_hash(self, image_path: str) -> str:
        """🚀 CEO 2026: Perceptual Hash (pHash) for Robust Pattern Recognition"""
        try:
            from PIL import Image
            import imagehash
            img = Image.open(image_path)
            # Use pHash for robust matching against slight compression/noise
            return str(imagehash.phash(img))
        except ImportError:
            # Fallback to standard hash if imagehash not installed
            with open(image_path, 'rb') as f:
                return hashlib.md5(f.read()).hexdigest()
        except Exception as e:
            logger.warning(f"pHash calculation failed: {e}")
            return hashlib.md5(image_path.encode()).hexdigest()

    def check_cache(self, image_hash: str) -> Optional[str]:
        if not self.conn:
            return None
        try:
            cursor = self.conn.execute(
                "SELECT result FROM golden_records WHERE hash = ?",
                (image_hash,)
            )
            result = cursor.fetchone()

            if result:
                self.conn.execute(
                    "UPDATE golden_records SET usage_count = usage_count + 1 WHERE hash = ?",
                    (image_hash,)
                )
                self.conn.commit()
                return result[0]
        except:
            pass
        return None

    def save_to_cache(self, image_hash: str, result: str):
        if not self.conn:
            return
        try:
            self.conn.execute(
                "INSERT OR REPLACE INTO golden_records (hash, result) VALUES (?, ?)",
                (image_hash, result)
            )
            self.conn.commit()
        except:
            pass

    def get_stats(self) -> Tuple[int, int, int]:
        """Hole Cache-Statistiken"""
        cursor = self.conn.execute("SELECT COUNT(*), SUM(usage_count) FROM golden_records")
        total_records, total_usage = cursor.fetchone()
        return total_records or 0, total_usage or 0

    def cleanup_old_records(self, max_age_days: int = 30):
        """Räume alte Records auf (optional)"""
        # Hier könnte Logik für Cleanup stehen
        pass
