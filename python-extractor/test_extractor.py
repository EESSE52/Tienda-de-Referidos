import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from extractor import build_product_payload


class ExtractorErrorHandlingTests(unittest.TestCase):
    def test_build_product_payload_handles_unreachable_url(self):
        payload = build_product_payload("https://example.invalid/producto-404", "creatina")

        self.assertEqual(payload["lista_id"], "creatina")
        self.assertEqual(payload["enlace_referido"], "https://example.invalid/producto-404")
        self.assertIn("nombre", payload)
        self.assertGreaterEqual(payload["precio"], 0)


if __name__ == "__main__":
    unittest.main()
