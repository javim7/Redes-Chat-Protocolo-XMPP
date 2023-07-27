/**
 * client.js: cliente de mensajeria instantanea que soporta el protocolo XMPP.
 * Este archivo es el responsable de poder conectarse a alumchat.xyz y poder enviar y recibir mensajes.
 *
 * @author Javier Mombiela
 * @contact mom20067@uvg.edu.gt
 * @created 2023-07-25
 * @requires net
 * @requires js-base64
 * @requires readline
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

/**
 * Main: controla el programa
 */
function main() {
  console.log('\n----BIENVENIDO A ALUMCHAT----');
  menu();
}


/**
 * Menu: despliega las opciones disponibles
 */
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

/**
 * submenu: despliega las opciones disponibles dentro de la sesion
 * @param {String} userJid - JID del usuario que inicio sesion
 */
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
        getUsers(userJid);
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

/**
 * Login: inicia sesion en el servidor
 */
function login() {
  console.log("\nINGRESE SUS CREDENCIALES:")
  rl.question('usuario: ', username => {
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
          const authRequestStanza = `<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='PLAIN'>${encode(
            '\0' + username + '\0' + password
          )}</auth>`;
          client.write(authRequestStanza);
        }

        // ver si el servidor mando un success element
        if (data.toString().includes('<success')) {
          console.log('Inicio de sesion exitoso!');
          console.log('Bienvenido de nuevo, ' + username + '!');
          const userJid = username + '@alumchat.xyz';
          submenu(userJid);
        }
        else if (data.toString().includes('<failure')) {
          console.log('Inicio de sesion fallido! Intente de nuevo!');
          // Cerrar la conexión existente si hay alguna
          login();
        }
      });

      client.on('close', () => {
        console.log('\nConexion cerrada.');
      });
    });
  });
}

/**
 * Register: registra un nuevo usuario en el servidor
 */
function register() {
  // Registration code goes here
}

/**
 * Exit: cierra el programa
 */
function exit() {
  console.log('Saliendo...');
  rl.close();
}

/**
 * directMessage: envia un mensaje directo a un usuario
 * @param {String} userJid - JID del usuario que inicio sesion
 */
function directMessage(userJid) {
  console.log("\nINFORMACION DEL MENSAJE:")
  rl.question('remitente: ', jid => {
    jid = jid + '@alumchat.xyz';
    // console.log(jid)
    rl.question('mensaje: ', message => {
      // stanza para enviar mensaje
      const directMessageStanza = `<message from='${userJid}' to='${jid}' type='chat'><body>${message}</body></message>`;
      client.write(directMessageStanza);

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

/**
 * getUsers: muestra el listado de los contactos del usuario
 * @param {String} userJid - JID del usuario que inicio sesion
 */
function getUsers(userJid) {
  // stanza para ver que entidades hay en el servidor
  const rosterStanza = `<iq type="get" id="roster_1" from="${userJid}"><query xmlns="jabber:iq:roster"/></iq>`;
  client.write(rosterStanza);

  client.on('data', data => {
    const dataReceived = data.toString();
    if (dataReceived.includes('id="roster_1"')) {
      console.log("\nData del servidor: " + dataReceived);
    }
  });
}

//corremos el programa
main();
