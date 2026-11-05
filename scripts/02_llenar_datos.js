// =============================================================================
// 02_llenar_datos.js — Inserción de datos de ejemplo
// Proyecto : Sistema de Renta de Videos (FBD-111 · Evaluación Continua · Hito 3)
// Uso      : mongosh "<cadena_de_conexion>" --file scripts/02_llenar_datos.js
// Requiere : haber ejecutado antes 01_crear_bd.js
// Nota     : vacía las colecciones antes de insertar, así que sirve para
//            restablecer los datos en cualquier momento.
// =============================================================================

const rv = db.getSiblingDB("renta_videos");

if (!rv.getCollectionNames().includes("clientes")) {
  throw new Error("Primero ejecute 01_crear_bd.js");
}

// ---- Utilidades -------------------------------------------------------------
const DIA_MS = 24 * 60 * 60 * 1000;
const fecha = (s) => new Date(`${s}T09:00:00-04:00`); // hora de Bolivia
const sumarDias = (f, n) => new Date(f.getTime() + n * DIA_MS);
const HOY = fecha("2026-11-05");   // fecha de referencia para el estado de las rentas
const RECARGO_DIA = 5;             // Bs por día de atraso

["clientes", "videos", "adquisiciones", "rentas"].forEach((n) => rv.getCollection(n).deleteMany({}));

// ---- 1) Clientes ------------------------------------------------------------
rv.clientes.insertMany([
  { id_cliente: "CLI-001", nombre: "Mariana", apellido: "Quispe Mamani", ci: "6543210 LP", telefono: "70111222",
    email: "mariana.quispe@example.com", direccion: "Sopocachi, Calle Rosendo Gutiérrez 123",
    fecha_registro: fecha("2026-07-20"), credencial: { numero: "CRED-0001", fecha_emision: fecha("2026-07-20"), vigente: true } },
  { id_cliente: "CLI-002", nombre: "Jorge", apellido: "Condori Flores", ci: "7123456 LP", telefono: "71222333",
    email: "jorge.condori@example.com", direccion: "Miraflores, Av. Busch 456",
    fecha_registro: fecha("2026-07-22"), credencial: { numero: "CRED-0002", fecha_emision: fecha("2026-07-22"), vigente: true } },
  { id_cliente: "CLI-003", nombre: "Lucía", apellido: "Mamani Choque", ci: "8234567 LP", telefono: "72333444",
    email: "lucia.mamani@example.com", direccion: "San Pedro, Calle Loayza 78",
    fecha_registro: fecha("2026-08-05"), credencial: { numero: "CRED-0003", fecha_emision: fecha("2026-08-05"), vigente: true } },
  { id_cliente: "CLI-004", nombre: "Carlos", apellido: "Huanca Pari", ci: "5345678 LP", telefono: "73444555",
    email: "carlos.huanca@example.com", direccion: "Villa Fátima, Av. Las Américas 910",
    fecha_registro: fecha("2026-08-30"), credencial: { numero: "CRED-0004", fecha_emision: fecha("2026-08-30"), vigente: true } },
  { id_cliente: "CLI-005", nombre: "Valeria", apellido: "Rojas Gutiérrez", ci: "9456789 LP", telefono: "74555666",
    email: "valeria.rojas@example.com", direccion: "Calacoto, Calle 21 No. 8200",
    fecha_registro: fecha("2026-09-10"), credencial: { numero: "CRED-0005", fecha_emision: fecha("2026-09-10"), vigente: true } },
  { id_cliente: "CLI-006", nombre: "Diego", apellido: "Apaza Limachi", ci: "4567890 LP", telefono: "75666777",
    email: "diego.apaza@example.com", direccion: "El Alto, Villa Adela, Calle 5 No. 33",
    fecha_registro: fecha("2026-10-01"), credencial: { numero: "CRED-0006", fecha_emision: fecha("2026-10-01"), vigente: false } },
]);

// ---- 2) Videos (con sus ejemplares embebidos) -------------------------------
const ej = (cod, letras) => letras.map((l) => ({ codigo_ejemplar: `${cod}-${l}`, estado: "disponible" }));

const videos = [
  { codigo: "VID-001", titulo: "El Rey León",       genero: "Animación",       anio: 1994, formato: "DVD",     precio_renta_dia: 8,  ejemplares: ej("VID-001", ["A", "B", "C"]) },
  { codigo: "VID-002", titulo: "Matrix",            genero: "Ciencia ficción", anio: 1999, formato: "DVD",     precio_renta_dia: 10, ejemplares: ej("VID-002", ["A", "B"]) },
  { codigo: "VID-003", titulo: "Titanic",           genero: "Drama",           anio: 1997, formato: "DVD",     precio_renta_dia: 8,  ejemplares: ej("VID-003", ["A"]) },
  { codigo: "VID-004", titulo: "Coco",              genero: "Animación",       anio: 2017, formato: "Blu-ray", precio_renta_dia: 12, ejemplares: ej("VID-004", ["A", "B"]) },
  { codigo: "VID-005", titulo: "Parásitos",         genero: "Suspenso",        anio: 2019, formato: "Blu-ray", precio_renta_dia: 12, ejemplares: ej("VID-005", ["A", "B"]) },
  { codigo: "VID-006", titulo: "Interestelar",      genero: "Ciencia ficción", anio: 2014, formato: "Blu-ray", precio_renta_dia: 12, ejemplares: ej("VID-006", ["A", "B"]) },
  { codigo: "VID-007", titulo: "Ciudad de Dios",    genero: "Drama",           anio: 2002, formato: "DVD",     precio_renta_dia: 8,  ejemplares: ej("VID-007", ["A", "B"]) },
  { codigo: "VID-008", titulo: "Mi Villano Favorito", genero: "Comedia",       anio: 2010, formato: "DVD",     precio_renta_dia: 8,  ejemplares: ej("VID-008", ["A", "B"]) },
];
// Un ejemplar dañado, para que el inventario tenga más de un estado
videos.find((v) => v.codigo === "VID-008").ejemplares[1].estado = "danado";
rv.videos.insertMany(videos);

// ---- 3) Adquisiciones (Sistema de Adquisición de Video) ---------------------
const adquisiciones = [
  { codigo: "ADQ-001", fecha: fecha("2026-07-15"), proveedor: "Distribuidora Andina de Video S.R.L.",
    items: [
      { codigo_video: "VID-001", cantidad: 3, costo_unitario: 60 },
      { codigo_video: "VID-002", cantidad: 2, costo_unitario: 70 },
      { codigo_video: "VID-003", cantidad: 1, costo_unitario: 55 },
      { codigo_video: "VID-007", cantidad: 2, costo_unitario: 60 },
    ] },
  { codigo: "ADQ-002", fecha: fecha("2026-07-20"), proveedor: "Cine Import Bolivia",
    items: [
      { codigo_video: "VID-004", cantidad: 2, costo_unitario: 90 },
      { codigo_video: "VID-005", cantidad: 2, costo_unitario: 95 },
      { codigo_video: "VID-006", cantidad: 2, costo_unitario: 95 },
    ] },
  { codigo: "ADQ-003", fecha: fecha("2026-08-01"), proveedor: "Distribuidora Andina de Video S.R.L.",
    items: [{ codigo_video: "VID-008", cantidad: 2, costo_unitario: 55 }] },
].map((a) => ({ ...a, costo_total: a.items.reduce((s, i) => s + i.cantidad * i.costo_unitario, 0) }));
rv.adquisiciones.insertMany(adquisiciones);

// ---- 4) Rentas --------------------------------------------------------------
// piezas = [[codigo_video, letra_ejemplar], ...]; fDevolucion = null si aún no se devuelve
function construirRenta(numero, idCliente, fRenta, dias, piezas, fDevolucion, metodo) {
  const cliente = rv.clientes.findOne({ id_cliente: idCliente });
  const renta = fecha(fRenta);
  const prevista = sumarDias(renta, dias);
  const real = fDevolucion ? fecha(fDevolucion) : null;

  const items = piezas.map(([cod, letra]) => {
    const v = rv.videos.findOne({ codigo: cod });
    return {
      codigo_video: cod,
      codigo_ejemplar: `${cod}-${letra}`,
      titulo: v.titulo,
      precio_dia: v.precio_renta_dia,
      dias: dias,
      subtotal: v.precio_renta_dia * dias,
    };
  });

  const total = items.reduce((s, i) => s + i.subtotal, 0);
  const diasAtraso = real ? Math.max(0, Math.ceil((real - prevista) / DIA_MS)) : 0;
  const recargo = diasAtraso * RECARGO_DIA;
  const estado = real ? "devuelta" : (prevista < HOY ? "atrasada" : "activa");

  return {
    numero_recibo: numero,
    id_cliente: idCliente,
    cliente: { nombre: `${cliente.nombre} ${cliente.apellido}`, credencial: cliente.credencial.numero },
    fecha_renta: renta,
    fecha_devolucion_prevista: prevista,
    fecha_devolucion_real: real,
    items: items,
    total: total,
    recargo: recargo,
    total_final: total + recargo,
    estado: estado,
    // El pago se registra al devolver (incluye recargo) o al rentar si la renta sigue abierta
    pago: { monto: total + recargo, metodo: metodo, fecha: real ? real : renta },
  };
}

rv.rentas.insertMany([
  construirRenta("REC-0001", "CLI-001", "2026-08-03", 3, [["VID-001", "A"], ["VID-004", "A"]], "2026-08-06", "efectivo"),
  construirRenta("REC-0002", "CLI-002", "2026-08-10", 2, [["VID-002", "A"]],                   "2026-08-13", "efectivo"),
  construirRenta("REC-0003", "CLI-003", "2026-08-21", 5, [["VID-005", "A"], ["VID-006", "A"]], "2026-08-26", "qr"),
  construirRenta("REC-0004", "CLI-001", "2026-09-02", 3, [["VID-001", "B"]],                   "2026-09-05", "efectivo"),
  construirRenta("REC-0005", "CLI-004", "2026-09-14", 4, [["VID-003", "A"], ["VID-007", "A"]], "2026-09-18", "tarjeta"),
  construirRenta("REC-0006", "CLI-005", "2026-09-27", 2, [["VID-001", "A"]],                   "2026-09-29", "qr"),
  construirRenta("REC-0007", "CLI-002", "2026-10-08", 3, [["VID-008", "A"]],                   "2026-10-11", "efectivo"),
  construirRenta("REC-0008", "CLI-006", "2026-10-19", 3, [["VID-004", "B"], ["VID-002", "B"]], "2026-10-23", "efectivo"),
  construirRenta("REC-0009", "CLI-003", "2026-10-30", 3, [["VID-005", "B"]],                   null,         "qr"),
  construirRenta("REC-0010", "CLI-004", "2026-11-03", 4, [["VID-001", "A"], ["VID-006", "B"]], null,         "efectivo"),
  construirRenta("REC-0011", "CLI-005", "2026-11-04", 2, [["VID-007", "B"]],                   null,         "tarjeta"),
]);

// Los ejemplares de rentas abiertas (activa / atrasada) pasan a estado "rentado"
rv.rentas.find({ estado: { $in: ["activa", "atrasada"] } }).forEach((r) => {
  r.items.forEach((it) => {
    rv.videos.updateOne(
      { codigo: it.codigo_video },
      { $set: { "ejemplares.$[e].estado": "rentado" } },
      { arrayFilters: [{ "e.codigo_ejemplar": it.codigo_ejemplar }] }
    );
  });
});

// ---- Resumen para la captura de pantalla ------------------------------------
print("==> Documentos insertados:");
["clientes", "videos", "adquisiciones", "rentas"].forEach((n) => {
  print("  " + n.padEnd(14) + " : " + rv.getCollection(n).countDocuments());
});
print("\n==> Rentas por estado:");
printjson(rv.rentas.aggregate([{ $group: { _id: "$estado", cantidad: { $sum: 1 } } }, { $sort: { _id: 1 } }]).toArray());
print("\n==> Ejemplo de documento de la colección rentas (REC-0002):");
printjson(rv.rentas.findOne({ numero_recibo: "REC-0002" }, { _id: 0 }));
