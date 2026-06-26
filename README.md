# Sitio Astro para zapateria

Base local para una tienda de calzado inspirada en la estructura comercial de Bata, Procalzado, adidas y Under Armour: categorias claras, hero de campana, vitrinas de producto, beneficios y contacto.

## Estado actual

- Proyecto Astro creado manualmente en esta carpeta.
- Hero propio generado y guardado en `public/images/hero-calzado.png`.
- Sitio inicial en `src/pages/index.astro`.
- Estilos globales en `src/styles/global.css`.

## 1. Instalar herramientas en macOS

1. Instalar Visual Studio Code: <https://code.visualstudio.com/>
2. Instalar Node.js LTS: <https://nodejs.org/>
3. Instalar Git/Xcode Command Line Tools:

```bash
xcode-select --install
```

Despues de instalar, cerrar y abrir la terminal o VS Code.

## 2. Abrir en Visual Studio Code

Desde esta carpeta:

```bash
code .
```

Si el comando `code` no existe, abrir VS Code, presionar `Cmd + Shift + P`, buscar `Shell Command: Install 'code' command in PATH` y volver a intentar.

## 3. Instalar y correr Astro

```bash
corepack enable
pnpm install
pnpm dev
```

Astro normalmente abre en `http://localhost:4321`.

## 4. Crear repositorio en GitHub

```bash
git add .
git commit -m "Initial Astro footwear site"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

Cambia `TU_USUARIO/TU_REPOSITORIO` por el repositorio real.

## 5. Conectar con Cloudflare Pages

1. Entrar a Cloudflare Dashboard.
2. Ir a `Workers & Pages`.
3. Crear una aplicacion de Pages conectada a GitHub.
4. Seleccionar el repositorio.
5. Usar estos ajustes:

```text
Framework preset: Astro
Build command: pnpm build
Build output directory: dist
Node version: 20 o superior
```

Cada `git push` a `main` desplegara una nueva version.

## Siguientes mejoras

- Agregar productos reales con imagen, talla, color y stock.
- Crear paginas de categoria.
- Conectar WhatsApp, pagos y formulario.
- Agregar CMS o archivo de datos para editar catalogo sin tocar codigo.
