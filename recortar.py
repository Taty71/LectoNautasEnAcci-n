import os
from PIL import Image

def recortar_bordes_transparentes(ruta_imagen, ruta_salida):
    if not os.path.exists(ruta_imagen):
        print(f"Error: No se encontro el archivo en {ruta_imagen}")
        return False
        
    print(f"Abriendo {ruta_imagen}...")
    img = Image.open(ruta_imagen).convert("RGBA")
    
    # Obtener el recuadro delimitador del contenido visible (no transparente)
    bbox = img.getbbox()
    if bbox:
        img_recortada = img.crop(bbox)
        # Guardar en formato PNG para mantener la transparencia
        img_recortada.save(ruta_salida, "PNG")
        print(f"¡Exito! Imagen recortada y guardada en {ruta_salida}")
        print(f"  Dimensiones originales: {img.size[0]}x{img.size[1]}")
        print(f"  Nuevas dimensiones: {img_recortada.size[0]}x{img_recortada.size[1]}")
        return True
    else:
        print(f"No se detecto ningun contenido visible en {ruta_imagen}")
        return False

# Ejecutar el recorte sobre los logos de la aplicacion
print("--- Iniciando proceso de recorte de logos ---")
recortar_bordes_transparentes("public/recursos/logoLNautas1.png", "public/recursos/logoLNautas1.png")
recortar_bordes_transparentes("public/recursos/logo2b.png", "public/recursos/logo2b.png")
print("--- Proceso finalizado ---")
