# Plan de Infrastructure Design — U1: Fundación

## Plan de Ejecución

- [ ] Mapear componentes lógicos a servicios de infraestructura reales
- [ ] Definir arquitectura de despliegue (ambientes, regiones)
- [ ] Configurar pipeline CI/CD (GitHub Actions)
- [ ] Definir estrategia de hosting web
- [ ] Documentar configuración de Supabase
- [ ] Definir ambientes (dev, staging, prod)

---

## Preguntas de Infraestructura

### Pregunta 1: Hosting del Frontend Web
¿Dónde prefiere hospedar la aplicación web (React/Vite SPA)?

A) Vercel — despliegue automático desde GitHub, preview deployments, edge CDN global, tier gratuito generoso

B) Netlify — similar a Vercel, buen soporte para SPAs, funciones serverless integradas

C) Supabase Hosting — todo en un mismo proveedor, menos features de CDN

D) GitHub Pages — gratuito pero limitado (solo estáticos, sin server-side)

E) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: A

---

## Artefactos a Generar
- `aidlc-docs/construction/u1-fundacion/infrastructure-design/infrastructure-design.md`
- `aidlc-docs/construction/u1-fundacion/infrastructure-design/deployment-architecture.md`
