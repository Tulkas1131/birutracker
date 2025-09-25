# BiruTracker - Documentación del Proyecto

¡Bienvenido a la documentación de BiruTracker! Esta guía te ayudará a entender cómo funciona la aplicación, cómo está estructurada y cómo puedes realizar modificaciones o añadir nuevas funcionalidades en el futuro.

## 1. ¿Qué es BiruTracker?

BiruTracker es una aplicación web diseñada para cervecerías y distribuidores que permite llevar un control preciso de activos retornables, como barriles de cerveza (Kegs) y cilindros de CO₂. La aplicación permite registrar activos (individualmente o por lotes), clientes y los movimientos de entrada y salida de los activos, manteniendo un historial completo de cada operación.

Una de sus características clave es el uso de **códigos QR** para agilizar el registro de movimientos, permitiendo a los operadores escanear activos directamente con la cámara de su dispositivo móvil o subiendo una imagen del QR en un ordenador.

---

## 2. Guía Rápida de Uso

Aquí te explicamos de forma sencilla cómo usar la aplicación en tu día a día.

### Paso 1: Crear tu Cuenta

Para registrarte, un administrador primero debe añadir tu correo electrónico a una lista de usuarios permitidos. Una vez que tu correo esté autorizado, simplemente ve a la página de registro, introduce tu email y crea una contraseña. ¡Y listo!

### Paso 2: Dar de Alta tus Barriles (Activos)

Antes de mover nada, necesitas registrar tus barriles y cilindros en el sistema.

1.  **Ve a la sección "Activos"**: Aquí puedes crear un barril individual o, si tienes muchos iguales, usar la opción **"Crear Lote"** para generar varios a la vez (por ejemplo, 20 barriles de 50L).
2.  **Imprime los Códigos QR**: Cada barril creado tendrá un código QR único. Puedes imprimirlos individualmente o usar el botón **"Imprimir Lote de QR"** para obtener una hoja con todos los códigos de una categoría. Pega cada QR en su barril físico correspondiente.

### Paso 3: El Ciclo de Vida de un Barril

Este es el proceso completo que sigue un barril, gestionado desde la sección **"Registrar Movimiento"**.

#### **Fase 1: El barril sale de la planta (Lleno)**

*   **Acción**: Selecciona **"Salida a Reparto"**.
*   **¿Qué haces?**: Escanea el QR del barril que estás cargando en el camión y selecciona el cliente al que va destinado.
*   **Resultado**: El barril ahora figura como "En Reparto".

#### **Fase 2: El barril llega al cliente**

*   **Acción**: Selecciona **"Entrega a Cliente"**.
*   **¿Qué haces?**: Al llegar al bar o local, escanea el QR del barril que estás entregando. La app ya sabrá a qué cliente pertenece.
*   **Resultado**: El barril queda registrado como "En Cliente". ¡Ahora puedes ver en el historial cuántos días lleva allí!

#### **Fase 3: Recoges el barril del cliente (Vacío)**

*   **Acción**: Selecciona **"Recolección de Cliente"**.
*   **¿Qué haces?**: Cuando vayas a retirar el barril vacío, escanea su QR. La app lo asociará automáticamente con el cliente correcto.
*   **Resultado**: El barril vuelve a figurar como "En Reparto", pero esta vez volviendo a la planta.

#### **Fase 4: El barril vuelve a la planta**

*   **Acción**: Selecciona **"Recepción en Planta"**.
*   **¿Qué haces?**: Al descargar el camión en tu planta, escanea el QR del barril vacío que ha regresado.
*   **Resultado**: El barril figura como "En Planta" y "Vacío", listo para ser lavado y llenado de nuevo. **¡El ciclo se ha completado!**

¡Con estos pasos, tendrás un control total sobre dónde está cada uno de tus activos en todo momento!

---

## 3. Tecnologías Utilizadas

La aplicación está construida con un conjunto de tecnologías modernas y robustas:

- **Framework Frontend:** [Next.js](https://nextjs.org/) (con React y App Router)
- **Base de Datos:** [Cloud Firestore](https://firebase.google.com/docs/firestore) (de Firebase)
- **Autenticación de Usuarios:** [Firebase Authentication](https://firebase.google.com/docs/auth)
- **Hosting:** [Firebase App Hosting](https://firebase.google.com/docs/hosting)
- **Estilos y Componentes UI:** [Tailwind CSS](https://tailwindcss.com/) y [ShadCN UI](https://ui.shadcn.com/)
- **Iconos:** [Lucide React](https://lucide.dev/)
- **Escaneo de QR:** [html5-qrcode](https://github.com/mebjas/html5-qrcode)

---

## 4. Estructura de la Base de Datos (Firestore)

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

- **`app_logs`**:
  - **Propósito:** Guarda un registro de eventos importantes y errores que ocurren en la aplicación. Solo es visible para los administradores y ayuda a diagnosticar problemas.
  - **Campos:** `timestamp`, `level`, `message`, `component`, `userEmail`, `stack` (opcional).

---

## 5. Funcionalidades Clave y Estructura de Archivos

La estructura de archivos clave se encuentra dentro de la carpeta `src/`.

### 5.1. Gestión de Activos (`src/app/dashboard/assets/page.tsx`)

- **Creación Individual y por Lotes:** Permite crear un único activo o generar múltiples activos a la vez (ej., 50 barriles de 50L) con códigos autoincrementales.
- **Generación e Impresión de QR:** Cada activo tiene un código QR único (basado en su ID de documento de Firestore). La interfaz permite visualizar e imprimir estos códigos, ya sea de forma individual o en una vista de lote para toda una categoría de activos.
- **Componentes Asociados:**
  - `src/components/asset-form.tsx`: Formulario para un activo individual.
  - `src/components/asset-batch-form.tsx`: Formulario para la creación de lotes.

### 5.2. Registro de Movimientos (`src/app/dashboard/movements/page.tsx`)

- **Flujo de Movimiento en Pasos:** La aplicación gestiona un ciclo de vida para los activos. Por ejemplo, un activo primero se marca como "Salida a Reparto" y luego, en un segundo paso, se confirma su "Entrega a Cliente". Esto proporciona un control más granular.
- **Escaneo de QR Universal:** La funcionalidad principal es el botón "Escanear QR". En dispositivos móviles, activa la cámara para un escaneo en tiempo real. En ordenadores de escritorio, ofrece automáticamente la opción de subir un archivo de imagen, garantizando compatibilidad total.
- **Optimización de Rendimiento:** El componente del escáner (`src/components/qr-scanner.tsx`) se carga de forma dinámica (`dynamic import`) para no afectar el rendimiento de carga inicial de la página.

### 5.3. Historial y Alertas (`src/app/dashboard/history/page.tsx`)

- **Trazabilidad Completa:** Muestra un registro paginado de todos los eventos. Por defecto, carga solo los últimos movimientos para un rendimiento óptimo.
- **Búsqueda Eficiente:** Incluye un campo de búsqueda por nombre de cliente. Las búsquedas se realizan directamente en la base de datos (Firestore), lo que garantiza una respuesta rápida incluso con un gran volumen de datos.
- **Alerta de Permanencia:** El historial calcula y muestra cuántos días lleva un activo en posesión de un cliente. Si supera los 30 días, se resalta visualmente como una alerta para facilitar el seguimiento.

### 5.4. Logs del Sistema (Solo Admins) (`src/app/dashboard/logs/page.tsx`)

- **Diagnóstico y Monitoreo:** Esta sección, accesible solo para usuarios con rol de "Admin", muestra un registro de todos los eventos y errores que ocurren en la aplicación.
- **Detalles del Error:** Permite a los administradores ver información detallada de cada log, incluido el `stack trace` en caso de errores, facilitando la identificación y solución de problemas.

### 5.5. Autenticación y Layout (`src/app/dashboard/layout.tsx`)

- **Protección de Rutas:** El layout del panel de control utiliza un `AuthProvider` y el hook `useAuthState` para verificar la sesión del usuario. Si no está autenticado, es redirigido a la página de inicio de sesión.
- **Gestión de Roles:** El hook `useUserRole` obtiene el rol del usuario ("Admin" u "Operador") desde la colección `users` de Firestore, permitiendo mostrar u ocultar funcionalidades específicas (como los botones de eliminación o la página de Logs).

### 5.6. Tipos y Esquemas (`src/lib/types.ts`)

- **¡Archivo muy importante!** Define las estructuras de datos (tipos de TypeScript) y los esquemas de validación de formularios (con Zod). Si quieres añadir o modificar un campo en un activo o cliente, debes empezar por este archivo.

---

## 6. Despliegue

El despliegue de esta aplicación se realiza a través de **Firebase App Hosting**.

- **Plan Gratuito:** La configuración actual del proyecto en el archivo `apphosting.yaml` está optimizada para mantenerse dentro de los límites del plan gratuito ("Spark") de Firebase.
- **Proceso:** Dentro de Firebase Studio, puedes usar el botón "Deploy" para publicar la versión más reciente de tu código a la URL de producción. El proceso es automático y se encarga de construir y optimizar la aplicación para el mejor rendimiento.
