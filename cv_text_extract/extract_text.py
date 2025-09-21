"""Simple Tesseract helper for macOS (and other platforms).

Usage:
  python extract_text.py input-image.jpg [other-image.png ...] 

Outputs recognized text to stdout and writes optional PDF/HOCR files alongside inputs when requested via flags.

Prerequisites:
- Install Tesseract (macOS Homebrew recommended):
    brew install tesseract

This script will attempt to discover tesseract in PATH or common Homebrew locations on macOS.
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
from pathlib import Path
from typing import Iterable

from PIL import Image

try:
    import pytesseract
except Exception as e:  # pragma: no cover - helpful runtime message
    print("pytesseract is required. Install with: pip install pytesseract pillow")
    raise


def find_tesseract() -> str | None:
    """Return an executable path to tesseract or None if not found."""
    # 1) Honor explicit environment override
    env_cmd = os.environ.get("TESSERACT_CMD") or os.environ.get("TESSERACT_PATH")
    if env_cmd:
        if shutil.which(env_cmd) or os.path.exists(env_cmd):
            return env_cmd

    # 2) tesseract available on PATH
    t = shutil.which("tesseract")
    if t:
        return t

    # 3) Common Homebrew locations on macOS (Apple Silicon and Intel)
    brew_prefixes = ["/opt/homebrew/bin/tesseract", "/usr/local/bin/tesseract"]
    for p in brew_prefixes:
        if os.path.exists(p):
            return p

    # 4) On some systems a `tesseract` binary might be installed under /usr/bin
    if os.path.exists("/usr/bin/tesseract"):
        return "/usr/bin/tesseract"

    return None


def _use_pytesseract(path: Path, lang: str | None = None) -> str:
    return pytesseract.image_to_string(str(path), lang=lang) if lang else pytesseract.image_to_string(str(path))


def _use_tesserocr(path: Path) -> str:
    import tesserocr

    img = Image.open(path)
    return tesserocr.image_to_text(img)


def _use_easyocr(path: Path, languages: list[str]) -> str:
    import easyocr

    reader = easyocr.Reader(languages, gpu=False)
    results = reader.readtext(str(path))
    # results is list of (bbox, text, confidence) — join texts in reading order
    texts = [r[1] for r in results]
    return "\n".join(texts)


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Extract text from images using Tesseract (pytesseract)")
    parser.add_argument("paths", nargs="+", help="Image paths to process")
    parser.add_argument("--pdf", action="store_true", help="Emit searchable PDF(s) next to each input")
    parser.add_argument("--hocr", action="store_true", help="Emit HOCR output next to each input")
    parser.add_argument("--lang", default=None, help="Tesseract language code (e.g., 'eng', 'fra')")
    args = parser.parse_args(list(argv) if argv is not None else None)

    # Discover local tesseract binary if available
    tpath = find_tesseract()
    have_pytesseract_binary = False
    if tpath:
        pytesseract.pytesseract.tesseract_cmd = tpath
        have_pytesseract_binary = True

    # Determine available fallbacks
    have_tesserocr = False
    have_easyocr = False
    try:
        import tesserocr  # type: ignore

        have_tesserocr = True
    except Exception:
        have_tesserocr = False

    try:
        import easyocr  # type: ignore

        have_easyocr = True
    except Exception:
        have_easyocr = False

    for p in args.paths:
        path = Path(p)
        if not path.exists():
            print(f"File not found: {path}", file=sys.stderr)
            continue

        try:
            # Choose engine: pytesseract (binary), tesserocr (binding), easyocr (pure-Python)
            if have_pytesseract_binary:
                text = _use_pytesseract(path, lang=args.lang)
            elif have_tesserocr:
                text = _use_tesserocr(path)
            elif have_easyocr:
                languages = [args.lang] if args.lang else ["en"]
                text = _use_easyocr(path, languages)
            else:
                print("No OCR engine available. Install Tesseract (brew install tesseract) or pip install tesserocr or easyocr.", file=sys.stderr)
                return 2
            # Print a header for clarity when processing multiple files
            print(f"==> {path}\n")
            print(text)

            if args.pdf:
                out_pdf = path.with_suffix(path.suffix + ".searchable.pdf")
                pdf_bytes = pytesseract.image_to_pdf_or_hocr(str(path), extension="pdf")
                with open(out_pdf, "w+b") as fh:
                    fh.write(pdf_bytes)
                print(f"Wrote searchable PDF: {out_pdf}")

            if args.hocr:
                out_hocr = path.with_suffix(path.suffix + ".hocr.html")
                hocr = pytesseract.image_to_pdf_or_hocr(str(path), extension="hocr")
                with open(out_hocr, "w+b") as fh:
                    fh.write(hocr)
                print(f"Wrote HOCR: {out_hocr}")

        except Exception as exc:  # pragma: no cover - runtime error handling
            print(f"Error processing {path}: {exc}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())