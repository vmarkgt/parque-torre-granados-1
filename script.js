// CONFIGURACIÓN DE USUARIOS
const usuariosSistemas = [
    {user: "admin", pass: "admin123", rol: "ADMIN"},
    {user: "usuario1", pass: "1111", rol: "OPERADOR"},
    {user: "usuario2", pass: "2222", rol: "OPERADOR"},
    {user: "usuario3", pass: "3333", rol: "OPERADOR"}
];

let usuarioActivo = null;

// CARGA DE DATOS
let activos = JSON.parse(localStorage.getItem("activos")) || [];
activos = activos.map(v => ({
    ...v, 
    horaEntrada: new Date(v.horaEntrada),
    sellos: v.sellos || 0
}));
let historial = JSON.parse(localStorage.getItem("historial")) || [];

// RELOJ VIVO
setInterval(() => {
    const relojCont = document.getElementById('reloj');
    if(!relojCont) return;
    const ahora = new Date();
    relojCont.innerText = ahora.toLocaleTimeString();
    document.getElementById('fecha').innerText = ahora.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}, 1000);

// LOGIN
function login(){
    let u = document.getElementById("loginUser").value;
    let p = document.getElementById("loginPass").value;
    let encontrado = usuariosSistemas.find(x => x.user === u && x.pass === p);
    
    if(!encontrado) return alert("Usuario o contraseña incorrectos");
    
    usuarioActivo = encontrado;
    document.getElementById("loginCard").style.display = "none";
    document.getElementById("appCard").style.display = "block";
    document.getElementById("userDisplay").innerHTML = `👤 ${usuarioActivo.rol}: ${usuarioActivo.user.toUpperCase()}`;
    actualizarLista();
}

// REGISTRAR ENTRADA
function registrarEntrada(){
    let input = document.getElementById("plateInput");
    let placa = input.value.trim().toUpperCase();
    if(!placa) return;
    activos.push({placa, horaEntrada: new Date(), user: usuarioActivo.user, sellos: 0});
    localStorage.setItem("activos", JSON.stringify(activos));
    imprimirTicketEntrada(activos[activos.length-1]);
    input.value = "";
    actualizarLista();
}

// LÓGICA DE SELLO CON SALIDA AUTOMÁTICA
function agregarSello(index){
    activos[index].sellos += 1;
    let v = activos[index];
    let minutosTotales = Math.ceil((new Date() - v.horaEntrada) / 60000);
    let descuentoSellos = v.sellos * 30;

    if(descuentoSellos >= minutosTotales) {
        darSalida(index);
        alert("Cubierto por sello. Salida automática procesada.");
    } else {
        localStorage.setItem("activos", JSON.stringify(activos));
        actualizarLista();
    }
}

// DAR SALIDA
function darSalida(index){
    let v = activos[index];
    let salida = new Date();
    let minutosTotales = Math.ceil((salida - v.horaEntrada) / 60000);
    let descuentoSellos = v.sellos * 30;
    let minutosFinales = Math.max(0, minutosTotales - descuentoSellos);
    
    let inicial = v.placa[0];
    let precio = 0;
    if(minutosFinales > 0) {
        precio = (inicial === "M") ? (minutosFinales <= 30 ? 3 : 6) : (minutosFinales <= 30 ? 5 : 10);
    }

    const registro = {
        placa: v.placa,
        horaE: v.horaEntrada.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        horaS: salida.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        fecha: salida.toLocaleDateString(),
        sellos: v.sellos,
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

// ACTUALIZAR LISTA DE VEHICULOS
function actualizarLista(){
    let cont = document.getElementById("activeList");
    cont.innerHTML = "";
    activos.forEach((v, i) => {
        let li = document.createElement("li");
        li.className = "vehiculo-item";
        li.innerHTML = `
            <div class="placa-badge">${v.placa}</div>
            <div style="font-weight:bold; font-size:13px;">${v.horaEntrada.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
            <div class="action-btns">
                <button class="btn-sello" onclick="agregarSello(${i})">SELLO (${v.sellos})</button>
                <button class="btn-salida-list" onclick="darSalida(${i})">SALIDA</button>
            </div>
        `;
        cont.appendChild(li);
    });
}

// BORRAR HISTORIAL (SÓLO ADMIN)
function borrarHistorialDefinitivo(){
    if(confirm("¿Seguro que deseas borrar TODO el historial definitivamente?")){
        historial = [];
        localStorage.setItem("historial", JSON.stringify(historial));
        toggleHistorial(); // Refrescar vista
        alert("Historial borrado.");
    }
}

// MOSTRAR/OCULTAR HISTORIAL
function toggleHistorial(){
    let box = document.getElementById("historialBox");
    if(box.style.display === "none") {
        box.style.display = "block";
        
        let htmlContenido = "";
        if(historial.length > 0) {
            let listaHTML = historial.slice().reverse().map(h => `
                <div style="padding:10px; border-bottom:1px solid #eee; font-size:11px; text-align:left;">
                    <b>${h.placa}</b> | Q${h.precio} | Sellos: ${h.sellos} | Op: ${h.operador}<br>
                    <small>E: ${h.horaE} - S: ${h.horaS} (${h.fecha})</small>
                </div>
            `).join('');
            
            // Si el usuario es ADMIN, agregamos el botón de borrar al final
            if(usuarioActivo.rol === "ADMIN") {
                listaHTML += `<button class="ios-btn-danger" onclick="borrarHistorialDefinitivo()">BORRAR HISTORIAL DEFINITIVAMENTE</button>`;
            }
            htmlContenido = listaHTML;
        } else {
            htmlContenido = "<p style='padding:10px; font-size:12px; color:#888;'>Sin registros.</p>";
        }
        box.innerHTML = htmlContenido;
    } else {
        box.style.display = "none";
    }
}

// IMPRESIÓN CORREGIDA (ENTRADA)
function imprimirTicketEntrada(v){
    let w = window.open("","","width=300,height=400");
    w.document.write(`<html><body onload="window.print();window.close()"><div style="text-align:center;font-family:sans-serif;width:240px;">
        <img src="logotorre.png" style="width:140px"><br>
        <h1 style="font-size:45px;margin:10px 0;border:2px solid #000;">${v.placa}</h1>
        <p>ENTRADA: ${v.horaEntrada.toLocaleTimeString()}<br>${v.horaEntrada.toLocaleDateString()}</p>
    </div></body></html>`);
    w.document.close();
}

// IMPRESIÓN CORREGIDA (SALIDA)
function imprimirTicketSalida(h){
    let w = window.open("","","width=300,height=400");
    w.document.write(`<html><body onload="window.print();window.close()"><div style="text-align:center;font-family:sans-serif;width:240px;">
        <img src="logotorre.png" style="width:140px"><br>
        <h1 style="font-size:45px;margin:5px 0;">${h.placa}</h1>
        <h2 style="background:#000;color:#fff;padding:10px;">TOTAL: Q${h.precio}.00</h2>
        <p style="font-size:11px;">E: ${h.horaE} | S: ${h.horaS}<br>Sellos: ${h.sellos} | Op: ${h.operador}</p>
    </div></body></html>`);
    w.document.close();
}

// REPORTE PDF
function generarReporteHTML(){
    let v = window.open("", "_blank");
    v.document.write(`<html><body style="font-family:sans-serif;padding:30px;"><center>
        <img src="logotorre.png" width="200"><h2>REPORTE DE VENTAS</h2>
        <table border="1" style="width:100%;border-collapse:collapse;text-align:center;">
            <tr style="background:#f2f2f2;"><th>Placa</th><th>Entrada</th><th>Salida</th><th>Sellos</th><th>Operador</th><th>Monto</th></tr>
            ${historial.map(x => `<tr><td>${x.placa}</td><td>${x.horaE}</td><td>${x.horaS}</td><td>${x.sellos}</td><td>${x.operador}</td><td>Q${x.precio}</td></tr>`).join('')}
        </table>
        <h3 style="text-align:right;">Gran Total: Q${historial.reduce((s, x) => s + x.precio, 0)}.00</h3>
    </center></body></html>`);
    v.document.close();
    v.print();
}