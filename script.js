/* ===================================================
   SISTEMA DE PARQUEO TORRE GRANADOS - script.js
   =================================================== */

// --- ESTADO GLOBAL ---
let vehiculosActivos = JSON.parse(localStorage.getItem('tg_vehiculosActivos')) || [];
let historialCobros = JSON.parse(localStorage.getItem('tg_historialCobros')) || [];

// --- INICIALIZACIÓN Y RELOJ ---
document.addEventListener('DOMContentLoaded', () => {
    iniciarReloj();
    verificarSesion();
    renderizarActivos();
    renderizarHistorial();
});

function iniciarReloj() {
    setInterval(() => {
        const ahora = new Date();
        const relojElem = document.getElementById('reloj');
        const fechaElem = document.getElementById('fecha');

        if (relojElem) {
            relojElem.innerText = ahora.toLocaleTimeString('es-GT', { hour12: false });
        }
        if (fechaElem) {
            const opcionesFecha = { day: 'numeric', month: 'long', year: 'numeric' };
            fechaElem.innerText = ahora.toLocaleDateString('es-GT', opcionesFecha);
        }
    }, 1000);
}

// --- SISTEMA DE AUTENTICACIÓN ---
function login() {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    const rememberMe = document.getElementById('rememberMe').checked;

    if (user !== "" && pass !== "") {
        if (rememberMe) {
            localStorage.setItem('tg_savedUser', user);
        } else {
            localStorage.removeItem('tg_savedUser');
        }
        localStorage.setItem('tg_currentUser', user);
        mostrarApp(user);
    } else {
        alert("Por favor, ingrese usuario y contraseña.");
    }
}

function verificarSesion() {
    const savedUser = localStorage.getItem('tg_savedUser');
    const currentUser = localStorage.getItem('tg_currentUser');

    if (savedUser) {
        document.getElementById('loginUser').value = savedUser;
        document.getElementById('rememberMe').checked = true;
    }

    if (currentUser) {
        mostrarApp(currentUser);
    }
}

function mostrarApp(usuario) {
    document.getElementById('loginCard').style.display = 'none';
    document.getElementById('appCard').style.display = 'block';
    document.getElementById('userDisplay').innerText = `👤 OPERADOR: ${usuario.toUpperCase()}`;
}

// --- REGISTRO DE ENTRADA ---
function registrarEntrada() {
    const plateInput = document.getElementById('plateInput');
    const placa = plateInput.value.toUpperCase().trim();

    if (!placa) {
        alert("Por favor ingrese un número de placa.");
        return;
    }

    // Verificar si la placa ya está dentro del parqueo
    const existe = vehiculosActivos.some(v => v.placa === placa);
    if (existe) {
        alert("El vehículo con esta placa ya se encuentra en el parqueo.");
        return;
    }

    const ahora = new Date();
    const nuevoVehiculo = {
        id: Date.now(),
        placa: placa,
        horaEntrada: ahora.toISOString(),
        horaEntradaFormato: ahora.toLocaleString('es-GT')
    };

    vehiculosActivos.push(nuevoVehiculo);
    guardarDatos();
    renderizarActivos();
    
    // Procesa el ticket con tu diseño estándar
    imprimirTicketOriginal(nuevoVehiculo.placa, nuevoVehiculo.horaEntradaFormato);

    plateInput.value = '';
}

// --- FUNCIÓN TICKET PERDIDO (REIMPRESIÓN CON EL DISEÑO ORIGINAL) ---
function cobrarTicketPerdido() {
    let placaInput = prompt("Ingrese el número de placa para reimprimir el ticket:");
    if (!placaInput) return;
    
    let placa = placaInput.toUpperCase().trim();
    if (placa === "") return;

    // Coloca la placa en el campo de entrada y ejecuta la lógica de entrada/impresión original
    let plateInput = document.getElementById('plateInput');
    if (plateInput) {
        plateInput.value = placa;
    }

    // Llama a la función de registro para que imprima exactamente con el diseño original de tu sistema
    registrarEntrada();
}

// --- IMPRESIÓN DEL TICKET ORIGINAL ---
function imprimirTicketOriginal(placa, fechaEntrada) {
    let ventana = window.open('', '_blank', 'width=300,height=450');
    
    ventana.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Ticket - ${placa}</title>
            <style>
                @page { margin: 0; }
                body { 
                    font-family: 'Courier New', Courier, monospace; 
                    width: 250px; 
                    margin: 0 auto; 
                    padding: 10px; 
                    text-align: center;
                    color: #000;
                }
                .logo { max-width: 120px; height: auto; margin-bottom: 5px; }
                .titulo { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
                .placa-box { 
                    font-size: 26px; 
                    font-weight: bold; 
                    margin: 10px 0; 
                    border-bottom: 1px dashed #000;
                    border-top: 1px dashed #000;
                    padding: 5px 0;
                }
                .info { font-size: 12px; margin: 4px 0; text-align: left; }
                .footer { font-size: 10px; margin-top: 15px; border-top: 1px solid #000; padding-top: 5px; }
            </style>
        </head>
        <body>
            <img src="logotorre.png" class="logo" alt="Logo" onerror="this.style.display='none'">
            <div class="titulo">PARQUEO TORRE GRANADOS</div>
            <div style="font-size: 13px; font-weight: bold; margin: 5px 0;">TICKET DE ENTRADA</div>
            
            <p style="margin:2px; font-size:12px;">PLACA VEHÍCULO:</p>
            <div class="placa-box">${placa}</div>
            
            <div class="info"><strong>FECHA/HORA:</strong> ${fechaEntrada}</div>
            
            <div class="footer">
                <p>Conserve este ticket para el cobro y salida.</p>
                <p>¡Gracias por su preferencia!</p>
            </div>

            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                };
            <\/script>
        </body>
        </html>
    `);

    ventana.document.close();
}

// --- COBROS ADICIONALES Y SERVICIOS ---
function cobrarBaño() {
    const cobro = {
        id: Date.now(),
        concepto: "Servicio de Baño",
        monto: 3,
        fecha: new Date().toLocaleString('es-GT')
    };
    historialCobros.push(cobro);
    guardarDatos();
    renderizarHistorial();
    alert("Cobro de baño registrado: Q3.00");
}

function abrirModalMensual() {
    document.getElementById('modalMensual').style.display = 'flex';
}

function cerrarModalMensual() {
    document.getElementById('modalMensual').style.display = 'none';
    document.getElementById('mNombre').value = '';
    document.getElementById('mCosto').value = '';
}

function guardarMensualidad() {
    const nombre = document.getElementById('mNombre').value.trim();
    const monto = parseFloat(document.getElementById('mCosto').value);

    if (!nombre || isNaN(monto) || monto <= 0) {
        alert("Por favor complete los campos correctamente.");
        return;
    }

    const cobro = {
        id: Date.now(),
        concepto: `Mensualidad: ${nombre}`,
        monto: monto,
        fecha: new Date().toLocaleString('es-GT')
    };

    historialCobros.push(cobro);
    guardarDatos();
    renderizarHistorial();
    cerrarModalMensual();
    alert(`Pago de mensualidad registrado: Q${monto.toFixed(2)}`);
}

// --- RENDERIZADO Y UTILIDADES ---
function renderizarActivos() {
    const container = document.getElementById('activeList');
    if (!container) return;

    if (vehiculosActivos.length === 0) {
        container.innerHTML = `<p style="color:#8e8e93; text-align:center;">No hay vehículos registrados en el parqueo.</p>`;
        return;
    }

    let html = '<ul style="list-style:none; padding:0; margin:0;">';
    vehiculosActivos.forEach(v => {
        html += `
            <li style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:10px; margin-bottom:8px; border-radius:8px;">
                <div>
                    <strong style="font-size:18px; color:#ffffff;">${v.placa}</strong><br>
                    <small style="color:#8e8e93;">Ingreso: ${v.horaEntradaFormato}</small>
                </div>
                <button onclick="salidaVehiculo(${v.id})" class="ios-btn-danger" style="padding:6px 12px; font-size:12px;">Salida</button>
            </li>
        `;
    });
    html += '</ul>';
    container.innerHTML = html;
}

function salidaVehiculo(id) {
    const vehiculo = vehiculosActivos.find(v => v.id === id);
    if (!vehiculo) return;

    if (confirm(`¿Procesar salida del vehículo con placa ${vehiculo.placa}?`)) {
        vehiculosActivos = vehiculosActivos.filter(v => v.id !== id);
        guardarDatos();
        renderizarActivos();
    }
}

function toggleHistorial() {
    const box = document.getElementById('historialBox');
    if (box.style.display === 'none') {
        box.style.display = 'block';
    } else {
        box.style.display = 'none';
    }
}

function renderizarHistorial() {
    const container = document.getElementById('historialBox');
    if (!container) return;

    if (historialCobros.length === 0) {
        container.innerHTML = `<p style="color:#8e8e93; text-align:center; padding:10px;">Sin historial de cobros registrado.</p>`;
        return;
    }

    let html = '<ul style="list-style:none; padding:0; margin:0;">';
    historialCobros.slice().reverse().forEach(c => {
        html += `
            <li style="border-bottom:1px solid rgba(255,255,255,0.1); padding:8px 0; font-size:13px; color:#ddd;">
                <strong>${c.concepto}</strong> - Q${c.monto.toFixed(2)}<br>
                <small style="color:#8e8e93;">${c.fecha}</small>
            </li>
        `;
    });
    html += '</ul>';
    container.innerHTML = html;
}

function generarReporteHTML() {
    let total = historialCobros.reduce((acc, curr) => acc + curr.monto, 0);
    alert(`REPORTE GENERAL DE CAJA\n------------------------\nTotal de Cobros Registrados: Q${total.toFixed(2)}`);
}

function guardarDatos() {
    localStorage.setItem('tg_vehiculosActivos', JSON.stringify(vehiculosActivos));
    localStorage.setItem('tg_historialCobros', JSON.stringify(historialCobros));
}
