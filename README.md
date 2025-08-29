# BiruTracker - Documentación del Proyecto

¡Bienvenido a la documentación de BiruTracker! Esta guía te ayudará a entender cómo funciona la aplicación, cómo está estructurada y cómo puedes realizar modificaciones o añadir nuevas funcionalidades en el futuro.

## 1. ¿Qué es BiruTracker?

BiruTracker es una aplicación web diseñada para cervecerías y distribuidores que permite llevar un control preciso de activos retornables, como barriles de cerveza (Kegs) y cilindros de CO₂. La aplicación permite registrar activos (individualmente o por lotes), clientes y los movimientos de entrada y salida de los activos, manteniendo un historial completo de cada operación.

Una de sus características clave es el uso de **códigos QR** para agilizar el registro de movimientos, permitiendo a los operadores escanear activos directamente con la cámara de su dispositivo móvil.

---

## 2. Tecnologías Utilizadas

La aplicación está construida con un conjunto de tecnologías modernas y robustas:

- **Framework Frontend:** [Next.js](https://nextjs.org/) (con React y App Router)
- **Base de Datos:** [Cloud Firestore](https://firebase.google.com/docs/firestore) (de Firebase)
- **Autenticación de Usuarios:** [Firebase Authentication](https://firebase.google.com/docs/auth)
- **Hosting:** [Firebase App Hosting](https://firebase.google.com/docs/hosting)
- **Estilos y Componentes UI:** [Tailwind CSS](https://tailwindcss.com/) y [ShadCN UI](https://ui.shadcn.com/)
- **Iconos:** [Lucide React](https://lucide.dev/)
- **Escaneo de QR:** [html5-qrcode](https://github.com/mebjas/html5-qrcode)

---

## 3. Estructura de la Base de Datos (Firestore)

La base de datos en Firestore es el corazón de la aplicación. Se organiza en las siguientes colecciones:

- **`allowed_emails`**:
  - **Propósito:** Funciona como una "lista de invitados". Contiene los correos electrónicos de las personas que tienen permiso para registrarse. Si un correo no está aquí, el registro falla.
  - **Campos:** `email` (string), `role` (string, "Admin" u "Operador").

- **`users`**:
  - **Propósito:** Almacena la información de los usuarios que ya se han registrado, asociando su UID de Firebase con su rol.
  - **Campos:** `email` (string), `role` (string).

- **`assets`**:
  - **Propósito:** Contiene un documento por cada activo físico (barril o cilindro de CO₂).
  - **Campos:** `code`, `type`, `format`, `state`, `location`.

- **`customers`**:
  - **Propósito:** Almacena la información de los clientes (bares, distribuidores, etc.).
  - **Campos:** `name`, `type`, `address`, `contact`.

- **`events`**:
  - **Propósito:** Es el historial de todos los movimientos. Cada vez que se registra una salida o un retorno, se crea un nuevo documento en esta colección.
  - **Campos:** `asset_code`, `asset_id`, `customer_id`, `customer_name`, `event_type`, `timestamp`, `user_id`, `variety`.

---

## 4. Funcionalidades Clave y Estructura de Archivos

La estructura de archivos clave se encuentra dentro de la carpeta `src/`.

### 4.1. Gestión de Activos (`src/app/dashboard/assets/page.tsx`)

- **Creación Individual y por Lotes:** Permite crear un único activo o generar múltiples activos a la vez (ej., 50 barriles de 50L) con códigos autoincrementales.
- **Generación e Impresión de QR:** Cada activo tiene un código QR único (basado en su ID de documento de Firestore). La interfaz permite visualizar e imprimir estos códigos, ya sea de forma individual o en una vista de lote para toda una categoría de activos.
- **Componentes Asociados:**
  - `src/components/asset-form.tsx`: Formulario para un activo individual.
  - `src/components/asset-batch-form.tsx`: Formulario para la creación de lotes.

### 4.2. Registro de Movimientos (`src/app/dashboard/movements/page.tsx`)

- **Flujo de Movimiento en Pasos:** La aplicación gestiona un ciclo de vida para los activos. Por ejemplo, un activo primero se marca como "Salida a Reparto" y luego, en un segundo paso, se confirma su "Entrega a Cliente". Esto proporciona un control más granular.
- **Escaneo de QR:** La funcionalidad principal de esta página es el botón "Escanear QR". Al activarlo, se abre un diálogo que utiliza la cámara del dispositivo para escanear el QR de un activo y seleccionarlo automáticamente en el formulario.
- **Optimización de Rendimiento:** El componente del escáner (`src/components/qr-scanner.tsx`) se carga de forma dinámica (`dynamic import`) para no afectar el rendimiento inicial de la página.

### 4.3. Historial y Alertas (`src/app/dashboard/history/page.tsx`)

- **Trazabilidad Completa:** Muestra un registro de todos los eventos, con filtros por cliente, tipo de activo y tipo de evento.
- **Alerta de Permanencia:** El historial calcula y muestra cuántos días lleva un activo en posesión de un cliente. Si supera los 30 días, se resalta visualmente como una alerta para facilitar el seguimiento.

### 4.4. Autenticación y Layout (`src/app/dashboard/layout.tsx`)

- **Protección de Rutas:** El layout del panel de control utiliza un hook (`useUserRole`) para verificar la sesión del usuario. Si no está autenticado, es redirigido a la página de inicio de sesión.
- **Gestión de Roles:** El hook también obtiene el rol del usuario ("Admin" u "Operador") desde la colección `users` de Firestore, lo que permite mostrar u ocultar funcionalidades específicas (como los botones de eliminación).

### 4.5. Tipos y Esquemas (`src/lib/types.ts`)

- **¡Archivo muy importante!** Define las estructuras de datos (tipos de TypeScript) y los esquemas de validación de formularios (con Zod). Si quieres añadir o modificar un campo en un activo o cliente, debes empezar por este archivo.

---

## 5. Despliegue

El despliegue de esta aplicación se realiza a través de **Firebase App Hosting**. Dentro de Firebase Studio, puedes usar el botón "Deploy" para publicar la versión más reciente de tu código a la URL de producción. El proceso es automático y se encarga de optimizar la aplicación para el mejor rendimiento.