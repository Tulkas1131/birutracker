# BiruTracker - Documentación del Proyecto

¡Bienvenido a la documentación de BiruTracker! Esta guía te ayudará a entender cómo funciona la aplicación, cómo está estructurada y cómo puedes realizar modificaciones o añadir nuevas funcionalidades en el futuro.

## 1. ¿Qué es BiruTracker?

BiruTracker es una aplicación web diseñada para cervecerías y distribuidores que permite llevar un control preciso de activos retornables, como barriles de cerveza (Kegs) y cilindros de CO₂. La aplicación permite registrar activos, clientes y los movimientos de entrada y salida de los activos, manteniendo un historial completo de cada operación.

---

## 2. Tecnologías Utilizadas

La aplicación está construida con un conjunto de tecnologías modernas y robustas:

- **Framework Frontend:** [Next.js](https://nextjs.org/) (con React)
- **Base de Datos:** [Cloud Firestore](https://firebase.google.com/docs/firestore) (de Firebase)
- **Autenticación de Usuarios:** [Firebase Authentication](https://firebase.google.com/docs/auth)
- **Hosting:** [Firebase App Hosting](https://firebase.google.com/docs/hosting)
- **Estilos y Componentes UI:** [Tailwind CSS](https://tailwindcss.com/) y [ShadCN UI](https://ui.shadcn.com/)
- **Iconos:** [Lucide React](https://lucide.dev/)

---

## 3. Estructura de la Base de Datos (Firestore)

La base de datos en Firestore es el corazón de la aplicación. Se organiza en las siguientes colecciones:

- **`allowed_emails`**:
  - **Propósito:** Funciona como una "lista de invitados". Contiene los correos electrónicos de las personas que tienen permiso para registrarse en la aplicación. Si un correo no está aquí, el registro falla.
  - **Campos:** `email` (string).

- **`users`**:
  - **Propósito:** Almacena la información de los usuarios que ya se han registrado. Aquí es donde se define el rol de cada usuario.
  - **Campos:** `email` (string), `role` (string, puede ser "Operador" o "Admin").

- **`assets`**:
  - **Propósito:** Contiene un documento por cada activo físico (barril o cilindro de CO₂).
  - **Campos:** `code`, `type`, `format`, `state`, `location`.

- **`customers`**:
  - **Propósito:** Almacena la información de los clientes (bares, distribuidores, etc.).
  - **Campos:** `name`, `type`, `address`, `contact`.

- **`events`**:
  - **Propósito:** Es el historial de todos los movimientos. Cada vez que se registra una salida o un retorno, se crea un nuevo documento en esta colección.
  - **Campos:** `asset_code`, `customer_name`, `event_type`, `timestamp`, `user_id`, `variety`.

---

## 4. Cómo Realizar Modificaciones

Modificar la aplicación es sencillo si sabes dónde buscar. La estructura de archivos clave se encuentra dentro de la carpeta `src/`.

### Archivos y Carpetas Clave:

- **Páginas Principales (`src/app/dashboard/...`)**:
  - `assets/page.tsx`: La página que muestra la tabla de activos. Aquí se encuentra la lógica para leer, crear, editar y eliminar activos.
  - `customers/page.tsx`: La página para gestionar los clientes.
  - `movements/page.tsx`: El formulario para registrar un nuevo movimiento de entrada o salida.
  - `history/page.tsx`: La página que muestra el historial completo de eventos, con sus filtros.
  - `layout.tsx`: La estructura principal del panel de control, incluyendo la barra lateral de navegación y la lógica de autenticación.

- **Componentes Reutilizables (`src/components/`)**:
  - `asset-form.tsx`: El formulario para crear o editar un activo. Si quieres añadir un nuevo campo a un activo (por ejemplo, "fecha de compra"), debes modificar este archivo y el schema correspondiente.
  - `customer-form.tsx`: El formulario para crear o editar un cliente.
  - `page-header.tsx`: El componente de encabezado que aparece en la parte superior de cada página.

- **Lógica y Tipos de Datos (`src/lib/`)**:
  - `types.ts`: **¡Archivo muy importante!** Aquí se definen las estructuras de datos (tipos de TypeScript) y los esquemas de validación (con Zod) para los formularios. Si quieres añadir un campo a un activo, debes añadirlo aquí primero.
  - `firebase.ts`: Contiene la configuración de conexión a tu proyecto de Firebase.

### Ejemplo Práctico: Añadir un campo "Teléfono" a los Clientes

Si quisieras añadir un campo `phone` a la información de los clientes, seguirías estos pasos:

1.  **Modificar el Tipo y el Schema (`src/lib/types.ts`):**
    - Añade `phone?: string;` al tipo `Customer`.
    - Añade `phone: z.string().optional(),` al `customerSchema` de Zod.

2.  **Modificar el Formulario (`src/components/customer-form.tsx`):**
    - Duplica uno de los bloques `<FormField>` existentes.
    - Cambia el `name` a `"phone"`.
    - Actualiza la `FormLabel` a "Teléfono" y el `placeholder` del `Input`.

3.  **Modificar la Tabla de Visualización (`src/app/dashboard/customers/page.tsx`):**
    - Añade una nueva cabecera de tabla (`<TableHead>Teléfono</TableHead>`).
    - En el `map` que renderiza las filas, añade una nueva celda (`<TableCell>{customer.phone}</TableCell>`) para mostrar el nuevo dato.

¡Con estos tres cambios, la nueva funcionalidad estaría completamente integrada!

---

## 5. Despliegue

El despliegue de esta aplicación se realiza a través de **Firebase App Hosting**. Dentro de Firebase Studio, puedes usar el botón "Deploy" para publicar la versión más reciente de tu código a la URL de producción. El proceso es automático y se encarga de optimizar la aplicación para el mejor rendimiento.
