/*
Javier Mombiela
Carne: 20067
Seccion: 11

Proyecto1: Uso de unprotocolo existente (XMPP)
*/

// Importamos las librerias necesarias.
const net = require('net');
const readline = require('readline');
const { encode } = require('js-base64');

// Creamos la interfaz para leer datos del usuario.
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Creamos el cliente.
const client = new net.Socket();

// Main: controla el programa
function main() {
  console.log('\n----BIENVENIDO A ALUMCHAT----');
  menu();
}

function menu() {
  console.log('\nMENU:');
  console.log('[1] INICIAR SESION');
  console.log('[2] REGISTRARSE');
  console.log('[3] SALIR');

  rl.question('> ', answer => {
    switch (answer) {
      case '1':
        login();
        break;
      case '2':
        register();
        break;
      case '3':
        exit();
        break;
      default:
        console.log('Opcion invalida! Intente de nuevo!');
        menu();
    }
  });
}

// Submenu: despliega las opciones disponibles despues de iniciar sesion
function submenu(userJid) {
  console.log('\nQUE DESEA HACER?');
  console.log('[1] Mostrar todos los usuarios/contactos y su estado');
  console.log('[2] Agregar un usuario a los contactos');
  console.log('[3] Mostrar detalles de contacto de un usuario');
  console.log('[4] Comunicación 1 a 1 con cualquier usuario/contacto');
  console.log('[5] Participar en conversaciones grupales');
  console.log('[6] Definir mensaje de presencia');
  console.log('[7] Enviar/recibir notificaciones');
  console.log('[8] Enviar/recibir archivos');
  console.log('[9] Regresar al menu principal');

  rl.question('> ', answer => {
    switch (answer) {
      case '1':
        presence();
        break;
      case '2':
        // Add a user to contacts
        break;
      case '3':
        // Show contact details of a user
        break;
      case '4':
        directMessage(userJid);
        break;
      case '5':
        // Participate in group conversations
        break;
      case '6':
        // Set presence message
        break;
      case '7':
        // Send/receive notifications
        break;
      case '8':
        // Send/receive files
        break;
      case '9':
        menu();
        break;
      default:
        console.log('Opcion invalida! Intente de nuevo!');
        submenu();
      }
    });
  }

// Login: inicia sesion en el servidor y desplegar opciones
function login() {
  console.log("\nINGRESE SUS CREDENCIALES:")
  rl.question('usuario: ', jid => {
    rl.question('contraseña: ', password => {
      client.connect(5222, 'alumchat.xyz', () => {
        console.log('\nConectando a alumchat.xyz...');

        // Send XMPP stream header
        client.write(`<?xml version='1.0'?>
<stream:stream to='alumchat.xyz' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'>`);
      });

      client.on('data', data => {
        // console.log('\nSe recibio data del servidor:', data.toString());

        // ver si el servidor mando un stream:features element
        if (data.toString().includes('<stream:features>')) {
          // mandar request de autenticacion
          const authRequest = `<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='PLAIN'>${encode(
            '\0' + jid + '\0' + password
          )}</auth>`;
          client.write(authRequest);
        }

        // ver si el servidor mando un success element
        if (data.toString().includes('<success')) {
          console.log('Inicio de sesion exitoso!');
          console.log('Bienvenido de nuevo, ' + jid + '!');
          submenu(jid + '@alumchat.xyz');
        }
        else if (data.toString().includes('<failure')) {
          console.log('Inicio de sesion fallido! Intente de nuevo!');
          login();
        }
      });

      client.on('close', () => {
        console.log('\nConexion cerrada.');
      });
    });
  });
}

// Register: registra un usuario en el servidor
function register() {
  // Registration code goes here
}

// Exit: sale del programa
function exit() {
  console.log('Saliendo...');
  rl.close();
}

// Direct message: envia un mensaje directo a un usuario
function directMessage(userJid) {
  console.log("\nINFORMACION DEL MENSAJE:")
  rl.question('remitente: ', jid => {
    jid = jid + '@alumchat.xyz';
    // console.log(jid)
    rl.question('mensaje: ', message => {
      // Send direct message
      const directMessage = `<message from='${userJid}' to='${jid}' type='chat'><body>${message}</body></message>`;
      client.write(directMessage);

      client.on('data', data => {
        const dataReceived = data.toString();
        console.log("\nData del servidor:" + dataReceived)

        if (dataReceived.includes('<message') && dataReceived.includes('<received')) {
          console.log('\nMensaje enviado exitosamente!');
          submenu(userJid);
        }
        else if(dataReceived.includes('<message') && dataReceived.includes('type="error')){
          console.log('\nMensaje no enviado! Ha ocurrido un error!');
          submenu(userJid);
        }
      });
    });
  });
}

// Presence: muestra los usuarios conectados y su estado
function presence() {
  
}

//corremos el programa
main();
