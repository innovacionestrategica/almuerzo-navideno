# Guía: almacenar los votos y publicar la encuesta

## Archivos del proyecto

```
encuesta-navidad/
├── index.html
├── arbol-navidad.png
├── logo-cfia.png          ← agrega aquí tu logo oficial con este nombre exacto
├── el-novillo-alegre-barrio.jpg
├── OSH_1920x1080px_Fachada_Aleste.jpg
├── Foto del Lugar PF CHANGS.jpg
├── Foto del Lugar Olive Garden.jpg
└── Code.gs                ← este va en Google Apps Script, no en GitHub
```

---

## Paso 1: Crear la hoja donde se guardan los votos

1. Entra a **sheets.new** con la cuenta de Google que administrará la encuesta.
2. Ponle de nombre **Encuesta Almuerzo Navideño**.

## Paso 2: Pegar el código del servidor

1. En la hoja, abre **Extensiones → Apps Script**.
2. Borra todo el contenido de `Código.gs` y pega el contenido completo de **Code.gs**.
3. **Elige cómo evitar votos repetidos.** Busca esta línea cerca del inicio:

   ```js
   MODO_BLOQUEO: 'IP',
   ```

   Si la mayoría votará desde la red del CFIA, cámbiala a:

   ```js
   MODO_BLOQUEO: 'DISPOSITIVO',
   ```

   En una oficina, todas las computadoras salen a internet con la misma IP pública. Con `'IP'`, solo contaría el primer voto de toda la red. La IP se guarda en la hoja de todos modos, como referencia.

4. Guarda con **Ctrl+S**.

## Paso 3: Crear las pestañas de la hoja

1. En la barra superior de Apps Script, elige la función **`configurar`** y pulsa **Ejecutar**.
2. La primera vez, Google pide permisos: **Revisar permisos → tu cuenta → Configuración avanzada → Ir al proyecto (no seguro) → Permitir**. Es normal: el script es tuyo.
3. Vuelve a la hoja. Verás dos pestañas nuevas:
   - **Votos**: Fecha/Hora, IP del Votante, Restaurante Seleccionado, ID Dispositivo.
   - **Resultados**: conteo, porcentaje y ganador actual. Se actualiza solo.

## Paso 4: Publicar el servidor

1. En Apps Script, pulsa **Implementar → Nueva implementación**.
2. Pulsa el engranaje ⚙ y elige **Aplicación web**.
3. Configura:
   - **Ejecutar como:** Yo
   - **Quién tiene acceso:** Cualquier persona
4. Pulsa **Implementar** y **copia la URL de la aplicación web**. Termina en `/exec`.

> Si después cambias algo en `Code.gs`, ve a **Implementar → Administrar implementaciones → lápiz → Versión: Nueva versión → Implementar**. Así la URL no cambia.

## Paso 5: Conectar la página con la hoja

1. Abre `index.html` con un editor de texto (Bloc de notas, VS Code…).
2. Busca esta línea:

   ```js
   SCRIPT_URL: 'PEGAR_AQUI_URL_DE_APPS_SCRIPT',
   ```

3. Reemplaza el texto entre comillas por tu URL `/exec`, por ejemplo:

   ```js
   SCRIPT_URL: 'https://script.google.com/macros/s/AKfy.../exec',
   ```

4. Guarda el archivo. Desaparecerá el aviso de "Modo demostración".

## Paso 6: Publicar en GitHub Pages

1. En GitHub, crea un repositorio **público** (ej. `almuerzo-navideno`).
2. Pulsa **Add file → Upload files** y arrastra `index.html`, `logo-cfia.png`, `arbol-navidad.png` y las 4 fotos. Mantén los nombres exactos, con espacios incluidos. Pulsa **Commit changes**.
3. Ve a **Settings → Pages**, elige **Deploy from a branch**, rama **main** y carpeta **/ (root)**, y pulsa **Save**.
4. En 1 o 2 minutos la encuesta estará en `https://TU-USUARIO.github.io/almuerzo-navideno/`.

## Paso 7: Probar antes de compartir

1. Abre el enlace, elige un restaurante y pulsa **Confirmar mi voto**.
2. Revisa que aparezca una fila nueva en la pestaña **Votos**.
3. Recarga la página: debe decir "Ya registraste tu voto".
4. **Borra esa fila de prueba** antes de enviar el enlace al equipo.
5. Para volver a probar desde el mismo navegador, borra también el almacenamiento local: en Chrome, **F12 → Application → Local Storage → clic derecho → Clear**.

## Paso 8: Ver resultados y exportar a Excel

- En la hoja aparece el menú **Encuesta Navideña**:
  - **Descargar en Excel (.xlsx)**: descarga con un clic.
  - **Ver resultados**: muestra el conteo actual.
- También puedes usar **Archivo → Descargar → Microsoft Excel (.xlsx)**.
- Opcional: en `Code.gs`, `FECHA_CIERRE: '2026-12-04T17:00:00-06:00'` cierra la votación automáticamente en esa fecha.

---

**Limitación:** ningún método de un sitio estático es infalible. Una persona podría votar de nuevo desde otro navegador, en modo incógnito o con sus datos móviles. Si se necesita exactamente 1 voto por persona, la solución es pedir el correo institucional.
