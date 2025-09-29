// src/db.js
import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('meditech_v5.db');

export async function initDB() {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    /* ======================  MAESTROS  ====================== */
    CREATE TABLE IF NOT EXISTS Usuario (
      ID_Usuario   INTEGER PRIMARY KEY AUTOINCREMENT,
      Nombre       TEXT,
      Apellido     TEXT
    );

    CREATE TABLE IF NOT EXISTS Condicion (
      ID_Condicion INTEGER PRIMARY KEY AUTOINCREMENT,
      Nombre       TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Alergia (
      ID_Alergia   INTEGER PRIMARY KEY AUTOINCREMENT,
      Nombre       TEXT NOT NULL,
      Tipo         TEXT
    );

    /* ===============  RELACIONES PACIENTE N:M  =============== */
    CREATE TABLE IF NOT EXISTS Paciente_Condicion (
      ID_Usuario        INTEGER NOT NULL,
      ID_Condicion      INTEGER NOT NULL,
      Fecha_Diagnostico TEXT,
      Estado            TEXT,
      PRIMARY KEY (ID_Usuario, ID_Condicion),
      FOREIGN KEY (ID_Usuario)   REFERENCES Usuario(ID_Usuario)   ON DELETE CASCADE,
      FOREIGN KEY (ID_Condicion) REFERENCES Condicion(ID_Condicion) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Paciente_Alergia (
      ID_Usuario   INTEGER NOT NULL,
      ID_Alergia   INTEGER NOT NULL,
      Severidad    TEXT,
      Reaccion     TEXT,
      PRIMARY KEY (ID_Usuario, ID_Alergia),
      FOREIGN KEY (ID_Usuario) REFERENCES Usuario(ID_Usuario) ON DELETE CASCADE,
      FOREIGN KEY (ID_Alergia) REFERENCES Alergia(ID_Alergia) ON DELETE CASCADE
    );

    /* ===============  DEMOGRAFÍA 1:1  =============== */
    CREATE TABLE IF NOT EXISTS Demografia_Usuario (
      ID_Usuario   INTEGER PRIMARY KEY,
      Edad         INTEGER,
      Sexo         TEXT CHECK (Sexo IN ('M','F','X')),
      Embarazo     INTEGER CHECK (Embarazo IN (0,1)) DEFAULT 0,
      Lactancia    INTEGER CHECK (Lactancia IN (0,1)) DEFAULT 0,
      PesoKg       REAL,
      FOREIGN KEY (ID_Usuario) REFERENCES Usuario(ID_Usuario) ON DELETE CASCADE
    );

    /* ==================  CHAT / INTERACCIÓN  ================= */
    CREATE TABLE IF NOT EXISTS Chat_Interaccion (
      ID_Interaccion    INTEGER PRIMARY KEY AUTOINCREMENT,
      ID_Usuario        INTEGER NOT NULL,
      Fecha_Interaccion TEXT DEFAULT (datetime('now')),
      Motivo            TEXT,
      Estado            TEXT,
      FOREIGN KEY (ID_Usuario) REFERENCES Usuario(ID_Usuario) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS IX_Chat_User_Fecha
      ON Chat_Interaccion (ID_Usuario, Fecha_Interaccion);

    CREATE TABLE IF NOT EXISTS Chat_Mensaje (
      ID_Mensaje     INTEGER PRIMARY KEY AUTOINCREMENT,
      ID_Interaccion INTEGER NOT NULL,
      Fecha          TEXT DEFAULT (datetime('now')),
      Rol            TEXT CHECK (Rol IN ('user','bot')) NOT NULL,
      Contenido      TEXT NOT NULL,
      FOREIGN KEY (ID_Interaccion) REFERENCES Chat_Interaccion(ID_Interaccion) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS IX_Mensaje_Interaccion_Fecha
      ON Chat_Mensaje (ID_Interaccion, Fecha);

    /* ====================  RECOMENDACIÓN  ==================== */
    CREATE TABLE IF NOT EXISTS Recomendacion (
      ID_Recomendacion    INTEGER PRIMARY KEY AUTOINCREMENT,
      ID_Interaccion      INTEGER NOT NULL,
      ID_Usuario          INTEGER NOT NULL,
      Fecha_Recomendacion TEXT DEFAULT (datetime('now')),
      Descripcion         TEXT,
      Severidad           TEXT,
      Accion              TEXT,
      Fuente              TEXT,
      FOREIGN KEY (ID_Interaccion) REFERENCES Chat_Interaccion(ID_Interaccion) ON DELETE CASCADE,
      FOREIGN KEY (ID_Usuario)     REFERENCES Usuario(ID_Usuario) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS IX_Reco_Interaccion ON Recomendacion(ID_Interaccion);
    CREATE INDEX IF NOT EXISTS IX_Reco_Usuario     ON Recomendacion(ID_Usuario);

    /* ===================  UNIDADES DE SALUD  ================= */
    CREATE TABLE IF NOT EXISTS Unidad_Salud (
      ID_Unidad  INTEGER PRIMARY KEY AUTOINCREMENT,
      Nombre     TEXT,
      Direccion  TEXT,
      Telefono   TEXT,
      Tipo       TEXT
    );

    CREATE TABLE IF NOT EXISTS Clinica_Movil (
      ID_Clinica_Movil INTEGER PRIMARY KEY AUTOINCREMENT,
      ID_Unidad        INTEGER NOT NULL,
      Ubicacion_Actual TEXT,
      Lat              REAL,
      Lon              REAL,
      Estado           TEXT,
      FOREIGN KEY (ID_Unidad) REFERENCES Unidad_Salud(ID_Unidad) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS IX_Clinica_Unidad ON Clinica_Movil(ID_Unidad);
  `);
  await addMissingColumnsDemografia();
  await ensureUniqueIndexCondicion();

}

/* ======= util ======= */
export async function ensureLocalUser() {
  let row = await db.getFirstAsync('SELECT ID_Usuario FROM Usuario LIMIT 1');
  if (!row) {
    await db.runAsync(
      'INSERT INTO Usuario (Nombre, Apellido) VALUES (?,?)',
      ['Usuario', 'Demo']
    );
    row = await db.getFirstAsync('SELECT ID_Usuario FROM Usuario LIMIT 1');
  }
  return row.ID_Usuario;
}

/* ====== ALERGIAS ====== */
export async function getAlergiasConEstado(usuarioId) {
  return await db.getAllAsync(
    `SELECT a.ID_Alergia, a.Nombre, a.Tipo,
            CASE WHEN ua.ID_Alergia IS NOT NULL THEN 1 ELSE 0 END AS Activo
       FROM Alergia a
       LEFT JOIN Paciente_Alergia ua
         ON ua.ID_Alergia = a.ID_Alergia AND ua.ID_Usuario = ?
     ORDER BY a.Nombre ASC`,
    [usuarioId]
  );
}

export async function setAlergiaUsuario(usuarioId, alergiaId, activo) {
  if (activo) {
    await db.runAsync(
      `INSERT OR REPLACE INTO Paciente_Alergia
         (ID_Usuario, ID_Alergia, Severidad, Reaccion)
       VALUES (?, ?, COALESCE((SELECT Severidad FROM Paciente_Alergia
                               WHERE ID_Usuario=? AND ID_Alergia=?),'media'),
                    COALESCE((SELECT Reaccion FROM Paciente_Alergia
                               WHERE ID_Usuario=? AND ID_Alergia=?),'')
              )`,
      [usuarioId, alergiaId, usuarioId, alergiaId, usuarioId, alergiaId]
    );
  } else {
    await db.runAsync(
      `DELETE FROM Paciente_Alergia WHERE ID_Usuario=? AND ID_Alergia=?`,
      [usuarioId, alergiaId]
    );
  }
}

export async function crearAlergia(nombre, tipo = 'medicamentosa') {
  await db.runAsync(
    `INSERT OR IGNORE INTO Alergia (Nombre, Tipo) VALUES (?, ?)`,
    [String(nombre || '').trim(), String(tipo || '').trim()]
  );
}

export async function seedAlergias() {
  const iniciales = [
    ['Penicilina','medicamentosa'],
    ['AINEs','medicamentosa'],
    ['Sulfas','medicamentosa'],
    ['Mariscos','alimentaria'],
    ['Polvo','ambiental'],
  ];
  for (const [n,t] of iniciales) {
    await db.runAsync(`INSERT OR IGNORE INTO Alergia (Nombre, Tipo) VALUES (?,?)`, [n,t]);
  }
}

// ==== CONDICIONES ====

export async function crearCondicion(nombre) {
  const n = String(nombre || '').trim();
  if (!n) return;
  // INSERT OR IGNORE + índice único evita duplicados
  await db.runAsync(
    `INSERT OR IGNORE INTO Condicion (Nombre) VALUES (?)`,
    [n]
  );
}


// Activa/desactiva condición para un usuario (N:M con metadatos)
export async function setCondicionUsuario(usuarioId, condicionId, activa = true, estado = 'Activa') {
  if (activa) {
    await db.runAsync(
      `INSERT OR REPLACE INTO Paciente_Condicion
         (ID_Usuario, ID_Condicion, Fecha_Diagnostico, Estado)
       VALUES (?, ?, COALESCE(
                 (SELECT Fecha_Diagnostico FROM Paciente_Condicion WHERE ID_Usuario=? AND ID_Condicion=?),
                 date('now')
               ),
               COALESCE(
                 (SELECT Estado FROM Paciente_Condicion WHERE ID_Usuario=? AND ID_Condicion=?),
                 ?
               ))`,
      [usuarioId, condicionId, usuarioId, condicionId, usuarioId, condicionId, estado]
    );
  } else {
    await db.runAsync(
      `DELETE FROM Paciente_Condicion WHERE ID_Usuario=? AND ID_Condicion=?`,
      [usuarioId, condicionId]
    );
  }
}

// Lista de condiciones ACTIVAS del usuario
export async function getActiveConditions(usuarioId) {
  return await db.getAllAsync(
    `SELECT c.ID_Condicion, c.Nombre, pc.Estado, pc.Fecha_Diagnostico
       FROM Condicion c
       INNER JOIN Paciente_Condicion pc
               ON pc.ID_Condicion=c.ID_Condicion
      WHERE pc.ID_Usuario=? AND (pc.Estado IS NULL OR pc.Estado='Activa')
      ORDER BY c.Nombre`,
    [usuarioId]
  );
}


// limpia duplicados y crea índice único por Nombre
export async function ensureUniqueIndexAlergia() {
  await db.runAsync(`
    DELETE FROM Alergia
     WHERE rowid NOT IN (SELECT MIN(rowid) FROM Alergia GROUP BY Nombre)
  `);
  await db.runAsync(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_alergia_nombre ON Alergia(Nombre)
  `);
}

// ==== Deduplicar y asegurar índice único en Condicion ====
export async function ensureUniqueIndexCondicion() {
  // 1) eliminar duplicados por nombre normalizado (lower/trim)
  await db.runAsync(`
    DELETE FROM Condicion
    WHERE rowid NOT IN (
      SELECT MIN(rowid)
      FROM (
        SELECT rowid, lower(trim(Nombre)) AS k
        FROM Condicion
      )
      GROUP BY k
    )
  `);

  // 2) índice único por nombre normalizado
  await db.runAsync(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_condicion_nombre
      ON Condicion (lower(trim(Nombre)))
  `);
}

/* ====== CHAT ====== */
export async function startInteraction(usuarioId, motivo = 'consulta') {
  if (!usuarioId) throw new Error('startInteraction: usuarioId requerido');

  await db.runAsync(
    `INSERT INTO Chat_Interaccion (ID_Usuario, Motivo, Estado)
     VALUES (?, COALESCE(?, 'consulta'), 'abierta')`,
    [usuarioId, motivo || 'consulta']
  );
  const row = await db.getFirstAsync(`SELECT last_insert_rowid() AS id`);
  return row?.id;
}

export async function addMessage(interaccionId, rol, contenido) {
  if (!interaccionId) throw new Error('addMessage: interaccionId requerido');
  if (!rol) throw new Error('addMessage: rol requerido');
  if (contenido == null) contenido = '';

  await db.runAsync(
    `INSERT INTO Chat_Mensaje (ID_Interaccion, Rol, Contenido)
     VALUES (?, ?, ?)`,
    [interaccionId, rol, String(contenido)]
  );
}

export async function listMessages(interaccionId) {
  if (!interaccionId) throw new Error('listMessages: interaccionId requerido');

  return await db.getAllAsync(
    `SELECT ID_Mensaje, ID_Interaccion, Fecha, Rol, Contenido
       FROM Chat_Mensaje
      WHERE ID_Interaccion = ?
   ORDER BY ID_Mensaje ASC`,
    [interaccionId]
  );
}

// Solo interacciones que tienen al menos 1 mensaje del usuario
export async function listInteractionsByUser(uid) {
  return await db.getAllAsync(
    `SELECT c.ID_Interaccion, c.Fecha_Interaccion, c.Motivo, c.Estado
       FROM Chat_Interaccion c
      WHERE c.ID_Usuario = ?
        AND EXISTS (
              SELECT 1
                FROM Chat_Mensaje m
               WHERE m.ID_Interaccion = c.ID_Interaccion
                 AND m.Rol = 'user'
            )
   ORDER BY c.ID_Interaccion DESC`,
    [uid]
  );
}

export async function deleteInteraction(interaccionId) {
  // Gracias a ON DELETE CASCADE en tus FKs, esto borra mensajes y recomendaciones asociadas
  await db.runAsync(`DELETE FROM Chat_Interaccion WHERE ID_Interaccion = ?`, [interaccionId]);
}

/* ===== Reglas simples de seguridad por alergias ===== */
export async function createRecommendationChecked({
  interaccionId,
  usuarioId,
  medicamento,
  descripcion = '',
}) {
  if (!interaccionId) throw new Error('createRecommendationChecked: interaccionId requerido');
  if (!usuarioId) throw new Error('createRecommendationChecked: usuarioId requerido');

  medicamento = (medicamento || '').trim();
  const desc = String(descripcion || '');

  let motivo = null;

  if (medicamento.toLowerCase().includes('amox')) {
    const pen = await db.getFirstAsync(
      `SELECT 1 FROM Paciente_Alergia pa
       JOIN Alergia a ON a.ID_Alergia = pa.ID_Alergia
       WHERE pa.ID_Usuario = ? AND a.Nombre LIKE 'Penicilina'`,
      [usuarioId]
    );
    if (pen) motivo = 'Alergia a Penicilina';
  }

  if (medicamento.toLowerCase().includes('ibu')) {
    const aine = await db.getFirstAsync(
      `SELECT 1 FROM Paciente_Alergia pa
       JOIN Alergia a ON a.ID_Alergia = pa.ID_Alergia
       WHERE pa.ID_Usuario = ? AND a.Nombre LIKE 'AINEs'`,
      [usuarioId]
    );
    if (aine) motivo = 'Alergia a AINEs';
  }

  if (motivo) {
    await db.runAsync(
      `INSERT INTO Recomendacion
       (ID_Interaccion, ID_Usuario, Descripcion, Severidad, Accion, Fuente)
       VALUES (?, ?, ?, 'alta', 'prohibir', 'regla local')`,
      [interaccionId, usuarioId, `Bloqueada: ${medicamento}. Motivo: ${motivo}`]
    );
    return { bloqueada: true, motivoRiesgo: motivo };
  }

  await db.runAsync(
    `INSERT INTO Recomendacion
     (ID_Interaccion, ID_Usuario, Descripcion, Severidad, Accion, Fuente)
     VALUES (?, ?, ?, 'baja', 'monitorear', 'regla local')`,
    [interaccionId, usuarioId, desc || `Sugerencia: ${medicamento}`]
  );

  return { bloqueada: false };
}

// manda alergias a la api
export async function getActiveAllergies(usuarioId) {
  // devuelve [{ Nombre, Tipo, ID_Alergia }]
  return await db.getAllAsync(
    `SELECT a.ID_Alergia, a.Nombre, a.Tipo
     FROM Alergia a
     INNER JOIN Paciente_Alergia pa
       ON pa.ID_Alergia = a.ID_Alergia
     WHERE pa.ID_Usuario = ?
     ORDER BY a.Nombre`,
    [usuarioId]
  );
}

// ========= CONDICIONES: listar con estado (para Perfil) =========
export async function getCondicionesConEstado(usuarioId) {
  return await db.getAllAsync(
    `SELECT c.ID_Condicion, c.Nombre,
            CASE WHEN pc.ID_Condicion IS NOT NULL THEN 1 ELSE 0 END AS Activa,
            pc.Estado, pc.Fecha_Diagnostico
       FROM Condicion c
  LEFT JOIN (
        SELECT ID_Condicion, Estado, Fecha_Diagnostico
          FROM Paciente_Condicion
         WHERE ID_Usuario = ?
       ) pc
         ON pc.ID_Condicion = c.ID_Condicion
   ORDER BY c.Nombre`,
    [usuarioId]
  );
}


// ========= CONDICIONES: semillas opcionales =========
export async function seedCondiciones() {
  const base = ['Diabetes', 'Hipertensión', 'Asma', 'Taquicardia', 'Úlcera gástrica'];
  for (const n of base) {
    await db.runAsync(`INSERT OR IGNORE INTO Condicion (Nombre) VALUES (?)`, [n]);
  }
}

// ========= DEMOGRAFÍA: helpers (1:1) =========
async function addMissingColumnsDemografia() {
  // Intentar agregar AlturaCm si no existe (ignora error si ya existe)
  try { await db.runAsync(`ALTER TABLE Demografia_Usuario ADD COLUMN AlturaCm REAL`); } catch {}
}

export async function getDemografia(usuarioId) {
  return await db.getFirstAsync(
    `SELECT ID_Usuario, Edad, Sexo, Embarazo, Lactancia, PesoKg, AlturaCm
       FROM Demografia_Usuario
      WHERE ID_Usuario=?`,
    [usuarioId]
  );
}

export async function upsertDemografia(
  usuarioId,
  { Edad, Sexo, Embarazo, Lactancia, PesoKg, AlturaCm }
) {
  await db.runAsync(
    `INSERT INTO Demografia_Usuario
       (ID_Usuario, Edad, Sexo, Embarazo, Lactancia, PesoKg, AlturaCm)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(ID_Usuario) DO UPDATE SET
       Edad       = excluded.Edad,
       Sexo       = excluded.Sexo,
       Embarazo   = excluded.Embarazo,
       Lactancia  = excluded.Lactancia,
       PesoKg     = excluded.PesoKg,
       AlturaCm   = excluded.AlturaCm`,
    [
      usuarioId,
      Edad ?? null,
      (Sexo || null),
      Embarazo ? 1 : 0,
      Lactancia ? 1 : 0,
      PesoKg ?? null,
      AlturaCm ?? null,
    ]
  );
}

export async function getPatientProfile(usuarioId) {
  // Alergias activas
  const alergias = await db.getAllAsync(
    `SELECT a.Nombre, a.Tipo
       FROM Alergia a
       JOIN Paciente_Alergia pa
         ON pa.ID_Alergia = a.ID_Alergia
      WHERE pa.ID_Usuario = ?`,
    [usuarioId]
  );

  // Condiciones activas
  const condiciones = await db.getAllAsync(
    `SELECT c.Nombre, pc.Estado, pc.Fecha_Diagnostico
       FROM Condicion c
       JOIN Paciente_Condicion pc
         ON pc.ID_Condicion = c.ID_Condicion
      WHERE pc.ID_Usuario = ?`,
    [usuarioId]
  );

  // Demografía
  const demografia = await db.getFirstAsync(
    `SELECT Edad, Sexo, Embarazo, Lactancia, PesoKg
       FROM Demografia_Usuario
      WHERE ID_Usuario = ?`,
    [usuarioId]
  );

  return {
    alergias,
    condiciones,
    demografia,
  };
}

/* ========== ÍNDICES ÚNICOS para evitar duplicados ========== */
export async function ensureCentrosUniqueIndexes() {
  await db.execAsync(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_unidad_nombre_dir
      ON Unidad_Salud (Nombre, Direccion);
    CREATE UNIQUE INDEX IF NOT EXISTS ux_clinica_unidad_lat_lon
      ON Clinica_Movil (ID_Unidad, Lat, Lon);
  `);
}

/* ========== UPSERTS ========== */
export async function upsertUnidad({ nombre, direccion = '', telefono = '', tipo = 'centro' }) {
  await db.runAsync(
    `INSERT OR IGNORE INTO Unidad_Salud (Nombre, Direccion, Telefono, Tipo)
     VALUES (?, ?, ?, ?)`,
    [nombre.trim(), direccion.trim(), telefono.trim(), tipo.trim()]
  );
  const row = await db.getFirstAsync(
    `SELECT ID_Unidad FROM Unidad_Salud WHERE Nombre=? AND Direccion=?`,
    [nombre.trim(), direccion.trim()]
  );
  return row?.ID_Unidad;
}

export async function upsertClinicaMovil({ idUnidad, lat, lon, ubicacion = '', estado = 'activa' }) {
  await db.runAsync(
    `INSERT OR IGNORE INTO Clinica_Movil (ID_Unidad, Ubicacion_Actual, Lat, Lon, Estado)
     VALUES (?, ?, ?, ?, ?)`,
    [idUnidad, ubicacion, Number(lat), Number(lon), estado]
  );
}

/* --------- SEED Nicaragua --------- */
export async function seedCentrosNicaragua() {
  await ensureCentrosUniqueIndexes();

  async function addUnidadYUbicaciones(unidad, ubicaciones = []) {
    const idUnidad = await upsertUnidad(unidad);
    for (const u of ubicaciones) {
      await upsertClinicaMovil({ idUnidad, ...u });
    }
  }

  // MANAGUA
  await addUnidadYUbicaciones(
    {
      nombre: 'Hospital Metropolitano Vivian Pellas',
      direccion: 'Carretera a Masaya, Km 9.8, Managua',
      telefono: '(505) 2255-6900',
      tipo: 'hospital',
    },
    [{ lat: 12.1218, lon: -86.2705, ubicacion: 'Entrada principal' }]
  );

  await addUnidadYUbicaciones(
    {
      nombre: 'Hospital Escuela Antonio Lenín Fonseca',
      direccion: 'Distrito II, Managua',
      telefono: '(505) 2253-3939',
      tipo: 'hospital',
    },
    [{ lat: 12.1437, lon: -86.2736, ubicacion: 'Urgencias' }]
  );

  await addUnidadYUbicaciones(
    {
      nombre: 'Hospital Dr. Roberto Calderón (Manolo Morales)',
      direccion: 'Carretera Norte, Managua',
      telefono: '(505) 2244-1414',
      tipo: 'hospital',
    },
    [{ lat: 12.1106, lon: -86.2599, ubicacion: 'Emergencias' }]
  );

  await addUnidadYUbicaciones(
    {
      nombre: 'Centro de Salud Sócrates Flores',
      direccion: 'Reparto Schick, Managua',
      telefono: '(505) 2265-xxxx',
      tipo: 'centro',
    },
    [{ lat: 12.1048, lon: -86.2522, ubicacion: 'Módulo principal' }]
  );

  // LEÓN
  await addUnidadYUbicaciones(
    {
      nombre: 'Hospital Escuela Oscar Danilo Rosales (HEODRA)',
      direccion: 'León',
      telefono: '(505) 2311-5800',
      tipo: 'hospital',
    },
    [{ lat: 12.4356, lon: -86.8796, ubicacion: 'Guardia' }]
  );

  // GRANADA
  await addUnidadYUbicaciones(
    {
      nombre: 'Hospital Japón-Nicaragua',
      direccion: 'Granada',
      telefono: '(505) 2552-xxxx',
      tipo: 'hospital',
    },
    [{ lat: 11.9305, lon: -85.9562, ubicacion: 'Acceso principal' }]
  );

  // MASAYA
  await addUnidadYUbicaciones(
    {
      nombre: 'Hospital Humberto Alvarado Vásquez',
      direccion: 'Masaya',
      telefono: '(505) 2522-xxxx',
      tipo: 'hospital',
    },
    [{ lat: 11.9752, lon: -86.0940, ubicacion: 'Emergencias' }]
  );

  // MATAGALPA
  await addUnidadYUbicaciones(
    {
      nombre: 'Hospital Regional César Amador Molina',
      direccion: 'Matagalpa',
      telefono: '(505) 2772-xxxx',
      tipo: 'hospital',
    },
    [{ lat: 12.9272, lon: -85.9170, ubicacion: 'Bloque A' }]
  );

  // ESTELÍ
  await addUnidadYUbicaciones(
    {
      nombre: 'Hospital Regional Escuela San Juan de Dios',
      direccion: 'Estelí',
      telefono: '(505) 2713-xxxx',
      tipo: 'hospital',
    },
    [{ lat: 13.0900, lon: -86.3530, ubicacion: 'Recepción' }]
  );

  // Centros adicionales (Managua)
  await addUnidadYUbicaciones(
    {
      nombre: 'Centro de Salud Altagracia',
      direccion: 'Barrio Altagracia, Managua',
      telefono: '(505) 2268-xxxx',
      tipo: 'centro',
    },
    [{ lat: 12.1399, lon: -86.2784, ubicacion: 'Consulta externa' }]
  );

  await addUnidadYUbicaciones(
    {
      nombre: 'Centro de Salud Villa Libertad',
      direccion: 'Villa Libertad, Managua',
      telefono: '(505) 2250-xxxx',
      tipo: 'centro',
    },
    [{ lat: 12.1126, lon: -86.2098, ubicacion: 'Módulo de triage' }]
  );
}

/* --------- Versión que se auto-salta si ya hay datos --------- */
export async function seedCentrosNicaraguaOnce() {
  await ensureCentrosUniqueIndexes();
  const row = await db.getFirstAsync(`SELECT COUNT(*) AS c FROM Unidad_Salud`);
  if (row?.c > 0) return; // ya hay datos, no sembrar de nuevo
  await seedCentrosNicaragua();
}

function toNum(n) {
  if (n == null) return NaN;
  if (typeof n === 'number') return n;
  const x = Number(String(n).trim().replace(',', '.'));
  return Number.isFinite(x) ? x : NaN;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // km //aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function listClinicasMovilesActivas() {
  return await db.getAllAsync(`
    SELECT c.ID_Clinica_Movil, c.Lat, c.Lon, c.Ubicacion_Actual, c.Estado,
           u.ID_Unidad, u.Nombre, u.Direccion, u.Telefono, u.Tipo
      FROM Clinica_Movil c
      JOIN Unidad_Salud u ON u.ID_Unidad = c.ID_Unidad
     WHERE c.Estado='activa' AND c.Lat IS NOT NULL AND c.Lon IS NOT NULL
  `);
}


export async function getCentrosCercanos(lat, lon, { limit = 10, maxKm = 500 } = {}) {
  const filas = await listClinicasMovilesActivas();
  const conDist = filas.map(f => ({
    ...f,
    DistKm: haversineKm(lat, lon, Number(f.Lat), Number(f.Lon)),
  }));
  const filtrado = conDist
    .filter(r => isFinite(r.DistKm) && r.DistKm <= maxKm)
    .sort((a, b) => a.DistKm - b.DistKm)
    .slice(0, limit);
  return filtrado;
}
