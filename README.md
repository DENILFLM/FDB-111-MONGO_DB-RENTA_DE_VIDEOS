# 🎬 Sistema de Renta de Videos - MongoDB.

**Materia:** FBD-111 Fundamentos de Bases de Datos  
**Evaluación:** Hito 3 - Grupo 2

## Integrantes
- Ronald Cruz Chino.
- Denilson Davis Machaca Flores.
- Daniel Wilfredo Pomarez Huaranca.

## Descripción
Sistema desarrollado en MongoDB para gestionar clientes, videos, adquisiciones, rentas y pagos.

## Estructura del proyecto
```text
renta-videos-mongodb/
├── README.md
├── scripts/
│   ├── 01_crear_bd.js
│   ├── 02_llenar_datos.js
│   ├── 03_consultas.js
│   └── 04_operaciones.js
├── docs/
│   └── DFD_nivel0_renta_videos.drawio
└── capturas/
```

## Requisitos
- MongoDB 5.0 o superior.
- MongoDB Shell (mongosh).
- Git.

## Instalación y ejecución

Clonar el repositorio:

```bash
git clone https://github.com/DENILFLM/FDB-111-MONGO_DB-RENTA_DE_VIDEOS.git
cd FDB-111-MONGO_DB-RENTA_DE_VIDEOS
```

Ejecutar los scripts en orden:

```bash
mongosh --file scripts/01_crear_bd.js
mongosh --file scripts/02_llenar_datos.js
mongosh --file scripts/03_consultas.js
mongosh --file scripts/04_operaciones.js
```

## Colecciones
- **clientes:** almacena los datos de los clientes.
- **videos:** registra los videos y sus ejemplares.
- **adquisiciones:** registra las compras de videos.
- **rentas:** almacena los alquileres, recibos y pagos.

## Funcionalidades
- Registro de clientes y videos.
- Control de rentas y devoluciones.
- Cálculo de recargos por retrasos.
- Consultas de información.
- Informes administrativos y contables.

## Evidencias
Las siguientes capturas muestran la ejecución y funcionamiento del sistema:
<img width="1547" height="392" alt="image" src="https://github.com/user-attachments/assets/73b542ce-8cda-49a8-aac8-b6315bd37066" />
<img width="520" height="333" alt="image" src="https://github.com/user-attachments/assets/63855af1-2b08-4799-91cb-4ca3781b865f" />
<img width="659" height="554" alt="image" src="https://github.com/user-attachments/assets/c0935de3-fcd9-42b0-85e7-6c7093576a0f" />

## Tecnologías utilizadas
MongoDB, JavaScript, mongosh, Git y GitHub.
