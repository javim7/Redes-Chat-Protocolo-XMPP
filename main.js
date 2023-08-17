/**
 * main.js: punto de entrada del programa. controla el flujo del programa.
 *
 * @author Javier Mombiela
 * @contact mom20067@uvg.edu.gt
 * @created 2023-07-25
 * @requires ./client
 * @requires readline
 */

const Client = require("./client");
const readline = require('readline');

// Creamos la interfaz para leer datos del usuario.
let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Creamos la instancia del cliente
const client = new Client();

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
    // Desplegar las opciones disponibles
    console.log('\nMENU:');
    console.log('[1] REGISTRARSE');
    console.log('[2] INICIAR SESION');
    console.log('[3] CERRAR SESION');
    console.log('[4] ELIMINAR CUENTA');
    console.log('[5] SALIR');
    
    // Leer la opcion del usuario y llamar la funcion correspondente
    rl.question('Opcion -> ', answer => {
      switch (answer) {
        case '1':
            registerMain();
            break;
        case '2':
            loginMain();
            break;
        case '3':
            logoutMain();
            break;
        case '4':
            deleteAccountMain();
            break;
        case '5':
            console.log('\nGracias por usar alumchat. Vuelva pronto!');
            rl.close();
            break;
        default:
            console.log('Opcion invalida! Intente de nuevo!');
            menu();
      }
    });
  }
  
  /**
   * submenu: despliega las opciones disponibles dentro de la sesion
   */
  function submenu() {
    // Desplegar las opciones disponibles
    console.log('\nQUE DESEA HACER?');
    console.log('[1] Mostrar todos los usuarios/contactos y su estado');
    console.log('[2] Agregar un usuario a los contactos');
    console.log('[3] Mostrar detalles de contacto de un usuario');
    console.log('[4] Comunicación 1 a 1 con cualquier usuario/contacto');
    console.log('[5] Participar en conversaciones grupales');
    console.log('[6] Definir mensaje de presencia');
    console.log('[7] Ver notificaciones');
    console.log('[8] Regresar al menu principal');
    
    // Leer la opcion del usuario y llamar la funcion correspondente
    rl.question('Opcion -> ', answer => {
      switch (answer) {
        case '1':
            getContactsMain();
            break;
        case '2':
            addContactMain();
            break;
        case '3':
            getContactMain();
            break;
        case '4':
            oneOnOneChatMain();
            break;
        case '5':
            groupChatMain();
            break;
        case '6':
            changeStatusMain();
            break;
        case '7':
            viewNotificationsMain();
            break;
        case '8':
            menu();
            break;
        default:
            console.log('Opcion invalida! Intente de nuevo!');
            submenu();
        }
      });
}

/**
 * register: registra un nuevo usuario en el servidor
 */
async function registerMain() {
    console.log('\nREGISTRARSE:');
    rl.question('Usuario: ', async username => {
      rl.question('Contraseña: ', async password => {
        const email = username + '@alumchat.xyz';
        try {
          // llamar a la funcion con los parametros
          await client.register(username, password, email);
          console.log('\nRegistro exitoso. Ahora puedes iniciar sesión con tus credenciales.');
          loginMain(); //regresar al menu principal
        } catch (err) {
          // Si hay un error, se muestra en pantalla y se vuelve a llamar a register()
          console.log("\nError: " + err.message);
          loginMain();
        }
      });
    });
}

/**
 * login: inicia sesion en el servidor
 */
async function loginMain() {
    console.log('\nINICIAR SESION:')
    rl.question('Usuario: ', async username => {
      rl.question('Contraseña: ', async password => {
        try {
            await client.login(username, password); //esperando a la funcion login()
            console.log('\nSesion iniciada exitosamente!');
            console.log('Bienvenido de nuevo, ' + username + '!');
            submenu(); //redigiendo a submenu()
        } catch (err) {
            // Si hay un error, se muestra en pantalla y se vuelve a llamar a login()
            console.log(err.message)
            loginMain();
        }
      });
    });
  }

/**
 * logout: cierra sesion en el servidor
 */
async function logoutMain() {
    try {
        await client.logout();
        console.log("\nSesion cerrada exitosamente!");
        console.log("Gracias por usar alumchat. Vuelva pronto!")
        main(); //regresar al menu principal
      } catch (err) {
        console.log("\nError al cerrar la sesion:", err.message);
        menu(); // regresar al menu principal
      }
}

/**
 * deleteAccount: elimina la cuenta del usuario en el servidor
 */
async function deleteAccountMain() {
  console.log("\nELIMINAR CUENTA:");
  try {
    // obtener el username del cliente
    const username = client.username;
    await client.deleteAccount();
    console.log("\nCuenta " + username + " eliminada exitosamente!");
    main(); //regresar al menu principal
  } catch (err) {
    console.log("\nError al eliminar la cuenta:", err.message);
    menu(); // regresar al menu principal
  }
}

/**
 * getContactsMain: llama a client.getContacts() con los paremetros necesarios
 */
async function getContactsMain() {
  try {
    console.log("\nCONTACTOS (ROSTER LIST):");
    const contacts = await client.getContacts();

    if (contacts.length === 0) {
      // Si no hay contactos, se muestra un mensaje
      console.log("\nNo se encontraron contactos.");
    } else {
      // Si hay contactos, se muestran en pantalla
      const columnWidth = 40; // ancho de las columnas
      console.log(
        `- ${pad("JID", columnWidth)}${pad("Estado", columnWidth)}Mensaje`
      );
      
      // forlopp para mostrar los contactos y su informacion
      for (const contact of contacts) {
        try {
          const presence = await client.getPresence(contact.jid);
          const show = presence.show || "Offline";
          const status = presence.status || "---";
          console.log(
            `- ${pad(contact.jid, columnWidth)}${pad(show, columnWidth)}${status}`
          );
        } catch (err) {
          console.log(`- ${pad(contact.jid, columnWidth)}${pad("Available", columnWidth)}`);
        }
      }
    }
    submenu();
  } catch (err) {
    console.log(err.message);
    submenu();
  }
}

/**
 * pad: rellena un string con un caracter hasta alcanzar el ancho deseado
 * @param {string} str : string a rellenar
 * @param {int} width : ancho de la columna
 * @param {string} padChar : caracter de relleno
 * @returns 
 */
function pad(str, width, padChar = " ") {
  return str.padEnd(width, padChar).slice(0, width);
}


/**
 * getContactMain: llama a client.getContact() con los paremetros necesarios
 */
async function getContactMain() {
  console.log("\nDETALLES DE CONTACTO:");
  rl.question("Nombre de usuario: ", async (nombre) => {
    const jid = nombre + "@alumchat.xyz";
    try {
      // llamar a la funcion con los parametros
      const contact = await client.getContact(jid);
      const presence = await client.getPresence(jid);
      console.log("\nDetalles de  : " + nombre)
      console.log(`-JID         : ${contact.jid}\n-Nombre      : ${contact.name.split("@")[0]}\n-Suscripción : ${contact.subscription}\n-Estado      : ${presence.show}\n-Mensaje     : ${presence.status}`);
    } catch (err) {
      console.log("\nError al obtener el contacto:", err.message);
    }
    submenu();
  });
}

/**
 * addContactMain: llama a client.addContact() con los paremetros necesarios
 */
async function addContactMain() {
  console.log("\nGESTIONAR CONTACTOS:");
  // mostrar las opciones disponibles
  console.log("[1] Agregar contacto");
  console.log("[2] Aceptar solicitudes de contacto");

  // obtener la opcion del usuario
  rl.question("Opción -> ", async (answer) => {
    if (answer === '1') {
      // si el usuario elige agregar un contacto, se le pide el nombre de usuario
      rl.question("Nombre de usuario: ", async (nombre) => {
        const jid = nombre + "@alumchat.xyz";
        try {
          await client.addContact(jid);
          console.log(`Solicitud de agregar contacto ${jid} enviada al servidor.`);
        } catch (err) {
          console.error('Error al agregar el contacto:', err);
        }
        submenu();
      });
    } else if (answer === '2') {
      // si el usuario elige aceptar solicitudes de contacto, se llama a acceptContactRequest()
      try {
        const requests = await client.getContactRequests();
        if (requests.length === 0) {
          console.log("No hay solicitudes de amistad pendientes.");
          submenu();
          return;
        }

        console.log("\nSolicitudes de amistad pendientes:");
        for (let i = 0; i < requests.length; i++) {
          console.log(`[${i + 1}] ${requests[i]}`);
        }

        // obtener la solicitud que el usuario desea aceptar
        rl.question("Elija el número de la solicitud que desea aceptar o eliminar: ", async (answer) => {
          const index = parseInt(answer) - 1;

          if (isNaN(index) || index < 0 || index >= requests.length) {
            console.log("Número inválido. Intente de nuevo.");
            addContactMain();
            return;
          }

          const request = requests[index];
          const fromJid = request.match(/Nueva solicitud de amistad de: (.+)/)[1];
          rl.question(`¿Desea aceptar la solicitud de ${fromJid}? (s/n): `, async (answer) => {
            const accept = answer.toLowerCase() === 's';
            await client.handleContactRequest(fromJid, accept);
            submenu();
          });
        });
      } catch (err) {
        console.error('Error al aceptar usuarios:', err);
        submenu();
      }
    } else {
      console.log("Opción inválida. Intente de nuevo.");
      addContactMain();
    }
  });
}

/**
 * oneOnOneChatMain: habilita la opcion de poder chatear con un usuario
 */
async function oneOnOneChatMain() {
  console.log("\nCOMUNICACION 1 A 1:");
  client.receiveNotifications = false;
  // obtener el nombre de usuario
  rl.question("Nombre de usuario: ", async (nombre) => {
    const jid = nombre + "@alumchat.xyz";
    console.log(`Iniciando chat con ${jid}...`);
    console.log("\nEscriba 'exit' para salir del chat.");
    console.log("Escriba 'file' para enviar un archivo.\n");

    // escucha poor mensajes entrantes
    client.xmpp.on('stanza', (stanza) => {
      // console.log(`Received stanza: ${stanza.toString()}`);
      if (stanza.is('message') && stanza.attrs.type === 'chat' && stanza.attrs.from.startsWith(jid)) {
        const body = stanza.getChild('body');
        if (body) {
          const message = body.text();
          console.log(`${nombre}: ${message}`);
        }
      }
    });

    //recibir input
    rl.on('line', async (line) => {
      if (line === 'exit') {
        client.receiveNotifications = true;
        console.log('Saliendo del chat...')
        submenu();
        return;
      } else if (line === 'file') {
        rl.question('Ruta del archivo: ', async (filePath) => {
          try {
            await client.sendFile(jid, filePath);
            console.log('Archivo enviado exitosamente!');
          } catch (err) {
            console.log('Error:', err.message);
          }
        });
      } else {
        await client.directMessage(jid, line);
      }
    });

    rl.setPrompt('Mensaje: ');
    rl.prompt();
  });
}

/**
 * groupChat: desplaza las opciones disponibles para chatear en un grupo
 */
async function groupChatMain() {
  console.log('\nPARTICIPAR EN CONVERSACIONES GRUPALES:');
  // mostrar las opciones disponibles
  console.log('[1] Crear un grupo');
  console.log('[2] Chatear en un grupo existente');
  console.log('[3] Aceptar invitaciones de grupo');
  rl.question('Opcion: ', async option => {
    if (option === '1') {
      // se crea un nuevo grupo
      rl.question('\nNombre del grupo: ', async groupName => {
        groupJid = groupName + '@conference.alumchat.xyz';
        try {
          await client.createGroup(groupJid);
          console.log(`Grupo ${groupName} creado exitosamente!`);
          await groupChatMain2(groupJid);
        } catch (err) {
          console.log('Error:', err.message);
          submenu();
        }
      });
    } else if (option === '2') {
      // se une a un grupo existente
      rl.question('\nNombre del grupo: ', async groupName2 => {
        groupJid = groupName2 + '@conference.alumchat.xyz';
        try {
          await client.joinGroup(groupJid); // se une al grupo
          await groupChatMain2(groupJid);
        } catch (err) {
          console.log('Error:', err.message);
          submenu();
        }
      });
    } else if (option === '3') {
      // aceptar invitaciones de grupo
      try {
        const invites = await client.getInviteRequests();
        if (invites.length === 0) {
          console.log("\nNo hay invitaciones de grupo pendientes.");
          submenu();
          return;
        }

        console.log("\nInvitaciones de grupo pendientes:");
        for (let i = 0; i < invites.length; i++) {
          console.log(`[${i + 1}] ${invites[i]}`);
        }

        // obtener la invitación que el usuario desea aceptar
        rl.question("Elija el número de la invitación que desea aceptar o eliminar: ", async (answer) => {
          const index = parseInt(answer) - 1;

          if (isNaN(index) || index < 0 || index >= invites.length) {
            console.log("Número inválido. Intente de nuevo.");
            groupChatMain();
            return;
          }
          
          const invite = invites[index];
          const fromJid = invite.match(/Nueva invitación de grupo de: (.+)/)[1];
          rl.question(`¿Desea aceptar la invitación de ${fromJid}? (s/n): `, async (answer) => {
            const accept = answer.toLowerCase() === 's';
            await client.handleGroupInvite(fromJid, accept);
            // si se acepta la invitación, se une al grupo, sino se va al submenu
            if (accept) {
              groupJid = fromJid + '@conference.alumchat.xyz';
              await client.joinGroup(groupJid);
              await groupChatMain2(groupJid);
            } else {
              // console.log(`Invitación de grupo de ${fromJid} eliminada.`);
              submenu();
            }
          });
        });
      } catch (err) {
        console.error('Error al aceptar invitaciones:', err);
        submenu();
      }
    } else {
      console.log('Opcion invalida! Intente de nuevo.');
      groupChatMain();
    }
  });
}

/**
 * groupChatMain2: logra hacer el broadcast del grupo
 * @param {String} groupName: nombre del grupo
 */
async function groupChatMain2(groupName) {
  console.log(`\nCHAT GRUPAL: ${groupName}`);
  client.receiveNotifications = false;
  console.log("Escriba 'exit' para salir del chat.");
  console.log("Escriba 'invite' para invitar a un usuario al grupo.");
  console.log("Escriba 'file' para enviar un archivo.\n")

  //escucha por mensajes entrantes
  client.onGroupMessage(groupName, (from, message) => {
    console.log(`${from}: ${message}`);
  });

  //input de usuario
  rl.on('line', async line => {
    if (line === 'exit') {
      client.receiveNotifications = true;
      console.log('Saliendo del chat grupal...')
      submenu();
      return;
    } else if (line === 'invite') {
      rl.question('\nNombre de usuario a invitar: ', async username => {
        userJid = username + '@alumchat.xyz';
        await client.inviteToGroup(groupName, userJid);
        console.log(`Invitacion enviada a ${username}!`);
      });
    } else {
      await client.chatMessage(groupName, line);
    }
  });

  rl.setPrompt('Mensaje: ');
  rl.prompt();
}

/**
 * changeStatusMain: despliega las opciones para cambiar el estado del usuario
 */
async function changeStatusMain() {
    console.log("\nDEFINIR PRESENCIA:");
    // mostrar las opciones disponibles
    console.log("[1] Available");
    console.log("[2] Away");
    console.log("[3] Not Available");
    console.log("[4] Busy");
    console.log("[5] Offline");

    // obtener la opción del usuario
    //las opciones estan escritas como se ven en xmpp
    rl.question("Opcion -> ", async (answer) => {
      let showOption;
      switch (answer) {
        case '1':
          showOption = "";
          break;
        case '2':
          showOption = "away";
          break;
        case '3':
          showOption = "xa";
          break;
        case '4':
          showOption = "dnd";
          break;
        case '5':
          showOption = "unavailable";
          break;
        default:
          console.log("Opcion Invalida! Intente de nuevo.");
          changeStatusMain();
          return;
      }
      
      // obtener el mensaje de status del usuario
      rl.question("Ingresar mensaje de status (opcional): ", async (status) => {
        try {
          await client.changeStatus(showOption, status);
          console.log("Presencia definida con exito!");
        } catch (err) {
          console.log("Error:", err.message);
        }
        submenu();
      });
    });
  }  

  /**
   * viewNotificationsMain: despliega las notificaciones del usuario
   */
  function viewNotificationsMain() {
    console.log("\nNOTIFICACIONES:");
    // si no hay notificaciones, se muestra un mensaje
    if (client.notifications.size === 0) {
      console.log("No tienes notificaciones.");
    } else {
      // mostrar las notificaciones
      for(notification of client.notifications) {
        console.log(notification);
      }
    }
    submenu();
  }
  
//corremos el programa
main();