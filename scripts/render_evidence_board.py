from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "docs" / "assets" / "evidence-board.png"
WIDTH, HEIGHT = 1200, 760


def font_path(pattern: str) -> str:
    import subprocess

    return subprocess.check_output(["fc-match", "-f", "%{file}", pattern], text=True).strip()


sans = font_path("Noto Sans")
serif = font_path("Noto Serif")


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def rounded(draw: ImageDraw.ImageDraw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


image = Image.new("RGB", (WIDTH, HEIGHT), "#07182b")
pixels = image.load()
for y in range(HEIGHT):
    for x in range(WIDTH):
        t = (x / WIDTH + y / HEIGHT) / 2
        pixels[x, y] = (int(7 + 12 * t), int(24 + 31 * t), int(43 + 48 * t))

draw = ImageDraw.Draw(image, "RGBA")
draw.ellipse((870, -250, 1350, 230), fill=(244, 138, 81, 24))
draw.ellipse((-170, 520, 220, 910), fill=(47, 131, 181, 22))

light = "#f8fbfd"
muted = "#b8c9d8"
ember = "#ffb173"
navy = "#102643"
body = "#526273"
orange = "#a83d10"

# Header
draw.text((70, 54), "FIR SAATHI · EVIDENCE BOARD", font=font(sans, 14), fill=ember, spacing=2)
draw.text((70, 100), "From citizen words", font=font(serif, 48), fill=light)
draw.text((70, 153), "to review-ready signal.", font=font(serif, 48), fill=ember)
draw.text((70, 214), "A multilingual intake layer that preserves the source, surfaces only useful gaps,", font=font(sans, 19), fill=muted)
draw.text((70, 243), "and keeps the final decision with a human constable.", font=font(sans, 19), fill=muted)

# Promise panel
rounded(draw, (70, 292, 1130, 396), 18, (255, 255, 255, 20), (255, 255, 255, 38), 1)
draw.ellipse((93, 322, 137, 366), fill=(255, 177, 115, 255))
draw.arc((101, 330, 129, 358), 190, 350, fill="#07182b", width=4)
draw.text((156, 316), "THE PRODUCT PROMISE", font=font(sans, 18), fill=light)
draw.text((156, 347), "The source statement stays separate from AI fields, citizen context, corrections, and officer edits.", font=font(sans, 17), fill=muted)
draw.text((156, 376), "The system assists with structure and uncertainty; people retain authority.", font=font(sans, 17), fill=muted)

cards = [
    (70, "CONSTABLE TIME", ["5–10 min", "estimate"], ["10–20% of a 54.63-min", "external baseline; not", "field-measured."]),
    (345, "MISSING INFO", ["Not yet", "benchmarked"], ["One optional, high-value", "question at a time; compare", "detail coverage to baseline."]),
    (620, "TRANSCRIPTION", ["3 tested", "7 experimental"], ["No model-matched WER", "claim yet. Quality labels", "stay evidence-gated."]),
    (895, "AI BOUNDARY", ["0", "unmitigated"], ["2 unsafe BNS attempts", "caught; 6 malformed", "outputs not counted."]),
]
for x, label, headline, copy in cards:
    shadow = (x + 5, 435, x + (250 if x < 895 else 235) + 5, 620)
    rounded(draw, shadow, 18, (0, 0, 0, 55))
    card_width = 250 if x < 895 else 235
    rounded(draw, (x, 430, x + card_width, 615), 18, "#fffaf3")
    draw.text((x + 24, 454), label, font=font(sans, 14), fill=orange)
    draw.text((x + 24, 484), headline[0], font=font(sans, 30), fill=navy)
    draw.text((x + 24, 517), headline[1], font=font(sans, 30), fill=navy)
    for index, line in enumerate(copy):
        draw.text((x + 24, 555 + index * 20), line, font=font(sans, 14), fill=body)

# Footer evidence line
for x, label in [(70, "10 explicit language choices"), (312, "4 deterministic invariants"), (572, "Human verification required")]:
    draw.ellipse((x, 644, x + 16, 660), fill=(244, 138, 81, 255))
    draw.text((x + 28, 641), label, font=font(sans, 15), fill=muted)
draw.text((1130, 641), "Prototype · not an official FIR service", font=font(sans, 15), fill=ember, anchor="ra")

image.save(OUT, "PNG", optimize=True)
print(OUT)
