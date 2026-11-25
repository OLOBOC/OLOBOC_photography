import React from 'react';

interface LegalPageProps {
  page: 'aviso-legal' | 'privacidad' | 'cookies' | 'licencia-imagen' | 'condiciones-compra';
  onNavigate: (route: string) => void;
}

export const LegalPage: React.FC<LegalPageProps> = ({ page, onNavigate }) => {
  const Placeholder = ({ text }: { text: string }) => (
    <span
      style={{
        background: 'rgba(232, 67, 31, 0.15)',
        border: '1px dashed var(--ac)',
        padding: '1px 6px',
        fontFamily: 'IBM Plex Mono',
        fontSize: '12px',
        color: '#ff9d85'
      }}
    >
      [PENDIENTE DE DEFINICIÓN LEGAL: {text}]
    </span>
  );

  const renderContent = () => {
    switch (page) {
      case 'aviso-legal':
        return (
          <>
            <h1 className="font-display" style={{ fontSize: 'clamp(48px, 8vw, 96px)', marginBottom: '24px' }}>
              Aviso legal
            </h1>
            <p className="font-mono" style={{ color: 'var(--mut)', marginBottom: '28px' }}>
              Documento estructurado conforme a la Ley 34/2002 (LSSI-CE). Requiere revisión profesional antes de producción.
            </p>

            <h3 className="font-display" style={{ fontSize: '28px', marginTop: '24px', marginBottom: '8px' }}>
              1. Datos identificativos del titular
            </h3>
            <p style={{ lineHeight: 1.6, marginBottom: '16px' }}>
              En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE):<br />
              <strong>Titular de la marca y contenidos:</strong> OLOBOC_ (<Placeholder text="Nombre completo o razón social del titular" />)<br />
              <strong>NIF/CIF:</strong> <Placeholder text="NIF o CIF aplicable" /><br />
              <strong>Domicilio de actividad:</strong> <Placeholder text="Dirección o provincia de actividad fiscal" /><br />
              <strong>Correo electrónico de contacto:</strong> contacto@oloboc.com<br />
              <strong>Datos registrales:</strong> <Placeholder text="Registro mercantil o datos censales si procede" />
            </p>

            <h3 className="font-display" style={{ fontSize: '28px', marginTop: '24px', marginBottom: '8px' }}>
              2. Actividad y objeto de la plataforma
            </h3>
            <p style={{ lineHeight: 1.6, marginBottom: '16px' }}>
              OLOBOC_ es una plataforma web especializada en fotografía deportiva de automovilismo (rally, rallysprint, circuito y drift), facilitando la visualización con marcas de agua y la adquisición de licencias digitales de descarga en alta resolución.
            </p>

            <h3 className="font-display" style={{ fontSize: '28px', marginTop: '24px', marginBottom: '8px' }}>
              3. Desarrollo tecnológico
            </h3>
            <p style={{ lineHeight: 1.6, marginBottom: '16px' }}>
              La solución tecnológica y el desarrollo Full Stack han sido realizados por la empresa tecnológica{' '}
              <a href="https://www.nortcode.es/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
                Nortcode
              </a>.
            </p>

            <h3 className="font-display" style={{ fontSize: '28px', marginTop: '24px', marginBottom: '8px' }}>
              4. Propiedad intelectual y condiciones de uso
            </h3>
            <p style={{ lineHeight: 1.6, marginBottom: '16px' }}>
              Todas las fotografías, logotipos, código, diseño gráfico y contenidos multimedia alojados en esta plataforma son propiedad exclusiva de OLOBOC_ o cuentan con la debida licencia. Queda prohibida la reproducción, distribución, comunicación pública o transformación no autorizada expresamente.
            </p>
          </>
        );

      case 'privacidad':
        return (
          <>
            <h1 className="font-display" style={{ fontSize: 'clamp(48px, 8vw, 96px)', marginBottom: '24px' }}>
              Política de privacidad
            </h1>
            <p className="font-mono" style={{ color: 'var(--mut)', marginBottom: '28px' }}>
              Conforme al Reglamento General de Protección de Datos (RGPD UE 2016/679) y LOPDGDD 3/2018.
            </p>

            <h3 className="font-display" style={{ fontSize: '28px', marginTop: '24px', marginBottom: '8px' }}>
              1. Responsable del tratamiento
            </h3>
            <p style={{ lineHeight: 1.6, marginBottom: '16px' }}>
              <strong>Responsable:</strong> OLOBOC_ (<Placeholder text="Identidad del responsable" />)<br />
              <strong>Contacto de protección de datos:</strong> contacto@oloboc.com
            </p>

            <h3 className="font-display" style={{ fontSize: '28px', marginTop: '24px', marginBottom: '8px' }}>
              2. Finalidades y bases jurídicas
            </h3>
            <ul style={{ paddingLeft: '20px', lineHeight: 1.7, marginBottom: '16px' }}>
              <li>
                <strong>Gestión de compras y entrega digital:</strong> Tratamiento del email y datos de transacción para tramitar el pedido mediante Stripe y suministrar el token de descarga segura (Base: Art. 6.1.b RGPD, ejecución contractual).
              </li>
              <li>
                <strong>Atención de consultas y soporte:</strong> Responder a solicitudes de contacto o derechos de imagen recibidas a través del formulario (Base: Art. 6.1.f RGPD, interés legítimo / consentimiento Art. 6.1.a).
              </li>
            </ul>

            <h3 className="font-display" style={{ fontSize: '28px', marginTop: '24px', marginBottom: '8px' }}>
              3. Destinatarios y encargados del tratamiento
            </h3>
            <p style={{ lineHeight: 1.6, marginBottom: '16px' }}>
              Los pagos se procesan a través de la pasarela Stripe Payments Europe, Ltd., que actúa de forma independiente en cumplimiento de PCI-DSS. No se almacenan datos bancarios ni números de tarjeta en nuestros servidores.
            </p>

            <h3 className="font-display" style={{ fontSize: '28px', marginTop: '24px', marginBottom: '8px' }}>
              4. Ejercicio de derechos y retirada de imágenes
            </h3>
            <p style={{ lineHeight: 1.6, marginBottom: '16px' }}>
              Puedes ejercer tus derechos de acceso, rectificación, supresión, limitación y oposición enviando un correo a contacto@oloboc.com. Asimismo, tienes derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>aepd.es</a>).
            </p>
          </>
        );

      case 'cookies':
        return (
          <>
            <h1 className="font-display" style={{ fontSize: 'clamp(48px, 8vw, 96px)', marginBottom: '24px' }}>
              Política de cookies
            </h1>
            <p className="font-mono" style={{ color: 'var(--mut)', marginBottom: '28px' }}>
              Información clara sobre almacenamiento local y cookies técnicas.
            </p>

            <h3 className="font-display" style={{ fontSize: '28px', marginTop: '24px', marginBottom: '8px' }}>
              1. ¿Qué tecnologías utilizamos?
            </h3>
            <p style={{ lineHeight: 1.6, marginBottom: '16px' }}>
              Esta plataforma utiliza exclusivamente cookies técnicas necesarias para mantener la sesión segura del panel de administración y el almacenamiento local (localStorage) para persistir la selección temporal de fotografías en tu carrito mientras navegas.
            </p>

            <h3 className="font-display" style={{ fontSize: '28px', marginTop: '24px', marginBottom: '8px' }}>
              2. Inventario de cookies y almacenamiento
            </h3>
            <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>NOMBRE</th>
                    <th>TIPO</th>
                    <th>FINALIDAD</th>
                    <th>CADUCIDAD</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>oloboc_cart</td>
                    <td>LocalStorage</td>
                    <td>Guardar temporalmente las fotos seleccionadas por el visitante</td>
                    <td>Persistente en navegador</td>
                  </tr>
                  <tr>
                    <td>oloboc_cookie_consent</td>
                    <td>LocalStorage</td>
                    <td>Recordar las preferencias de cookies del usuario</td>
                    <td>1 año</td>
                  </tr>
                  <tr>
                    <td>oloboc_admin_token</td>
                    <td>Cookie HttpOnly</td>
                    <td>Sesión autenticada privada para el panel de administración</td>
                    <td>24 horas</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        );

      case 'licencia-imagen':
        return (
          <>
            <h1 className="font-display" style={{ fontSize: 'clamp(48px, 8vw, 96px)', marginBottom: '24px' }}>
              Licencia y derechos de imagen
            </h1>
            <p className="font-mono" style={{ color: 'var(--mut)', marginBottom: '28px' }}>
              Bases reguladoras de uso de las fotografías de motorsport capturadas por OLOBOC_.
            </p>

            <h3 className="font-display" style={{ fontSize: '28px', marginTop: '24px', marginBottom: '8px' }}>
              1. Licencia digital adquirida (Descarga sin marca de agua)
            </h3>
            <p style={{ lineHeight: 1.6, marginBottom: '16px' }}>
              La compra de una o varias fotografías a través de OLOBOC_ otorga al adquirente una <strong>licencia no exclusiva de uso personal y difusión en redes sociales</strong> personales o del equipo de competición retratado.<br />
              <strong>Condición:</strong> Se agradece y requiere la mención de autoría etiquetando a <strong>@oloboc_</strong>.<br />
              <strong>Restricción comercial:</strong> La compra no transfiere derechos de propiedad intelectual ni autoriza la reventa, cesión a bancos de imágenes, uso publicitario masivo o comercial sin contrato específico previo.
            </p>

            <h3 className="font-display" style={{ fontSize: '28px', marginTop: '24px', marginBottom: '8px' }}>
              2. Fotografía en eventos deportivos y derechos de imagen
            </h3>
            <p style={{ lineHeight: 1.6, marginBottom: '16px' }}>
              Las fotografías publicadas han sido tomadas en el contexto de competiciones deportivas oficiales o concentraciones públicas de motorsport. Conforme a la legislación vigente (Ley Orgánica 1/1982 sobre protección civil del derecho al honor, a la intimidad personal y familiar y a la propia imagen), la captación de imágenes de eventos públicos donde la presencia de personas es meramente accesoria al evento deportivo está permitida.
            </p>

            <h3 className="font-display" style={{ fontSize: '28px', marginTop: '24px', marginBottom: '8px' }}>
              3. Procedimiento ágil de revisión o retirada
            </h3>
            <p style={{ lineHeight: 1.6, marginBottom: '16px' }}>
              Si eres piloto, copiloto, comisario o asistente a un evento y por motivos fundamentados deseas solicitar la retirada o revisión de una fotografía en la que aparezcas de forma identificable, puedes solicitarlo de forma rápida mediante nuestro formulario de contacto seleccionando el motivo «Derechos de imagen / retirada». Nuestro equipo atenderá tu solicitud con la máxima prioridad.
            </p>

            <div style={{ marginTop: '20px' }}>
              <button
                onClick={() => onNavigate('contact')}
                className="btn btn-primary"
              >
                SOLICITAR REVISIÓN O RETIRADA →
              </button>
            </div>
          </>
        );

      case 'condiciones-compra':
        return (
          <>
            <h1 className="font-display" style={{ fontSize: 'clamp(48px, 8vw, 96px)', marginBottom: '24px' }}>
              Condiciones de compra
            </h1>
            <p className="font-mono" style={{ color: 'var(--mut)', marginBottom: '28px' }}>
              Regulación de venta digital y contratación conforme al TRLGDCU (RDL 1/2007) y Ley 34/2002 (LSSI-CE).
            </p>

            <h3 className="font-display" style={{ fontSize: '28px', marginTop: '24px', marginBottom: '8px' }}>
              1. Naturaleza del servicio y producto digital
            </h3>
            <p style={{ lineHeight: 1.6, marginBottom: '16px' }}>
              OLOBOC_ comercializa exclusivamente <strong>archivos digitales de fotografía deportiva en alta resolución</strong> (formato JPEG/RAW procesado, sin marca de agua). No se realiza envío de copias físicas o soportes materiales.
            </p>

            <h3 className="font-display" style={{ fontSize: '28px', marginTop: '24px', marginBottom: '8px' }}>
              2. Precios e impuestos aplicables
            </h3>
            <p style={{ lineHeight: 1.6, marginBottom: '16px' }}>
              Todos los precios mostrados en la plataforma se expresan en Euros (€) e <strong>incluyen el Impuesto sobre el Valor Añadido (IVA general del 21% aplicable en España)</strong>. El usuario puede descargar una factura simplificada o justificante desglosado inmediatamente tras la confirmación de su pago.
            </p>

            <h3 className="font-display" style={{ fontSize: '28px', marginTop: '24px', marginBottom: '8px' }}>
              3. Excepción legal al derecho de desistimiento
            </h3>
            <div style={{ background: 'rgba(232, 67, 31, 0.08)', border: '1px solid var(--ac)', padding: '16px', marginBottom: '16px' }}>
              <p style={{ lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
                De conformidad con el <strong>artículo 103, letra m) del Real Decreto Legislativo 1/2007 (TRLGDCU)</strong>, el derecho de desistimiento de 14 días no es aplicable al suministro de contenido digital que no se preste en soporte material cuando la ejecución ha comenzado con el previo consentimiento expreso del consumidor y usuario con el conocimiento por su parte de que en consecuencia pierde su derecho de desistimiento.
              </p>
            </div>
            <p style={{ lineHeight: 1.6, marginBottom: '16px' }}>
              Dado que la entrega de los enlaces de descarga directa sin marcas de agua se produce de forma automática e inmediata al validar el pago bancario, el cliente acepta y consiente expresamente dicha pérdida de desistimiento antes de finalizar su compra.
            </p>

            <h3 className="font-display" style={{ fontSize: '28px', marginTop: '24px', marginBottom: '8px' }}>
              4. Plazo y límites de descarga
            </h3>
            <p style={{ lineHeight: 1.6, marginBottom: '16px' }}>
              Cada pedido garantiza un acceso de descarga mediante enlace securizado con token criptográfico válido durante un plazo mínimo de <strong>7 días naturales</strong> a partir de la confirmación de la compra, con un límite de hasta 5 descargas por archivo. Transcurrido dicho plazo, el comprador puede solicitar la reemisión de enlaces contactando con soporte con su comprobante de compra.
            </p>

            <h3 className="font-display" style={{ fontSize: '28px', marginTop: '24px', marginBottom: '8px' }}>
              5. Resolución de litigios en línea
            </h3>
            <p style={{ lineHeight: 1.6, marginBottom: '16px' }}>
              Conforme al Art. 14.1 del Reglamento (UE) 524/2013, la Comisión Europea facilita una plataforma de resolución de litigios en línea accesible en el siguiente enlace:{' '}
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>
                https://ec.europa.eu/consumers/odr
              </a>.
            </p>
          </>
        );
    }
  };

  return (
    <div className="page-pad" style={{ maxWidth: '860px' }}>
      <button onClick={() => onNavigate('home')} className="btn btn-sm" style={{ marginBottom: '24px' }}>
        ← VOLVER AL INICIO
      </button>

      {renderContent()}

      <div style={{ marginTop: '50px', borderTop: '1px solid var(--line)', paddingTop: '20px' }}>
        <p className="font-mono" style={{ fontSize: '11px', color: 'var(--mut)' }}>
          Aviso: Este texto constituye una estructura legal técnica y contractual preparatoria. Debe someterse a validación definitiva por parte de la asesoría jurídica del titular antes del despliegue público comercial final.
        </p>
      </div>
    </div>
  );
};
