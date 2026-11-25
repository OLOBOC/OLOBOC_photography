# GUÍA DE REVISIÓN LEGAL Y FISCAL — OLOBOC_ MOTORSPORT

**Fecha de elaboración:** Noviembre 2026  
**Desarrollo tecnológico:** Nortcode — https://www.nortcode.es/  
**Jurisdicción de aplicación:** España / Unión Europea

---

## 1. INTRODUCCIÓN Y ALCANCE

Este documento recoge los requisitos legales, fiscales y regulatorios que deben ser validados y completados por el **titular de la actividad, su gestoría fiscal y su asesoría jurídica** antes del lanzamiento comercial abierto de OLOBOC_.

La plataforma incluye una base técnica y contractual completa, pero requiere la aportación de datos identificativos reales y la validación jurídica formal.

---

## 2. CHECKLIST DE IDENTIFICACIÓN Y FISCALIDAD (LSSI-CE & HACIENDA)

- [ ] **Titularidad del negocio:**
  - Determinar si la actividad se ejercerá como persona física (autónomo / RETA) o persona jurídica (S.L.).
  - Indicar nombre completo o razón social en `LegalPage.tsx` (sustituyendo los componentes de marcador de posición).
- [ ] **NIF / CIF:**
  - Aportar NIF o CIF fiscalmente dado de alta en el censo de empresarios y profesionales de la AEAT (Modelo 036 o 037).
- [ ] **Epígrafe del IAE (Impuesto de Actividades Económicas):**
  - Epígrafe 973.1 (Servicios fotográficos) u homologado en producción audiovisual/venta digital.
- [ ] **Régimen de IVA aplicable:**
  - La plataforma calcula el **21% de IVA general** (Régimen general en España).
  - Confirmar si se aplica régimen de recargo de equivalencia o régimen general ordinario.
  - El sistema emite facturas simplificadas (justificantes de compra con NIF, desglose de base imponible y cuota tributaria conforme al RD 1619/2012).
- [ ] **Ventas intracomunitarias (OSS / ROI):**
  - Si se prevé superar el umbral de 10.000 € anuales en ventas B2C a consumidores de otros estados miembros de la UE, solicitar alta en la ventanilla única OSS (*One-Stop Shop*).

---

## 3. CHECKLIST DE PROTECCIÓN DE DATOS (RGPD & LOPDGDD 3/2018)

- [ ] **Registro de Actividades de Tratamiento (RAT):**
  - Documentar internamente el tratamiento: "Clientes y Compradores de Fotografías" y "Contacto y Peticiones de Retirada".
- [ ] **Delegado de Protección de Datos (DPD):**
  - Confirmar que la actividad no requiere designación obligatoria de DPD (no aplica tratamientos a gran escala de categorías especiales).
- [ ] **Contrato de Encargo del Tratamiento (Art. 28 RGPD):**
  - Aceptar los términos de tratamiento de datos con **Stripe Payments Europe, Ltd.** y con el proveedor de hosting / correo.
- [ ] **Canal para ejercicio de derechos ARSULIPO:**
  - La plataforma canaliza las solicitudes a través de `contacto@oloboc.com` y del formulario web específico con el selector "Derechos de imagen / retirada".

---

## 4. CHECKLIST DE COMERCIO ELECTRÓNICO (TRLGDCU)

- [ ] **Derecho de Desistimiento y Excepción Digital (Art. 103.m):**
  - Conforme al Art. 103.m del Real Decreto Legislativo 1/2007, el suministro de contenido digital que no se preste en soporte material está exceptuado del derecho de desistimiento de 14 días si la ejecución comienza con el consentimiento expreso previo del consumidor.
  - **Estado técnico:** Implementado y verificado en `CartDrawer.tsx` (casilla obligatoria de consentimiento expreso) y en la validación del endpoint `/checkout/create-session`.
- [ ] **Condiciones Generales de Contratación:**
  - Disponibles en `LegalPage.tsx` bajo la ruta `#condiciones-compra` con detalle de precio, formato digital, validez de descarga de 7 días y resolución de litigios UE.

---

## 5. DERECHOS DE IMAGEN EN EL MOTORSPORT (LEY ORGÁNICA 1/1982)

- [ ] **Carácter deportivo y público:**
  - Las fotografías capturadas en tramos de rally o circuitos autorizados cuentan con la consideración de evento público conforme al Art. 8.2 de la Ley Orgánica 1/1982 (la presencia de pilotos y asistentes resulta accesoria a la manifestación deportiva).
- [ ] **Protocolo de retirada ágil (Takedown):**
  - La plataforma dispone de un circuito específico en el formulario de contacto para que cualquier piloto o asistente solicite la retirada fundamentada de una imagen, administrable desde el panel de control.
