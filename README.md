<!-- clsmd:start:intro -->
<div align="center">

<img src="public/images/logo-tezains.png" alt="Logo de Gestión Extracción y Fletes" width="96" />

# Gestión Extracción y Fletes

**App de escritorio y web para capturar, guardar e imprimir comprobantes de extracción de madera y de fletes, con sincronización en tiempo real y modo sin internet.**

![Versión](https://img.shields.io/badge/versión-0.3.4-2f6b3a)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-44-47848F?logo=electron&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Realtime-3FCF8E?logo=supabase&logoColor=white)
![Plataforma](https://img.shields.io/badge/plataforma-Windows-0078D6?logo=windows&logoColor=white)
![Licencia](https://img.shields.io/badge/licencia-UNLICENSED-lightgrey)

[Características](#-características) · [Arquitectura](#️-arquitectura) · [Instalación](#-instalación) · [Uso](#-uso) · [Publicar una versión](#-publicar-una-versión)

<img src="docs/screenshots/inicio.png" alt="Pantalla de Inicio con resumen de extracciones y fletes recientes" width="90%" />

</div>
<!-- clsmd:end:intro -->

<!-- clsmd:start:toc -->
## Contenido

- [Descripción](#-descripción)
- [Capturas](#-capturas)
- [Características](#-características)
- [Stack](#-stack)
- [Arquitectura](#️-arquitectura)
- [Cómo funciona el modo sin internet](#-cómo-funciona-el-modo-sin-internet)
- [Modelo de datos](#️-modelo-de-datos)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Requisitos](#-requisitos)
- [Instalación](#-instalación)
- [Configuración](#️-configuración)
- [Uso](#-uso)
- [Publicar una versión](#-publicar-una-versión)
- [Licencia](#-licencia)
<!-- clsmd:end:toc -->

<!-- clsmd:start:descripcion -->
## 📖 Descripción

Gestión Extracción y Fletes sustituye dos formatos en papel que antes se llenaban a mano:

- **Extracción de trocería en rollo**: comprobante por grúa, con los metros y el precio de cada género de madera.
- **Flete de madera en rollo**: comprobante por fletero. Puede juntar viajes de varias grúas, cada una cobrada a su propio precio.

La app calcula subtotales, IVA, retención e ISR, asigna folios y genera una hoja de impresión idéntica al formato oficial. Los datos viven en **Supabase** (Postgres + Realtime), así que varias computadoras ven los mismos registros en vivo. La versión de escritorio (**Electron**) sigue funcionando **sin internet**: guarda en un espejo local y sube los cambios sola al reconectar.

> [!NOTE]
> Es una herramienta interna hecha a la medida de una empresa forestal: sus catálogos (grúas, fleteros, parajes, destinos, géneros) se administran desde la pantalla **Ajustes** y no vienen fijos en el código.
<!-- clsmd:end:descripcion -->

<!-- clsmd:start:capturas -->
## 📸 Capturas

| Extracción (carpetas por grúa) | Nueva extracción |
|:---:|:---:|
| <img src="docs/screenshots/extraccion.png" alt="Lista de extracciones agrupadas en carpetas por grúa" /> | <img src="docs/screenshots/extraccion-nueva.png" alt="Formulario de nueva extracción con géneros, ajustes y totales" /> |
| **Fletes (carpetas por fletero)** | **Nuevo flete con vista previa** |
| <img src="docs/screenshots/fletes.png" alt="Lista de fletes agrupados por fletero" /> | <img src="docs/screenshots/flete-nuevo.png" alt="Formulario de flete con viajes por grúa y vista previa del comprobante" /> |
| **Editor de formatos** | **Ajustes y catálogos** |
| <img src="docs/screenshots/formatos.png" alt="Galería de diseños de comprobante del editor de formatos" /> | <img src="docs/screenshots/ajustes.png" alt="Pantalla de ajustes con tasas de impuestos y catálogos" /> |

> [!NOTE]
> Los nombres, montos y el correo de la cuenta aparecen difuminados a propósito. Para regenerar las capturas, con `npm run dev -- --port 5181` corriendo:
> `CLSMD_USER=<correo> CLSMD_PASS=<contraseña> node .clsmd/capturas.mjs`
<!-- clsmd:end:capturas -->

<!-- clsmd:start:caracteristicas -->
## ✨ Características

**Extracción**
- Captura por grúa: el productor se llena solo desde el catálogo.
- Géneros de madera con metros × precio, en una lista de largo variable.
- Ajustes +/− (descuentos o cargos extra) sobre el cargo base.
- IVA e ISR configurables por documento y folio automático `AAAA-0000`.

**Fletes**
- Viajes de varias grúas en un solo flete, cada grúa a su precio de catálogo.
- Viajes consecutivos de la misma grúa agrupados con subtotal, igual que en el comprobante físico.
- IVA, retención e ISR opcionales y folio automático `FAAAA-0000`.

**Consulta e impresión**
- Vista de carpetas (una por grúa o por fletero), con búsqueda y filtros por fecha, grúa y estado.
- Pantalla de impresión a hoja completa en una ventana aparte.
- **Editor de formatos** (`/formatos`): diseñador visual de comprobantes (arrastrar campos, tablas, imágenes, paletas, varios tamaños de papel). Se puede marcar un diseño "en uso" por tipo. Si no hay ninguno, se imprime el diseño original.

**Datos y sincronización**
- Inicio de sesión con Supabase Auth, con acceso sin internet en equipos donde la persona ya entró antes.
- Las listas se actualizan en tiempo real cuando otra computadora crea, edita o borra algo.
- Modo sin internet con cola de cambios e indicador de conexión (en línea / lenta / sin conexión / pendientes).

**Escritorio (Windows)**
- Instalador NSIS de un clic con accesos directos.
- Actualizaciones desde GitHub Releases: aviso en la app y splash de descarga e instalación que vuelve a abrir la app al terminar.
- Una sola instancia a la vez.
<!-- clsmd:end:caracteristicas -->

<!-- clsmd:start:stack -->
## 🧰 Stack

| Capa | Tecnologías |
|---|---|
| Interfaz | React 18, React Router 6, HeroUI, Tailwind CSS 3, Framer Motion, lucide-react |
| Editor de formatos | Zustand + Immer (estado), react-moveable y react-selecto (lienzo), react-colorful |
| Datos en la nube | Supabase: Postgres, Auth, Realtime y PostgREST mediante `@supabase/supabase-js` |
| Esquema y migraciones | Prisma 6 (PostgreSQL) |
| Datos locales / offline | Dexie (IndexedDB) |
| Escritorio | Electron 44, electron-builder (NSIS), electron-updater |
| Build | Vite 5, PostCSS, Autoprefixer |
<!-- clsmd:end:stack -->

<!-- clsmd:start:arquitectura -->
## 🏗️ Arquitectura

No hay servidor propio: la interfaz habla directo con Supabase y la seguridad la aplican las políticas RLS de Postgres. Electron solo sirve la página compilada y se encarga de las actualizaciones.

```mermaid
flowchart LR
  user(["Usuario"]) --> ui["Interfaz React<br/>src/pages y src/components"]

  subgraph cliente["Cliente: navegador o Electron"]
    ui --> api["Capa de datos<br/>src/lib/api.js"]
    ui --> rt["useRealtimeLista"]
    api --> conn["connectivity.js<br/>ping y estado de red"]
    api -->|"sin red"| dexie[("IndexedDB - Dexie<br/>espejo local + outbox")]
    sync["syncEngine.js"] --> dexie
  end

  subgraph supa["Supabase"]
    auth[["Auth"]]
    rest[["PostgREST"]]
    realtime[["Realtime"]]
    pg[("Postgres<br/>formatos, fletes,<br/>settings, plantillas")]
    rest --> pg
    pg --> realtime
  end

  api -->|"HTTPS"| rest
  sync -->|"sube la cola al reconectar"| rest
  ui -->|"login"| auth
  realtime -->|"WebSocket"| rt

  subgraph escritorio["Electron"]
    main["electron/main.js<br/>protocolo app://"]
    upd["electron-updater"]
  end
  main --> ui
  upd -->|"latest.yml"| gh[["GitHub Releases"]]
```

| Componente | Responsabilidad | Ubicación |
|---|---|---|
| Pantallas | Inicio, Extracción, Fletes, Formatos, Ajustes, Login e impresión | [`src/pages/`](src/pages/) |
| Capa de datos | CRUD de formatos, fletes, settings y plantillas. Si falla la red, usa el espejo local | [`src/lib/api.js`](src/lib/api.js) |
| Cálculos | Totales, impuestos, agrupación por grúa y formato de moneda/fecha `es-MX` | [`src/lib/calc.js`](src/lib/calc.js) |
| Conectividad | Ping periódico a Supabase y detección de red caída o lenta | [`src/lib/connectivity.js`](src/lib/connectivity.js) |
| Espejo local | Base IndexedDB con tablas espejo y bandeja de salida (`outbox`) | [`src/lib/localDb.js`](src/lib/localDb.js) |
| Sincronización | Sube el outbox en orden y reemplaza ids temporales por los reales | [`src/lib/syncEngine.js`](src/lib/syncEngine.js) |
| Autenticación | Sesión de Supabase y login sin internet con huella PBKDF2 local | [`src/lib/AuthContext.jsx`](src/lib/AuthContext.jsx), [`src/lib/accesoOffline.js`](src/lib/accesoOffline.js) |
| Editor de formatos | Modelo del documento, renderizador compartido (editor, vista previa e impresión) y UI del lienzo | [`src/editor/`](src/editor/) |
| Proceso principal | Ventana, protocolo `app://`, instancia única y flujo de actualización | [`electron/main.js`](electron/main.js) |
| Esquema de BD | Modelos Prisma, migraciones, RLS/Realtime y semilla | [`prisma/`](prisma/) |
<!-- clsmd:end:arquitectura -->

<!-- clsmd:start:flujo -->
## 🔌 Cómo funciona el modo sin internet

Cada operación de [`api.js`](src/lib/api.js) intenta primero Supabase con un tiempo límite de 6 s. Si no hay red o no hay sesión remota, trabaja con el espejo local y encola el cambio. Lo creado sin internet recibe un **id temporal negativo**, que nunca choca con un id real de Postgres.

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuario
  participant A as api.js
  participant L as IndexedDB
  participant S as syncEngine.js
  participant P as Supabase
  U->>A: Guarda un flete
  A->>P: insert con tiempo límite
  P--xA: Falla de red o abort
  A->>L: Guarda con id temporal negativo
  A->>L: Agrega crear al outbox
  A-->>U: Guardado localmente
  Note over S: Vuelve la conexión, cada 20 s o al recuperar sesión
  S->>L: Lee el outbox en orden
  S->>P: insert y luego update del folio
  P-->>S: Fila con id real
  S->>L: Reemplaza id temporal y borra del outbox
  P-->>U: Realtime refresca las listas en otras computadoras
```

- Los **diseños del editor** se guardan en caché local para poder imprimir sin internet, pero editarlos sí requiere conexión.
- El **login sin internet** solo funciona en computadoras donde esa persona ya entró antes con internet. Se compara contra una huella PBKDF2 con sal aleatoria; la contraseña nunca se guarda.
<!-- clsmd:end:flujo -->

<!-- clsmd:start:datos -->
## 🗄️ Modelo de datos

Definido en [`prisma/schema.prisma`](prisma/schema.prisma). Las listas de largo variable (géneros, ajustes, viajes) se guardan como JSON dentro de cada registro. Los catálogos y las tasas por defecto viven en `settings` como pares clave/valor.

```mermaid
erDiagram
  FORMATOS {
    int id PK
    string folio
    string productor
    string grua
    string fecha
    string destino
    json generos
    json ajustes
    float iva_rate
    float isr_rate
    string estado
  }
  FLETES {
    int id PK
    string folio
    string fletero
    string fecha
    json lineas
    float precio_flete
    json ajustes
    float iva_rate
    float retencion_rate
    float isr_rate
    string estado
  }
  SETTINGS {
    string clave PK
    string valor
    datetime actualizado_en
  }
  PLANTILLAS_FORMATO {
    int id PK
    string nombre
    string tipo
    int version
    boolean activo
    json project_data
  }
```

| Tabla | Contenido |
|---|---|
| `formatos` | Comprobantes de extracción. `generos`: `[{ nombre, metros, precio }]`; `ajustes`: `[{ etiqueta, monto }]` |
| `fletes` | Comprobantes de flete. `lineas`: `[{ fecha, folio, paraje, grua, metros }]` |
| `settings` | Nombre de la empresa, texto FSC, tasas por defecto y catálogos (`gruas_json`, `fleteros_json`, `parajes_json`, `destinos_json`, `generos_default_json`) |
| `plantillas_formato` | Diseños del editor. `tipo` es `extraccion` o `flete`; a lo más uno `activo` por tipo |

Las tablas no están relacionadas entre sí por llaves foráneas: un flete referencia grúas por nombre, igual que los catálogos.

**Seguridad:** [`prisma/rls_and_realtime.sql`](prisma/rls_and_realtime.sql) activa RLS en todas las tablas. Solo usuarios con sesión (`authenticated`) pueden leer y escribir, y el rol anónimo no tiene acceso. También publica `formatos`, `fletes` y `plantillas_formato` en Supabase Realtime.
<!-- clsmd:end:datos -->

<!-- clsmd:start:estructura -->
## 📁 Estructura del proyecto

```text
fletes-v2/
├── electron/            # Proceso principal, preload, splash de actualización, ícono
├── build/installer.nsh  # Ajuste del instalador NSIS (reabre la app tras actualizar)
├── prisma/              # schema.prisma, migraciones, RLS/Realtime y seed.js
├── public/images/       # Logos (UI y comprobantes impresos)
├── scripts/
│   └── publicar-release.mjs  # Sube el instalador y latest.yml a GitHub Releases
└── src/
    ├── pages/           # Pantallas (una por ruta)
    ├── components/      # Sidebar, recibos, diálogos, filtros, estado de sincronización…
    ├── editor/          # Editor de formatos: modelo, render, store y UI del lienzo
    ├── hooks/           # useRealtimeLista, usePlantillaEnUso, useZoomAjustado
    ├── lib/             # api, calc, auth, conectividad, espejo local y sincronización
    └── styles/          # Tailwind y CSS de los comprobantes impresos
```

**Rutas de la app** ([`src/App.jsx`](src/App.jsx)):

| Ruta | Pantalla |
|---|---|
| `/login` | Inicio de sesión |
| `/inicio` | Resumen y accesos rápidos |
| `/extraccion`, `/extraccion/nuevo`, `/extraccion/:id/editar` | Lista y formulario de extracción |
| `/fletes`, `/fletes/nuevo`, `/fletes/:id/editar` | Lista y formulario de fletes |
| `/extraccion/imprimir/:id`, `/fletes/imprimir/:id` | Hoja de impresión (sin barra lateral) |
| `/formatos` | Galería de diseños de comprobante |
| `/formatos/:id/editor`, `/formatos/:id/prueba` | Editor a pantalla completa e impresión de prueba |
| `/ajustes` | Datos de la empresa, tasas y catálogos |
<!-- clsmd:end:estructura -->

<!-- clsmd:start:requisitos -->
## 📋 Requisitos

- **Node.js** 20 o superior y npm.
- Un proyecto de **Supabase** (Postgres + Auth + Realtime) con al menos un usuario creado en *Authentication → Users*.
- **Windows x64** para compilar y usar la versión de escritorio. La versión web corre en cualquier navegador moderno.
<!-- clsmd:end:requisitos -->

<!-- clsmd:start:instalacion -->
## 🚀 Instalación

```bash
git clone https://github.com/angelcanelos/fletes.git
cd fletes
npm install
```

Crea el archivo `.env` (ver [Configuración](#️-configuración)) y prepara la base de datos:

```bash
# 1. Crea las tablas en Supabase (usa DIRECT_URL)
npx prisma migrate deploy

# 2. Carga los catálogos y valores por defecto
node prisma/seed.js
```

3. En el **SQL Editor** de Supabase, ejecuta [`prisma/rls_and_realtime.sql`](prisma/rls_and_realtime.sql) para activar RLS y Realtime. Si la API no ve las tablas nuevas, ejecuta también [`prisma/reload_schema.sql`](prisma/reload_schema.sql).

> [!IMPORTANT]
> Sin el paso 3, RLS queda sin políticas o Realtime no emite cambios: la app no podrá leer datos o las listas no se refrescarán solas.
<!-- clsmd:end:instalacion -->

<!-- clsmd:start:configuracion -->
## ⚙️ Configuración

Variables de entorno (archivo `.env` en la raíz; está en `.gitignore`):

| Variable | Uso | Obligatoria | Ejemplo ficticio |
|---|---|:---:|---|
| `VITE_SUPABASE_URL` | URL del proyecto de Supabase (la usa la interfaz) | ✅ | `https://abcd1234.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Clave pública `anon` de Supabase (la usa la interfaz) | ✅ | `eyJhbGciOi...` |
| `DATABASE_URL` | Conexión de Prisma por el pooler de Supabase (modo Transaction) | Para migrar/sembrar | `postgresql://postgres.abcd:****@aws-0-region.pooler.supabase.com:6543/postgres` |
| `DIRECT_URL` | Conexión directa a Postgres para `prisma migrate` | Para migrar/sembrar | `postgresql://postgres:****@db.abcd1234.supabase.co:5432/postgres` |
| `GH_TOKEN` | Token de GitHub con permiso *Contents: read and write* para publicar releases | Solo para publicar | — |

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
DATABASE_URL=
DIRECT_URL=
```

> [!TIP]
> Para desarrollar sin tocar la base de producción, crea un `.env.dev` con las credenciales de otro proyecto de Supabase y usa `npm run dev:dev` (modo `dev` de Vite).

> [!WARNING]
> Las variables `VITE_*` se incrustan en el JavaScript compilado. Nunca pongas ahí la clave `service_role`: la protección de los datos depende de RLS y de la clave `anon`.
<!-- clsmd:end:configuracion -->

<!-- clsmd:start:uso -->
## 💻 Uso

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de Vite en `http://localhost:5174` usando `.env` |
| `npm run dev:dev` | Igual, pero con `.env.dev` (base de pruebas) |
| `npm run build` | Compila la web a `dist/` |
| `npm run preview` | Sirve `dist/` para revisar el build |
| `npm run electron:dev` | Compila y abre Electron. En desarrollo la ventana carga `http://localhost:5174`, así que deja `npm run dev` corriendo en otra terminal |
| `npm run electron:build` | Compila y genera el instalador NSIS en `C:\builds\fletes-v2\release` |
| `npm run electron:release` | `electron:build` y luego publica la versión en GitHub Releases |

**Flujo típico de trabajo**

1. Entra con tu correo y contraseña de Supabase.
2. En **Ajustes**, revisa el nombre de la empresa, las tasas de IVA, ISR y retención y los catálogos.
3. En **Extracción** o **Fletes**, crea un comprobante. Los totales se recalculan en pantalla mientras capturas.
4. Usa el botón de imprimir: se abre la hoja en una ventana aparte, lista para `Ctrl + P`.
5. Opcional: en **Formatos**, crea un diseño propio y márcalo como "en uso" para que se imprima con él.
<!-- clsmd:end:uso -->

<!-- clsmd:start:despliegue -->
## 📦 Publicar una versión

La app de escritorio busca actualizaciones en GitHub Releases (`provider: github` en [`package.json`](package.json)). [`scripts/publicar-release.mjs`](scripts/publicar-release.mjs) publica a mano en lugar de usar `--publish always`, porque las subidas en paralelo de electron-builder chocaban y dejaban la release sin `latest.yml`.

```mermaid
flowchart LR
  ver["Subir version<br/>en package.json"] --> push["git push"]
  push --> build["npm run electron:build<br/>instalador NSIS"]
  build --> pub["publicar-release.mjs<br/>crea la release vX.Y.Z"]
  pub --> assets[["GitHub Releases<br/>Setup.exe, .blockmap, latest.yml"]]
  assets --> app["App instalada<br/>detecta la versión nueva"]
  app --> splash["Splash: descarga,<br/>instala y reabre"]
```

```bash
# Requiere GH_TOKEN y que el commit actual ya esté en GitHub
npm run electron:release
```

Antes de publicar, el script comprueba que:
- el commit actual existe en GitHub,
- no existe ya una release con esa versión,
- `latest.yml` corresponde a la versión de `package.json`.
<!-- clsmd:end:despliegue -->

<!-- clsmd:start:licencia -->
## 📄 Licencia

Software privado (`"license": "UNLICENSED"` en [`package.json`](package.json)). Todos los derechos reservados; no se concede permiso de uso, copia ni distribución.
<!-- clsmd:end:licencia -->
