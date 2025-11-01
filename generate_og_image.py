from PIL import Image, ImageDraw, ImageFont
import os

# Crear imagen de 1200x630
width, height = 1200, 630
image = Image.new('RGB', (width, height))
draw = ImageDraw.Draw(image)

# Crear gradiente verde
for y in range(height):
    # Interpolación de color de #4caf50 a #2e7d32
    r1, g1, b1 = 76, 175, 80  # #4caf50
    r2, g2, b2 = 46, 125, 50  # #2e7d32
    
    ratio = y / height
    r = int(r1 + (r2 - r1) * ratio)
    g = int(g1 + (g2 - g1) * ratio)
    b = int(b1 + (b2 - b1) * ratio)
    
    draw.rectangle([(0, y), (width, y + 1)], fill=(r, g, b))

# Dibujar círculo blanco para el emoji
circle_center = (600, 200)
circle_radius = 60
draw.ellipse([
    (circle_center[0] - circle_radius, circle_center[1] - circle_radius),
    (circle_center[0] + circle_radius, circle_center[1] + circle_radius)
], fill='white')

# Intentar usar fuentes del sistema, sino usar la default
try:
    title_font = ImageFont.truetype("arial.ttf", 80)
    subtitle_font = ImageFont.truetype("arial.ttf", 36)
    footer_font = ImageFont.truetype("arial.ttf", 28)
    emoji_font = ImageFont.truetype("seguiemj.ttf", 70)
except:
    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 80)
        subtitle_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 36)
        footer_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
        emoji_font = title_font
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        footer_font = ImageFont.load_default()
        emoji_font = ImageFont.load_default()

# Dibujar emoji de balón
emoji = "⚽"
emoji_bbox = draw.textbbox((0, 0), emoji, font=emoji_font)
emoji_width = emoji_bbox[2] - emoji_bbox[0]
emoji_height = emoji_bbox[3] - emoji_bbox[1]
emoji_position = (circle_center[0] - emoji_width // 2, circle_center[1] - emoji_height // 2 - 10)
draw.text(emoji_position, emoji, fill=(76, 175, 80), font=emoji_font)

# Dibujar título
title = "Falta Uno"
title_bbox = draw.textbbox((0, 0), title, font=title_font)
title_width = title_bbox[2] - title_bbox[0]
title_position = ((width - title_width) // 2, 320)
draw.text(title_position, title, fill='white', font=title_font)

# Dibujar subtítulo
subtitle = "Encuentra tu partido de fútbol"
subtitle_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
subtitle_position = ((width - subtitle_width) // 2, 420)
draw.text(subtitle_position, subtitle, fill=(245, 245, 245), font=subtitle_font)

# Dibujar footer
footer = "faltauno.app"
footer_bbox = draw.textbbox((0, 0), footer, font=footer_font)
footer_width = footer_bbox[2] - footer_bbox[0]
footer_position = ((width - footer_width) // 2, 570)
draw.text(footer_position, footer, fill=(240, 240, 240), font=footer_font)

# Guardar imagen
output_path = os.path.join('public', 'og-image.png')
image.save(output_path, 'PNG')
print(f"✅ Imagen creada exitosamente en: {output_path}")
print(f"📏 Tamaño: {width}x{height} píxeles")
