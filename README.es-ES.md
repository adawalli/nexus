

<!-- markdownlint-disable MD033 MD041 -->

<div align="center">

# 🔍 Nexus MCP Server

**Integración de IA sin la complejidad**

[![npm version](https://img.shields.io/npm/v/nexus-mcp.svg)](https://www.npmjs.com/package/nexus-mcp)
![NPM Downloads](https://img.shields.io/npm/dt/nexus-mcp?style=flat-square&logo=npm&label=downloads)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io/)
[![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/adawalli/nexus)](https://coderabbit.ai)

[![Trust Score](https://archestra.ai/mcp-catalog/api/badge/quality/adawalli/nexus)](https://archestra.ai/mcp-catalog/adawalli__nexus)

_Búsqueda e descubrimiento inteligente de modelos de IA con la simplicidad de cero instalación_

[Inicio Rápido](#-quick-start) • [Características](#-features) • [Documentación](#-documentation) • [Contribuir](#-contributing)

</div>

---

## ¿Qué es Nexus?

Nexus es un **servidor del Protocolo de Contexto de Modelos (MCP)** que proporciona funcionalidad de búsqueda impulsada por IA a través de la API de OpenRouter. Se integra con clientes compatibles con MCP, incluidos Claude Desktop y Cursor, ofreciendo capacidades de búsqueda a través de múltiples familias de modelos, incluido Perplexity Sonar (búsqueda web en tiempo real) y Grok 4 (conocimiento basado en datos de entrenamiento).

### Características Clave

- **Despliegue sin instalación**: Ejecutable mediante `bunx` (o `npx`) sin requisitos de compilación
- **Integración con OpenRouter**: Múltiples modelos de IA, incluidos Perplexity Sonar (búsqueda web) y Grok 4 (datos de entrenamiento)
- **Cumplimiento del protocolo MCP**: Implementa interfaces estándar de herramientas y recursos de MCP
- **Arquitectura de producción**: Incluye caché de solicitudes, deduplicación, lógica de reintento y manejo de errores
- **Implementación con seguridad de tipos**: Cobertura completa de TypeScript con comprobación estricta de tipos

## Características

### Despliegue

- Ejecución basada en Bunx/NPX sin instalación local
- Compatibilidad multiplataforma (macOS, Linux, Windows)
- Requisito de tiempo de ejecución: Bun 1.0+ o Node.js 18+
- Actualizaciones automatizadas de versión a través del registro de npm

### Capacidades de Búsqueda

- **Múltiples niveles de modelos** con diferentes capacidades:
  - `sonar` - Q&A rápido, búsqueda web en tiempo real (tiempo de espera de 30s, nivel estándar)
  - `sonar-pro` - Consultas multietapa, búsqueda web en tiempo real (tiempo de espera de 60s, nivel premium)
  - `sonar-reasoning-pro` - Razonamiento paso a paso, búsqueda web en tiempo real (tiempo de espera de 120s, nivel premium)
  - `sonar-deep-research` - Informes de investigación exhaustivos, búsqueda web en tiempo real (tiempo de espera de 300s, nivel premium)
  - `grok-4` - Conocimiento basado en datos de entrenamiento, sin búsqueda en tiempo real (tiempo de espera de 60s, nivel premium)
- Búsqueda web en tiempo real con información actualizada (modelos de Perplexity)
- Respuestas basadas en conocimiento de datos de entrenamiento (Grok 4)
- Extracción estructurada de citas de las respuestas
- Parámetros de modelo configurables (temperatura, tokens máximos, anulación de tiempo de espera)

### Arquitectura

- Manejo integral de errores con clases de error tipadas
- Caché de solicitudes con TTL configurable
- Deduplicación de solicitudes para consultas idénticas concurrentes
- Lógica automática de reintento con retroceso exponencial
- Registro estructurado basado en Winston
- Implementación en modo estricto de TypeScript con cobertura total de tipos

## Inicio Rápido

### Requisitos Previos

- [Bun](https://bun.sh) 1.0+ (recomendado) o Node.js 18+
- Clave API de OpenRouter ([regístrate en openrouter.ai](https://openrouter.ai))

### Instalación Rápida

Ejecute el servidor sin instalación local:

```bash
# Set your OpenRouter API key
export OPENROUTER_API_KEY=your-api-key-here

# Run the server via bunx (recommended)
bunx nexus-mcp

# Or via npx
npx nexus-mcp
```

El servidor se inicia y espera conexiones de clientes MCP a través del transporte STDIO.

### Prueba de la Instalación

```bash
# Test the CLI help
bunx nexus-mcp --help

# Test the version
bunx nexus-mcp --version

# Run with your API key
OPENROUTER_API_KEY=your-key bunx nexus-mcp
```

## Alternativa: Instalación para Desarrollo Local

Para desarrollo local o personalización:

1. Clona el repositorio:

```bash
git clone https://github.com/adawalli/nexus.git
cd nexus
```

2. Instala las dependencias:

```bash
bun install
```

3. Compila el servidor:

```bash
bun run build
```

4. Configura tu clave API de OpenRouter:

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your actual API key
# OPENROUTER_API_KEY=your-api-key-here
```

5. Prueba el servidor:

```bash
bun run start
```

## Integración con Clientes MCP

### Integración Basada en Bunx (Recomendada)

Configure los clientes MCP para ejecutar el servidor a través de bunx:

### Claude Code

Configuración en `~/.claude/mcp_settings.json`:

```json
{
  "mcpServers": {
    "nexus": {
      "command": "bunx",
      "args": ["nexus-mcp"],
      "env": {
        "OPENROUTER_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Reinicia Claude Code después de los cambios de configuración.

### Cursor

Agrega la configuración del servidor en la configuración MCP de Cursor:

- **Nombre**: `nexus`
- **Comando**: `bunx`
- **Args**: `["nexus-mcp"]`
- **Variables de Entorno**: `OPENROUTER_API_KEY=your-api-key-here`

Reinicia Cursor después de los cambios de configuración.

### Configuración Genérica de Cliente MCP

Parámetros estándar de conexión para clientes MCP:

- **Transporte**: stdio
- **Comando**: `bunx`
- **Args**: `["nexus-mcp"]`
- **Entorno**: `OPENROUTER_API_KEY=your-api-key-here`

### Alternativa: npx o Instalación Local

Si no tienes Bun instalado, usa `npx` en lugar de `bunx` en cualquiera de las configuraciones anteriores.

Para una instalación local (después de seguir la configuración de desarrollo local):

```json
{
  "mcpServers": {
    "nexus": {
      "command": "bun",
      "args": ["run", "/path/to/nexus-mcp/dist/cli.js"],
      "env": {
        "OPENROUTER_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Uso

Una vez integrado, puedes usar la herramienta de búsqueda en tu cliente MCP:

### Búsqueda Básica

```
Use the search tool to find information about "latest developments in AI"
```

### Búsqueda Avanzada con Parámetros

```
Search for "climate change solutions" using:
- Model: sonar-pro
- Max tokens: 2000
- Temperature: 0.3
```

### Uso de Diferentes Modelos

```
# Fast Q&A with real-time web search (default)
Search for "latest news" with model: sonar

# Deep research with comprehensive analysis
Search for "AI safety research" with model: sonar-deep-research

# Knowledge from training data (no web search)
Search for "explain quantum computing" with model: grok-4
```

## Herramientas Disponibles

### `search`

La herramienta principal de búsqueda que proporciona capacidades de búsqueda impulsadas por IA.

**Parámetros:**

- `query` (obligatorio): Consulta de búsqueda (1-2000 caracteres)
- `model` (opcional): Modelo a utilizar (predeterminado: `sonar`)
  - `sonar` - Q&A rápido con búsqueda web en tiempo real (tiempo de espera de 30s)
  - `sonar-pro` - Consultas multietapa con búsqueda web en tiempo real (tiempo de espera de 60s, premium)
  - `sonar-reasoning-pro` - Razonamiento paso a paso con búsqueda web en tiempo real (tiempo de espera de 120s, premium)
  - `sonar-deep-research` - Informes de investigación exhaustivos con búsqueda web en tiempo real (tiempo de espera de 300s, premium)
  - `grok-4` - Conocimiento basado en datos de entrenamiento, sin búsqueda en tiempo real (tiempo de espera de 60s, premium)
- `maxTokens` (opcional): Tokens de respuesta máximos (1-4000, predeterminado: 1000)
- `temperature` (opcional): Aleatoriedad de la respuesta (0-2, predeterminado: 0.3)
- `timeout` (opcional): Anulación del tiempo de espera predeterminado en milisegundos (5000-600000)

**Ejemplo de Respuesta (modelo de Perplexity):**

```
Based on current information, here are the latest developments in AI...

[Detailed AI-generated response with current information]

---
**Search Metadata:**
- Model: perplexity/sonar
- Response time: 1250ms
- Tokens used: 850
- Timeout: 30000ms
- Search type: realtime
- Sources: 5 found
```

**Ejemplo de Respuesta (modelo Grok 4):**

```
Quantum computing is a type of computation that harnesses quantum mechanics...

[Response based on training data knowledge]

---
**Search Metadata:**
- Model: x-ai/grok-4
- Response time: 3500ms
- Tokens used: 650
- Timeout: 60000ms
- Search type: training-data
- Cost tier: premium
```

## Configuración

### Variables de Entorno

- `OPENROUTER_API_KEY` (obligatorio): Tu clave API de OpenRouter
- `NODE_ENV` (opcional): Configuración de entorno (development, production, test)
- `LOG_LEVEL` (opcional): Nivel de registro (debug, info, warn, error)

### Configuración Avanzada

El servidor admite configuración adicional a través de variables de entorno:

- `OPENROUTER_TIMEOUT_MS`: Tiempo de espera de la solicitud en milisegundos (predeterminado: 30000)
- `OPENROUTER_MAX_RETRIES`: Intentos de reintento máximos (predeterminado: 3)
- `OPENROUTER_BASE_URL`: URL base personalizada de la API de OpenRouter

## Recursos

El servidor proporciona un recurso de estado de configuración en `config://status` que muestra:

- Estado de salud del servidor
- Información de configuración (con clave API enmascarada)
- Disponibilidad de la herramienta de búsqueda
- Tiempo de actividad y versión del servidor

## Solución de Problemas

### Problemas Específicos de Bunx/NPX

**"bunx: command not found"**

- Instala Bun: `curl -fsSL https://bun.sh/install | bash`
- O utiliza npx si tienes Node.js 18+ instalado

**"npx: command not found"**

- Asegúrate de que Node.js 18+ esté instalado: `node --version`
- Actualiza npm: `npm install -g npm@latest`

**"Cannot find package 'nexus-mcp'"**

- Es posible que el paquete aún no haya sido publicado. Usa la instalación local en su lugar
- Verifica la conectividad de red para acceder al registro de npm

**Inicio lento en la primera ejecución**

- Esto es normal en la primera ejecución mientras se descarga el paquete
- Las ejecuciones posteriores serán más rápidas debido al caché
- Para un inicio más rápido, utiliza la instalación local

**Errores de "Permission denied" con npx**

- Prueba: `npx --yes nexus-mcp --stdio`
- O configura los permisos de npm: `npm config set user 0 && npm config set unsafe-perm true`

### Problemas Comunes

**"Search functionality is not available"**

- Asegúrate de que la variable de entorno `OPENROUTER_API_KEY` esté configurada
- Verifica que tu clave API sea válida en [OpenRouter](https://openrouter.ai)
- Revisa los registros del servidor en busca de errores de inicialización

**"Authentication failed: Invalid API key"**

- Verifica nuevamente el formato y la validez de tu clave API
- Asegúrate de que la clave tenga suficientes créditos/permisos
- Prueba la clave directamente en el panel de OpenRouter

**"Rate limit exceeded"**

- Espera a que se restablezca el límite de tasa (generalmente 1 minuto)
- Considera actualizar tu plan de OpenRouter para obtener límites más altos
- Monitorea el uso en tu panel de OpenRouter

**Tiempo de espera de conexión (Connection timeouts)**

- Verifica tu conexión a internet
- El servidor reintentará automáticamente las solicitudes fallidas
- Aumenta el tiempo de espera si es necesario: `OPENROUTER_TIMEOUT_MS=60000`

**El cliente MCP no puede conectarse al servidor**

- Verifica que tu configuración MCP utilice el comando y los argumentos correctos
- Comprueba que Bun 1.0+ o Node.js 18+ esté disponible en el entorno de tu cliente MCP
- Asegúrate de que la clave API esté configurada correctamente en las variables de entorno

### Registro de Depuración

Habilita el registro de depuración mediante:

**Para desarrollo local:** Agrega `LOG_LEVEL=debug` a tu archivo `.env`

**Para clientes MCP:** Agrega `LOG_LEVEL: "debug"` a la sección `env` de tu configuración MCP

Esto proporcionará información detallada sobre:

- Carga de configuración
- Solicitudes y respuestas de la API
- Detalles de errores y trazas de pila
- Métricas de rendimiento

### Prueba de Conexión

Puedes probar si el servidor funciona verificando el recurso de estado de configuración en tu cliente MCP, o ejecutando una consulta de búsqueda simple.

## Desarrollo

Para desarrolladores que trabajan en este servidor:

```bash
# Development with hot reload
bun run dev

# Run tests
bun run test

# Run tests with coverage
bun run test:coverage

# Lint code
bun run lint

# Format code
bun run format
```

## Costos de API

OpenRouter cobra por el uso de la API basado en el consumo de tokens:

- **Precios**: Consulta las tarifas actuales en [OpenRouter Models](https://openrouter.ai/models)
- **Monitoreo**: Seguimiento de uso disponible en el panel de OpenRouter
- **Límites**: Configura límites de gasto en la configuración de tu cuenta de OpenRouter
- **Optimización**: El servidor implementa caché de respuestas y deduplicación de solicitudes para minimizar llamadas redundantes a la API

## 📚 Documentación

<div align="center">

| 📖 **Guía**        | 🔗 **Enlace**                                 | 📝 **Descripción**               |
| ------------------- | ------------------------------------------- | -------------------------------- |
| **Inicio Rápido**   | [Getting Started](#-quick-start)            | Configuración sin instalación en 30 segundos |
| **Referencia de API**   | [Herramientas MCP](CLAUDE.md#development-commands) | Referencia completa de comandos       |
| **Configuración**   | [Configuración de Entorno](#configuration)         | Opciones avanzadas de configuración   |
| **Contribuir**    | [Guía de Contribución](CONTRIBUTING.md)       | Únete a nuestra comunidad open source   |
| **Solución de Problemas** | [Problemas Comunes](#troubleshooting)           | Soluciones a problemas comunes     |

</div>

## 🤝 Contribuir

¡Damos la bienvenida a contribuciones de desarrolladores de todos los niveles de experiencia!

<table>
<tr>
<td width="33%">

### 🚀 **Comenzar**

- Fork del repositorio
- Lee nuestra [Guía de Contribución](CONTRIBUTING.md)
- Consulta [primeras issues recomendadas](https://github.com/search?q=repo%3Anexus-mcp+label%3A%22good+first+issue%22&type=issues)

</td>
<td width="33%">

### 🐛 **Informar Problemas**

- [Informes de Errores](https://github.com/adawalli/nexus/issues/new)
- [Solicitudes de Funcionalidades](https://github.com/adawalli/nexus/issues/new)
- [Hacer Preguntas](https://github.com/adawalli/nexus/issues/new)

</td>
<td width="33%">

### 💬 **Unirse a la Comunidad**

- [Discusiones de GitHub](https://github.com/adawalli/nexus/discussions)
- [Código de Conducta](CODE_OF_CONDUCT.md)
- [Hoja de Ruta y Tablero del Proyecto](https://github.com/adawalli/nexus/projects)

</td>
</tr>
</table>

### 🌟 Reconocimiento

Los contribuyentes son reconocidos en nuestra:

- [Lista de contribuyentes](https://github.com/adawalli/nexus/graphs/contributors)
- Notas de lanzamiento para contribuciones significativas
- Destacados y testimonios de la comunidad

## 🔗 Proyectos Relacionados

- [Model Context Protocol](https://modelcontextprotocol.io) - El estándar que implementamos
- [OpenRouter](https://openrouter.ai) - Nuestro proveedor de modelos de IA
- [Claude Desktop](https://claude.ai) - Cliente MCP principal
- [Cursor](https://cursor.sh) - Editor de código impulsado por IA con soporte MCP

## 📞 Soporte y Comunidad

<div align="center">

| 💬 **¿Necesitas Ayuda?**    | 🔗 **Recurso**                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| **Preguntas Rápidas**  | [Discusiones de GitHub](https://github.com/adawalli/nexus/discussions)                                  |
| **Informes de Errores**      | [Issues de GitHub](https://github.com/adawalli/nexus/issues)                                            |
| **Documentación**    | [Docs de OpenRouter](https://openrouter.ai/docs) • [Especificación MCP](https://modelcontextprotocol.io) |
| **Solicitudes de Funcionalidades** | [Propuestas de Mejora](https://github.com/adawalli/nexus/issues/new)                                |

</div>

## 📄 Licencia

**Licencia MIT** - consulta el archivo [LICENSE](LICENSE) para más detalles.

---

<div align="center">

**Hecho con ❤️ por la comunidad open source**

[⭐ Danos una estrella en GitHub](https://github.com/adawalli/nexus) • [📦 Ver en NPM](https://www.npmjs.com/package/nexus-mcp) • [📚 Leer la Documentación](CLAUDE.md)

_Nexus: Integración de IA sin la complejidad_

[![Gráfico de Historial de Estrellas](https://api.star-history.com/svg?repos=adawalli/nexus&type=Date)](https://star-history.com/#adawalli/nexus&Date)

</div>
