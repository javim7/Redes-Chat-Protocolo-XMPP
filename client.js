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
const tls = require('tls');
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
   * connect: conecta al cliente XMPP al servidor.
   */
  async connect() {
    this.xmpp = client({
      service: this.service,
      domain: this.domain,
      username: this.username,
      password: this.password,
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
    if (!this.xmpp) {
      throw new Error("Error en la conexion, intenta de nuevo.");
    }

    const rosterStanza = xml(
      "iq", 
      { type: "get", id: "roster1" },
      xml("query", { xmlns: "jabber:iq:roster" })
    );

    try {
      const response = await this.xmpp.sendIQ(rosterStanza);
      const contacts = [];

      if (response.is('iq') && response.getChild('query')) {
        const query = response.getChild('query');
        const items = query.getChildren('item');

        for (const item of items) {
          const contact = {
            jid: item.attrs.jid,
            name: item.attrs.name || null,
          };

          contacts.push(contact);
        }
      }

      return contacts;
    } catch (err) {
      throw new Error('\nError al obtener contactos!', err.message);
    }
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