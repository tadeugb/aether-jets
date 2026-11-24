"""Gera o catálogo de partida para uso HTTP e abertura local (file://)."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
data = {}
for name in ("frota", "catering", "pacotes"):
    data[name] = json.loads((root / "assets/data" / f"{name}.json").read_text(encoding="utf-8"))
target = root / "assets/js/catalog-seed.js"
target.write_text(
    "// Gerado por tools/build_catalog.py a partir dos arquivos JSON.\n"
    + "window.AETHER_CATALOG_SEED = "
    + json.dumps(data, ensure_ascii=False, indent=4)
    + ";\n",
    encoding="utf-8",
)
