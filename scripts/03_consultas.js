// =============================================================================
// 03_consultas.js — Consultas sobre la base de datos "renta_videos"
// Proyecto : Sistema de Renta de Videos (FBD-111 · Evaluación Continua · Hito 3)
// Uso      : mongosh "<cadena_de_conexion>" --file scripts/03_consultas.js
// Requiere : haber ejecutado 01_crear_bd.js y 02_llenar_datos.js
// Nota     : solo LEE datos; se puede ejecutar todas las veces que se quiera.
//            Cada bloque imprime un encabezado [Cn] para tomar capturas por partes.
// =============================================================================

const rv = db.getSiblingDB("renta_videos");
const HOY = new Date();

function mostrar(titulo, resultado) {
  print("\n" + "=".repeat(78));
  print(titulo);
  print("=".repeat(78));
  printjson(typeof resultado.toArray === "function" ? resultado.toArray() : resultado);
}

// =============================================================================
// A. CONSULTAS BÁSICAS (find)
// =============================================================================

mostrar("[C1] Clientes con credencial vigente (ordenados por apellido)",
  rv.clientes.find(
    { "credencial.vigente": true },
    { _id: 0, id_cliente: 1, nombre: 1, apellido: 1, "credencial.numero": 1 }
  ).sort({ apellido: 1 })
);

mostrar("[C2] Videos del género «Ciencia ficción»",
  rv.videos.find({ genero: "Ciencia ficción" }, { _id: 0, codigo: 1, titulo: 1, anio: 1, formato: 1, precio_renta_dia: 1 })
);

mostrar("[C3] Videos en Blu-ray con precio ≤ 12 Bs/día (más caros primero)",
  rv.videos.find(
    { formato: "Blu-ray", precio_renta_dia: { $lte: 12 } },
    { _id: 0, codigo: 1, titulo: 1, precio_renta_dia: 1 }
  ).sort({ precio_renta_dia: -1, titulo: 1 })
);

mostrar("[C4] Ejemplares DISPONIBLES de «El Rey León» (VID-001)",
  rv.videos.aggregate([
    { $match: { codigo: "VID-001" } },
    { $project: {
        _id: 0, codigo: 1, titulo: 1,
        disponibles: { $filter: { input: "$ejemplares", as: "e", cond: { $eq: ["$$e.estado", "disponible"] } } },
    } },
  ])
);

mostrar("[C5] Búsqueda de texto: «ciencia ficción» (índice de texto en español)",
  rv.videos.find(
    { $text: { $search: "ciencia ficción" } },
    { _id: 0, codigo: 1, titulo: 1, genero: 1, relevancia: { $meta: "textScore" } }
  ).sort({ relevancia: { $meta: "textScore" } })
);

mostrar("[C6] Historial de rentas del cliente CLI-001 (más reciente primero)",
  rv.rentas.find(
    { id_cliente: "CLI-001" },
    { _id: 0, numero_recibo: 1, fecha_renta: 1, "items.titulo": 1, total_final: 1, estado: 1 }
  ).sort({ fecha_renta: -1 })
);

// =============================================================================
// B. RECIBO Y CREDENCIAL (unión entre colecciones con $lookup)
// =============================================================================

mostrar("[C7] Recibo REC-0010 con los datos completos del cliente ($lookup)",
  rv.rentas.aggregate([
    { $match: { numero_recibo: "REC-0010" } },
    { $lookup: { from: "clientes", localField: "id_cliente", foreignField: "id_cliente", as: "datos_cliente" } },
    { $unwind: "$datos_cliente" },
    { $project: {
        _id: 0, numero_recibo: 1, fecha_renta: 1, fecha_devolucion_prevista: 1,
        "datos_cliente.nombre": 1, "datos_cliente.apellido": 1, "datos_cliente.ci": 1,
        "datos_cliente.credencial.numero": 1,
        items: 1, total_final: 1, pago: 1,
    } },
  ])
);

// =============================================================================
// C. INFORMES PARA ADMINISTRACIÓN (aggregation framework)
// =============================================================================

mostrar("[C8] Resumen general del negocio",
  {
    clientes: rv.clientes.countDocuments(),
    videos_titulos: rv.videos.countDocuments(),
    ejemplares_totales: rv.videos.aggregate([{ $unwind: "$ejemplares" }, { $count: "n" }]).toArray()[0].n,
    rentas_registradas: rv.rentas.countDocuments(),
    rentas_abiertas: rv.rentas.countDocuments({ estado: { $in: ["activa", "atrasada"] } }),
  }
);

mostrar("[C9] Top 5 videos más rentados (veces rentado e ingreso generado)",
  rv.rentas.aggregate([
    { $unwind: "$items" },
    { $group: {
        _id: "$items.codigo_video",
        titulo: { $first: "$items.titulo" },
        veces_rentado: { $sum: 1 },
        ingreso_bruto: { $sum: "$items.subtotal" },
    } },
    { $sort: { veces_rentado: -1, ingreso_bruto: -1 } },
    { $limit: 5 },
  ])
);

mostrar("[C10] Clientes con mayor gasto (con $lookup al nombre del cliente)",
  rv.rentas.aggregate([
    { $group: { _id: "$id_cliente", rentas: { $sum: 1 }, gasto_total: { $sum: "$total_final" } } },
    { $lookup: { from: "clientes", localField: "_id", foreignField: "id_cliente", as: "c" } },
    { $unwind: "$c" },
    { $project: { _id: 0, id_cliente: "$_id", cliente: { $concat: ["$c.nombre", " ", "$c.apellido"] }, rentas: 1, gasto_total: 1 } },
    { $sort: { gasto_total: -1 } },
  ])
);

mostrar("[C11] Rentas ATRASADAS con días de atraso y recargo estimado (5 Bs/día)",
  rv.rentas.aggregate([
    { $match: { estado: "atrasada" } },
    { $addFields: {
        dias_atraso: { $ceil: { $divide: [{ $subtract: [HOY, "$fecha_devolucion_prevista"] }, 86400000] } },
    } },
    { $project: {
        _id: 0, numero_recibo: 1, "cliente.nombre": 1, fecha_devolucion_prevista: 1, dias_atraso: 1,
        recargo_estimado: { $multiply: ["$dias_atraso", 5] },
    } },
  ])
);

mostrar("[C12] Estado del inventario (INFORMACION DE ESTADO DEL VIDEO)",
  rv.videos.aggregate([
    { $unwind: "$ejemplares" },
    { $group: { _id: "$ejemplares.estado", ejemplares: { $sum: 1 } } },
    { $sort: { ejemplares: -1 } },
  ])
);

// =============================================================================
// D. CONTABILIDAD (EXTRACTO MENSUAL / EXTRACTO ANUAL)
// =============================================================================

mostrar("[C13] Extracto MENSUAL de ingresos",
  rv.rentas.aggregate([
    { $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$fecha_renta", timezone: "America/La_Paz" } },
        rentas: { $sum: 1 },
        ingresos_renta: { $sum: "$total" },
        recargos: { $sum: "$recargo" },
        ingresos_totales: { $sum: "$total_final" },
    } },
    { $sort: { _id: 1 } },
  ])
);

const ingresos = rv.rentas.aggregate([
  { $group: { _id: { $year: { date: "$fecha_renta", timezone: "America/La_Paz" } }, ingresos: { $sum: "$total_final" } } },
]).toArray();
const egresos = rv.adquisiciones.aggregate([
  { $group: { _id: { $year: { date: "$fecha", timezone: "America/La_Paz" } }, compras: { $sum: "$costo_total" } } },
]).toArray();
const anios = [...new Set([...ingresos.map((x) => x._id), ...egresos.map((x) => x._id)])].sort();
mostrar("[C14] Extracto ANUAL: ingresos por rentas vs. compras de videos",
  anios.map((a) => {
    const ing = (ingresos.find((x) => x._id === a) || { ingresos: 0 }).ingresos;
    const egr = (egresos.find((x) => x._id === a) || { compras: 0 }).compras;
    return { anio: a, ingresos: ing, compras_videos: egr, resultado: ing - egr };
  })
);

mostrar("[C15] Ingresos por método de pago (efectivo recibido, QR, tarjeta)",
  rv.rentas.aggregate([
    { $group: { _id: "$pago.metodo", pagos: { $sum: 1 }, monto: { $sum: "$pago.monto" } } },
    { $sort: { monto: -1 } },
  ])
);

print("\n==> Fin de las consultas.");
