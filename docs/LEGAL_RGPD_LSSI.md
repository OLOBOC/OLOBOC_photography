# Marco Legal, RGPD y Derechos de Imagen — OLOBOC_

Estructura preparada por **Nortcode** (https://www.nortcode.es/).

---

## 1. Cumplimiento de LSSI-CE y RGPD

La plataforma ha sido desarrollada con una arquitectura de **Privacidad por Diseño**:
- **Minimización de datos**: Para compras como invitado solo se solicita la dirección de correo electrónico necesaria para la entrega digital del token y el recibo de Stripe.
- **Sin rastreo encubierto**: No se instalan cookies de analítica ni seguimiento antes de obtener el consentimiento expreso del usuario a través del banner de cookies.
- **Aviso Legal**: Dispone de campos claramente identificados para la razón social, NIF y domicilio de OLOBOC_.

---

## 2. Fotografía Deportiva y Derechos de Imagen

### 2.1. Marco Normativo (España)
Conforme a la Ley Orgánica 1/1982, de 5 de mayo, sobre protección civil del derecho al honor, a la intimidad personal y familiar y a la propia imagen:
- Las imágenes captadas en eventos deportivos públicos donde la figura humana resulta meramente accesoria al desarrollo de la prueba no vulneran el derecho a la propia imagen.
- No obstante, la explotación comercial y publicitaria indiscriminada de rostros identificables (especialmente de menores o personal no deportivo) requiere cautela.

### 2.2. Procedimiento de Solicitud de Retirada Implementado
La plataforma implementa un canal específico de retirada:
1. El usuario accede al formulario de contacto y selecciona el motivo «Derechos de imagen / retirada».
2. El sistema crea un registro en la tabla `TakedownRequest` vinculando la fotografía y los datos del solicitante.
3. El administrador visualiza la alerta en el panel de control (`/admin` -> pestaña *Derechos Imagen*).
4. Al pulsar «ACEPTAR Y OCULTAR», la fotografía se despublica y se inhabilita comercialmente de forma inmediata (`isPublished: false, isCommercial: false`).

---

## 3. Cuestiones Pendientes de Asesoramiento Fiscal y Jurídico

> [!WARNING]
> La siguiente lista de elementos requiere validación por parte del asesor fiscal y legal del titular antes del inicio de la actividad comercial:
1. **Fiscalidad y Régimen de IVA**: Determinación de si la venta de fotografías digitales tributa al tipo general de IVA (21% en España) o al régimen especial de artistas/fotógrafos, así como la aplicación del régimen de ventanilla única (OSS) para ventas a particulares de la UE.
2. **Emisión de Facturas**: Configuración de facturas simplificadas automáticas para clientes que las soliciten a través de Stripe Invoicing.
3. **Excepción al Derecho de Desistimiento**: El Real Decreto Legislativo 1/2007 (art. 103.m) excluye el derecho de desistimiento en el suministro de contenido digital cuando la ejecución haya comenzado con el consentimiento previo del consumidor. Este reconocimiento está integrado en el flujo de compra.
