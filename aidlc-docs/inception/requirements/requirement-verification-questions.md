# Preguntas de Verificación de Requerimientos

Por favor responda cada pregunta colocando la letra elegida después de la etiqueta `[Answer]:`.
Si ninguna opción se ajusta, elija la última opción (Otro) y describa su preferencia.

---

## Pregunta 1
¿Qué tipo de aplicación es "ControlHogar"?

A) Sistema IoT / domótica (controlar luces, electrodomésticos, sensores, etc.)

B) Sistema de seguridad del hogar (cámaras, alarmas, control de acceso)

C) Sistema de gestión energética (monitorear/controlar consumo de energía)

D) Hub/panel de control inteligente (panel unificado para múltiples dispositivos)

E) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: Esta aplicación es un centro de gestión y control doméstico diseñado para simplificar la convivencia y administración del hogar. Su objetivo principal es resolver la desorganización en las tareas cotidianas, la falta de seguimiento a los gastos y pagos recurrentes, y la acumulación de arreglos pendientes mediante un sistema colaborativo, multiusuario y sincronizado que centraliza el aseo, la planeación financiera y el mantenimiento en un solo lugar.


## Pregunta 2
¿Qué plataformas debe soportar esta aplicación?

A) Solo aplicación web (basada en navegador)

B) Solo aplicación móvil (iOS/Android)

C) Aplicación web y móvil

D) Sistema embebido / firmware IoT

E) Solo backend/API (los dispositivos se conectan directamente)

F) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: Esta aplicación debe ser una solución multiplataforma accesible desde dispositivos móviles con sistemas operativos iOS y Android, además de ofrecer soporte completo para navegadores web. Su arquitectura técnica está pensada para ofrecer una experiencia fluida e integrada en todos los entornos, garantizando la sincronización de datos en tiempo real y la posibilidad de operar en modo sin conexión tanto en teléfonos inteligentes como en computadoras.


## Pregunta 3
¿Qué lenguaje(s) de programación prefiere para este proyecto?

A) TypeScript / JavaScript (Node.js backend, React/Vue frontend)

B) Python (FastAPI/Django backend)

C) Java / Kotlin (Spring Boot backend)

D) Go

E) C/C++ (embebido/firmware)

F) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: Para este proyecto se recomienda utilizar TypeScript como lenguaje principal, ya que permite mantener una única base de código con tipado fuerte tanto para el desarrollo web como para el entorno móvil multiplataforma. Su integración nativa con marcos modernos de desarrollo móvil como React Native o Capacitor, sumada a la compatibilidad directa con Supabase en el backend, garantiza una estructura sólida, reduce errores en tiempo de desarrollo y simplifica la sincronización de datos entre todas las plataformas.


## Pregunta 4
¿Cuál es la escala esperada y el objetivo de despliegue?

A) Uso personal/hogar (un solo hogar, red local)

B) Pequeña escala (pocos hogares, alojado en la nube)

C) Comercial/SaaS (muchos usuarios, multi-tenant, alojado en AWS)

D) Edge computing (procesamiento local con sincronización opcional en la nube)

E) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: B

## Pregunta 5
¿Qué protocolos de comunicación deben soportarse para la conectividad de dispositivos?

A) Solo WiFi (HTTP/WebSocket)

B) MQTT (protocolo ligero IoT)

C) Zigbee / Z-Wave (redes mesh)

D) Bluetooth Low Energy (BLE)

E) Múltiples protocolos (por favor especifique cuáles después de la etiqueta [Answer]:)

F) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: La aplicación debe soportar protocolos HTTPS y WebSockets (o Server-Sent Events) para la comunicación continua con el backend en Supabase y la actualización en tiempo real entre múltiples usuarios. En caso de requerir conectividad local directamete con dispositivos o periféricos del hogar, es recomendable incluir soporte para Bluetooth Low Energy (BLE) y protocolos estándar de red local como mDNS o REST APIs locales, garantizando así el intercambio de datos fluido y la sincronización sin conexión.


## Pregunta 6
¿Cuáles son las funcionalidades principales que desea en la primera versión (MVP)?

A) Registro y control de dispositivos (encender/apagar, regulación, programación)

B) Monitoreo en tiempo real y dashboards (temperatura, energía, estado)

C) Reglas de automatización / escenas (si X entonces Y, disparadores por tiempo)

D) Todo lo anterior (control de dispositivos + monitoreo + automatización)

E) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: La primera versión (MVP) incluirá la gestión de tareas del hogar con asignación de responsables y frecuencias, un planificador de gastos, recibos y compras sincronizado con el presupuesto, y una lista de mantenimientos pendientes con prioridades y notas. Además, soportará acceso multiusuario con roles e invitaciones, funcionamiento en modo sin conexión con resolución de conflictos y cifrado de datos para garantizar la privacidad.


## Pregunta 7
¿Necesita autenticación de usuarios y soporte multiusuario?

A) Usuario único, sin autenticación necesaria

B) Un solo hogar, múltiples usuarios con roles (administrador, miembro de familia, invitado)

C) Multi-tenant con autenticación y autorización completa (múltiples hogares)

D) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: La aplicación requiere un sistema de autenticación de usuarios y soporte multiusuario que permita a múltiples personas acceder al mismo hogar, crear una cuenta y enviar invitaciones a otros usuarios para que puedan configurar y agregar opciones dentro de la misma cuenta.


## Pregunta 8
¿Cuál es su preferencia de almacenamiento de datos?

A) Base de datos relacional (PostgreSQL, MySQL)

B) NoSQL documento (MongoDB, DynamoDB)

C) Base de datos de series temporales (InfluxDB, TimescaleDB) para datos de sensores

D) Combinación (relacional para configuración + series temporales para telemetría)

E) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: La preferencia de almacenamiento de datos es utilizar Supabase como backend principal, aprovechando su base de datos PostgreSQL para el almacenamiento en la nube, la gestión de la autenticación de usuarios y la sincronización en tiempo real. Adicionalmente, se integrará un almacenamiento local (como IndexedDB en web o SQLite/AsyncStorage en móviles) para soportar el funcionamiento en modo sin conexión y garantizar la persistencia de datos localmente antes de sincronizarlos.


## Pregunta 9: Extensión de Seguridad
¿Deben aplicarse las reglas de seguridad como extensión en este proyecto?

A) Sí — aplicar todas las reglas de SEGURIDAD como restricciones obligatorias (recomendado para aplicaciones de grado producción)

B) No — omitir todas las reglas de SEGURIDAD (adecuado para PoCs, prototipos y proyectos experimentales)

C) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: A

## Pregunta 10: Extensión de Resiliencia
¿Debe aplicarse la línea base de resiliencia a este proyecto?

A) Sí — aplicar la línea base de resiliencia como mejores prácticas direccionales y guía de diseño (recomendado para cargas de trabajo críticas de negocio, como punto de partida informado que puede validar y fortalecer antes de ir a producción)

B) No — omitir la línea base de resiliencia (adecuado para PoCs, prototipos y proyectos experimentales donde la iteración rápida importa más que la confiabilidad)

C) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: A

## Pregunta 11: Extensión de Testing Basado en Propiedades
¿Deben aplicarse las reglas de testing basado en propiedades (PBT) en este proyecto?

A) Sí — aplicar todas las reglas PBT como restricciones obligatorias (recomendado para proyectos con lógica de negocio, transformaciones de datos, serialización o componentes con estado)

B) Parcial — aplicar reglas PBT solo para funciones puras y round-trips de serialización (adecuado para proyectos con complejidad algorítmica limitada)

C) No — omitir todas las reglas PBT (adecuado para aplicaciones CRUD simples, proyectos solo UI o capas de integración ligeras sin lógica de negocio significativa)

D) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: A
