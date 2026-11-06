#!/usr/bin/env python3
"""Convert the Avito CSV export into data.js for the game.

Keeps only rows that have at least one photo (treated as active listings).
"""
import csv
import json
import re
import sys

CSV_PATH = "/Users/sseresedaa/.zcode/workspace/b5321cef-ce44-499c-8606-be93771453a0/mediakomi/kvartiry_komi.csv"
OUT_PATH = "/Users/sseresedaa/.zcode/workspace/b5321cef-ce44-499c-8606-be93771453a0/mediakomi/data.js"


def clean(s):
    return (s or "").replace("\u00a0", " ").strip()


def parse_price(s):
    digits = re.sub(r"[^\d]", "", clean(s))
    return int(digits) if digits else 0


def main():
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        header = [h.strip().lower() for h in header]
        idx = {h: i for i, h in enumerate(header)}

        rows = []
        for r in reader:
            if not any(clean(c) for c in r):
                continue
            photos = [clean(r[idx.get(f"фото {n}", idx.get(f"фото {n} ", -1))])
                      for n in range(1, 6)
                      if 0 <= (idx.get(f"фото {n}", idx.get(f"фото {n} ", -1))) < len(r)
                      and clean(r[idx.get(f"фото {n}", idx.get(f"фото {n} ", -1))])]
            photos = [p for p in photos if p.startswith("http")]
            price = parse_price(r[idx["цена"]])
            url = clean(r[idx["ссылка"]])
            if not photos or price <= 0 or not url:
                continue  # без фото или без цены — не активное объявление
            desc = clean(r[idx["описание"]])
            street = clean(r[idx.get("цлица", idx.get("улица", -1))] if idx.get("цлица", idx.get("улица", -1)) is not None and idx.get("цлица", idx.get("улица", -1)) < len(r) else "")
            rows.append({
                "url": url,
                "photos": photos,
                "price": price,
                "ppm": parse_price(r[idx["цена за кв м"]]),
                "desc": desc,
                "street": street,
            })

    print(f"Активных объявлений с фото: {len(rows)}", file=sys.stderr)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("// Сгенерировано gen_data.py из выгрузки объявлений Avito (республика Коми, Инта)\n")
        f.write("// Только активные объявления с фотографиями.\n")
        f.write("window.APARTMENTS = ")
        json.dump(rows, f, ensure_ascii=False, indent=1)
        f.write(";\n")


if __name__ == "__main__":
    main()
