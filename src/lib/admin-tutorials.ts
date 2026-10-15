import type { AdminNavigationHref } from "@/lib/admin-navigation";
import type { UserRole } from "@/types/database";

export type TutorialStep = {
  target?: string;
  title: string;
  description: string;
  roles?: readonly UserRole[];
};

const step = (target: string, title: string, description: string, roles?: readonly UserRole[]): TutorialStep => ({
  target: `[data-tour="${target}"]`, title, description, roles,
});
const intro = (title: string, description: string): TutorialStep => ({ target: "h1", title, description });
const search = (description: string) => step("page-search", "Encuentra lo que necesitas", description);
const pagination = step("pagination", "Recorre los resultados", "Cambia de página y elige cuántos registros ver. La búsqueda se conserva al navegar.");
const tableSteps = [
  search("Escribe un texto, elige una columna o busca en todas y pulsa Buscar. Usa los encabezados de la tabla para ordenar los resultados."),
  step("table-columns", "Elige las columnas", "Abre Columnas para mostrar u ocultar información y hacer más cómodo el listado. En pantallas pequeñas puedes desplazar la tabla horizontalmente."),
  step("table-records", "Consulta los registros", "Cada fila corresponde a un registro. Si hay acciones disponibles, aparecen en sus columnas. Un listado vacío indica que todavía no hay registros o que la búsqueda no tiene coincidencias."),
  pagination,
];

// Targets are explicit anchors, never text matches or row positions. Missing/hidden
// targets are skipped so empty lists and role-specific controls remain valid.
export const adminTutorials = {
  "/admin": [
    intro("Tu panel administrativo", "Aquí tienes un resumen de la operación y las estadísticas del hostal. Este recorrido te explica cómo leer cada bloque."),
    step("dashboard-metrics", "Resumen operativo", "Consulta los indicadores de habitaciones, reservas y pagos que aparecen en este bloque. Revisa la etiqueta de cada indicador para identificar qué está contando."),
    step("dashboard-reach", "Alcance del sitio", "Visitas, visitantes únicos, tiempo promedio y rebote resumen el uso de la web pública. Los gráficos comparan medios de llegada, países y dispositivos."),
    step("dashboard-revenue", "Ingresos y reservas", "Consulta la evolución mensual de ingresos y la distribución de reservas por canal y estado. Estos gráficos permiten reconocer tendencias."),
  ],
  "/admin/habitaciones": [
    intro("Gestiona las habitaciones", "Aquí puedes registrar habitaciones, revisar sus características y mantener sus fotos y tarifa asociada."),
    step("room-create", "Registra una habitación", "Completa número, tipo, piso, capacidad y descripción. El estado Activa determina si puede ofrecerse para reservas."),
    step("room-rate", "Asigna una tarifa existente", "Selecciona la tarifa para esta habitación. El precio se administra en Tarifas; al reservar se utiliza la tarifa asociada aquí."),
    step("room-images", "Añade fotografías", "Selecciona o arrastra imágenes JPG, PNG, WEBP o GIF de hasta 5 MB cada una. Al editar puedes agregar fotos y eliminar las existentes."),
    ...tableSteps,
    step("room-edit", "Edita una habitación", "Editar abre sus datos y fotografías en una ventana. Revisa los cambios y guárdalos al terminar."),
  ],
  "/admin/huespedes": [
    intro("Consulta las fichas de huéspedes", "Aquí se gestiona la información documental del huésped junto con los datos de contacto de su cuenta."),
    step("guest-create", "Crea primero al cliente", "Crear cliente abre el registro de su cuenta y ficha documental. Luego podrás encontrarlo en este listado."),
    ...tableSteps,
    step("guest-reserve", "Crea una reserva para el huésped", "Esta acción abre una nueva reserva con el huésped ya seleccionado. Después eliges fechas y una habitación disponible."),
    step("guest-edit", "Actualiza su ficha", "Editar permite corregir los datos documentales. Comprueba el tipo y número de documento antes de guardar."),
  ],
  "/admin/clientes/nuevo": [
    intro("Registra un nuevo cliente", "Este formulario crea la cuenta de acceso, el perfil y la ficha del huésped en un mismo proceso."),
    step("client-contact", "Datos de contacto", "Ingresa nombre, correo y teléfono del cliente. El teléfono es obligatorio y se usa como contraseña inicial; el cliente deberá cambiarla al ingresar."),
    step("client-document", "Identificación del huésped", "Completa tipo y número de documento y país. Revisa los datos para evitar duplicados de correo, teléfono o documento."),
    step("client-save", "Guarda y continúa", "Pulsa Crear cliente después de revisar el formulario. Cuando se cree correctamente, se ofrecerá continuar con una reserva para ese cliente."),
  ],
  "/admin/reserva-detalle": [
    intro("Sigue cada reserva", "Esta vista reúne la reserva, el cliente, la habitación y el seguimiento de pagos. Las acciones dependen del estado de cada reserva."),
    search("Busca por código de reserva, estado o datos del cliente, como nombre, correo o teléfono. Pulsa Buscar para aplicar el filtro."),
    step("reservation-records", "Lee las tarjetas", "Cada tarjeta resume fechas, habitación, importe, pago y estado. Si no hay resultados, prueba otra búsqueda o registra una reserva desde la ficha de un huésped."),
    step("reservation-details", "Abre los detalles", "Los botones de detalle permiten consultar la reserva, cliente, habitación, transacciones y seguimiento en ventanas separadas."),
    step("reservation-payment", "Gestiona el pago pendiente", "Cuando corresponda, aquí puedes subir un comprobante recibido o confirmar un pago manual. Si hay un archivo por verificar, revísalo antes de aprobar o rechazar."),
    pagination,
  ],
  "/admin/verificar-comprobantes": [
    intro("Revisa los pagos pendientes", "Esta cola muestra pagos con comprobante que esperan verificación. Se actualiza automáticamente cuando llegan nuevos archivos."),
    step("verification-queue", "Revisa la cola", "Compara reserva, cliente, fechas, habitación, monto y referencia. Si la cola está vacía, no hay comprobantes pendientes para mostrar."),
    step("verification-proof", "Comprueba el archivo", "Examina la imagen o PDF y usa Abrir comprobante si necesitas verlo completo. Contrasta monto y referencia con el depósito recibido."),
    step("verification-actions", "Confirma o rechaza", "Confirmar aprueba el pago y confirma la reserva. Rechazar deja constancia de que el comprobante no fue aceptado. El recorrido solo señala estas acciones; tú decides cuándo usarlas."),
    pagination,
  ],
  "/admin/qr": [
    intro("Administra el QR de pago", "Aquí eliges el código QR que verán los clientes al pagar una reserva."),
    step("qr-create", "Carga un QR", "Indica un nombre identificable, añade una descripción si hace falta y selecciona la imagen del QR. Revisa que corresponda a la cuenta del hostal antes de guardar."),
    step("qr-records", "Revisa los QR disponibles", "Solo el QR marcado Activo se muestra al cliente. Activar otro cambia el código que se ofrece para pagar."),
    step("qr-actions", "Activa o elimina con cuidado", "Usa Activar para elegir este QR. Eliminar abre una confirmación antes de borrar su imagen. Verifica siempre el QR activo después de hacer cambios."),
  ],
  "/admin/tarifas": [
    intro("Define las tarifas", "Aquí administras los precios por noche y su vigencia. Las habitaciones seleccionan una tarifa de este catálogo."),
    step("rate-create", "Crea una tarifa", "Completa tipo de habitación, temporada, precio, moneda, vigencia y estado. Revisa el importe antes de guardar."),
    ...tableSteps,
    step("rate-edit", "Actualiza una tarifa", "Editar abre el formulario con los datos actuales. La asociación a una habitación se realiza desde Habitaciones."),
  ],
  "/admin/transacciones": [
    intro("Consulta los movimientos de pago", "Cada transacción está vinculada a una reserva y muestra monto, método y estado de verificación."),
    search("Busca por referencia, método, estado, tipo o identificador de reserva. Puedes limpiar la búsqueda para volver al listado."),
    step("page-metrics", "Interpreta los totales", "Estos indicadores resumen los registros de la página actual: monto aprobado, pagos por verificar y pagos rechazados."),
    step("record-card", "Relaciona pago y reserva", "Consulta cliente, fechas, método, referencia y estado. Comprobante abre el archivo si existe y Ver reserva lleva al seguimiento de la reserva."),
    pagination,
  ],
  "/admin/comprobantes": [
    intro("Consulta los archivos de pago", "Este historial reúne comprobantes recibidos y su relación con transacciones y reservas."),
    search("Busca por número, archivo, reserva, transacción o usuario. La búsqueda limita los registros que ves en el historial."),
    step("page-metrics", "Resumen de esta página", "Consulta cuántos comprobantes tienen archivo y cuántos corresponden a pagos pendientes o aprobados. Los valores pertenecen a la página actual."),
    step("record-card", "Inspecciona un comprobante", "Revisa quién lo subió, cuándo, su número y el estado del pago relacionado. Abre el archivo para consultarlo y la reserva para seguir su operación."),
    pagination,
  ],
  "/admin/cancelaciones": [
    intro("Revisa las cancelaciones", "Aquí se consulta el historial operativo y contable de reservas canceladas. El registro no realiza transferencias de dinero."),
    search("Busca por motivo, política, reserva o gestor para localizar una cancelación."),
    step("page-metrics", "Lee el resumen contable", "Los indicadores muestran el retenido, el reembolso y las cancelaciones con reembolso parcial de la página actual."),
    step("record-card", "Comprueba la política aplicada", "Cada tarjeta conserva motivo, gestor y montos de la cancelación. Revisa el importe pagado, lo retenido y el reembolso registrado, junto con la reserva asociada."),
    pagination,
  ],
  "/admin/bloqueos": [
    intro("Bloquea fechas de habitaciones", "Los bloqueos impiden reservar habitaciones durante un rango, por ejemplo por mantenimiento o uso interno."),
    search("Busca por motivo o información del bloqueo para localizarlo en el listado."),
    step("block-create", "Define alcance y fechas", "Elige una, varias o todas las habitaciones, selecciona el rango y escribe el motivo. Revisa la selección antes de crear el bloqueo."),
    step("page-metrics", "Consulta el resumen", "Estos indicadores permiten revisar el estado de los bloqueos mostrados en la página."),
    step("record-card", "Revisa o elimina un bloqueo", "Consulta habitación, fechas y motivo en cada tarjeta. Si necesitas liberarla, revisa la acción Eliminar y confirma únicamente el bloqueo que corresponda."),
    pagination,
  ],
  "/admin/notificaciones": [
    intro("Mantente al día", "Este feed reúne actividad de clientes, reservas, pagos y cambios operativos. Las notificaciones nuevas se muestran destacadas."),
    step("notification-counts", "Identifica lo pendiente", "El contador Nuevas indica cuántas notificaciones están sin leer; Total corresponde a las cargadas en este feed."),
    step("notification-feed", "Abre el detalle", "Revisa título, tipo y fecha. Ver detalle abre la información relacionada y marca la notificación como leída."),
    step("notification-read-all", "Marca todo como leído", "Cuando termines de revisar la actividad, esta acción marca como leídas las notificaciones pendientes. El recorrido no la ejecuta."),
  ],
  "/admin/configuracion": [
    intro("Configura la operación del hostal", "Estas reglas controlan horarios, espera de comprobante y parámetros de cancelación. Revisa sus efectos antes de guardar."),
    step("settings-form", "Horarios de estadía", "Define las horas de check-in y check-out que se utilizan al programar reservas. Los horarios se interpretan en la zona del hostal."),
    step("settings-timeout", "Espera de comprobante", "Indica cuántos minutos puede permanecer una reserva pendiente sin comprobante. El valor 0 desactiva la cancelación automática por este motivo."),
    step("settings-cancellation", "Política de cancelación", "Revisa las horas límite y el porcentaje de reembolso parcial. Los valores guardados se aplican al calcular nuevas cancelaciones."),
    step("settings-summary", "Comprueba los valores guardados", "Este bloque resume los parámetros actuales y su relación con las reservas. Después de guardar, revisa que sean los esperados."),
  ],
  "/admin/auditoria": [
    intro("Consulta la auditoría", "Esta pantalla de solo lectura permite revisar eventos y cambios del sistema. Está reservada al administrador."),
    ...tableSteps,
  ],
  "/admin/backups": [
    intro("Respalda la información", "Aquí puedes descargar datos operativos y archivos, y consultar la guía de migración completa del servidor."),
    step("backup-database", "Exporta los datos operativos", "Elige destino local, producción o ambos y descarga el JSON de la aplicación. Este respaldo no incluye cuentas de acceso ni la configuración completa del servidor."),
    step("backup-images", "Respalda las fotos", "Descarga el archivo TAR con las imágenes de habitaciones. Comprueba el destino elegido antes de descargar."),
    step("backup-proofs", "Respalda los comprobantes", "Este TAR guarda las imágenes y PDF de pagos. Guárdalo junto con el respaldo de datos correspondiente."),
    step("backup-migration", "Planifica una migración completa", "Sigue esta guía para trasladar toda la instancia de Supabase. Revisa origen y destino antes de restaurar: una restauración reemplaza los datos del destino."),
  ],
  "/admin/usuarios": [
    intro("Administra los usuarios", "El administrador gestiona personal y clientes. Recepción ve los clientes que puede atender."),
    step("user-create", "Crea una cuenta de personal", "Elige el rol del personal y establece una contraseña temporal. La persona deberá cambiarla al ingresar. Para registrar huéspedes, utiliza Nuevo cliente.", ["admin"]),
    ...tableSteps,
    step("user-reset", "Restablece el acceso de un cliente", "Restablecer contraseña abre una pantalla de confirmación. La nueva contraseña se basa en el teléfono registrado y debe cambiarse al ingresar."),
    step("user-delete", "Revisa antes de eliminar", "La eliminación de una cuenta requiere confirmación. Comprueba que elegiste al cliente correcto y revisa las condiciones que indica la ventana."),
  ],
} satisfies Record<AdminNavigationHref, readonly TutorialStep[]>;
