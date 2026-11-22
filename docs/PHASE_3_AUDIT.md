# Auditoría Técnica y Funcional — Fase 3: OLOBOC_

**Plataforma de Fotografía Motorsport OLOBOC_**  
*Auditoría realizada por Nortcode ([https://www.nortcode.es/](https://www.nortcode.es/))*  
*Fecha: Noviembre 2026*

---

## 1. Resumen de la Auditoría

Se ha realizado una inspección exhaustiva de todo el repositorio, contrastando la experiencia del visitante (exploración, selección, carrito, compras, descargas) con las herramientas del fotógrafo (administración, subida masiva, organización de eventos y revisión de dorsales).

A continuación se detallan los 12 problemas reales identificados en el código existente, su causa técnica y la solución que se implementará en esta fase.

---

## 2. Matriz de Hallazgos y Problemas Identificados

### Hallazgo 1: Límite de Multer y colapso de memoria en la subida masiva
- **Problema detectado**: Al intentar subir más de 20 fotografías a la vez, el servidor falla con `MulterError: Unexpected field` o satura la memoria del proceso Node.js.
- **Archivo o componente afectado**: `server/src/routes/photos.routes.ts` (`upload.array('photos', 20)`) y `client/src/pages/AdminPage.tsx` (`handlePhotoUpload`).
- **Causa real**: El middleware de subida en backend tenía una cota fija de 20 archivos en memoria (`limits.files: 20`). Además, el cliente enviaba todos los archivos en un único formulario POST masivo, sin división en fragmentos (*chunking/concurrency*), sin vista previa de miniaturas en cliente y sin cancelación de archivos individuales.
- **Solución propuesta**: 
  1. Implementar en `AdminPage.tsx` un gestor de subida por lotes secuenciales/concurrentes (2-4 fotos por petición) con generación de miniaturas locales (`URL.createObjectURL`), barra de progreso individual por archivo, barra de progreso global, botón de pausa/cancelación y reintento de fallidos.
  2. Aumentar el límite de Multer en backend por petición pequeña y procesar en *streaming*.
- **Prioridad**: CRÍTICA.
- **Estado de verificación**: Confirmado en código y reproducido.

---

### Hallazgo 2: Falta de selección múltiple y barra flotante en la galería pública
- **Problema detectado**: En la galería de eventos, las fotos solo se pueden añadir una a una haciendo clic en cada una. No existe una barra flotante de selección con recuento, importe total y botón "Añadir todas al carrito".
- **Archivo o componente afectado**: `client/src/pages/EventDetailPage.tsx` y `client/src/context/CartContext.tsx`.
- **Causa real**: `CartContext` solo ofrece `togglePhoto` individual. No existe función `addPhotos(photos[])` para selección por lotes, lo que provocaría re-renderizados múltiples y llamadas redundantes a `api.getQuote`. Tampoco existe el componente UI de barra flotante de selección con cálculo de pack en vivo.
- **Solución propuesta**:
  1. Extender `CartContext` con `addPhotos` y `removePhotos`.
  2. Implementar una barra flotante inferior dinámica en `EventDetailPage.tsx` que muestre: recuento de seleccionadas, desglose de precio con el pack óptimo aplicado, botón "Añadir selección al carrito" y botón "Limpiar".
  3. Añadir botón de "Seleccionar todo el evento" o "Seleccionar resultados de dorsal".
- **Prioridad**: ALTA.
- **Estado de verificación**: Confirmado en código.

---

### Hallazgo 3: Los packs y descuentos por volumen no son visibles en la galería
- **Problema detectado**: El visitante de una galería no ve en ningún sitio que existen packs de 3, 5 o 10 fotos con descuento hasta que abre el carrito. Esto perjudica la conversión comercial de compra.
- **Archivo o componente afectado**: `client/src/pages/EventDetailPage.tsx` y `client/src/components/CartDrawer.tsx`.
- **Causa real**: La información de packs (`PackItem`) solo se consulta en el panel de administración o internamente en el backend. No se expone un banner o barra de precios en la cabecera de la galería.
- **Solución propuesta**: Incorporar en la cabecera del evento una tira informativa con los packs vigentes (ej. *1 Foto: 1,49 € · Pack 3: 3,49 € (-22%) · Pack 5: 4,99 € (-33%) · Pack 10: 8,99 € (-40%)*), con selector reactivo según las fotos marcadas.
- **Prioridad**: ALTA.
- **Estado de verificación**: Confirmado en código.

---

### Hallazgo 4: Falta de navegación por teclado y atajos en el visor de fotos
- **Problema detectado**: El visor de fotos `PhotoViewer` no permitía alternar el zoom con teclado ni atajos rápidos para seleccionar/comprar (ej. pulsar tecla Espacio o `S` para añadir a la selección).
- **Archivo o componente afectado**: `client/src/components/PhotoViewer.tsx`.
- **Causa real**: Los eventos `keydown` solo escuchaban `ArrowRight`, `ArrowLeft` y `Escape`.
- **Solución propuesta**: Añadir listener para tecla `Space` / `S` (seleccionar / quitar del carrito), `Z` (alternar zoom) e indicador táctil de swipe optimizado para dispositivos móviles.
- **Prioridad**: MEDIA.
- **Estado de verificación**: Confirmado en código.

---

### Hallazgo 5: Navegación por hash rompe el scroll a secciones (`#discover`, `#about`, `#contact`)
- **Problema detectado**: Al pulsar en el menú superior "Dorsal", "Sobre mí" o "Contacto", la URL cambia a `#discover`, `#about` o `#contact`, pero la aplicación forzaba `window.scrollTo({ top: 0 })` impidiendo que la pantalla se desplace a la sección deseada.
- **Archivo o componente afectado**: `client/src/App.tsx` (función `handleHashChange`).
- **Causa real**: `App.tsx` ejecutaba siempre `window.scrollTo({ top: 0, behavior: 'smooth' })` indiscriminadamente ante cualquier evento `hashchange`, cancelando el scroll nativo a elementos con ese `id`.
- **Solución propuesta**: Detectar si el hash corresponde a un ancla interna (`discover`, `about`, `contact`) y hacer scroll suave hacia el elemento correspondiente (`document.getElementById(hash)?.scrollIntoView()`).
- **Prioridad**: MEDIA.
- **Estado de verificación**: Confirmado en código.

---

### Hallazgo 6: Ausencia de herramientas de organización en la galería del administrador
- **Problema detectado**: En la pestaña "Fotografías del evento" del panel de administración (`activeTab === 'photos'`), solo hay una cuadrícula básica con botones individuales. Si un evento tiene 300 fotos, no se pueden seleccionar varias fotos para eliminarlas, ni cambiar su visibilidad, ni ordenarlas por dorsal o fecha.
- **Archivo o componente afectado**: `client/src/pages/AdminPage.tsx`.
- **Causa real**: Faltaban los estados y controles de selección múltiple, filtrado por estado OCR, búsqueda por nombre de archivo y las llamadas de API de borrado masivo en backend.
- **Solución propuesta**:
  1. Añadir endpoint `POST /api/photos/admin/batch-delete` en backend.
  2. Implementar en `AdminPage.tsx`: conmutador vista cuadrícula / lista, selección de todas, borrado masivo con modal de confirmación, filtro por dorsal y filtro por estado OCR (`COMPLETED`, `QUEUED`, `FAILED`).
- **Prioridad**: ALTA.
- **Estado de verificación**: Confirmado en código.

---

### Hallazgo 7: Revisión de dorsales sin modo consecutivo (*Focus Mode*)
- **Problema detectado**: En la pestaña de revisión de dorsales, cuando hay 50 detecciones, el fotógrafo debe buscar en una cuadrícula y hacer clic con el ratón tarjeta por tarjeta. No existe un modo de revisión rápida a pantalla completa con atajos de teclado.
- **Archivo o componente afectado**: `client/src/pages/AdminPage.tsx`.
- **Causa real**: La interfaz solo renderizaba tarjetas fijas en grid.
- **Solución propuesta**: Añadir botón "MODO REVISIÓN RÁPIDA (CONSECUTIVA)" que abre un modal enfocado con:
  - Imagen y recorte del dorsal en grande.
  - Atajos de teclado: `Enter` (Confirmar y pasar a la siguiente), `R` o `Delete` (Descartar y siguiente), `E` (Editar número), flecha derecha (Omitir).
  - Contador de progreso: "Detección 4 de 28".
- **Prioridad**: ALTA.
- **Estado de verificación**: Confirmado en diseño.

---

### Hallazgo 8: Claridad en el estado del pago con Stripe (Modo Sandbox vs Sin configurar)
- **Problema detectado**: Si `STRIPE_SECRET_KEY` no está configurado, el sistema podía crear una sesión simulada sin alertar claramente al usuario de que se trata de un entorno de pruebas sin transacción monetaria real.
- **Archivo o componente afectado**: `client/src/components/CartDrawer.tsx` y `server/src/services/stripe.service.ts`.
- **Causa real**: El endpoint `/create-session` devolvía un token de descarga directo cuando Stripe estaba en modo DEV, saltando a `#order-success` sin un aviso visual explícito de que no se ha producido un cobro bancario real.
- **Solución propuesta**: 
  1. Mostrar un aviso explícito en el carrito y en la página de éxito indicando si la plataforma opera en `MODO PRUEBAS / SIMULACIÓN` o en `PASARELA SEGURA STRIPE REAL`.
  2. Deshabilitar pagos simulados si la aplicación se ejecuta con `NODE_ENV=production`.
- **Prioridad**: ALTA.
- **Estado de verificación**: Confirmado en código.

---

### Hallazgo 9: Experiencia móvil con botones de acción pequeños
- **Problema detectado**: En pantallas móviles (<480px), los botones de añadir a selección sobre las imágenes y los controles del visor eran demasiado pequeños o quedaban superpuestos.
- **Archivo o componente afectado**: `client/src/index.css` y `client/src/components/Header.tsx`.
- **Causa real**: Faltaban reglas `@media (max-width: 640px)` para ampliar las áreas táctiles a un mínimo de 44x44px conforme a las guías de accesibilidad móvil (WCAG).
- **Solución propuesta**: Ampliar tamaño de botones táctiles en móvil, fijar la barra de selección flotante en la parte inferior de la pantalla con soporte para notch de iPhone (`env(safe-area-inset-bottom)`).
- **Prioridad**: MEDIA.
- **Estado de verificación**: Confirmado en CSS.

---

### Hallazgo 10: Falta de skeleton loaders y transiciones de carga fluidas
- **Problema detectado**: Al cargar galerías con muchas fotos, el usuario veía una pantalla negra con texto simple "Cargando galería..." en lugar de una experiencia visual fluida con esqueletos animados que preparen el ojo para el contenido.
- **Archivo o componente afectado**: `client/src/pages/EventDetailPage.tsx` y `client/src/pages/ArchivePage.tsx`.
- **Causa real**: Las vistas usaban un bloque condicional `if (loading) return <div>...</div>`.
- **Solución propuesta**: Crear componente `PhotoSkeletonGrid` con animación de pulso (*shimmer*) motorsport y transiciones suaves de opacidad al cargar las imágenes.
- **Prioridad**: MEDIA.
- **Estado de verificación**: Confirmado en código.

---

### Hallazgo 11: Búsqueda por dorsal sin filtro por evento
- **Problema detectado**: En la página principal, el buscador de dorsales buscaba en todo el historial sin permitir acotar la búsqueda a un evento específico.
- **Archivo o componente afectado**: `client/src/pages/HomePage.tsx` y `server/src/routes/photos.routes.ts`.
- **Causa real**: El frontend no incluía el selector de eventos en el formulario de la home, aunque el backend ya soportaba el parámetro `eventId`.
- **Solución propuesta**: Añadir selector desplegable de evento junto al campo de dorsal en la página de inicio.
- **Prioridad**: MEDIA.
- **Estado de verificación**: Confirmado en código.

---

### Hallazgo 12: Ausencia de ordenación en las galerías de evento
- **Problema detectado**: El visitante de una galería no podía ordenar las fotografías por dorsal ascendente/descendente ni por más recientes.
- **Archivo o componente afectado**: `client/src/pages/EventDetailPage.tsx`.
- **Causa real**: La lista `filteredPhotos` se renderizaba en el orden estricto en que venía de base de datos.
- **Solución propuesta**: Añadir selector de ordenación: *Predeterminado*, *Dorsal (menor a mayor)*, *Dorsal (mayor a menor)*, *Nombre*.
- **Prioridad**: BAJA.
- **Estado de verificación**: Confirmado en código.

---

## 3. Plan de Acción y Ejecución

1. **Fase A (Backend)**: Añadir endpoint de borrado múltiple de fotos (`/api/photos/admin/batch-delete`) y endpoint de packs públicos (`/api/pricing/packs`).
2. **Fase B (Estado y Carrito)**: Actualizar `CartContext` con soporte de selección múltiple masiva y persistencia robusta.
3. **Fase C (Galería y Selección)**: Implementar barra flotante de selección con cálculo de pack en vivo, packs visibles en cabecera, skeletons y ordenación.
4. **Fase D (Visor de Fotos)**: Atajos de teclado (`Space`, `Z`), navegación mejorada e indicador táctil móvil.
5. **Fase E (Administración)**: Gestor de subida masiva con miniaturas locales y progreso individual; herramientas de selección y borrado múltiple en fotos; modo de revisión consecutiva de dorsales con atajos de teclado.
6. **Fase F (Estilos, Responsive y Movimiento)**: Skeletons con shimmer, animaciones de entrada, soporte para `prefers-reduced-motion` y adaptación completa a móvil.
7. **Fase G (Validación y Pruebas)**: Ejecución de las suites de prueba de backend y cliente, comprobación de los 3 flujos obligatorios (Visitante, Administrador, Compra).
