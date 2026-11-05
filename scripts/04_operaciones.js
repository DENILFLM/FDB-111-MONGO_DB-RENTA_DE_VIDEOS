// =============================================================================
// 04_operaciones.js — Operaciones del día a día (insertar, actualizar)
// Proyecto : Sistema de Renta de Videos (FBD-111 · Evaluación Continua · Hito 3)
// Uso      : mongosh "<cadena_de_conexion>" --file scripts/04_operaciones.js
// Nota     : MODIFICA datos. Para volver al estado inicial, ejecute de nuevo
//            02_llenar_datos.js. Ejecútelo una sola vez por restablecimiento.
// =============================================================================

const rv = db.getSiblingDB("renta_videos");
const DIA_MS = 24 * 60 * 60 * 1000;
const AHORA = new Date();
const RECARGO_DIA = 5;

// -----------------------------------------------------------------------------
// O1. REGISTRO NUEVO CLIENTE (emite la CREDENCIAL DE CLIENTE)
// -----------------------------------------------------------------------------
print("==> [O1] Registro de un nuevo cliente");
rv.clientes.insertOne({
  id_cliente: "CLI-007", nombre: "Andrea", apellido: "Vargas Colque", ci: "6789012 LP", telefono: "76777888",
  email: "andrea.vargas@example.com", direccion: "Obrajes, Calle 3 No. 1020",
  fecha_registro: AHORA, credencial: { numero: "CRED-0007", fecha_emision: AHORA, vigente: true },
});
printjson(rv.clientes.findOne({ id_cliente: "CLI-007" }, { _id: 0, id_cliente: 1, nombre: 1, apellido: 1, credencial: 1 }));

// -----------------------------------------------------------------------------
// O2. NUEVA RENTA: genera el RECIBO y marca los ejemplares como "rentado"
// -----------------------------------------------------------------------------
print("\n==> [O2] Nueva renta REC-0012 (CLI-007 renta VID-004-A y VID-008-A por 2 días)");
const dias = 2;
const piezas = [["VID-004", "A"], ["VID-008", "A"]];
const items = piezas.map(([cod, letra]) => {
  const v = rv.videos.findOne({ codigo: cod });
  const ejemplar = v.ejemplares.find((e) => e.codigo_ejemplar === `${cod}-${letra}`);
  if (!ejemplar || ejemplar.estado !== "disponible") throw new Error(`El ejemplar ${cod}-${letra} no está disponible`);
  return { codigo_video: cod, codigo_ejemplar: `${cod}-${letra}`, titulo: v.titulo,
           precio_dia: v.precio_renta_dia, dias: dias, subtotal: v.precio_renta_dia * dias };
});
const total = items.reduce((s, i) => s + i.subtotal, 0);
const cliente = rv.clientes.findOne({ id_cliente: "CLI-007" });

rv.rentas.insertOne({
  numero_recibo: "REC-0012", id_cliente: "CLI-007",
  cliente: { nombre: `${cliente.nombre} ${cliente.apellido}`, credencial: cliente.credencial.numero },
  fecha_renta: AHORA, fecha_devolucion_prevista: new Date(AHORA.getTime() + dias * DIA_MS), fecha_devolucion_real: null,
  items: items, total: total, recargo: 0, total_final: total, estado: "activa",
  pago: { monto: total, metodo: "efectivo", fecha: AHORA },
});
items.forEach((it) => {
  rv.videos.updateOne(
    { codigo: it.codigo_video },
    { $set: { "ejemplares.$[e].estado": "rentado" } },
    { arrayFilters: [{ "e.codigo_ejemplar": it.codigo_ejemplar }] }
  );
});
printjson(rv.rentas.findOne({ numero_recibo: "REC-0012" }, { _id: 0, numero_recibo: 1, items: 1, total_final: 1, estado: 1 }));

// -----------------------------------------------------------------------------
// O3. DEVOLUCIÓN con recargo por atraso (REC-0009 estaba atrasada)
// -----------------------------------------------------------------------------
print("\n==> [O3] Devolución de REC-0009 (renta atrasada) con cálculo de recargo");
const renta = rv.rentas.findOne({ numero_recibo: "REC-0009" });
const diasAtraso = Math.max(0, Math.ceil((AHORA - renta.fecha_devolucion_prevista) / DIA_MS));
const recargo = diasAtraso * RECARGO_DIA;

rv.rentas.updateOne(
  { numero_recibo: "REC-0009" },
  { $set: {
      fecha_devolucion_real: AHORA, estado: "devuelta", recargo: recargo,
      total_final: renta.total + recargo, "pago.monto": renta.total + recargo, "pago.fecha": AHORA,
  } }
);
renta.items.forEach((it) => {
  rv.videos.updateOne(
    { codigo: it.codigo_video },
    { $set: { "ejemplares.$[e].estado": "disponible" } },
    { arrayFilters: [{ "e.codigo_ejemplar": it.codigo_ejemplar }] }
  );
});
print(`  Días de atraso: ${diasAtraso} · Recargo: Bs ${recargo}`);
printjson(rv.rentas.findOne({ numero_recibo: "REC-0009" }, { _id: 0, numero_recibo: 1, estado: 1, recargo: 1, total_final: 1, fecha_devolucion_real: 1 }));

// -----------------------------------------------------------------------------
// O4. ACTUALIZAR ESTADO DE UN EJEMPLAR (INFORMACION DE ESTADO DEL VIDEO)
// -----------------------------------------------------------------------------
print("\n==> [O4] El ejemplar VID-002-B se reporta como dañado");
rv.videos.updateOne(
  { codigo: "VID-002" },
  { $set: { "ejemplares.$[e].estado": "danado" } },
  { arrayFilters: [{ "e.codigo_ejemplar": "VID-002-B" }] }
);
printjson(rv.videos.findOne({ codigo: "VID-002" }, { _id: 0, codigo: 1, titulo: 1, ejemplares: 1 }));

// -----------------------------------------------------------------------------
// O5. DAR DE BAJA LA CREDENCIAL de un cliente
// -----------------------------------------------------------------------------
print("\n==> [O5] Se da de baja la credencial de CLI-002");
rv.clientes.updateOne({ id_cliente: "CLI-002" }, { $set: { "credencial.vigente": false } });
printjson(rv.clientes.findOne({ id_cliente: "CLI-002" }, { _id: 0, id_cliente: 1, nombre: 1, credencial: 1 }));

// -----------------------------------------------------------------------------
// O6. Estado final del inventario
// -----------------------------------------------------------------------------
print("\n==> [O6] Estado del inventario tras las operaciones");
printjson(rv.videos.aggregate([
  { $unwind: "$ejemplares" },
  { $group: { _id: "$ejemplares.estado", ejemplares: { $sum: 1 } } },
  { $sort: { ejemplares: -1 } },
]).toArray());
