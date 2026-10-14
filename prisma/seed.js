// Siembra el catálogo inicial en el proyecto nuevo de Supabase, con los
// mismos valores por defecto que ya trae extraccion-app (db/database.js),
// para no arrancar con una app vacía de catálogos reales.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const defaults = {
  empresa_nombre: 'Forestal Tezains',
  fsc_texto: 'PRODUCTO FSC 100% NC-FM/COC/000156',
  iva_rate: '0.16',
  retencion_rate: '0.04',
  isr_rate: '0.0125',
  generos_default_json: JSON.stringify([
    { nombre: 'PINO', precio: 280 },
    { nombre: 'DOBLE ARRASTRE', precio: 150 },
    { nombre: 'TASCATE', precio: 280 }
  ]),
  gruas_json: JSON.stringify([
    { grua: 'GRUA 1', productor: 'JOSE ANGEL RODRIGUEZ', precio_flete: 290.76 },
    { grua: 'GRUA 2', productor: 'FIDENCIO NUÑEZ RAMIREZ', precio_flete: 234.71 },
    { grua: 'GRUA 3', productor: 'FRANCISCO ESPINOZA REYES', precio_flete: 291.00 },
    { grua: 'GRUA 4', productor: 'RAMON NUÑEZ NUÑEZ', precio_flete: 198.66 },
    { grua: 'GRUA 5', productor: 'MARTIN RODRIGUEZ M.', precio_flete: 273.52 },
    { grua: 'GRUA 6', productor: 'MARCO ANTONIO REYES', precio_flete: 222.35 },
    { grua: 'GRUA 7', productor: 'X', precio_flete: 0 },
    { grua: 'GRUA 8', productor: 'JOSE ANTONIO VIRREY', precio_flete: 226.38 },
    { grua: 'GRUA 9', productor: 'COSME RODRIGUEZ CORRAL', precio_flete: 278.40 },
    { grua: 'GRUA 10', productor: 'OCTAVIO VIRREY REYES', precio_flete: 270.80 }
  ]),
  destinos_json: JSON.stringify([{ nombre: 'FORESTAL TEZAINS' }]),
  fleteros_json: JSON.stringify([
    { nombre: 'FIDENCIO NUÑEZ RAMIREZ', retencion: true, isr: false },
    { nombre: 'LEONEL RIVERA RODRIGUEZ', retencion: true, isr: true },
    { nombre: 'RAMON NUÑEZ NUÑEZ', retencion: true, isr: false },
    { nombre: 'EMILIO RIVERA RODRIGUEZ', retencion: true, isr: true },
    { nombre: 'MARCO ANTONIO REYES QUINTERO', retencion: true, isr: true },
    { nombre: 'SEVERIANO REYES ACOSTA', retencion: true, isr: false },
    { nombre: 'MARTIN RODRIGUEZ RODRIGUEZ', retencion: true, isr: true },
    { nombre: 'NOE DE LA CRUZ NUÑEZ', retencion: true, isr: true },
    { nombre: 'ADAN DE LA CRUZ NUÑEZ', retencion: true, isr: true },
    { nombre: 'MARIO RODRIGUEZ MONTENEGRO', retencion: true, isr: true },
    { nombre: 'GABRIEL NUÑEZ NUÑEZ', retencion: true, isr: false },
    { nombre: 'JANETH ESTRADA BLANCO', retencion: true, isr: false },
    { nombre: 'CARLOS RODRIGUEZ NUÑEZ', retencion: true, isr: true },
    { nombre: 'OCTAVIO VIRREY REYES', retencion: true, isr: true },
    { nombre: 'SIMON REYES ACOSTA', retencion: true, isr: false },
    { nombre: 'COSME RODRIGUEZ CORRAL', retencion: true, isr: true },
    { nombre: 'JOSE ANGEL RODRIGUEZ NUÑEZ', retencion: true, isr: false },
    { nombre: 'JESUS OMAR RODRIGUEZ VIRREY', retencion: true, isr: true },
    { nombre: 'PEDRO REYES ROJO', retencion: true, isr: true },
    { nombre: 'ELEAZAR BARRAZA NEVAREZ', retencion: true, isr: true },
    { nombre: 'BALDOMERO SANCHEZ VIRREY', retencion: true, isr: false },
    { nombre: 'ELIAS MEZA MARTINEZ', retencion: true, isr: true }
  ]),
  parajes_json: JSON.stringify([{ nombre: 'RANCHO QUEMADO' }]),
  fletes_iva_rate: '0.16',
  fletes_retencion_rate: '0.04',
  fletes_isr_rate: '0.0125'
};

async function main() {
  for (const [clave, valor] of Object.entries(defaults)) {
    await prisma.setting.upsert({
      where: { clave },
      update: {},
      create: { clave, valor }
    });
  }
  console.log(`Sembrados ${Object.keys(defaults).length} ajustes/catálogos.`);
}

main().finally(() => prisma.$disconnect());
