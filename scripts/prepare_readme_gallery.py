from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "docs" / "assets"


def fit_canvas(source: Path, destination: Path, background: tuple[int, int, int], size=(1200, 800)) -> None:
    image = Image.open(source).convert("RGB")
    fitted = ImageOps.contain(image, size, method=Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", size, background)
    canvas.paste(fitted, ((size[0] - fitted.width) // 2, (size[1] - fitted.height) // 2))
    canvas.save(destination, format="PNG", optimize=True)
    print(destination)


fit_canvas(
    ASSETS / "intake-language-picker.webp",
    ASSETS / "gallery-intake-language-picker.png",
    (248, 243, 237),
)
fit_canvas(
    ASSETS / "evidence-board.png",
    ASSETS / "gallery-evidence-board.png",
    (7, 24, 43),
)
