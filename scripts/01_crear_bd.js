// =============================================================================
// 01_crear_bd.js — Creación de la base de datos, colecciones, validaciones e índices
// Proyecto : Sistema de Renta de Videos (FBD-111 · Evaluación Continua · Hito 3)
// Uso      : mongosh "<cadena_de_conexion>" --file scripts/01_crear_bd.js
// Nota     : es idempotente; borra y vuelve a crear las colecciones.
// =============================================================================

const rv = db.getSiblingDB("renta_videos");

print("==> Base de datos: " + rv.getName());

// Se eliminan las colecciones si ya existían (para poder re-ejecutar el script)
["clientes", "videos", "adquisiciones", "rentas"].forEach((n) => rv.getCollection(n).drop());

// -----------------------------------------------------------------------------
// 1) clientes  (flujos del diagrama: REGISTRO NUEVO CLIENTE, CREDENCIAL DE CLIENTE)
// -----------------------------------------------------------------------------
rv.createCollection("clientes", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id_cliente", "nombre", "apellido", "ci", "fecha_registro", "credencial"],
      properties: {
        id_cliente: { bsonType: "string", pattern: "^CLI-[0-9]{3,}$", description: "Formato CLI-001" },
        nombre: { bsonType: "string" },
        apellido: { bsonType: "string" },
        ci: { bsonType: "string", description: "Cédula de identidad" },
        telefono: { bsonType: "string" },
        email: { bsonType: "string", pattern: "^.+@.+\\..+$" },
        direccion: { bsonType: "string" },
        fecha_registro: { bsonType: "date" },
        credencial: {
          bsonType: "object",
          required: ["numero", "fecha_emision", "vigente"],
          properties: {
            numero: { bsonType: "string" },
            fecha_emision: { bsonType: "date" },
            vigente: { bsonType: "bool" },
          },
        },
      },
    },
  },
  validationLevel: "strict",
  validationAction: "error",
});

// -----------------------------------------------------------------------------
// 2) videos  (flujos: INFORMACION DE VIDEO, INFORMACION DE ESTADO DEL VIDEO,
//             ARTICULO DE VIDEO). Los ejemplares físicos van EMBEBIDOS.
// -----------------------------------------------------------------------------
rv.createCollection("videos", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["codigo", "titulo", "genero", "anio", "formato", "precio_renta_dia", "ejemplares"],
      properties: {
        codigo: { bsonType: "string", pattern: "^VID-[0-9]{3,}$" },
        titulo: { bsonType: "string" },
        genero: { bsonType: "string" },
        anio: { bsonType: "number", minimum: 1900 },
        formato: { enum: ["DVD", "Blu-ray"] },
        precio_renta_dia: { bsonType: "number", minimum: 1, description: "Bs por día" },
        ejemplares: {
          bsonType: "array",
          minItems: 1,
          items: {
            bsonType: "object",
            required: ["codigo_ejemplar", "estado"],
            properties: {
              codigo_ejemplar: { bsonType: "string" },
              estado: { enum: ["disponible", "rentado", "danado", "baja"] },
            },
          },
        },
      },
    },
  },
  validationLevel: "strict",
  validationAction: "error",
});

// -----------------------------------------------------------------------------
// 3) adquisiciones  (Sistema de Adquisición de Video → INFORMACION DE VIDEO)
// -----------------------------------------------------------------------------
rv.createCollection("adquisiciones", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["codigo", "fecha", "proveedor", "items", "costo_total"],
      properties: {
        codigo: { bsonType: "string", pattern: "^ADQ-[0-9]{3,}$" },
        fecha: { bsonType: "date" },
        proveedor: { bsonType: "string" },
        items: {
          bsonType: "array",
          minItems: 1,
          items: {
            bsonType: "object",
            required: ["codigo_video", "cantidad", "costo_unitario"],
            properties: {
              codigo_video: { bsonType: "string" },
              cantidad: { bsonType: "number", minimum: 1 },
              costo_unitario: { bsonType: "number", minimum: 0 },
            },
          },
        },
        costo_total: { bsonType: "number", minimum: 0 },
      },
    },
  },
  validationLevel: "strict",
  validationAction: "error",
});

// -----------------------------------------------------------------------------
// 4) rentas  (flujos: ID_CLIENTE, ARTICULO DE VIDEO, PAGO, RECIBO DE RENTA DE VIDEO)
//    Los ítems rentados y el pago van EMBEBIDOS (se consultan siempre juntos).
// -----------------------------------------------------------------------------
rv.createCollection("rentas", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "numero_recibo", "id_cliente", "fecha_renta", "fecha_devolucion_prevista",
        "items", "total", "recargo", "total_final", "estado", "pago",
      ],
      properties: {
        numero_recibo: { bsonType: "string", pattern: "^REC-[0-9]{4,}$" },
        id_cliente: { bsonType: "string" },
        fecha_renta: { bsonType: "date" },
        fecha_devolucion_prevista: { bsonType: "date" },
        fecha_devolucion_real: { bsonType: ["date", "null"] },
        items: {
          bsonType: "array",
          minItems: 1,
          items: {
            bsonType: "object",
            required: ["codigo_video", "codigo_ejemplar", "titulo", "precio_dia", "dias", "subtotal"],
            properties: {
              codigo_video: { bsonType: "string" },
              codigo_ejemplar: { bsonType: "string" },
              titulo: { bsonType: "string" },
              precio_dia: { bsonType: "number", minimum: 0 },
              dias: { bsonType: "number", minimum: 1 },
              subtotal: { bsonType: "number", minimum: 0 },
            },
          },
        },
        total: { bsonType: "number", minimum: 0 },
        recargo: { bsonType: "number", minimum: 0, description: "Multa por atraso" },
        total_final: { bsonType: "number", minimum: 0 },
        estado: { enum: ["activa", "devuelta", "atrasada"] },
        pago: {
          bsonType: "object",
          required: ["monto", "metodo", "fecha"],
          properties: {
            monto: { bsonType: "number", minimum: 0 },
            metodo: { enum: ["efectivo", "qr", "tarjeta"] },
            fecha: { bsonType: "date" },
          },
        },
      },
    },
  },
  validationLevel: "strict",
  validationAction: "error",
});

// -----------------------------------------------------------------------------
// Índices
// -----------------------------------------------------------------------------
rv.clientes.createIndex({ id_cliente: 1 }, { unique: true, name: "uq_id_cliente" });
rv.clientes.createIndex({ ci: 1 }, { unique: true, name: "uq_ci" });
rv.clientes.createIndex({ "credencial.numero": 1 }, { unique: true, name: "uq_credencial" });

rv.videos.createIndex({ codigo: 1 }, { unique: true, name: "uq_codigo_video" });
rv.videos.createIndex({ genero: 1, formato: 1 }, { name: "idx_genero_formato" });
rv.videos.createIndex(
  { titulo: "text", genero: "text" },
  { default_language: "spanish", name: "idx_texto_titulo_genero" }
);

rv.adquisiciones.createIndex({ codigo: 1 }, { unique: true, name: "uq_codigo_adq" });
rv.adquisiciones.createIndex({ fecha: 1 }, { name: "idx_fecha_adq" });

rv.rentas.createIndex({ numero_recibo: 1 }, { unique: true, name: "uq_recibo" });
rv.rentas.createIndex({ id_cliente: 1, fecha_renta: -1 }, { name: "idx_cliente_fecha" });
rv.rentas.createIndex({ estado: 1 }, { name: "idx_estado" });
rv.rentas.createIndex({ fecha_renta: 1 }, { name: "idx_fecha_renta" });

// -----------------------------------------------------------------------------
// Resumen para la captura de pantalla
// -----------------------------------------------------------------------------
print("\n==> Colecciones creadas:");
printjson(rv.getCollectionNames());

print("\n==> Índices por colección:");
rv.getCollectionNames().forEach((n) => {
  print("  " + n + ": " + rv.getCollection(n).getIndexes().map((i) => i.name).join(", "));
});

// Demostración de que el validador rechaza documentos inválidos
print("\n==> Prueba del validador (se espera un error de validación):");
try {
  rv.clientes.insertOne({ id_cliente: "MALFORMADO", nombre: "Sin apellido ni CI" });
  print("  ✗ El documento inválido fue aceptado (revisar validador)");
} catch (e) {
  print("  ✔ Documento inválido rechazado: " + e.message);
}
