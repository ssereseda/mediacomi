#!/usr/bin/env python3
"""Скачивает фото объявлений и оптимизирует их для веба.

Файлы складываются в img/ (имя = хеш URL), data.js переписывается
на локальные пути. Битые фото удаляются из данных; объявления без
живых фото отбрасываются.
"""
import hashlib
import json
import os
import subprocess
import urllib.request

BASE = os.path.dirname(os.path.abspath(__file__))
IMG_DIR = os.path.join(BASE, "img")
DATA = os.path.join(BASE, "data.js")
MAX_DIM = 900          # максимальная сторона
QUALITY = 65           # jpeg-качество

HEADERS = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    "Referer": "https://www.avito.ru/",
}


def download(url, path):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as r:
        data = r.read()
    if len(data) < 1000:
        raise ValueError("слишком маленький ответ")
    with open(path, "wb") as f:
        f.write(data)


def optimize(path):
    """sips (встроен в macOS): уменьшает и пережимает в jpeg."""
    tmp = path + ".tmp.jpg"
    subprocess.run(
        ["sips", "-s", "format", "jpeg", "-s", "formatOptions", str(QUALITY),
         "-Z", str(MAX_DIM), path, "--out", tmp],
        check=True, capture_output=True,
    )
    os.replace(tmp, path)


def main():
    os.makedirs(IMG_DIR, exist_ok=True)
    src = open(DATA, encoding="utf-8").read()
    data = json.loads(src[src.index("["):src.rindex("]") + 1])

    kept, dropped = [], []
    for a in data:
        photos = []
        for p in a["photos"]:
            name = hashlib.md5(p.encode()).hexdigest()[:12] + ".jpg"
            path = os.path.join(IMG_DIR, name)
            if not os.path.exists(path):
                try:
                    download(p, path)
                except Exception:
                    continue
                try:
                    optimize(path)
                except Exception:
                    pass
            if os.path.exists(path) and os.path.getsize(path) > 0:
                photos.append("img/" + name)
        if photos:
            a["photos"] = photos
            kept.append(a)
        else:
            dropped.append(a)

    out = ("// Сгенерировано gen_data.py + download_images.py из выгрузки объявлений Avito "
           "(республика Коми, Инта)\n"
           "// Фото скачаны и оптимизированы локально — сайт полностью самодостаточен.\n"
           "window.APARTMENTS = ")
    out += json.dumps(kept, ensure_ascii=False, indent=1) + ";\n"
    open(DATA, "w", encoding="utf-8").write(out)

    total = sum(os.path.getsize(os.path.join(IMG_DIR, f)) for f in os.listdir(IMG_DIR))
    print(f"Объявлений оставлено: {len(kept)}, выброшено без фото: {len(dropped)}")
    print(f"Файлов в img/: {len(os.listdir(IMG_DIR))}, общий размер: {total/1024:.0f} КБ")


if __name__ == "__main__":
    main()
