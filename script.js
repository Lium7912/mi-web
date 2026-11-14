"use strict";

/* ====================================================
   Selector de tema claro/oscuro para la web personal.
   La elección se conserva en localStorage.
   ==================================================== */

// Localizar el botón y el elemento raíz (<html>).
const botonTema = document.getElementById("boton-tema");
const pagina = document.documentElement;
const CLAVE_TEMA = "tema";

/** Guardar el tema sin interrumpir la web si el navegador lo impide. */
function guardarTema(tema) {
    try {
        localStorage.setItem(CLAVE_TEMA, tema);
    } catch (error) {
        console.warn("No se pudo guardar la preferencia del tema.");
    }
}

/** Leer la elección previa; si no existe, usar el diseño oscuro original. */
function obtenerTemaGuardado() {
    try {
        const tema = localStorage.getItem(CLAVE_TEMA);
        if (tema === "claro" || tema === "oscuro") return tema;
    } catch (error) {
        console.warn("No se pudo recuperar la preferencia del tema.");
    }
    return "oscuro";
}

/** Aplicar el tema, actualizar el botón y guardar la preferencia. */
function aplicarTema(tema) {
    const esOscuro = tema === "oscuro";

    // El CSS usa el atributo data-tema para seleccionar sus colores.
    pagina.dataset.tema = tema;

    // El botón indica la acción disponible, no el tema actual.
    botonTema.textContent = esOscuro ? "☀️ Modo claro" : "🌙 Modo oscuro";

    // aria-pressed=true indica que el modo oscuro está activo.
    botonTema.setAttribute("aria-pressed", String(esOscuro));
    guardarTema(tema);
}

// Inicializar una vez cargado el script (está al final del <body>).
if (botonTema) {
    aplicarTema(obtenerTemaGuardado());

    // Alternar al pulsar y recordar la nueva elección.
    botonTema.addEventListener("click", function () {
        const nuevoTema = pagina.dataset.tema === "oscuro" ? "claro" : "oscuro";
        aplicarTema(nuevoTema);
    });
}


/* =====================================================
   API 1: GitHub REST API - repositorios públicos.
   API 2: NVD CVE API 2.0 - vulnerabilidades conocidas.
   No se utilizan claves privadas en el navegador.
   ===================================================== */

// PERSONALIZA AQUÍ tu usuario de GitHub. Ejemplo: "octocat".
// Si está vacío, la web pide el nombre mediante el formulario.
const USUARIO_GITHUB = "Lium7912";
const API_GITHUB = "https://api.github.com";
const API_NVD = "https://services.nvd.nist.gov/rest/json/cves/2.0";
const LIMITE_REPOS = 6;
const LIMITE_CVE = 8;

// Función común para crear elementos sin insertar HTML externo inseguro.
function elemento(etiqueta, texto, clase) {
    const nodo = document.createElement(etiqueta);
    if (texto !== undefined && texto !== null) nodo.textContent = String(texto);
    if (clase) nodo.className = clase;
    return nodo;
}

// Enlaces externos seguros (solo URLs creadas por nuestra aplicación).
function enlaceExterno(texto, url) {
    const enlace = elemento("a", texto);
    enlace.href = url;
    enlace.target = "_blank";
    enlace.rel = "noopener noreferrer";
    return enlace;
}

// Consultas HTTP con tiempo máximo y errores comprensibles.
async function solicitarJSON(url, cabeceras = {}) {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), 12000);
    try {
        const respuesta = await fetch(url, {
            headers: { Accept: "application/json", ...cabeceras },
            signal: controlador.signal
        });
        if (!respuesta.ok) {
            if (respuesta.status === 403 || respuesta.status === 429) {
                throw new Error("El servicio ha limitado las peticiones. Inténtalo más tarde.");
            }
            throw new Error(`El servidor ha respondido con el código ${respuesta.status}.`);
        }
        return await respuesta.json();
    } catch (error) {
        if (error.name === "AbortError") throw new Error("La petición tardó demasiado.");
        if (error instanceof TypeError) throw new Error("No se pudo conectar. Comprueba la conexión, CORS o el servidor.");
        throw error;
    } finally {
        clearTimeout(temporizador);
    }
}

function actualizarEstado(id, mensaje, esError = false) {
    const nodo = document.getElementById(id);
    nodo.textContent = mensaje;
    nodo.classList.toggle("error", esError);
}

/* --------------------- GITHUB --------------------- */
const formularioGitHub = document.getElementById("form-github");
const campoGitHub = document.getElementById("usuario-github");
const listaRepos = document.getElementById("lista-repositorios");
const perfilGitHub = document.getElementById("perfil-github");

async function cargarGitHub(usuario) {
    // Evitar peticiones con nombres de usuario mal formados.
    if (!/^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i.test(usuario)) {
        actualizarEstado("estado-github", "Introduce un usuario de GitHub válido.", true);
        return;
    }
    const boton = formularioGitHub.querySelector("button");
    boton.disabled = true;
    listaRepos.replaceChildren();
    perfilGitHub.replaceChildren();
    perfilGitHub.hidden = true;
    actualizarEstado("estado-github", "Cargando proyectos...");
    try {
        // Consultar perfil y repositorios en paralelo.
        const [perfil, repositorios] = await Promise.all([
            solicitarJSON(`${API_GITHUB}/users/${encodeURIComponent(usuario)}`),
            solicitarJSON(`${API_GITHUB}/users/${encodeURIComponent(usuario)}/repos?sort=updated&per_page=30`)
        ]);
        if (!Array.isArray(repositorios)) throw new Error("Respuesta inesperada de GitHub.");

        const avatar = document.createElement("img");
        // GitHub devuelve la URL del avatar; limitar el dominio utilizado.
        if (typeof perfil.avatar_url === "string" &&
            /^https:\/\/avatars\.githubusercontent\.com\//.test(perfil.avatar_url)) {
            avatar.src = perfil.avatar_url;
            avatar.alt = `Avatar de ${usuario}`;
            avatar.loading = "lazy";
            perfilGitHub.append(avatar);
        }
        const datos = elemento("div");
        datos.append(elemento("strong", perfil.name || perfil.login));
        datos.append(elemento("span", `${perfil.public_repos ?? 0} repositorios públicos`));
        perfilGitHub.append(datos);
        perfilGitHub.hidden = false;

        // Excluir forks para destacar proyectos propios.
        const propios = repositorios.filter(repo => !repo.fork).slice(0, LIMITE_REPOS);
        propios.forEach(repo => {
            const tarjeta = elemento("article", null, "api-tarjeta");
            tarjeta.append(elemento("h3", repo.name));
            tarjeta.append(elemento("p", repo.description || "Repositorio sin descripción."));
            tarjeta.append(elemento("p", `Lenguaje: ${repo.language || "No indicado"} · ★ ${repo.stargazers_count || 0}`, "api-meta"));
            tarjeta.append(enlaceExterno("Ver repositorio en GitHub", `https://github.com/${encodeURIComponent(usuario)}/${encodeURIComponent(repo.name)}`));
            listaRepos.append(tarjeta);
        });
        actualizarEstado("estado-github", propios.length
            ? `Mostrando ${propios.length} proyectos públicos de ${usuario}.`
            : "Este perfil no tiene repositorios propios públicos en la primera página de resultados.");
    } catch (error) {
        actualizarEstado("estado-github", `No se pudieron cargar los proyectos: ${error.message}`, true);
    } finally {
        boton.disabled = false;
    }
}

formularioGitHub.addEventListener("submit", evento => {
    evento.preventDefault();
    cargarGitHub(campoGitHub.value.trim());
});
if (USUARIO_GITHUB.trim()) {
    campoGitHub.value = USUARIO_GITHUB.trim();
    cargarGitHub(USUARIO_GITHUB.trim());
}

/* ----------------------- NVD ---------------------- */
const formularioNVD = document.getElementById("form-nvd");
const campoCVE = document.getElementById("busqueda-cve");
const listaCVE = document.getElementById("lista-cve");

function descripcionCVE(cve) {
    const descripciones = Array.isArray(cve.descriptions) ? cve.descriptions : [];
    return (descripciones.find(d => d.lang === "es") ||
            descripciones.find(d => d.lang === "en") || {}).value || "Sin descripción disponible.";
}

function puntuacionCVE(cve) {
    const metricas = cve.metrics || {};
    // Priorizar CVSS v4, después v3.1, v3.0 y v2.
    for (const clave of ["cvssMetricV40", "cvssMetricV31", "cvssMetricV30", "cvssMetricV2"]) {
        if (Array.isArray(metricas[clave]) && metricas[clave].length) {
            const dato = metricas[clave][0].cvssData || {};
            return `${dato.baseSeverity || metricas[clave][0].baseSeverity || "Sin clasificar"} · ${dato.baseScore ?? "N/D"}/10`;
        }
    }
    return "Pendiente de evaluación";
}

async function buscarVulnerabilidades(termino) {
    const boton = formularioNVD.querySelector("button");
    boton.disabled = true;
    listaCVE.replaceChildren();
    actualizarEstado("estado-nvd", "Consultando la base de datos NVD...");
    try {
        const parametros = new URLSearchParams({ resultsPerPage: String(LIMITE_CVE) });
        if (/^CVE-\d{4}-\d{4,}$/i.test(termino)) {
            parametros.set("cveId", termino.toUpperCase());
        } else {
            parametros.set("keywordSearch", termino);
        }
        const datos = await solicitarJSON(`${API_NVD}?${parametros}`);
        const vulnerabilidades = Array.isArray(datos.vulnerabilities) ? datos.vulnerabilities : [];
        vulnerabilidades.forEach(item => {
            const cve = item.cve;
            if (!cve || !/^CVE-\d{4}-\d{4,}$/i.test(cve.id || "")) return;
            const tarjeta = elemento("article", null, "api-tarjeta");
            tarjeta.append(elemento("h3", cve.id));
            tarjeta.append(elemento("span", puntuacionCVE(cve), "api-gravedad"));
            tarjeta.append(elemento("p", descripcionCVE(cve)));
            if (cve.published) {
                const fecha = new Date(cve.published);
                if (!Number.isNaN(fecha.getTime())) {
                    tarjeta.append(elemento("p", `Publicado: ${fecha.toLocaleDateString("es-ES")}`, "api-meta"));
                }
            }
            tarjeta.append(enlaceExterno("Consultar ficha oficial NVD", `https://nvd.nist.gov/vuln/detail/${cve.id}`));
            listaCVE.append(tarjeta);
        });
        actualizarEstado("estado-nvd", vulnerabilidades.length
            ? `Mostrando hasta ${LIMITE_CVE} de ${datos.totalResults ?? vulnerabilidades.length} resultados.`
            : "No se han encontrado vulnerabilidades para esa búsqueda.");
    } catch (error) {
        actualizarEstado("estado-nvd", `No se pudo consultar NVD: ${error.message} Si el navegador bloquea CORS, necesitarás un intermediario del lado del servidor.`, true);
    } finally {
        boton.disabled = false;
    }
}

formularioNVD.addEventListener("submit", evento => {
    evento.preventDefault();
    const termino = campoCVE.value.trim();
    if (termino.length >= 3) buscarVulnerabilidades(termino);
});
