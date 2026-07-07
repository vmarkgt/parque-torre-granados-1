// ==========================================================================
// CONFIGURACIÓN DE USUARIOS Y ACCESOS
// ==========================================================================
const usuariosSistemas = [
    {user: "admin", pass: "admin2026", rol: "ADMIN"},
    {user: "torregranados", pass: "torre2026", rol: "OPERADOR"}
];

let usuarioActivo = null;

// CARGA INICIAL Y PERSISTENCIA DE LOGIN
window.onload = () => {
    const savedUser = localStorage.getItem("rememberedUser");
    if(savedUser) {
        document.getElementById("loginUser").value = savedUser;
        document.getElementById("rememberMe").checked = true;
    }
};

// DATOS DE VEHÍCULOS Y MOVIMIENTOS
let activos = JSON.parse(localStorage.getItem("activos")) || [];
activos = activos.map(v => ({...v, horaEntrada: new Date(v.horaEntrada), sellos: v.sellos || 0}));
let historial = JSON.parse(localStorage.getItem("historial")) || [];

// RELOJ EN TIEMPO REAL
setInterval(() => {
    const relojCont = document.getElementById('reloj');
    if(!relojCont) return;
    const ahora = new Date();
    relojCont.innerText = ahora.toLocaleTimeString();
    document.getElementById('fecha').innerText = ahora.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}, 1000);

// FUNCIÓN DE ACCESO
function login(){
    const u = document.getElementById("loginUser").value.trim();
    const p = document.getElementById("loginPass").value.trim();
    const rem = document.getElementById("rememberMe").checked;
    const encontrado = usuariosSistemas.find(x => x.user === u && x.pass === p);

    if(encontrado) {
        if(rem) localStorage.setItem("rememberedUser", u);
        else localStorage.removeItem("rememberedUser");
        usuarioActivo = encontrado;
        document.getElementById("loginCard").style.display = "none";
        document.getElementById("appCard").style.display = "block";
        document.getElementById("userDisplay").innerHTML = `👤 ${usuarioActivo.rol}: ${usuarioActivo.user.toUpperCase()}`;
        actualizarLista();
    } else {
        alert("Usuario o contraseña incorrectos");
    }
}

// ==========================================================================
// REGISTRO DE MOVIMIENTOS (ENTRADAS Y COBROS)
// ==========================================================================
function registrarEntrada(){
    let input = document.getElementById("plateInput");
    let placa = input.value.trim().toUpperCase();
    if(!placa) return;
    let v = {placa, horaEntrada: new Date(), user: usuarioActivo.user, sellos: 0};
    activos.push(v);
    localStorage.setItem("activos", JSON.stringify(activos));
    imprimirTicketEntrada(v);
    input.value = "";
    actualizarLista();
}

// REGLA 1: COBRAR TICKET PERDIDO (SÍ IMPRIME - NATIVO)
function cobrarTicketPerdido() {
    let placa = prompt("Ingrese la PLACA del vehículo:");
    if(!placa) return;
    
    let registro = {
        placa: "PLACA: " + placa.toUpperCase(), 
        tipo: "TICKET PERDIDO", 
        precio: 25, 
        fecha: new Date().toLocaleDateString(), 
        operador: usuarioActivo.user, 
        valorSello: 0
    };
    
    historial.push(registro);
    localStorage.setItem("historial", JSON.stringify(historial));
    
    // Ejecuta la impresión nativa heredada sin tocar layouts de Android
    if (window.AndroidPrinter && window.AndroidPrinter.ticketExtra) {
        window.AndroidPrinter.ticketExtra("REPOSICIÓN TICKET PERDIDO", "Q25.00", registro.placa, registro.fecha, registro.operador);
    }
    
    alert("Cobro registrado e imprimiendo (Q25)");
}

// REGLA 2: COBRAR BAÑO (SOLO REGISTRA EN SILENCIO - NO IMPRIME)
function cobrarBaño() {
    historial.push({
        placa: "USO DE BAÑO", 
        tipo: "BAÑO", 
        precio: 3, 
        fecha: new Date().toLocaleDateString(), 
        operador: usuarioActivo.user, 
        valorSello: 0
    });
    localStorage.setItem("historial", JSON.stringify(historial));
    alert("Uso de baño registrado en caja (Q3)");
}

function abrirModalMensual() { document.getElementById("modalMensual").style.display = "flex"; }
function cerrarModalMensual() { document.getElementById("modalMensual").style.display = "none"; }

function guardarMensualidad() {
    const nombre = document.getElementById("mNombre").value;
    const costo = parseFloat(document.getElementById("mCosto").value);
    if(!nombre || !costo) return alert("Faltan datos");
    
    historial.push({
        placa: `MENSUAL: ${nombre.toUpperCase()}`, 
        tipo: "MENSUAL", 
        precio: costo, 
        fecha: new Date().toLocaleDateString(), 
        operador: usuarioActivo.user, 
        valorSello: 0
    });
    localStorage.setItem("historial", JSON.stringify(historial));
    cerrarModalMensual();
    alert("Pago mensual guardado");
}

// ==========================================================================
// LÓGICA DE SELLOS Y SALIDA
// ==========================================================================
function agregarSello(index){
    activos[index].sellos += 1;
    let v = activos[index];
    let min = Math.ceil((new Date() - v.horaEntrada) / 60000);
    if((v.sellos * 30) >= min) darSalida(index);
    else { localStorage.setItem("activos", JSON.stringify(activos)); actualizarLista(); }
}

function darSalida(index){
    let v = activos[index];
    let salida = new Date();
    let minTotales = Math.ceil((salida - v.horaEntrada) / 60000);
    let minFinales = Math.max(0, minTotales - (v.sellos * 30));
    let inicial = v.placa[0];
    let precio = 0;
    
    let valSelloTotal = Math.ceil(minTotales / 30) * (inicial === "M" ? 3 : 5);
    if(minFinales > 0) precio = Math.ceil(minFinales / 30) * (inicial === "M" ? 3 : 5);

    let registro = {
        placa: v.placa,
        tipo: (minFinales === 0 && v.sellos > 0) ? "SELLO TOTAL" : "EFECTIVO",
        horaE: v.horaEntrada.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        horaS: salida.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        fecha: salida.toLocaleDateString(),
        sellos: v.sellos,
        valorSello: (v.sellos > 0) ? valSelloTotal - precio : 0,
        precio: precio,
        operador: usuarioActivo.user
    };

    historial.push(registro);
    imprimirTicketSalida(registro);
    activos.splice(index, 1);
    localStorage.setItem("activos", JSON.stringify(activos));
    localStorage.setItem("historial", JSON.stringify(historial));
    actualizarLista();
}

function actualizarLista(){
    let cont = document.getElementById("activeList");
    if(!cont) return;
    cont.innerHTML = "";
    activos.forEach((v, i) => {
        let div = document.createElement("div"); div.className = "vehiculo-item";
        div.innerHTML = `<div class="placa-badge">${v.placa}</div>
            <div style="display:flex; gap:8px;">
                <button class="btn-sello" onclick="agregarSello(${i})">SELLO (${v.sellos})</button>
                <button class="btn-salida-list" onclick="darSalida(${i})">SALIDA</button>
            </div>`;
        cont.appendChild(div);
    });
}

// ==========================================================================
// GESTIÓN DE HISTORIAL Y CIERRES DE TURNO
// ==========================================================================
function toggleHistorial(){
    let box = document.getElementById("historialBox");
    if(!box) return;
    if(box.style.display === "none") {
        box.style.display = "block";
        let html = historial.slice().reverse().map(h => `<div style="padding:10px; border-bottom:1px solid #eee; font-size:12px;"><b>${h.placa}</b> - Q${h.precio} (${h.tipo})</div>`).join('');
        if(usuarioActivo.rol === "ADMIN") {
            html += `<button class="ios-btn-danger" onclick="borrarHistorialTotal()">BORRAR TODO (ADMIN)</button>`;
        } else {
            html += `<button class="ios-btn-danger" style="background:#ff9500;" onclick="cerrarTurnoOperador()">CERRAR TURNO (BORRAR MI HISTORIAL)</button>`;
        }
        box.innerHTML = html || "Sin movimientos en este turno";
    } else box.style.display = "none";
}

// REGLA 3: CIERRE DE TURNO FILTRADO (SOLO OPERADOR ACTUAL - ADMIN INTACTO)
function cerrarTurnoOperador(){
    if(confirm("¿Seguro que desea cerrar su turno? Esto limpiará su historial de la sesión activa.")){
        // Elimina únicamente los registros que pertenecen al operador logueado en este instante
        historial = historial.filter(x => x.operador !== usuarioActivo.user);
        localStorage.setItem("historial", JSON.stringify(historial));
        toggleHistorial();
        alert("Turno finalizado. Historial del operador limpio.");
    }
}

function borrarHistorialTotal(){
    if(confirm("¿BORRAR TODO EL HISTORIAL GENERAL DEL SISTEMA (ACCION ADMIN)?")){
        historial = [];
        localStorage.setItem("historial", JSON.stringify(historial));
        toggleHistorial();
    }
}

// ==========================================================================
// CONTROLADORES DE IMPRESIÓN DIRECTA DE DATOS (NATIVOS DE HARDWARE)
// ==========================================================================
function imprimirTicketEntrada(v){
    const horaStr = v.horaEntrada.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const fechaStr = v.horaEntrada.toLocaleDateString();

    if (window.AndroidPrinter && window.AndroidPrinter.ticketEntrada) {
        window.AndroidPrinter.ticketEntrada(v.placa, horaStr, fechaStr);
    }
}

function imprimirTicketSalida(h){
    const visualPrecio = h.precio > 0 ? `Q${h.precio}.00` : `Q0.00`;

    if (window.AndroidPrinter && window.AndroidPrinter.ticketSalida) {
        window.AndroidPrinter.ticketSalida(h.placa, visualPrecio, h.horaE, h.horaS, h.fecha);
    }
}

// REGLA 4: REPORTE GENERAL VISUAL (BAJA IMAGEN PNG A LA GALERÍA - NO ENVIAR A TICKET)
function generarReporteHTML() {
    let trabajador = prompt("Nombre del trabajador:");
    if (!trabajador) return;
    
    let vehiculos = historial.filter(x => x.tipo === "EFECTIVO" || x.tipo === "SELLO TOTAL");
    let otros = historial.filter(x => x.tipo === "BAÑO" || x.tipo === "TICKET PERDIDO" || x.tipo === "MENSUAL");
    let totalCaja = historial.reduce((s, x) => s + x.precio, 0);
    let totalSoloVehiculos = vehiculos.reduce((s, x) => s + x.precio, 0);
    let totalOtros = otros.reduce((s, x) => s + x.precio, 0);

    let reportContainer = document.createElement("div");
    reportContainer.style.position = "fixed"; 
    reportContainer.style.left = "-9999px";
    reportContainer.style.width = "595px"; 
    reportContainer.style.background = "white"; 
    reportContainer.style.padding = "40px";

    reportContainer.innerHTML = `
        <div style="border: 1px solid #000; padding: 30px; min-height: 800px; font-family: Arial; color: #000000;">
            <center>
                <h1 style="margin:0; font-size:28px;">TORRE GRANADOS</h1>
                <h2 style="margin:5px 0 20px 0; font-size:20px; font-weight:normal;">REPORTE DE TURNO</h2>
            </center>
            <div style="display:flex; justify-content:space-between; margin-top:30px; font-size:14px;">
                <span><b>OPERADOR:</b> ${trabajador.toUpperCase()}</span>
                <span><b>FECHA:</b> ${new Date().toLocaleDateString()}</span>
            </div>
            <hr style="border: 1px solid #000; margin: 15px 0;">
            <h3>DETALLE DE VEHÍCULOS</h3>
            <table style="width:100%; font-size:12px; border-collapse:collapse;">
                <tr style="border-bottom:2px solid #000; text-align:left;">
                    <th style="padding:5px;">Placa</th>
                    <th>Tipo</th>
                    <th style="text-align:right; padding:5px;">Monto</th>
                </tr>
                ${vehiculos.map(x => `
                    <tr>
                        <td style="padding:6px 5px; border-bottom:1px solid #ddd;">${x.placa}</td>
                        <td style="border-bottom:1px solid #ddd;">${x.tipo}</td>
                        <td style="text-align:right; padding:6px 5px; border-bottom:1px solid #ddd;">${x.precio > 0 ? 'Q'+x.precio+'.00' : 'Q0.00'}</td>
                    </tr>
                `).join('')}
            </table>
            
            ${otros.length > 0 ? `
                <h3 style="margin-top:30px;">OTROS SERVICIOS</h3>
                <table style="width:100%; font-size:12px; border-collapse:collapse;">
                    <tr style="border-bottom:2px solid #000; text-align:left;">
                        <th style="padding:5px;">Descripción</th>
                        <th style="text-align:right; padding:5px;">Monto</th>
                    </tr>
                    ${otros.map(x => `
                        <tr>
                            <td style="padding:6px 5px; border-bottom:1px solid #ddd;">${x.placa}</td>
                            <td style="text-align:right; padding:6px 5px; border-bottom:1px solid #ddd;">Q${x.precio}.00</td>
                        </tr>
                    `).join('')}
                </table>
            ` : ''}
            
            <div style="margin-top:50px; border:2px solid #000; padding:20px; background:#f9f9f9;">
                <table style="width:100%; font-size:16px; border-collapse:collapse;">
                    <tr style="border-bottom:1px solid #ccc;"><td style="padding:4px 0;">Total Vehículos:</td><td style="text-align:right;">Q${totalSoloVehiculos}.00</td></tr>
                    <tr style="border-bottom:1px solid #ccc;"><td style="padding:4px 0;">Otros Servicios:</td><td style="text-align:right;">Q${totalOtros}.00</td></tr>
                    <tr style="font-size:22px; font-weight:bold;"><td style="padding:10px 0 0 0;">TOTAL EN CAJA:</td><td style="text-align:right; padding:10px 0 0 0;">Q${totalCaja}.00</td></tr>
                </table>
            </div>
        </div>
    `;

    document.body.appendChild(reportContainer);
    
    html2canvas(reportContainer, {scale: 2}).then(canvas => {
        let link = document.createElement("a");
        link.download = `Reporte_${trabajador.toUpperCase()}_${new Date().toISOString().slice(0,10)}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        document.body.removeChild(reportContainer);
    }).catch(err => {
        console.error("Error capturando reporte:", err);
        document.body.removeChild(reportContainer);
    });
}
