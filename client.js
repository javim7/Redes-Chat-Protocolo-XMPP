/**
 * client.js: cliente de mensajeria instantanea que soporta el protocolo XMPP.
 * Este archivo es el responsable de poder conectarse a alumchat.xyz y poder realizar todas las funcionalidades del chat.
 *
 * @author Javier Mombiela
 * @contact mom20067@uvg.edu.gt
 * @created 2023-07-25
 * @requires xmpp/client
 * @requires xmpp/debug
 */

const { client, xml } = require("@xmpp/client");
const debug = require("@xmpp/debug");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

/**
 * Client: clase que representa al cliente XMPP y todas sus funcionalidades.
 */
class Client {
  constructor() {
    this.username = null;
    this.password = null;
    this.service = "xmpp://alumchat.xyz:5222";
    this.domain = "alumchat.xyz";
    this.xmpp = null;
  }

  /**
   * register: registra un nuevo usuario en el servidor.
   * @param {String} username 
   * @param {String} password 
   */
  async register(username, password, email) {
    if (this.xmpp && this.xmpp.status === "online") {
      throw new Error("You are already connected. Cannot register while connected.");
    }

    const registerStanza = xml(
      "iq",
      { type: "set" },
      xml("query", { xmlns: "jabber:iq:register" }, [
        xml("username", {}, username),
        xml("password", {}, password),
        xml("email", {}, email),
      ])
    );

    this.xmpp = client({
      service: this.service,
      domain: this.domain,
      username: username,
      password: password,
    });

    this.xmpp.on("online", async () => {
      await this.xmpp.send(xml("presence"));
    });

    try {
      await this.xmpp.start();
      await this.xmpp.send(registerStanza);
    }
    catch (err) {
      if (err.condition === 'conflict') {
        throw new Error('\nEl usuario ya existe!');
      } else {
        throw err;
      }
    }
    finally {
      await this.xmpp.stop();
      this.xmpp = null;
    }
  }

  /**
   * login: conecta al cliente XMPP al servidor.
   * @param {String} username
   * @param {String} password
   */
  async login(username, password) {
    this.xmpp = client({
      service: this.service,
      domain: this.domain,
      username: username,
      password: password,
    });
  
    this.xmpp.on("online", async () => {
      await this.xmpp.send(xml("presence"));
    });
  
    try {
      await this.xmpp.start();
    } catch (err) {
      if (err.condition === 'not-authorized') {
        throw new Error('\nCredenciales incorrectas! Intente de nuevo.');
      } else {
        throw err;
      }
    }
  }

  /**
   * logout: desconecta al cliente XMPP del servidor.
   */
  async logout() {
    if (!this.xmpp) {
      throw new Error("Error en la conexion, intenta de nuevo.");
    }

    await this.xmpp.stop();
    this.xmpp = null;
    this.username = null;
    this.password = null;
  }

  async getContacts() {
    return new Promise((resolve, reject) => {
      if (!this.xmpp) {
        reject(new Error("Error in connection, please try again."));
      }
  
      const rosterStanza = xml(
        'iq',
        { type: 'get', id: 'roster' },
        xml('query', { xmlns: 'jabber:iq:roster' })
      );
  
      this.xmpp.send(rosterStanza).then(() => {
        console.log('Solicitud de roster enviada al servidor.');
      }).catch((err) => {
        console.error('Error al enviar la solicitud de roster:', err);
      });
  
      // Evento para recibir la respuesta del roster del servidor
      this.xmpp.on('stanza', (stanza) => {
        if (stanza.is('iq') && stanza.attrs.type === 'result') {
          const query = stanza.getChild('query', 'jabber:iq:roster');
          const contacts = query.getChildren('item');
  
          console.log('\nLista de contactos:');
          let contactList = [];
          contacts.forEach((contact) => {
            const jid = contact.attrs.jid;
            const name = contact.attrs.name || jid;
            const subscription = contact.attrs.subscription;
  
            // Obtener el estado de presencia del contacto (si está disponible)
            const presence = this.xmpp.presences && this.xmpp.presences[jid];
            const status = presence && presence.status ? presence.status : 'Offline';
  
            // console.log(`- JID: ${jid}, Nombre: ${name}, Suscripción: ${subscription}, Estado: ${status}`);
            contactList.push({jid, name, subscription, status});
          });
  
          this.xmpp.on('presence', (presence) => {
            const from = presence.attrs.from;
            const show = presence.getChildText('show');
            const status = presence.getChildText('status');
  
            console.log(`Presencia recibida de ${from}: show=${show}, status=${status}`);
          });
          resolve(contactList);
        }
      });
    });
  }  

  /**
   * addContact: agrega un nuevo contacto al roster.
   * @param jid 
   * @param nombre 
   */
  async addContact(jid, nombre) {
    if (!this.xmpp) {
      throw new Error("Error in connection, please try again.");
    }
  
    const addContactStanza = xml(
      'iq',
      { type: 'set', id: 'addContact' },
      xml('query', { xmlns: 'jabber:iq:roster' },
        xml('item', { jid: jid, name: nombre })
      )
    );
  
    return this.xmpp.send(addContactStanza);
  }  
  

  /**
   * directMessage: envía un mensaje a un destinatario.
   * @param destinatario: nombre de usuario del destinatario.
   * @param mensaje: mensaje que se desea enviar.
   */
  async directMessage(destinatario, mensaje) {
    if (!this.xmpp) {
      throw new Error("Error en la conexion, intenta de nuevo.");
    }

    const messageStanza = xml(
      "message",
      { type: "chat", to: destinatario },
      xml("body", {}, mensaje)
    );

    await this.xmpp.send(messageStanza);
  }

  async changeStatus(show, status = "") {
    if (!this.xmpp) {
      throw new Error("Error en la conexion, intenta de nuevo.");
    }

    const statusStanza = xml(
      "presence",
      {},
      xml("show", {}, show),
      xml("status", {}, status)
    );

    // Enviar el IQ stanza al servidor
    this.xmpp.send(statusStanza).then(() => {
      console.log(`Solicitud de cambiar estado enviada al servidor.`);
    }).catch((err) => {
      console.error('Error al enviar la solicitud de cambiar estado:', err);
    });
  }
}

module.exports = Client;

// async function ejemplogetContacts() {
//   const cliente = new Client();
//   cliente.username = "mom20067";
//   cliente.password = "varcelona";
//   await cliente.connect();

//   const contacts = await cliente.getContacts();
//   console.log(contacts);
// }

// ejemplogetContacts().catch((error) => {
//   console.error("Error al obtener contactos:", error);
// });