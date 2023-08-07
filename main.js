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
const rl = readline.createInterface({
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
          // Add a user to contacts
            break;
        case '3':
          // Show contact details of a user
              break;
        case '4':
            directMessageMain();
             break;
        case '5':
          // Participate in group conversations
             break;
        case '6':
          changeStatusMain();
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
 * register: registra un nuevo usuario en el servidor
 */
async function registerMain() {
    console.log('\nREGISTRARSE:');
    rl.question('Usuario: ', async username => {
      rl.question('Contraseña: ', async password => {
        rl.question('Correo: ', async email => {
          try {
            // llamar a la funcion con los parametros
            await client.register(username, password, email);
            console.log('\nRegistro exitoso. Ahora puedes iniciar sesión con tus credenciales.');
            loginMain(); //regresar al menu principal
          } catch (err) {
            // Si hay un error, se muestra en pantalla y se vuelve a llamar a register()
            console.log(err.message);
            menu();
          }
        });
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
 * getContactsMain: llama a client.getContacts() con los paremetros necesarios
 */
async function getContactsMain() {
    try {
        // llamar a la funcion 
        const contacts = await client.getContacts();

        console.log("\nCONTACTOS (ROSTER LIST):");

        // Si no hay contactos, se muestra un mensaje
        if (contacts.length === 0) {
          console.log("\nNo se encontraron contactos.");
        } else {
            // Si hay contactos, se muestran en pantalla
          for (const contact of contacts) {
            console.log()
            console.log(`${contact.name || contact.jid}`);
          }
        }
        submenu();
      } catch (err) {
        // Si hay un error, se muestra en pantalla y se vuelve a llamar a getContactsMain()
        console.log(err.message);
        submenu();
      }
}

async function addContactMain() {
    rl.question("JID del usuario: ", async (jid) => {
      rl.question("Nombre del usuario (opcional): ", async (nombre) => {
        try {
          await client.addContact(jid, nombre);
          console.log("Contacto " + jid + " agregado correctamente."
          );
          submenu();
        } catch (err) {
          console.log("Error al agregar el contacto:", err.message);
          submenu();
        }
      });
    });
  }

/**
 * directMessage: llama a client.directMessage() con los paremetros necesarios
 */
async function directMessageMain() {
    console.log('\nCOMUNICACION 1 A 1:');
    rl.question('Destinatario: ', async receiver => {
        receiver = receiver + '@alumchat.xyz';
      rl.question('Mensaje: ', async message => {
        try {
          // llamar a la funcion con los parametros
          await client.directMessage(receiver, message);
          console.log('\nMensaje enviado correctamente!');
          submenu();
        } catch (err) {
          console.log('\nError al enviar el mensaje:', err.message);
          submenu();
        }
      });
    });
  }

  async function changeStatusMain() {
    console.log("\nCHANGE STATUS:");
    console.log("Choose an option for 'show':");
    console.log("[1] Available");
    console.log("[2] Away");
    console.log("[3] Not Available");
    console.log("[4] Busy");
    console.log("[5] Online");
  
    rl.question("Opcioon -> ", async (answer) => {
      let showOption;
      switch (answer) {
        case '1':
          showOption = "available";
          break;
        case '2':
          showOption = "away";
          break;
        case '3':
          showOption = "not available";
          break;
        case '4':
          showOption = "busy";
          break;
        case '5':
          showOption = "offline";
          break;
        default:
          console.log("Opcion Invalida! Intente de nuevo.");
          changeStatusMain();
          return;
      }
  
      rl.question("Ingresar mensaje de status (opcional): ", async (status) => {
        try {
          await client.changeStatus(showOption, status);
          console.log("Status updated successfully!");
          submenu();
        } catch (err) {
          console.log("Error updating status:", err.message);
          submenu();
        }
      });
    });
  }
  

//corremos el programa
main();