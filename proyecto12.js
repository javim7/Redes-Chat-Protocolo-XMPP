const net = require('net');
const readline = require('readline');

// Datos de conexión
// const jid = 'val20159@alumchat.xyz';
// const password = '1234';
const serverHost = 'alumchat.xyz';
const serverPort = 5222;

 // Función para mostrar el menú y pedir la opción al usuario.
 function inicioSesion(jid, password) {
  // Conexión TCP
  const client = net.connect({ host: serverHost, port: serverPort }, () => {
    // Envío del inicio de sesión
    const xmlAuth = `<auth xmlns="urn:ietf:params:xml:ns:xmpp-sasl" mechanism="PLAIN">${Buffer.from(`${jid}\x00${jid}\x00${password}`).toString('base64')}</auth>`;
    client.write(xmlAuth);

    // Envío del inicio de la secuencia XML
    const xmlStream = `<?xml version="1.0" encoding="UTF-8"?><stream:stream xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams" to="${serverHost}" version="1.0">`;
    client.write(xmlStream);

    // Mostrar el menú después de iniciar sesión
    mostrarMenu();
  });

  // Manejo de datos recibidos del servidor XMPP
  client.on('data', (data) => {
    console.log('Datos recibidos del servidor XMPP:', data.toString());

    // Procesar la respuesta del servidor y realizar otras acciones según sea necesario
  });

  // Manejo de errores
  client.on('error', (error) => {
    console.error('Error en la conexión con el servidor XMPP:', error);
  });

  // Cierre de la conexión
  client.on('end', () => {
    console.log('Conexión cerrada con el servidor XMPP');
  });

  // Función para mostrar el menú y pedir la opción al usuario.
  function mostrarMenu() {
    console.log("\n---- Menú de opciones ----");
    console.log("1. Enseñar todos los usuarios/contactos y su estado.");
    console.log("2. Agregar un usuario a mis contactos.");
    console.log("3. Comunicación 1 a 1 con cualquier usuario/contacto.");
    console.log("4. Participar en conversaciones grupales.");
    console.log("5. Definir un mensaje de presencia.");
    console.log("6. Enviar/recibir notificaciones.");
    console.log("7. Enviar/recibir archivos.");
    console.log("8. Salir.");

    // Pidiendo la opción al usuario.
    rl.question('¿Qué opción deseas?: ', (answer) => {
      const option = parseInt(answer);

      switch (option) {
        case 1:
          console.log("Opción 1 seleccionada: Enseñar todos los usuarios/contactos y su estado.");
          // Lógica para la opción 1...
          mostrarMenu();
          break;
        case 2:
          console.log("Opción 2 seleccionada: Agregar un usuario a mis contactos.");
          // Lógica para la opción 2...
          mostrarMenu();
          break;
        case 3:
          console.log("Opción 3 seleccionada: Comunicación 1 a 1 con cualquier usuario/contacto.");
          // Lógica para la opción 3...
          mostrarMenu();
          break;
        case 4:
          console.log("Opción 4 seleccionada: Participar en conversaciones grupales.");
          // Lógica para la opción 4...
          mostrarMenu();
          break;
        case 5:
          console.log("Opción 5 seleccionada: Definir un mensaje de presencia.");
          // Pidiendo el mensaje de presencia.
          rl.question("Ingrese el mensaje de presencia: ", (message) => {
            // Enviando el mensaje de presencia.
            const xmlPresence = `
            <presence from="${jid}/pda">
              <show>xa</show>
              <status>${message}</status>
            </presence>
            `;
            // Envío de datos al servidor XMPP
            client.write(xmlPresence);
            mostrarMenu();
          });
          break;
        case 6:
          console.log("Opción 6 seleccionada: Enviar/recibir notificaciones.");
          // Lógica para la opción 6...
          mostrarMenu();
          break;
        case 7:
          console.log("Opción 7 seleccionada: Enviar/recibir archivos.");
          // Lógica para la opción 7...
          mostrarMenu();
          break;
        case 8:
          console.log("Opción 8 seleccionada: Salir.");
          rl.close();
          client.end(); // Cerrar la conexión antes de salir
          break;
        default:
          console.log("Opción no válida. Por favor, elige una opción válida.");
          mostrarMenu();
          break;
      }
    });
  }

  // Pidiendo la opción al usuario.
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}




// Haciendo una función para registrar cuentas.
function registro(user, passwor) {
  // Conexión TCP
  const client = net.connect({ host: serverHost, port: serverPort }, () => {
    console.log('Conexión establecida con el servidor XMPP');

      const jid = 'val20159';
      const password = '1234';

      // Envío del inicio de sesión
      const xmlAuth = 
      `<auth xmlns="urn:ietf:params:xml:ns:xmpp-sasl" mechanism="PLAIN">
        ${Buffer.from(`${jid}\x00${jid}\x00${password}`).toString('base64')}
      </auth>`;
      client.write(xmlAuth);
  
      // Envío del inicio de la secuencia XML
      const xmlStream = 
      `<?xml version="1.0" encoding="UTF-8"?>
        <stream:stream xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams" 
        to="${serverHost}" version="1.0">`;
      client.write(xmlStream);
  
      // Recepción de datos del servidor XMPP
      client.on('data', (data) => {
        // Procesar la respuesta del servidor y realizar otras acciones según sea necesario
  
        // Imprimiendo la respuesta de una mejor manera.
        const xml = data.toString();
        const xmlLines = xml.split('\n');
        xmlLines.forEach((line) => {
          console.log(line);
        });
      });

    // Envío de datos para el registro.
    const xmlRegister = 
    `<iq type="set" id="reg2" to="alumchat.xyz">
      <query xmlns="jabber:iq:register">
        <username>${user}</username>
        <password>${passwor}</password>
      </query>
    </iq>`;
    client.write(xmlRegister);

    // Manejo de errores
    client.on('error', (error) => {
      console.error('Error en la conexión con el servidor XMPP:', error);
    });

    // Cierre de la conexión
    client.on('end', () => {
      console.log('Conexión cerrada con el servidor XMPP');
    });   

  })
}


// // Haciendo un registro de cuenta en el servidor XMPP.
// const xmlRegister = `<iq type="set" id="reg2" to="alumchat.xyz"><query xmlns="jabber:iq:register"><username>vale20158</username><password>1234</password></query></iq>`;

// // Envío de datos al servidor XMPP
// client.write(xmlRegister);

// // Dando mensaje de éxito.
// console.log("Registro exitoso.");

// // Manejo de errores
// client.on('error', (error) => {
//   console.error('Error en la conexión con el servidor XMPP:', error);
// });

// // Cierre de la conexión
// client.on('end', () => {
//   console.log('Conexión cerrada con el servidor XMPP');
// });


// Creando un método main.
function main() {
  // Creando un menú de opciones.
  console.log("Bienvenido al cliente XMPP.");

  // Creando un menú de opciones.
  console.log("1. Iniciar sesión.");
  console.log("2. Registro.");
  console.log("3. Salir")

  // Pidiendo la opción al usuario.
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Pidiendo la opción al usuario.
  rl.question('¿Qué opción deseas?: ', (answer) => {
    
    // Si la opción es 1, entonces se inicia sesión.
    if (answer == 1) {
      // Pidiendo usuario y contraseña.

      rl.question("Ingrese el usuario: ", (username) => {

        rl.question("Ingrese la contraseña: ", (password) => {

            // Llamando al método iniciar sesión.
            inicioSesion(username, password);

        })
      })
    
    }

    // Si la opción es 2, entonces se registra.
    else if (answer == 2) {
      // Pidiendo usuario y contraseña.

      rl.question("Ingrese el usuario: ", (username) => {

        rl.question("Ingrese la contraseña: ", (password) => {

            // Llamando al método iniciar sesión.
            registro(username, password);

        })
      })
    
    }

    // Si la opción es 3, entonces se cierra el programa.
    else if (answer == 3) {
      // Cerrando el programa.
      console.log("Cerrando el programa.");
      process.exit(0);
    }

  })

}

main()