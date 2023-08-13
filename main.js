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
    console.log('[7] Enviar/recibir notificaciones');
    console.log('[8] Enviar/recibir archivos');
    console.log('[9] Regresar al menu principal');
    
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
            // Send/receive notifications
            break;
        case '8':
            seeNotifications();
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
          menu();
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
    // llamar a la funcion 
    const contacts = await client.getContacts();

    // Si no hay contactos, se muestra un mensaje
    if (contacts.length === 0) {
      console.log("\nNo se encontraron contactos.");
    } else {
      // Si hay contactos, se muestran en pantalla
      for (const contact of contacts) {
        console.log(`- JID: ${contact.jid}, Status: ${contact.status}`);
      }
    }
    submenu();
  } catch (err) {
    // Si hay un error, se muestra en pantalla y se vuelve a llamar a getContactsMain()
    console.log(err.message);
    submenu();
  }
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
      console.log(`\n- JID: ${contact.jid}, Nombre: ${contact.name}, Suscripción: ${contact.subscription}, Estado: ${contact.status}`);
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
  console.log("\nAGREGAR CONTACTO:");
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
}

/**
 * oneOnOneChatMain: habilita la opcion de poder chatear con un usuario
 */
async function oneOnOneChatMain() {
  console.log("\nCOMUNICACION 1 A 1:");
  rl.question("Nombre de usuario: ", async (nombre) => {
    const jid = nombre + "@alumchat.xyz";
    console.log(`Iniciando chat con ${jid}...`);
    console.log("\nEscriba 'exit' para salir del chat.");
    console.log("Escriba 'file' para enviar un archivo.\n");

    // Listen for incoming messages from the specified user
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
  console.log('[1] Crear un grupo');
  console.log('[2] Chatear en un grupo existente');
  rl.question('Opcion: ', async option => {
    if (option === '1') {
      // Create a new group
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
      // Chat in an existing group
      rl.question('\nNombre del grupo: ', async groupName => {
        groupJid = groupName + '@conference.alumchat.xyz';
        try {
          await client.joinGroup(groupJid);
          await groupChatMain2(groupJid);
        } catch (err) {
          console.log('Error:', err.message);
          submenu();
        }
      });
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
      // rl.close();
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
    console.log("[1] Available");
    console.log("[2] Away");
    console.log("[3] Extended Away");
    console.log("[4] Do Not Disturb");
    console.log("[5] Free to Chat");
  
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
          showOption = "chat";
          break;
        default:
          console.log("Opcion Invalida! Intente de nuevo.");
          changeStatusMain();
          return;
      }
  
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

  function seeNotifications() {
    client.viewNotifications();
  }
  
//corremos el programa
main();